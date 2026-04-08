import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { LogIn, Sparkles, Ghost, MessageSquare, Shield, Gamepad2, Heart } from 'lucide-react'

const features = [
  {
    icon: Gamepad2,
    label: 'Quiz & Jeux',
    desc: 'Joue avec tes potes',
    highlight: false,
  },
  {
    icon: Shield,
    label: 'Privé',
    desc: 'Messages sécurisés',
    highlight: false,
  },
  {
    icon: Heart,
    label: 'Gratuit',
    desc: 'Sans abonnement',
    highlight: false,
  },
]

export default function Home() {
  return (
    <div
      className="min-h-[100dvh] relative flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Background atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full animate-pulse-soft"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
            opacity: 0.14,
            filter: 'blur(48px)',
          }}
        />
        <div
          className="absolute -bottom-56 -right-40 w-[560px] h-[560px] rounded-full animate-pulse-soft"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)',
            opacity: 0.09,
            filter: 'blur(64px)',
            animationDelay: '1.8s',
          }}
        />
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
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}
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
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pt-8 pb-10 md:pt-16 md:pb-16">
        <div className="w-full max-w-sm mx-auto animate-fade-in">

          {/* Country badge */}
          <div className="flex justify-center mb-6">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ui)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <span>🇨🇮</span>
              Réservé aux Ivoiriens
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-center font-black leading-[0.95] tracking-tight mb-4"
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
            className="text-center text-base sm:text-lg font-semibold leading-snug mb-2"
            style={{
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-primary)',
              maxWidth: '280px',
              margin: '0 auto 0.5rem',
            }}
          >
            Le tchat ivoirien des jeunes de la Civ
          </p>
          <p
            className="text-center text-sm leading-relaxed mb-8"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--text-muted)',
              maxWidth: '260px',
              margin: '0 auto 2rem',
            }}
          >
            Chat, quiz, messages privés — 100% gratuit.
          </p>

          {/* ── CTA Stack ── */}
          <div
            className="flex flex-col gap-3 animate-slide-up"
            style={{ animationDelay: '0.12s', animationFillMode: 'both' }}
          >
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
                Chatter sans inscription
              </div>
            </Link>

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
              Créer un compte gratuit
            </Link>
          </div>
        </div>

        {/* ── Pourquoi BabiChat ── */}
        <div
          className="mt-12 w-full max-w-sm mx-auto animate-slide-up"
          style={{ animationDelay: '0.28s', animationFillMode: 'both' }}
        >
          {/* Section header */}
          <div className="text-center mb-4">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}
            >
              Pourquoi BabiChat
            </p>
          </div>

          {/* Features grid — même largeur que le hero (max-w-sm) */}
          <div className="grid grid-cols-3 gap-2.5">
            {features.map(({ icon: Icon, label, desc, highlight }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 px-2 py-3.5 rounded-2xl text-center"
                style={{
                  background: highlight ? 'var(--accent-dim)' : 'var(--bg-panel)',
                  border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border-subtle)'}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mx-auto"
                  style={{
                    background: highlight ? 'var(--accent)' : 'var(--accent-dim)',
                    boxShadow: highlight ? '0 4px 16px var(--accent-glow)' : undefined,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: highlight ? 'white' : 'var(--accent)' }} />
                </div>
                <div>
                  <p
                    className="text-[11px] font-semibold leading-tight"
                    style={{ fontFamily: 'var(--font-ui)', color: highlight ? 'var(--accent-text)' : 'var(--text-primary)' }}
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
        © 2026 BabiChat · Fait avec ❤️ en Côte d&apos;Ivoire
      </footer>
    </div>
  )
}
