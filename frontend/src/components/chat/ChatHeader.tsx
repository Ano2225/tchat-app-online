'use client';

import React, { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ProfileModal from '../userProfil/ProfilModal';
import { Socket } from 'socket.io-client';


interface ChatHeaderProps {
  users?: {
    id: string;
    username: string;
    email?: string;
  };
    socket : Socket | null;
  
}

const ChatHeader: React.FC<ChatHeaderProps> = ({users, socket}) => {
  const { user, logout } = useAuthStore();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const openProfileModal = () => {
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 bg-gray-100 border-b">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
              onClick={openProfileModal}
              title="Voir profil"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200 cursor-pointer"
              onClick={openProfileModal}
              title="Voir profil"
            >
              <User size={20} className="text-blue-500" />
            </div>
          )}
          <h2 className="text-xl font-bold text-black">
            👋 Salut {users?.username || 'Visiteur'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openProfileModal}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            <User size={18} />
            Voir profil
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </div>

      {showProfileModal && (
        <ProfileModal 
          user={user || {}} 
          onClose={closeProfileModal} 
          socket={socket}
        />
      )}
    </>
  );
};

export default ChatHeader;
