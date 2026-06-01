import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { SYSTEM_PROMPTS } from '@/lib/prompt-templates'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── Simple in-memory rate limiter (max 20 req/hour per user/IP) ─────────────

const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT    = 20
const WINDOW_MS     = 60 * 60 * 1000 // 1 hour

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now   = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count }
}

// ─── Length to word-count instruction ────────────────────────────────────────

function getLengthInstruction(words: number): string {
  if (words <= 200) return 'Write a concise piece of approximately 150–250 words.'
  if (words <= 500) return 'Write a medium-length piece of approximately 400–600 words.'
  return 'Write a comprehensive, long-form piece of approximately 900–1100 words.'
}

// ─── Format-specific instructions ────────────────────────────────────────────

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  blog:    'Structure this as a blog post with an attention-grabbing headline, introduction, well-organized body sections with bold subheadings, and a conclusion with a call to action. You MUST use highly relevant emojis throughout the text and ensure all headings and subheadings are properly bolded using Markdown (**Heading**).',
  email:   'Format this as a professional email with a clear subject line suggestion, greeting, concise body, and an appropriate sign-off.',
  social:  'Write this as an engaging social media post. Make it punchy, use line breaks for readability, and include relevant hashtag suggestions at the end.',
  ad:      'Write compelling advertising copy with a powerful headline, benefit-focused body, and a strong call to action. Keep it persuasive and concise.',
  product: 'Write a detailed product description that highlights key features, benefits, and use cases. Use scannable formatting with bullet points.',
  essay:   'Structure this as a formal essay with an introduction, clearly argued body paragraphs, and a conclusion that synthesizes the main points.',
  script:  'Format this as a video script with [INTRO], [MAIN CONTENT], and [OUTRO] sections. Include on-screen action notes in brackets where appropriate.',
  story:   'Write this as a compelling narrative with a clear story arc, descriptive language, and engaging dialogue where appropriate.',
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  const userId  = session?.user?.id ?? null

  // ── Rate limit key: use userId if authenticated, otherwise IP ──────────────
  const ip       = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rlKey    = userId ? `user:${userId}` : `ip:${ip}`
  const { allowed, remaining } = checkRateLimit(rlKey)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. You can generate up to 20 times per hour.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'Retry-After':           '3600',
        },
      }
    )
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { prompt?: string; tone?: string; format?: string; length?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    prompt = '',
    tone   = 'default',
    format = 'blog',
    length = 500,
  } = body

  if (!prompt.trim()) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  // ── Build prompts ──────────────────────────────────────────────────────────
  const systemKey    = tone as keyof typeof SYSTEM_PROMPTS
  const rawSysPrompt = SYSTEM_PROMPTS[systemKey]
  const systemPrompt = typeof rawSysPrompt === 'function'
    ? SYSTEM_PROMPTS.default   // functions are for RAG, fall back to default
    : (rawSysPrompt ?? SYSTEM_PROMPTS.default)

  const formatInstruction = FORMAT_INSTRUCTIONS[format] ?? FORMAT_INSTRUCTIONS.blog
  const lengthInstruction = getLengthInstruction(length)

  const userPrompt = `
${formatInstruction}
${lengthInstruction}

User request: ${prompt.trim()}

Begin the content now — do not include any preamble like "Sure!" or "Here's your content:". Just write the content directly.
  `.trim()

  // ── Accumulated text for DB save ──────────────────────────────────────────
  let fullText     = ''
  let modelUsed    = 'gemini-2.0-flash'
  let streamFailed = false

  // ── Streaming via ReadableStream ──────────────────────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        fullText += chunk
        controller.enqueue(encoder.encode(chunk))
      }

      // ── Try Gemini Flash streaming ────────────────────────────────────────
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const streamResult = await model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: systemPrompt as string,
        })

        for await (const chunk of streamResult.stream) {
          const text = chunk.text()
          if (text) send(text)
        }
      } catch (geminiErr) {
        console.warn('[text/route] Gemini stream failed, falling back to Groq:', geminiErr)
        streamFailed = true
      }

      // ── Fallback: Groq streaming ──────────────────────────────────────────
      if (streamFailed) {
        try {
          modelUsed  = 'llama-3.1-8b-instant'
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

          const groqStream = await groq.chat.completions.create({
            model:      'llama-3.1-8b-instant',
            max_tokens: Math.max(length * 2, 800),
            stream:     true,
            messages: [
              { role: 'system', content: systemPrompt as string },
              { role: 'user',   content: userPrompt },
            ],
          })

          for await (const chunk of groqStream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) send(text)
          }
        } catch (groqErr) {
          console.error('[text/route] Both Gemini and Groq failed:', groqErr)
          const errorMsg = '\n\n[Error: AI service temporarily unavailable. Please try again.]'
          controller.enqueue(encoder.encode(errorMsg))
          controller.close()
          return
        }
      }

      controller.close()

      // ── Persist to MongoDB (fire and forget) ─────────────────────────────
      if (userId && fullText.trim()) {
        connectDB()
          .then(() => {
            const tokenEst = Math.ceil(fullText.length / 4)
            return Generation.create({
              userId,
              type:       'text',
              prompt:     prompt.trim(),
              result:     fullText,
              model:      modelUsed,
              tokensUsed: tokenEst,
              metadata: { tone, format },
            })
          })
          .catch(err => console.error('[text/route] DB save failed:', err))
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':           'text/plain; charset=utf-8',
      'Transfer-Encoding':      'chunked',
      'X-RateLimit-Limit':      String(RATE_LIMIT),
      'X-RateLimit-Remaining':  String(remaining),
      'Cache-Control':          'no-cache, no-store',
      'X-Accel-Buffering':      'no',   // disable nginx buffering
    },
  })
}
