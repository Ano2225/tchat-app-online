'use client'

import type { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import AuthProvider from './providers'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

interface RouteProvidersProps {
  children: ReactNode
}

export default function RouteProviders({ children }: RouteProvidersProps) {
  return (
    <ErrorBoundary>
      <Toaster />
      <AuthProvider>{children}</AuthProvider>
    </ErrorBoundary>
  )
}
