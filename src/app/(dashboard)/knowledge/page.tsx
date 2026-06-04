'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { RichTextInput, RichTextOutput } from '@/components/rich-text'
import type { Editor } from '@tiptap/react'
import {
  FileText,
  FileType,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  BookOpen,
  MessageSquare,
  Trash2,
  ChevronRight,
  File,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KnowledgeDocument {
  _id: string
  name: string
  originalName: string
  size: number
  mimeType: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  chunkCount: number
  errorMessage?: string
  createdAt: string
}

interface SourceCitation {
  chunkIndex: number
  source: string
  pageNumber?: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCitation[]
  isStreaming?: boolean
}

interface PendingFile {
  file: File
  preview: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return FileText
  if (mimeType === 'text/markdown') return FileType
  return File
}

function StatusBadge({ status }: { status: KnowledgeDocument['status'] }) {
  const config = {
    uploading:   { label: 'Uploading',   className: 'badge bg-blue-50 text-blue-600 border border-blue-200' },
    processing:  { label: 'Processing',  className: 'badge bg-amber-50 text-amber-600 border border-amber-200' },
    ready:       { label: 'Ready',       className: 'badge badge-aqua' },
    error:       { label: 'Error',       className: 'badge bg-red-50 text-red-600 border border-red-200' },
  }
  const { label, className } = config[status]
  return (
    <span className={className}>
      {status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'ready' && <CheckCircle className="w-3 h-3" />}
      {status === 'error' && <AlertCircle className="w-3 h-3" />}
      {label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatEditorRef = useRef<Editor | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-select the first ready document if none is selected
  useEffect(() => {
    if (!selectedDoc && documents.length > 0) {
      const firstReady = documents.find(d => d.status === 'ready')
      if (firstReady) {
        setSelectedDoc(firstReady)
      }
    }
  }, [documents, selectedDoc])

  async function fetchDocuments() {
    setIsLoadingDocs(true)
    try {
      const res = await fetch('/api/knowledge/documents')
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents)
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setIsLoadingDocs(false)
    }
  }

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setPendingFile({ file, preview: file.name })
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    noClick: false,
  })

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!pendingFile || isUploading) return
    setIsUploading(true)
    setUploadProgress(10)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', pendingFile.file)

    try {
      setUploadProgress(30)
      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      })
      setUploadProgress(80)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      setUploadProgress(100)
      setPendingFile(null)
      await fetchDocuments()
    } catch (err: any) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'An error occurred during upload')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDeleteDoc(docId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/knowledge/documents?id=${docId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d._id !== docId))
        if (selectedDoc?._id === docId) {
          setSelectedDoc(null)
          setMessages([])
        }
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // ── Select document ────────────────────────────────────────────────────────
  function handleSelectDoc(doc: KnowledgeDocument) {
    if (doc.status !== 'ready') return
    setSelectedDoc(doc)
    setMessages([])
    setTimeout(() => chatEditorRef.current?.commands.focus(), 100)
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSend() {
    if (!inputValue.trim() || !selectedDoc || isSending) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
    }
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      sources: [],
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInputValue('')
    setIsSending(true)

    try {
      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          documentId: selectedDoc._id,
        }),
      })

      if (!res.ok) throw new Error('Chat request failed')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let sources: SourceCitation[] = []
      let firstLine = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.trim()) continue

          // First line is JSON metadata with sources
          if (firstLine && line.startsWith('{')) {
            try {
              const meta = JSON.parse(line)
              sources = meta.sources || []
              firstLine = false
              continue
            } catch {
              // not JSON, treat as text
            }
          }
          firstLine = false
          fullText += line
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: fullText, sources, isStreaming: true }
              : m
          )
        )
      }

      // Finalize
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: fullText, sources, isStreaming: false }
            : m
        )
      )
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: 'Sorry, I encountered an error. Please try again.',
                isStreaming: false,
              }
            : m
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* ── LEFT PANEL: Document Library ─────────────────────────────────── */}
      <div className="w-80 flex flex-col gap-4 shrink-0">
        {/* Upload Zone */}
        <div className="glass-card p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Upload className="w-4 h-4 text-aqua-500" />
            Upload Document
          </h2>

          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer
              transition-all duration-200 group
              ${isDragActive
                ? 'border-aqua-400 bg-aqua-50 scale-[1.01]'
                : 'border-[var(--border-default)] hover:border-aqua-300 hover:bg-aqua-50/40'
              }
            `}
          >
            <input {...getInputProps()} />

            <motion.div
              animate={isDragActive ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-2"
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${isDragActive ? 'bg-aqua-100' : 'bg-beige-100 group-hover:bg-aqua-50'}
              `}>
                <Upload className={`w-5 h-5 transition-colors ${isDragActive ? 'text-aqua-500' : 'text-[var(--text-muted)] group-hover:text-aqua-400'}`} />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {isDragActive ? (
                  <span className="text-aqua-600 font-medium">Drop it here!</span>
                ) : (
                  <>
                    <span className="font-medium text-aqua-600">Click to upload</span>{' '}
                    or drag & drop
                  </>
                )}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">PDF, TXT, MD · Max 20MB</p>
            </motion.div>
          </div>

          {/* Pending File Preview */}
          <AnimatePresence>
            {pendingFile && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-card-aqua p-3 flex items-center gap-3"
              >
                <FileText className="w-5 h-5 text-aqua-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {pendingFile.file.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {formatBytes(pendingFile.file.size)}
                  </p>
                </div>
                <button
                  onClick={() => setPendingFile(null)}
                  className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Processing document…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-beige-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #0bbfbf, #0899a0)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Error */}
          <AnimatePresence>
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={pendingFile ? handleUpload : open}
            disabled={isUploading}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {pendingFile ? 'Upload & Process' : 'Select Document'}
              </>
            )}
          </button>
        </div>

        {/* Document Library */}
        <div className="glass-card p-4 flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-aqua-500" />
              Library
            </h2>
            <span className="badge badge-beige">{documents.length} docs</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoadingDocs ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-16 w-full" />
              ))
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BookOpen className="w-8 h-8 text-[var(--text-muted)] opacity-40" />
                <p className="text-xs text-[var(--text-muted)]">No documents yet</p>
                <p className="text-[10px] text-[var(--text-muted)]">Upload a file to get started</p>
              </div>
            ) : (
              <AnimatePresence>
                {documents.map((doc) => {
                  const Icon = getFileIcon(doc.mimeType)
                  const isSelected = selectedDoc?._id === doc._id
                  const isClickable = doc.status === 'ready'

                  return (
                    <motion.div
                      key={doc._id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      onClick={() => handleSelectDoc(doc)}
                      className={`
                        group relative p-3 rounded-xl border transition-all duration-150
                        ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                        ${isSelected
                          ? 'border-aqua-300 bg-aqua-50 shadow-sm'
                          : 'border-[var(--border-default)] bg-white hover:border-aqua-200 hover:bg-beige-50'
                        }
                      `}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                          ${isSelected ? 'bg-aqua-100' : 'bg-beige-100 group-hover:bg-aqua-50'}
                        `}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-aqua-600' : 'text-[var(--text-muted)]'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate leading-tight">
                            {doc.originalName}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {formatBytes(doc.size)}
                            {doc.status === 'ready' && ` · ${doc.chunkCount} chunks`}
                          </p>
                          <div className="mt-1.5">
                            <StatusBadge status={doc.status} />
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {isSelected && (
                            <ChevronRight className="w-3.5 h-3.5 text-aqua-500" />
                          )}
                          <button
                            onClick={(e) => handleDeleteDoc(doc._id, e)}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 transition-all p-0.5 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Chat ──────────────────────────────────────────────── */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aqua-400 to-aqua-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-[var(--text-primary)]">
              {selectedDoc ? selectedDoc.originalName : 'Knowledge Chat'}
            </h2>
            <p className="text-[10px] text-[var(--text-muted)]">
              {selectedDoc
                ? `${selectedDoc.chunkCount} chunks · Ask anything about this document`
                : 'RAG-powered document Q&A'}
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!selectedDoc ? (
            // Empty state
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aqua-50 to-aqua-100 flex items-center justify-center border border-aqua-200">
                <BookOpen className="w-8 h-8 text-aqua-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
                  Select a document to start chatting
                </h3>
                <p className="text-sm text-[var(--text-muted)] max-w-xs">
                  Upload a PDF, TXT, or Markdown file, then select it from the library to ask questions about its content.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {['Summarize this document', 'What are the key points?', 'Explain the main concepts'].map((hint) => (
                  <span key={hint} className="badge badge-beige text-[11px]">{hint}</span>
                ))}
              </div>
            </motion.div>
          ) : messages.length === 0 ? (
            // Document selected, no messages yet
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-aqua-50 flex items-center justify-center border border-aqua-200">
                <MessageSquare className="w-6 h-6 text-aqua-500" />
              </div>
              <div>
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">
                  Ready to chat!
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Ask anything about <strong>{selectedDoc.originalName}</strong>
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {[
                  'Give me a summary of this document',
                  'What are the main topics covered?',
                  'List the key findings or conclusions',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputValue(suggestion)}
                    className="text-left text-xs p-2.5 rounded-xl border border-[var(--border-default)] bg-beige-50 hover:border-aqua-300 hover:bg-aqua-50 transition-all text-[var(--text-secondary)] hover:text-aqua-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            // Messages
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                    {/* Bubble */}
                    <div
                      className={`
                        px-4 py-3 rounded-2xl text-sm leading-relaxed
                        ${msg.role === 'user'
                          ? 'text-white rounded-br-sm'
                          : 'bg-white border border-[var(--border-default)] text-[var(--text-primary)] rounded-bl-sm shadow-sm'
                        }
                      `}
                      style={msg.role === 'user' ? {
                        background: 'linear-gradient(135deg, #0bbfbf, #0899a0)',
                      } : {}}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <RichTextOutput
                          content={msg.content || (msg.isStreaming ? '' : '…')}
                          format="markdown"
                          isLoading={msg.isStreaming}
                        />
                      )}
                    </div>

                    {/* Source citations */}
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && !msg.isStreaming && (
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-aqua-50 text-aqua-700 border border-aqua-200"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            {src.pageNumber ? `Page ${src.pageNumber}` : `Chunk ${src.chunkIndex + 1}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-5 py-4 border-t border-[var(--border-default)] shrink-0">
          <div className={`flex gap-3 items-center transition-opacity ${!selectedDoc ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex-1 min-w-0">
              <RichTextInput
                value={inputValue}
                onChange={setInputValue}
                variant="compact"
                onSubmit={handleSend}
                onEditorReady={(ed) => { chatEditorRef.current = ed }}
                placeholder={
                  selectedDoc
                    ? `Ask about ${selectedDoc.originalName}…`
                    : 'Select a document first…'
                }
                disabled={!selectedDoc || isSending}
                minHeight={44}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || !selectedDoc || isSending}
              className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
            Enter to send · Shift+Enter for new line · Answers grounded in your document
          </p>
        </div>
      </div>
    </div>
  )
}
