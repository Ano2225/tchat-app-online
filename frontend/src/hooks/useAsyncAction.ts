'use client'

import { useState, useCallback } from 'react'
import { useRetry } from './useRetry'
import { useErrorNotification } from './useErrorNotification'

interface AsyncActionOptions {
  onSuccess?: (data: unknown) => void
  onError?: (error: unknown) => void
  successMessage?: string
  errorMessage?: string
  enableRetry?: boolean
  maxRetries?: number
  showNotifications?: boolean
}

interface UseAsyncActionReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T | null>
  loading: boolean
  error: unknown | null
  data: T | null
  isRetrying: boolean
  retryAttempt: number
  reset: () => void
}

export const useAsyncAction = <T = unknown>(
  options: AsyncActionOptions = {}
): UseAsyncActionReturn<T> => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [data, setData] = useState<T | null>(null)

  const { notifyError, notifySuccess } = useErrorNotification()
  const retry = useRetry<T>({
    maxAttempts: options.maxRetries ?? 3,
    onRetry: (attempt) => {
      if (options.showNotifications !== false) {
        notifySuccess(`Nouvelle tentative (${attempt}/${options.maxRetries ?? 3})...`, 'Réessai')
      }
    }
  })

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(null)
    retry.reset()
  }, [retry])

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)

      let result: T | null

      if (options.enableRetry) {
        // Execute with retry
        result = await retry.execute(fn)
      } else {
        // Execute without retry
        result = await fn()
      }

      if (result !== null) {
        setData(result)

        // Call success callback
        options.onSuccess?.(result)

        // Show success notification
        if (options.showNotifications !== false && options.successMessage) {
          notifySuccess(options.successMessage)
        }
      }

      return result
    } catch (err) {
      setError(err)

      // Call error callback
      options.onError?.(err)

      // Show error notification
      if (options.showNotifications !== false) {
        notifyError(err, options.errorMessage)
      }

      return null
    } finally {
      setLoading(false)
    }
  }, [options, retry, notifyError, notifySuccess])

  return {
    execute,
    loading,
    error,
    data,
    isRetrying: retry.isRetrying,
    retryAttempt: retry.attempt,
    reset
  }
}

