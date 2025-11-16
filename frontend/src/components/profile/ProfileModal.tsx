import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/utils/axiosInstance';
import BlockedUsers from '@/components/settings/BlockedUsers';
import GenderAvatar from '@/components/ui/GenderAvatar';
import AvatarUpload from '@/components/ui/AvatarUpload';
import { Settings, User, UserX, X } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'blocked'>('profile');

  const handleAvatarUpdate = (avatarUrl: string | null) => {
    if (user) {
      updateUser({ ...user, avatarUrl: avatarUrl || undefined });
    }
  };
  
  // Debug
  console.log('User data:', user);
  console.log('isAnonymous:', user?.isAnonymous);
  console.log('role:', user?.role);


  



  




  // Si isAnonymous est undefined, l'utilisateur est inscrit
  if (user?.isAnonymous === true) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profil</h2>
          <div className="text-center mb-4">
            <GenderAvatar
              username={user?.username || ''}
              avatarUrl={user?.avatarUrl}
              sexe={user?.sexe}
              size="lg"
              className="w-16 h-16 mx-auto mb-2"
              clickable={false}
            />
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Inscrivez-vous pour personnaliser votre profil
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto z-[9999] animate-in fade-in-0 zoom-in-95 duration-300">
        
        {/* Header avec gradient */}
        <div className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 p-6 text-center rounded-t-2xl">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">Paramètres</h2>
          </div>
          <p className="text-white/80 text-sm">Personnalisez votre profil</p>
        </div>

        {/* Onglets modernes */}
        <div className="p-6 pb-0">
          <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              Profil
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'blocked'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <UserX className="w-4 h-4" />
              Bloqués
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="px-6 pb-6">
          
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Section Avatar */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <User className="w-4 h-4 text-gray-900 dark:text-white" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Avatar</h3>
                </div>
                <div className="flex justify-center mb-4">
                  <GenderAvatar
                    username={user?.username || ''}
                    avatarUrl={user?.avatarUrl}
                    sexe={user?.sexe}
                    size="lg"
                    className="w-24 h-24"
                    clickable={false}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{user?.username}</p>
                
                <AvatarUpload onAvatarUpdate={handleAvatarUpdate} />
              </div>






            </div>
          ) : (
            <BlockedUsers />
          )}
        </div>

      </div>
    </>
  );
};

export default ProfileModal;