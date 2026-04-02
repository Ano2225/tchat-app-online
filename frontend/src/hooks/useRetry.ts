'use client'

import { useState, useCallback, useRef } from 'react'
import { extractErrorInfo } from '@/utils/errorHandler'

interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: boolean
  onRetry?: (attempt: number) => void
  shouldRetry?: (error: unknown) => boolean
}

interface UseRetryReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T | null>
  isRetrying: boolean
  attempt: number
  reset: () => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: true,
  onRetry: () => {},
  shouldRetry: (error: unknown) => {
    const errorInfo = extractErrorInfo(error)
    // Retry on network errors, timeouts, and 5xx errors
    return (
      errorInfo.code === 'NETWORK_ERROR' ||
      errorInfo.code === 'TIMEOUT_ERROR' ||
      ((errorInfo.statusCode ?? 0) >= 500 && (errorInfo.statusCode ?? 0) < 600)
    )
  }
}

export const useRetry = <T = unknown>(options: RetryOptions = {}): UseRetryReturn<T> => {
  const [isRetrying, setIsRetrying] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const opts = { ...DEFAULT_OPTIONS, ...options }

  const reset = useCallback(() => {
    setIsRetrying(false)
    setAttempt(0)
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    let currentAttempt = 0
    let lastError: unknown = null

    while (currentAttempt < opts.maxAttempts) {
      try {
        setAttempt(currentAttempt + 1)
        
        // Execute the function
        const result = await fn()
        
        // Success - reset and return
        reset()
        return result
      } catch (error) {
        lastError = error
        currentAttempt++

        // Check if we should retry
        if (currentAttempt >= opts.maxAttempts || !opts.shouldRetry(error)) {
          reset()
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = opts.backoff
          ? opts.delay * Math.pow(2, currentAttempt - 1)
          : opts.delay

        // Notify retry
        setIsRetrying(true)
        opts.onRetry(currentAttempt)

        // Wait before retry
        await sleep(delay)

        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          reset()
          throw new Error('Retry aborted')
        }
      }
    }

    // All attempts failed
    reset()
    throw lastError
  }, [opts, reset])

  return {
    execute,
    isRetrying,
    attempt,
    reset
  }
}

