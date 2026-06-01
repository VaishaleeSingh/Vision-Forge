import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import KnowledgeDocument from '@/models/Document'
import DocumentChunk from '@/models/DocumentChunk'
import { generateEmbedding, geminiFlash, groqClient } from '@/lib/ai'
import { SYSTEM_PROMPTS } from '@/lib/prompt-templates'
import mongoose from 'mongoose'

// ─── Cosine Similarity Fallback ───────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelevantChunk {
  content: string
  chunkIndex: number
  pageNumber?: number
  source: string
  score: number
}

// ─── Vector Search ────────────────────────────────────────────────────────────

async function vectorSearch(
  queryEmbedding: number[],
  documentId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  topK = 5
): Promise<RelevantChunk[]> {
  // Attempt Atlas Vector Search first
  try {
    const db = mongoose.connection.db
    if (!db) throw new Error('No DB connection')

    const collection = db.collection('documentchunks')

    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: topK,
          filter: {
            documentId: documentId,
          },
        },
      },
      {
        $match: {
          userId: userId,
        },
      },
      {
        $project: {
          content: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]

    const results = await collection.aggregate(pipeline).toArray()

    if (results.length > 0) {
      return results.map((r) => ({
        content: r.content as string,
        chunkIndex: (r.metadata?.chunkIndex as number) ?? 0,
        pageNumber: r.metadata?.pageNumber as number | undefined,
        source: (r.metadata?.source as string) ?? '',
        score: r.score as number,
      }))
    }

    // If vector search returned nothing, fall through to cosine fallback
    console.warn('Vector search returned 0 results, falling back to cosine similarity')
  } catch (vectorErr) {
    // Atlas Vector Search not available (e.g., free tier, local dev)
    console.warn('Atlas Vector Search unavailable, using cosine similarity fallback:', vectorErr)
  }

  // ── Cosine Similarity Fallback ──────────────────────────────────────────────
  const chunks = await DocumentChunk.find({
    documentId,
    userId,
  })
    .select('content embedding metadata')
    .lean()

  if (chunks.length === 0) return []

  const scored = chunks
    .map((chunk) => ({
      content: chunk.content,
      chunkIndex: chunk.metadata?.chunkIndex ?? 0,
      pageNumber: chunk.metadata?.pageNumber,
      source: chunk.metadata?.source ?? '',
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // ── Parse request ─────────────────────────────────────────────────────────
    const body = await req.json()
    const { message, documentId } = body as { message: string; documentId: string }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    await connectDB()

    // ── Verify document ownership ─────────────────────────────────────────────
    const docObjectId = new mongoose.Types.ObjectId(documentId)
    const doc = await KnowledgeDocument.findOne({
      _id: docObjectId,
      userId,
      status: 'ready',
    }).lean()

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found or not ready' },
        { status: 404 }
      )
    }

    // ── Embed query ───────────────────────────────────────────────────────────
    const queryEmbedding = await generateEmbedding(message)

    // ── Retrieve relevant chunks ──────────────────────────────────────────────
    const relevantChunks = await vectorSearch(queryEmbedding, docObjectId, userId, 5)

    if (relevantChunks.length === 0) {
      // Stream a "not found" message
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const meta = JSON.stringify({ sources: [] })
          controller.enqueue(encoder.encode(meta + '\n'))
          controller.enqueue(
            encoder.encode(
              "I couldn't find relevant information in this document to answer your question. Try rephrasing or asking about a different topic covered in the document."
            )
          )
          controller.close()
        },
      })
      return new NextResponse(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // ── Build RAG context ─────────────────────────────────────────────────────
    const contextBlocks = relevantChunks
      .map((chunk, i) => {
        const sourceLabel = chunk.pageNumber
          ? `[Source ${i + 1} - Page ${chunk.pageNumber}]`
          : `[Source ${i + 1} - Chunk ${chunk.chunkIndex + 1}]`
        return `${sourceLabel}\n${chunk.content}`
      })
      .join('\n\n---\n\n')

    const systemPrompt = SYSTEM_PROMPTS.rag(contextBlocks)

    // ── Sources metadata (sent as first JSON line) ────────────────────────────
    const sourcesPayload = relevantChunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      source: chunk.source,
      pageNumber: chunk.pageNumber,
      score: Math.round(chunk.score * 100) / 100,
    }))

    // ── Stream Gemini response ────────────────────────────────────────────────
    const model = geminiFlash()

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // First line: JSON metadata with sources
          const metaLine = JSON.stringify({ sources: sourcesPayload }) + '\n'
          controller.enqueue(encoder.encode(metaLine))

          try {
            // Stream Gemini response
            const streamResult = await model.generateContentStream({
              contents: [{ role: 'user', parts: [{ text: message }] }],
              systemInstruction: systemPrompt,
            })

            for await (const chunk of streamResult.stream) {
              const text = chunk.text()
              if (text) {
                controller.enqueue(encoder.encode(text))
              }
            }
          } catch (geminiError: any) {
            console.warn('Gemini chat streaming failed (Quota/429/404). Falling back to Groq...', geminiError.message)
            // Fallback to Groq Llama 3.1
            const completion = await groqClient.chat.completions.create({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
              ],
              stream: true,
              max_tokens: 2048,
            })

            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                controller.enqueue(encoder.encode(content))
              }
            }
          }

          controller.close()
        } catch (streamErr) {
          console.error('Streaming error:', streamErr)
          controller.enqueue(
            encoder.encode(
              '\n\nSorry, I encountered an error generating the response. Please try again.'
            )
          )
          controller.close()
        }
      },
    })

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Document-Id': documentId,
        'X-Chunk-Count': relevantChunks.length.toString(),
      },
    })
  } catch (error) {
    console.error('Knowledge chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
