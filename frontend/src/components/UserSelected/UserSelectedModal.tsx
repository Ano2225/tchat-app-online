import React, { useEffect, useState } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import PrivateChatBox from '../chat/PrivateChatBox';
import { Socket } from 'socket.io-client';

interface Props {
  userId: string;
  socket: Socket | null;
  onClose: () => void;
}

const UserSelectedModal: React.FC<Props> = ({ userId,socket, onClose }) => {
  const { profile, loading, error, fetchProfile, clearProfile } = useUserProfileStore();
  const [showChat, setShowChat] = useState(false);
  console.log('profil passé ', profile)

  // Fermer modal + clear
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
      <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-md shadow-md flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
          </svg>
          <span>Chargement du profil...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-md shadow-md">
          <div className="text-red-500 mb-2">Erreur :</div>
          <div>{error}</div>
          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded-md shadow-md max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Profil utilisateur</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 font-bold"
          >
            ✕
          </button>
        </div>

        {!showChat ? (
          <div>
            <div className="mb-4">
              <div className="mb-2"><strong>Username:</strong> {profile.username}</div>
              <div className="mb-2"><strong>Âge:</strong> {profile.age ?? 'Non spécifié'}</div>
              <div className="mb-2"><strong>Ville:</strong> {profile.ville ?? 'Non spécifiée'}</div>
              <div className="mb-2"><strong>Sexe:</strong> {profile.sexe ?? 'Non spécifié'}</div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowChat(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded w-full"
              >
                Envoyer un message
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setShowChat(false)}
                className="bg-gray-300 px-4 py-1 rounded mb-4"
              >
                ← Retour au profil
              </button>
            </div>
            <PrivateChatBox recipient={profile} socket={socket}/>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSelectedModal;
