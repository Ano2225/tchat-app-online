import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Dialog } from '@headlessui/react';
import { Socket } from 'socket.io-client';

// Define your default avatars here or import them from a dedicated file
// These URLs must be publicly accessible (e.g., hosted on Cloudinary, or in your Next.js public/avatars folder)
const defaultAvatars = [
  'https://res.cloudinary.com/dssgoav3n/image/upload/v1726275142/avatars/qsd9pti6nrjojjie5tq5.jpg',
  'https://res.cloudinary.com/dssgoav3n/image/upload/v1724997562/avatars/ginehvgmrwu4uwnixxx3.jpg',
];


interface ProfileModalProps {
  user: {
    id: any;
    username?: string;
    age?: number;
    ville?: string;
    sexe?: string;
    avatarUrl?: string; 
  };
  socket: Socket | null;
  onClose: () => void;
}

const ProfileModal = ({ user, onClose, socket }: ProfileModalProps) => {
  const updateUser = useAuthStore((state) => state.updateUser);

  const [username, setUsername] = useState(user.username || '');
  const [age, setAge] = useState(user.age?.toString() || '');
  const [ville, setVille] = useState(user.ville || '');
  // State for the selected avatar URL
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(user.avatarUrl || defaultAvatars[0]);

  const sexe = user.sexe || 'Non spécifié'; // ✅ Displayed value but not editable

  // Function to handle avatar selection
  const handleAvatarSelect = (url: string) => {
    setSelectedAvatarUrl(url);
  };

  const handleSubmit = async () => {
    const newAvatarUrl = selectedAvatarUrl;

    // Update the local user state via Zustand
    updateUser({
      username,
      age: parseInt(age, 10),
      ville,
      avatarUrl: newAvatarUrl,
    });

    console.log('🔁 Mise à jour des infos (frontend) :', { username, age, ville, avatarUrl: newAvatarUrl });

    // Emit a Socket.IO event if other users need to be notified
    // This emit happens after the call to updateUser in Zustand, which itself triggers an API call.
    // For more robustness, consider returning a Promise from updateUser in Zustand and awaiting it here.
    socket?.emit('update_user_profile', { userId: user.id, username, avatarUrl: newAvatarUrl });

    onClose();
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded shadow">
          <Dialog.Title className="text-xl font-bold mb-4 text-black">👤 Mon profil</Dialog.Title>

          <div className="flex flex-col gap-4 text-black">
            {/* Selected avatar preview */}
            <div className="flex justify-center mb-4">
              {selectedAvatarUrl ? (
                <img
                  src={selectedAvatarUrl}
                  alt="Avatar sélectionné"
                  className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                  Sélectionnez un avatar
                </div>
              )}
            </div>

            {/* Grid for predefined avatar selection */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choisir un avatar
            </label>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {defaultAvatars.map((avatarUrl, index) => (
                <img
                  key={index}
                  src={avatarUrl}
                  alt={`Avatar ${index + 1}`}
                  className={`w-16 h-16 rounded-full object-cover cursor-pointer hover:border-2 hover:border-blue-500 transition-all ${
                    selectedAvatarUrl === avatarUrl ? 'border-2 border-blue-600 ring-2 ring-blue-300' : 'border border-gray-200'
                  }`}
                  onClick={() => handleAvatarSelect(avatarUrl)}
                />
              ))}
            </div>

            Username<input
              type="text"
              placeholder="Nom d'utilisateur"
              className="border px-3 py-2 rounded text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            Age
            <input
              type="number"
              placeholder="Âge"
              className="border px-3 py-2 rounded text-black"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            Ville
            <input
              type="text"
              placeholder="Ville"
              className="border px-3 py-2 rounded text-black"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
            />
            Sexe
            <input
              type="text"
              value={sexe}
              disabled
              className="border px-3 py-2 rounded bg-gray-200 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded text-gray-950 hover:bg-gray-300"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Enregistrer
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};


export default ProfileModal;