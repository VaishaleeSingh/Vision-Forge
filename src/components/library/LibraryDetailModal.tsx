'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Copy,
  Heart,
  Trash2,
  Clock,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { RichTextOutput } from '@/components/rich-text'
import { timeAgo } from '@/lib/utils'

export interface LibraryDetailItem {
  _id: string
  type: 'text' | 'image'
  prompt: string
  result: string
  model: string
  isFavorite: boolean
  createdAt: string
  metadata?: {
    tone?: string
    format?: string
    style?: string
  }
}

function typeLabel(item: LibraryDetailItem) {
  if (item.metadata?.format === 'resume-screener') return 'Resume screen'
  return item.type === 'image' ? 'Image' : 'Text'
}

interface LibraryDetailModalProps {
  item: LibraryDetailItem | null
  isLoading?: boolean
  onClose: () => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
}

export function LibraryDetailModal({
  item,
  isLoading,
  onClose,
  onToggleFavorite,
  onDelete,
}: LibraryDetailModalProps) {
  useEffect(() => {
    if (!item && !isLoading) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [item, isLoading, onClose])

  if (!item && !isLoading) return null

  const copyContent = () => {
    if (!item?.result) return
    navigator.clipboard.writeText(item.result)
    toast.success('Copied to clipboard')
  }

  const handleDelete = () => {
    if (!item) return
    if (!window.confirm('Delete this item from your library?')) return
    onDelete(item._id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-detail-title"
    >
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-[#1a2332]/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex w-full max-w-3xl max-h-[92dvh] sm:max-h-[88vh] flex-col overflow-hidden glass-card shadow-xl sm:rounded-2xl rounded-t-2xl"
      >
        {isLoading || !item ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-aqua-500" />
            <p className="text-sm text-[#718096]">Loading…</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-beige-100 p-4 sm:p-5 shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'image'
                      ? 'bg-teal-100 text-teal-600'
                      : 'bg-aqua-100 text-aqua-600'
                  }`}
                >
                  {item.type === 'image' ? (
                    <ImageIcon size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <h2
                    id="library-detail-title"
                    className="font-serif text-xl text-[#1a2332] leading-tight"
                  >
                    {typeLabel(item)}
                  </h2>
                  <p className="text-xs text-[#718096] flex items-center gap-1.5 mt-1">
                    <Clock size={12} />
                    {timeAgo(item.createdAt)}
                    <span className="text-[#cbd5e0]">·</span>
                    <span className="text-aqua-700 font-medium">{item.model}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(item._id)}
                  className="p-2 rounded-lg hover:bg-beige-50 text-[#718096] transition-colors"
                  title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    size={18}
                    className={item.isFavorite ? 'fill-red-500 text-red-500' : ''}
                  />
                </button>
                <button
                  type="button"
                  onClick={copyContent}
                  className="p-2 rounded-lg hover:bg-beige-50 text-[#718096] hover:text-aqua-600 transition-colors"
                  title="Copy content"
                >
                  <Copy size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-lg hover:bg-red-50 text-[#718096] hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-beige-50 text-[#718096] transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide mb-2">
                  Prompt
                </h3>
                <p className="text-sm text-[#1a2332] leading-relaxed bg-beige-50 border border-beige-100 rounded-xl p-4 whitespace-pre-wrap">
                  {item.prompt}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide mb-2 flex items-center gap-2">
                  {item.type === 'image' ? (
                    <>
                      <ImageIcon size={14} />
                      Generated image
                    </>
                  ) : (
                    <>
                      <BookOpen size={14} />
                      Generated content
                    </>
                  )}
                </h3>

                {item.type === 'image' ? (
                  <div className="rounded-xl overflow-hidden border border-beige-200 bg-beige-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.result}
                      alt={item.prompt}
                      className="w-full max-h-[min(60vh,520px)] object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-beige-100 bg-white p-3 sm:p-5 min-w-0 w-full max-w-full overflow-x-auto overflow-y-visible">
                    <RichTextOutput content={item.result} format="markdown" />
                  </div>
                )}
              </div>

              {(item.metadata?.tone || item.metadata?.format || item.metadata?.style) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.metadata.tone && (
                    <span className="badge badge-beige text-xs">Tone: {item.metadata.tone}</span>
                  )}
                  {item.metadata.format && item.metadata.format !== 'resume-screener' && (
                    <span className="badge badge-beige text-xs">Format: {item.metadata.format}</span>
                  )}
                  {item.metadata.style && (
                    <span className="badge badge-aqua text-xs">Style: {item.metadata.style}</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
