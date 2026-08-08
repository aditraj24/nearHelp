'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { SOS } from '@/types';

const sosPulseIcon = new L.DivIcon({
  className: 'sos-pulse-wrapper',
  html: '<div class="sos-pulse-dot"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

interface AdminLiveMapProps {
  activeSOS: SOS[];
}

/**
 * City-wide live SOS map for the admin panel. Loaded via `next/dynamic({ ssr: false })`.
 */
export default function AdminLiveMap({ activeSOS }: AdminLiveMapProps) {
  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {activeSOS.map((sos) => {
        const [lng, lat] = sos.location?.coordinates || [0, 0];
        return (
          <Marker key={sos._id} position={[lat, lng]} icon={sosPulseIcon}>
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-bold text-red-600 uppercase">{sos.crisisType}</div>
                <div className="text-gray-600">{sos.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</div>
                <div className="text-gray-500">Responders: {sos.responders?.length || 0}</div>
                <div className="text-gray-500">Radius: {sos.broadcastRadius || 1000}m</div>
                <div className="text-gray-500">{new Date(sos.createdAt).toLocaleString()}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
