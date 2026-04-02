/**
 * Tests for Error Handler Utility
 */

// @ts-ignore
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractErrorInfo,
  getUserFriendlyMessage,
  isAuthError,
  isRateLimitError,
  handleError,
  ApiError
} from '../errorHandler'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn()
  }
}))

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractErrorInfo', () => {
    it('should extract error info from AxiosError', () => {
      const axiosError = {
        response: {
          data: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
            statusCode: 401
          },
          status: 401
        },
        message: 'Request failed'
      } as AxiosError

      const result = extractErrorInfo(axiosError)

      expect(result).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        statusCode: 401
      })
    })

    it('should extract error info from Error object', () => {
      const error = new Error('Something went wrong')

      const result = extractErrorInfo(error)

      expect(result).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Something went wrong',
        statusCode: 500
      })
    })

    it('should extract error info from string', () => {
      const result = extractErrorInfo('Network error')

      expect(result).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Network error',
        statusCode: 500
      })
    })

    it('should handle network errors', () => {
      const axiosError = {
        message: 'Network Error',
        code: 'ERR_NETWORK'
      } as AxiosError

      const result = extractErrorInfo(axiosError)

      expect(result.code).toBe('NETWORK_ERROR')
    })

    it('should handle timeout errors', () => {
      const axiosError = {
        message: 'timeout of 5000ms exceeded',
        code: 'ECONNABORTED'
      } as AxiosError

      const result = extractErrorInfo(axiosError)

      expect(result.code).toBe('TIMEOUT_ERROR')
    })
  })

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for known error codes', () => {
      const error = {
        response: {
          data: {
            code: 'INVALID_CREDENTIALS'
          }
        }
      } as AxiosError

      const message = getUserFriendlyMessage(error)

      expect(message).toBe('Nom d\'utilisateur ou mot de passe incorrect')
    })

    it('should return original message for unknown error codes', () => {
      const error = {
        response: {
          data: {
            code: 'UNKNOWN_CODE',
            message: 'Custom error message'
          }
        }
      } as AxiosError

      const message = getUserFriendlyMessage(error)

      expect(message).toBe('Custom error message')
    })

    it('should return default message for errors without message', () => {
      const error = {}

      const message = getUserFriendlyMessage(error)

      expect(message).toBe('Une erreur est survenue. Veuillez réessayer.')
    })
  })

  describe('isAuthError', () => {
    it('should return true for authentication errors', () => {
      const error = {
        response: {
          data: {
            code: 'INVALID_CREDENTIALS'
          }
        }
      } as AxiosError

      expect(isAuthError(error)).toBe(true)
    })

    it('should return false for non-authentication errors', () => {
      const error = {
        response: {
          data: {
            code: 'VALIDATION_ERROR'
          }
        }
      } as AxiosError

      expect(isAuthError(error)).toBe(false)
    })
  })

  describe('isRateLimitError', () => {
    it('should return true for rate limit errors', () => {
      const errorInfo: ApiError = {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
        statusCode: 429
      }

      expect(isRateLimitError(errorInfo)).toBe(true)
    })

    it('should return false for non-rate limit errors', () => {
      const errorInfo: ApiError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        statusCode: 401
      }

      expect(isRateLimitError(errorInfo)).toBe(false)
    })
  })

  describe('handleError', () => {
    it('should call toast.error with user-friendly message', () => {
      const error = {
        response: {
          data: {
            code: 'INVALID_CREDENTIALS'
          }
        }
      } as AxiosError

      handleError(error)

      expect(toast.error).toHaveBeenCalledWith('Nom d\'utilisateur ou mot de passe incorrect')
    })

    it('should use custom message if provided', () => {
      const error = new Error('Some error')

      handleError(error, 'Custom error message')

      expect(toast.error).toHaveBeenCalledWith('Custom error message')
    })
  })
})

