import type { ReactNode } from 'react'
import RouteProviders from '../route-providers'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <RouteProviders>{children}</RouteProviders>
}
