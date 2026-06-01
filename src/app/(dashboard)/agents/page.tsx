'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Search, Sparkles, BarChart3, Settings, Play,
  CheckCircle2, CircleDashed, Check, Loader2, PlayCircle, Clock
} from 'lucide-react'

type AgentType = 'research' | 'content' | 'analysis'

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
  
  const activeTemplate = AGENT_TEMPLATES.find(a => a.id === selectedAgent)

  const handleRun = async () => {
    if (!task.trim()) return
    setIsRunning(true)
    setFinalResult(null)
    
    // Initialize steps
    const initialSteps: Step[] = [
      { id: 1, label: 'Initializing agent loop...', status: 'pending' }
    ]
    if (selectedAgent === 'content') {
      initialSteps.push(
        { id: 2, label: '🔍 Researcher thinking...', status: 'pending' },
        { id: 3, label: '✏️ Writer drafting...', status: 'pending' },
        { id: 4, label: '🔄 Critic reviewing...', status: 'pending' },
        { id: 5, label: '✅ Finalizing output...', status: 'pending' }
      )
    } else {
      initialSteps.push(
        { id: 2, label: 'Processing task...', status: 'pending' },
        { id: 3, label: 'Compiling results...', status: 'pending' }
      )
    }
    setSteps(initialSteps)
    
    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: selectedAgent, task, model })
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
                      ? { ...s, status: data.status, content: data.content } 
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
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-3xl text-[#1a2332] flex items-center gap-3 mb-2">
          <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center bg-gradient-to-br from-aqua-400 to-aqua-600">
            <BotIcon size={20} className="text-white" />
          </span>
          AI Agent Playground
        </h1>
        <p className="text-sm text-[#718096] ml-[52px]">
          Deploy autonomous agents that reason, research, and execute complex tasks.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Config Panel */}
        <div className="lg:col-span-1 space-y-4">
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
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="E.g. Analyze the current state of generative AI in healthcare and write a comprehensive report."
              rows={4}
              disabled={isRunning}
              className="input-base w-full resize-none text-sm"
            />
            
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
              disabled={!task.trim() || isRunning}
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
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-[#1a2332]">Execution View</h2>
          
          {!isRunning && steps.length === 0 ? (
            <div className="glass-card h-[500px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-beige-200 flex items-center justify-center mb-4">
                <PlayCircle size={32} className="text-[#a07f52]" />
              </div>
              <h3 className="text-[#1a2332] font-semibold mb-1">Agent Idle</h3>
              <p className="text-xs text-[#718096] max-w-sm">
                Select a template and define a task on the left to start an autonomous agent loop.
              </p>
            </div>
          ) : (
            <div className="glass-card p-6 min-h-[500px] flex flex-col">
              <div className="flex-1 space-y-6">
                <AnimatePresence>
                  {steps.map((step, i) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-4"
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
                      <div className="flex-1 pb-4">
                        <p className={`text-sm font-medium ${
                          step.status === 'running' ? 'text-aqua-700' : 
                          step.status === 'pending' ? 'text-[#718096]' : 'text-[#1a2332]'
                        }`}>
                          {step.label}
                        </p>
                        {step.content && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 text-xs text-[#4a5568] bg-beige-50 p-3 rounded-lg border border-beige-200 prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-aqua-800 prose-a:text-aqua-600"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {step.content}
                            </ReactMarkdown>
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
                  className="mt-6 pt-6 border-t border-beige-200"
                >
                  <h3 className="text-sm font-semibold text-[#1a2332] mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-aqua-600" />
                    Final Result
                  </h3>
                  <div className="bg-white p-4 rounded-xl border border-beige-200 text-sm text-[#2d3748] shadow-sm">
                    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-aqua-800 prose-a:text-aqua-600">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {finalResult}
                      </ReactMarkdown>
                    </div>
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

function BotIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </svg>
  )
}
