'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useLoadingState } from '@/hooks/useLoadingState'
import LoadingButton from '@/components/ui/LoadingButton'
import ThemeToggle from '@/components/ui/ThemeToggle'
import ErrorAlert from '@/components/ui/ErrorAlert'
import { handleError, isRateLimitError } from '@/utils/errorHandler'
import { MessageCircle, User, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationLink, setVerificationLink] = useState<string | null>(null)
  const [sendingVerification, setSendingVerification] = useState(false)
  const { loading, error, errorInfo, withLoading, reset } = useLoadingState()
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const getLoginErrorMessage = (code?: string, fallback?: string) => {
    switch (code) {
      case 'INVALID_CREDENTIALS':
        return 'Identifiants incorrects. Vérifiez vos informations.'
      case 'EMAIL_NOT_VERIFIED':
        return 'Veuillez confirmer votre email avant de vous connecter.'
      case 'USER_BLOCKED':
        return 'Votre compte a été bloqué. Contactez le support.'
      case 'BRUTE_FORCE_DETECTED':
      case 'TOO_MANY_REQUESTS':
        return 'Trop de tentatives. Veuillez réessayer plus tard.'
      default:
        return fallback || 'Impossible de se connecter pour le moment.'
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }

    // Clear global error
    if (error) {
      reset()
    }
    if (formError) {
      setFormError(null)
    }
    if (verificationNotice) {
      setVerificationNotice(null)
    }
    if (verificationLink) {
      setVerificationLink(null)
    }
  }

  const isValidEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const isValidUsername = (value: string): boolean => {
    // Username doit contenir entre 3 et 20 caractères alphanumériques et underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(value)
  }
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    const usernameValue = formData.username.trim()

    if (!usernameValue) {
      errors.username = 'Le nom d\'utilisateur ou l\'email est requis'
    } else {
      // Vérifier si c'est un email ou un username
      const isEmail = isValidEmail(usernameValue)
      const isUsername = isValidUsername(usernameValue)

      if (!isEmail && !isUsername) {
        // Si ça ressemble à un email mais est invalide
        if (usernameValue.includes('@')) {
          errors.username = 'Adresse email invalide. Vérifiez le format (ex: nom@exemple.com)'
        } else {
          errors.username = 'Nom d\'utilisateur invalide. Il doit contenir entre 3 et 20 caractères (lettres, chiffres et underscores uniquement)'
        }
      }
    }

    if (!formData.password.trim()) {
      errors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const result = await withLoading(async () => {
      try {
        // Essayer better-auth d'abord
        const authStore = useAuthStore.getState()
        const loginResult = await authStore.signIn({
          email: formData.username.trim(),
          password: formData.password
        })

        if (loginResult.success) {
          return { user: authStore.user, accessToken: authStore.token }
        } else {
          if (loginResult.code === 'EMAIL_NOT_VERIFIED') {
            setVerificationEmail(formData.username.trim())
            setVerificationNotice(loginResult.error || 'Veuillez confirmer votre email avant de vous connecter')
            setFormError(null)
            return null
          }
          setFormError(getLoginErrorMessage(loginResult.code, loginResult.error))
          return null
        }
      } catch (err: any) {
        const errorMessage = err?.message || ''
        
        if (
          errorMessage.includes('Identifiants') ||
          errorMessage.includes('invalide') ||
          errorMessage.toLowerCase().includes('invalid')
        ) {
          const message = getLoginErrorMessage('INVALID_CREDENTIALS')
          setFormError(message)
          return null
        } else {
          setFormError(getLoginErrorMessage(undefined, errorMessage))
          return null
        }
      }
    })

    if (result) {
      const fallbackName = formData.username.trim()
      const displayName =
        result.user?.username ||
        (result.user as any)?.name ||
        fallbackName ||
        '!'
      toast.success(`Bienvenue ${displayName} !`, {
        icon: '👋',
        duration: 3000
      })
      router.push('/chat')
    }
  }

  const handleResendVerification = async () => {
    if (!verificationEmail) {
      toast.error('Veuillez saisir votre email')
      return
    }

    try {
      setSendingVerification(true)
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, callbackURL: '/login' })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.message || 'Impossible d\'envoyer l\'email')
      }

      const data = await response.json().catch(() => ({}))
      if (data?.delivered === false) {
        const warningMessage = data?.warning || 'Email de verification non envoye.'
        setVerificationNotice(warningMessage)
        setVerificationLink(data?.verificationUrl || null)
        toast.error(warningMessage)
        return
      }

      setVerificationLink(data?.verificationUrl || null)
      toast.success('Email de verification envoye. Consultez votre boite mail.')
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'envoi de l\'email')
    } finally {
      setSendingVerification(false)
    }
  }

  const handleRetry = () => {
    reset()
    setFieldErrors({})
    setFormError(null)
    setVerificationNotice(null)
    setVerificationLink(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark flex items-center justify-center p-4">
      {/* Header avec ThemeToggle */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>
      
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bon retour!</h1>
            <p className="text-gray-600 dark:text-gray-300">Connectez-vous à votre compte</p>
          </div>

          {/* Error Alert - Ne pas afficher pour les erreurs d'identifiants invalides (gérées par fieldErrors) */}
          {formError && (
            <ErrorAlert
              message={formError}
              severity="error"
              onClose={() => setFormError(null)}
              onRetry={handleRetry}
              className="mb-6"
            />
          )}

          {verificationNotice && (
            <ErrorAlert
              message={verificationNotice}
              severity="info"
              title="Email non verifie"
              onClose={() => setVerificationNotice(null)}
              onRetry={sendingVerification ? undefined : handleResendVerification}
              retryText={sendingVerification ? 'Envoi en cours...' : 'Renvoyer l\'email'}
              className="mb-6"
            />
          )}

          {verificationLink && (
            <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-700/60 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
              <div className="font-semibold mb-1">Lien de verification</div>
              <a
                href={verificationLink}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-700 dark:text-blue-300 underline"
              >
                Ouvrir le lien
              </a>
            </div>
          )}

          {error && !formError && errorInfo?.code !== 'INVALID_CREDENTIALS' && !error.includes('Identifiants invalides') && (
            <ErrorAlert
              message={error}
              severity={isRateLimitError(errorInfo) ? 'warning' : 'error'}
              title={
                errorInfo?.code === 'BRUTE_FORCE_DETECTED'
                  ? 'Compte temporairement bloqué'
                  : errorInfo?.code === 'TOO_MANY_REQUESTS'
                  ? 'Trop de tentatives'
                  : errorInfo?.code === 'USER_BLOCKED'
                  ? 'Compte bloqué'
                  : 'Erreur de connexion'
              }
              onClose={handleRetry}
              onRetry={errorInfo?.code !== 'BRUTE_FORCE_DETECTED' ? handleRetry : undefined}
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Nom d'utilisateur ou Email
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Votre nom d'utilisateur ou email"
                  className={`w-full bg-gray-50 dark:bg-white/10 border ${
                    fieldErrors.username
                      ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                      : 'border-gray-300 dark:border-white/20 focus:ring-primary-500'
                  } rounded-xl pl-10 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all`}
                  disabled={loading}
                  aria-invalid={!!fieldErrors.username}
                />
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <User className={`w-4 h-4 ${fieldErrors.username ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
              </div>
              {fieldErrors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span>⚠️</span>
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Mot de passe
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  className={`w-full bg-gray-50 dark:bg-white/10 border ${
                    fieldErrors.password
                      ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                      : 'border-gray-300 dark:border-white/20 focus:ring-primary-500'
                  } rounded-xl pl-10 pr-12 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all`}
                  disabled={loading}
                  aria-invalid={!!fieldErrors.password}
                />
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <Lock className={`w-4 h-4 ${fieldErrors.password ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span>⚠️</span>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Connexion..."
              className="w-full"
              variant="primary"
              size="md"
            >
              Se connecter
            </LoadingButton>
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
                <Link href="/forgot-password" className="text-orange-500 hover:text-orange-600 font-medium">
                  Mot de passe oublié?
                </Link>
              </p>
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
