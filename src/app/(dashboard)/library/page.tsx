'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Sparkles, Image as ImageIcon, BookOpen, 
  Trash2, Copy, Heart, Clock, Loader2, ArrowRight
} from 'lucide-react'
import { timeAgo, truncate } from '@/lib/utils'

type GenerationType = 'text' | 'image' | 'rag' | 'agent'

interface LibraryItem {
  _id: string
  type: GenerationType
  prompt: string
  result?: string
  imageUrl?: string
  model: string
  format?: string
  isFavorite: boolean
  createdAt: string
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | GenerationType | 'favorites'>('all')

  useEffect(() => {
    fetchLibrary()
  }, [])

  const fetchLibrary = async () => {
    try {
      const res = await fetch('/api/library')
      const data = await res.json()
      if (res.ok) setItems(data.generations || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFavorite = async (id: string) => {
    setItems(items.map(item => 
      item._id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ))
    try {
      await fetch(`/api/library/${id}/favorite`, { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
  }

  const deleteItem = async (id: string) => {
    setItems(items.filter(item => item._id !== id))
    try {
      await fetch(`/api/library/${id}`, { method: 'DELETE' })
    } catch (e) {
      console.error(e)
    }
  }

  const filteredItems = items.filter(item => {
    if (filter === 'favorites' && !item.isFavorite) return false
    if (filter !== 'all' && filter !== 'favorites' && item.type !== filter) return false
    if (search && !item.prompt.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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
          All your generated content, images, and agent runs in one place.
        </p>
      </motion.div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', 'text', 'image', 'rag', 'favorites'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === f 
                  ? 'bg-aqua-500 text-white shadow-sm' 
                  : 'bg-white text-[#4a5568] hover:bg-beige-50 border border-beige-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="input-base pl-9 py-2 text-sm"
          />
        </div>
      </div>

      {/* Grid */}
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
            {filteredItems.map(item => (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card flex flex-col overflow-hidden hover-lift group"
              >
                {/* Header */}
                <div className="p-4 flex items-start justify-between border-b border-beige-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.type === 'text' ? 'bg-aqua-100 text-aqua-600' :
                      item.type === 'image' ? 'bg-teal-100 text-teal-600' :
                      'bg-cyan-100 text-cyan-600'
                    }`}>
                      {item.type === 'text' && <Sparkles size={14} />}
                      {item.type === 'image' && <ImageIcon size={14} />}
                      {item.type === 'rag' && <BookOpen size={14} />}
                    </div>
                    <div>
                      <span className="badge badge-beige text-[10px] uppercase tracking-wider">
                        {item.type}
                      </span>
                      <p className="text-[10px] text-[#718096] flex items-center gap-1 mt-1">
                        <Clock size={10} /> {timeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleFavorite(item._id)}
                    className="p-1.5 rounded-md hover:bg-beige-50 text-[#718096] transition-colors"
                  >
                    <Heart size={16} className={item.isFavorite ? 'fill-red-500 text-red-500' : ''} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-[#1a2332] line-clamp-2">
                    {item.prompt}
                  </p>
                  
                  {item.type === 'image' && item.imageUrl ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-beige-100 mt-2">
                      <img src={item.imageUrl} alt={item.prompt} className="object-cover w-full h-full" />
                    </div>
                  ) : item.result ? (
                    <p className="text-xs text-[#4a5568] line-clamp-3 bg-beige-50 p-3 rounded-lg border border-beige-100 mt-auto">
                      {truncate(item.result, 150)}
                    </p>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="p-3 bg-[#faf7f2]/50 border-t border-beige-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-medium text-aqua-700">{item.model}</span>
                  <div className="flex gap-2">
                    {item.type === 'text' && item.result && (
                      <button 
                        onClick={() => navigator.clipboard.writeText(item.result || '')}
                        className="p-1.5 rounded-md bg-white hover:bg-aqua-50 text-[#4a5568] hover:text-aqua-600 shadow-sm transition-colors"
                        title="Copy"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteItem(item._id)}
                      className="p-1.5 rounded-md bg-white hover:bg-red-50 text-[#4a5568] hover:text-red-500 shadow-sm transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
