'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

const publicPaths = ['/', '/login', '/register', '/anonymous'];

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = () => {
    const isPublicPath = publicPaths.includes(pathname);
    
    if (!token && !isPublicPath) {
      router.push('/anonymous');
    } else if (token && isPublicPath) {
      router.push('/chat');
    }
    
    setIsLoading(false);
  };

  useEffect(handleNavigation, [token, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}

