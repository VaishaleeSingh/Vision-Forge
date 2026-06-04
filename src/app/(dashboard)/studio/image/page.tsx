'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Scan,
  Wand2,
  AlertCircle,
  Check,
  Loader2,
  Eye,
  Palette,
} from 'lucide-react'
import { IMAGE_STYLES } from '@/lib/prompt-templates'
import { RichTextInput, RichTextOutput } from '@/components/rich-text'

// ── Style icon mapping ─────────────────────────────────────────────────────
const STYLE_ICONS: Record<string, string> = {
  photorealistic: '📷',
  'digital-art': '🎨',
  anime: '🌸',
  'oil-painting': '🖌️',
  watercolor: '💧',
  cinematic: '🎬',
  sketch: '✏️',
  '3d-render': '🧊',
}

// ── Animation variants ─────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.22 } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
}

// ── Shimmer placeholder ────────────────────────────────────────────────────
function ImageShimmer() {
  return (
    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-beige-100 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-beige-100 via-beige-50 to-beige-100 animate-shimmer bg-[length:200%_100%]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-beige-200 animate-pulse" />
        <div className="w-48 h-3 rounded-full bg-beige-200 animate-pulse" />
        <div className="w-32 h-3 rounded-full bg-beige-200 animate-pulse delay-75" />
        <p className="text-sm text-[#718096] mt-2 animate-pulse">Generating your image…</p>
      </div>
    </div>
  )
}

// ── Upload Drop Zone ───────────────────────────────────────────────────────
function DropZone({
  onFile,
  preview,
  onClear,
}: {
  onFile: (f: File) => void
  preview: string | null
  onClear: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) onFile(file)
    },
    [onFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  if (preview) {
    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-aqua-300 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Upload preview" className="w-full object-contain max-h-80" />
        <button
          onClick={onClear}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-red-50 transition-colors"
        >
          <X size={14} className="text-red-500" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent p-3">
          <p className="text-white text-xs font-medium">Image ready for analysis</p>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative w-full rounded-2xl border-2 border-dashed cursor-pointer
        flex flex-col items-center justify-center gap-4 py-16 px-8
        transition-all duration-200
        ${dragging
          ? 'border-aqua-400 bg-aqua-50 scale-[1.01]'
          : 'border-beige-300 bg-beige-50 hover:border-aqua-300 hover:bg-aqua-50/40'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-aqua-100' : 'bg-beige-200'}`}>
        <Upload size={28} className={dragging ? 'text-aqua-600' : 'text-[#718096]'} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-[#1a2332] text-sm">
          {dragging ? 'Drop it here!' : 'Drag & drop an image'}
        </p>
        <p className="text-xs text-[#718096] mt-1">or click to browse — PNG, JPG, WebP, GIF</p>
      </div>
      <span className="badge badge-aqua text-[10px]">Supports all common formats</span>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ImageStudioPage() {
  // Tab
  const [activeTab, setActiveTab] = useState<'generate' | 'analyze'>('generate')

  // Generate tab state
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<string>('photorealistic')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [showNegative, setShowNegative] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{ url: string; model: string } | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Analyze tab state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [analyzePrompt, setAnalyzePrompt] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  // Reset saved badge after 3s
  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [saved])

  // ── Handle file selection ────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setUploadedFile(file)
    setAnalysisResult(null)
    setAnalyzeError(null)
    const reader = new FileReader()
    reader.onloadend = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const clearFile = useCallback(() => {
    setUploadedFile(null)
    setUploadPreview(null)
    setAnalysisResult(null)
    setAnalyzeError(null)
  }, [])

  // ── Generate image ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setGeneratedImage(null)
    setGenerateError(null)
    setSaved(false)

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: selectedStyle,
          negativePrompt: negativePrompt.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const hint = data.hint ? ` ${data.hint}` : ''
        throw new Error((data.error || 'Generation failed') + hint)
      }

      setGeneratedImage({ url: data.imageUrl, model: data.model })
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Download image ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!generatedImage) return
    try {
      const res = await fetch(generatedImage.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `visionforge-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(generatedImage.url, '_blank')
    }
  }

  // ── Save to library (optimistic) ─────────────────────────────────────────
  const handleSave = () => {
    // The API already saves it; this is just a visual confirmation
    setSaved(true)
  }

  // ── Analyze image ────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!uploadedFile) return
    setIsAnalyzing(true)
    setAnalysisResult(null)
    setAnalyzeError(null)

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // Strip the data URL prefix: "data:image/png;base64,"
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(uploadedFile)
      })

      const res = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: uploadedFile.type || 'image/jpeg',
          prompt: analyzePrompt.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setAnalysisResult(data.analysis)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-serif text-3xl text-[#1a2332] flex items-center gap-3">
            <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}>
              <Wand2 size={20} className="text-white" />
            </span>
            Image Studio
          </h1>
          <p className="text-sm text-[#718096] mt-1 ml-[52px]">
            Generate stunning AI images or analyze existing ones with vision AI
          </p>
        </div>
        <span className="badge badge-aqua">Flux Schnell · Gemini Vision</span>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-1.5 flex gap-1 w-fit"
      >
        {(['generate', 'analyze'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              relative px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200
              ${activeTab === tab
                ? 'text-white shadow'
                : 'text-[#718096] hover:text-[#1a2332]'
              }
            `}
          >
            {activeTab === tab && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab === 'generate' ? <Palette size={14} /> : <Eye size={14} />}
              {tab === 'generate' ? 'Generate' : 'Analyze'}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'generate' ? (
          <motion.div
            key="generate"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6"
          >
            {/* Left: Controls */}
            <div className="space-y-5">
              {/* Prompt */}
              <div className="glass-card p-5 space-y-3">
                <label className="block text-sm font-semibold text-[#1a2332]">
                  Image Prompt
                </label>
                <RichTextInput
                  value={prompt}
                  onChange={setPrompt}
                  placeholder="Describe the image you want to create… e.g. A serene mountain lake at golden hour, misty peaks in the background"
                  onSubmit={handleGenerate}
                  submitHint="Enter to generate · Shift+Enter for new line"
                  minHeight={120}
                />
              </div>

              {/* Style presets */}
              <div className="glass-card p-5 space-y-3">
                <label className="block text-sm font-semibold text-[#1a2332]">
                  Style Preset
                </label>
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {IMAGE_STYLES.map((style) => (
                    <motion.button
                      key={style.id}
                      variants={fadeUp}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`
                        relative group flex flex-col items-center gap-1.5 p-3 rounded-xl border-2
                        text-center transition-all duration-200 hover-lift
                        ${selectedStyle === style.id
                          ? 'border-aqua-400 bg-aqua-50 shadow-sm'
                          : 'border-beige-200 bg-white hover:border-aqua-200 hover:bg-aqua-50/30'
                        }
                      `}
                    >
                      {selectedStyle === style.id && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-aqua-500 flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </span>
                      )}
                      <span className="text-xl">{STYLE_ICONS[style.id] ?? '🖼️'}</span>
                      <span className={`text-[11px] font-semibold leading-tight ${selectedStyle === style.id ? 'text-aqua-700' : 'text-[#4a5568]'}`}>
                        {style.label}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              </div>

              {/* Negative prompt (collapsible) */}
              <div className="glass-card overflow-hidden">
                <button
                  onClick={() => setShowNegative(!showNegative)}
                  className="w-full flex items-center justify-between p-4 text-sm font-semibold text-[#1a2332] hover:bg-beige-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <X size={14} className="text-[#718096]" />
                    Negative Prompt
                    <span className="badge badge-beige text-[10px]">Optional</span>
                  </span>
                  {showNegative ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <AnimatePresence>
                  {showNegative && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2">
                        <RichTextInput
                          value={negativePrompt}
                          onChange={setNegativePrompt}
                          placeholder="What to avoid: blurry, low quality, distorted, watermark, text…"
                          minHeight={72}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Image
                  </>
                )}
              </button>
            </div>

            {/* Right: Result */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div key="shimmer" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
                    <ImageShimmer />
                  </motion.div>
                ) : generatedImage ? (
                  <motion.div key="result" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-3">
                    {/* Image */}
                    <div className="relative rounded-2xl overflow-hidden border-2 border-aqua-200 shadow-lg group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={generatedImage.url}
                        alt={prompt}
                        className="w-full object-cover"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Model badge + prompt */}
                    <div className="glass-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="badge badge-aqua text-[10px]">{generatedImage.model}</span>
                        <span className="text-[10px] text-[#718096]">
                          {IMAGE_STYLES.find((s) => s.id === selectedStyle)?.label} style
                        </span>
                      </div>
                      <p className="text-xs text-[#4a5568] line-clamp-2">{prompt}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleDownload}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
                      >
                        <Download size={15} />
                        Download
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saved}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl font-semibold border-2 transition-all duration-200 ${
                          saved
                            ? 'border-aqua-300 bg-aqua-50 text-aqua-700'
                            : 'border-beige-300 bg-white text-[#4a5568] hover:border-aqua-300 hover:bg-aqua-50'
                        }`}
                      >
                        {saved ? (
                          <><Check size={15} className="text-aqua-600" /> Saved!</>
                        ) : (
                          <><BookmarkPlus size={15} /> Save to Library</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ) : generateError ? (
                  <motion.div key="error" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
                    className="glass-card p-6 flex flex-col items-center gap-3 text-center border-red-200 bg-red-50/40"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle size={22} className="text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-red-700">Generation Failed</p>
                      <p className="text-xs text-red-500 mt-1">{generateError}</p>
                    </div>
                    <button onClick={() => setGenerateError(null)} className="btn-ghost text-xs">
                      Dismiss
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="empty" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
                    className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-beige-300 bg-beige-50 flex flex-col items-center justify-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-beige-200 flex items-center justify-center">
                      <ImageIcon size={30} className="text-[#b0a090]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#718096]">Your image will appear here</p>
                      <p className="text-xs text-[#b0a090] mt-1">Enter a prompt and click Generate</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          /* ── ANALYZE TAB ─────────────────────────────────────────────── */
          <motion.div
            key="analyze"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6"
          >
            {/* Left: Upload */}
            <div className="space-y-5">
              <div className="glass-card p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1a2332] mb-1 flex items-center gap-2">
                    <Upload size={15} className="text-aqua-600" />
                    Upload Image
                  </h3>
                  <p className="text-xs text-[#718096]">Upload any image and let Gemini Vision analyze it in detail</p>
                </div>
                <DropZone onFile={handleFile} preview={uploadPreview} onClear={clearFile} />
              </div>

              {/* Optional custom prompt */}
              <div className="glass-card p-5 space-y-3">
                <label className="block text-sm font-semibold text-[#1a2332] flex items-center gap-2">
                  Custom Question
                  <span className="badge badge-beige text-[10px]">Optional</span>
                </label>
                <RichTextInput
                  value={analyzePrompt}
                  onChange={setAnalyzePrompt}
                  onSubmit={handleAnalyze}
                  submitHint="Enter to analyze · Shift+Enter for new line"
                  placeholder="Ask something specific, e.g. 'What colors dominate this image?' or leave blank for full analysis…"
                  minHeight={72}
                />
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={!uploadedFile || isAnalyzing}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing with Gemini Vision…
                  </>
                ) : (
                  <>
                    <Scan size={18} />
                    Analyze Image
                  </>
                )}
              </button>
            </div>

            {/* Right: Analysis result */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div key="analyzing" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
                    className="glass-card p-6 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}>
                        <Scan size={16} className="text-white animate-pulse" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#1a2332]">Gemini Vision is analyzing…</p>
                        <p className="text-xs text-[#718096]">Identifying elements, style, and mood</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[100, 80, 92, 60, 76].map((w, i) => (
                        <div key={i} className="h-3 rounded-full bg-beige-200 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  </motion.div>
                ) : analysisResult ? (
                  <motion.div key="analysis" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
                    className="glass-card p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}>
                          <Sparkles size={13} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold text-[#1a2332]">Vision Analysis</span>
                      </div>
                      <span className="badge badge-aqua text-[10px]">Gemini 2.0 Flash</span>
                    </div>

                    <div className="divider" />

                    <div className="min-w-0 w-full max-w-full overflow-x-auto">
                      <RichTextOutput content={analysisResult} format="markdown" />
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(analysisResult)
                      }}
                      className="btn-ghost text-xs flex items-center gap-1"
                    >
                      Copy analysis
                    </button>
                  </motion.div>
                ) : analyzeError ? (
                  <motion.div key="aerror" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
                    className="glass-card p-6 flex flex-col items-center gap-3 text-center border-red-200 bg-red-50/40"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle size={22} className="text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-red-700">Analysis Failed</p>
                      <p className="text-xs text-red-500 mt-1">{analyzeError}</p>
                    </div>
                    <button onClick={() => setAnalyzeError(null)} className="btn-ghost text-xs">
                      Dismiss
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="aempty" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
                    className="glass-card p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[320px]"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-beige-100 flex items-center justify-center">
                      <Eye size={28} className="text-[#b0a090]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#718096]">Analysis will appear here</p>
                      <p className="text-xs text-[#b0a090] mt-1">Upload an image and click Analyze</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Style & Mood', 'Key Elements', 'Color Palette', 'Composition'].map((tag) => (
                        <span key={tag} className="badge badge-beige text-[10px]">{tag}</span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
