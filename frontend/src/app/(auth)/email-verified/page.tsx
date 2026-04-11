'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { ArrowRight, MessageCircle } from 'lucide-react'

const REDIRECT_DELAY = 7

export default function EmailVerifiedPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(REDIRECT_DELAY)
  const [animDone, setAnimDone] = useState(false)
  const circleRef = useRef<SVGCircleElement>(null)
  const checkRef = useRef<SVGPolylineElement>(null)

  // Countdown → redirect
  useEffect(() => {
    if (countdown <= 0) { router.replace('/login'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, router])

  // Trigger SVG animation after mount
  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), 100)
    return () => clearTimeout(t)
  }, [])

  const progress = ((REDIRECT_DELAY - countdown) / REDIRECT_DELAY) * 100

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}
    >
      {/* Header bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
            BabiChat
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--accent)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ background: 'var(--accent)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-5"
          style={{ background: 'var(--accent)' }}
        />
      </div>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-4 relative">
        <div
          className="w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Subtle top gradient stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
            style={{ background: 'linear-gradient(90deg, var(--accent), #A78BFA)' }}
          />

          {/* Animated SVG checkmark */}
          <div className="flex justify-center mb-6 mt-2">
            <div className="relative">
              {/* Glow ring */}
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-40 transition-opacity duration-700"
                style={{
                  background: 'var(--accent)',
                  opacity: animDone ? 0.35 : 0,
                  transform: 'scale(1.3)',
                }}
              />
              <svg
                width="88"
                height="88"
                viewBox="0 0 88 88"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative"
              >
                {/* Background circle */}
                <circle cx="44" cy="44" r="42" fill="var(--accent-dim)" />
                {/* Animated border circle */}
                <circle
                  ref={circleRef}
                  cx="44"
                  cy="44"
                  r="38"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="239"
                  strokeDashoffset={animDone ? 0 : 239}
                  style={{
                    transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)',
                    transformOrigin: 'center',
                    transform: 'rotate(-90deg)',
                  }}
                />
                {/* Animated checkmark */}
                <polyline
                  ref={checkRef}
                  points="28,46 40,58 62,34"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray="52"
                  strokeDashoffset={animDone ? 0 : 52}
                  style={{
                    transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1) 0.5s',
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
              >
                Email confirmé
              </h1>
              <span className="text-xl">🇨🇮</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Ton compte est maintenant actif. Bienvenue dans la communauté BabiChat !
            </p>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-1 rounded-full mb-3 overflow-hidden"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div
              className="h-full rounded-full ease-linear"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent), #A78BFA)',
                transition: countdown < REDIRECT_DELAY ? 'width 1s linear' : 'none',
              }}
            />
          </div>

          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Redirection automatique dans{' '}
            <span className="font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
              {countdown}s
            </span>
          </p>

          {/* CTA button */}
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-85 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #A78BFA 100%)' }}
          >
            Se connecter maintenant
            <ArrowRight className="w-4 h-4" />
          </Link>

        </div>
      </main>
    </div>
  )
}
