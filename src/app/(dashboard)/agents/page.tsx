'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RichTextInput, RichTextOutput } from '@/components/rich-text'
import {
  formatCsvForMlContext,
  formatDatasetAnalysisReport,
  parseCsvContent,
  type ParsedCsv,
} from '@/features/agents/csv-dataset'
import {
  Search, Sparkles, BarChart3, Brain, Settings, Play,
  CheckCircle2, CircleDashed, Loader2, PlayCircle, Upload, FileSpreadsheet, X,
} from 'lucide-react'
import { toast } from 'sonner'

type AgentType = 'research' | 'content' | 'analysis' | 'model-training'

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
  'model-training': [
    '🎯 ML Orchestrator Agent analyzing problem...',
    '🧹 Data Preprocessing Agent preparing data...',
    '🧠 Model Selection Agent picking algorithm...',
    '⭐ Model Training Agent generating training code...',
    '📈 Model Evaluation Agent computing metrics...',
    '⚙️ Hyperparameter Optimization Agent tuning model...',
    '📝 NLP Fine-tuning Agent (BERT/Hugging Face if applicable)...',
    '👁️ Computer Vision Training Agent (CNN/ResNet if applicable)...',
    '📋 Final ML Report Agent synthesizing deliverable...',
  ],
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
      'Upload a CSV + describe your goal — full ML lifecycle from preprocessing to final report',
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
  const csvInputRef = useRef<HTMLInputElement>(null)
  const csvGoalRef = useRef(task)

  const buildFullTask = useCallback(() => {
    const goal = task.trim()
    const base =
      goal ||
      (csvDataset
        ? csvDataset.analysis.suggestedTarget
          ? `Predict "${csvDataset.analysis.suggestedTarget}" using the uploaded dataset "${csvDataset.fileName}". Problem type: ${csvDataset.analysis.suggestedProblemType}.`
          : `Build a complete ML pipeline for the attached dataset "${csvDataset.fileName}".`
        : '')
    if (selectedAgent === 'model-training' && csvDataset) {
      return `${base}\n\n${formatCsvForMlContext(csvDataset, goal)}`
    }
    return base
  }, [task, csvDataset, selectedAgent])

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
          report: string
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

  const handleCsvSelect = async (file: File | null) => {
    if (!file) return
    setCsvLoading(true)
    setCsvAiInsight(null)
    try {
      const text = await file.text()
      const parsed = parseCsvContent(text, file.name, task)
      csvGoalRef.current = task
      setCsvRawText(text)
      setCsvDataset(parsed)
      const a = parsed.analysis
      toast.success(
        `Analyzed ${parsed.fileName}: ${a.suggestedProblemType}${a.suggestedTarget ? ` → target: ${a.suggestedTarget}` : ''}`,
      )
      void fetchCsvInsight(text, parsed.fileName, task)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid CSV'
      toast.error(msg)
      setCsvDataset(null)
      setCsvRawText(null)
    } finally {
      setCsvLoading(false)
      if (csvInputRef.current) csvInputRef.current.value = ''
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
      ? task.trim().length > 0 || csvDataset !== null
      : task.trim().length > 0

  const handleRun = async () => {
    const fullTask = buildFullTask()
    if (!fullTask.trim()) return
    setIsRunning(true)
    setFinalResult(null)
    
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
          datasetFileName: csvDataset?.fileName,
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
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto min-w-0 px-3 sm:px-4 md:px-0 space-y-4 sm:space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0 w-full">
        {/* Left Config Panel */}
        <div className="lg:col-span-1 space-y-4 min-w-0 w-full">
          <h2 className="text-sm font-semibold text-[#1a2332]">Select Template</h2>
          <div className="space-y-3">
            {AGENT_TEMPLATES.map((agent) => {
              const Icon = agent.icon
              return (
                <div
                  key={agent.id}
                  onClick={() => !isRunning && setSelectedAgent(agent.id as AgentType)}
                  className={`glass-card p-4 cursor-pointer transition-all ${
                    selectedAgent === agent.id 
                      ? 'border-aqua-400 bg-aqua-50 shadow-sm' 
                      : 'hover:border-aqua-200 hover:bg-beige-50'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${agent.color}`}>
                      <Icon size={14} className="text-white" />
                    </div>
                    <span className="font-semibold text-sm text-[#1a2332]">{agent.title}</span>
                    {selectedAgent === agent.id && (
                      <CheckCircle2 size={16} className="text-aqua-600 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-[#4a5568]">{agent.description}</p>
                </div>
              )
            })}
          </div>

          <div className="glass-card p-4 space-y-3 mt-4">
            <h2 className="text-sm font-semibold text-[#1a2332]">Task Definition</h2>
            <RichTextInput
              value={task}
              onChange={setTask}
              onSubmit={handleRun}
              submitHint="Enter to run agent · Shift+Enter for new line"
              placeholder={
                selectedAgent === 'model-training'
                  ? 'E.g. Goal: predict price | Target: price | Features: bedrooms, sqft, grade (upload CSV below)'
                  : 'E.g. Analyze the current state of generative AI in healthcare and write a comprehensive report.'
              }
              disabled={isRunning}
              minHeight={100}
            />

            {selectedAgent === 'model-training' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide flex items-center gap-1.5">
                  <FileSpreadsheet size={14} className="text-aqua-600" />
                  Dataset (CSV)
                </label>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={isRunning || csvLoading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleCsvSelect(file)
                  }}
                />
                {!csvDataset ? (
                  <button
                    type="button"
                    disabled={isRunning || csvLoading}
                    onClick={() => csvInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-beige-300 hover:border-aqua-400 hover:bg-aqua-50/50 text-sm text-[#4a5568] transition-colors disabled:opacity-50"
                  >
                    {csvLoading ? (
                      <Loader2 size={16} className="animate-spin text-aqua-500" />
                    ) : (
                      <Upload size={16} className="text-aqua-500" />
                    )}
                    {csvLoading ? 'Reading CSV…' : 'Upload CSV dataset'}
                  </button>
                ) : (
                  <div className="rounded-xl border border-aqua-200 bg-aqua-50/40 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1a2332] truncate">
                          {csvDataset.fileName}
                        </p>
                        <p className="text-[10px] text-[#718096]">
                          {csvDataset.totalRows} rows · {csvDataset.headers.length} columns
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => {
                          setCsvDataset(null)
                          setCsvRawText(null)
                          setCsvAiInsight(null)
                        }}
                        className="p-1 rounded hover:bg-white text-[#718096] hover:text-red-500"
                        title="Remove CSV"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-28 rounded-lg border border-beige-200 bg-white text-[10px]">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-beige-100 bg-beige-50">
                            {csvDataset.headers.map((h) => (
                              <th key={h} className="px-2 py-1 font-semibold text-aqua-800 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvDataset.rows.slice(0, 4).map((row, ri) => (
                            <tr key={ri} className="border-b border-beige-50">
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-2 py-1 text-[#4a5568] whitespace-nowrap max-w-[120px] truncate">
                                  {cell || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      disabled={isRunning || csvLoading}
                      onClick={() => csvInputRef.current?.click()}
                      className="text-[10px] text-aqua-600 hover:underline"
                    >
                      Replace file
                    </button>

                    <div className="rounded-lg border border-beige-200 bg-white p-2 max-h-36 min-w-0 w-full overflow-x-auto overflow-y-auto text-[10px]">
                      <p className="font-semibold text-aqua-800 mb-1">Statistical analysis</p>
                      <RichTextOutput
                        content={formatDatasetAnalysisReport(csvDataset.analysis)}
                        format="markdown"
                      />
                    </div>

                    {(csvInsightLoading || csvAiInsight) && (
                      <div className="rounded-lg border border-aqua-100 bg-white p-2 max-h-40 min-w-0 w-full overflow-x-auto overflow-y-auto text-[10px]">
                        <p className="font-semibold text-[#1a2332] mb-1 flex items-center gap-1">
                          {csvInsightLoading ? (
                            <Loader2 size={12} className="animate-spin text-aqua-500" />
                          ) : (
                            <Sparkles size={12} className="text-aqua-600" />
                          )}
                          AI recommendation
                        </p>
                        {csvInsightLoading && !csvAiInsight ? (
                          <p className="text-[#718096]">Analyzing dataset for your goal…</p>
                        ) : csvAiInsight ? (
                          <RichTextOutput content={csvAiInsight} format="markdown" />
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-[#718096]">
                  CSV up to 5MB · auto-analyzed on upload · pipeline uses your data profile
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-[#4a5568]">
              <Settings size={14} />
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                disabled={isRunning}
                className="bg-transparent border-none outline-none font-semibold text-aqua-700 cursor-pointer"
              >
                <option value="gemini-flash">Gemini 2.0 Flash</option>
                <option value="groq-llama">Llama 3 (Groq)</option>
              </select>
            </div>

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
        </div>

        {/* Right Execution Panel */}
        <div className="lg:col-span-2 space-y-4 min-w-0 w-full overflow-hidden">
          <h2 className="text-sm font-semibold text-[#1a2332]">Execution View</h2>
          
          {!isRunning && steps.length === 0 ? (
            <div className="glass-card min-h-[min(420px,60vh)] sm:min-h-[500px] h-auto flex flex-col items-center justify-center text-center p-6 sm:p-8 min-w-0 w-full">
              <div className="w-16 h-16 rounded-2xl bg-beige-200 flex items-center justify-center mb-4">
                <PlayCircle size={32} className="text-[#a07f52]" />
              </div>
              <h3 className="text-[#1a2332] font-semibold mb-1">Agent Idle</h3>
              <p className="text-xs text-[#718096] max-w-sm">
                Select a template and define a task on the left to start an autonomous agent loop.
              </p>
            </div>
          ) : (
            <div className="glass-card p-4 sm:p-6 min-h-[min(420px,65vh)] sm:min-h-[500px] flex flex-col min-w-0 w-full overflow-hidden">
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
                            className="mt-2 w-full min-w-0 max-w-full text-[#4a5568] bg-beige-50 p-2 sm:p-3 rounded-lg border border-beige-200 overflow-x-auto overflow-y-visible"
                          >
                            <RichTextOutput content={step.content} format="markdown" />
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
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-beige-200 text-xs sm:text-sm text-[#2d3748] shadow-sm min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible">
                    <RichTextOutput content={finalResult} format="markdown" />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
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
