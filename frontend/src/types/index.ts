/** Domain types mirroring the Express/Mongoose models in `backend/src/models`. */

export type CrisisType = 'medical' | 'fire' | 'crime' | 'natural_disaster' | 'other';
export type SosStatus = 'active' | 'responding' | 'resolved' | 'cancelled';
export type UserRole = 'user' | 'admin';
export type SkillType = 'cpr' | 'first_aid' | 'fire_safety' | 'medical_professional' | 'security';
export type ResourceType = 'aed' | 'fire_extinguisher' | 'hospital' | 'police_station' | 'fire_station';
export type BroadcastRadius = 500 | 1000 | 2000;
export type WelfareResponse = 'fine' | 'need_help';

export interface UserSkill {
  type: SkillType;
  verified: boolean;
  proofDocument?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  role: UserRole;
  skills?: UserSkill[];
  trustScore?: number;
  totalResponses?: number;
  positiveRatings?: number;
  falseAlerts?: number;
  isSuspended?: boolean;
  isActive?: boolean;
  guardians?: User[];
  isVulnerable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** GeoJSON point — coordinates are `[longitude, latitude]`. */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface Coordinates {
  longitude: number;
  latitude: number;
}

export interface Responder {
  _id?: string;
  user: User;
  acceptedAt: string;
  rating: number | null;
}

export interface CrisisGuidance {
  steps: string[];
  emergencyScript: string;
}

export interface SOS {
  _id: string;
  broadcaster: User | null;
  crisisType: CrisisType;
  location: GeoPoint;
  address?: string;
  broadcastRadius?: BroadcastRadius;
  status: SosStatus;
  responders: Responder[];
  isAnonymous?: boolean;
  isFalseAlert?: boolean;
  aiGuidance?: CrisisGuidance;
  emergencySummary?: string;
  resolvedAt?: string;
  timeToAcceptance?: number;
  timeToResolution?: number;
  guardianNotified?: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Injected by `GET /api/sos/history` for SOS the current user responded to. */
  myRating?: number | null;
  myAcceptedAt?: string | null;
}

export interface Resource {
  _id: string;
  name: string;
  type: ResourceType;
  location: GeoPoint;
  address?: string;
  description?: string;
  addedBy?: User | string;
  verified?: boolean;
}

export interface WelfareCheck {
  _id: string;
  crisisType: CrisisType;
  address?: string;
  resolvedAt: string;
  welfareCheckDue?: string;
  welfareCheckSent?: boolean;
}

/** Every backend route replies with this envelope (see `utils/ApiResponse.ts`). */
export interface ApiEnvelope<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

// ---------- Socket event payloads ----------

export interface SOSAlert {
  sosId: string;
  crisisType: CrisisType;
  location: GeoPoint;
  address?: string;
  broadcaster: User | null;
  eta: number | null;
  distance: number | null;
  isGuardianAlert?: boolean;
  wardName?: string;
  /** Present on some payloads for display convenience. */
  broadcasterName?: string;
}

export interface ChatMessage {
  sosId: string;
  responderId: string | null;
  senderId: string;
  message: string;
  timestamp: string;
}

export interface LiveLocationUpdate {
  sosId: string;
  responderId: string;
  userId: string;
  longitude: number;
  latitude: number;
  timestamp: string;
}

export interface AiChatMessage {
  sender: 'ai' | 'user';
  text: string;
}

// ---------- UI ----------

export type PopupType = 'success' | 'error' | 'info' | 'warning';

export interface Popup {
  type: PopupType;
  message: string;
}

// ---------- Admin ----------

export interface AdminStats {
  totalSOS: number;
  activeSOS: number;
  resolvedSOS: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  falseAlertRate: number;
  totalUsers: number;
  suspendedUsers: number;
  sosByType: { _id: string; count: number }[];
  responseTimeByDay: { _id: string; avgTime: number; count: number }[];
}

export interface LocalityStat {
  _id: string;
  totalSOS: number;
  activeSOS: number;
  avgResponseTime: number | null;
  falseAlerts: number;
}
