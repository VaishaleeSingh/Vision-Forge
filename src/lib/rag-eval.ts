import mongoose from 'mongoose'
import DocumentChunk from '@/models/DocumentChunk'
import { retrieveRelevantChunks } from '@/lib/rag'
import type { EmbeddingProviderId } from '@/lib/embeddings'

export type RagEvalResult = {
  documentId: string
  chunkCount: number
  samplesEvaluated: number
  precisionAt5: number
  meanTopScore: number
  hitRate: number
  embeddingProvider?: string
  recommendation: string
  evaluatedAt: string
}

function queryFromChunk(content: string): string {
  const sentence = content.split(/[.!?]\s+/)[0]?.trim() || content
  return sentence.slice(0, 200)
}

/** Hold-out style RAG eval: use chunk text as query, check if same doc chunk is retrieved */
export async function evaluateRagQuality(
  documentId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  embeddingProvider?: EmbeddingProviderId,
): Promise<RagEvalResult> {
  const chunks = await DocumentChunk.find({ documentId, userId })
    .sort({ 'metadata.chunkIndex': 1 })
    .select('content metadata.chunkIndex')
    .lean()

  if (chunks.length < 3) {
    throw new Error('Need at least 3 document chunks to evaluate RAG quality')
  }

  const sampleSize = Math.min(10, Math.max(3, Math.floor(chunks.length * 0.3)))
  const step = Math.max(1, Math.floor(chunks.length / sampleSize))
  const samples = chunks.filter((_, i) => i % step === 0).slice(0, sampleSize)

  let hits = 0
  let scoreSum = 0

  for (const chunk of samples) {
    const query = queryFromChunk(chunk.content)
    const retrieved = await retrieveRelevantChunks(
      query,
      documentId,
      userId,
      embeddingProvider,
      5,
    )
    const top = retrieved[0]
    if (top) scoreSum += top.score

    const chunkIndex = chunk.metadata?.chunkIndex ?? -1
    const hit = retrieved.some(
      (r) => r.chunkIndex === chunkIndex && r.score > 0.35,
    )
    if (hit) hits++
  }

  const precisionAt5 = samples.length > 0 ? hits / samples.length : 0
  const meanTopScore = samples.length > 0 ? scoreSum / samples.length : 0

  let recommendation: string
  if (precisionAt5 >= 0.8) {
    recommendation =
      'RAG retrieval is strong for this document. Suitable for stakeholder demos and production Q&A.'
  } else if (precisionAt5 >= 0.5) {
    recommendation =
      'Moderate retrieval quality. Consider re-uploading after chunking improvements or adding more structured headings in source PDFs.'
  } else {
    recommendation =
      'Weak retrieval on sampled queries. Re-embed documents with Hugging Face BGE, shorten chunks, or enrich source content.'
  }

  return {
    documentId: documentId.toString(),
    chunkCount: chunks.length,
    samplesEvaluated: samples.length,
    precisionAt5: Math.round(precisionAt5 * 1000) / 1000,
    meanTopScore: Math.round(meanTopScore * 1000) / 1000,
    hitRate: Math.round(precisionAt5 * 1000) / 1000,
    embeddingProvider,
    recommendation,
    evaluatedAt: new Date().toISOString(),
  }
}
