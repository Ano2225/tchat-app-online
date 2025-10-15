import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/utils/axiosInstance';
import BlockedUsers from '@/components/settings/BlockedUsers';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, updateUser } = useAuthStore();
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || '');
  const [selectedBg, setSelectedBg] = useState(user?.bgColor || 'bg-orange-400');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'blocked'>('profile');
  
  // Debug
  console.log('User data:', user);
  console.log('isAnonymous:', user?.isAnonymous);
  console.log('role:', user?.role);

  const predefinedAvatars = [
    '👤', '👨', '👩', '🧑', '👦', '👧',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
    '🌟', '⭐', '🔥', '💎', '🎯', '🚀'
  ];
  
  const backgroundColors = [
    'bg-orange-400', 'bg-red-400', 'bg-blue-400', 'bg-green-400',
    'bg-purple-400', 'bg-pink-400', 'bg-yellow-400', 'bg-indigo-400'
  ];

  const handleAvatarSelect = async (avatar: string) => {
    if (!user?.id || user?.isAnonymous === true) {
      console.log('Utilisateur non autorisé');
      return;
    }

    try {
      await axiosInstance.put(`/user/avatar`, { avatar, bgColor: selectedBg });
      setSelectedAvatar(avatar);
      updateUser({ ...user, avatarUrl: avatar, bgColor: selectedBg });
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };
  
  const handleBgSelect = async (bgColor: string) => {
    if (!user?.id || user?.isAnonymous === true) {
      console.log('Utilisateur non autorisé');
      return;
    }

    try {
      await axiosInstance.put(`/user/avatar`, { avatar: selectedAvatar, bgColor });
      setSelectedBg(bgColor);
      updateUser({ ...user, bgColor });
    } catch (error) {
      console.error('Error updating background:', error);
    }
  };



  // Si isAnonymous est undefined, l'utilisateur est inscrit
  if (user?.isAnonymous === true) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profil</h2>
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-xl font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paramètres</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Onglets */}
        <div className="flex mb-4 border-b border-gray-200 dark:border-gray-600">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'profile'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Profil
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'blocked'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Utilisateurs bloqués
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'profile' ? (
          <>
            {/* Avatar actuel */}
            <div className="text-center mb-6">
              <div className={`w-20 h-20 mx-auto mb-2 rounded-full flex items-center justify-center ${selectedBg}`}>
                <span className="text-2xl text-white">{selectedAvatar || user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user?.username}</p>
            </div>

            {/* Avatars prédéfinis */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatars prédéfinis</h3>
              <div className="grid grid-cols-6 gap-2">
                {predefinedAvatars.map((avatar, index) => (
                  <button
                    key={index}
                    onClick={() => handleAvatarSelect(avatar)}
                    disabled={uploading}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedAvatar === avatar ? 'border-orange-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleurs de fond */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Couleur de fond</h3>
              <div className="grid grid-cols-4 gap-2">
                {backgroundColors.map((bgColor, index) => (
                  <button
                    key={index}
                    onClick={() => handleBgSelect(bgColor)}
                    className={`w-10 h-10 rounded-full border-2 ${bgColor} ${
                      selectedBg === bgColor ? 'border-gray-800 dark:border-white' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {uploading && (
              <div className="text-center text-sm text-gray-500 mb-4">
                Mise à jour en cours...
              </div>
            )}
          </>
        ) : (
          <BlockedUsers />
        )}

        <button
          onClick={onClose}
          className="w-full bg-orange-400 text-white py-2 rounded hover:bg-orange-500"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;