import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
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
    (set, get) => ({
      user: null,
      token: null,
      login: ({ user, token }) => set({ user, token }), // Mise à jour de l'état avec l'utilisateur et le token
      logout: async () => {
        const currentUser = get().user;
        const currentToken = get().token;
      
        if (currentUser?.id && currentToken) {
          try {
            const response = await fetch(`/api/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`,
              },
            });
            
            if (response.ok) {
              // Mise à jour réussie
            } else {
              console.error('Erreur serveur lors de la mise à jour de lastSeen');
            }
          } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
          }
        }
      
        // Réinitialisation des données utilisateur dans le store
        set({ user: null, token: null });
      }      
      
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage), // Utilisation du stockage local pour la persistance
    }
  )
);
