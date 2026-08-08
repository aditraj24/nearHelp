import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * The Socket.io client must reach the Express server *directly* — never through
 * Next's `rewrites()` proxy. That proxy forwards the WebSocket upgrade but drops
 * the `accessToken` cookie, so the server's handshake middleware rejects the
 * connection and the socket silently never connects.
 *
 * Connecting straight to the backend origin is safe: cookies ignore the port, so
 * the httpOnly cookie set on `localhost` (or on your API domain in production)
 * is still sent with the handshake. The JWT is never exposed to JavaScript.
 *
 * Set NEXT_PUBLIC_SOCKET_URL (or NEXT_PUBLIC_API_URL) in any deployed
 * environment; the localhost default only covers local development.
 */
const resolveSocketUrl = (): string =>
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export const initSocket = (): Socket => {
  if (socket) return socket;

  socket = io(resolveSocketUrl(), {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    // Fall through to long-polling if the WebSocket upgrade is blocked.
    tryAllTransports: true
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (err: Error) => {
    console.error('Socket connection failed:', err.message);
  });

  socket.on('error', (err: unknown) => {
    console.error('Socket error:', err);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const updateLocation = (longitude: number, latitude: number): void => {
  socket?.emit('update_location', { longitude, latitude });
};

export const broadcastSOS = (sosId: string): void => {
  socket?.emit('broadcast_sos', { sosId });
};

export const acceptSOS = (sosId: string): void => {
  socket?.emit('accept_sos', { sosId });
};

export const sendMessage = (sosId: string, message: string, responderId: string | null = null): void => {
  socket?.emit('send_message', { sosId, message, responderId });
};

export const shareLiveLocation = (
  sosId: string,
  longitude: number,
  latitude: number,
  responderId: string | null = null
): void => {
  socket?.emit('share_live_location', { sosId, longitude, latitude, responderId });
};
