'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface ChatHeaderProps {
  user?: {
    username?: string;
  };
}

const ChatHeader = ({ user }: ChatHeaderProps) => {
  const logout = useAuthStore((state) => state.logout); 

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-100 border-b">
      <h2 className="text-xl font-bold text-black">👋 Salut {user?.username || 'Visiteur'}</h2>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
      >
        <LogOut size={18} />
        Déconnexion
      </button>
    </div>
  );
};

export default ChatHeader;
