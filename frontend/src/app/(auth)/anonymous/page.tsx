'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/utils/axiosInstance'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { handleError } from '@/utils/errorHandler'
import { User, Theater, Calendar, Info } from 'lucide-react'

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
      const authStore = useAuthStore.getState()
      const result = await authStore.signInAnonymous(formData.username.trim(), {
        age: formData.age ? parseInt(formData.age) : undefined,
        sexe: formData.sexe || 'autre',
      })

      if (result.success) {
        toast.success('Connexion anonyme réussie!')
        router.push('/chat')
      } else {
        toast.error(result.error || 'Erreur de connexion')
      }
    } catch (err: any) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
      {/* Header avec ThemeToggle */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>
      
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-gray-600 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-700 dark:bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-500/20">
              <User className="w-8 h-8 text-white" />
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
                  <Theater className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
              className="w-full bg-gray-700 hover:bg-gray-800 active:bg-gray-900 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-gray-500/20"
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
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Se connecter
                </Link>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <Link href="/register" className="text-purple-600 hover:text-purple-700 font-medium">
                  Créer un compte permanent
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-500/10 border border-gray-200 dark:border-gray-500/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
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