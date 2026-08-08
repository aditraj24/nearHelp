'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import MapGestureGuard from '../MapGestureGuard';
import type { Resource, ResourceType, Responder, SOS } from '@/types';

const RESOURCE_ICONS: Record<ResourceType, string> = {
  aed: '💛',
  fire_extinguisher: '🧯',
  hospital: '🏥',
  police_station: '🚔',
  fire_station: '🚒'
};

// Pre-build all resource icons once
const resourceIconCache: Record<string, L.DivIcon> = {};
const getResourceIcon = (emoji: string): L.DivIcon => {
  if (!resourceIconCache[emoji]) {
    resourceIconCache[emoji] = new L.DivIcon({
      className: 'resource-icon-wrapper',
      html: `<div style="font-size:20px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))">${emoji}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }
  return resourceIconCache[emoji];
};

const sosPulseIcon = new L.DivIcon({
  className: 'sos-pulse-wrapper',
  html: '<div class="sos-pulse-dot"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const responderIcon = new L.DivIcon({
  className: 'user-map-wrapper',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

interface SosLiveMapProps {
  sos: SOS;
  latitude: number;
  longitude: number;
  responders: Responder[];
  responderLocations: Record<string, { longitude: number; latitude: number }>;
  nearbyResources: Resource[];
}

/**
 * The live incident map on the SOS page. Loaded via `next/dynamic({ ssr: false })`.
 */
export default function SosLiveMap({
  sos,
  latitude,
  longitude,
  responders,
  responderLocations,
  nearbyResources
}: SosLiveMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      className="h-full w-full outline-none"
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
      {/* Pulsing SOS Pin */}
      <Marker position={[latitude, longitude]} icon={sosPulseIcon}>
        <Popup>
          <div className="text-center">
            <div className="font-bold text-red-600 uppercase">{sos.crisisType} Emergency</div>
            <div className="text-xs text-gray-500">{sos.address || 'Emergency Location'}</div>
          </div>
        </Popup>
      </Marker>
      <Circle
        center={[latitude, longitude]}
        radius={sos.broadcastRadius || 1000}
        pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 2 }}
      />
      {/* Responder Live Locations */}
      {Object.entries(responderLocations).map(([key, value]) => {
        const responder = responders.find(r => r.user?._id === key);
        return (
          <Marker key={key} position={[value.latitude, value.longitude]} icon={responderIcon}>
            <Popup>
              <div className="text-xs">
                <div className="font-bold">{responder?.user?.name || 'Responder'}</div>
                {(responder?.user?.skills?.length ?? 0) > 0 && (
                  <div className="text-green-600 font-medium">
                    {responder?.user.skills?.map(s => s.type?.replace('_', ' ')).join(', ')}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {/* Nearby Emergency Resources */}
      {nearbyResources.map((resource) => {
        const [rLng, rLat] = resource.location.coordinates;
        const emoji = RESOURCE_ICONS[resource.type] || '📍';
        return (
          <Marker
            key={resource._id}
            position={[rLat, rLng]}
            icon={getResourceIcon(emoji)}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold">{resource.name}</div>
                <div className="capitalize text-gray-600">{resource.type.replaceAll('_', ' ')}</div>
                {resource.address && <div className="text-gray-500">{resource.address}</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
