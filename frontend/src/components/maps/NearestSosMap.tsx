'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import MapGestureGuard from '../MapGestureGuard';
import type { Coordinates } from '@/types';

interface FitBoundsProps {
  userLocation: Coordinates | null;
  sosLocation: [number, number] | null;
}

function FitBounds({ userLocation, sosLocation }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    if (userLocation && sosLocation) {
      const bounds = L.latLngBounds(
        [userLocation.latitude, userLocation.longitude],
        [sosLocation[0], sosLocation[1]]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (sosLocation) {
      map.setView([sosLocation[0], sosLocation[1]], 15);
    }
  }, [map, userLocation, sosLocation]);
  return null;
}

interface NearestSosMapProps {
  userLocation: Coordinates;
  /** `[latitude, longitude]` of the nearest active SOS. */
  sosLocation: [number, number];
}

/**
 * Mini map on the dashboard showing the user and the nearest active SOS.
 * Loaded via `next/dynamic({ ssr: false })` — Leaflet needs `window`.
 */
export default function NearestSosMap({ userLocation, sosLocation }: NearestSosMapProps) {
  const sosPulseIcon = useMemo(() => new L.DivIcon({
    className: 'sos-pulse-wrapper',
    html: '<div class="sos-pulse-dot"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  }), []);

  const userIcon = useMemo(() => new L.DivIcon({
    className: 'user-map-wrapper',
    html: '<div class="user-map-dot"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  }), []);

  return (
    <MapContainer
      center={sosLocation}
      zoom={14}
      className="h-full w-full"
      zoomControl={false}
      preferCanvas={true}
    >
      <MapGestureGuard />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        updateWhenZooming={false}
        updateWhenIdle={true}
        keepBuffer={8}
        maxZoom={19}
      />
      <FitBounds userLocation={userLocation} sosLocation={sosLocation} />
      <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon} />
      <Marker position={sosLocation} icon={sosPulseIcon} />
    </MapContainer>
  );
}
