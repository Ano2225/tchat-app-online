'use client'

import React from 'react'
import SkeletonLoader from './SkeletonLoader'

interface LoadingWrapperProps {
  loading: boolean
  error?: string | null
  skeleton?: React.ReactNode
  skeletonVariant?: 'text' | 'circle' | 'rectangle' | 'message' | 'channel' | 'user'
  skeletonCount?: number
  children: React.ReactNode
  onRetry?: () => void
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  loading,
  error,
  skeleton,
  skeletonVariant = 'rectangle',
  skeletonCount = 3,
  children,
  onRetry
}) => {
  if (loading) {
    return (
      <div className="animate-fade-in">
        {skeleton || (
          <SkeletonLoader 
            variant={skeletonVariant} 
            count={skeletonCount}
          />
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Erreur de chargement
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-sm">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Réessayer
          </button>
        )}
      </div>
    )
  }

  return <>{children}</>
}

export default LoadingWrapper