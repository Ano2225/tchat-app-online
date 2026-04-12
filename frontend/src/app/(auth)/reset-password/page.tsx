'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { LockKeyhole, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [token, setToken]       = useState('');
  const router       = useRouter();
  const searchParams = useSearchParams();

  const extractToken = (value: string | null) => {
    if (!value) return '';
    const decoded = decodeURIComponent(value).trim();
    const match = decoded.match(/[a-f0-9]{64}/i);
    return match ? match[0].toLowerCase() : '';
  };

  useEffect(() => {
    const t = extractToken(searchParams.get('token'));
    if (!t) { toast.error('Token manquant ou invalide'); router.push('/login'); return; }
    setToken(t);
  }, [searchParams, router]);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)          s++;
    if (password.length >= 12)         s++;
    if (/[A-Z]/.test(password))        s++;
    if (/[0-9]/.test(password))        s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][strength];
  const strengthColor = ['', 'var(--danger)', 'var(--danger)', '#f59e0b', 'var(--online)', 'var(--online)'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 8)  { toast.error('Minimum 8 caractères'); return; }

    setLoading(true);
    try {
      await axiosInstance.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      toast.success('Mot de passe réinitialisé !');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Token invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
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
              <LockKeyhole className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}
            >
              {done ? 'Mot de passe mis à jour' : 'Nouveau mot de passe'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {done ? 'Redirection en cours…' : 'Choisissez un mot de passe sécurisé'}
            </p>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <svg className="w-8 h-8" style={{ color: 'var(--online)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Vous allez être redirigé vers la page de connexion.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New password */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}
                >
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    required
                    className="w-full rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none transition-all"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <LockKeyhole className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{ background: i <= strength ? strengthColor : 'var(--border-default)' }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}
                >
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${confirm && confirm !== password ? 'var(--danger)' : 'var(--border-default)'}`,
                    color: 'var(--text-primary)',
                  }}
                />
                {confirm && confirm !== password && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full font-semibold py-3 rounded-xl transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98] text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Réinitialisation…
                  </>
                ) : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm">
          <Link href="/login" className="hover:underline" style={{ color: 'var(--accent-text)' }}>
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
