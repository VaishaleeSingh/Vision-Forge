/** Keep ML pipeline prompts within Groq TPM limits */

const DATASET_PROFILE_MARKER = '### STATISTICAL DATASET PROFILE'

export function stripDatasetProfileFromTask(task: string): string {
  const idx = task.indexOf(DATASET_PROFILE_MARKER)
  if (idx === -1) return task
  const goal = task.slice(0, idx).trim()
  return `${goal}\n\n[Full CSV dataset profile was analyzed in the ML Orchestrator step — use the pipeline context below.]`
}

export function truncateText(text: string, maxChars: number, suffix = '\n...[truncated]'): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars).trimEnd() + suffix
}

/** Rolling pipeline memory: cap total size and per-step output */
export function appendPipelineStep(
  existing: string,
  stepName: string,
  content: string,
  options?: { maxStepChars?: number; maxTotalChars?: number },
): string {
  const maxStep = options?.maxStepChars ?? 1_800
  const maxTotal = options?.maxTotalChars ?? 7_000
  const stepBlock = `## ${stepName}\n${truncateText(content, maxStep)}`
  const next = existing ? `${existing}\n\n---\n\n${stepBlock}` : stepBlock
  if (next.length <= maxTotal) return next
  return `[Earlier pipeline steps truncated]\n\n${truncateText(next, maxTotal, '\n...[context truncated]')}`
}

/** Cap full prompt size before sending to the API (~4k tokens input budget) */
export function capPromptSize(prompt: string, maxChars = 14_000): string {
  if (prompt.length <= maxChars) return prompt
  const head = prompt.slice(0, 4_000)
  const tail = prompt.slice(-(maxChars - 4_100))
  return `${head}\n\n...[middle of prompt omitted for rate limits]...\n\n${tail}`
}
