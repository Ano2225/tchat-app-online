import { create } from 'zustand';
import axios from 'axios';

interface UserProfile {
  id: string;
  username: string;
  age?: number;
  ville?: string;
  sexe?: string;
  avatarUrl?: string;
}

interface UserProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: (id: string) => Promise<void>;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>((set) => ({
  profile: null,
  loading: false,
  error: null,

fetchProfile: async (id) => {
    if (!id) {
      console.error('ID utilisateur invalide');
      return;
    }
  
    set({ loading: true, error: null });
  
    try {
      const res = await axios.get(`/api/user/${id}`);
      set({ profile: res.data, loading: false });
    } catch (err) {
      console.error('Erreur fetch profil :', err);
      set({ error: 'Impossible de charger le profil', loading: false });
    }
  },
  
  clearProfile: () => set({ profile: null, error: null }),
}));
