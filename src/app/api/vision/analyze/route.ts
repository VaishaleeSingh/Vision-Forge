import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'

// ── Gemini client ────────────────────────────────────────────────────────────
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ── Default analysis prompt ──────────────────────────────────────────────────
const DEFAULT_ANALYSIS_PROMPT = `Analyze this image in detail. Provide a comprehensive breakdown covering:

1. **Overview** – A concise description of what is depicted in the image.
2. **Key Elements** – Identify and describe the main subjects, objects, and visual components.
3. **Artistic Style & Mood** – Note the visual style (photographic, illustrative, abstract, etc.), color palette, lighting, and overall mood or atmosphere.
4. **Composition & Technique** – Comment on framing, perspective, depth, and any notable compositional choices.
5. **Creative Directions** – Suggest improvements or alternative creative interpretations that could enhance the image.

Be specific, insightful, and use clear language accessible to both artists and general audiences.`

// ── Supported MIME types ─────────────────────────────────────────────────────
const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
])

function normalizeMimeType(mimeType: string): string {
  const lower = mimeType.toLowerCase()
  if (lower === 'image/jpg') return 'image/jpeg'
  if (SUPPORTED_MIME_TYPES.has(lower)) return lower
  return 'image/jpeg' // safe fallback
}

// ── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request – supports both JSON and multipart/form-data
    let imageBase64: string
    let mimeType: string
    let analysisPrompt: string

    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      // Multipart upload
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const promptField = formData.get('prompt') as string | null

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      imageBase64 = Buffer.from(arrayBuffer).toString('base64')
      mimeType = file.type || 'image/jpeg'
      analysisPrompt = promptField?.trim() || DEFAULT_ANALYSIS_PROMPT
    } else {
      // JSON body: { imageBase64, mimeType, prompt? }
      const body = await req.json() as {
        imageBase64?: string
        mimeType?: string
        prompt?: string
      }

      const { imageBase64: b64, mimeType: mt, prompt: p } = body

      if (!b64 || typeof b64 !== 'string') {
        return NextResponse.json(
          { error: 'imageBase64 is required' },
          { status: 400 },
        )
      }

      imageBase64 = b64
      mimeType = mt || 'image/jpeg'
      analysisPrompt = p?.trim() || DEFAULT_ANALYSIS_PROMPT
    }

    // 3. Validate base64
    if (!imageBase64 || imageBase64.length < 10) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }

    // 4. Normalize MIME type
    const normalizedMimeType = normalizeMimeType(mimeType)

    // 5. Build Gemini parts
    const imagePart: Part = {
      inlineData: {
        data: imageBase64,
        mimeType: normalizedMimeType,
      },
    }

    const textPart: Part = {
      text: analysisPrompt,
    }

    // 6. Call Gemini Vision
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    })

    let analysisText: string
    let modelUsed = 'gemini-2.0-flash'

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [imagePart, textPart],
          },
        ],
      })

      analysisText = result.response.text()
    } catch (geminiError) {
      try {
        modelUsed = 'gemini-2.5-flash'
        const fallbackModel = geminiClient.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        })
        const fallbackResult = await fallbackModel.generateContent({
          contents: [{ role: 'user', parts: [imagePart, textPart] }],
        })
        analysisText = fallbackResult.response.text()
      } catch (fallbackError) {
        console.error('[Vision API] Both Gemini models failed:', fallbackError)
        return NextResponse.json({ error: 'AI services are temporarily unavailable (Rate limited). Please try again later.' }, { status: 502 })
      }
    }

    // 7. Return result
    return NextResponse.json({
      analysis: analysisText,
      model: modelUsed,
      prompt: analysisPrompt === DEFAULT_ANALYSIS_PROMPT ? undefined : analysisPrompt,
    })
  } catch (error) {
    console.error('[Vision API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── GET: health check ────────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/vision/analyze',
    model: 'gemini-2.0-flash',
    accepts: ['application/json', 'multipart/form-data'],
  })
}
