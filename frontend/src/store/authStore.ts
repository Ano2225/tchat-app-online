import axiosInstance from '@/utils/axiosInstance';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  isAnonymous: boolean;
  avatarUrl?: string;
  age?: number;
  ville?: string;
  sexe?: string;
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
        const currentUser = get().user;
        const currentToken = get().token;

        if (currentUser?.id && currentToken) {
          try {
            const response = await fetch(`/api/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentToken}`,
              },
            });

            if (!response.ok) {
              console.error('Erreur serveur lors de la mise à jour de lastSeen');
            }
          } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
          }
        }

        set({ user: null, token: null });
      },

      updateUser: async (data) => {
      /*  if (get().isAnonymous) {
          console.warn("🔒 Action bloquée : utilisateur anonyme.");
          return;
        }
      */
        console.log("📤 Données envoyées :", data);
      
        try {
          const response = await axiosInstance.put('/user', data);
          console.log("✅ Réponse du serveur :", response.data);
      
          set((state) => ({
            user: {
              ...state.user,
              ...response.data,
            },
          }));
          
          //return {success : true};
        } catch (error) {
          console.error('❌ Erreur updateUser:', error);
         /* const message = error.response?.data?.message || "Erreur lors de la mise à jour";
          return { success: false, message };
          */
        }
      }
      
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
