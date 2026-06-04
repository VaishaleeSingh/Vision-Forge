import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import KnowledgeDocument from '@/models/Document'
import { geminiFlash, streamGroqChat } from '@/lib/ai'
import { SYSTEM_PROMPTS } from '@/lib/prompt-templates'
import { retrieveRelevantChunks } from '@/lib/rag'
import mongoose from 'mongoose'

async function streamRagAnswer(
  systemPrompt: string,
  message: string,
  onChunk: (text: string) => void,
): Promise<void> {
  const errors: string[] = []

  if (process.env.GROQ_API_KEY) {
    try {
      await streamGroqChat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        onChunk,
        { max_tokens: 4096, temperature: 0.2 },
      )
      return
    } catch (groqErr) {
      const msg = groqErr instanceof Error ? groqErr.message : String(groqErr)
      errors.push(`Groq: ${msg}`)
      console.warn('[Knowledge chat] Groq failed:', msg)
    }
  } else {
    errors.push('GROQ_API_KEY missing in .env')
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const model = geminiFlash()
      const streamResult = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: message }] }],
        systemInstruction: systemPrompt,
      })

      for await (const chunk of streamResult.stream) {
        const text = chunk.text()
        if (text) onChunk(text)
      }
      return
    } catch (geminiErr) {
      const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
      errors.push(`Gemini: ${msg.slice(0, 120)}`)
      console.warn('[Knowledge chat] Gemini failed:', msg)
    }
  } else {
    errors.push('GEMINI_API_KEY missing in .env')
  }

  throw new Error(errors.join(' · ') || 'No AI provider available')
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const body = await req.json()
    const { message, documentId } = body as { message: string; documentId: string }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    await connectDB()

    const docObjectId = new mongoose.Types.ObjectId(documentId)
    const doc = await KnowledgeDocument.findOne({
      _id: docObjectId,
      userId,
      status: 'ready',
    }).lean()

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found or not ready. Wait for processing to finish or re-upload.' },
        { status: 404 },
      )
    }

    const relevantChunks = await retrieveRelevantChunks(
      message.trim(),
      docObjectId,
      userId,
      doc.embeddingProvider as 'gemini' | 'huggingface-bge' | undefined,
      8,
    )

    if (relevantChunks.length === 0) {
      const encoder = new TextEncoder()
      const hint =
        !doc.embeddingProvider
          ? 'This document was uploaded before a recent fix. Please delete it and upload again.'
          : 'Try a more specific question about topics mentioned in the file.'
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ sources: [] }) + '\n'),
          )
          controller.enqueue(
            encoder.encode(
              `I could not find matching passages in "${doc.originalName}". ${hint}`,
            ),
          )
          controller.close()
        },
      })
      return new NextResponse(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const contextBlocks = relevantChunks
      .map((chunk, i) => {
        const label = `[Excerpt ${i + 1} · relevance ${Math.round(chunk.score * 100)}%]`
        return `${label}\n${chunk.content}`
      })
      .join('\n\n---\n\n')

    const systemPrompt = SYSTEM_PROMPTS.rag(contextBlocks, doc.originalName)

    const sourcesPayload = relevantChunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      source: chunk.source,
      pageNumber: chunk.pageNumber,
      score: Math.round(chunk.score * 100) / 100,
    }))

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ sources: sourcesPayload }) + '\n'),
          )

          await streamRagAnswer(systemPrompt, message.trim(), (text) => {
            controller.enqueue(encoder.encode(text))
          })

          controller.close()
        } catch (streamErr) {
          console.error('Streaming error:', streamErr)
          const detail =
            streamErr instanceof Error ? streamErr.message : 'Unknown error'
          controller.enqueue(
            encoder.encode(
              `\n\nCould not generate an answer: ${detail}`,
            ),
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
      { status: 500 },
    )
  }
}
