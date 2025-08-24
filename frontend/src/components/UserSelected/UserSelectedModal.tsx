import React, { useEffect, useState } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import PrivateChatBox from '../chat/PrivateChatBox';
import { Socket } from 'socket.io-client';

interface Props {
  userId: string;
  socket: Socket | null;
  onClose: () => void;
}

const UserSelectedModal: React.FC<Props> = ({ userId, socket, onClose }) => {
  const { profile, loading, error, fetchProfile, clearProfile } = useUserProfileStore();
  const [showChat, setShowChat] = useState(false);

  const handleClose = () => {
    onClose();
    clearProfile();
    setShowChat(false);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetch = async () => {
      await fetchProfile(userId);
      if (isCancelled) return;
    };

    if (userId && userId !== profile?._id) {
      fetch();
    }

    return () => {
      isCancelled = true;
    };
  }, [userId, fetchProfile, profile?._id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={handleClose} className="text-xs bg-gray-200 px-2 py-1 rounded">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  if (showChat) {
    return <PrivateChatBox recipient={profile} socket={socket} onClose={onClose} />;
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-72 z-50">
      {/* Header simple */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-900 dark:text-white">Profil</span>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
      </div>

      {/* Avatar et nom */}
      <div className="p-4 text-center">
        <div className="w-16 h-16 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-xl font-bold text-white">
            {profile.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
          {profile.username}
        </h3>
      </div>

      {/* Infos */}
      <div className="px-4 pb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Âge</span>
          <span className="text-gray-900 dark:text-white">{profile.age || '?'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Sexe</span>
          <span className="text-gray-900 dark:text-white capitalize">{profile.sexe || '?'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Ville</span>
          <span className="text-gray-900 dark:text-white">{profile.ville || '?'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowChat(true)}
          className="w-full bg-orange-400 text-white py-2 rounded text-sm hover:bg-orange-500 transition-colors"
        >
          Envoyer un message
        </button>
      </div>
    </div>
  );
};

export default UserSelectedModal;