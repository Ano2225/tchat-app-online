'use client'

import { useState, useCallback } from 'react'
import { extractErrorInfo, getUserFriendlyMessage, ApiError } from '@/utils/errorHandler'

interface UseLoadingStateReturn {
  loading: boolean
  error: string | null
  errorInfo: ApiError | null
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T | null>
  reset: () => void
}

export const useLoadingState = (initialLoading = false): UseLoadingStateReturn => {
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)
  const [errorInfo, setErrorInfo] = useState<ApiError | null>(null)

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      setErrorInfo(null)
      const result = await asyncFn()
      return result
    } catch (err) {
      const info = extractErrorInfo(err)
      const message = getUserFriendlyMessage(err)
      setError(message)
      setErrorInfo(info)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setErrorInfo(null)
  }, [])

  return {
    loading,
    error,
    errorInfo,
    setLoading,
    setError,
    withLoading,
    reset
  }
}