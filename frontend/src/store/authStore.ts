import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  age?: number;
  sexe?: string;
  ville?: string;
  isAnonymous: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (userData: { user: User; token: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (userData) => set(userData),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage', // Nom de la clé dans le localStorage
      getStorage: () => localStorage,
    }
  )
);
