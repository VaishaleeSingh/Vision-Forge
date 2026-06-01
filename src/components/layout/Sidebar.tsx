'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Image, BookOpen, Bot, BarChart3, Library,
  Settings, ChevronLeft, ChevronRight, Zap, Home, Briefcase, X
} from 'lucide-react'
import { useDashboard } from './DashboardContext'

const navItems = [
  { href: '/dashboard',       icon: Home,      label: 'Dashboard',    badge: null },
  { href: '/studio/text',     icon: Sparkles,  label: 'Text Studio',  badge: 'AI' },
  { href: '/studio/image',    icon: Image,     label: 'Image Studio', badge: 'AI' },
  { href: '/knowledge',       icon: BookOpen,  label: 'Knowledge',    badge: 'RAG' },
  { href: '/resume-screener', icon: Briefcase, label: 'Resume Screen',badge: 'NEW' },
  { href: '/agents',          icon: Bot,       label: 'AI Agents',    badge: 'NEW' },
  { href: '/library',         icon: Library,   label: 'Library',      badge: null },
  { href: '/analytics',       icon: BarChart3, label: 'Analytics',    badge: null },
]

const bottomItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { isMobileOpen, setIsMobileOpen } = useDashboard()

  const SidebarContent = () => (
    <>
      {/* Logo Area */}
      <div className={`flex items-center border-b border-[#e8ddd0] transition-all duration-300 ${collapsed ? 'flex-col py-4 gap-4' : 'justify-between px-4 py-5'}`}>
        <div className="flex items-center gap-3">
          <motion.div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Zap size={18} className="text-white" />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="font-serif text-lg font-semibold whitespace-nowrap"
                style={{ color: '#1a2332' }}
              >
                VisionForge
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center">
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-2 text-[#718096] hover:bg-beige-100 rounded-lg"
          >
            <X size={20} />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 text-[#718096] hover:bg-beige-100 rounded-lg transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={item.href} onClick={() => setIsMobileOpen(false)}>
                <div
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!collapsed && item.badge && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="badge badge-aqua text-[10px] px-1.5 py-0.5"
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Bottom Items */}
      <div className="px-2 py-3 border-t border-[#e8ddd0] space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
              <div className={`sidebar-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}>
                <Icon size={18} className="shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )
        })}
      </div>

    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex relative flex-col h-screen border-r border-[#e8ddd0] bg-white shrink-0 overflow-hidden"
        style={{ zIndex: 10 }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-[#1a2332]/20 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-[#e8ddd0] shadow-xl z-50 flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
