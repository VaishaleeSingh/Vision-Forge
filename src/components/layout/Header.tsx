'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Bell, Search, User, LogOut, ChevronDown, Menu } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useDashboard } from './DashboardContext'
import { timeAgo, truncate } from '@/lib/utils'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':    { title: 'Dashboard',     subtitle: 'Your AI creative hub' },
  '/studio/text':  { title: 'Text Studio',   subtitle: 'Generate & refine content with AI' },
  '/studio/image': { title: 'Image Studio',  subtitle: 'Create stunning visuals from text' },
  '/knowledge':    { title: 'Knowledge Base',subtitle: 'Chat with your uploaded documents' },
  '/agents':       { title: 'AI Agents',     subtitle: 'Automate complex creative workflows' },
  '/library':      { title: 'Library',       subtitle: 'Browse all your generations' },
  '/analytics':    { title: 'Analytics',     subtitle: 'Track your AI usage & insights' },
  '/settings':     { title: 'Settings',      subtitle: 'Manage your account & preferences' },
}

export default function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const { setIsMobileOpen, setIsSearchOpen } = useDashboard()

  // Close menus on click outside
  useEffect(() => {
    const handleClick = () => { setMenuOpen(false); setNotifsOpen(false) }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleOpenNotifs = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    setNotifsOpen(!notifsOpen)
    if (!notifsOpen) {
      setLoadingNotifs(true)
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        if (data.notifications) setNotifications(data.notifications)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingNotifs(false)
      }
    }
  }

  const pageInfo = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? { title: 'VisionForge', subtitle: '' }

  return (
    <header className="h-16 border-b border-[#e8ddd0] bg-white/90 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 -ml-2 text-[#4a5568] hover:bg-beige-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        {/* Page title */}
        <div>
          <motion.h1
            key={pathname}
            initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-xl text-[#1a2332]"
        >
          {pageInfo.title}
        </motion.h1>
        {pageInfo.subtitle && (
          <p className="text-xs text-[#718096] font-sans">{pageInfo.subtitle}</p>
        )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsSearchOpen(true) }}
          className="btn-ghost p-2 rounded-xl flex items-center gap-2 hover:bg-beige-100 transition-colors"
          title="Search (Cmd+K)"
        >
          <Search size={18} className="text-[#4a5568]" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={handleOpenNotifs}
            className="btn-ghost p-2 rounded-xl relative hover:bg-beige-100 transition-colors"
          >
            <Bell size={18} className="text-[#4a5568]" />
            {notifications.length > 0 && !notifsOpen && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-aqua-500 ring-2 ring-white" />
            )}
          </button>
          
          {notifsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-72 glass-card overflow-hidden z-50 shadow-xl border border-[#e8ddd0]"
            >
              <div className="p-3 bg-beige-50 border-b border-beige-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-[#1a2332]">Recent Activity</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="p-4 text-center text-xs text-[#718096]">Loading activities...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#718096]">No recent activity.</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-3 border-b border-beige-100 hover:bg-beige-50 transition-colors">
                      <p className="text-xs text-[#4a5568]">
                        <strong className="text-[#1a2332] block mb-0.5">{notif.title}</strong>
                        {truncate(notif.message, 60)}
                      </p>
                      <span className="text-[10px] text-[#718096] mt-1 block">{timeAgo(notif.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 text-center border-t border-beige-100 bg-[#faf7f2]">
                <Link href="/library" onClick={() => setNotifsOpen(false)} className="text-xs text-aqua-600 font-medium hover:underline">
                  View library
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setNotifsOpen(false) }}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-beige-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-aqua-100 flex items-center justify-center">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              ) : (
                <User size={16} className="text-aqua-600" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-[#1a2332] leading-none">
                {session?.user?.name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[10px] text-[#718096] leading-none mt-0.5">Free tier</p>
            </div>
            <ChevronDown size={14} className="text-[#718096]" />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute right-0 mt-2 w-48 glass-card py-2 z-50"
            >
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#4a5568] hover:bg-beige-100 hover:text-[#1a2332] transition-colors"
              >
                <User size={15} /> Profile & Settings
              </Link>
              <div className="divider mx-4 my-1.5" />
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full transition-colors"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  )
}
