import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/utils/axiosInstance';
import BlockedUsers from '@/components/settings/BlockedUsers';
import AvatarUpload from '@/components/ui/AvatarUpload';
import { getAvatarColor, getInitials } from '@/utils/avatarUtils';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');

  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'blocked'>('profile');
  
  // Debug
  console.log('User data:', user);
  console.log('isAnonymous:', user?.isAnonymous);
  console.log('role:', user?.role);

  const predefinedAvatars = [
    '👤', '👨', '👩', '🧑', '👦', '👧',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  ];
  


  const handleAvatarSelect = async (avatar: string) => {
    if (!user?.id || user?.isAnonymous === true) {
      console.log('Utilisateur non autorisé');
      return;
    }

    try {
      setUploading(true);
      await axiosInstance.put(`/user`, { 
        username: user.username,
        age: user.age,
        ville: user.ville,
        avatarUrl: avatar 
      });
      setSelectedAvatar(avatar);
      updateUser({ ...user, avatarUrl: avatar });
    } catch (error) {
      console.error('Error updating avatar:', error);
    } finally {
      setUploading(false);
    }
  };
  




  // Si isAnonymous est undefined, l'utilisateur est inscrit
  if (user?.isAnonymous === true) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profil</h2>
          <div className="text-center mb-4">
            <div className={`w-16 h-16 bg-gradient-to-r ${getAvatarColor(user?.username || '')} rounded-full flex items-center justify-center mx-auto mb-2`}>
              <span className="text-xl font-bold text-white">
                {getInitials(user?.username || '')}
              </span>
            </div>
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
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <h2 className="text-xl font-bold text-white mb-2">⚙️ Paramètres</h2>
          <p className="text-white/80 text-sm">Personnalisez votre profil</p>
        </div>

        {/* Onglets modernes */}
        <div className="p-6 pb-0">
          <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              👤 Profil
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'blocked'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🚫 Bloqués
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="px-6 pb-6">
          
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Section Avatar avec upload */}
              <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">📸 Photo de profil</h3>
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {/* Avatar actuel */}
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-lg mb-2">
                      {(selectedAvatar && selectedAvatar.startsWith('http')) || (user?.avatarUrl && user.avatarUrl.startsWith('http')) ? (
                        <img src={(selectedAvatar || user?.avatarUrl || '').replace(/&amp;/g, '&').replace(/&#x2F;/g, '/')} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-r ${getAvatarColor(user?.username || '')}`}>
                          <span className="text-2xl text-white">
                            {selectedAvatar && !selectedAvatar.startsWith('http') ? selectedAvatar : getInitials(user?.username || '')}
                          </span>
                        </div>
                      )}
                    </div>
                    <AvatarUpload
                      currentAvatar={(selectedAvatar && selectedAvatar.startsWith('http')) ? selectedAvatar : (user?.avatarUrl && user.avatarUrl.startsWith('http')) ? user.avatarUrl : undefined}
                      onAvatarUpdate={(avatarUrl) => {
                        if (avatarUrl && user) {
                          setSelectedAvatar(avatarUrl);
                          updateUser({ ...user, avatarUrl });
                        } else if (user) {
                          setSelectedAvatar('');
                          updateUser({ ...user, avatarUrl: undefined });
                        }
                      }}
                      className="absolute -bottom-2 -right-2"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user?.username}</p>
              </div>

              {/* Avatars prédéfinis */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">😀 Avatars prédéfinis</h3>
                <div className="grid grid-cols-6 gap-3">
                  {predefinedAvatars.map((avatar, index) => (
                    <button
                      key={index}
                      onClick={() => handleAvatarSelect(avatar)}
                      disabled={uploading}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 ${
                        selectedAvatar === avatar ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>



              {uploading && (
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-600 dark:text-blue-400">Mise à jour en cours...</span>
                  </div>
                </div>
              )}
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