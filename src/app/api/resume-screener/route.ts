import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Groq from 'groq-sdk'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'

export const runtime = 'nodejs'

async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const jd = formData.get('jd') as string | null

    if (!file || !jd) {
      return NextResponse.json({ error: 'Missing file or Job Description.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 })
    }

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    let resumeText = ''
    try {
      resumeText = await extractPdfText(buffer)
    } catch (err: any) {
      console.error('PDF parsing failed:', err)
      return NextResponse.json({ error: 'Failed to extract text from the provided PDF.' }, { status: 400 })
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: 'The PDF appears to be empty or contains no extractable text.' }, { status: 400 })
    }

    // Create system prompt
    const systemPrompt = `You are an expert technical recruiter and hiring manager.
Your task is to evaluate a candidate's Resume against a specific Job Description (JD).

Provide a highly structured, objective, and detailed markdown report that includes:
1. **Overall Match Score**: A percentage (e.g., 85%) summarizing how well the candidate fits the role.
2. **Key Strengths**: Bullet points of where the candidate strongly aligns with the JD.
3. **Missing Skills / Areas of Concern**: Bullet points highlighting gaps or red flags.
4. **Final Recommendation**: A clear verdict (e.g., "Proceed to Phone Screen", "Reject", "Borderline - Needs Clarification") along with a brief rationale.

Use markdown headings (##), bold text (**text**), and bulleted lists where appropriate to make it highly readable.`

    const userPrompt = `## Job Description
${jd.trim()}

## Candidate Resume
${resumeText.trim()}`

    // Stream from Groq (Llama 3.1)
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
    const groqStream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const encoder = new TextEncoder()
    let fullText = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of groqStream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              fullText += text
              controller.enqueue(encoder.encode(text))
            }
          }
        } catch (streamErr) {
          console.error('Stream error:', streamErr)
          controller.enqueue(encoder.encode('\n\n**[Error: Generation interrupted]**'))
        } finally {
          controller.close()

          // Persist to MongoDB (fire and forget)
          if (session?.user?.id && fullText.trim()) {
            connectDB()
              .then(() => {
                return Generation.create({
                  userId: session.user.id,
                  type: 'text',
                  prompt: `Resume Screening vs JD: ${jd.trim().substring(0, 100)}...`,
                  result: fullText,
                  model: 'llama-3.1-8b-instant',
                  tokensUsed: Math.ceil(fullText.length / 4),
                  metadata: { format: 'resume-screener' },
                })
              })
              .catch(err => console.error('[resume-screener] DB save failed:', err))
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error: any) {
    console.error('Resume screener error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during screening.' },
      { status: 500 }
    )
  }
}
