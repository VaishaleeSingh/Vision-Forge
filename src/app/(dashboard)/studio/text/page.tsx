'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  Wand2,
  Zap,
  Copy,
  Save,
  RefreshCw,
  ChevronDown,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BrainCircuit,
} from 'lucide-react'
import { toast } from 'sonner'
import { TONE_PRESETS } from '@/lib/prompt-templates'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS = [
  { id: 'blog',    label: 'Blog Post',           emoji: '📝' },
  { id: 'email',   label: 'Email',               emoji: '✉️' },
  { id: 'social',  label: 'Social Media',        emoji: '📱' },
  { id: 'ad',      label: 'Ad Copy',             emoji: '📣' },
  { id: 'product', label: 'Product Description', emoji: '🛍️' },
  { id: 'essay',   label: 'Essay',               emoji: '📄' },
  { id: 'script',  label: 'Script / Video',      emoji: '🎬' },
]

const LENGTH_OPTIONS = [
  { id: 'short',  label: 'Short',  words: 200,  desc: '~200 words' },
  { id: 'medium', label: 'Medium', words: 500,  desc: '~500 words' },
  { id: 'long',   label: 'Long',   words: 1000, desc: '~1000 words' },
] as const

type LengthId = (typeof LENGTH_OPTIONS)[number]['id']

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TextStudioPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [prompt, setPrompt]       = useState('')
  const [tone, setTone]           = useState<string>('default')
  const [format, setFormat]       = useState('blog')
  const [length, setLength]       = useState<LengthId>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [result, setResult]       = useState('')
  const [isSaved, setIsSaved]     = useState(false)
  const [isFormatOpen, setIsFormatOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const charCount   = result.length
  const tokenEst    = Math.ceil(charCount / 4)
  const selectedFmt = FORMAT_OPTIONS.find(f => f.id === format) ?? FORMAT_OPTIONS[0]
  const selectedLen = LENGTH_OPTIONS.find(l => l.id === length) ?? LENGTH_OPTIONS[1]

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first.')
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsLoading(true)
    setResult('')
    setIsSaved(false)

    try {
      const res = await fetch('/api/generate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone, format, length: selectedLen.words }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed.' }))
        throw new Error(err.error ?? 'Generation failed.')
      }

      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setResult(accumulated)
        // scroll output to bottom while streaming
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      toast.error(message, { icon: <AlertCircle className="w-4 h-4" /> })
    } finally {
      setIsLoading(false)
    }
  }, [prompt, tone, format, selectedLen.words])

  // ── Stop generation ────────────────────────────────────────────────────────
  const handleStop = () => {
    abortRef.current?.abort()
    setIsLoading(false)
  }

  // ── Improve / transform actions ────────────────────────────────────────────
  const handleAction = useCallback(
    async (action: 'improve' | 'viral' | 'professional' | 'summarize') => {
      if (!result.trim()) return
      setIsImproving(true)
      try {
        const res = await fetch('/api/generate/improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: result, action }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Action failed.' }))
          throw new Error(err.error ?? 'Action failed.')
        }
        const data = await res.json()
        setResult(data.result)
        setIsSaved(false)
        toast.success(`Content ${action === 'improve' ? 'improved' : action === 'viral' ? 'made viral' : action === 'professional' ? 'made professional' : 'summarized'}!`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        toast.error(message)
      } finally {
        setIsImproving(false)
      }
    },
    [result]
  )

  // ── Copy ───────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      toast.success('Copied to clipboard!', { icon: <CheckCircle2 className="w-4 h-4" /> })
    } catch {
      toast.error('Failed to copy.')
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!result || isSaved) return
    setIsSaved(true)
    toast.success('Content saved!', {
      icon: <CheckCircle2 className="w-4 h-4" />,
      description: 'Your generation has been saved to history.',
    })
  }

  // ── Regenerate ─────────────────────────────────────────────────────────────
  const handleRegenerate = () => {
    setResult('')
    handleGenerate()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}
            >
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl gradient-text">Text Generation Studio</h1>
          </div>
          <p className="text-secondary text-sm ml-13 pl-1">
            Craft compelling content with AI — just describe it and choose your style.
          </p>
        </div>
        <span className="badge badge-aqua mt-1">
          <Sparkles className="w-3 h-3" />
          Gemini Flash
        </span>
      </motion.div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ════════════════════════════════════════════════════
            LEFT PANEL — Prompt Builder
        ════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card p-6 space-y-6"
        >
          {/* Section label */}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-aqua-500" />
            <span className="text-xs font-semibold text-aqua-600 uppercase tracking-wider">
              Prompt Builder
            </span>
          </div>

          {/* ── Textarea ── */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
              What do you want to create?
            </label>
            <textarea
              className="input-base resize-none leading-relaxed"
              rows={6}
              placeholder="Describe what you want to create... e.g. 'Write a blog post about the future of renewable energy, focusing on solar panel innovations for homeowners.'"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
              }}
            />
            <p className="text-xs text-muted text-right">
              {prompt.length} chars · Ctrl+Enter to generate
            </p>
          </div>

          {/* ── Tone Selector ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_PRESETS.map(t => (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTone(t.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                    border transition-all duration-150
                    ${tone === t.id
                      ? 'border-aqua-400 bg-aqua-50 text-aqua-700 shadow-sm'
                      : 'border-[#e8ddd0] bg-white text-secondary hover:border-aqua-300 hover:bg-aqua-50'
                    }
                  `}
                >
                  <span>{t.emoji}</span>
                  {t.label}
                </motion.button>
              ))}
            </div>
            {TONE_PRESETS.find(t => t.id === tone) && (
              <p className="text-xs text-muted">
                {TONE_PRESETS.find(t => t.id === tone)?.description}
              </p>
            )}
          </div>

          {/* ── Format Dropdown ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
              Format
            </label>
            <div className="relative">
              <button
                onClick={() => setIsFormatOpen(o => !o)}
                className="input-base flex items-center justify-between cursor-pointer hover:border-aqua-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{selectedFmt.emoji}</span>
                  <span className="font-medium text-primary">{selectedFmt.label}</span>
                </span>
                <motion.span
                  animate={{ rotate: isFormatOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-muted" />
                </motion.span>
              </button>

              <AnimatePresence>
                {isFormatOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-20 top-full mt-1 left-0 right-0 glass-card p-1.5 shadow-lg"
                  >
                    {FORMAT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setFormat(opt.id); setIsFormatOpen(false) }}
                        className={`
                          w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                          ${format === opt.id
                            ? 'bg-aqua-50 text-aqua-700 font-semibold'
                            : 'hover:bg-beige-100 text-secondary'
                          }
                        `}
                      >
                        <span className="text-base">{opt.emoji}</span>
                        {opt.label}
                        {format === opt.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-aqua-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Length Slider ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
                Length
              </label>
              <span className="badge badge-beige">{selectedLen.desc}</span>
            </div>
            <div className="flex gap-2">
              {LENGTH_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLength(opt.id)}
                  className={`
                    flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150
                    ${length === opt.id
                      ? 'border-aqua-400 bg-aqua-50 text-aqua-700 shadow-sm'
                      : 'border-[#e8ddd0] bg-white text-secondary hover:border-aqua-300'
                    }
                  `}
                >
                  <div>{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${length === opt.id ? 'text-aqua-500' : 'text-muted'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Generate Button ── */}
          <div className="pt-2 space-y-2">
            {isLoading ? (
              <button
                onClick={handleStop}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              >
                <span className="w-2 h-2 rounded-sm bg-red-500 animate-pulse" />
                Stop Generating
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
              >
                <Sparkles className="w-4 h-4" />
                Generate Content
              </motion.button>
            )}
            {result && !isLoading && (
              <button
                onClick={handleRegenerate}
                className="btn-ghost w-full justify-center text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            )}
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════
            RIGHT PANEL — Output
        ════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass-card p-6 flex flex-col gap-4"
          style={{ minHeight: '540px' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-aqua-500" />
              <span className="text-xs font-semibold text-aqua-600 uppercase tracking-wider">
                Generated Content
              </span>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{charCount.toLocaleString()} chars</span>
                <span className="text-muted/40">·</span>
                <span className="badge badge-aqua">~{tokenEst} tokens</span>
              </div>
            )}
          </div>

          {/* Output area */}
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto rounded-xl"
            style={{ minHeight: '360px', maxHeight: '480px' }}
          >
            <AnimatePresence mode="wait">
              {/* Empty state */}
              {!result && !isLoading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center py-16 gap-4 text-center"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(11,191,191,0.12), rgba(8,153,160,0.06))' }}
                  >
                    <BrainCircuit className="w-8 h-8 text-aqua-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary">Your content will appear here...</p>
                    <p className="text-xs text-muted mt-1">
                      Fill out the prompt builder and click Generate.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center mt-2">
                    {['Blog Post', 'Social Media', 'Email Campaign'].map(hint => (
                      <span key={hint} className="badge badge-beige text-xs">{hint}</span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Skeleton while loading with no text yet */}
              {isLoading && !result && (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 p-1"
                >
                  {[80, 100, 70, 90, 60, 95, 75].map((w, i) => (
                    <div
                      key={i}
                      className="skeleton h-4 rounded"
                      style={{ width: `${w}%`, animationDelay: `${i * 0.07}s` }}
                    />
                  ))}
                </motion.div>
              )}

              {/* Streaming / result text */}
              {result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative"
                >
                  <div className={`prose prose-sm md:prose-base prose-slate max-w-none text-primary p-2 prose-headings:font-bold prose-headings:text-aqua-800 prose-a:text-aqua-600 ${isLoading ? 'streaming-cursor' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result}
                    </ReactMarkdown>
                  </div>
                  {isImproving && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-aqua-500 animate-spin" />
                        <span className="text-xs font-medium text-aqua-600">Rewriting…</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          {result && <div className="divider" />}

          {/* Action bar */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {/* Primary actions */}
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCopy}
                    className="btn-secondary flex-1 justify-center py-2 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={isSaved}
                    className={`
                      flex-1 justify-center py-2 text-xs font-semibold
                      inline-flex items-center gap-1.5 rounded-xl border transition-all duration-150
                      ${isSaved
                        ? 'border-green-200 bg-green-50 text-green-600 cursor-default'
                        : 'btn-secondary'
                      }
                    `}
                  >
                    {isSaved
                      ? <><CheckCircle2 className="w-3.5 h-3.5" />Saved</>
                      : <><Save className="w-3.5 h-3.5" />Save</>
                    }
                  </motion.button>
                </div>

                {/* Transform actions */}
                <div className="glass-card-aqua p-3 space-y-2">
                  <p className="text-xs font-semibold text-aqua-700 mb-2">Transform Content</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAction('improve')}
                      disabled={isImproving || isLoading}
                      className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-aqua-500" />
                      Improve
                    </button>
                    <button
                      onClick={() => handleAction('viral')}
                      disabled={isImproving || isLoading}
                      className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 text-orange-400" />
                      Make Viral
                    </button>
                    <button
                      onClick={() => handleAction('professional')}
                      disabled={isImproving || isLoading}
                      className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      <span className="text-sm">🎩</span>
                      Make Professional
                    </button>
                    <button
                      onClick={() => handleAction('summarize')}
                      disabled={isImproving || isLoading}
                      className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      <span className="text-sm">📋</span>
                      Summarize
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Tips footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card-aqua p-4 flex flex-wrap items-center gap-4"
      >
        <Sparkles className="w-4 h-4 text-aqua-500 shrink-0" />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-aqua-700">
          <span><strong>Pro tip:</strong> Be specific — include target audience, key points, and desired outcomes.</span>
          <span>Use <kbd className="px-1.5 py-0.5 rounded bg-aqua-100 font-mono text-[10px]">Ctrl+Enter</kbd> to generate instantly.</span>
          <span>Try the <strong>Transform</strong> actions to remix your content after generation.</span>
        </div>
      </motion.div>
    </div>
  )
}
