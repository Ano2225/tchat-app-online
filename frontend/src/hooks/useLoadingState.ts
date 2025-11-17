'use client'

import { useState, useCallback } from 'react'

interface UseLoadingStateReturn {
  loading: boolean
  error: string | null
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T | null>
  reset: () => void
}

export const useLoadingState = (initialLoading = false): UseLoadingStateReturn => {
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFn()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  return {
    loading,
    error,
    setLoading,
    setError,
    withLoading,
    reset
  }
}