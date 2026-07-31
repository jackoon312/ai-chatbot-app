import { io } from 'socket.io-client';

let socket = null;

// We keep a single shared socket connection across the app instead of
// creating a new one every time a component mounts.
export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
