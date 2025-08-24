'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
 // const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Route actuelles
    const publicPaths = ['/', '/login', '/register', '/anonymous'];
    const isPublicPath = publicPaths.includes(pathname);
    
    if (!token && !isPublicPath) {
      // Rediriger vers la page de connexion si non authentifié
      router.push('/anonymous');
    } else if (token && isPublicPath) {
      // Rediriger vers la page de chat si déjà authentifié
      router.push('/chat');
    }
    
    setIsLoading(false);
  }, [token, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}

