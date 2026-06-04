import { GoogleGenerativeAI } from '@google/generative-ai'
import { sleep } from '@/lib/utils'

export type EmbeddingProviderId = 'gemini' | 'huggingface-bge'
export type EmbeddingPurpose = 'query' | 'document'

/** BGE models require different prefixes for search vs storage */
function formatForEmbedding(text: string, provider: EmbeddingProviderId, purpose: EmbeddingPurpose): string {
  const trimmed = text.trim().slice(0, 8000)
  if (provider === 'huggingface-bge') {
    return purpose === 'query' ? `query: ${trimmed}` : `passage: ${trimmed}`
  }
  return trimmed
}

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const HF_EMBED_MODEL = 'BAAI/bge-small-en-v1.5'

function parseRetryDelayMs(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i)
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500
  return null
}

async function embedGemini(text: string): Promise<number[]> {
  const trimmed = text.trim().slice(0, 8000)
  if (!trimmed) throw new Error('Empty text for embedding')

  const models = ['text-embedding-004', 'gemini-embedding-2']
  let lastError: Error | null = null

  for (const modelName of models) {
    try {
      const model = geminiClient.getGenerativeModel({ model: modelName })
      const result = await model.embedContent(trimmed)
      const values = result.embedding?.values
      if (!values?.length) throw new Error(`Gemini ${modelName} returned empty embedding`)
      return values
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (!lastError.message.includes('not found') && !lastError.message.includes('404')) {
        throw lastError
      }
    }
  }

  throw lastError ?? new Error('Gemini embedding failed')
}

async function embedGeminiWithRetry(text: string, maxAttempts = 4): Promise<number[]> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await embedGemini(text)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const is429 =
        lastError.message.includes('429') ||
        lastError.message.includes('quota') ||
        lastError.message.includes('Too Many Requests')

      if (!is429 || attempt === maxAttempts - 1) throw lastError

      const delay = parseRetryDelayMs(lastError.message) ?? 2000 * (attempt + 1)
      console.warn(`[embeddings] Gemini rate limit, retry in ${delay}ms`)
      await sleep(delay)
    }
  }

  throw lastError ?? new Error('Gemini embedding failed')
}

async function embedHuggingFaceBge(text: string, purpose: EmbeddingPurpose): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not configured')

  const trimmed = formatForEmbedding(text, 'huggingface-bge', purpose)
  if (!trimmed) throw new Error('Empty text for embedding')

  const res = await fetch(
    `https://router.huggingface.co/hf-inference/models/${HF_EMBED_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: trimmed }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Hugging Face embedding ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as number[] | number[][]
  const values = Array.isArray(data[0]) ? (data[0] as number[]) : (data as number[])

  if (!Array.isArray(values) || values.length < 8) {
    throw new Error('Hugging Face returned invalid embedding')
  }

  return values
}

/** Generate embedding; prefers HF when key is set (avoids Gemini embed quota limits). */
export async function generateDocumentEmbedding(
  text: string,
  preferredProvider?: EmbeddingProviderId,
  purpose: EmbeddingPurpose = 'document',
): Promise<{ values: number[]; provider: EmbeddingProviderId }> {
  const order: EmbeddingProviderId[] =
    preferredProvider === 'gemini'
      ? ['gemini', 'huggingface-bge']
      : preferredProvider === 'huggingface-bge'
        ? ['huggingface-bge', 'gemini']
        : process.env.HUGGINGFACE_API_KEY
          ? ['huggingface-bge', 'gemini']
          : ['gemini', 'huggingface-bge']

  const errors: string[] = []

  for (const provider of order) {
    try {
      if (provider === 'huggingface-bge') {
        if (!process.env.HUGGINGFACE_API_KEY) continue
        const values = await embedHuggingFaceBge(text, purpose)
        return { values, provider }
      }
      if (!process.env.GEMINI_API_KEY) continue
      const values = await embedGeminiWithRetry(text)
      return { values, provider: 'gemini' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${provider}: ${msg}`)
      console.warn(`[embeddings] ${provider} failed:`, msg)
    }
  }

  throw new Error(
    errors.length > 0
      ? `Embedding failed. ${errors[0]}`
      : 'No embedding provider configured. Set HUGGINGFACE_API_KEY or GEMINI_API_KEY in .env',
  )
}

export async function batchDocumentEmbeddings(
  chunks: string[],
  provider?: EmbeddingProviderId,
  onProgress?: (done: number, total: number) => void,
): Promise<{ embeddings: number[][]; provider: EmbeddingProviderId }> {
  if (chunks.length === 0) {
    throw new Error('No chunks to embed')
  }

  const first = await generateDocumentEmbedding(chunks[0], provider, 'document')
  const resolvedProvider = first.provider
  const embeddings: number[][] = [first.values]

  const delayMs = resolvedProvider === 'gemini' ? 1200 : 200

  for (let i = 1; i < chunks.length; i++) {
    if (i % 5 === 0) {
      await sleep(delayMs)
    }
    const { values } = await generateDocumentEmbedding(chunks[i], resolvedProvider, 'document')
    embeddings.push(values)
    onProgress?.(i + 1, chunks.length)
  }

  return { embeddings, provider: resolvedProvider }
}
