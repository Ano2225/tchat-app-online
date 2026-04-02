'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { LogIn, Sparkles, Ghost, Zap, Shield, MessageSquare, Users, Gamepad2 } from 'lucide-react'

const features = [
  { icon: Zap,          label: 'Temps réel',  desc: 'Messages instantanés' },
  { icon: Shield,       label: 'Sécurisé',    desc: 'Conversations privées' },
  { icon: Users,        label: 'Salons',       desc: '7 canaux thématiques' },
  { icon: Gamepad2,     label: 'Quiz',         desc: 'Jouez ensemble' },
]

export default function Home() {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Background atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Top-left glow */}
        <div
          className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full animate-pulse-soft"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
            opacity: 0.14,
            filter: 'blur(48px)',
          }}
        />
        {/* Bottom-right glow */}
        <div
          className="absolute -bottom-56 -right-40 w-[560px] h-[560px] rounded-full animate-pulse-soft"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
            opacity: 0.09,
            filter: 'blur(64px)',
            animationDelay: '1.8s',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.5,
          }}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 0 20px var(--accent-glow)',
            }}
          >
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-muted)' }}
          >
            BabiChat
          </span>
        </div>
        <ThemeToggle variant="inline" />
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pt-8 pb-6 md:pt-16 md:pb-12">
        <div className="w-full max-w-sm mx-auto animate-fade-in">

          {/* Live pill badge */}
          <div className="flex justify-center mb-7">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-soft"
                style={{ background: 'var(--online)' }}
              />
              Chat en direct · Rejoins maintenant
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-center font-black leading-[0.95] tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'clamp(3rem, 14vw, 5rem)',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 55%, var(--text-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            BabiChat
          </h1>

          {/* Tagline */}
          <p
            className="text-center text-sm sm:text-base leading-relaxed mb-10"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
              maxWidth: '260px',
              margin: '0 auto 2.5rem',
            }}
          >
            Parle à tes potes en temps réel.
            Chat, quiz et messages privés.
          </p>

          {/* ── CTA Stack ── */}
          <div
            className="flex flex-col gap-3 animate-slide-up"
            style={{ animationDelay: '0.12s', animationFillMode: 'both' }}
          >
            {/* Primary CTA — Anonyme */}
            <Link href="/anonymous" className="block w-full">
              <div
                className="w-full flex items-center justify-center gap-2.5 font-semibold text-white rounded-2xl transition-all active:scale-[0.97] hover:opacity-90 cursor-pointer select-none"
                style={{
                  minHeight: '52px',
                  background: 'var(--accent)',
                  boxShadow: '0 8px 28px var(--accent-glow)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  letterSpacing: '-0.01em',
                }}
              >
                <Ghost className="w-4 h-4" />
                Commencer anonymement
              </div>
            </Link>

            {/* Secondary CTA — Connexion */}
            <Link href="/login" className="block w-full">
              <div
                className="w-full flex items-center justify-center gap-2.5 font-semibold rounded-2xl transition-all active:scale-[0.97] hover:opacity-80 cursor-pointer select-none"
                style={{
                  minHeight: '52px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  letterSpacing: '-0.01em',
                }}
              >
                <LogIn className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Se connecter
              </div>
            </Link>

            {/* Tertiary — ghost link */}
            <Link
              href="/register"
              className="flex items-center justify-center gap-1.5 py-3 text-sm transition-opacity hover:opacity-70 active:opacity-50"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.01em',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Créer un compte
            </Link>
          </div>
        </div>

        {/* ── Features ── */}
        <div
          className="mt-12 w-full max-w-sm mx-auto animate-slide-up"
          style={{ animationDelay: '0.28s', animationFillMode: 'both' }}
        >
          {/* Label */}
          <p
            className="text-center text-[11px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}
          >
            Pourquoi BabiChat
          </p>

          {/* Mobile: horizontal scroll chips */}
          <div
            className="flex gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex-shrink-0 flex flex-col items-center gap-2 px-3.5 py-3.5 rounded-2xl md:flex-shrink text-center"
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  minWidth: '92px',
                  scrollSnapAlign: 'start',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-dim)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p
                    className="text-xs font-semibold leading-tight"
                    style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-[10px] leading-tight mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 text-center py-5 text-xs"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
      >
        © 2025 BabiChat
      </footer>
    </div>
  )
}
