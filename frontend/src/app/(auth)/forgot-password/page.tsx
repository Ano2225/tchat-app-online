'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
    <div className="min-h-screen bg-blue-50 dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Blobs décoratifs identiques à la page login */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000 pointer-events-none" />
      <div className="w-full max-w-md">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {sent ? 'Email envoyé' : 'Mot de passe oublié'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {sent ? 'Vérifiez votre boîte mail' : 'Recevez un lien de réinitialisation'}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">

          {sent ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--bg-elevated)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--online)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Si cet email est associé à un compte, vous recevrez un lien valable <strong>1 heure</strong>.
              </p>

              {/* Dev helper */}
              {devToken && (
                <div className="rounded-xl p-4 text-left space-y-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/60">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    DEV — SMTP non configuré, utilisez ce lien :
                  </p>
                  <button
                    onClick={() => router.push(`/reset-password?token=${devToken}`)}
                    className="w-full text-xs py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                    Ouvrir le lien de réinitialisation →
                  </button>
                </div>
              )}

              <button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link href="/login" className="hover:underline" style={{ color: 'var(--accent)' }}>
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
