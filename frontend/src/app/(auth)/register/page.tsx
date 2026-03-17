'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { Sparkles, Rocket, Lock, PartyPopper, User, Mail, Calendar, MapPin, Eye, EyeOff, ChevronDown } from 'lucide-react'

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const totalSteps = 3

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.username.trim()) {
        errors.username = 'Le nom d\'utilisateur est requis'
      } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username.trim())) {
        errors.username = 'Entre 3 et 20 caractères (lettres, chiffres, _)'
      }
      if (!formData.email.trim()) {
        errors.email = 'L\'adresse email est requise'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errors.email = 'Adresse email invalide'
      }
    }

    if (step === 2) {
      if (!formData.password) {
        errors.password = 'Le mot de passe est requis'
      } else if (formData.password.length < 6) {
        errors.password = 'Le mot de passe doit contenir au moins 6 caractères'
      }
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Veuillez confirmer votre mot de passe'
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Les mots de passe ne correspondent pas'
      }
    }

    if (step === 3) {
      const age = parseInt(formData.age)
      if (!formData.age) {
        errors.age = 'L\'âge est requis'
      } else if (isNaN(age) || age < 13 || age > 25) {
        errors.age = 'Âge valide entre 13 et 25 ans'
      }
      if (!formData.sexe) {
        errors.sexe = 'Veuillez sélectionner votre sexe'
      }
      if (!formData.ville.trim()) {
        errors.ville = 'La ville est requise'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => prev + 1)
  }

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1)
    setFieldErrors({})
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateStep(3)) return

    setLoading(true)
    try {
      const { useAuthStore } = await import('@/store/authStore')
      const authStore = useAuthStore.getState()

      const result = await authStore.signUp({
        email: formData.email.trim(),
        password: formData.password,
        username: formData.username.trim(),
        age: parseInt(formData.age),
        sexe: formData.sexe,
        ville: formData.ville.trim()
      })

      if (result.success) {
        if (result.verificationRequired) {
          toast.success('Inscription réussie. Vérifiez votre email pour activer votre compte.')
          router.push('/login')
          return
        }
        toast.success('Inscription réussie ! Bienvenue sur BabiChat !')
        router.push('/chat')
      } else {
        toast.error(result.error || 'Erreur lors de l\'inscription')
      }
    } catch (err: any) {
      const { handleError } = await import('@/utils/errorHandler')
      handleError(err, 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field: string, extra = '') =>
    `w-full bg-gray-50 dark:bg-white/10 border ${
      fieldErrors[field]
        ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
        : 'border-gray-300 dark:border-white/20 focus:ring-purple-500'
    } rounded-xl py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${extra}`

  const iconClass = (field: string) =>
    `w-4 h-4 ${fieldErrors[field] ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
        <span>⚠️</span>{fieldErrors[field]}
      </p>
    ) : null

  return (
    <div className="min-h-screen bg-purple-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>

      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-700 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Rejoignez BabiChat</h1>
            <p className="text-gray-600 dark:text-gray-300">Étape {currentStep} sur {totalSteps}</p>

            <div className="mt-3">
              {currentStep === 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Rocket className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Commençons par les bases !</p>
                </div>
              )}
              {currentStep === 2 && (
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Sécurisez votre compte</p>
                </div>
              )}
              {currentStep === 3 && (
                <div className="flex items-center justify-center gap-2">
                  <PartyPopper className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Dernière étape, vous y êtes presque !</p>
                </div>
              )}
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <form
            onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext() }}
            className="space-y-4"
          >
            {/* ── Étape 1 ── */}
            {currentStep === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Nom d'utilisateur <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choisissez un pseudo"
                      className={inputClass('username', 'pl-10')}
                      aria-invalid={!!fieldErrors.username}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <User className={iconClass('username')} />
                    </div>
                  </div>
                  <FieldError field="username" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      className={inputClass('email', 'pl-10')}
                      aria-invalid={!!fieldErrors.email}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <Mail className={iconClass('email')} />
                    </div>
                  </div>
                  <FieldError field="email" />
                </div>
              </>
            )}

            {/* ── Étape 2 ── */}
            {currentStep === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Au moins 6 caractères"
                      className={inputClass('password', 'pl-10 pr-12')}
                      aria-invalid={!!fieldErrors.password}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <Lock className={iconClass('password')} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError field="password" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Confirmer le mot de passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Répétez votre mot de passe"
                      className={inputClass('confirmPassword', 'pl-10 pr-12')}
                      aria-invalid={!!fieldErrors.confirmPassword}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <Lock className={iconClass('confirmPassword')} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError field="confirmPassword" />
                </div>
              </>
            )}

            {/* ── Étape 3 ── */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Âge <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="age"
                        type="number"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="25"
                        className={inputClass('age', 'pl-10')}
                        min="13"
                        max="25"
                        aria-invalid={!!fieldErrors.age}
                      />
                      <div className="absolute inset-y-0 left-3 flex items-center">
                        <Calendar className={iconClass('age')} />
                      </div>
                    </div>
                    <FieldError field="age" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Sexe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="sexe"
                        value={formData.sexe}
                        onChange={handleChange}
                        className={inputClass('sexe', 'pl-10 pr-10 cursor-pointer')}
                        style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
                        aria-invalid={!!fieldErrors.sexe}
                      >
                        <option value="">Sélectionnez</option>
                        <option value="homme">Homme</option>
                        <option value="femme">Femme</option>
                        <option value="autre">Autre</option>
                      </select>
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <User className={iconClass('sexe')} />
                      </div>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    </div>
                    <FieldError field="sexe" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Ville <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="ville"
                      type="text"
                      value={formData.ville}
                      onChange={handleChange}
                      placeholder="Treichville, Abidjan"
                      className={inputClass('ville', 'pl-10')}
                      aria-invalid={!!fieldErrors.ville}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <MapPin className={iconClass('ville')} />
                    </div>
                  </div>
                  <FieldError field="ville" />
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
                className="flex-1 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Inscription...
                  </>
                ) : currentStep === totalSteps ? 'Créer mon compte' : 'Suivant'}
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
                <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">Se connecter</Link>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <Link href="/anonymous" className="text-purple-600 hover:text-purple-700 font-medium">Continuer en mode anonyme</Link>
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
