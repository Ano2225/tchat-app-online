import { useEffect, useRef, useCallback } from 'react'
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current

    socketRef.current = io(url, {
      autoConnect,
      reconnectionAttempts,
      reconnectionDelay,
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    })

    return socketRef.current
  }, [url, autoConnect, reconnectionAttempts, reconnectionDelay])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
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
      disconnect()
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