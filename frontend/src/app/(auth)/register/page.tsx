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
    } catch (err: unknown) {
      const { handleError } = await import('@/utils/errorHandler')
      handleError(err, 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field: string) => ({
    background: 'var(--bg-surface)',
    border: `1px solid ${fieldErrors[field] ? 'var(--danger)' : 'var(--border-default)'}`,
    color: 'var(--text-primary)',
  })

  const iconStyle = (field: string) => ({
    color: fieldErrors[field] ? 'var(--danger)' : 'var(--text-muted)',
  })

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}>
        <span>⚠️</span>{fieldErrors[field]}
      </p>
    ) : null

  const labelClass = 'block text-sm font-medium mb-2'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ background: 'var(--accent)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full filter blur-3xl opacity-10 animate-pulse" style={{ background: 'var(--accent)', animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}
        >
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent)', boxShadow: '0 8px 24px var(--accent-glow)' }}
            >
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
              Rejoignez BabiChat
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Étape {currentStep} sur {totalSteps}</p>

            <div className="mt-2">
              {currentStep === 1 && (
                <div className="flex items-center justify-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Commençons par les bases !</p>
                </div>
              )}
              {currentStep === 2 && (
                <div className="flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Sécurisez votre compte</p>
                </div>
              )}
              {currentStep === 3 && (
                <div className="flex items-center justify-center gap-1.5">
                  <PartyPopper className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Dernière étape, vous y êtes presque !</p>
                </div>
              )}
            </div>

            <div className="w-full rounded-full h-1.5 mt-3" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%`, background: 'var(--accent)' }}
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
                  <label className={labelClass} style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                    Nom d&apos;utilisateur <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choisissez un pseudo"
                      className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none transition-all"
                      style={inputStyle('username')}
                      aria-invalid={!!fieldErrors.username}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <User className="w-4 h-4" style={iconStyle('username')} />
                    </div>
                  </div>
                  <FieldError field="username" />
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                    Email <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none transition-all"
                      style={inputStyle('email')}
                      aria-invalid={!!fieldErrors.email}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4" style={iconStyle('email')} />
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
                  <label className={labelClass} style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                    Mot de passe <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Au moins 6 caractères"
                      className="w-full rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none transition-all"
                      style={inputStyle('password')}
                      aria-invalid={!!fieldErrors.password}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4" style={iconStyle('password')} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError field="password" />
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                    Confirmer le mot de passe <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Répétez votre mot de passe"
                      className="w-full rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none transition-all"
                      style={inputStyle('confirmPassword')}
                      aria-invalid={!!fieldErrors.confirmPassword}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4" style={iconStyle('confirmPassword')} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-3 flex items-center transition-colors"
                      style={{ color: 'var(--text-muted)' }}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                      Âge <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        name="age"
                        type="number"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="25"
                        className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none transition-all"
                        style={inputStyle('age')}
                        min="13"
                        max="25"
                        aria-invalid={!!fieldErrors.age}
                      />
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Calendar className="w-4 h-4" style={iconStyle('age')} />
                      </div>
                    </div>
                    <FieldError field="age" />
                  </div>

                  <div>
                    <label className={labelClass} style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                      Sexe <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="sexe"
                        value={formData.sexe}
                        onChange={handleChange}
                        className="w-full rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none transition-all cursor-pointer"
                        style={{ ...inputStyle('sexe'), appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                        aria-invalid={!!fieldErrors.sexe}
                      >
                        <option value="">Choisir</option>
                        <option value="homme">Homme</option>
                        <option value="femme">Femme</option>
                        <option value="autre">Autre</option>
                      </select>
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <User className="w-4 h-4" style={iconStyle('sexe')} />
                      </div>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                    <FieldError field="sexe" />
                  </div>
                </div>

                <div>
                  <label className={labelClass} style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                    Ville <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      name="ville"
                      type="text"
                      value={formData.ville}
                      onChange={handleChange}
                      placeholder="Treichville, Abidjan"
                      className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none transition-all"
                      style={inputStyle('ville')}
                      aria-invalid={!!fieldErrors.ville}
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <MapPin className="w-4 h-4" style={iconStyle('ville')} />
                    </div>
                  </div>
                  <FieldError field="ville" />
                </div>
              </>
            )}

            <div className="flex gap-3 mt-5">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex-1 font-semibold py-3 rounded-xl transition-all hover:opacity-80"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}
                >
                  Précédent
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)', fontFamily: 'var(--font-ui)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Inscription…
                  </>
                ) : currentStep === totalSteps ? 'Créer mon compte' : 'Suivant'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ou</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            </div>
            <div className="space-y-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <p>
                Déjà un compte ?{' '}
                <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Se connecter</Link>
              </p>
              <p>
                <Link href="/anonymous" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Continuer en mode anonyme</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm transition-colors hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
