import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import KnowledgeDocument from '@/models/Document'
import DocumentChunk from '@/models/DocumentChunk'
import { batchDocumentEmbeddings } from '@/lib/embeddings'
import { chunkText } from '@/lib/utils'
import mongoose from 'mongoose'

export const maxDuration = 120
export const runtime = 'nodejs'

const MAX_STORED_TEXT = 4 * 1024 * 1024 // 4MB in MongoDB

async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text
}

export async function POST(req: NextRequest) {
  let documentId: mongoose.Types.ObjectId | null = null

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const isAllowedExtension =
      name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.md')

    if (!isAllowedExtension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, TXT, and MD files are supported.' },
        { status: 400 },
      )
    }

    let mimeType = file.type || 'text/plain'
    if (name.endsWith('.md') && !mimeType.includes('markdown')) {
      mimeType = 'text/markdown'
    }

    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 },
      )
    }

    await connectDB()

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

    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ''

    if (name.endsWith('.pdf') || mimeType === 'application/pdf') {
      try {
        extractedText = await extractPdfText(buffer)
      } catch (pdfErr: unknown) {
        const msg = pdfErr instanceof Error ? pdfErr.message : 'Unknown PDF error'
        throw new Error(`Could not read PDF: ${msg}`)
      }
    } else {
      extractedText = buffer.toString('utf-8')
    }

    if (!extractedText.trim()) {
      throw new Error('No text content could be extracted from the file.')
    }

    const storedText =
      extractedText.length > MAX_STORED_TEXT
        ? extractedText.slice(0, MAX_STORED_TEXT)
        : extractedText

    let rawChunks = chunkText(extractedText, 500, 50, 500)

    if (rawChunks.length === 0) {
      throw new Error('Document produced no usable text chunks.')
    }

    if (rawChunks.length >= 500) {
      console.warn(`[Upload] Large document — using larger chunks (${rawChunks.length} hit cap)`)
      rawChunks = chunkText(extractedText, 1200, 100, 400)
    }

    console.log(`[Upload] Embedding ${rawChunks.length} chunks for ${file.name}…`)

    const { embeddings, provider } = await batchDocumentEmbeddings(rawChunks)

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

    await KnowledgeDocument.findByIdAndUpdate(doc._id, {
      status: 'ready',
      chunkCount: rawChunks.length,
      extractedText: storedText,
      embeddingProvider: provider,
    })

    return NextResponse.json({
      documentId: doc._id.toString(),
      chunkCount: rawChunks.length,
      status: 'ready',
      fileName: file.name,
      embeddingProvider: provider,
    })
  } catch (error) {
    console.error('Knowledge upload error:', error)

    if (documentId) {
      try {
        await connectDB()
        await KnowledgeDocument.findByIdAndUpdate(documentId, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
      } catch (updateErr) {
        console.error('Failed to update document status to error:', updateErr)
      }
    }

    const message = error instanceof Error ? error.message : 'Upload failed'
    const hint =
      message.includes('quota') || message.includes('429')
        ? 'Gemini embedding quota exceeded. Ensure HUGGINGFACE_API_KEY is set in .env for free embeddings.'
        : message.includes('HUGGINGFACE') || message.includes('Embedding failed')
          ? 'Add HUGGINGFACE_API_KEY to .env (free at huggingface.co/settings/tokens).'
          : undefined

    return NextResponse.json({ error: message, hint }, { status: 500 })
  }
}
