import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import KnowledgeDocument from '@/models/Document'
import DocumentChunk from '@/models/DocumentChunk'
import mongoose from 'mongoose'

// ─── GET: List user's documents ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = new mongoose.Types.ObjectId(session.user.id)

    await connectDB()

    // Parse optional query params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const status = searchParams.get('status') // optional filter

    const query: Record<string, unknown> = { userId }
    if (status) query.status = status

    const documents = await KnowledgeDocument.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-__v')
      .lean()

    return NextResponse.json({
      documents,
      total: documents.length,
    })
  } catch (error) {
    console.error('Knowledge documents GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// ─── DELETE: Remove document + all its chunks ─────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
    }

    const docId = new mongoose.Types.ObjectId(id)

    await connectDB()

    // Verify ownership
    const doc = await KnowledgeDocument.findOne({ _id: docId, userId })
    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Delete all associated chunks first
    const chunksResult = await DocumentChunk.deleteMany({
      documentId: docId,
      userId,
    })

    // Delete the document record
    await KnowledgeDocument.findByIdAndDelete(docId)

    return NextResponse.json({
      success: true,
      deletedDocument: id,
      deletedChunks: chunksResult.deletedCount,
    })
  } catch (error) {
    console.error('Knowledge documents DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 }
    )
  }
}
