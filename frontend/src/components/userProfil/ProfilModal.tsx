import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Dialog } from '@headlessui/react';
import { Socket } from 'socket.io-client';


interface ProfileModalProps {
  user: {
    username?: string;
    age?: number;
    ville?: string;
    sexe?: string; 
    avatarUrl?: string;
  };
  socket : Socket | null;
  onClose: () => void;
}

const ProfileModal = ({ user, onClose, socket }: ProfileModalProps) => {
  const updateUser = useAuthStore((state) => state.updateUser);

  const [username, setUsername] = useState(user.username || '');
  const [age, setAge] = useState(user.age?.toString() || '');
  const [ville, setVille] = useState(user.ville || '');
  const sexe = user.sexe || 'Non spécifié'; // ✅ Valeur affichée mais non modifiable

  const handleSubmit = () => {
    updateUser({
      username,
      age: parseInt(age, 10),
      ville,
    });

    console.log('🔁 Mise à jour des infos :', { username, age, ville });

    socket?.emit('update_username', username)

    onClose();
  };

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded shadow">
          <Dialog.Title className="text-xl font-bold mb-4 text-black">👤 Mon profil</Dialog.Title>
          
          <div className="flex flex-col gap-4 text-black">
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


export default ProfileModal