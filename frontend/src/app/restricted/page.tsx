import { MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accès restreint – BabiChat',
  description: 'BabiChat est exclusivement disponible en Côte d\'Ivoire.',
  robots: { index: false, follow: false },
}

export default function RestrictedPage() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Logo */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--accent)', boxShadow: '0 8px 28px var(--accent-glow)' }}
      >
        <MessageSquare className="w-7 h-7 text-white" />
      </div>

      {/* Flag */}
      <div className="text-5xl mb-4">🇨🇮</div>

      {/* Title */}
      <h1
        className="text-2xl sm:text-3xl font-black mb-3 leading-tight"
        style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
      >
        Accès non autorisé
        
      </h1>

      {/* Message */}
      <p
        className="text-sm sm:text-base leading-relaxed mb-2 max-w-xs"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
      >
        BabiChat est une plateforme de chat exclusivement dédiée aux jeunes ivoiriens.
      </p>
      <p
        className="text-sm mb-8"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
      >
        BabiChat is only available in Côte d&apos;Ivoire 🇨🇮
      </p>

      {/* Divider */}
      <div className="w-16 h-px mb-6" style={{ background: 'var(--border-default)' }} />

      {/* Info box */}
      <div
        className="rounded-2xl px-5 py-4 max-w-xs text-left text-xs leading-relaxed"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
        }}
      >
        Tu es en Côte d&apos;Ivoire mais tu vois ce message ?<br />
        Cela peut être dû à ton VPN ou proxy. Désactive-le et réessaie.
      </div>
    </div>
  )
}
