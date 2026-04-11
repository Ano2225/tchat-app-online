'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

const REDIRECT_DELAY = 5

export default function EmailVerifiedPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(REDIRECT_DELAY)

  useEffect(() => {
    if (countdown <= 0) {
      router.replace('/login')
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center shadow-xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Icône animée */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-muted, #d1fae5)' }}>
            <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
          Email confirmé !
        </h1>
        <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
          Votre adresse email a bien été vérifiée. Votre compte est maintenant actif.
        </p>

        {/* Barre de progression */}
        <div className="w-full h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <div
            className="h-full rounded-full bg-green-500 transition-all ease-linear"
            style={{
              width: `${((REDIRECT_DELAY - countdown) / REDIRECT_DELAY) * 100}%`,
              transitionDuration: '1000ms',
            }}
          />
        </div>

        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Redirection vers la connexion dans{' '}
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {countdown}s
          </span>
        </p>

        <button
          onClick={() => router.replace('/login')}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          Se connecter maintenant
        </button>
      </div>
    </div>
  )
}
