'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingButton from './LoadingButton'

interface ErrorFallbackProps {
  error?: Error | null
  resetError?: () => void
  title?: string
  message?: string
  showHomeButton?: boolean
  showBackButton?: boolean
  showRetryButton?: boolean
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Une erreur est survenue',
  message,
  showHomeButton = true,
  showBackButton = true,
  showRetryButton = true
}) => {
  const router = useRouter()

  const errorMessage = message || error?.message || 'Quelque chose s\'est mal passé. Veuillez réessayer.'

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-bg via-gray-100 to-neutral-bg dark:from-neutral-dark dark:via-gray-900 dark:to-neutral-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {title}
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {errorMessage}
          </p>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                Détails de l&apos;erreur
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {showRetryButton && resetError && (
              <LoadingButton
                onClick={resetError}
                className="w-full"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Réessayer
              </LoadingButton>
            )}

            {showHomeButton && (
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Retour à l&apos;accueil
              </button>
            )}

            {showBackButton && (
              <button
                onClick={() => router.back()}
                className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Si le problème persiste, veuillez contacter le support.
        </p>
      </div>
    </div>
  )
}

export default ErrorFallback

