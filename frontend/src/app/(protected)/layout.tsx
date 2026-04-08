import type { ReactNode } from 'react'
import RouteProviders from '../route-providers'

interface ProtectedLayoutProps {
  children: ReactNode
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <RouteProviders>{children}</RouteProviders>
}
