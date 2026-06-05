import type { MlModelPreset } from '@/features/ml/model-presets'

export function resolveMlGoal(task: string, preset: MlModelPreset | null): string {
  const trimmed = task.trim()
  if (trimmed) return trimmed
  return preset?.defaultGoal ?? ''
}
