'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { AgentType } from '@/models/AgentRun'
import { motion, AnimatePresence } from 'framer-motion'
import { RichTextInput, RichTextOutput } from '@/components/rich-text'
import {
  formatCsvForMlContext,
  parseCsvContent,
  type ParsedCsv,
} from '@/features/agents/csv-dataset'
import {
  Search, Sparkles, BarChart3, Brain, Play,
  CheckCircle2, CircleDashed, Loader2, PlayCircle,
} from 'lucide-react'
import { MlTrainingWorkbench, type MlTrainResult } from '@/components/agents/MlTrainingWorkbench'
import { MlAgentPlanningPanel } from '@/components/agents/MlAgentPlanningPanel'
import { AgentModelSelect } from '@/components/agents/AgentModelSelect'
import { ML_TRAINING_STEP_NAMES } from '@/features/agents/ml-step-names'
import { parseCsvForPreset } from '@/features/ml/parse-preset-csv'
import { resolveMlGoal } from '@/features/ml/resolve-goal'
import {
  getMlModelPreset,
  type MlModelPreset,
  type MlModelPresetId,
} from '@/features/ml/model-presets'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const AGENT_STEP_LABELS: Record<AgentType, string[]> = {
  research: [
    '🔍 Researcher Agent gathering evidence...',
    '✏️ Writer Agent drafting content...',
    '🔄 Critic Agent reviewing quality...',
    '✅ Finalizing output...',
  ],
  content: [
    '🔍 Researcher thinking...',
    '✏️ Writer drafting...',
    '🔄 Critic reviewing...',
    '✅ Finalizing output...',
  ],
  analysis: [
    '📥 Data Extraction Agent parsing inputs...',
    '🧠 Insight Agent finding patterns...',
    '📌 Recommendations Agent creating roadmap...',
  ],
  'model-training': ML_TRAINING_STEP_NAMES.map((name) => `○ ${name}...`),
}

const AGENT_TEMPLATES = [
  {
    id: 'research',
    icon: Search,
    title: 'Research Agent',
    description: 'Give me a topic, I’ll research it thoroughly and produce a structured report',
    color: 'from-aqua-400 to-aqua-600',
  },
  {
    id: 'content',
    icon: Sparkles,
    title: 'Content Agent',
    description: 'Research + Draft + Critic loop: produces polished, publication-ready content',
    color: 'from-teal-400 to-aqua-500',
  },
  {
    id: 'analysis',
    icon: BarChart3,
    title: 'Analysis Agent',
    description: 'Analyze text/data and extract key insights, patterns, and recommendations',
    color: 'from-aqua-500 to-cyan-500',
  },
  {
    id: 'model-training',
    icon: Brain,
    title: 'ML Training Pipeline',
    description:
      'Six business ML models (churn, CO risk, loan default, fraud, QA, phishing) + AI planning pipeline',
    color: 'from-cyan-500 to-blue-600',
  },
]

type Step = {
  id: number
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  content?: string
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('content')
  const [task, setTask] = useState('')
  const [model, setModel] = useState('gemini-flash')
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [finalResult, setFinalResult] = useState<string | null>(null)
  const [csvDataset, setCsvDataset] = useState<ParsedCsv | null>(null)
  const [csvRawText, setCsvRawText] = useState<string | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvInsightLoading, setCsvInsightLoading] = useState(false)
  const [csvAiInsight, setCsvAiInsight] = useState<string | null>(null)
  const [runRealTraining, setRunRealTraining] = useState(true)
  const [trainLoading, setTrainLoading] = useState(false)
  const [mlTrainResult, setMlTrainResult] = useState<MlTrainResult | null>(null)
  const [mlPreset, setMlPreset] = useState<MlModelPreset | null>(null)
  const csvGoalRef = useRef(task)

  const executeRealTraining = useCallback(async () => {
    if (!csvRawText || !csvDataset || !mlPreset) return null
    setTrainLoading(true)
    setMlTrainResult(null)
    try {
      const res = await fetch('/api/ml/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText: csvRawText,
          fileName: csvDataset.fileName,
          goal: resolveMlGoal(task, mlPreset),
          modelPresetId: mlPreset.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const err = data.error || 'Training failed'
        setMlTrainResult({ error: err })
        toast.error(err)
        return null
      }
      setMlTrainResult({
        metrics: data.metrics,
        modelType: data.modelType,
        businessSummary: data.businessSummary,
        trainingKind: data.trainingKind,
      })
      toast.success(`Model trained: ${data.modelType}`)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Training failed'
      setMlTrainResult({ error: msg })
      toast.error(msg)
      return null
    } finally {
      setTrainLoading(false)
    }
  }, [csvRawText, csvDataset, task, mlPreset])

  const buildFullTask = useCallback(() => {
    const goal = resolveMlGoal(task, mlPreset)
    const base =
      goal ||
      (mlPreset
        ? `Build and evaluate the ${mlPreset.title} model (${mlPreset.algorithm}). Target: ${mlPreset.targetColumn}.`
        : csvDataset
          ? csvDataset.analysis.suggestedTarget
            ? `Predict "${csvDataset.analysis.suggestedTarget}" using "${csvDataset.fileName}".`
            : `Build an ML pipeline for "${csvDataset.fileName}".`
          : '')
    if (selectedAgent === 'model-training' && csvDataset) {
      const modelLine = mlPreset ? `\n\nModel type: ${mlPreset.title} (${mlPreset.trainingKind})` : ''
      return `${base}${modelLine}\n\n${formatCsvForMlContext(csvDataset, goal)}`
    }
    return base
  }, [task, csvDataset, selectedAgent, mlPreset])

  const fetchCsvInsight = useCallback(
    async (text: string, fileName: string, goal: string) => {
      setCsvInsightLoading(true)
      setCsvAiInsight(null)
      try {
        const res = await fetch('/api/agents/analyze-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvText: text, fileName, goal }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error || 'Analysis failed')
        }
        const data = (await res.json()) as {
          parsed: { fileName: string; headers: string[]; totalRows: number; analysis: ParsedCsv['analysis'] }
          aiInsight: string | null
        }
        setCsvDataset((prev) => {
          if (!prev || prev.fileName !== data.parsed.fileName) return prev
          return {
            ...prev,
            analysis: data.parsed.analysis,
            totalRows: data.parsed.totalRows,
          }
        })
        if (data.aiInsight) setCsvAiInsight(data.aiInsight)
      } catch (err) {
        console.warn('CSV AI insight:', err)
      } finally {
        setCsvInsightLoading(false)
      }
    },
    [],
  )

  const ingestCsv = useCallback(
    async (text: string, fileName: string, preset: MlModelPreset, taskGoal: string) => {
      const goal = resolveMlGoal(taskGoal, preset)
      const parsed = parseCsvForPreset(text, fileName, preset, taskGoal)
      csvGoalRef.current = goal
      setCsvRawText(text)
      setCsvDataset(parsed)
      const a = parsed.analysis
      toast.success(
        `Loaded ${parsed.fileName}: ${a.suggestedProblemType}${a.suggestedTarget ? ` → ${a.suggestedTarget}` : ''}`,
      )
      void fetchCsvInsight(text, parsed.fileName, goal)
      return parsed
    },
    [fetchCsvInsight],
  )

  const handlePresetSelect = (id: MlModelPresetId) => {
    const preset = getMlModelPreset(id)
    if (!preset) return
    setMlPreset(preset)
    setCsvDataset(null)
    setCsvRawText(null)
    setCsvAiInsight(null)
    setMlTrainResult(null)
    if (!task.trim()) setTask(preset.defaultGoal)
  }

  const handleCsvSelect = async (file: File | null) => {
    if (!file) return
    if (!mlPreset) {
      toast.error('Select a model type in the Training Lab first')
      return
    }
    setCsvLoading(true)
    setCsvAiInsight(null)
    setMlTrainResult(null)
    try {
      const text = await file.text()
      await ingestCsv(text, file.name, mlPreset, task)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid CSV'
      toast.error(msg)
      setCsvDataset(null)
      setCsvRawText(null)
    } finally {
      setCsvLoading(false)
    }
  }

  useEffect(() => {
    if (selectedAgent !== 'model-training' || !csvRawText || !csvDataset) return
    if (csvGoalRef.current === task) return
    csvGoalRef.current = task
    const t = setTimeout(() => {
      setCsvDataset(parseCsvContent(csvRawText, csvDataset.fileName, task))
      void fetchCsvInsight(csvRawText, csvDataset.fileName, task)
    }, 800)
    return () => clearTimeout(t)
  }, [task, selectedAgent, csvRawText, csvDataset, fetchCsvInsight])

  const canRun =
    selectedAgent === 'model-training'
      ? mlPreset !== null && (task.trim().length > 0 || csvDataset !== null)
      : task.trim().length > 0

  const handleRun = async () => {
    const fullTask = buildFullTask()
    if (!fullTask.trim()) return
    setIsRunning(true)
    setFinalResult(null)
    setMlTrainResult(null)
    
    const initialSteps: Step[] = AGENT_STEP_LABELS[selectedAgent].map((label, index) => ({
      id: index + 1,
      label,
      status: 'pending' as const,
    }))
    setSteps(initialSteps)
    
    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: selectedAgent,
          task: fullTask,
          model,
        })
      })

      if (!response.body) throw new Error('No readable stream available')
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      let done = false
      let currentResult = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'step_update') {
                  setSteps(prev => prev.map(s =>
                    s.id === data.step
                      ? {
                          ...s,
                          status: data.status,
                          content: data.content,
                          label: data.name ? `${getStepEmoji(data.status)} ${data.name}` : s.label,
                        }
                      : s
                  ))
                } else if (data.type === 'result') {
                  currentResult = data.content
                  setFinalResult(currentResult)
                }
              } catch (e) {
                console.error('SSE Parse Error', e)
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err)
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s))
    } finally {
      setIsRunning(false)
      if (
        selectedAgent === 'model-training' &&
        runRealTraining &&
        csvRawText &&
        csvDataset
      ) {
        void executeRealTraining()
      }
    }
  }

  const isMlMode = selectedAgent === 'model-training'

  function renderExecutionPanel() {
    const idleHint = isMlMode
      ? 'Use the violet AI Planning panel to run the 9-step agent loop. Real metrics appear in the ML Training Lab above.'
      : 'Select a template and define a task on the left to start an autonomous agent loop.'

    if (!isRunning && steps.length === 0) {
      return (
        <div className="glass-card min-h-[min(280px,50vh)] sm:min-h-[400px] lg:min-h-[450px] h-auto flex flex-col items-center justify-center text-center p-4 sm:p-8 min-w-0 w-full">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isMlMode ? 'bg-violet-100' : 'bg-beige-200'}`}>
            <PlayCircle size={32} className={isMlMode ? 'text-violet-600' : 'text-[#a07f52]'} />
          </div>
          <h3 className="text-[#1a2332] font-semibold mb-1">Agent Idle</h3>
          <p className="text-xs text-[#718096] max-w-sm">{idleHint}</p>
        </div>
      )
    }

    return (
      <div className="glass-card p-3 sm:p-6 min-h-[min(280px,55vh)] sm:min-h-[400px] lg:min-h-[450px] flex flex-col min-w-0 w-full overflow-hidden">
        <div className="flex-1 min-h-0 min-w-0 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden pr-0.5 sm:pr-1">
          <AnimatePresence>
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 sm:gap-4 min-w-0 w-full"
              >
                <div className="relative mt-1">
                  {step.status === 'running' ? (
                    <Loader2 size={20} className="text-aqua-500 animate-spin" />
                  ) : step.status === 'done' ? (
                    <CheckCircle2 size={20} className="text-aqua-600" />
                  ) : step.status === 'error' ? (
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">!</div>
                  ) : (
                    <CircleDashed size={20} className="text-[#cbd5e0]" />
                  )}
                  {i < steps.length - 1 && (
                    <div className={`absolute top-6 left-1/2 -ml-px w-px h-full min-h-[24px] ${
                      step.status === 'done' ? 'bg-aqua-200' : 'bg-beige-200'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-4 overflow-hidden">
                  <p className={`text-xs sm:text-sm font-medium break-words ${
                    step.status === 'running' ? 'text-aqua-700' :
                    step.status === 'pending' ? 'text-[#718096]' : 'text-[#1a2332]'
                  }`}>
                    {step.label}
                  </p>
                  {step.content && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 w-full min-w-0 max-w-full text-[#4a5568] bg-beige-50 p-2 sm:p-3 rounded-lg border border-beige-200 overflow-x-auto overflow-y-visible text-xs sm:text-sm"
                    >
                      <RichTextOutput
                        content={step.content}
                        format="markdown"
                        proseClassName="prose-xs sm:prose-sm max-w-none break-words"
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {finalResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-beige-200 shrink-0 min-w-0 w-full"
          >
            <h3 className="text-sm font-semibold text-[#1a2332] mb-2 sm:mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-aqua-600 shrink-0" />
              Final Result
            </h3>
            <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-beige-200 text-xs sm:text-sm text-[#2d3748] shadow-sm min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible">
              <RichTextOutput
                content={finalResult}
                format="markdown"
                proseClassName="prose-xs sm:prose-sm max-w-none break-words"
              />
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full mx-auto min-w-0 px-3 sm:px-4 md:px-0 space-y-4 sm:space-y-6',
        isMlMode ? 'max-w-[min(100%,90rem)]' : 'max-w-6xl',
      )}
    >
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1a2332] flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center bg-gradient-to-br from-aqua-400 to-aqua-600">
            <BotIcon size={20} className="text-white" />
          </span>
          AI Agent Playground
        </h1>
        <p className="text-xs sm:text-sm text-[#718096] sm:ml-[52px]">
          Deploy autonomous agents that reason, research, and execute complex tasks.
        </p>
      </motion.div>

      <div
        className={cn(
          'grid gap-4 sm:gap-6 min-w-0 w-full',
          isMlMode ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1 lg:grid-cols-3',
        )}
      >
        {/* Left Config Panel */}
        <div
          className={cn(
            'space-y-4 min-w-0 w-full',
            isMlMode ? 'xl:col-span-3' : 'lg:col-span-1',
          )}
        >
          <h2 className="text-sm font-semibold text-[#1a2332]">Select Template</h2>
          <div className="space-y-3">
            {AGENT_TEMPLATES.map((agent) => {
              const Icon = agent.icon
              return (
                <div
                  key={agent.id}
                  onClick={() => !isRunning && setSelectedAgent(agent.id as AgentType)}
                  className={`glass-card p-3 sm:p-4 cursor-pointer transition-all min-w-0 overflow-hidden ${
                    selectedAgent === agent.id 
                      ? 'border-aqua-400 bg-aqua-50 shadow-sm' 
                      : 'hover:border-aqua-200 hover:bg-beige-50'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 min-w-0">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0 ${agent.color}`}>
                      <Icon size={14} className="text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-[#1a2332] truncate min-w-0">
                      {agent.title}
                    </span>
                    {selectedAgent === agent.id && (
                      <CheckCircle2 size={16} className="text-aqua-600 ml-auto shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#4a5568] leading-relaxed line-clamp-3 break-words">
                    {agent.description}
                  </p>
                </div>
              )
            })}
          </div>

          {selectedAgent !== 'model-training' && (
            <div className="glass-card p-4 space-y-3 mt-4">
              <h2 className="text-sm font-semibold text-[#1a2332]">Task Definition</h2>
              <RichTextInput
                value={task}
                onChange={setTask}
                onSubmit={handleRun}
                submitHint="Enter to run agent · Shift+Enter for new line"
                placeholder="E.g. Analyze the current state of generative AI in healthcare and write a comprehensive report."
                disabled={isRunning}
                minHeight={100}
              />
              <AgentModelSelect
                value={model}
                onChange={setModel}
                disabled={isRunning}
              />
              <button
                onClick={handleRun}
                disabled={!canRun || isRunning}
                className="btn-primary w-full justify-center py-2.5 disabled:opacity-50 mt-2"
              >
                {isRunning ? (
                  <><Loader2 size={16} className="animate-spin" /> Agent Running...</>
                ) : (
                  <><Play size={16} /> Run Agent Loop</>
                )}
              </button>
            </div>
          )}
        </div>

        {selectedAgent === 'model-training' ? (
          <div className="xl:col-span-9 space-y-3 sm:space-y-4 min-w-0 w-full overflow-hidden">
            <MlTrainingWorkbench
              selectedPreset={mlPreset}
              onPresetSelect={handlePresetSelect}
              goal={task}
              onGoalChange={setTask}
              csvDataset={csvDataset}
              csvLoading={csvLoading}
              csvInsightLoading={csvInsightLoading}
              csvAiInsight={csvAiInsight}
              trainLoading={trainLoading}
              mlTrainResult={mlTrainResult}
              disabled={isRunning}
              onFileSelect={(file) => void handleCsvSelect(file)}
              onClearDataset={() => {
                setCsvDataset(null)
                setCsvRawText(null)
                setCsvAiInsight(null)
                setMlTrainResult(null)
              }}
              onTrain={() => void executeRealTraining()}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 min-w-0">
              <MlAgentPlanningPanel
                model={model}
                onModelChange={setModel}
                runRealTraining={runRealTraining}
                onRunRealTrainingChange={setRunRealTraining}
                isRunning={isRunning}
                canRun={canRun}
                onRun={handleRun}
              />

              <div className="space-y-2 sm:space-y-3 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                  <h2 className="text-xs sm:text-sm font-semibold text-[#1a2332]">Agent output</h2>
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-medium whitespace-nowrap">
                    Planning &amp; sample code
                  </span>
                </div>
                {renderExecutionPanel()}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 space-y-4 min-w-0 w-full overflow-hidden">
            <h2 className="text-sm font-semibold text-[#1a2332]">Execution View</h2>
            {renderExecutionPanel()}
          </div>
        )}
      </div>
    </div>
  )
}

function getStepEmoji(status: Step['status']): string {
  if (status === 'running') return '⏳'
  if (status === 'done') return '✅'
  if (status === 'error') return '❌'
  return '○'
}

function BotIcon({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </svg>
  )
}
