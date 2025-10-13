'use client';

import { useAuthStore } from '@/store/authStore';

export default function DebugPage() {
  const { user, token } = useAuthStore();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Auth Store</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold">User:</h2>
        <pre>{JSON.stringify(user, null, 2)}</pre>
        
        <h2 className="font-bold mt-4">Token:</h2>
        <pre>{token}</pre>
        
        <h2 className="font-bold mt-4">LocalStorage:</h2>
        <pre>{typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : 'N/A'}</pre>
      </div>
    </div>
  );
}