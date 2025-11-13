'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/utils/axiosInstance'

export default function AnonymousPage() {
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    sexe: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!formData.username.trim()) {
      toast.error('Veuillez entrer un nom d\'utilisateur')
      return
    }

    if (formData.username.trim().length < 3) {
      toast.error('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      return
    }

    if (formData.username.trim().length > 20) {
      toast.error('Le nom d\'utilisateur ne peut pas dépasser 20 caractères')
      return
    }

    const age = parseInt(formData.age)
    if (!formData.age || isNaN(age) || age < 13 || age > 25) {
      toast.error('Veuillez entrer un âge valide (13-25 ans)')
      return
    }

    setLoading(true)

    try {
      const response = await axiosInstance.post('/auth/anonymous', {
        username: formData.username.trim(),
        age,
        sexe: formData.sexe
      })

      if (!response.data?.user || !response.data?.token) {
        throw new Error('Réponse serveur invalide')
      }

      login({
        user: response.data.user,
        token: response.data.token
      })

      toast.success('Connexion anonyme réussie!')
      router.push('/chat')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gray-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">👤</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Mode Anonyme</h1>
            <p className="text-gray-600 dark:text-gray-300">Chattez sans créer de compte</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Choisissez un pseudo
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Votre pseudo temporaire"
                  className="w-full bg-white dark:bg-white/10 border border-gray-400 dark:border-white/20 rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all shadow-sm"
                  required
                  minLength={3}
                  maxLength={20}
                />
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <span className="text-gray-500 dark:text-gray-400">🎭</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Entre 3 et 20 caractères
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Votre âge
              </label>
              <div className="relative">
                <input
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="18"
                  className="w-full bg-white dark:bg-white/10 border border-gray-400 dark:border-white/20 rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all shadow-sm"
                  required
                  min="13"
                  max="25"
                />
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <span className="text-gray-500 dark:text-gray-400">📅</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Âge requis : 13 à 25 ans
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Votre sexe
              </label>
              <select
                name="sexe"
                value={formData.sexe}
                onChange={handleChange}
                className="w-full bg-white dark:bg-white/10 border border-gray-400 dark:border-white/20 rounded-xl px-3 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all shadow-sm"
              >
                <option value="" className="bg-white dark:bg-gray-800">Sélectionnez</option>
                <option value="homme" className="bg-white dark:bg-gray-800">Homme</option>
                <option value="femme" className="bg-white dark:bg-gray-800">Femme</option>
                <option value="autre" className="bg-white dark:bg-gray-800">Autre</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-600 text-white font-semibold py-3 rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Connexion...
                </div>
              ) : (
                'Commencer à chatter'
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-white/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 text-sm">Ou</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Vous avez déjà un compte?{' '}
                <Link href="/login" className="text-primary-500 hover:text-primary-600 font-medium">
                  Se connecter
                </Link>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <Link href="/register" className="text-secondary-500 hover:text-secondary-600 font-medium">
                  Créer un compte permanent
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-500/10 border border-gray-200 dark:border-gray-500/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <span className="text-gray-600 dark:text-gray-400 text-lg">ℹ️</span>
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode Anonyme</h4>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Vos messages ne seront pas sauvegardés. Créez un compte pour conserver votre historique.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white text-sm">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}