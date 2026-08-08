import { Types } from 'mongoose';
import { User } from '../models/user.model.js';

export interface ActiveLocation {
  longitude: number;
  latitude: number;
  timestamp: number;
}

export interface NearbyUser {
  userId: string;
  distance: number;
}

/**
 * Live responder positions are held in memory rather than MongoDB: they change
 * every few seconds and are only meaningful *right now*. Swapping this Map for
 * Redis is the single change needed to run more than one server instance.
 */
const activeLocations = new Map<string, ActiveLocation>();

export const updateUserLocation = async (
  userId: string | Types.ObjectId,
  longitude: number,
  latitude: number
): Promise<void> => {
  activeLocations.set(userId.toString(), {
    longitude,
    latitude,
    timestamp: Date.now()
  });


  await User.findByIdAndUpdate(userId, { isActive: true });
};

export const getNearbyUsers = async (
  longitude: number,
  latitude: number,
  radiusKm = 5
): Promise<NearbyUser[]> => {
  const activeUserIds = Array.from(activeLocations.keys());

  if (activeUserIds.length === 0) {
    return [];
  }


  const nearbyUsers: NearbyUser[] = [];

  for (const [userId, location] of activeLocations.entries()) {
    const distance = calculateDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    );

    if (distance <= radiusKm) {
      nearbyUsers.push({
        userId,
        distance
      });
    }
  }

  return nearbyUsers;
};

export const removeUserLocation = async (userId: string | Types.ObjectId): Promise<void> => {
  activeLocations.delete(userId.toString());
  await User.findByIdAndUpdate(userId, { isActive: false });
};

export const getUserLocation = async (
  userId: string | Types.ObjectId
): Promise<ActiveLocation | null> => {
  return activeLocations.get(userId.toString()) || null;
};

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}


setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  for (const [userId, location] of activeLocations.entries()) {
    if (now - location.timestamp > fiveMinutes) {
      activeLocations.delete(userId);
      User.findByIdAndUpdate(userId, { isActive: false }).catch(console.error);
    }
  }
}, 60000);
