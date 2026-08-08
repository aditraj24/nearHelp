export const CRISIS_TYPES = {
  MEDICAL: 'medical',
  FIRE: 'fire',
  CRIME: 'crime',
  NATURAL_DISASTER: 'natural_disaster',
  OTHER: 'other'
} as const;

export const SOS_STATUS = {
  ACTIVE: 'active',
  RESPONDING: 'responding',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled'
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
} as const;

export const SKILL_TYPES = {
  CPR: 'cpr',
  FIRST_AID: 'first_aid',
  FIRE_SAFETY: 'fire_safety',
  MEDICAL_PROFESSIONAL: 'medical_professional',
  SECURITY: 'security'
} as const;

export type CrisisType = (typeof CRISIS_TYPES)[keyof typeof CRISIS_TYPES];
export type SosStatus = (typeof SOS_STATUS)[keyof typeof SOS_STATUS];
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type SkillType = (typeof SKILL_TYPES)[keyof typeof SKILL_TYPES];

export const BROADCAST_RADII = [500, 1000, 2000] as const;
export type BroadcastRadius = (typeof BROADCAST_RADII)[number];
