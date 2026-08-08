'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { sosAPI, authAPI } from '@/services/api';
import { initSocket, updateLocation, acceptSOS } from '@/services/socket';
import { attachAutoSync, getQueue } from '@/services/offlineSOSQueue';
import CrisisSelector from '@/components/CrisisSelector';
import SOSAlertModal from '@/components/SOSAlertModal';
import ScreenPopup from '@/components/ScreenPopup';
import PageLoader from '@/components/PageLoader';
import { LogOut, History, Shield, MapPin, Bell, AlertCircle, ChevronRight, User, UserPlus, X, HeartPulse, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import OjassEasterEgg, { useOjassEasterEgg } from '@/components/OjassEasterEgg';
import { AuthGuard } from '@/components/AuthGuard';
import type { Coordinates, Popup, SkillType, SOS, SOSAlert, User as AppUser, WelfareCheck, WelfareResponse } from '@/types';

// Leaflet cannot run on the server — load the maps client-side only.
const ResourceMap = dynamic(() => import('@/components/ResourceMap'), {
  ssr: false,
  loading: () => <div className="bg-white p-6 rounded-xl shadow-md mt-6 h-96 animate-pulse" />
});
const NearestSosMap = dynamic(() => import('@/components/maps/NearestSosMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />
});

const SKILL_OPTIONS: { type: SkillType; label: string }[] = [
  { type: 'cpr', label: 'CPR' },
  { type: 'first_aid', label: 'First Aid' },
  { type: 'medical_professional', label: 'Doctor/Nurse' },
  { type: 'fire_safety', label: 'Fire Safety' },
  { type: 'security', label: 'Security' }
];

interface NearestSOS extends SOS {
  distanceKm: number;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function Dashboard() {
  const { user, logout, setAuth } = useAuthStore();
  const [showCrisisSelector, setShowCrisisSelector] = useState(false);
  const [incomingAlert, setIncomingAlert] = useState<SOSAlert | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [pendingSOS, setPendingSOS] = useState<SOS[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<SkillType[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);
  // Guardian Mode
  const [guardians, setGuardians] = useState<AppUser[]>([]);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [wards, setWards] = useState<AppUser[]>([]);
  // Welfare Check
  const [welfareChecks, setWelfareChecks] = useState<WelfareCheck[]>([]);
  const { handleLogoClick, showVideo, setShowVideo } = useOjassEasterEgg();
  const router = useRouter();

  const fetchPendingSOS = useCallback(async () => {
    try {
      const response = await sosAPI.getPending();
      const list = response.data.data.pendingSOS || [];
      const filtered = list.filter((sos) => sos.broadcaster?._id !== user?._id);
      setPendingSOS(filtered);
    } catch (error) {
      console.error('Failed to load pending SOS', error);
    }
  }, [user?._id]);

  useEffect(() => {
    setSelectedSkills((user?.skills || []).map((skill) => skill.type));
  }, [user]);

  // Load guardians, wards and welfare checks on mount
  useEffect(() => {
    const loadGuardianData = async () => {
      try {
        const [guardianRes, wardsRes, welfareRes] = await Promise.all([
          authAPI.getGuardians(),
          authAPI.getWards(),
          sosAPI.getWelfareChecks()
        ]);
        setGuardians(guardianRes.data.data.guardians || []);
        setWards(wardsRes.data.data.wards || []);
        setWelfareChecks(welfareRes.data.data.welfareChecks || []);
      } catch (e) {
        console.error('Failed to load guardian/welfare data', e);
      }
    };
    loadGuardianData();
  }, []);

  const handleAddGuardian = async () => {
    if (!guardianEmail.trim()) return;
    setGuardianLoading(true);
    try {
      const res = await authAPI.addGuardian(guardianEmail.trim());
      setGuardians(res.data.data.user.guardians || []);
      setGuardianEmail('');
      setPopup({ type: 'success', message: 'Guardian added successfully!' });
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setPopup({ type: 'error', message: err.response?.data?.message || 'Failed to add guardian' });
    } finally {
      setGuardianLoading(false);
    }
  };

  const handleRemoveGuardian = async (guardianId: string) => {
    try {
      const res = await authAPI.removeGuardian(guardianId);
      setGuardians(res.data.data.user.guardians || []);
      setPopup({ type: 'info', message: 'Guardian removed' });
    } catch {
      setPopup({ type: 'error', message: 'Failed to remove guardian' });
    }
  };

  const handleWelfareResponse = async (sosId: string, response: WelfareResponse) => {
    try {
      await sosAPI.respondToWelfareCheck(sosId, response);
      setWelfareChecks(prev => prev.filter(w => w._id !== sosId));
      setPopup({ type: 'success', message: response === 'fine' ? 'Glad you are safe!' : 'Help is being coordinated.' });
    } catch {
      setPopup({ type: 'error', message: 'Failed to submit response' });
    }
  };

  useEffect(() => {
    const socket = initSocket();

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setLocation({ longitude, latitude });
        updateLocation(longitude, latitude);
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    socket.on('sos_alert', (alert: SOSAlert) => {
      setIncomingAlert(alert);
      if (alert.isGuardianAlert) {
        setPopup({ type: 'warning', message: `GUARDIAN ALERT: ${alert.wardName || 'Your ward'} needs help!` });
      } else {
        setPopup({ type: 'warning', message: 'New SOS Alert nearby!' });
      }
      fetchPendingSOS();
    });

    socket.on('guardian_sos_alert', (alert: SOSAlert) => {
      setIncomingAlert({ ...alert, isGuardianAlert: true });
      setPopup({ type: 'warning', message: `GUARDIAN ALERT: ${alert.wardName || 'Your ward'} triggered an SOS!` });
    });

    socket.on('sos_accepted', ({ sos }: { sos?: SOS }) => {
      if (sos?._id) {
        router.push(`/sos/${sos._id}`);
      }
    });

    socket.on('sos_already_taken', () => {
      setPopup({ type: 'info', message: 'This SOS has already been accepted by another responder.' });
      // If we navigated away optimistically, come back
      router.replace('/dashboard');
    });

    // Auto-sync offline SOS queue when device comes back online
    const cleanupAutoSync = attachAutoSync((results) => {
      const synced = results.filter((r) => r.success);
      if (synced.length > 0) {
        setPopup({
          type: 'success',
          message: `${synced.length} offline SOS alert(s) synced to the platform.`
        });
        // Navigate to the first synced SOS
        if (synced[0]?.sosId) {
          router.push(`/sos/${synced[0].sosId}`);
        }
      }
    });

    // Check if there are queued SOS from a previous offline session
    const pendingQueue = getQueue().filter((i) => !i.synced);
    if (pendingQueue.length > 0 && navigator.onLine) {
      // Trigger sync immediately
      import('@/services/offlineSOSQueue').then(({ syncOfflineQueue, clearSyncedQueue }) => {
        syncOfflineQueue().then((results) => {
          clearSyncedQueue();
          const synced = results.filter((r) => r.success);
          if (synced.length > 0) {
            setPopup({
              type: 'success',
              message: `${synced.length} queued offline SOS alert(s) synced.`
            });
            if (synced[0]?.sosId) router.push(`/sos/${synced[0].sosId}`);
          }
        });
      });
    }

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.off('sos_alert');
      socket.off('sos_accepted');
      socket.off('sos_already_taken');
      socket.off('guardian_sos_alert');
      if (cleanupAutoSync) cleanupAutoSync();
    };
  }, [router, fetchPendingSOS]);

  useEffect(() => {
    if (location) {
      fetchPendingSOS();
      const interval = setInterval(fetchPendingSOS, 12000);
      return () => clearInterval(interval);
    }
  }, [location?.longitude, location?.latitude, fetchPendingSOS, location]);

  const nearestSOS = useMemo<NearestSOS | null>(() => {
    if (!location || pendingSOS.length === 0) return null;
    let nearest: NearestSOS | null = null;
    let nearestDistanceKm = Number.POSITIVE_INFINITY;

    for (const sos of pendingSOS) {
      const [sosLng, sosLat] = sos.location.coordinates;
      const distanceKm = getDistanceKm(location.latitude, location.longitude, sosLat, sosLng);
      if (distanceKm < nearestDistanceKm) {
        nearestDistanceKm = distanceKm;
        nearest = { ...sos, distanceKm };
      }
    }

    return nearest;
  }, [pendingSOS, location]);

  const handleRespondNearest = (sosId: string) => {
    acceptSOS(sosId);
    router.push(`/sos/${sosId}`);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // proceed with local logout even if backend call fails
    }
    logout();
    router.push('/login');
  };

  if (!location) return <PageLoader text="Acquiring secure location..." />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <ScreenPopup popup={popup} onClose={() => setPopup(null)} />
      <OjassEasterEgg show={showVideo} onClose={() => setShowVideo(false)} />

      {/* Top Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-[1000]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleLogoClick}>
            <div className="w-10 h-10 drop-shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="NearHelp Logo" className="w-full h-full object-contain select-none" draggable="false" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">NearHelp</span>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-3 mr-4">
               <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                 <User size={16} className="text-gray-600" />
               </div>
               <span className="text-sm font-medium text-gray-700">{user?.name}</span>
             </div>

             <button
               onClick={() => router.push('/history')}
               className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
               title="History"
             >
               <History size={20} />
             </button>

             {user?.role === 'admin' && (
               <button
                 onClick={() => router.push('/admin')}
                 className="hidden md:block px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
               >
                 Admin Panel
               </button>
             )}

             <button
               onClick={handleLogout}
               className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition-colors"
               title="Logout"
             >
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-24 space-y-8">

        {/* Hero Section - SOS Button */}
        <section className="flex flex-col items-center justify-center py-8 md:py-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Emergency Assistance</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Tap the button below to instantly alert nearby responders and emergency services.
            </p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCrisisSelector(true)}
            className="relative group outline-none"
          >
            <div className="absolute inset-0 bg-red-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
            <div className="relative w-48 h-48 md:w-56 md:h-56 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-red-400/30 group-hover:border-red-400/50 transition-all cursor-pointer">
              <div className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inset-0 rounded-full border border-red-500 opacity-20"></div>
              <Bell className="w-16 h-16 text-white mb-2 drop-shadow-md" />
              <span className="text-2xl font-bold text-white tracking-widest drop-shadow-md">SOS</span>
            </div>
          </motion.button>
        </section>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Nearest Active Crisis */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="card-premium overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Nearby Incidents</h3>
                  <p className="text-xs text-gray-500">Live emergency alerts in your radius</p>
                </div>
              </div>
              <button
                onClick={fetchPendingSOS}
                className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded"
              >
                Refresh
              </button>
            </div>

            <div className="p-0">
              {!nearestSOS ? (
                 <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                   <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                     <Shield className="w-8 h-8 text-green-600" />
                   </div>
                   <h4 className="font-medium text-gray-900">Area Secure</h4>
                   <p className="text-sm text-gray-500 mt-1 max-w-xs">No active emergency alerts reported within your monitored radius.</p>
                 </div>
              ) : (
                <div className="relative isolate">
                  <div className="h-64 md:h-72 w-full z-0">
                    <NearestSosMap
                      userLocation={location}
                      sosLocation={[nearestSOS.location.coordinates[1], nearestSOS.location.coordinates[0]]}
                    />
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 z-[999]">
                    <div className="bg-white/95 backdrop-blur shadow-lg rounded-xl p-4 flex items-center justify-between border border-gray-100">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                           <span className="text-xs font-bold text-red-600 uppercase tracking-wider">{nearestSOS.crisisType}</span>
                         </div>
                         <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                           <MapPin size={14} className="text-gray-400" />
                           {nearestSOS.distanceKm.toFixed(2)} km away
                         </div>
                      </div>
                      <button
                        onClick={() => handleRespondNearest(nearestSOS._id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg shadow-red-500/20 transition-all flex items-center gap-1"
                      >
                        Respond <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* User Status / Skills */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="card-premium h-full"
          >
             <div className="p-5 border-b border-gray-100 bg-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Your Responder Profile</h3>
                    <p className="text-xs text-gray-500">Skills you can offer in emergencies</p>
                  </div>
                </div>
             </div>
             <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Select your certified skills to be notified for relevant emergencies.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {SKILL_OPTIONS.map((skill) => {
                    const isSelected = selectedSkills.includes(skill.type);
                    return (
                      <button
                        key={skill.type}
                        onClick={() => {
                          setSelectedSkills(prev =>
                            prev.includes(skill.type)
                            ? prev.filter(s => s !== skill.type)
                            : [...prev, skill.type]
                          );
                        }}
                        className={`text-sm py-2 px-3 rounded-lg border transition-all flex items-center justify-center gap-2
                          ${isSelected
                            ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                        {skill.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={async () => {
                     try {
                        setProfileSaving(true);
                        const payload = { skills: selectedSkills.map(s => ({ type: s, verified: false })) };
                        const response = await authAPI.updateProfile(payload);
                        setAuth(response.data.data.user);
                        setPopup({ type: 'success', message: 'Profile updated successfully' });
                     } catch {
                        setPopup({ type: 'error', message: 'Update failed' });
                     } finally {
                        setProfileSaving(false);
                     }
                  }}
                  disabled={profileSaving}
                  className="w-full btn-secondary"
                >
                  {profileSaving ? 'Saving...' : 'Update Skills'}
                </button>
             </div>
          </motion.div>
        </div>

        {/* Resource Map Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ResourceMap location={location} />
        </motion.div>

        {/* Guardian Mode & Welfare Check */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Guardian Mode */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="card-premium"
          >
            <div className="p-5 border-b border-gray-100 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Guardian Mode</h3>
                  <p className="text-xs text-gray-500">Assign guardians who get notified first during your SOS</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="Guardian's email address"
                  className="flex-1 input-field text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddGuardian(); }}
                />
                <button
                  onClick={handleAddGuardian}
                  disabled={guardianLoading || !guardianEmail.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <UserPlus size={14} />
                  {guardianLoading ? '...' : 'Add'}
                </button>
              </div>

              {guardians.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Guardians ({guardians.length})</p>
                  {guardians.map((g) => (
                    <div key={g._id} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-xs font-bold">
                          {g.name?.[0] || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{g.name}</div>
                          <div className="text-xs text-gray-500">{g.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveGuardian(g._id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <ShieldCheck size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No guardians assigned yet</p>
                  <p className="text-xs mt-1">Add trusted contacts who will be alerted first during your emergencies</p>
                </div>
              )}

              {wards.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">You are guardian for ({wards.length})</p>
                  {wards.map((w) => (
                    <div key={w._id} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
                        {w.name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{w.name}</div>
                        <div className="text-xs text-gray-500">{w.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Post-Crisis Welfare Check */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="card-premium"
          >
            <div className="p-5 border-b border-gray-100 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <HeartPulse className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Welfare Check-In</h3>
                  <p className="text-xs text-gray-500">Automated check 24 hours after your emergencies</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {welfareChecks.length > 0 ? (
                <div className="space-y-3">
                  {welfareChecks.map((check) => (
                    <div key={check._id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HeartPulse size={16} className="text-amber-600" />
                        <span className="text-sm font-bold text-amber-800">How are you feeling?</span>
                      </div>
                      <p className="text-xs text-amber-700 mb-3">
                        Your <span className="font-bold capitalize">{check.crisisType}</span> emergency
                        {check.address ? ` near ${check.address}` : ''} was resolved on{' '}
                        {new Date(check.resolvedAt).toLocaleDateString()}. We want to make sure you&apos;re doing well.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleWelfareResponse(check._id, 'fine')}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          I&apos;m Fine
                        </button>
                        <button
                          onClick={() => handleWelfareResponse(check._id, 'need_help')}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Need Help
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <HeartPulse size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No welfare checks pending</p>
                  <p className="text-xs mt-1">After an emergency is resolved, you&apos;ll receive a check-in here within 24 hours</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Logic Components */}
      {showCrisisSelector && (
        <CrisisSelector
          location={location}
          onClose={() => setShowCrisisSelector(false)}
          user={user}
          guardians={guardians}
        />
      )}

      {incomingAlert && (
        <SOSAlertModal
          alert={incomingAlert}
          onClose={() => setIncomingAlert(null)}
          onAccepted={(sosId) => {
            setIncomingAlert(null);
            router.push(`/sos/${sosId}`);
          }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
