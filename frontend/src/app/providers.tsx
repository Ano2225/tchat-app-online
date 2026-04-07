'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

const publicPaths = ['/', '/login', '/register', '/anonymous', '/forgot-password', '/reset-password'];

export default function AuthProvider({ children }: AuthProviderProps) {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [cookieHydrating, setCookieHydrating] = useState(false);
  const token = useAuthStore((state) => state.token);
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = publicPaths.includes(pathname);

  const handleNavigation = () => {
    const currentToken = useAuthStore.getState().token;
    const currentAnonymous = useAuthStore.getState().isAnonymous;
    const allowAnonymousPublic =
      currentAnonymous && (pathname === '/login' || pathname === '/register');

    if (!currentToken && !isPublicPath) {
      router.push('/anonymous');
    } else if (currentToken && isPublicPath && !allowAnonymousPublic) {
      router.push('/chat');
    }
  };

  // Step 1: wait for Zustand to rehydrate from localStorage (synchronous after mount)
  useEffect(() => {
    const isHydrated = useAuthStore.persist?.hasHydrated?.();
    if (isHydrated) {
      setHasHydrated(true);
      return;
    }
    const unsubscribe = useAuthStore.persist?.onFinishHydration?.(() => {
      setHasHydrated(true);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Step 2: after localStorage hydration, try to restore token from httpOnly cookie
  // Only on protected paths — public pages render immediately
  useEffect(() => {
    if (!hasHydrated) return;
    const { token: memToken } = useAuthStore.getState();
    if (memToken || isPublicPath) {
      handleNavigation();
      return;
    }
    // Protected path, no token in memory — try cookie restore
    setCookieHydrating(true);
    useAuthStore.getState().hydrateSession().then(() => {
      setCookieHydrating(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  // Step 3: re-evaluate navigation on state changes
  useEffect(() => {
    if (!hasHydrated || cookieHydrating) return;
    handleNavigation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, cookieHydrating, token, isAnonymous, pathname]);

  // Public pages: render immediately — no spinner, no network wait.
  // The inline <script> in layout.tsx already applied the theme class synchronously.
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Protected pages: show spinner only while resolving session
  if (!hasHydrated || cookieHydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400" />
      </div>
    );
  }

  return <>{children}</>;
}
