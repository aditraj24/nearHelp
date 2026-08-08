'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MapPin, BellRing, Heart } from 'lucide-react';
import { acceptSOS } from '@/services/socket';
import type { SOSAlert } from '@/types';

interface SOSAlertModalProps {
  alert: SOSAlert | null;
  onClose: () => void;
  onAccepted?: (sosId: string) => void;
}

function SOSAlertModal({ alert, onClose, onAccepted }: SOSAlertModalProps) {
  if (!alert) return null;

  const handleAccept = () => {
    acceptSOS(alert.sosId);
    if (onAccepted) onAccepted(alert.sosId);
    onClose();
  };

  const isGuardianAlert = alert.isGuardianAlert;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100"
          style={{ fontFamily: "'Nunito Sans', sans-serif" }}
        >
          <div className="p-8">
            {/* Requester Info */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isGuardianAlert ? 'bg-purple-100' : 'bg-red-50'}`}>
                {isGuardianAlert ? (
                  <ShieldAlert size={40} className="text-purple-600" />
                ) : (
                  <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-200">
                    <BellRing size={32} className="text-white" />
                  </div>
                )}
              </div>

              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                {isGuardianAlert ? 'Guardian Emergency' : 'Nearby Emergency'}
              </h3>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">
                {alert.broadcasterName || alert.wardName || alert.broadcaster?.name || 'Anonymous User'}
              </h2>
            </div>

            {/* Crisis & Location Details */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <ShieldAlert size={18} className="text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Emergency Status</p>
                  <p className="text-sm font-black text-gray-900 capitalize truncate">{alert.crisisType}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <MapPin size={18} className="text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</p>
                  <p className="text-sm font-black text-gray-900 truncate">
                    {alert.address?.split(',')[0] || 'Nearby Territory'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${isGuardianAlert ? 'bg-purple-600 shadow-purple-200' : 'bg-red-600 shadow-red-200 hover:bg-red-700'
                  }`}
              >
                <Heart size={18} fill="currentColor" />
                I&apos;m Responding
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-gray-600 transition-colors"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default SOSAlertModal;
