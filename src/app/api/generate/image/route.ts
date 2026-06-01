import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'
import User from '@/models/User'
import { IMAGE_STYLES } from '@/lib/prompt-templates'

// ── Types ──────────────────────────────────────────────────────────────────
interface FalImage {
  url: string
  width?: number
  height?: number
  content_type?: string
}

interface FalResponse {
  images: FalImage[]
  seed?: number
  prompt?: string
}

interface HuggingFaceError {
  error?: string
  estimated_time?: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Looks up the style suffix for a given style id.
 * Falls back gracefully if id is not found.
 */
function buildEnhancedPrompt(prompt: string, styleId: string, negativePrompt?: string): string {
  const style = IMAGE_STYLES.find((s) => s.id === styleId)
  const suffix = style?.suffix ?? ''

  let enhanced = prompt.trim()
  if (suffix) enhanced = `${enhanced}, ${suffix}`

  // Optionally bake negative prompt hint into positive (some models support this)
  // We keep it separate for APIs that have a dedicated field.
  return enhanced
}

/**
 * Attempt image generation via fal.ai (FLUX.1-schnell).
 * Returns the image URL, or throws on failure.
 */
async function generateViaFal(
  enhancedPrompt: string,
  negativePrompt: string,
): Promise<{ url: string; seed?: number }> {
  const apiKey = process.env.FAL_API_KEY
  if (!apiKey) throw new Error('FAL_API_KEY not configured')

  const body: Record<string, unknown> = {
    prompt: enhancedPrompt,
    image_size: 'landscape_4_3',
    num_inference_steps: 4,
    num_images: 1,
    enable_safety_checker: true,
  }

  if (negativePrompt) {
    body.negative_prompt = negativePrompt
  }

  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`fal.ai error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as FalResponse

  const imageUrl = data.images?.[0]?.url
  if (!imageUrl) throw new Error('fal.ai returned no image URL')

  return { url: imageUrl, seed: data.seed }
}

/**
 * Fallback: Pollinations.ai API (Free, no auth required).
 * Returns a data URL (base64 JPEG) wrapped in an object-URL-friendly shape.
 */
async function generateViaPollinations(enhancedPrompt: string): Promise<{ url: string }> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=768&nologo=true`
  
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Pollinations API error ${res.status}`)
  }

  // Pollinations returns raw binary image bytes
  const blob = await res.blob()

  // Convert to base64 data URL so we can return a URL string
  const arrayBuffer = await blob.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = blob.type || 'image/jpeg'
  const dataUrl = `data:${mimeType};base64,${base64}`

  return { url: dataUrl }
}

// ── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body
    const body = await req.json() as {
      prompt?: string
      style?: string
      negativePrompt?: string
    }

    const { prompt, style = 'photorealistic', negativePrompt = '' } = body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // 3. Build enhanced prompt
    const enhancedPrompt = buildEnhancedPrompt(prompt.trim(), style, negativePrompt)

    // 4. Try fal.ai first, then HuggingFace
    let imageUrl: string
    let modelUsed: string
    let seed: number | undefined

    try {
      const result = await generateViaFal(enhancedPrompt, negativePrompt)
      imageUrl = result.url
      seed = result.seed
      modelUsed = 'fal-ai/flux-schnell'
    } catch (falError) {
      console.warn('[Image API] fal.ai failed (likely out of credits), falling back to Pollinations:', falError)
      try {
        const result = await generateViaPollinations(enhancedPrompt)
        imageUrl = result.url
        modelUsed = 'pollinations-ai'
      } catch (fallbackError) {
        console.error('[Image API] Both providers failed:', fallbackError)
        return NextResponse.json(
          { error: 'Image generation service unavailable. Please try again later.' },
          { status: 503 },
        )
      }
    }

    // 5. Persist to MongoDB (best-effort – don't fail the request if DB is down)
    try {
      await connectDB()
      const dbUser = await User.findOne({ email: session.user.email })
      if (dbUser) {
        await Generation.create({
          userId: dbUser._id,
          type: 'image',
          prompt: prompt.trim(),
          result: imageUrl,
          model: modelUsed,
          tokensUsed: 0,
          metadata: {
            style,
            seed,
            negativePrompt: negativePrompt || undefined,
          },
        })
      }
    } catch (dbError) {
      console.error('[Image API] DB save failed (non-fatal):', dbError)
    }

    // 6. Return result
    return NextResponse.json({
      imageUrl,
      model: modelUsed,
      enhancedPrompt,
      seed,
    })
  } catch (error) {
    console.error('[Image API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
