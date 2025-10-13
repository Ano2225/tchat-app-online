'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/login', {
        username: formData.username.trim(),
        password: formData.password
      })

      if (!response.data?.user || !response.data?.token) {
        throw new Error('Réponse serveur invalide')
      }

      login({
        user: response.data.user,
        token: response.data.token
      })

      toast.success('Connexion réussie!')
      router.push('/chat')
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur de connexion'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">💬</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bon retour!</h1>
            <p className="text-gray-600 dark:text-gray-300">Connectez-vous à votre compte</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Nom d'utilisateur ou Email
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Votre nom d'utilisateur ou email"
                  className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  required
                />
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <span className="text-gray-500 dark:text-gray-400">👤</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 pr-12 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  required
                />
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <span className="text-gray-500 dark:text-gray-400">🔒</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold py-3 rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Connexion...
                </div>
              ) : (
                'Se connecter'
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
                Pas encore de compte?{' '}
                <Link href="/register" className="text-secondary-500 hover:text-secondary-600 font-medium">
                  S'inscrire
                </Link>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <Link href="/anonymous" className="text-turquoise-500 hover:text-turquoise-600 font-medium">
                  Continuer en mode anonyme
                </Link>
              </p>
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