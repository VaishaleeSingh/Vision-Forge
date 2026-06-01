import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import { geminiFlash } from '@/lib/ai'
import AgentRun from '@/models/AgentRun'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AgentStep {
  step: number
  name: string
  status: 'pending' | 'running' | 'done' | 'error'
  content: string
}

function encodeSSE(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

async function generateWithGemini(prompt: string): Promise<string> {
  const model = geminiFlash()
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function generateWithGroq(prompt: string): Promise<string> {
  const { default: Groq } = await import('groq-sdk')
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
  })
  return completion.choices[0]?.message?.content || ''
}

async function callAI(prompt: string, model: string): Promise<string> {
  if (model === 'groq-llama') {
    return generateWithGroq(prompt)
  }
  try {
    return await generateWithGemini(prompt)
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('quota')) {
      console.warn('[Agent] Gemini rate limited (429), auto-falling back to Groq...')
      return generateWithGroq(prompt)
    }
    throw error
  }
}

// ─── Research Agent Steps ──────────────────────────────────────────────────────
const RESEARCH_STEPS = [
  {
    step: 1,
    name: 'Researcher Agent',
    prompt: (task: string) => `You are an expert research analyst. Your task:
"${task}"

Create a comprehensive research outline with:
1. Key topics and subtopics to investigate
2. Important facts, statistics, and data points
3. Multiple perspectives and viewpoints
4. Recent developments and trends
5. Expert opinions and consensus

Format your response as a structured research document with clear sections. Be thorough and detailed.`,
  },
  {
    step: 2,
    name: 'Writer Agent',
    prompt: (task: string, prevContent: string) => `You are an expert writer and communicator. Based on this research:

${prevContent}

Write a comprehensive, engaging, and well-structured article about: "${task}"

Requirements:
- Compelling introduction that hooks the reader
- Well-organized body with clear sections and subheadings
- Smooth transitions between ideas
- Concrete examples and evidence
- Strong conclusion with key takeaways
- Professional yet accessible tone

Make it publication-ready and authoritative.`,
  },
  {
    step: 3,
    name: 'Critic Agent',
    prompt: (task: string, prevContent: string) => `You are a meticulous editor and critic. Review this content:

${prevContent}

Evaluate on these dimensions (score each 1-10):
1. **Accuracy & Depth** - Is the information correct and comprehensive?
2. **Clarity & Structure** - Is it well-organized and easy to follow?
3. **Engagement** - Is it compelling and interesting to read?
4. **Completeness** - Does it fully address: "${task}"?
5. **Overall Quality**

Provide:
- Overall score: X/10
- Top 3 strengths
- Top 3 areas for improvement
- Specific suggestions for enhancement`,
  },
]

// ─── Content Agent Steps ───────────────────────────────────────────────────────
const CONTENT_STEPS = [
  {
    step: 1,
    name: 'Researcher Agent',
    prompt: (task: string) => `Research the following topic for content creation:
"${task}"

Gather:
- Core concepts and key information
- Target audience insights
- Trending angles and hooks
- Supporting data and examples
- SEO-relevant keywords and phrases`,
  },
  {
    step: 2,
    name: 'Writer Agent',
    prompt: (task: string, prevContent: string) => `Using this research:
${prevContent}

Create polished, publication-ready content for: "${task}"

Include:
- Attention-grabbing headline options (3 variants)
- Engaging introduction
- Well-structured body with practical value
- Call-to-action
- Meta description (150-160 chars)

Write for maximum engagement and shareability.`,
  },
  {
    step: 3,
    name: 'Critic Agent',
    prompt: (_task: string, prevContent: string) => `Review this content for publication readiness:

${prevContent}

Check:
- Headline effectiveness (1-10)
- Hook strength (1-10)
- Value delivery (1-10)
- SEO optimization (1-10)
- Overall readiness (1-10)

Provide specific, actionable improvements and final polished versions of the headline and introduction.`,
  },
  {
    step: 4,
    name: 'Final Refinement',
    prompt: (task: string, prevContent: string) => `Based on this critique:
${prevContent}

Produce the FINAL, polished version of content for: "${task}"

Apply all suggested improvements. This is the definitive, ready-to-publish version.`,
  },
]

// ─── Analysis Agent Steps ──────────────────────────────────────────────────────
const ANALYSIS_STEPS = [
  {
    step: 1,
    name: 'Data Extraction Agent',
    prompt: (task: string) => `You are a data analyst. Analyze the following:
"${task}"

Extract and identify:
- Key data points and metrics
- Patterns and trends
- Anomalies and outliers
- Relationships and correlations
- Missing information gaps`,
  },
  {
    step: 2,
    name: 'Insight Agent',
    prompt: (task: string, prevContent: string) => `Based on this initial analysis:
${prevContent}

Deep dive into: "${task}"

Provide:
- Root cause analysis
- Predictive insights (what this means for the future)
- Risk factors and opportunities
- Benchmarks and comparisons
- Statistical significance of findings`,
  },
  {
    step: 3,
    name: 'Recommendations Agent',
    prompt: (task: string, prevContent: string) => `Given this analysis:
${prevContent}

For: "${task}"

Create an actionable recommendations report:
1. Executive Summary (3-4 sentences)
2. Top 5 Findings (ranked by importance)
3. Strategic Recommendations (immediate, short-term, long-term)
4. Implementation roadmap
5. Success metrics to track

Format as a professional consulting deliverable.`,
  },
]

type AgentStepConfig = {
  step: number
  name: string
  prompt: (task: string, prevContent?: string) => string
}

function getSteps(agentType: string): AgentStepConfig[] {
  switch (agentType) {
    case 'content':
      return CONTENT_STEPS as AgentStepConfig[]
    case 'analysis':
      return ANALYSIS_STEPS as AgentStepConfig[]
    default:
      return RESEARCH_STEPS as AgentStepConfig[]
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { agentType, task, model } = await req.json()

  if (!task || typeof task !== 'string') {
    return new Response('Task is required', { status: 400 })
  }

  const steps = getSteps(agentType || 'research')
  const stepResults: AgentStep[] = steps.map(s => ({
    step: s.step,
    name: s.name,
    status: 'pending',
    content: '',
  }))

  let totalTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(data)))
      }

      try {
        let previousContent = ''

        for (let i = 0; i < steps.length; i++) {
          const stepConfig = steps[i]
          stepResults[i].status = 'running'

          enqueue({
            type: 'step_update',
            step: stepConfig.step,
            name: stepConfig.name,
            status: 'running',
            content: '',
            totalSteps: steps.length,
          })

          // Small delay for UX
          await new Promise(r => setTimeout(r, 300))

          try {
            const prompt = stepConfig.prompt(task, previousContent)
            const content = await callAI(prompt, model || 'gemini-flash')
            totalTokens += Math.ceil(content.length / 4)

            stepResults[i].status = 'done'
            stepResults[i].content = content
            previousContent = content

            enqueue({
              type: 'step_update',
              step: stepConfig.step,
              name: stepConfig.name,
              status: 'done',
              content,
              totalSteps: steps.length,
            })
          } catch (err) {
            stepResults[i].status = 'error'
            stepResults[i].content = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`

            enqueue({
              type: 'step_update',
              step: stepConfig.step,
              name: stepConfig.name,
              status: 'error',
              content: stepResults[i].content,
              totalSteps: steps.length,
            })
          }
        }

        const finalOutput = previousContent

        // Save to MongoDB
        try {
          await connectDB()
          await AgentRun.create({
            userId: session.user!.id,
            agentType: agentType || 'research',
            task,
            model: model || 'gemini-2.0-flash',
            steps: stepResults,
            finalOutput,
            tokensUsed: totalTokens,
          })
        } catch (dbErr) {
          console.error('Failed to save agent run:', dbErr)
        }

        enqueue({ type: 'result', content: finalOutput })
      } catch (error) {
        enqueue({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
