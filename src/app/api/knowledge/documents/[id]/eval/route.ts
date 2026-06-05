import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import KnowledgeDocument from '@/models/Document'
import { evaluateRagQuality } from '@/lib/rag-eval'
import { generateText } from '@/lib/ai'
import mongoose from 'mongoose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(session.user.id)
  const docId = new mongoose.Types.ObjectId(id)

  const doc = await KnowledgeDocument.findOne({ _id: docId, userId })
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.status !== 'ready' || doc.chunkCount < 3) {
    return NextResponse.json(
      { error: 'Document must be fully processed with at least 3 chunks' },
      { status: 400 },
    )
  }

  try {
    const evalResult = await evaluateRagQuality(
      docId,
      userId,
      doc.embeddingProvider,
    )

    let stakeholderBrief: string | undefined
    try {
      stakeholderBrief = await generateText(
        `Summarize this RAG quality evaluation for a non-technical stakeholder in 3-4 sentences.

Document: ${doc.originalName}
Chunks: ${evalResult.chunkCount}
Precision@5: ${(evalResult.precisionAt5 * 100).toFixed(1)}%
Mean top score: ${evalResult.meanTopScore}
Recommendation: ${evalResult.recommendation}`,
        'Be clear and business-focused.',
      )
    } catch {
      stakeholderBrief = evalResult.recommendation
    }

    await KnowledgeDocument.updateOne(
      { _id: docId },
      {
        $set: {
          ragEval: { ...evalResult, stakeholderBrief },
          ragEvaluatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      eval: evalResult,
      stakeholderBrief,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Evaluation failed' },
      { status: 500 },
    )
  }
}
