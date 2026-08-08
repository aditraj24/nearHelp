'use client';

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { type LatLngExpression } from 'leaflet';
import { resourceAPI } from '@/services/api';
import MapGestureGuard from './MapGestureGuard';
import { Activity, Flame, Building2, Shield, Truck, MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Coordinates, Resource, ResourceType } from '@/types';

/* Invalidate Leaflet size when container resizes so tiles render correctly */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

interface ResourceTypeOption {
  value: ResourceType;
  label: string;
  icon: ReactElement;
}

const RESOURCE_TYPES: ResourceTypeOption[] = [
  { value: 'aed', label: 'AED', icon: <Activity className="text-yellow-500 w-5 h-5" /> },
  { value: 'fire_extinguisher', label: 'Fire Extinguisher', icon: <Flame className="text-red-500 w-5 h-5" /> },
  { value: 'hospital', label: 'Hospital', icon: <Building2 className="text-blue-600 w-5 h-5" /> },
  { value: 'police_station', label: 'Police Station', icon: <Shield className="text-blue-800 w-5 h-5" /> },
  { value: 'fire_station', label: 'Fire Station', icon: <Truck className="text-red-600 w-5 h-5" /> }
];

const buildIcon = (icon?: ReactElement): L.DivIcon => {
  const iconMarkup = renderToStaticMarkup(icon || <MapPin className="text-gray-500 w-5 h-5" />);
  return new L.DivIcon({
    className: 'resource-icon-wrapper',
    html: `<div style="line-height:1; background: white; border-radius: 50%; padding: 4px; border: 1px solid #ccc; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));">${iconMarkup}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const iconMap = Object.fromEntries(
  RESOURCE_TYPES.map((r) => [r.value, buildIcon(r.icon)])
) as Record<ResourceType, L.DivIcon>;

interface ResourceMapProps {
  location: Coordinates | null;
}

interface ResourceForm {
  name: string;
  type: ResourceType;
  address: string;
  description: string;
}

function ResourceMap({ location }: ResourceMapProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<ResourceType | 'all'>('all');
  const [form, setForm] = useState<ResourceForm>({ name: '', type: 'aed', address: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const loadResources = async () => {
    try {
      if (location) {
        const res = await resourceAPI.getNearby(location.longitude, location.latitude, 10000);
        setResources(res.data.data.resources || []);
      } else {
        const res = await resourceAPI.getAll();
        setResources(res.data.data.resources || []);
      }
    } catch (err) {
      console.error('Failed to load resources', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    setSaving(true);
    try {
      await resourceAPI.add({
        ...form,
        longitude: location.longitude,
        latitude: location.latitude
      });
      setShowAddForm(false);
      setForm({ name: '', type: 'aed', address: '', description: '' });
      await loadResources();
    } catch (err) {
      console.error('Failed to add resource', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    if (!location) return;
    try {
      await resourceAPI.seed(location.longitude, location.latitude);
      await loadResources();
    } catch (err) {
      console.error('Failed to seed resources', err);
    }
  };

  const filtered = useMemo(
    () => (filter === 'all' ? resources : resources.filter((r) => r.type === filter)),
    [resources, filter]
  );

  const center: LatLngExpression = location
    ? [location.latitude, location.longitude]
    : [28.6139, 77.209];

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Community Resource Map</h3>
        <div className="flex gap-2">
          {location && (
             <button
               onClick={handleSeed}
               className="text-sm bg-gray-200 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-300"
             >
               Seed Data
             </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg"
          >
            {showAddForm ? 'Cancel' : '+ Add Resource'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="e.g. Building A AED"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ResourceType })}
                className="w-full px-3 py-2 border rounded text-sm"
              >
                {RESOURCE_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Address (optional)"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Description (optional)"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Resource at My Location'}
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All ({resources.length})
        </button>
        {RESOURCE_TYPES.map((r) => {
          const count = resources.filter((res) => res.type === r.value).length;
          return (
            <button
              key={r.value}
              onClick={() => setFilter(r.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${filter === r.value ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <span className={filter === r.value ? 'text-white' : ''}>{r.icon}</span>
              {r.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="h-72 rounded-lg overflow-hidden border relative isolate">
        <MapContainer center={center} zoom={14} className="h-full w-full" preferCanvas={true}>
          <InvalidateOnResize />
          <MapGestureGuard />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            updateWhenZooming={false}
            updateWhenIdle={true}
            keepBuffer={8}
            maxZoom={19}
          />
          {location && (
            <Marker
              position={[location.latitude, location.longitude]}
              icon={new L.DivIcon({
                className: 'user-map-wrapper',
                html: '<div class="user-map-dot"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })}
            >
              <Popup>You are here</Popup>
            </Marker>
          )}
          {filtered.map((resource) => {
            const [lng, lat] = resource.location.coordinates;
            return (
              <Marker key={resource._id} position={[lat, lng]} icon={iconMap[resource.type] || iconMap.aed}>
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{resource.name}</div>
                    <div className="capitalize text-gray-600">{resource.type.replaceAll('_', ' ')}</div>
                    {resource.address && <div className="text-gray-500">{resource.address}</div>}
                    {resource.description && <div className="mt-1">{resource.description}</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        {filtered.length} resource{filtered.length !== 1 ? 's' : ''} shown. Add AEDs, fire extinguishers, and
        other emergency resources to help your community.
      </p>
    </div>
  );
}

export default ResourceMap;
