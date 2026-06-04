'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Sparkles, Image, BookOpen, Bot, BarChart3,
  ArrowRight, Zap, Shield, Cpu, Star
} from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'Text Generation Studio',
    description: 'Generate blogs, emails, ad copy, and more with tone controls, streaming responses, and one-click improvements.',
    badge: 'Powered by Gemini',
    color: 'from-aqua-400 to-aqua-600',
  },
  {
    icon: Image,
    title: 'Image Generation',
    description: 'Create stunning visuals from text prompts with Flux Schnell. Upload images for AI analysis and style suggestions.',
    badge: 'Flux Schnell',
    color: 'from-teal-400 to-aqua-500',
  },
  {
    icon: BookOpen,
    title: 'RAG Knowledge Chat',
    description: 'Upload PDFs, docs, and text files. Chat with your private knowledge base with source citations and semantic search.',
    badge: 'Atlas Vector Search',
    color: 'from-aqua-500 to-cyan-600',
  },
  {
    icon: Bot,
    title: 'AI Agents',
    description: 'Deploy multi-agent workflows: Researcher → Writer → Critic. Watch AI think step-by-step and produce polished outputs.',
    badge: 'Agentic AI',
    color: 'from-aqua-600 to-teal-700',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Track every generation, measure token usage, monitor quality metrics, and export your entire library.',
    badge: 'Real-time',
    color: 'from-cyan-400 to-aqua-500',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your documents stay private. Secure email login, encrypted passwords, rate limiting, and input validation built-in.',
    badge: 'Enterprise-grade',
    color: 'from-aqua-400 to-teal-500',
  },
]

const stats = [
  { value: '2.5M+', label: 'Tokens generated' },
  { value: '50K+', label: 'Images created' },
  { value: '99.9%', label: 'Uptime' },
  { value: '<1s', label: 'Avg response' },
]

const steps = [
  { num: '01', title: 'Sign in free', desc: 'One-click OAuth with Google or GitHub. No credit card required.' },
  { num: '02', title: 'Choose your tool', desc: 'Text Studio, Image Studio, Knowledge Chat, or AI Agents — all in one.' },
  { num: '03', title: 'Generate & export', desc: 'Stream AI responses, save to library, export as Markdown or PDF.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#faf7f2' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-[#e8ddd0]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}>
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-serif text-xl font-semibold text-[#1a2332]">VisionForge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link href="/login?tab=signup" className="btn-primary text-sm">
            Sign Up Free <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0bbfbf, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute top-40 right-1/4 w-80 h-80 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #2dd4cc, transparent)', filter: 'blur(60px)' }} />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="badge badge-aqua text-xs mb-6 inline-flex">
              <Sparkles size={12} /> Powered by Gemini 2.0 Flash + Flux Schnell
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-tight mb-6 text-[#1a2332]"
          >
            Create anything with{' '}
            <span className="gradient-text">Multi-Modal AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-[#4a5568] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Generate text, create images, chat with your documents, and deploy AI agents —
            all in one stunning platform built on cutting-edge models.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/login" className="btn-primary text-base px-8 py-3.5">
              Start Creating Free <ArrowRight size={18} />
            </Link>
            <Link href="#features" className="btn-secondary text-base px-8 py-3.5">
              Explore Features
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <div className="font-serif text-2xl font-semibold gradient-text">{stat.value}</div>
                <div className="text-xs text-[#718096] mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="badge badge-aqua mb-3 inline-flex"><Cpu size={12} /> All-in-one AI Platform</span>
            <h2 className="font-serif text-4xl text-[#1a2332] mb-4">Everything you need to create</h2>
            <p className="text-[#4a5568] max-w-xl mx-auto">From blog posts to cinematic images, from document Q&A to autonomous research agents.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -4 }}
                  className="glass-card p-6 cursor-default group hover-lift"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="badge badge-aqua text-[10px] mb-3 inline-flex">{feature.badge}</span>
                  <h3 className="font-semibold text-[#1a2332] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#718096] leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6" style={{ background: '#faf7f2' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl text-[#1a2332] mb-4">Up and running in minutes</h2>
            <p className="text-[#4a5568]">No complex setup. Just sign in and start creating.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 font-serif text-xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}>
                  {step.num}
                </div>
                <h3 className="font-semibold text-[#1a2332] mb-2">{step.title}</h3>
                <p className="text-sm text-[#718096]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-16 px-6 border-t border-[#e8ddd0]" style={{ background: 'white' }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-[#718096] uppercase tracking-widest mb-6">Built with industry-leading technologies</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Next.js 15', 'TypeScript', 'MongoDB Atlas', 'Gemini 2.0 Flash', 'Flux Schnell', 'Framer Motion', 'NextAuth.js', 'Vercel AI SDK'].map((tech) => (
              <span key={tech} className="badge badge-beige text-xs px-3 py-1.5">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(135deg, #0bbfbf 0%, #0899a0 50%, #0c7a82 100%)' }}>
        <div className="max-w-2xl mx-auto text-center text-white">
          <Star size={32} className="mx-auto mb-4 opacity-80" />
          <h2 className="font-serif text-4xl mb-4">Start creating for free</h2>
          <p className="text-aqua-100 mb-8 text-lg">No credit card. No limits on creativity.</p>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white rounded-xl font-semibold text-[#0899a0] hover:bg-beige-50 transition-colors shadow-lg text-base"
          >
            Get started free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-sm text-[#718096] border-t border-[#e8ddd0]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0bbfbf, #0899a0)' }}>
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-semibold text-[#1a2332]">VisionForge</span>
        </div>
        <p>Built with ❤️ using Next.js 15, Gemini AI & MongoDB Atlas</p>
      </footer>
    </div>
  )
}
