'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Sparkles, Image as ImageIcon, BookOpen, Bot, TrendingUp,
  FileText, Zap, ArrowRight, Clock, Loader2
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'

const quickActions = [
  {
    href: '/studio/text',
    icon: Sparkles,
    label: 'Generate Text',
    desc: 'Blog posts, emails, ad copy',
    badge: 'AI',
    color: 'from-aqua-400 to-aqua-600',
  },
  {
    href: '/studio/image',
    icon: ImageIcon,
    label: 'Create Image',
    desc: 'Text-to-image with Flux',
    badge: 'AI',
    color: 'from-teal-400 to-aqua-500',
  },
  {
    href: '/knowledge',
    icon: BookOpen,
    label: 'Upload & Chat',
    desc: 'Chat with your documents',
    badge: 'RAG',
    color: 'from-aqua-500 to-cyan-500',
  },
  {
    href: '/agents',
    icon: Bot,
    label: 'Run AI Agent',
    desc: 'Researcher + Writer + Critic',
    badge: 'NEW',
    color: 'from-aqua-600 to-teal-700',
  },
]

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(res => res.json()),
      fetch('/api/library?limit=5').then(res => res.json())
    ])
    .then(([analyticsRes, libraryRes]) => {
      setStatsData(analyticsRes.stats || { totalGenerations: 0, imagesCreated: 0, totalTokens: 0, docsUploaded: 0 })
      setRecentActivity(libraryRes.generations ? libraryRes.generations.slice(0, 5) : [])
      setLoading(false)
    })
    .catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  const stats = [
    { label: 'Total Generations', value: statsData?.totalGenerations || 0, icon: Sparkles, color: 'from-aqua-400 to-aqua-600', href: '/library' },
    { label: 'Images Created',    value: statsData?.imagesCreated || 0,    icon: ImageIcon, color: 'from-teal-400 to-aqua-500', href: '/studio/image' },
    { label: 'Tokens Used',       value: statsData?.totalTokens || 0,      icon: Zap,       color: 'from-aqua-500 to-cyan-600', href: '/analytics' },
    { label: 'Documents',         value: statsData?.docsUploaded || 0,     icon: FileText,  color: 'from-aqua-600 to-teal-700', href: '/knowledge' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-aqua-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-aqua p-6 flex items-center justify-between"
      >
        <div>
          <h2 className="font-serif text-2xl text-[#1a2332] mb-1">
            Welcome back! ✨
          </h2>
          <p className="text-sm text-[#4a5568]">
            What will you create today? All your AI tools are ready.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse-ring"
            style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}
          >
            <Zap size={22} className="text-white" />
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link href={stat.href}>
                <div className="stat-card hover-lift cursor-pointer group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="font-serif text-3xl font-semibold gradient-text">{stat.value.toLocaleString()}</div>
                  <div className="text-xs text-[#718096]">{stat.label}</div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-[#1a2332]">Quick Actions</h2>
          <Link href="/library" className="text-xs text-aqua-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                whileHover={{ y: -4 }}
              >
                <Link href={action.href}>
                  <div className="glass-card p-5 cursor-pointer group h-full">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="badge badge-aqua text-[10px] mb-2 inline-flex">{action.badge}</span>
                    <h3 className="font-semibold text-sm text-[#1a2332] mb-1">{action.label}</h3>
                    <p className="text-xs text-[#718096]">{action.desc}</p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Recent activity + Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent generations */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-[#1a2332]">Recent Generations</h2>
            <Link href="/library" className="text-xs text-aqua-600 hover:underline flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          </div>
          
          {recentActivity.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted">No activity yet. Start generating!</p>
            </div>
          ) : (
            <div className="glass-card divide-y divide-[#e8ddd0]">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="p-4 flex items-start gap-3 hover:bg-beige-50 transition-colors cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'text'  ? 'bg-aqua-100 text-aqua-600' :
                    item.type === 'image' ? 'bg-teal-100 text-teal-600' :
                    'bg-cyan-100 text-cyan-600'
                  }`}>
                    {item.type === 'text'  && <Sparkles size={14} />}
                    {item.type === 'image' && <ImageIcon size={14} />}
                    {item.type === 'rag'   && <BookOpen size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a2332] truncate font-medium">{item.prompt}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge badge-beige text-[10px] truncate max-w-[150px]">{item.model}</span>
                      <span className="text-[10px] text-[#718096] flex items-center gap-1">
                        <Clock size={10} /> {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Getting started + tip */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl text-[#1a2332]">Getting Started</h2>
          <div className="glass-card p-5 space-y-4">
            {[
              { icon: Sparkles,    title: 'Try Text Studio',    desc: 'Generate your first content' },
              { icon: ImageIcon,       title: 'Create an Image',    desc: 'Turn text into visuals' },
              { icon: BookOpen,    title: 'Upload a Document',  desc: 'Chat with your knowledge base' },
              { icon: TrendingUp,  title: 'View Analytics',     desc: 'Track your usage & insights' },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-beige-200">
                    <Icon size={13} className="text-[#718096]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1a2332]">{step.title}</p>
                    <p className="text-[10px] text-[#718096]">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* API key reminder */}
          <div className="glass-card-aqua p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-aqua-600" />
              <span className="text-xs font-semibold text-aqua-700">Setup Reminder</span>
            </div>
            <p className="text-xs text-[#4a5568]">
              Manage your API keys in{' '}
              <Link href="/settings" className="text-aqua-600 underline">
                Settings
              </Link>{' '}
              to enable all AI features.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
