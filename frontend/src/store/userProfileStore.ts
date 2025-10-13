import { create } from 'zustand';
import axiosInstance from '@/utils/axiosInstance';

export interface UserProfile {
  _id: string;
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

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async (id) => {
    if (!id) {
      console.error('ID utilisateur invalide');
      return;
    }

    const { profile, loading } = get();
    if (loading || profile?._id === id) return;

    set({ loading: true, error: null });

    try {
      const res = await axiosInstance.get(`/user/${id}`);
      set({ profile: res.data, loading: false });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Erreur réseau inconnue';
      
      console.error('Erreur fetch profil:', { id, error: errorMessage });
      set({ error: errorMessage, loading: false, profile: null });
    }
  },

  clearProfile: () => set({ profile: null, error: null }),
}));
