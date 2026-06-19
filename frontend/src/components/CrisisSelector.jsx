import { useNavigate } from 'react-router-dom';
import { sosAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, Flame, AlertTriangle, ShieldAlert, Zap, X, ChevronRight, Activity, Radio, EyeOff, WifiOff, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isOnline, enqueueSOS, triggerSMSFallback } from '../services/offlineSOSQueue';

const CRISIS_TYPES = [
  {
    id: 'medical',
    label: 'Medical Emergency',
    icon: HeartPulse,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    description: 'Cardiac arrest, injury, bleeding, etc.'
  },
  {
    id: 'fire',
    label: 'Fire Outbreak',
    icon: Flame,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    description: 'Structure fire, wildfire, gas leak'
  },
  {
    id: 'crime',
    label: 'Crime / Threat',
    icon: ShieldAlert,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    description: 'Assault, robbery, active shooter'
  },
  {
    id: 'natural_disaster',
    label: 'Natural Disaster',
    icon: Zap,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    description: 'Earthquake, flood, severe storm'
  },
  {
    id: 'other',
    label: 'Other Emergency',
    icon: AlertTriangle,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    description: 'Unspecified danger or urgent help needed'
  }
];

const RADIUS_OPTIONS = [
  { value: 500, label: '500 m', description: 'Immediate vicinity' },
  { value: 1000, label: '1 km', description: 'Neighborhood' },
  { value: 2000, label: '2 km', description: 'Extended area' }
];

function CrisisSelector({ location, onClose, user, guardians }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [broadcastRadius, setBroadcastRadius] = useState(1000);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [offline, setOffline] = useState(!isOnline());
  const [smsSent, setSmsSent] = useState(false);

  // Extract guardian phone numbers for SMS fallback
  const guardianPhones = (guardians || []).map((g) => g.phone).filter(Boolean);

  // Track online/offline state in real-time
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const handleSelect = async (typeId) => {
    if (!location) {
      console.error("Location not available");
      return;
    }
    setLoading(typeId);

    const payload = {
      crisisType: typeId,
      longitude: location.longitude,
      latitude: location.latitude,
      broadcastRadius,
      isAnonymous
    };

    // ─── Offline path: queue locally + open native SMS app ───
    if (!isOnline()) {
      enqueueSOS(payload);
      try {
        triggerSMSFallback({
          crisisType: typeId,
          latitude: location.latitude,
          longitude: location.longitude,
          userName: user?.name,
          userPhone: user?.phone,
          guardianPhones
        });
        setSmsSent(true);
      } catch (err) {
        console.error('SMS fallback failed', err);
      }
      setLoading(null);
      return;
    }

    // ─── Online path: normal API call ───
    try {
      const response = await sosAPI.create(payload);
      const sosId = response.data.data._id || response.data.data.sos?._id;

      if (sosId) {
        navigate(`/sos/${sosId}`);
      } else {
        console.error('Invalid response format', response.data);
        setLoading(null);
      }
    } catch (error) {
      console.error('Failed to create SOS', error);
      // If network error, fall back to offline path
      if (!error.response) {
        enqueueSOS(payload);
        try {
          triggerSMSFallback({
            crisisType: typeId,
            latitude: location.latitude,
            longitude: location.longitude,
            userName: user?.name,
            userPhone: user?.phone,
            guardianPhones
          });
          setSmsSent(true);
        } catch (err) { /* ignored */ }
      }
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <img src="/logo.png" alt="logo" className="w-12 h-12 object-contain select-none pointer-events-none" draggable="false" /> Confirm Emergency
            </h2>
            <p className="text-sm text-gray-500">Select the type of assistance required</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {/* ── Offline Banner ── */}
          {offline && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-3">
              <WifiOff size={20} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">You are offline</p>
                <p className="text-xs text-amber-600">
                  SOS will be sent via SMS and synced to the platform when you reconnect.
                </p>
              </div>
            </div>
          )}

          {/* ── SMS Sent Confirmation ── */}
          {smsSent && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-3 flex items-center gap-3">
              <MessageSquare size={20} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">SMS App Opened</p>
                <p className="text-xs text-green-600">
                  Your messaging app should have opened with the SOS details{guardianPhones.length > 0 ? ' addressed to your guardians' : ''}.
                  Please press <strong>Send</strong> to dispatch the alert.
                  The SOS will also auto-sync to the platform when you are back online.
                </p>
              </div>
            </div>
          )}

          {/* Broadcast Radius Selector */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={14} className="text-gray-600" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Broadcast Radius</span>
            </div>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBroadcastRadius(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border ${broadcastRadius === opt.value
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="font-bold">{opt.label}</div>
                  <div className={`text-[10px] ${broadcastRadius === opt.value ? 'text-red-100' : 'text-gray-400'}`}>{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous Mode Toggle */}
          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isAnonymous
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
          >
            <EyeOff size={16} />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">Anonymous Mode</div>
              <div className={`text-[10px] ${isAnonymous ? 'text-gray-400' : 'text-gray-400'}`}>
                Hide your identity from responders (for threat-based SOS)
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors relative ${isAnonymous ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </button>

          {CRISIS_TYPES.map((type) => {
            const Icon = type.icon;
            const isLoading = loading === type.id;

            return (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(249, 250, 251, 1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(type.id)}
                disabled={loading !== null}
                className={`w-full flex items-center p-4 rounded-xl border transition-all text-left relative overflow-hidden group
                  ${type.bg} ${type.border} ${isLoading ? 'opacity-80' : 'hover:shadow-md'}
                `}
              >
                {isLoading && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.5 }}
                    className="absolute bottom-0 left-0 h-1 bg-current opacity-20"
                  />
                )}

                <div className={`p-3 rounded-full bg-white shadow-sm mr-4 ${type.color}`}>
                  <Icon size={24} />
                </div>

                <div className="flex-1">
                  <h3 className={`font-bold text-gray-900 group-hover:text-black transition-colors`}>{type.label}</h3>
                  <p className="text-xs text-gray-600">{type.description}</p>
                </div>

                <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${type.color}`}>
                  <ChevronRight />
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 border-t border-gray-100">
          False alarms are strictly penalized. Only use in real emergencies.
        </div>
      </motion.div>
    </div>
  );
}

export default CrisisSelector;