import { create } from 'zustand';
import { Socket } from 'socket.io-client';

interface SocketStore {
  socket: Socket | null;
  setSocket: (socket: Socket) => void;
  disconnectSocket: () => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
  disconnectSocket: () => set({ socket: null }),
}));
