import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const envPath = path.join(process.cwd(), '.env.local')
    let gemini = ''
    let groq = ''
    let fal = ''
    let huggingface = ''
    let mongodb = ''
    let googleId = ''
    let googleSecret = ''
    let githubId = ''
    let githubSecret = ''
    let nextauthSecret = ''

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split('\n')) {
        if (line.startsWith('GEMINI_API_KEY=')) gemini = line.split('=')[1].trim()
        if (line.startsWith('GROQ_API_KEY=')) groq = line.split('=')[1].trim()
        if (line.startsWith('FAL_API_KEY=')) fal = line.split('=')[1].trim()
        if (line.startsWith('HUGGINGFACE_API_KEY=')) huggingface = line.split('=')[1].trim()
        if (line.startsWith('MONGODB_URI=')) mongodb = line.split('=')[1].trim()
        if (line.startsWith('GOOGLE_CLIENT_ID=')) googleId = line.split('=')[1].trim()
        if (line.startsWith('GOOGLE_CLIENT_SECRET=')) googleSecret = line.split('=')[1].trim()
        if (line.startsWith('GITHUB_CLIENT_ID=')) githubId = line.split('=')[1].trim()
        if (line.startsWith('GITHUB_CLIENT_SECRET=')) githubSecret = line.split('=')[1].trim()
        if (line.startsWith('NEXTAUTH_SECRET=')) nextauthSecret = line.split('=')[1].trim()
      }
    }

    return NextResponse.json({ 
      gemini, groq, fal, huggingface, 
      mongodb, googleId, googleSecret, 
      githubId, githubSecret, nextauthSecret 
    })
  } catch (error) {
    console.error('[Settings API] GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      gemini, groq, fal, huggingface, 
      mongodb, googleId, googleSecret, 
      githubId, githubSecret, nextauthSecret 
    } = await req.json()
    const envPath = path.join(process.cwd(), '.env.local')

    let content = ''
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8')
    }

    const lines = content.split('\n')
    const newLines = []
    let hasGemini = false, hasGroq = false, hasFal = false, hasHf = false
    let hasMongo = false, hasGoogleId = false, hasGoogleSecret = false
    let hasGithubId = false, hasGithubSecret = false, hasNextauthSecret = false

    for (const line of lines) {
      if (line.startsWith('GEMINI_API_KEY=')) { newLines.push(`GEMINI_API_KEY=${gemini}`); hasGemini = true; }
      else if (line.startsWith('GROQ_API_KEY=')) { newLines.push(`GROQ_API_KEY=${groq}`); hasGroq = true; }
      else if (line.startsWith('FAL_API_KEY=')) { newLines.push(`FAL_API_KEY=${fal}`); hasFal = true; }
      else if (line.startsWith('HUGGINGFACE_API_KEY=')) { newLines.push(`HUGGINGFACE_API_KEY=${huggingface}`); hasHf = true; }
      else if (line.startsWith('MONGODB_URI=')) { newLines.push(`MONGODB_URI=${mongodb}`); hasMongo = true; }
      else if (line.startsWith('GOOGLE_CLIENT_ID=')) { newLines.push(`GOOGLE_CLIENT_ID=${googleId}`); hasGoogleId = true; }
      else if (line.startsWith('GOOGLE_CLIENT_SECRET=')) { newLines.push(`GOOGLE_CLIENT_SECRET=${googleSecret}`); hasGoogleSecret = true; }
      else if (line.startsWith('GITHUB_CLIENT_ID=')) { newLines.push(`GITHUB_CLIENT_ID=${githubId}`); hasGithubId = true; }
      else if (line.startsWith('GITHUB_CLIENT_SECRET=')) { newLines.push(`GITHUB_CLIENT_SECRET=${githubSecret}`); hasGithubSecret = true; }
      else if (line.startsWith('NEXTAUTH_SECRET=')) { newLines.push(`NEXTAUTH_SECRET=${nextauthSecret}`); hasNextauthSecret = true; }
      else {
        if (line.trim() !== '') newLines.push(line)
      }
    }

    if (!hasGemini && gemini) newLines.push(`GEMINI_API_KEY=${gemini}`)
    if (!hasGroq && groq) newLines.push(`GROQ_API_KEY=${groq}`)
    if (!hasFal && fal) newLines.push(`FAL_API_KEY=${fal}`)
    if (!hasHf && huggingface) newLines.push(`HUGGINGFACE_API_KEY=${huggingface}`)
    if (!hasMongo && mongodb) newLines.push(`MONGODB_URI=${mongodb}`)
    if (!hasGoogleId && googleId) newLines.push(`GOOGLE_CLIENT_ID=${googleId}`)
    if (!hasGoogleSecret && googleSecret) newLines.push(`GOOGLE_CLIENT_SECRET=${googleSecret}`)
    if (!hasGithubId && githubId) newLines.push(`GITHUB_CLIENT_ID=${githubId}`)
    if (!hasGithubSecret && githubSecret) newLines.push(`GITHUB_CLIENT_SECRET=${githubSecret}`)
    if (!hasNextauthSecret && nextauthSecret) newLines.push(`NEXTAUTH_SECRET=${nextauthSecret}`)

    fs.writeFileSync(envPath, newLines.join('\n') + '\n', 'utf8')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Settings API] POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
