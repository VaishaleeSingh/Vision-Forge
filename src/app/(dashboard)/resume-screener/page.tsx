'use client'

import { useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { RichTextInput, RichTextOutput } from '@/components/rich-text'
import {
  Briefcase, FileText, Upload, X, Loader2, Sparkles, AlertCircle, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

export default function ResumeScreenerPage() {
  const [jd, setJd] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const resultRef = useRef<HTMLDivElement>(null)

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0])
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const handleScreen = async () => {
    if (!jd.trim()) {
      toast.error('Please paste a Job Description.')
      return
    }
    if (!file) {
      toast.error('Please upload a resume (PDF).')
      return
    }

    setIsProcessing(true)
    setResult('')
    setError(null)

    const formData = new FormData()
    formData.append('jd', jd)
    formData.append('file', file)

    try {
      const res = await fetch('/api/resume-screener', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to screen resume.')
      }

      if (!res.body) throw new Error('No response stream available')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setResult(accumulated)
        if (resultRef.current) {
          resultRef.current.scrollTop = resultRef.current.scrollHeight
        }
      }
      
      toast.success('Screening complete!')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
      toast.error('Screening failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-aqua-400 to-aqua-600">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl gradient-text">Resume Screener</h1>
          </div>
          <p className="text-secondary text-sm ml-13 pl-1">
            Evaluate a candidate's resume against a specific Job Description instantly.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT PANEL - Inputs */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-aqua-500" />
            <span className="text-xs font-semibold text-aqua-600 uppercase tracking-wider">Configuration</span>
          </div>

          <RichTextInput
            label="Job Description"
            placeholder="Paste the full job description here (requirements, responsibilities, tech stack, etc.)..."
            value={jd}
            onChange={setJd}
            onSubmit={handleScreen}
            submitHint="Enter to screen resume · Shift+Enter for new line"
            disabled={isProcessing}
            minHeight={180}
          />

          {/* Resume Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide">
              Candidate Resume
            </label>
            
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group ${
                isDragActive ? 'border-aqua-400 bg-aqua-50 scale-[1.01]' : 'border-[var(--border-default)] hover:border-aqua-300 hover:bg-aqua-50/40'
              } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input {...getInputProps()} />
              <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }} className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDragActive ? 'bg-aqua-100' : 'bg-beige-100 group-hover:bg-aqua-50'}`}>
                  <Upload className={`w-6 h-6 ${isDragActive ? 'text-aqua-500' : 'text-muted group-hover:text-aqua-400'}`} />
                </div>
                <div>
                  <p className="text-sm text-secondary">
                    {isDragActive ? <span className="text-aqua-600 font-medium">Drop it here!</span> : <><span className="font-medium text-aqua-600">Click to upload</span> or drag & drop</>}
                  </p>
                  <p className="text-[11px] text-muted mt-1">PDF only (Max 10MB)</p>
                </div>
              </motion.div>
            </div>

            <AnimatePresence>
              {file && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-3 glass-card-aqua p-3 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-aqua-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary truncate">{file.name}</p>
                    <p className="text-[10px] text-muted">{formatBytes(file.size)}</p>
                  </div>
                  <button onClick={() => setFile(null)} disabled={isProcessing} className="text-muted hover:text-red-400 transition-colors disabled:opacity-50">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button
              onClick={handleScreen}
              disabled={isProcessing || !jd.trim() || !file}
              className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Candidate...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Screen Resume</>
              )}
            </button>
            {error && (
              <div className="mt-3 text-xs text-red-500 flex items-center gap-2 bg-red-50 p-2 rounded border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT PANEL - Output */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 flex flex-col gap-4" style={{ minHeight: '600px' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-aqua-500" />
            <span className="text-xs font-semibold text-aqua-600 uppercase tracking-wider">Evaluation Result</span>
          </div>

          <div ref={resultRef} className="flex-1 overflow-y-auto bg-white rounded-xl border border-beige-200 p-5 shadow-sm">
            <AnimatePresence mode="wait">
              {!result && !isProcessing && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-aqua-50 border border-aqua-100">
                    <Briefcase className="w-8 h-8 text-aqua-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary">Awaiting configuration...</p>
                    <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                      Provide a Job Description and a Resume PDF, then click "Screen Resume" to see the AI evaluation.
                    </p>
                  </div>
                </motion.div>
              )}

              {isProcessing && !result && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center text-center gap-3">
                  <Loader2 className="w-8 h-8 text-aqua-500 animate-spin" />
                  <p className="text-sm font-medium text-aqua-700 animate-pulse">Extracting and analyzing...</p>
                </motion.div>
              )}

              {result && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                  <RichTextOutput
                    content={result}
                    format="markdown"
                    isLoading={isProcessing}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
