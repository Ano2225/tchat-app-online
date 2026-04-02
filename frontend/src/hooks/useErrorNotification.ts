'use client'

import { useCallback } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { extractErrorInfo, getUserFriendlyMessage, isAuthError, isRateLimitError } from '@/utils/errorHandler'

export const useErrorNotification = () => {
  const { addNotification } = useNotifications()

  const notifyError = useCallback((error: unknown, customMessage?: string) => {
    const errorInfo = extractErrorInfo(error)
    const message = customMessage || getUserFriendlyMessage(error)

    // Determine title based on error type
    let title = 'Erreur'
    if (isAuthError(error)) {
      title = 'Erreur d\'authentification'
    } else if (isRateLimitError(errorInfo)) {
      title = 'Trop de tentatives'
    } else if (errorInfo.code === 'NETWORK_ERROR') {
      title = 'Erreur de connexion'
    } else if (errorInfo.code === 'TIMEOUT_ERROR') {
      title = 'Délai d\'attente dépassé'
    } else if ((errorInfo.statusCode ?? 0) >= 500) {
      title = 'Erreur serveur'
    }

    addNotification({
      type: isRateLimitError(errorInfo) ? 'warning' : 'error',
      title,
      message,
      duration: isRateLimitError(errorInfo) ? 8000 : 5000
    })

    return errorInfo
  }, [addNotification])

  const notifySuccess = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'success',
      title,
      message,
      duration: 3000
    })
  }, [addNotification])

  const notifyWarning = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 5000
    })
  }, [addNotification])

  const notifyInfo = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: 4000
    })
  }, [addNotification])

  return {
    notifyError,
    notifySuccess,
    notifyWarning,
    notifyInfo
  }
}

