import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format large numbers */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

/** Format bytes to human readable */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Estimate token count (~4 chars per token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}

/** Format relative time */
export function timeAgo(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000

  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/** Simple cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
}

/** Split text into overlapping chunks */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap:   number = 50
): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    // Find a good break point (sentence or word boundary)
    let end = Math.min(i + chunkSize, text.length)
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end)
      const lastNewline = text.lastIndexOf('\n', end)
      const breakPoint = Math.max(lastPeriod, lastNewline)
      if (breakPoint > i + chunkSize * 0.5) end = breakPoint + 1
    }
    chunks.push(text.slice(i, end).trim())
    i = end - overlap
  }
  return chunks.filter(c => c.length > 20)
}

/** Sleep utility */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
