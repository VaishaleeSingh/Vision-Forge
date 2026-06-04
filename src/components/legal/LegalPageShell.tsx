import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'

interface LegalPageShellProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#faf7f2]">
      <header className="sticky top-0 z-10 border-b border-[#e8ddd0] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #0bbfbf, #0899a0)',
              }}
            >
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-serif text-lg font-semibold text-[#1a2332]">VisionForge</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-aqua-600 hover:underline"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1a2332] mb-2">{title}</h1>
        <p className="text-sm text-[#718096] mb-8">Last updated: {lastUpdated}</p>

        <article className="glass-card p-5 sm:p-8 space-y-8 text-sm sm:text-[15px] text-[#2d3748] leading-relaxed">
          {children}
        </article>

        <p className="mt-8 text-center text-xs text-[#718096]">
          <Link href="/terms" className="text-aqua-600 hover:underline">
            Terms of Service
          </Link>
          {' · '}
          <Link href="/privacy" className="text-aqua-600 hover:underline">
            Privacy Policy
          </Link>
          {' · '}
          <Link href="/" className="text-aqua-600 hover:underline">
            Home
          </Link>
        </p>
      </main>
    </div>
  )
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-semibold text-[#1a2332] text-base sm:text-lg mb-3">{title}</h2>
      <div className="space-y-3 text-[#4a5568]">{children}</div>
    </section>
  )
}
