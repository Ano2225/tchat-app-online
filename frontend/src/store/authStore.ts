import axiosInstance from '@/utils/axiosInstance';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  isAnonymous: boolean;
  avatarUrl?: string;
  bgColor?: string;
  age?: number;
  ville?: string;
  sexe?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAnonymous: boolean;
  login: (userData: { user: User; token: string }) => void;
  logout: () => Promise<void>;
  updateUser: (newUserData: Partial<User>) => void;
  setIsAnonymous: (isAnonymous: boolean) => void;

}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAnonymous: false,
      setIsAnonymous: (isAnonymous) => set({ isAnonymous }),

      login: ({ user, token }) => set({ user, token }),

      logout: async () => {
        const { user: currentUser, token: currentToken } = get();

        // Fire and forget - don't wait for server response
        if (currentUser?.id && currentToken) {
          fetch(`/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentToken}`,
            },
          }).catch(() => {}); // Silently ignore errors
        }

        set({ user: null, token: null });
      },

      updateUser: async (data) => {
      /*  if (get().isAnonymous) {
          console.warn("🔒 Action bloquée : utilisateur anonyme.");
          return;
        }
      */
        try {
          const response = await axiosInstance.put('/user', data);
      
          set((state) => ({
            user: {
              ...state.user,
              ...response.data,
            },
          }));
        } catch (error) {
          console.error('Failed to update user:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            data,
            timestamp: new Date().toISOString()
          });
        }
      }
      
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
