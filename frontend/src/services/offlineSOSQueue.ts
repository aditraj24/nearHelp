import { sosAPI, type CreateSOSInput } from './api';
import type { CrisisType } from '@/types';

const QUEUE_KEY = 'nearhelp_offline_sos_queue';

export interface QueuedSOS extends CreateSOSInput {
  queuedAt: string;
  synced: boolean;
  syncedSosId?: string;
}

export interface SyncResult {
  success: boolean;
  sosId?: string;
  error?: string;
}

export const isOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine;

export const getQueue = (): QueuedSOS[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as QueuedSOS[];
  } catch {
    return [];
  }
};

const saveQueue = (queue: QueuedSOS[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const enqueueSOS = (payload: CreateSOSInput): QueuedSOS[] => {
  const queue = getQueue();
  queue.push({
    ...payload,
    queuedAt: new Date().toISOString(),
    synced: false
  });
  saveQueue(queue);
  return queue;
};

export const syncOfflineQueue = async (): Promise<SyncResult[]> => {
  const queue = getQueue();
  const pending = queue.filter((item) => !item.synced);

  if (!pending.length) return [];

  const results: SyncResult[] = [];

  for (const item of pending) {
    try {
      const res = await sosAPI.create({
        crisisType: item.crisisType,
        longitude: item.longitude,
        latitude: item.latitude,
        address: item.address,
        broadcastRadius: item.broadcastRadius,
        isAnonymous: item.isAnonymous
      });

      const sosId = res.data?.data?.sos?._id;
      item.synced = true;
      item.syncedSosId = sosId;
      results.push({ success: true, sosId });
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      results.push({
        success: false,
        error: error?.response?.data?.message || error.message
      });
    }
  }

  saveQueue(queue);
  return results;
};

export const clearSyncedQueue = (): void => {
  const queue = getQueue().filter((item) => !item.synced);
  saveQueue(queue);
};

const CRISIS_LABELS: Record<CrisisType, string> = {
  medical: 'Medical Emergency',
  fire: 'Fire Outbreak',
  crime: 'Crime / Threat',
  natural_disaster: 'Natural Disaster',
  other: 'Other Emergency'
};

export interface SmsFallbackInput {
  crisisType: CrisisType;
  latitude: number;
  longitude: number;
  userName?: string;
  userPhone?: string;
  guardianPhones?: string[];
}

export const buildSOSSmsBody = ({
  crisisType,
  latitude,
  longitude,
  userName,
  userPhone
}: SmsFallbackInput): string => {
  const crisisLabel = CRISIS_LABELS[crisisType] || crisisType;
  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

  return [
    `EMERGENCY SOS - NearHelp`,
    ``,
    `${userName || 'A user'} (${userPhone || 'No phone'}) needs immediate help.`,
    ``,
    `Type: ${crisisLabel}`,
    `Location: ${mapsLink}`,
    ``,
    `Please respond or call back urgently.`
  ].join('\n');
};

export const triggerSMSFallback = ({
  crisisType,
  latitude,
  longitude,
  userName,
  userPhone,
  guardianPhones = []
}: SmsFallbackInput): void => {
  const body = buildSOSSmsBody({ crisisType, latitude, longitude, userName, userPhone });
  const encoded = encodeURIComponent(body);

  const recipients = guardianPhones
    .map((p) => p.replace(/\D/g, ''))
    .filter(Boolean)
    .join(',');

  const smsURI = recipients
    ? `sms:${recipients}?body=${encoded}`
    : `sms:?body=${encoded}`;

  window.location.href = smsURI;
};

let _listenerAttached = false;

export const attachAutoSync = (
  onSyncComplete?: (results: SyncResult[]) => void
): (() => void) | undefined => {
  if (_listenerAttached) return;
  _listenerAttached = true;

  const handler = async () => {
    const results = await syncOfflineQueue();
    clearSyncedQueue();
    if (onSyncComplete) onSyncComplete(results);
  };

  window.addEventListener('online', handler);

  return () => {
    window.removeEventListener('online', handler);
    _listenerAttached = false;
  };
};
