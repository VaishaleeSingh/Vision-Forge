import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

// === Gemini Client ===
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const geminiFlash = () =>
  geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' })

export const geminiPro = () =>
  geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' })

export const geminiVision = () =>
  geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' })

// === Groq Client (Fallback) ===
export const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

/** Active Groq chat models (decommissioned models removed) */
export const GROQ_CHAT_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
] as const

export async function streamGroqChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onChunk: (text: string) => void,
  options?: { max_tokens?: number; temperature?: number },
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in .env')
  }

  let lastError: Error | null = null

  for (const model of GROQ_CHAT_MODELS) {
    try {
      const completion = await groqClient.chat.completions.create({
        model,
        messages,
        stream: true,
        max_tokens: options?.max_tokens ?? 4096,
        temperature: options?.temperature ?? 0.2,
      })

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) onChunk(content)
      }
      return model
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[Groq] ${model} failed:`, lastError.message)
    }
  }

  throw lastError ?? new Error('All Groq models failed')
}

function parseGroqRetryAfterMs(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err)
  const secMatch = msg.match(/try again in ([\d.]+)s/i)
  if (secMatch) return Math.ceil(parseFloat(secMatch[1]) * 1000) + 300
  return 2_500
}

function isGroqRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('429') ||
    msg.includes('rate_limit') ||
    msg.toLowerCase().includes('too many requests')
  )
}

/** Non-streaming Groq completion with model fallback and 429 retries */
export async function completeGroqChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { max_tokens?: number; temperature?: number; retries?: number },
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in .env')
  }

  const maxTokens = options?.max_tokens ?? 2048
  const retries = options?.retries ?? 4
  let lastError: Error | null = null

  for (const model of GROQ_CHAT_MODELS) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const completion = await groqClient.chat.completions.create({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: options?.temperature ?? 0.2,
        })
        return completion.choices[0]?.message?.content || ''
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (isGroqRateLimit(err) && attempt < retries - 1) {
          const waitMs = parseGroqRetryAfterMs(err)
          console.warn(`[Groq] ${model} rate limited, retry in ${waitMs}ms (${attempt + 1}/${retries})`)
          await new Promise((r) => setTimeout(r, waitMs))
          continue
        }
        console.warn(`[Groq] ${model} failed:`, lastError.message)
        break
      }
    }
  }

  throw lastError ?? new Error('All Groq models failed')
}

// === Generate Text with Fallback ===
export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    // Primary: Gemini Flash
    const model = geminiFlash()
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt,
    })
    return result.response.text()
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to Groq:', geminiError)
    try {
      return completeGroqChat(
        [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ],
        { max_tokens: 2048 },
      )
    } catch (groqError) {
      console.error('Both Gemini and Groq failed:', groqError)
      throw new Error('AI service unavailable. Please try again.')
    }
  }
}

// === Generate Embeddings (RAG / knowledge) ===
export async function generateEmbedding(
  text: string,
  provider?: import('@/lib/embeddings').EmbeddingProviderId,
  purpose: import('@/lib/embeddings').EmbeddingPurpose = 'query',
): Promise<number[]> {
  const { generateDocumentEmbedding } = await import('@/lib/embeddings')
  const { values } = await generateDocumentEmbedding(text, provider, purpose)
  return values
}

// === Analyze Image with Vision ===
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const model = geminiVision()
  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    { text: prompt },
  ])
  return result.response.text()
}

// === Token counting utility ===
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4)
}
