import { useEffect, useRef, useCallback, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

interface UseOptimizedSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
  router?: any
}

export const useOptimizedSocket = (options: UseOptimizedSocketOptions = {}) => {
  const {
    url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000',
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    router
  } = options
  
  const logout = useAuthStore((state) => state.logout)

  const socketRef = useRef<Socket | null>(null)
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const socketConfig = useMemo(() => ({
    autoConnect,
    reconnectionAttempts,
    reconnectionDelay,
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
  }), [autoConnect, reconnectionAttempts, reconnectionDelay])

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current

    if (!socketRef.current) {
      socketRef.current = io(url, socketConfig)
    }

    return socketRef.current
  }, [url, socketConfig])

  const disconnect = useCallback(() => {
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current)
      reconnectionTimeoutRef.current = null
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const emit = useCallback((event: string, data?: any) => {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data)
      }
    } catch (error) {
      console.error('Socket emit error:', error)
    }
  }, [])

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }, [])

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      const socket = connect()
      
      // Gérer les événements de session et nom d'utilisateur
      if (socket) {
        // Session remplacée
        socket.on('session_replaced', (data) => {
          console.log('Session remplacée:', data.message)
          
          toast.error(
            data.message || 'Votre session a été remplacée par une nouvelle connexion.',
            {
              duration: 5000,
              position: 'top-center',
              style: {
                background: '#ef4444',
                color: 'white',
                fontWeight: 'bold',
              },
            }
          )
          
          setTimeout(() => {
            socket.disconnect()
            logout()
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }, 3000)
        })
        
        // Nom d'utilisateur déjà pris
        socket.on('username_taken', (data) => {
          console.log('Nom d\'utilisateur pris:', data.message)
          
          toast.error(
            data.message || 'Ce nom d\'utilisateur est déjà utilisé.',
            {
              duration: 6000,
              position: 'top-center',
              style: {
                background: '#f59e0b',
                color: 'white',
                fontWeight: 'bold',
              },
            }
          )
          
          // Rediriger vers la page de connexion anonyme pour choisir un autre nom
          setTimeout(() => {
            logout()
            if (router) {
              router.push('/anonymous')
            } else if (typeof window !== 'undefined') {
              window.location.href = '/anonymous'
            }
          }, 2000)
        })
        
        // Nom d'utilisateur réservé
        socket.on('username_reserved', (data) => {
          console.log('Nom d\'utilisateur réservé:', data.message)
          
          toast.error(
            data.message || 'Ce nom d\'utilisateur appartient à un compte enregistré.',
            {
              duration: 6000,
              position: 'top-center',
              style: {
                background: '#dc2626',
                color: 'white',
                fontWeight: 'bold',
              },
            }
          )
          
          // Rediriger vers la page de connexion
          setTimeout(() => {
            logout()
            if (router) {
              router.push('/login')
            } else if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          }, 2000)
        })
      }
    }

    return () => {
      try {
        if (socketRef.current) {
          socketRef.current.off('session_replaced')
          socketRef.current.off('username_taken')
          socketRef.current.off('username_reserved')
        }
        disconnect()
      } catch (error) {
        console.error('Socket disconnect error:', error)
      }
    }
  }, [connect, disconnect, autoConnect])

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected || false
  }
}