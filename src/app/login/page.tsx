'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, Loader2, Mail, Lock, User, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'signup'

function AuthField({
  id,
  label,
  type,
  icon: Icon,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}: {
  id: string
  label: string
  type: string
  icon: LucideIcon
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoComplete?: string
  minLength?: number
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label htmlFor={id} className="text-xs font-semibold text-[#4a5568] uppercase tracking-wide">
        {label}
      </label>
      <div className="relative flex items-center min-w-0">
        <Icon
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#718096] pointer-events-none z-[1] shrink-0"
          aria-hidden
        />
        <input
          id={id}
          type={type}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-base w-full min-w-0 pl-10 pr-4 py-2.5 sm:py-3 text-base sm:text-sm leading-normal"
        />
      </div>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('tab') === 'signup' ? 'signup' : 'login'

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const authError = searchParams.get('error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email or password')
        return
      }

      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Could not create account')
        return
      }

      const signInResult = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        toast.success('Account created! Please sign in.')
        setMode('login')
        return
      }

      toast.success('Account created — welcome to VisionForge!')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-[#faf7f2]"
      style={{ background: '#faf7f2' }}
    >
      {/* Background — behind content, scaled for mobile */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute top-[8%] left-1/2 h-[min(420px,55vh)] w-[min(520px,95vw)] -translate-x-1/2 rounded-full opacity-15 sm:opacity-20 sm:top-[18%]"
          style={{
            background: 'radial-gradient(circle, #0bbfbf, transparent)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col items-stretch px-4 py-8 sm:px-6 sm:py-12 md:min-h-[100dvh] md:justify-center md:py-10">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 shrink-0 text-center sm:mb-8"
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl sm:mb-4 sm:h-14 sm:w-14"
            style={{
              background: 'linear-gradient(135deg, #0bbfbf, #0899a0)',
              boxShadow: '0 8px 32px rgba(11,191,191,0.3)',
            }}
          >
            <Zap size={24} className="text-white sm:hidden" />
            <Zap size={26} className="hidden text-white sm:block" />
          </div>
          <h1 className="font-serif text-2xl leading-tight text-[#1a2332] sm:text-3xl">
            Welcome to VisionForge
          </h1>
          <p className="mt-1.5 text-sm text-[#718096]">
            {mode === 'login' ? 'Sign in to your account' : 'Create a free account'}
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="w-full min-w-0 shrink-0"
        >
          <div className="glass-card w-full overflow-hidden p-5 sm:p-8">
            <div className="mb-5 flex gap-1 rounded-xl bg-beige-100 p-1 sm:mb-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  'min-h-[40px] flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
                  mode === 'login'
                    ? 'bg-white text-aqua-700 shadow-sm'
                    : 'text-[#718096] hover:text-[#1a2332]',
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={cn(
                  'min-h-[40px] flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
                  mode === 'signup'
                    ? 'bg-white text-aqua-700 shadow-sm'
                    : 'text-[#718096] hover:text-[#1a2332]',
                )}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs text-red-600">
                Sign in failed. Check your email and password.
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin}
                  className="space-y-3 sm:space-y-4"
                >
                  <AuthField
                    id="login-email"
                    label="Email"
                    type="email"
                    icon={Mail}
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <AuthField
                    id="login-password"
                    label="Password"
                    type="password"
                    icon={Lock}
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary mt-1 w-full justify-center py-3 disabled:opacity-60 sm:mt-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignup}
                  className="space-y-3 sm:space-y-4"
                >
                  <AuthField
                    id="signup-name"
                    label="Full name"
                    type="text"
                    icon={User}
                    value={name}
                    onChange={setName}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                  <AuthField
                    id="signup-email"
                    label="Email"
                    type="email"
                    icon={Mail}
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <AuthField
                    id="signup-password"
                    label="Password"
                    type="password"
                    icon={Lock}
                    value={password}
                    onChange={setPassword}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <AuthField
                    id="signup-confirm"
                    label="Confirm password"
                    type="password"
                    icon={Lock}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary mt-1 w-full justify-center py-3 disabled:opacity-60 sm:mt-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Create Account
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="divider my-4 sm:my-5" />

            <p className="text-center text-[11px] leading-relaxed text-[#718096] sm:text-xs">
              By continuing, you agree to our{' '}
              <span className="cursor-pointer text-aqua-600 hover:underline">Terms</span> and{' '}
              <span className="cursor-pointer text-aqua-600 hover:underline">Privacy Policy</span>.
            </p>
          </div>

          <p className="mt-5 pb-4 text-center text-sm text-[#718096] sm:mt-6 sm:pb-0">
            <Link href="/" className="text-aqua-600 hover:underline">
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[100dvh] items-center justify-center px-4"
          style={{ background: '#faf7f2' }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-aqua-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
