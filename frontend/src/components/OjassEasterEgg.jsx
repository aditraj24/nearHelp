import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SIMPLE_MESSAGE = "Yo You found an easter egg...!!";

export function useOjassEasterEgg(requiredClicks = 5, timeout = 2000) {
  const [showVideo, setShowVideo] = useState(false);
  const clickCountRef = useRef(0);
  const timerRef = useRef(null);

  const handleLogoClick = useCallback(() => {
    clickCountRef.current += 1;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (clickCountRef.current >= requiredClicks) {
      clickCountRef.current = 0;
      setShowVideo(true);

      // Simple console message
      console.log(SIMPLE_MESSAGE);
    } else {
      timerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, timeout);
    }
  }, [requiredClicks, timeout]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { handleLogoClick, showVideo, setShowVideo };
}

/**
 * Fullscreen video overlay for the Ojass easter egg.
 */
export default function OjassEasterEgg({ show, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (show && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          onClick={onClose}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-6 right-6 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm"
          >
            <X size={24} />
          </button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-full max-w-4xl px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              src="/ojass_loader.mkv"
              controls
              autoPlay
              className="w-full rounded-2xl shadow-2xl"
              onEnded={onClose}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center text-white/70 text-sm mt-4 tracking-wide"
            >
              Made with ❤️ during <span className="text-white font-semibold">Ojass Hackathon</span> — NIT Jamshedpur
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}