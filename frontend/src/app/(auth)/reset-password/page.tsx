'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';
import Link from 'next/link';

function ResetPasswordForm() {
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [token, setToken]               = useState('');
  const router      = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) { toast.error('Token manquant'); router.push('/login'); return; }
    setToken(t);
  }, [searchParams, router]);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6)  s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][strength];
  const strengthColor = ['', 'var(--danger)', 'var(--danger)', '#f59e0b', 'var(--online)', 'var(--online)'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 6)  { toast.error('Minimum 6 caractères'); return; }

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
    <div className="min-h-screen bg-blue-50 dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000 pointer-events-none" />
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {done ? 'Mot de passe mis à jour' : 'Nouveau mot de passe'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {done ? 'Redirection en cours…' : 'Choisissez un mot de passe sécurisé'}
          </p>
        </div>

        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">

          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vous allez être redirigé vers la page de connexion.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    required
                    className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                          style={{ background: i <= strength ? strengthColor : '#e5e7eb' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm ${confirm && confirm !== password ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-white/20'}`}
                />
                {confirm && confirm !== password && (
                  <p className="text-xs mt-1 text-red-500">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
