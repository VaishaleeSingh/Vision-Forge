'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Trash2,
  Copy,
  Heart,
  Clock,
  Loader2,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { timeAgo, truncate } from '@/lib/utils'
import {
  LibraryDetailModal,
  type LibraryDetailItem,
} from '@/components/library/LibraryDetailModal'

type GenerationType = 'text' | 'image' | 'resume' | 'favorites'

interface LibraryItem {
  _id: string
  type: 'text' | 'image'
  prompt: string
  result: string
  imageUrl?: string
  model: string
  format?: string
  isFavorite: boolean
  createdAt: string
  metadata?: LibraryDetailItem['metadata']
}

function normalizeGeneration(raw: Record<string, unknown>): LibraryItem {
  const type = raw.type as 'text' | 'image'
  const result = String(raw.result ?? '')
  const metadata = (raw.metadata ?? {}) as LibraryItem['metadata']

  return {
    _id: String(raw._id),
    type,
    prompt: String(raw.prompt ?? ''),
    result,
    imageUrl: type === 'image' ? result : undefined,
    model: String(raw.model ?? ''),
    format: metadata?.format,
    isFavorite: Boolean(raw.isFavorite),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    metadata,
  }
}

function displayType(item: LibraryItem): string {
  if (item.metadata?.format === 'resume-screener') return 'resume'
  return item.type
}

function LibraryPageContent() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | GenerationType>('all')
  const [selectedItem, setSelectedItem] = useState<LibraryDetailItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/library')
      const data = await res.json()
      if (res.ok) {
        const list = (data.generations || []).map((g: Record<string, unknown>) =>
          normalizeGeneration(g),
        )
        setItems(list)
        return list as LibraryItem[]
      }
    } catch (e) {
      console.error(e)
      toast.error('Could not load library')
    } finally {
      setIsLoading(false)
    }
    return []
  }, [])

  const openDetail = useCallback(
    async (item: LibraryItem) => {
      setSelectedItem({
        _id: item._id,
        type: item.type,
        prompt: item.prompt,
        result: item.result,
        model: item.model,
        isFavorite: item.isFavorite,
        createdAt: item.createdAt,
        metadata: item.metadata,
      })

      setDetailLoading(true)
      try {
        const res = await fetch(`/api/library/${item._id}`)
        const data = await res.json()
        if (res.ok && data.generation) {
          const full = normalizeGeneration(data.generation)
          setSelectedItem({
            _id: full._id,
            type: full.type,
            prompt: full.prompt,
            result: full.result,
            model: full.model,
            isFavorite: full.isFavorite,
            createdAt: full.createdAt,
            metadata: full.metadata,
          })
        }
      } catch {
        // Keep list preview data
      } finally {
        setDetailLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchLibrary().then((list) => {
      const openId = searchParams.get('id')
      if (openId && list.length > 0) {
        const match = list.find((i: LibraryItem) => i._id === openId)
        if (match) openDetail(match)
      }
    })
  }, [fetchLibrary, searchParams, openDetail])

  const toggleFavorite = async (id: string) => {
    const prev = items.find((i) => i._id === id)?.isFavorite
    setItems((prevItems) =>
      prevItems.map((item) =>
        item._id === id ? { ...item, isFavorite: !item.isFavorite } : item,
      ),
    )
    if (selectedItem?._id === id) {
      setSelectedItem((s) => (s ? { ...s, isFavorite: !s.isFavorite } : s))
    }
    try {
      const res = await fetch(`/api/library/${id}/favorite`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setItems((prevItems) =>
        prevItems.map((item) =>
          item._id === id ? { ...item, isFavorite: data.isFavorite } : item,
        ),
      )
      if (selectedItem?._id === id) {
        setSelectedItem((s) => (s ? { ...s, isFavorite: data.isFavorite } : s))
      }
    } catch {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item._id === id ? { ...item, isFavorite: !!prev } : item,
        ),
      )
      toast.error('Could not update favorite')
    }
  }

  const deleteItem = async (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item._id !== id))
    if (selectedItem?._id === id) setSelectedItem(null)
    try {
      const res = await fetch(`/api/library/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Removed from library')
    } catch {
      await fetchLibrary()
      toast.error('Could not delete item')
    }
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'favorites' && !item.isFavorite) return false
    if (filter === 'text' && item.type !== 'text') return false
    if (filter === 'image' && item.type !== 'image') return false
    if (filter === 'resume' && item.metadata?.format !== 'resume-screener') return false
    if (search && !item.prompt.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filterOptions = ['all', 'text', 'image', 'resume', 'favorites'] as const

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-3xl text-[#1a2332] flex items-center gap-3 mb-2">
          <span className="inline-flex w-10 h-10 rounded-xl items-center justify-center bg-gradient-to-br from-aqua-400 to-aqua-600">
            <BookOpen size={20} className="text-white" />
          </span>
          Your Library
        </h1>
        <p className="text-sm text-[#718096] ml-[52px]">
          All your generated content, images, and agent runs in one place. Click any item to view.
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-aqua-500 text-white shadow-sm'
                  : 'bg-white text-[#4a5568] hover:bg-beige-50 border border-beige-200'
              }`}
            >
              {f === 'resume' ? 'Resume' : f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718096] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="input-base w-full py-2 text-sm"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-aqua-400" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-beige-200 flex items-center justify-center mb-4">
            <BookOpen size={32} className="text-[#a07f52]" />
          </div>
          <h3 className="font-semibold text-[#1a2332] mb-1">Nothing found</h3>
          <p className="text-sm text-[#718096]">
            {search || filter !== 'all'
              ? 'No items match your filters.'
              : 'You haven’t generated anything yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.article
                key={item._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(item)
                  }
                }}
                className="glass-card flex flex-col overflow-hidden hover-lift group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400"
              >
                <div className="p-4 flex items-start justify-between border-b border-beige-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'text'
                          ? 'bg-aqua-100 text-aqua-600'
                          : 'bg-teal-100 text-teal-600'
                      }`}
                    >
                      {item.type === 'text' ? (
                        <Sparkles size={14} />
                      ) : (
                        <ImageIcon size={14} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="badge badge-beige text-[10px] uppercase tracking-wider">
                        {displayType(item)}
                      </span>
                      <p className="text-[10px] text-[#718096] flex items-center gap-1 mt-1">
                        <Clock size={10} /> {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(item._id)
                    }}
                    className="p-1.5 rounded-md hover:bg-beige-50 text-[#718096] transition-colors shrink-0"
                    aria-label={item.isFavorite ? 'Unfavorite' : 'Favorite'}
                  >
                    <Heart
                      size={16}
                      className={item.isFavorite ? 'fill-red-500 text-red-500' : ''}
                    />
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-[#1a2332] line-clamp-2">
                    {item.prompt}
                  </p>

                  {item.type === 'image' && item.imageUrl ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-beige-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : item.result ? (
                    <p className="text-xs text-[#4a5568] line-clamp-3 bg-beige-50 p-3 rounded-lg border border-beige-100">
                      {truncate(item.result, 150)}
                    </p>
                  ) : null}
                </div>

                <div className="p-3 bg-[#faf7f2]/50 border-t border-beige-100 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-aqua-700 truncate">
                    {item.model}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#718096] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={12} /> View
                    </span>
                    <div
                      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {item.result && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.result)
                            toast.success('Copied')
                          }}
                          className="p-1.5 rounded-md bg-white hover:bg-aqua-50 text-[#4a5568] hover:text-aqua-600 shadow-sm"
                          title="Copy"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this item?')) deleteItem(item._id)
                        }}
                        className="p-1.5 rounded-md bg-white hover:bg-red-50 text-[#4a5568] hover:text-red-500 shadow-sm"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <LibraryDetailModal
        item={selectedItem}
        isLoading={detailLoading && !selectedItem?.result}
        onClose={() => setSelectedItem(null)}
        onToggleFavorite={toggleFavorite}
        onDelete={deleteItem}
      />
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-aqua-400" />
        </div>
      }
    >
      <LibraryPageContent />
    </Suspense>
  )
}
