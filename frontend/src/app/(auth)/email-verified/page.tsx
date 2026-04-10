'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { CheckCircle, MessageCircle, LogIn, XCircle } from 'lucide-react'

const REDIRECT_DELAY = 5

function EmailVerifiedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isVerified = searchParams.get('verified') === 'true'
  const [countdown, setCountdown] = useState(REDIRECT_DELAY)

  useEffect(() => {
    // If no verified param, redirect immediately to login (direct URL access)
    if (!isVerified) { router.replace('/login'); return }
    const interval = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isVerified, router])

  useEffect(() => {
    if (isVerified && countdown === 0) router.push('/login')
  }, [countdown, isVerified, router])

  if (!isVerified) return null

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative"
      style={{ background: 'var(--bg-base)' }}
    >
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full filter blur-3xl opacity-20 animate-pulse"
          style={{ background: 'var(--accent)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full filter blur-3xl opacity-15 animate-pulse"
          style={{ background: 'var(--online)', animationDelay: '1s' }}
        />
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)' }}
          >
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <span
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            BabiChat
          </span>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--online) 15%, transparent)' }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: 'var(--online)' }} />
          </div>
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Email confirmé !
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Votre adresse email a bien été vérifiée. Vous pouvez maintenant vous connecter.
        </p>

        {/* Countdown progress */}
        <div
          className="rounded-lg p-3 mb-6 text-sm"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
          }}
        >
          Redirection automatique dans{' '}
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>
            {countdown}s
          </span>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: 'var(--accent)',
            color: 'white',
          }}
        >
          <LogIn className="w-4 h-4" />
          Se connecter maintenant
        </Link>
      </div>
    </div>
  )
}

export default function EmailVerifiedPage() {
  return (
    <Suspense>
      <EmailVerifiedContent />
    </Suspense>
  )
}
