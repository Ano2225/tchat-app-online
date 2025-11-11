import { useEffect, useRef, useCallback, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseOptimizedSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

export const useOptimizedSocket = (options: UseOptimizedSocketOptions = {}) => {
  const {
    url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000',
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options

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
      connect()
    }

    return () => {
      try {
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