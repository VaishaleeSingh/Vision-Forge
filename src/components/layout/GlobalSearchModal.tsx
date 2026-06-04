'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, X, Sparkles, Image as ImageIcon, Bot, Briefcase, Clock, ArrowRight } from 'lucide-react'
import { useDashboard } from './DashboardContext'

const QUICK_LINKS = [
  { icon: Sparkles, label: 'Text Studio', href: '/studio/text', desc: 'Generate & refine content' },
  { icon: ImageIcon, label: 'Image Studio', href: '/studio/image', desc: 'Create stunning visuals' },
  { icon: Bot, label: 'AI Agents', href: '/agents', desc: 'Automated workflows' },
  { icon: Briefcase, label: 'Resume Screener', href: '/resume-screener', desc: 'Evaluate candidates' },
]

export default function GlobalSearchModal() {
  const { isSearchOpen, setIsSearchOpen } = useDashboard()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchOpen, setIsSearchOpen])

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [isSearchOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/library?search=${encodeURIComponent(query)}&limit=5`)
        const data = await res.json()
        setResults(data.generations || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleNavigate = (href: string) => {
    setIsSearchOpen(false)
    router.push(href)
  }

  if (!isSearchOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSearchOpen(false)}
          className="fixed inset-0 bg-[#1a2332]/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-beige-200 overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 py-4 border-b border-beige-100">
            <Search className="w-5 h-5 text-aqua-500 mr-3 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library, tools, or type a command..."
              className="flex-1 bg-transparent border-none outline-none text-[#1a2332] text-lg placeholder:text-[#a0aec0]"
            />
            <button 
              onClick={() => setIsSearchOpen(false)}
              className="p-1 rounded-md text-[#718096] hover:bg-beige-100 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!query.trim() ? (
              <div className="p-2">
                <h3 className="text-xs font-semibold text-[#718096] uppercase tracking-wider mb-3 px-2">
                  Quick Links
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_LINKS.map((link) => {
                    const Icon = link.icon
                    return (
                      <button
                        key={link.href}
                        onClick={() => handleNavigate(link.href)}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-beige-50 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-aqua-50 flex items-center justify-center shrink-0 group-hover:bg-aqua-100 transition-colors">
                          <Icon className="w-5 h-5 text-aqua-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1a2332]">{link.label}</p>
                          <p className="text-xs text-[#718096] mt-0.5">{link.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2">
                <h3 className="text-xs font-semibold text-[#718096] uppercase tracking-wider mb-3 px-2 flex justify-between">
                  <span>Library Results</span>
                  {isLoading && <span className="text-aqua-500">Searching...</span>}
                </h3>
                
                {results.length === 0 && !isLoading ? (
                  <div className="text-center py-8 px-4">
                    <p className="text-sm text-[#718096]">No results found for "{query}"</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {results.map((item) => (
                      <button
                        key={item._id}
                        onClick={() => handleNavigate(`/library?id=${item._id}`)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-beige-50 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3 truncate pr-4">
                          <div className="w-8 h-8 rounded-lg bg-beige-100 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-[#718096]" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-medium text-[#1a2332] truncate">{item.prompt}</p>
                            <p className="text-[10px] text-aqua-600 uppercase tracking-wider mt-0.5">{item.type} Generation</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#a0aec0] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="px-4 py-3 bg-[#faf7f2] border-t border-beige-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-[#718096]">
              <span className="flex items-center gap-1"><kbd className="bg-white border border-beige-200 rounded px-1 font-sans">↑↓</kbd> to navigate</span>
              <span className="flex items-center gap-1"><kbd className="bg-white border border-beige-200 rounded px-1 font-sans">Enter</kbd> to select</span>
              <span className="flex items-center gap-1"><kbd className="bg-white border border-beige-200 rounded px-1 font-sans">Esc</kbd> to close</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
