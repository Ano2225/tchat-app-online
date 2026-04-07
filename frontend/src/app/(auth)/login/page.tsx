'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useLoadingState } from '@/hooks/useLoadingState'
import ThemeToggle from '@/components/ui/ThemeToggle'
import ErrorAlert from '@/components/ui/ErrorAlert'
import { isRateLimitError } from '@/utils/errorHandler'
import { MessageCircle, User, Lock, Eye, EyeOff } from 'lucide-react'

function LoginPageInner() {
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
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email confirmé avec succès ! Vous pouvez maintenant vous connecter.', {
        duration: 5000,
        position: 'top-center',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      } catch (err: unknown) {
        const errorMessage = (err as Error)?.message || ''

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
        (result.user as { name?: string })?.name ||
        fallbackName ||
        '!'
      toast.success(`Bienvenue ${displayName} !`, {
        icon: '👋',
        duration: 3000
      })
      const isAdmin = (result.user as { role?: string })?.role === 'admin'
      router.push(isAdmin ? '/admin/dashboard' : '/chat')
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
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Erreur lors de l\'envoi de l\'email')
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
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Header avec ThemeToggle */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-end">
        <ThemeToggle variant="inline" />
      </header>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full filter blur-3xl opacity-20 animate-pulse"
          style={{ background: 'var(--accent)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full filter blur-3xl opacity-10 animate-pulse"
          style={{ background: 'var(--accent)', animationDelay: '1s' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent)', boxShadow: '0 8px 24px var(--accent-glow)' }}
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
              Bon retour !
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Connectez-vous à votre compte</p>
          </div>

          {formError && (
            <ErrorAlert
              message={formError}
              severity="error"
              onClose={() => setFormError(null)}
              onRetry={handleRetry}
              className="mb-5"
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
              className="mb-5"
            />
          )}

          {verificationLink && (
            <div
              className="mb-5 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent-text)' }}
            >
              <div className="font-semibold mb-1">Lien de verification</div>
              <a href={verificationLink} target="_blank" rel="noreferrer" className="break-all underline">
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
              className="mb-5"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}
              >
                Nom d&apos;utilisateur ou Email
                <span className="ml-1" style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Votre nom d'utilisateur ou email"
                  className="w-full rounded-xl pl-10 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${fieldErrors.username ? 'var(--danger)' : 'var(--border-default)'}`,
                    color: 'var(--text-primary)',
                    outlineColor: fieldErrors.username ? 'var(--danger)' : 'var(--accent)',
                  }}
                  disabled={loading}
                  aria-invalid={!!fieldErrors.username}
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4" style={{ color: fieldErrors.username ? 'var(--danger)' : 'var(--text-muted)' }} />
                </div>
              </div>
              {fieldErrors.username && (
                <p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                  <span>⚠️</span>{fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}
              >
                Mot de passe
                <span className="ml-1" style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  className="w-full rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${fieldErrors.password ? 'var(--danger)' : 'var(--border-default)'}`,
                    color: 'var(--text-primary)',
                  }}
                  disabled={loading}
                  aria-invalid={!!fieldErrors.password}
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4" style={{ color: fieldErrors.password ? 'var(--danger)' : 'var(--text-muted)' }} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                  <span>⚠️</span>{fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)', fontFamily: 'var(--font-ui)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion…
                </>
              ) : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ou</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            </div>

            <div className="space-y-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              <p>
                <Link href="/forgot-password" className="font-medium hover:underline" style={{ color: 'var(--amber)' }}>
                  Mot de passe oublié ?
                </Link>
              </p>
              <p>
                Pas encore de compte ?{' '}
                <Link href="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                  S&apos;inscrire
                </Link>
              </p>
              <p>
                <Link href="/anonymous" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                  Continuer en mode anonyme
                </Link>
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
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
