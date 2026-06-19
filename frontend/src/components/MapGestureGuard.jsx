import { useEffect, useState, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Disables single-finger map dragging on touch devices so the page can scroll normally.
 * Shows a brief "Use two fingers to move the map" overlay on single-finger touch.
 * Two-finger gestures pan/zoom the map as expected.
 */
export default function MapGestureGuard() {
  const map = useMap();
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef(null);
  const isTouchDevice = useRef(false);

  const clearHintTimer = useCallback(() => {
    if (hintTimer.current) {
      clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
  }, []);

  useEffect(() => {
    // Only activate on touch-capable devices
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice.current) return;

    // Disable single-finger drag on mount
    map.dragging.disable();

    const container = map.getContainer();

    const handleTouchStart = (e) => {
      if (e.touches.length >= 2) {
        // Two fingers → enable dragging so user can pan
        map.dragging.enable();
        setShowHint(false);
        clearHintTimer();
      } else if (e.touches.length === 1) {
        // Single finger → show hint briefly
        map.dragging.disable();
        setShowHint(true);
        clearHintTimer();
        hintTimer.current = setTimeout(() => setShowHint(false), 1500);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        // All fingers lifted or back to 1 → disable dragging
        map.dragging.disable();
      }
      if (e.touches.length === 0) {
        clearHintTimer();
        hintTimer.current = setTimeout(() => setShowHint(false), 400);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      clearHintTimer();
      // Re-enable dragging on cleanup so desktop isn't affected
      map.dragging.enable();
    };
  }, [map, clearHintTimer]);

  if (!showHint) return null;

  return (
    <div className="map-gesture-overlay">
      <span className="map-gesture-text">Use two fingers to move the map</span>
    </div>
  );
}
