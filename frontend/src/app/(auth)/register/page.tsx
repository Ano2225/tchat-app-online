'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    sexe: '',
    ville: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const totalSteps = 3

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!formData.username.trim()) {
          toast.error('Veuillez entrer un nom d\'utilisateur')
          return false
        }
        if (!formData.email.trim()) {
          toast.error('Veuillez entrer votre email')
          return false
        }
        return true
      case 2:
        if (!formData.password.trim()) {
          toast.error('Veuillez entrer un mot de passe')
          return false
        }
        if (formData.password.length < 6) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères')
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas')
          return false
        }
        return true
      case 3:
        const age = parseInt(formData.age)
        if (!formData.age || isNaN(age) || age < 13 || age > 25) {
          toast.error('Veuillez entrer un âge valide (13-25 ans)')
          return false
        }
        if (!formData.sexe) {
          toast.error('Veuillez sélectionner votre sexe')
          return false
        }
        if (!formData.ville.trim()) {
          toast.error('Veuillez entrer votre ville')
          return false
        }
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(3)) return

    setLoading(true)

    try {
      const response = await axios.post('/api/auth/register', {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        age: parseInt(formData.age),
        sexe: formData.sexe,
        ville: formData.ville.trim()
      })

      if (response.status === 201) {
        toast.success('Inscription réussie! Vous pouvez maintenant vous connecter.')
        router.push('/login')
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'inscription'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark flex items-center justify-center p-4">
      {/* Header avec ThemeToggle */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>
      
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-turquoise-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-secondary-500 to-turquoise-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">✨</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Rejoignez BabiChat</h1>
            <p className="text-gray-600 dark:text-gray-300">Étape {currentStep} sur {totalSteps}</p>
            
            {/* Messages d'encouragement */}
            <div className="mt-3">
              {currentStep === 1 && (
                <p className="text-sm text-secondary-600 dark:text-secondary-400 font-medium">🚀 Commençons par les bases !</p>
              )}
              {currentStep === 2 && (
                <p className="text-sm text-secondary-600 dark:text-secondary-400 font-medium">🔐 Sécurisez votre compte maintenant</p>
              )}
              {currentStep === 3 && (
                <p className="text-sm text-secondary-600 dark:text-secondary-400 font-medium">🎉 Dernière étape, vous y êtes presque !</p>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
              <div 
                className="bg-gradient-to-r from-secondary-500 to-turquoise-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
            {/* Étape 1: Informations de base */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Nom d'utilisateur</label>
                  <div className="relative">
                    <input
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choisissez un pseudo"
                      className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-all"
                      required
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <span className="text-gray-500 dark:text-gray-400">👤</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Email</label>
                  <div className="relative">
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-all"
                      required
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <span className="text-gray-500 dark:text-gray-400">📧</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Étape 2: Mot de passe */}
            {currentStep === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Mot de passe</label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Au moins 6 caractères"
                      className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 pr-12 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-all"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Confirmer le mot de passe</label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Répétez votre mot de passe"
                      className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 pr-12 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-all"
                      required
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <span className="text-gray-500 dark:text-gray-400">🔒</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Étape 3: Informations personnelles */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Âge</label>
                    <div className="relative">
                      <input
                        name="age"
                        type="number"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="25"
                        className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-all"
                        min="13"
                        max="25"
                        required
                      />
                      <div className="absolute inset-y-0 left-3 flex items-center">
                        <span className="text-gray-500 dark:text-gray-400">📅</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Sexe</label>
                    <div className="relative">
                      <select
                        name="sexe"
                        value={formData.sexe}
                        onChange={handleChange}
                        className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 pr-10 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-all cursor-pointer"
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundImage: 'none'
                        }}
                        required
                      >
                        <option value="" className="text-gray-500">Sélectionnez</option>
                        <option value="homme" className="text-gray-900 dark:text-white">Homme</option>
                        <option value="femme" className="text-gray-900 dark:text-white">Femme</option>
                        <option value="autre" className="text-gray-900 dark:text-white">Autre</option>
                      </select>
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400">👤</span>
                      </div>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Ville</label>
                  <div className="relative">
                    <input
                      name="ville"
                      type="text"
                      value={formData.ville}
                      onChange={handleChange}
                      placeholder="Treichville, Abidjan"
                      className="w-full bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-500 transition-all"
                      required
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <span className="text-gray-500 dark:text-gray-400">📍</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-4 mt-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Précédent
                </button>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-secondary-600 to-secondary-500 text-white font-semibold py-3 rounded-xl hover:from-secondary-700 hover:to-secondary-600 transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Inscription...
                  </div>
                ) : currentStep === totalSteps ? (
                  'Créer mon compte'
                ) : (
                  'Suivant'
                )}
              </button>
            </div>
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
                Déjà un compte?{' '}
                <Link href="/login" className="text-primary-500 hover:text-primary-600 font-medium">
                  Se connecter
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