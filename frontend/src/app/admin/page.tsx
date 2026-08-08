'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { adminAPI, sosAPI, authAPI, type AdminSOSQuery } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  Users, AlertTriangle, Activity, MapPin, Search, Filter, CheckCircle,
  Menu, Bell, LogOut, LayoutDashboard, Clock, Flag, Map as MapIcon, type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageLoader from '@/components/PageLoader';
import { AuthGuard } from '@/components/AuthGuard';
import type { AdminStats, LocalityStat, SOS, User as AppUser } from '@/types';

// Leaflet cannot run on the server — load the map client-side only.
const AdminLiveMap = dynamic(() => import('@/components/maps/AdminLiveMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />
});

type AdminTab = 'overview' | 'map' | 'users' | 'sos' | 'analytics';

function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [sosList, setSosList] = useState<SOS[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [localityStats, setLocalityStats] = useState<LocalityStat[]>([]);
  const [activeSOS, setActiveSOS] = useState<SOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sosFilter, setSosFilter] = useState('');
  const [sosPage, setSosPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const fetchSOSList = useCallback(async () => {
    try {
      const params: AdminSOSQuery = { limit: 20, page: sosPage };
      if (sosFilter) params.status = sosFilter;
      const res = await adminAPI.getAllSOS(params);
      setSosList(res.data.data.sosList || []);
    } catch {
      console.error('Failed to load SOS list');
    }
  }, [sosFilter, sosPage]);

  const fetchLocality = useCallback(async () => {
    try {
      const res = await adminAPI.getLocalityAnalytics();
      setLocalityStats(res.data.data.localityStats || []);
    } catch {
      console.error('Failed to load locality data');
    }
  }, []);

  const fetchActiveSOS = useCallback(async () => {
    try {
      const res = await sosAPI.getActive();
      setActiveSOS(res.data.data.activeSOS || []);
    } catch {
      console.error('Failed to load active SOS');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, sosRes, usersRes] = await Promise.all([
          adminAPI.getStats(),
          adminAPI.getAllSOS({ limit: 10 }),
          adminAPI.getUsers()
        ]);

        setStats(statsRes.data.data);
        setSosList(sosRes.data.data.sosList || []);
        setUsers(usersRes.data.data.users || []);
      } catch {
        console.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchLocality();
    }
    if (activeTab === 'sos') {
      fetchSOSList();
    }
    if (activeTab === 'map') {
      fetchActiveSOS();
    }
  }, [activeTab, fetchLocality, fetchSOSList, fetchActiveSOS]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // proceed with local logout even if backend call fails
    }
    logout();
    router.push('/login');
  };

  const handleToggleSuspend = async (userId: string, isSuspended?: boolean) => {
    if (!window.confirm(`Are you sure you want to ${isSuspended ? 'unsuspend' : 'suspend'} this user?`)) return;

    try {
      if (isSuspended) {
        await adminAPI.unsuspendUser(userId);
      } else {
        await adminAPI.suspendUser(userId);
      }
      // Refresh user list
      const usersRes = await adminAPI.getUsers();
      setUsers(usersRes.data.data.users || []);
    } catch (error) {
      console.error('Failed to update user status', error);
      alert('Failed to update user status');
    }
  };

  if (loading) return <PageLoader />;

  const TabButton = ({ id, label, icon: Icon }: { id: AdminTab; label: string; icon: LucideIcon }) => (
    <button
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
        ${activeTab === id
          ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
          : 'text-gray-500 hover:bg-gray-100'
        }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="logo" className="w-14 h-14 object-contain select-none pointer-events-none" draggable="false" />
          <span className="font-bold text-gray-900 text-xl tracking-tight">Admin<span className="text-red-600">Panel</span></span>
        </div>

        <div className="flex-1 p-4 space-y-2">
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Main Menu</p>
          <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
          <TabButton id="map" label="Live SOS Map" icon={MapIcon} />
          <TabButton id="users" label="User Management" icon={Users} />
          <TabButton id="sos" label="Emergency Logs" icon={AlertTriangle} />
          <TabButton id="analytics" label="Geo Analytics" icon={Activity} />
        </div>

        <div className="p-4 border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-hidden flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-500">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer hover:bg-gray-50 p-1 rounded-full transition-colors">
              <Bell size={20} className="text-gray-400" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="flex items-center gap-3 pl-2 border-l border-gray-100">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{user?.name}</p>
                <p className="text-[10px] text-gray-400 font-medium">Administrator</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-gray-600 uppercase">{user?.name?.[0] || 'A'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto space-y-6"
            >
              {activeTab === 'overview' && stats && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Users"
                      value={stats.totalUsers}
                      icon={Users}
                      color="bg-blue-500"
                    />
                    <StatCard
                      title="Active SOS"
                      value={stats.activeSOS}
                      icon={AlertTriangle}
                      color="bg-red-500"
                      pulse
                    />
                    <StatCard
                      title="Resolved SOS"
                      value={stats.resolvedSOS}
                      icon={CheckCircle}
                      color="bg-green-500"
                    />
                    <StatCard
                      title="Total Responders"
                      value={users.filter(u => (u.skills?.length ?? 0) > 0).length}
                      icon={Activity}
                      color="bg-purple-500"
                    />
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="card-premium p-6">
                      <h3 className="font-bold text-gray-900 mb-6">Crisis Breakdown</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.sosByType}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <RechartsTooltip
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card-premium p-6">
                      <h3 className="font-bold text-gray-900 mb-6">Recent Activity</h3>
                      <div className="space-y-4">
                        {sosList.slice(0, 5).map(sos => (
                          <div key={sos._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${sos.status === 'active' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {sos.status === 'active' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 capitalize">{sos.crisisType}</p>
                                <p className="text-xs text-gray-500">{new Date(sos.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${sos.status === 'active' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
                              }`}>
                              {sos.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'users' && (() => {
                const filteredUsers = users.filter(u => {
                  const matchesSearch = !userSearch ||
                    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                    u.email?.toLowerCase().includes(userSearch.toLowerCase());
                  const matchesRole = !userRoleFilter || u.role === userRoleFilter;
                  return matchesSearch && matchesRole;
                });
                return (
                  <div className="card-premium overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white gap-3">
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {['', 'user', 'admin'].map((role) => (
                          <button
                            key={role}
                            onClick={() => setUserRoleFilter(role)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${userRoleFilter === role
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                              }`}
                          >
                            {role === '' && <Filter size={14} />}
                            {role || 'All'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                          <tr>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Role</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(u => (
                            <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                              <td className="px-6 py-4 text-gray-500">{u.email}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.isSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {u.isSuspended ? 'suspended' : 'active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleToggleSuspend(u._id, u.isSuspended)}
                                  className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${u.isSuspended
                                    ? 'border-green-200 text-green-600 hover:bg-green-50'
                                    : 'border-red-200 text-red-600 hover:bg-red-50'
                                    }`}
                                >
                                  {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredUsers.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-12 text-gray-400">No users match your search</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Emergency Logs Tab */}
              {activeTab === 'sos' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-600">Filter:</span>
                    {['', 'active', 'responding', 'resolved', 'cancelled'].map((f) => (
                      <button
                        key={f}
                        onClick={() => { setSosFilter(f); setSosPage(1); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sosFilter === f
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        {f || 'All'}
                      </button>
                    ))}
                  </div>

                  <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 font-medium">Crisis</th>
                            <th className="px-4 py-3 font-medium">Broadcaster</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Responders</th>
                            <th className="px-4 py-3 font-medium">Response Time</th>
                            <th className="px-4 py-3 font-medium">False Alert</th>
                            <th className="px-4 py-3 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sosList.map((sos) => (
                            <tr key={sos._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="px-4 py-3">
                                <span className="font-medium capitalize text-gray-900">{sos.crisisType}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{sos.broadcaster?.name || 'Anonymous'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${sos.status === 'active' ? 'bg-red-100 text-red-700' :
                                  sos.status === 'responding' ? 'bg-yellow-100 text-yellow-700' :
                                    sos.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'
                                  }`}>
                                  {sos.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">{sos.responders?.length || 0}</td>
                              <td className="px-4 py-3 text-gray-600">
                                {sos.timeToAcceptance ? `${Math.round(sos.timeToAcceptance)}s` : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {sos.isFalseAlert ? (
                                  <span className="text-red-600 font-bold flex items-center gap-1"><Flag size={12} /> Yes</span>
                                ) : (
                                  <span className="text-gray-400">No</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">
                                {new Date(sos.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          {sosList.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-12 text-gray-400">No emergency records found</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
                      <button
                        onClick={() => setSosPage(Math.max(1, sosPage - 1))}
                        disabled={sosPage <= 1}
                        className="text-xs px-3 py-1.5 bg-white border rounded-lg disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-gray-500">Page {sosPage}</span>
                      <button
                        onClick={() => setSosPage(sosPage + 1)}
                        disabled={sosList.length < 20}
                        className="text-xs px-3 py-1.5 bg-white border rounded-lg disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Geo Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="card-premium p-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-blue-600" /> Response Time Trend
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats?.responseTimeByDay?.slice().reverse() || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} label={{ value: 'Seconds', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontSize: 12 } }} />
                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
                            <Line type="monotone" dataKey="avgTime" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Avg Response Time (s)" />
                            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="SOS Count" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card-premium p-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-red-600" /> Locality Breakdown
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={localityStats.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
                            <Bar dataKey="totalSOS" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} name="Total SOS" />
                            <Bar dataKey="activeSOS" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} name="Active" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="card-premium overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-white">
                      <h3 className="font-bold text-gray-900">Locality Stats Table</h3>
                      <p className="text-xs text-gray-500">Response time and false alert data by geographic zone</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 font-medium">Locality (lat,lng)</th>
                            <th className="px-4 py-3 font-medium">Total SOS</th>
                            <th className="px-4 py-3 font-medium">Active</th>
                            <th className="px-4 py-3 font-medium">Avg Response (s)</th>
                            <th className="px-4 py-3 font-medium">False Alerts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {localityStats.map((loc, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-mono text-xs text-gray-700">{loc._id}</td>
                              <td className="px-4 py-3 font-bold text-gray-900">{loc.totalSOS}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${loc.activeSOS > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {loc.activeSOS}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {loc.avgResponseTime ? `${Math.round(loc.avgResponseTime)}s` : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {loc.falseAlerts > 0 ? (
                                  <span className="text-red-600 font-medium">{loc.falseAlerts}</span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {localityStats.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-12 text-gray-400">No locality data available yet</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Live SOS Map Tab */}
              {activeTab === 'map' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Live City-Wide SOS View</h3>
                      <p className="text-sm text-gray-500">{activeSOS.length} active emergency alert{activeSOS.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={fetchActiveSOS}
                      className="text-xs font-medium bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Refresh Map
                    </button>
                  </div>
                  <div className="card-premium overflow-hidden" style={{ height: '500px' }}>
                    <AdminLiveMap activeSOS={activeSOS} />
                  </div>
                  {activeSOS.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {activeSOS.map((sos) => (
                        <div key={sos._id} className="card-premium p-4 flex items-center gap-3">
                          <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertTriangle size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-900 capitalize truncate">{sos.crisisType}</div>
                            <div className="text-xs text-gray-500 truncate">{sos.address || 'Location shared'}</div>
                            <div className="text-[10px] text-gray-400">{sos.responders?.length || 0} responder(s)</div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded font-bold animate-pulse">LIVE</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  pulse?: boolean;
}

function StatCard({ title, value, icon: Icon, color, pulse }: StatCardProps) {
  return (
    <div className="card-premium p-6 flex items-center justify-between relative overflow-hidden group">
      <div className="relative z-10">
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg relative`}>
        {pulse && <div className="absolute inset-0 rounded-xl bg-white opacity-30 animate-ping"></div>}
        <Icon size={24} />
      </div>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 ${color} group-hover:scale-150 transition-transform duration-500`}></div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboard />
    </AuthGuard>
  );
}
