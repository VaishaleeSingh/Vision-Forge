import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateText } from '@/lib/ai'
import {
  formatDatasetAnalysisReport,
  parseCsvContent,
} from '@/features/agents/csv-dataset'
import { CSV_MAX_BYTES } from '@/features/ml/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { csvText, fileName, goal } = body as {
    csvText?: string
    fileName?: string
    goal?: string
  }

  if (!csvText || typeof csvText !== 'string') {
    return NextResponse.json({ error: 'csvText is required' }, { status: 400 })
  }

  if (csvText.length > CSV_MAX_BYTES) {
    return NextResponse.json({ error: 'CSV must be 5MB or smaller' }, { status: 400 })
  }

  const parsed = parseCsvContent(csvText, fileName || 'dataset.csv', goal || '')
  const report = formatDatasetAnalysisReport(parsed.analysis)

  let aiInsight = ''
  try {
    aiInsight = await generateText(
      `You are an ML consultant. The user uploaded a CSV. Respond in markdown (under 400 words).

User goal: ${goal?.trim() || '(not specified — infer from data)'}

${report}

Provide:
1. **What this dataset is for** (one paragraph grounded in the columns)
2. **Recommended ML approach** (problem type, target, key features to use/exclude)
3. **Next steps** (3 bullet actions before training)

Be specific — cite column names and numbers from the profile. Do not invent columns.`,
      'You are a concise ML data scientist. Only use facts from the dataset profile.',
    )
  } catch (err) {
    console.warn('[analyze-csv] AI insight failed:', err)
    aiInsight = ''
  }

  return NextResponse.json({
    parsed: {
      fileName: parsed.fileName,
      headers: parsed.headers,
      totalRows: parsed.totalRows,
      analysis: parsed.analysis,
    },
    report,
    aiInsight: aiInsight || null,
  })
}
