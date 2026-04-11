import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  email?: string
  isAnonymous: boolean
  avatarUrl?: string
  bgColor?: string
  age?: number
  ville?: string
  sexe?: string
  role?: string
  createdAt?: string
  updatedAt?: string
}

interface Session {
  id: string
  userId: string
  expiresAt: string
  token: string
}

interface AuthState {
  user: User | null
  token: string | null
  session: Session | null
  isAnonymous: boolean
  isLoading: boolean
  
  // Nouvelles méthodes better-auth
  signUp: (data: {
    email: string
    password: string
    username: string
    age?: number
    sexe?: string
    ville?: string
  }) => Promise<{ success: boolean; error?: string; verificationRequired?: boolean }>
  
  signIn: (data: {
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string; code?: string }>
  
  signInAnonymous: (username: string, extra?: { age?: number; sexe?: string }) => Promise<{ success: boolean; error?: string }>
  
  signOut: () => Promise<void>
  
  // Méthodes de compatibilité
  login: (userData: { user: User; token: string }) => void
  logout: () => Promise<void>
  updateUser: (newUserData: Partial<User>) => void
  setIsAnonymous: (isAnonymous: boolean) => void
  fetchUserProfile: () => Promise<void>
  hydrateSession: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      session: null,
      isAnonymous: false,
      isLoading: false,

      // Nouvelles méthodes better-auth
      signUp: async (data) => {
        set({ isLoading: true })
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          const result = await response.json()
          
          if (result.success) {
            const token = result.session?.token || result.token || null
            const session = result.session ? { ...result.session, token } : (token ? { token } : null)

            set({
              user: result.user || null,
              session,
              token,
              isAnonymous: result.user?.isAnonymous || false,
              isLoading: false
            })

            return { success: true, verificationRequired: !token }
          }

          set({ isLoading: false })
          return { success: false, error: result.error || result.message, code: result.code }
        } catch {
          set({ isLoading: false })
          return { success: false, error: 'Erreur de connexion' }
        }
      },

      signIn: async (data) => {
        set({ isLoading: true })
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          const result = await response.json()
          
          if (result.success) {
            const token = result.session?.token || result.token || null
            set({
              user: result.user,
              session: result.session ? { ...result.session, token } : (token ? { token } : null),
              token,
              isAnonymous: result.user?.isAnonymous || false,
              isLoading: false
            })
            return { success: true }
          }

          set({ isLoading: false })
          return { success: false, error: result.error || result.message, code: result.code }
        } catch {
          set({ isLoading: false })
          return { success: false, error: 'Erreur de connexion' }
        }
      },

      signInAnonymous: async (username, extra?: { age?: number; sexe?: string }) => {
        set({ isLoading: true })
        try {
          const response = await fetch('/api/auth/anonymous', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, ...extra })
          })
          
          const result = await response.json()
          
          if (result.success) {
            set({ 
              user: result.user, 
              session: result.session,
              token: result.session?.token || null,
              isAnonymous: true,
              isLoading: false 
            })
            return { success: true }
          }

          set({ isLoading: false })
          return { success: false, error: result.error || result.message }
        } catch {
          set({ isLoading: false })
          return { success: false, error: 'Erreur de connexion' }
        }
      },

      signOut: async () => {
        const { session } = get()
        try {
          // Always call logout so the httpOnly cookie is cleared server-side,
          // even if the in-memory token was lost on page refresh
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {})
            }
          })
        } catch (error) {
          console.error('Erreur déconnexion:', error)
        } finally {
          set({ user: null, session: null, token: null, isAnonymous: false })
        }
      },

      // Méthodes de compatibilité avec l'ancien système
      login: ({ user, token }) => {
        set({ user, token, isAnonymous: user.isAnonymous || false })
      },

      logout: async () => {
        await get().signOut()
      },

      updateUser: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : state.user
        }))
      },

      setIsAnonymous: (isAnonymous) => set({ isAnonymous }),

      fetchUserProfile: async () => {
        const { token } = get()
        if (!token) return

        try {
          const response = await fetch('/api/user/profile', {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${token}` }
          })

          if (response.ok) {
            const userData = await response.json()
            set((state) => ({
              user: { ...state.user, ...userData }
            }))
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error)
        }
      },

      // Restore session from httpOnly cookie (called on page load when no token in memory)
      hydrateSession: async () => {
        try {
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          })
          if (!response.ok) return false
          const result = await response.json()
          // token may be in result.session.token or result.token
          const token = result.session?.token || result.token || null
          if (result.user && token) {
            set({
              user: result.user,
              session: result.session ? { ...result.session, token } : { token },
              token,
              isAnonymous: result.user?.isAnonymous || false,
            })
            return true
          }
          return false
        } catch {
          return false
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist user profile and anonymous flag — token stays in memory only (XSS protection)
      partialize: (state) => ({
        user: state.user,
        isAnonymous: state.isAnonymous
      })
    }
  )
)

// Cross-tab logout sync: when another tab logs out, clear this tab too.
// Zustand persist no longer deletes the key (it sets user: null) so we check
// the parsed value instead of !e.newValue.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'auth-storage') return;
    try {
      const next = e.newValue ? JSON.parse(e.newValue) : null;
      // Zustand persist stores state under next.state, not directly on next
      if (!next?.state?.user) {
        useAuthStore.setState({ user: null, token: null, session: null, isAnonymous: false });
      }
    } catch {
      // malformed JSON — treat as logout
      useAuthStore.setState({ user: null, token: null, session: null, isAnonymous: false });
    }
  });
}

