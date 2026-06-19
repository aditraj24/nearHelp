import { useEffect, useState } from 'react';
import { sosAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle2, AlertTriangle, User, Shield, Radio, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function History() {
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [broadcasts, setBroadcasts] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await sosAPI.getHistory();
      const { broadcasted, responded } = response.data.data;
      setBroadcasts(broadcasted || []);
      setResponses(responded || []);
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'active': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    return status === 'resolved' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />;
  };

  if (loading) return <PageLoader />;

  const currentList = activeTab === 'broadcasts' ? broadcasts : responses;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-100 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
            <img src="/logo.png" alt="logo" className="w-12 h-12 object-contain select-none pointer-events-none" draggable="false" />
            <h1 className="text-lg font-bold text-gray-900">Emergency History</h1>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900">{user?.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Live</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm">
              <span className="text-sm font-bold text-gray-600 uppercase">{user?.name?.[0] || 'A'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${activeTab === 'broadcasts' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <Radio size={16} />
            My Alerts
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-1">
              {broadcasts.length}
            </span>
            {activeTab === 'broadcasts' && (
              <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('responses')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${activeTab === 'responses' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <HeartHandshake size={16} />
            Responded
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-1">
              {responses.length}
            </span>
            {activeTab === 'responses' && (
              <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-32 pb-8">
        <AnimatePresence mode="wait">
          {currentList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-20 text-gray-400"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'broadcasts' ? <Radio size={32} /> : <Shield size={32} />}
              </div>
              <p>No {activeTab === 'broadcasts' ? 'alerts' : 'responses'} found in history.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {currentList.map((record, index) => (
                <motion.div
                  key={record._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${record.status === 'resolved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {getStatusIcon(record.status)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 capitalize flex items-center gap-2">
                          {record.crisisType} Broadcast
                          {activeTab === 'responses' && record.broadcaster && (
                            <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
                              from {record.broadcaster.name}
                            </span>
                          )}
                        </h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        <Calendar size={12} />
                        {new Date(record.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Clock size={12} />
                        {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Content Specific to Tab */}
                  {activeTab === 'broadcasts' && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                      <div className="flex items-center gap-2 mb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                        <User size={12} />
                        Responders ({record.responders?.length || 0})
                      </div>
                      <div className="flex -space-x-2 overflow-hidden">
                        {record.responders?.slice(0, 5).map((r, i) => (
                          <div key={i} title={r.user?.name} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {r.user?.avatar ? (
                              <img src={r.user.avatar} alt={r.user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              r.user?.name?.[0] || '?'
                            )}
                          </div>
                        ))}
                        {(record.responders?.length || 0) > 5 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                            +{record.responders.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'responses' && (
                    <div className="mb-4 space-y-2">
                      <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={14} />
                          Accepted Request
                        </span>
                        <span className="text-xs opacity-75">
                          {record.myAcceptedAt ? new Date(record.myAcceptedAt).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      {record.myRating && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 bg-yellow-50 px-3 py-2 rounded text-yellow-700">
                          You were rated: {'★'.repeat(record.myRating)}{'☆'.repeat(5 - record.myRating)} ({record.myRating}/5)
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        Lat: {record.location.coordinates[1].toFixed(4)}, Lng: {record.location.coordinates[0].toFixed(4)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default History;
