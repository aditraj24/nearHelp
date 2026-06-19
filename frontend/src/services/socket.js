import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || ''; // Empty string = same origin, Vite proxies /socket.io to backend
  socket = io(socketUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const updateLocation = (longitude, latitude) => {
  if (socket) {
    socket.emit('update_location', { longitude, latitude });
  }
};

export const broadcastSOS = (sosId) => {
  if (socket) {
    socket.emit('broadcast_sos', { sosId });
  }
};

export const acceptSOS = (sosId) => {
  if (socket) {
    socket.emit('accept_sos', { sosId });
  }
};

export const sendMessage = (sosId, message, responderId = null) => {
  if (socket) {
    socket.emit('send_message', { sosId, message, responderId });
  }
};

export const shareLiveLocation = (sosId, longitude, latitude, responderId = null) => {
  if (socket) {
    socket.emit('share_live_location', { sosId, longitude, latitude, responderId });
  }
};
