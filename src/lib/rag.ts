import mongoose from 'mongoose'
import DocumentChunk from '@/models/DocumentChunk'
import { generateDocumentEmbedding, type EmbeddingProviderId } from '@/lib/embeddings'

export interface RelevantChunk {
  content: string
  chunkIndex: number
  pageNumber?: number
  source: string
  score: number
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
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

function keywordBoost(chunkText: string, query: string): number {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
  if (words.length === 0) return 0

  const lower = chunkText.toLowerCase()
  let hits = 0
  for (const word of words) {
    if (lower.includes(word)) hits++
  }
  return hits / words.length
}

export async function retrieveRelevantChunks(
  message: string,
  documentId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  embeddingProvider?: EmbeddingProviderId,
  topK = 8,
): Promise<RelevantChunk[]> {
  const { values: queryEmbedding } = await generateDocumentEmbedding(
    message,
    embeddingProvider,
    'query',
  )

  const chunks = await DocumentChunk.find({ documentId, userId })
    .select('content embedding metadata')
    .lean()

  if (chunks.length === 0) return []

  const queryDim = queryEmbedding.length
  const compatible = chunks.filter(
    (c) => Array.isArray(c.embedding) && c.embedding.length === queryDim,
  )

  if (compatible.length === 0) {
    console.error(
      `[RAG] No chunks match embedding dimension ${queryDim}. Re-upload the document.`,
    )
    return []
  }

  const scored = compatible
    .map((chunk) => {
      const semantic = cosineSimilarity(queryEmbedding, chunk.embedding as number[])
      const lexical = keywordBoost(chunk.content, message)
      const score = semantic * 0.75 + lexical * 0.25
      return {
        content: chunk.content,
        chunkIndex: (chunk.metadata?.chunkIndex as number) ?? 0,
        pageNumber: chunk.metadata?.pageNumber as number | undefined,
        source: (chunk.metadata?.source as string) ?? '',
        score,
        semantic,
      }
    })
    .filter((c) => c.semantic > 0.15 || c.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  if (scored.length > 0) {
    return scored.map(({ content, chunkIndex, pageNumber, source, score }) => ({
      content,
      chunkIndex,
      pageNumber,
      source,
      score,
    }))
  }

  // Last resort: return top semantic matches even if below threshold
  return compatible
    .map((chunk) => ({
      content: chunk.content,
      chunkIndex: (chunk.metadata?.chunkIndex as number) ?? 0,
      pageNumber: chunk.metadata?.pageNumber as number | undefined,
      source: (chunk.metadata?.source as string) ?? '',
      score: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
