import type { Types } from 'mongoose';
import type { UserDocument } from '../models/user.model.js';

/**
 * Express augmentation — `authenticate` attaches the hydrated user document
 * to the request, so every downstream handler can read `req.user`.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

/**
 * Socket.io augmentation — the handshake middleware verifies the JWT and
 * stamps the authenticated user id onto the socket.
 */
declare module 'socket.io' {
  interface Socket {
    userId: string;
  }
}

/** GeoJSON point as stored by MongoDB (`[longitude, latitude]`). */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

/** Shape returned when a `User` reference is populated with a projection. */
export interface PopulatedUserRef {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
  skills?: { type: string; verified: boolean; proofDocument?: string }[];
  trustScore?: number;
  isVulnerable?: boolean;
}

export {};
