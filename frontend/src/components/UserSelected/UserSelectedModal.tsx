import React, { useEffect, useState } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import PrivateChatBox from '../chat/PrivateChatBox';

interface Props {
  userId: string;
  onClose: () => void;
}

const UserSelectedModal: React.FC<Props> = ({ userId, onClose }) => {
  const { profile, loading, error, fetchProfile } = useUserProfileStore();
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-md shadow-md">
          Chargement du profil...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0  flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-md shadow-md">
          <div className="text-red-500 mb-2">Erreur:</div>
          <div>{error}</div>
          <button 
            onClick={onClose}
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
    <div className="fixed inset-0  flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded-md shadow-md max-w-md w-full">
        {/* Entête avec bouton fermer */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Profil utilisateur</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            X
          </button>
        </div>

        {/* Informations profil */}
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
            <PrivateChatBox recipient={profile} />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSelectedModal;