'use client'

import { useState } from 'react'
import ErrorAlert from '@/components/ui/ErrorAlert'
import FormField from '@/components/ui/FormField'
import LoadingButton from '@/components/ui/LoadingButton'
import { useLoadingState } from '@/hooks/useLoadingState'
import { handleError } from '@/utils/errorHandler'
import { Mail, Lock, User, AlertCircle } from 'lucide-react'
import axios from 'axios'

export default function ErrorDemoPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { loading, error, errorInfo, withLoading, reset } = useLoadingState()
  const [showSuccess, setShowSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear field error
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const simulateError = async (errorType: string) => {
    reset()
    setShowSuccess(false)
    
    await withLoading(async () => {
      // Simulate different error types
      switch (errorType) {
        case 'auth':
          throw {
            response: {
              data: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials'
              },
              status: 401
            }
          }
        
        case 'rate-limit':
          throw {
            response: {
              data: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Too many requests'
              },
              status: 429
            }
          }
        
        case 'validation':
          setFieldErrors({
            email: 'Email invalide',
            password: 'Le mot de passe doit contenir au moins 8 caractères'
          })
          throw new Error('Validation failed')
        
        case 'network':
          throw {
            message: 'Network Error',
            code: 'ERR_NETWORK'
          }
        
        case 'timeout':
          throw {
            message: 'timeout of 5000ms exceeded',
            code: 'ECONNABORTED'
          }
        
        case 'server':
          throw {
            response: {
              data: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error'
              },
              status: 500
            }
          }
        
        default:
          throw new Error('Unknown error')
      }
    })
  }

  const handleSuccess = async () => {
    reset()
    setFieldErrors({})
    
    await withLoading(async () => {
      // Simulate successful operation
      await new Promise(resolve => setTimeout(resolve, 1000))
    })
    
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 5000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🚨 Démonstration de Gestion des Erreurs
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Testez les différents types d'erreurs et leur affichage
          </p>

          {/* Error Alerts */}
          <div className="space-y-4 mb-8">
            {error && (
              <ErrorAlert
                message={error}
                severity={errorInfo?.code === 'TOO_MANY_REQUESTS' ? 'warning' : 'error'}
                title={
                  errorInfo?.code === 'INVALID_CREDENTIALS'
                    ? 'Erreur d\'authentification'
                    : errorInfo?.code === 'TOO_MANY_REQUESTS'
                    ? 'Trop de tentatives'
                    : 'Erreur'
                }
                onClose={reset}
                onRetry={errorInfo?.code !== 'TOO_MANY_REQUESTS' ? reset : undefined}
              />
            )}

            {showSuccess && (
              <ErrorAlert
                message="Opération réussie avec succès !"
                severity="success"
                title="Succès"
                onClose={() => setShowSuccess(false)}
                autoClose
                duration={5000}
              />
            )}
          </div>

          {/* Form Demo */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Formulaire avec Validation
            </h2>
            
            <div className="space-y-4">
              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                placeholder="votre@email.com"
                icon={<Mail className="w-4 h-4 text-gray-500" />}
                helperText="Entrez votre adresse email"
                required
              />

              <FormField
                label="Nom d'utilisateur"
                name="username"
                value={formData.username}
                onChange={handleChange}
                error={fieldErrors.username}
                placeholder="johndoe"
                icon={<User className="w-4 h-4 text-gray-500" />}
                required
              />

              <FormField
                label="Mot de passe"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={fieldErrors.password}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4 text-gray-500" />}
                helperText="Minimum 8 caractères"
                required
              />
            </div>
          </div>

          {/* Error Simulation Buttons */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Simuler des Erreurs
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <LoadingButton
                onClick={() => simulateError('auth')}
                loading={loading}
                variant="outline"
              >
                Erreur Auth
              </LoadingButton>

              <LoadingButton
                onClick={() => simulateError('rate-limit')}
                loading={loading}
                variant="outline"
              >
                Rate Limit
              </LoadingButton>

              <LoadingButton
                onClick={() => simulateError('validation')}
                loading={loading}
                variant="outline"
              >
                Validation
              </LoadingButton>

              <LoadingButton
                onClick={() => simulateError('network')}
                loading={loading}
                variant="outline"
              >
                Réseau
              </LoadingButton>

              <LoadingButton
                onClick={() => simulateError('timeout')}
                loading={loading}
                variant="outline"
              >
                Timeout
              </LoadingButton>

              <LoadingButton
                onClick={() => simulateError('server')}
                loading={loading}
                variant="outline"
              >
                Serveur 500
              </LoadingButton>

              <LoadingButton
                onClick={handleSuccess}
                loading={loading}
                className="col-span-2 md:col-span-3"
              >
                ✅ Succès
              </LoadingButton>
            </div>
          </div>

          {/* Error Info Display */}
          {errorInfo && (
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Informations de l'erreur:
              </h3>
              <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto">
                {JSON.stringify(errorInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

