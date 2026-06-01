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
      // Fallback: Groq
      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ],
        max_tokens: 2048,
      })
      return completion.choices[0]?.message?.content || ''
    } catch (groqError) {
      console.error('Both Gemini and Groq failed:', groqError)
      throw new Error('AI service unavailable. Please try again.')
    }
  }
}

// === Generate Embeddings ===
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = geminiClient.getGenerativeModel({ model: 'text-embedding-004' })
  try {
    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (err: any) {
    // Fallback to older embedding model if 004 is not available for this API key
    if (err.message?.includes('not found') || err.message?.includes('404')) {
      const actualFallback = geminiClient.getGenerativeModel({ model: 'gemini-embedding-2' })
      const res = await actualFallback.embedContent(text)
      return res.embedding.values
    }
    throw err
  }
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
