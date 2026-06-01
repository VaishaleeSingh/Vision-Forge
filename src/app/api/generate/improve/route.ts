import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

// ─── Action → instruction map ────────────────────────────────────────────────

type ImproveAction = 'improve' | 'viral' | 'professional' | 'summarize'

const ACTION_PROMPTS: Record<ImproveAction, string> = {
  improve: `You are an expert editor. Rewrite the following content to make it significantly better.
Improve:
- Clarity and flow: remove redundancy, tighten sentences.
- Engagement: stronger opening and closing, vivid language, varied sentence length.
- Structure: ensure logical progression and smooth transitions.
- Impact: elevate the overall quality while preserving the original meaning and intent.

Return ONLY the rewritten content. No commentary, no preamble.`,

  viral: `You are a viral content strategist who understands social psychology, attention economics, and what makes content spread.
Transform the following content to maximize shareability and engagement:
- Add a powerful, curiosity-triggering hook in the first 2 sentences.
- Use pattern interrupts, bold claims, and surprising angles.
- Incorporate emotional triggers (awe, amusement, inspiration, controversy where appropriate).
- Use power words, short punchy sentences, and rhythm.
- End with a compelling call-to-action or open loop that invites responses.

Return ONLY the rewritten content. No commentary, no preamble.`,

  professional: `You are a senior communications strategist. Rewrite the following content to the highest professional standard:
- Adopt a polished, authoritative, and confident tone.
- Use precise, industry-appropriate vocabulary.
- Improve structure with clear sections, logical flow, and formal transitions.
- Remove colloquialisms, contractions, and overly casual phrases.
- Strengthen the argument or narrative with concise, well-supported points.

Return ONLY the rewritten content. No commentary, no preamble.`,

  summarize: `You are a skilled summarizer. Create a concise, high-quality summary of the following content:
- Capture all key points, arguments, and conclusions.
- Reduce to approximately 20–25% of the original length.
- Use clear, crisp language.
- Preserve the essential meaning and any important nuances.
- Structure the summary logically (e.g. with bullet points if the source is list-like, or prose if narrative).

Return ONLY the summary. No commentary, no preamble.`,
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { text?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { text = '', action = 'improve' } = body

  if (!text.trim()) {
    return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
  }

  const validActions: ImproveAction[] = ['improve', 'viral', 'professional', 'summarize']
  if (!validActions.includes(action as ImproveAction)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${validActions.join(', ')}.` },
      { status: 400 }
    )
  }

  const systemInstruction = ACTION_PROMPTS[action as ImproveAction]
  const userMessage       = `Here is the content to rewrite:\n\n${text.trim()}`

  // ── Try Gemini Flash first ─────────────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      systemInstruction,
    })

    const result = response.response.text()

    if (!result?.trim()) {
      throw new Error('Empty response from Gemini.')
    }

    return NextResponse.json({ result: result.trim() })
  } catch (geminiErr) {
    console.warn('[improve/route] Gemini failed, falling back to Groq:', geminiErr)
  }

  // ── Fallback: Groq ─────────────────────────────────────────────────────────
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

    const completion = await groq.chat.completions.create({
      model:      'llama-3.1-8b-instant',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user',   content: userMessage },
      ],
    })

    const result = completion.choices[0]?.message?.content ?? ''

    if (!result.trim()) {
      throw new Error('Empty response from Groq.')
    }

    return NextResponse.json({ result: result.trim() })
  } catch (groqErr) {
    console.error('[improve/route] Both Gemini and Groq failed:', groqErr)
    return NextResponse.json(
      { error: 'AI service is temporarily unavailable. Please try again in a moment.' },
      { status: 503 }
    )
  }
}
