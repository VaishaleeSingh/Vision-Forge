import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import KnowledgeDocument from '@/models/Document'
import DocumentChunk from '@/models/DocumentChunk'
import { generateEmbedding } from '@/lib/ai'
import mongoose from 'mongoose'

// ─── Text Chunker ─────────────────────────────────────────────────────────────

/**
 * Recursive sentence-preserving text splitter.
 * Splits at ~500 chars with 50-char overlap, preferring sentence boundaries.
 */
function splitIntoChunks(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = []

  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()

  if (normalized.length <= chunkSize) {
    return normalized ? [normalized] : []
  }

  // Split into sentences using punctuation boundaries or double newlines
  const sentencePattern = /(?<=[.!?])\s+(?=[A-Z])|\n\n+/g
  const sentences: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const re = new RegExp(sentencePattern)
  while ((match = re.exec(normalized)) !== null) {
    const sentence = normalized.slice(lastIndex, match.index).trim()
    if (sentence) sentences.push(sentence)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < normalized.length) {
    const tail = normalized.slice(lastIndex).trim()
    if (tail) sentences.push(tail)
  }

  // If no sentence boundaries found, fall back to character-based splitting
  if (sentences.length <= 1) {
    let start = 0
    while (start < normalized.length) {
      const end = Math.min(start + chunkSize, normalized.length)
      chunks.push(normalized.slice(start, end).trim())
      start += chunkSize - overlap
    }
    return chunks.filter(Boolean)
  }

  // Aggregate sentences into chunks
  let current = ''
  let prevOverlap = ''

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence

    if (candidate.length > chunkSize && current) {
      // Flush current chunk
      chunks.push((prevOverlap + current).trim())

      // Build overlap from end of current
      const currentWords = current.split(' ')
      let overlapText = ''
      for (let i = currentWords.length - 1; i >= 0; i--) {
        const attempt = currentWords.slice(i).join(' ')
        if (attempt.length <= overlap) {
          overlapText = attempt
        } else {
          break
        }
      }
      prevOverlap = overlapText ? overlapText + ' ' : ''
      current = sentence
    } else {
      current = candidate
    }
  }

  if (current.trim()) {
    chunks.push((prevOverlap + current).trim())
  }

  return chunks.filter((c) => c.length > 10)
}

// ─── PDF Text Extraction ──────────────────────────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse is a CommonJS module - use require via dynamic import
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text
}

// ─── Batch Embedding ──────────────────────────────────────────────────────────

async function batchEmbeddings(
  chunks: string[],
  batchSize = 50
): Promise<number[][]> {
  const embeddings: number[][] = []
  console.log(`[Upload] Starting embeddings for ${chunks.length} chunks...`)

  // The Gemini Node SDK doesn't expose embedContentBatch directly in the easiest way,
  // but we can fire more concurrently without hardcoded sleeps if we increase batch size
  for (let i = 0; i < chunks.length; i += batchSize) {
    console.log(`[Upload] Processing chunks ${i} to ${Math.min(i + batchSize, chunks.length)}`)
    const batch = chunks.slice(i, i + batchSize)
    const batchEmbeddings = await Promise.all(
      batch.map((chunk) => generateEmbedding(chunk))
    )
    embeddings.push(...batchEmbeddings)
  }

  console.log(`[Upload] Finished embeddings!`)
  return embeddings
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let documentId: mongoose.Types.ObjectId | null = null

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // ── Parse form data ───────────────────────────────────────────────────────
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Determine effective MIME type by extension (browsers may misreport .md as text/plain)
    const name = file.name.toLowerCase()
    const isAllowedExtension =
      name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.md')

    if (!isAllowedExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, TXT, and MD files are supported.' },
        { status: 400 }
      )
    }

    // Normalize MIME type
    let mimeType = file.type || 'text/plain'
    if (name.endsWith('.md') && !mimeType.includes('markdown')) {
      mimeType = 'text/markdown'
    }

    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      )
    }

    await connectDB()

    // ── Create initial document record ────────────────────────────────────────
    const doc = await KnowledgeDocument.create({
      userId,
      name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      originalName: file.name,
      size: file.size,
      mimeType,
      status: 'processing',
      chunkCount: 0,
    })
    documentId = doc._id

    // ── Extract text ──────────────────────────────────────────────────────────
    let extractedText = ''

    const buffer = Buffer.from(await file.arrayBuffer())

    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
      try {
        extractedText = await extractPdfText(buffer)
      } catch (pdfErr: any) {
        console.error('PDF parse error:', pdfErr)
        throw new Error(`PDF Parse Error: ${pdfErr.message || 'Unknown error'}`)
      }
    } else {
      // TXT or MD — read as UTF-8 text
      extractedText = buffer.toString('utf-8')
    }

    if (!extractedText.trim()) {
      throw new Error('No text content could be extracted from the file.')
    }

    // ── Chunk text ────────────────────────────────────────────────────────────
    const rawChunks = splitIntoChunks(extractedText, 500, 50)

    if (rawChunks.length === 0) {
      throw new Error('Document produced no usable text chunks.')
    }

    // ── Generate embeddings ───────────────────────────────────────────────────
    const embeddings = await batchEmbeddings(rawChunks, 5)

    // ── Store chunks in MongoDB ────────────────────────────────────────────────
    const chunkDocs = rawChunks.map((content, index) => ({
      documentId: doc._id,
      userId,
      content,
      embedding: embeddings[index],
      metadata: {
        chunkIndex: index,
        source: file.name,
        charStart: extractedText.indexOf(content),
        charEnd: extractedText.indexOf(content) + content.length,
      },
    }))

    await DocumentChunk.insertMany(chunkDocs, { ordered: false })

    // ── Update document to ready ──────────────────────────────────────────────
    await KnowledgeDocument.findByIdAndUpdate(doc._id, {
      status: 'ready',
      chunkCount: rawChunks.length,
    })

    return NextResponse.json({
      documentId: doc._id.toString(),
      chunkCount: rawChunks.length,
      status: 'ready',
      fileName: file.name,
    })
  } catch (error) {
    console.error('Knowledge upload error:', error)

    // Mark document as errored if we created it
    if (documentId) {
      try {
        await KnowledgeDocument.findByIdAndUpdate(documentId, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
      } catch (updateErr) {
        console.error('Failed to update document status to error:', updateErr)
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
