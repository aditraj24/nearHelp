import { sosAPI } from './api';

const QUEUE_KEY = 'nearhelp_offline_sos_queue';

export const isOnline = () => navigator.onLine;

export const getQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveQueue = (queue) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const enqueueSOS = (payload) => {
  const queue = getQueue();
  queue.push({
    ...payload,
    queuedAt: new Date().toISOString(),
    synced: false
  });
  saveQueue(queue);
  return queue;
};

export const syncOfflineQueue = async () => {
  const queue = getQueue();
  const pending = queue.filter((item) => !item.synced);

  if (!pending.length) return [];

  const results = [];

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

      const sosId = res.data?.data?.sos?._id || res.data?.data?._id;
      item.synced = true;
      item.syncedSosId = sosId;
      results.push({ success: true, sosId });
    } catch (err) {
      results.push({
        success: false,
        error: err?.response?.data?.message || err.message
      });
    }
  }

  saveQueue(queue);
  return results;
};

export const clearSyncedQueue = () => {
  const queue = getQueue().filter((item) => !item.synced);
  saveQueue(queue);
};

const CRISIS_LABELS = {
  medical: 'Medical Emergency',
  fire: 'Fire Outbreak',
  crime: 'Crime / Threat',
  natural_disaster: 'Natural Disaster',
  other: 'Other Emergency'
};

export const buildSOSSmsBody = ({ crisisType, latitude, longitude, userName, userPhone }) => {
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
}) => {
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

export const attachAutoSync = (onSyncComplete) => {
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