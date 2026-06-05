import { getMlModelPreset, type MlModelPresetId } from '@/features/ml/model-presets'

export type TrainingModeDecision = {
  kind: 'tabular' | 'text_classifier'
  targetColumn: string
  problemType: string
  textColumn?: string
  labelColumn?: string
  reason: string
}

/** Training mode from a registered model preset (required for /api/ml/train). */
export function detectTrainingMode(presetId: MlModelPresetId): TrainingModeDecision | null {
  const preset = getMlModelPreset(presetId)
  if (!preset) return null

  if (preset.trainingKind === 'text_classifier' && preset.textColumn) {
    return {
      kind: 'text_classifier',
      targetColumn: preset.targetColumn,
      problemType: 'text_classification',
      textColumn: preset.textColumn,
      labelColumn: preset.targetColumn,
      reason: `${preset.title}: NLP classifier on "${preset.textColumn}" → "${preset.targetColumn}"`,
    }
  }

  return {
    kind: 'tabular',
    targetColumn: preset.targetColumn,
    problemType: 'classification',
    reason: `${preset.title}: tabular classification on "${preset.targetColumn}"`,
  }
}

export function formatMetricsForStakeholders(
  metrics: Record<string, unknown>,
  fileName: string,
  modelType: string,
): string {
  const lines = [
    `**Dataset:** ${fileName}`,
    `**Model:** ${modelType}`,
  ]
  if (metrics.accuracy != null) lines.push(`**Accuracy:** ${(metrics.accuracy as number) * 100}%`)
  if (metrics.f1Macro != null) lines.push(`**F1 (macro):** ${metrics.f1Macro}`)
  if (metrics.r2 != null) lines.push(`**R²:** ${metrics.r2}`)
  if (metrics.mae != null) lines.push(`**MAE:** ${metrics.mae}`)
  if (metrics.rmse != null) lines.push(`**RMSE:** ${metrics.rmse}`)
  if (metrics.trainRows != null) lines.push(`**Train/test:** ${metrics.trainRows} / ${metrics.testRows} rows`)
  if (metrics.vocabularySize != null) {
    lines.push(`**Domain vocabulary:** ${metrics.vocabularySize} terms (TF-IDF)`)
  }
  return lines.join('\n')
}
