'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axiosInstance';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Veuillez saisir votre email');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/request-password-reset', { email });
      setSent(true);
      toast.success('Email de réinitialisation envoyé');
      
      // En développement, afficher le token
      if (response.data.resetToken) {
        console.log('Token de réinitialisation:', response.data.resetToken);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark flex items-center justify-center p-4">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Email envoyé</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Si votre email existe dans notre système, vous recevrez un lien de réinitialisation.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-xl font-medium hover:from-primary-600 hover:to-secondary-600 transition-all"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark flex items-center justify-center p-4">
      <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
              placeholder="votre@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-xl font-medium hover:from-primary-600 hover:to-secondary-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;