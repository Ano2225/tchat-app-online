import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketStore {
  socket: Socket | null;
  initSocket: () => void;
  disconnectSocket: () => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,

  // Initialiser le socket
  initSocket: () => {
    if (get().socket) {
      console.warn('[SocketStore] Socket déjà initialisé.');
      return;
    }

    const socket = io("http://localhost:3000", {
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('[SocketStore] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[SocketStore] Disconnected');
    });

    set({ socket });
  },

  // Déconnecter le socket
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      console.log('[SocketStore] Socket déconnecté.');
    }
    set({ socket: null });
  },
}));