import { parseCsvContent, type ParsedCsv } from '@/features/agents/csv-dataset'
import { validateCsvForPreset, type MlModelPreset } from '@/features/ml/model-presets'
import { resolveMlGoal } from '@/features/ml/resolve-goal'

export function parseCsvForPreset(
  csvText: string,
  fileName: string,
  preset: MlModelPreset,
  task: string,
): ParsedCsv {
  const goal = resolveMlGoal(task, preset)
  const parsed = parseCsvContent(csvText, fileName, goal)
  const check = validateCsvForPreset(parsed.headers, preset)
  if (!check.ok) throw new Error(check.message)
  return parsed
}
