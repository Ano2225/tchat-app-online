'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { KeyRound, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Veuillez saisir votre email'); return; }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/auth/request-password-reset', { email });
      setSent(true);
      if (data.resetToken) setDevToken(data.resetToken); // dev only
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 py-8 relative"
      style={{ background: 'var(--bg-base)' }}
    >
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full filter blur-3xl opacity-20 animate-pulse"
          style={{ background: 'var(--accent)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full filter blur-3xl opacity-10 animate-pulse"
          style={{ background: 'var(--accent)', animationDelay: '1s' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <div
          className="rounded-3xl p-5 sm:p-8"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--accent)', boxShadow: '0 8px 24px var(--accent-glow)' }}
            >
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
            >
              {sent ? 'Email envoyé !' : 'Mot de passe oublié'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {sent ? 'Vérifiez votre boîte mail' : 'Recevez un lien de réinitialisation'}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <svg className="w-8 h-8" style={{ color: 'var(--online)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Si cet email est associé à un compte, vous recevrez un lien valable <strong>1 heure</strong>.
              </p>

              {/* Dev helper — only shown in development */}
              {devToken && process.env.NODE_ENV === 'development' && (
                <div
                  className="rounded-xl p-4 text-left space-y-2"
                  style={{
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--accent-text)' }}>
                    DEV — SMTP non configuré, utilisez ce lien :
                  </p>
                  <button
                    onClick={() => router.push(`/reset-password?token=${devToken}`)}
                    className="w-full text-xs py-2 rounded-lg font-semibold transition-colors text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    Ouvrir le lien de réinitialisation →
                  </button>
                </div>
              )}

              <button
                onClick={() => router.push('/login')}
                className="w-full font-semibold py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98] text-white"
                style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)' }}
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}
                >
                  Adresse email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none transition-all"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold py-3 rounded-xl transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98] text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Envoi en cours…
                  </>
                ) : 'Envoyer le lien'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm">
          <Link href="/login" className="hover:underline" style={{ color: 'var(--accent)' }}>
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
