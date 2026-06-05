import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

export type PythonTrainConfig = {
  script: 'train_tabular' | 'train_text_classifier'
  csvPath: string
  outputDir: string
  targetColumn?: string
  problemType?: string
  textColumn?: string
  labelColumn?: string
}

export type PythonTrainResult = {
  success: boolean
  modelType?: string
  metrics?: Record<string, unknown>
  artifactPath?: string
  featureColumns?: string[]
  textColumn?: string
  labelColumn?: string
  error?: string
}

const SCRIPT_MAP = {
  train_tabular: 'train_tabular.py',
  train_text_classifier: 'train_text_classifier.py',
} as const

function resolvePythonCommand(): string {
  return process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3')
}

export async function runPythonTrainScript(
  config: PythonTrainConfig,
  timeoutMs = 120_000,
): Promise<PythonTrainResult> {
  const projectRoot = process.cwd()
  const scriptName = SCRIPT_MAP[config.script]
  const scriptPath = path.join(projectRoot, 'scripts', scriptName)

  try {
    await fs.access(scriptPath)
  } catch {
    return { success: false, error: `Training script not found: ${scriptPath}` }
  }

  const stdinPayload: Record<string, string> = {
    csvPath: config.csvPath,
    outputDir: config.outputDir,
  }
  if (config.targetColumn) stdinPayload.targetColumn = config.targetColumn
  if (config.problemType) stdinPayload.problemType = config.problemType
  if (config.textColumn) stdinPayload.textColumn = config.textColumn
  if (config.labelColumn) stdinPayload.labelColumn = config.labelColumn

  const python = resolvePythonCommand()

  return new Promise((resolve) => {
    const proc = spawn(python, [scriptPath], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      resolve({
        success: false,
        error: `Training timed out after ${timeoutMs / 1000}s. Install deps: pip install -r requirements-ml.txt`,
      })
    }, timeoutMs)

    proc.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    proc.on('close', (code) => {
      clearTimeout(timer)
      const line = stdout.trim().split('\n').filter(Boolean).pop() || ''
      try {
        const parsed = JSON.parse(line) as PythonTrainResult
        if (!parsed.success && !parsed.error && code !== 0) {
          parsed.error = stderr.slice(0, 500) || `Process exited with code ${code}`
        }
        resolve(parsed)
      } catch {
        resolve({
          success: false,
          error:
            stderr.slice(0, 500) ||
            stdout.slice(0, 300) ||
            `Training failed (exit ${code}). Run: pip install -r requirements-ml.txt`,
        })
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        success: false,
        error: `Could not run Python (${python}): ${err.message}. Set PYTHON_PATH in .env or install Python 3.`,
      })
    })

    proc.stdin.write(JSON.stringify(stdinPayload))
    proc.stdin.end()
  })
}

export async function ensureMlOutputDir(userId: string, runId: string): Promise<string> {
  const dir = path.join(process.cwd(), 'data', 'ml-models', userId, runId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function writeTempCsv(userId: string, runId: string, csvText: string): Promise<string> {
  const dir = path.join(process.cwd(), 'data', 'ml-temp', userId)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${runId}.csv`)
  await fs.writeFile(filePath, csvText, 'utf8')
  return filePath
}
