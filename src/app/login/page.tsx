'use client'

import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#faf7f2' }}>
      {/* Background orb */}
      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #0bbfbf, transparent)', filter: 'blur(100px)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)', boxShadow: '0 8px 32px rgba(11,191,191,0.3)' }}>
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="font-serif text-3xl text-[#1a2332] mb-2">Welcome to VisionForge</h1>
          <p className="text-sm text-[#718096]">Sign in to start creating with AI</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <div className="space-y-3 mb-6">
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-[#e8ddd0] bg-white hover:bg-beige-50 hover:border-aqua-200 transition-all duration-200 font-medium text-sm text-[#1a2332] group"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="flex-1 text-left">Continue with Google</span>
              <ArrowRight size={15} className="text-[#718096] group-hover:text-aqua-600 transition-colors" />
            </button>

            <button
              onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-[#e8ddd0] bg-white hover:bg-beige-50 hover:border-aqua-200 transition-all duration-200 font-medium text-sm text-[#1a2332] group"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span className="flex-1 text-left">Continue with GitHub</span>
              <ArrowRight size={15} className="text-[#718096] group-hover:text-aqua-600 transition-colors" />
            </button>
          </div>

          <div className="divider mb-5" />

          <p className="text-xs text-center text-[#718096]">
            By signing in, you agree to our{' '}
            <span className="text-aqua-600 cursor-pointer hover:underline">Terms</span> and{' '}
            <span className="text-aqua-600 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>

        <p className="text-center mt-6 text-sm text-[#718096]">
          <Link href="/" className="text-aqua-600 hover:underline">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}
