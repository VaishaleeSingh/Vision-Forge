import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import MlTrainingRun from '@/models/MlTrainingRun'
import { detectTrainingMode, formatMetricsForStakeholders } from '@/lib/ml/detect-training-mode'
import { CSV_MAX_BYTES } from '@/features/ml/constants'
import { parseCsvForPreset } from '@/features/ml/parse-preset-csv'
import { resolveMlGoal } from '@/features/ml/resolve-goal'
import {
  getMlModelPreset,
  type MlModelPresetId,
} from '@/features/ml/model-presets'
import {
  ensureMlOutputDir,
  runPythonTrainScript,
  writeTempCsv,
} from '@/lib/ml/python-runner'
import { generateText } from '@/lib/ai'
import mongoose from 'mongoose'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { csvText, fileName, goal, modelPresetId } = body as {
    csvText?: string
    fileName?: string
    goal?: string
    modelPresetId?: MlModelPresetId
  }

  if (!csvText || typeof csvText !== 'string') {
    return NextResponse.json({ error: 'csvText is required' }, { status: 400 })
  }

  if (csvText.length > CSV_MAX_BYTES) {
    return NextResponse.json({ error: 'CSV must be 5MB or smaller' }, { status: 400 })
  }

  const preset = getMlModelPreset(modelPresetId)
  if (!preset) {
    return NextResponse.json(
      {
        error: 'Select a model type first (churn, CO risk, loan default, fraud, QA, or phishing).',
      },
      { status: 400 },
    )
  }

  let parsed
  try {
    parsed = parseCsvForPreset(
      csvText,
      fileName || preset.sampleFile,
      preset,
      goal || '',
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid CSV for selected model'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const mode = detectTrainingMode(preset.id)
  if (!mode) {
    return NextResponse.json(
      { error: `Could not configure training for ${preset.title}.` },
      { status: 400 },
    )
  }

  if (parsed.analysis.rowCount < 10) {
    return NextResponse.json(
      { error: 'Need at least 10 data rows to train a model.' },
      { status: 400 },
    )
  }

  await connectDB()
  const userId = session.user.id
  const runId = new mongoose.Types.ObjectId().toString()
  const resolvedGoal = resolveMlGoal(goal || '', preset)

  const run = await MlTrainingRun.create({
    userId,
    modelPresetId: preset.id,
    fileName: parsed.fileName,
    targetColumn: mode.targetColumn,
    problemType: mode.problemType,
    trainingKind: mode.kind,
    status: 'running',
    textColumn: mode.textColumn,
  })

  try {
    const csvPath = await writeTempCsv(userId, runId, csvText)
    const outputDir = await ensureMlOutputDir(userId, runId)

    const pyResult =
      mode.kind === 'text_classifier' && mode.textColumn
        ? await runPythonTrainScript({
            script: 'train_text_classifier',
            csvPath,
            outputDir,
            textColumn: mode.textColumn,
            labelColumn: mode.labelColumn || mode.targetColumn,
          })
        : await runPythonTrainScript({
            script: 'train_tabular',
            csvPath,
            outputDir,
            targetColumn: mode.targetColumn,
            problemType: mode.problemType,
          })

    if (!pyResult.success) {
      run.status = 'failed'
      run.error = pyResult.error || 'Training failed'
      await run.save()
      return NextResponse.json(
        { error: run.error, runId: run._id, mode },
        { status: 500 },
      )
    }

    run.status = 'completed'
    run.modelType = pyResult.modelType
    run.metrics = pyResult.metrics as typeof run.metrics
    run.artifactPath = pyResult.artifactPath
    run.featureColumns = pyResult.featureColumns

    if (pyResult.metrics) {
      try {
        const metricsMd = formatMetricsForStakeholders(
          pyResult.metrics,
          parsed.fileName,
          pyResult.modelType || 'sklearn',
        )
        run.businessSummary = await generateText(
          `You are an ML consultant presenting results to business stakeholders.

User goal: ${resolvedGoal || '(general predictive model)'}

Training mode: ${mode.reason}

Metrics:
${metricsMd}

Write a concise executive summary (under 200 words): business problem, approach, key metrics, recommended next steps for deployment.`,
          'Be specific and professional. No hype.',
        )
      } catch {
        run.businessSummary = formatMetricsForStakeholders(
          pyResult.metrics,
          parsed.fileName,
          pyResult.modelType || 'sklearn',
        )
      }
    }

    await run.save()

    return NextResponse.json({
      runId: run._id,
      status: run.status,
      trainingKind: run.trainingKind,
      modelType: run.modelType,
      metrics: run.metrics,
      businessSummary: run.businessSummary,
      mode,
    })
  } catch (err) {
    run.status = 'failed'
    run.error = err instanceof Error ? err.message : 'Training failed'
    await run.save()
    return NextResponse.json({ error: run.error, runId: run._id }, { status: 500 })
  }
}
