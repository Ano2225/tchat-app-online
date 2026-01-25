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
  
  signInAnonymous: (username: string) => Promise<{ success: boolean; error?: string }>
  
  signOut: () => Promise<void>
  
  // Méthodes de compatibilité
  login: (userData: { user: User; token: string }) => void
  logout: () => Promise<void>
  updateUser: (newUserData: Partial<User>) => Promise<void>
  setIsAnonymous: (isAnonymous: boolean) => void
  fetchUserProfile: () => Promise<void>
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          const result = await response.json()
          
          if (result.success) {
            const session = result.session || null
            const token = session?.token || null

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
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Erreur de connexion' }
        }
      },

      signIn: async (data) => {
        set({ isLoading: true })
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          const result = await response.json()
          
          if (result.success) {
            set({ 
              user: result.user, 
              session: result.session,
              token: result.session?.token || null,
              isAnonymous: result.user?.isAnonymous || false,
              isLoading: false 
            })
            return { success: true }
          }

          set({ isLoading: false })
          return { success: false, error: result.error || result.message, code: result.code }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Erreur de connexion' }
        }
      },

      signInAnonymous: async (username) => {
        set({ isLoading: true })
        try {
          const response = await fetch('/api/auth/anonymous', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
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
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Erreur de connexion' }
        }
      },

      signOut: async () => {
        const { session } = get()
        try {
          if (session) {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
              }
            })
          }
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

      updateUser: async (data) => {
        try {
          const response = await fetch('/api/user', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().token}`
            },
            body: JSON.stringify(data)
          })
          
          if (response.ok) {
            const updatedUser = await response.json()
            set((state) => ({
              user: { ...state.user, ...updatedUser }
            }))
          }
        } catch (error) {
          console.error('Failed to update user:', error)
          throw error
        }
      },

      setIsAnonymous: (isAnonymous) => set({ isAnonymous }),

      fetchUserProfile: async () => {
        const { token } = get()
        if (!token) return
        
        try {
          const response = await fetch('/api/user/profile', {
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
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        session: state.session,
        isAnonymous: state.isAnonymous
      })
    }
  )
)
