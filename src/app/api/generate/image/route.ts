import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Generation from '@/models/Generation'
import { IMAGE_STYLES } from '@/lib/prompt-templates'
import { sleep } from '@/lib/utils'

interface FalResponse {
  images: { url: string }[]
  seed?: number
}

interface HuggingFaceError {
  error?: string
  estimated_time?: number
}

function buildEnhancedPrompt(prompt: string, styleId: string): string {
  const style = IMAGE_STYLES.find((s) => s.id === styleId)
  const suffix = style?.suffix ?? ''
  let enhanced = prompt.trim()
  if (suffix) enhanced = `${enhanced}, ${suffix}`
  return enhanced
}

async function bufferToDataUrl(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const base64 = Buffer.from(buffer).toString('base64')
  const mime = mimeType.split(';')[0] || 'image/jpeg'
  return `data:${mime};base64,${base64}`
}

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
  if (negativePrompt) body.negative_prompt = negativePrompt

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
    throw new Error(`fal.ai ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as FalResponse
  const imageUrl = data.images?.[0]?.url
  if (!imageUrl) throw new Error('fal.ai returned no image URL')
  return { url: imageUrl, seed: data.seed }
}

async function generateViaHuggingFace(enhancedPrompt: string): Promise<{ url: string }> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not configured')

  const models = [
    'black-forest-labs/FLUX.1-schnell',
    'stabilityai/sdxl-turbo',
  ]

  let lastError = 'Hugging Face unavailable'

  for (const model of models) {
    const endpoint = `https://router.huggingface.co/hf-inference/models/${model}`

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: enhancedPrompt }),
      })

      if (res.status === 503) {
        const err = (await res.json().catch(() => ({}))) as HuggingFaceError
        const waitMs = Math.min((err.estimated_time ?? 12) * 1000, 25000)
        console.warn(`[Image API] HF ${model} loading, retry in ${waitMs}ms`)
        await sleep(waitMs)
        continue
      }

      if (!res.ok) {
        lastError = `HF ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`
        break
      }

      const contentType = res.headers.get('content-type') || 'image/jpeg'
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as { url?: string }
        if (data.url) return { url: data.url }
        lastError = `HF ${model} returned JSON without image URL`
        break
      }

      const buffer = await res.arrayBuffer()
      if (buffer.byteLength < 100) {
        lastError = `HF ${model} returned empty image`
        break
      }

      return { url: await bufferToDataUrl(buffer, contentType) }
    }
  }

  throw new Error(lastError)
}

async function generateViaStableHorde(enhancedPrompt: string): Promise<{ url: string }> {
  const apiKey = process.env.STABLE_HORDE_API_KEY || '0000000000'

  const submitRes = await fetch('https://stablehorde.net/api/v2/generate/async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      params: { width: 1024, height: 768, steps: 22 },
      nsfw: false,
      censor_nsfw: true,
      trusted_workers: false,
    }),
  })

  if (!submitRes.ok) {
    throw new Error(`Stable Horde submit ${submitRes.status}`)
  }

  const { id: jobId } = (await submitRes.json()) as { id?: string }
  if (!jobId) throw new Error('Stable Horde returned no job id')

  for (let i = 0; i < 60; i++) {
    await sleep(3000)

    const statusRes = await fetch(
      `https://stablehorde.net/api/v2/generate/status/${jobId}`,
      { headers: { apikey: apiKey } },
    )
    if (!statusRes.ok) continue

    const status = (await statusRes.json()) as {
      done?: boolean
      faulted?: boolean
      generations?: { img?: string }[]
    }

    if (status.faulted) throw new Error('Stable Horde job failed')

    if (status.done && status.generations?.[0]?.img) {
      return { url: status.generations[0].img }
    }
  }

  throw new Error('Stable Horde timed out')
}

async function generateViaPollinations(enhancedPrompt: string): Promise<{ url: string }> {
  const pollinationsKey = process.env.POLLINATIONS_API_KEY
  const url = new URL(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}`,
  )
  url.searchParams.set('width', '1024')
  url.searchParams.set('height', '768')
  url.searchParams.set('nologo', 'true')

  const headers: Record<string, string> = {}
  if (pollinationsKey) headers.Authorization = `Bearer ${pollinationsKey}`

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) throw new Error(`Pollinations ${res.status}`)

  const blob = await res.blob()
  const arrayBuffer = await blob.arrayBuffer()
  return { url: await bufferToDataUrl(arrayBuffer, blob.type || 'image/jpeg') }
}

type ProviderAttempt = {
  name: string
  run: () => Promise<{ url: string; seed?: number }>
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as {
      prompt?: string
      style?: string
      negativePrompt?: string
    }

    const { prompt, style = 'photorealistic', negativePrompt = '' } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const enhancedPrompt = buildEnhancedPrompt(prompt.trim(), style)

    const providers: ProviderAttempt[] = []

    if (process.env.FAL_API_KEY) {
      providers.push({
        name: 'fal-ai/flux-schnell',
        run: () => generateViaFal(enhancedPrompt, negativePrompt),
      })
    }

    if (process.env.HUGGINGFACE_API_KEY) {
      providers.push({
        name: 'huggingface/FLUX.1-schnell',
        run: () => generateViaHuggingFace(enhancedPrompt),
      })
    }

    providers.push({
      name: 'pollinations-ai',
      run: () => generateViaPollinations(enhancedPrompt),
    })

    providers.push({
      name: 'stable-horde',
      run: () => generateViaStableHorde(enhancedPrompt),
    })

    const errors: string[] = []
    let imageUrl: string | undefined
    let modelUsed: string | undefined
    let seed: number | undefined

    for (const provider of providers) {
      try {
        console.log(`[Image API] Trying ${provider.name}…`)
        const result = await provider.run()
        imageUrl = result.url
        seed = result.seed
        modelUsed = provider.name
        break
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[Image API] ${provider.name} failed:`, msg)
        errors.push(`${provider.name}: ${msg}`)
      }
    }

    if (!imageUrl || !modelUsed) {
      const hint = !process.env.HUGGINGFACE_API_KEY
        ? 'Add HUGGINGFACE_API_KEY to .env (free tier works via Hugging Face Inference). Top up fal.ai or wait for Stable Horde queue.'
        : 'All providers failed. Check API keys and try again in a minute.'

      return NextResponse.json(
        {
          error: 'Image generation failed. No provider could create an image.',
          hint,
          details: errors.slice(0, 4),
        },
        { status: 503 },
      )
    }

    try {
      await connectDB()
      await Generation.create({
        userId: session.user.id,
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
    } catch (dbError) {
      console.error('[Image API] DB save failed (non-fatal):', dbError)
    }

    return NextResponse.json({
      imageUrl,
      model: modelUsed,
      enhancedPrompt,
      seed,
    })
  } catch (error) {
    console.error('[Image API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
