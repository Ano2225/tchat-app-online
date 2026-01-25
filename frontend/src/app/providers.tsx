'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

const publicPaths = ['/', '/login', '/register', '/anonymous', '/forgot-password', '/reset-password'];

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const token = useAuthStore((state) => state.token);
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = () => {
    const isPublicPath = publicPaths.includes(pathname);
    
    const allowAnonymousPublic =
      isAnonymous && (pathname === '/login' || pathname === '/register');

    if (!token && !isPublicPath) {
      router.push('/anonymous');
    } else if (token && isPublicPath && !allowAnonymousPublic) {
      router.push('/chat');
    }
    
    setIsLoading(false);
  };

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
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (!theme && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    handleNavigation();
  }, [hasHydrated, token, isAnonymous, pathname, router]);

  if (isLoading || !hasHydrated || !themeReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  return <>{children}</>;
}
