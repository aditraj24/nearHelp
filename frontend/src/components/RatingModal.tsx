'use client';

import { useState } from 'react';
import { sosAPI } from '@/services/api';
import { Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Responder } from '@/types';

interface RatingModalProps {
  sosId: string;
  responders: Responder[];
  debrief?: string;
  onClose: () => void;
}

function RatingModal({ sosId, responders, debrief, onClose }: RatingModalProps) {
  const [ratedResponders, setRatedResponders] = useState<Record<string, number>>({});

  const handleRate = async (responderId: string, rating: number) => {
    try {
      await sosAPI.rate(sosId, responderId, {
        rating,
        feedback: 'User provided rating'
      });
      setRatedResponders(prev => ({ ...prev, [responderId]: rating }));
    } catch (error) {
      console.error('Rating failed', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="bg-green-600 p-6 text-white text-center">
           <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
             <Check size={32} />
           </div>
           <h2 className="text-2xl font-bold">Safe &amp; Sound</h2>
           <p className="opacity-90 mt-1 text-sm">Emergency resolved successfully.</p>
        </div>

        <div className="p-6">
           {debrief && (
             <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 italic border border-gray-100 mb-6 text-center">
               &quot;{debrief}&quot;
             </div>
           )}

           {responders.length > 0 && (
             <>
               <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Rate Responders</h3>
               <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                 {responders.map((r) => {
                   const rating = ratedResponders[r.user._id] || 0;
                   return (
                     <div key={r.user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                       <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                            <span className="text-xs font-bold">{r.user.name.charAt(0)}</span>
                         </div>
                         <div className="text-sm font-medium">{r.user.name}</div>
                       </div>

                       <div className="flex gap-1">
                         {[1, 2, 3, 4, 5].map((star) => (
                           <button
                             key={star}
                             onClick={() => handleRate(r.user._id, star)}
                             className={`transition-colors ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                             disabled={rating > 0}
                           >
                             <Star size={16} fill={star <= rating ? "currentColor" : "none"} />
                           </button>
                         ))}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </>
           )}

           <button
             onClick={onClose}
             className="w-full mt-6 btn-primary h-12 flex items-center justify-center gap-2"
           >
             Return to Dashboard
           </button>
        </div>
      </motion.div>
    </div>
  );
}

export default RatingModal;
