'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/authStore';
import { sosAPI, chatbotAPI } from '@/services/api';
import { getSocket, broadcastSOS, sendMessage, shareLiveLocation } from '@/services/socket';
import ScreenPopup from '@/components/ScreenPopup';
import PageLoader from '@/components/PageLoader';
import AICrisisChat from '@/components/AICrisisChat';
import RatingModal from '@/components/RatingModal';
import { Navigation, Send, AlertTriangle, ShieldCheck, Minimize2, Maximize2, Flag, ArrowLeft, Bot, Award } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import type {
  AiChatMessage,
  ChatMessage,
  CrisisGuidance,
  LiveLocationUpdate,
  Popup,
  Resource,
  Responder,
  SOS,
  SosStatus
} from '@/types';

// Leaflet cannot run on the server — load the incident map client-side only.
const SosLiveMap = dynamic(() => import('@/components/maps/SosLiveMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />
});

function SOSBroadcast() {
  const params = useParams<{ sosId: string }>();
  const sosId = params.sosId;
  const router = useRouter();
  const { user } = useAuthStore();
  const [sos, setSos] = useState<SOS | null>(null);
  const [guidance, setGuidance] = useState<CrisisGuidance | null>(null);
  const [emergencySummary, setEmergencySummary] = useState('');
  const [nearbyResources, setNearbyResources] = useState<Resource[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState<string | null>(null);
  const [responderLocations, setResponderLocations] = useState<Record<string, { longitude: number; latitude: number }>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<Popup | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [resolveDebrief, setResolveDebrief] = useState('');

  // Chatbot State
  const [activeTab, setActiveTab] = useState<'team' | 'ai'>('team');
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([
    { sender: 'ai', text: 'I am your emergency AI assistant. How can I help you handle this situation?' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const sosRef = useRef<SOS | null>(null);

  useEffect(() => {
    sosRef.current = sos;
  }, [sos]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiMessages, activeTab]);

  const loadSOSData = useCallback(async () => {
    try {
      const response = await sosAPI.getById(sosId);
      const data = response.data.data;
      const currentSOS = data.sos;
      setSos(currentSOS);
      setGuidance(data.guidance ?? null);
      setEmergencySummary(data.emergencySummary || '');
      setNearbyResources(data.nearbyResources || []);
      const initialResponders = currentSOS?.responders || [];
      setResponders(initialResponders);
      if (initialResponders.length > 0) {
        setSelectedResponderId(initialResponders[0].user?._id || null);
      }

      if (currentSOS?.broadcaster?._id === user?._id && currentSOS?.status === 'active') {
        broadcastSOS(sosId);
      }

      setLoading(false);
    } catch {
      console.error('Failed to load SOS data');
      setLoading(false);
    }
  }, [sosId, user?._id]);

  useEffect(() => {
    loadSOSData();

    const socket = getSocket();
    if (socket) {
      socket.emit('join_sos', { sosId });

      socket.on('responder_accepted', ({ responder }: { responder: Responder }) => {
        const responderUserId = responder?.user?._id;
        setResponders((prev) => {
          const exists = prev.some((item) => item.user?._id === responderUserId);
          return exists ? prev : [...prev, responder];
        });
        if (!selectedResponderId && responderUserId) {
          setSelectedResponderId(responderUserId);
        }
      });

      socket.on('sos_state_updated', ({ status, responders: nextResponders }: { status?: SosStatus; responders?: Responder[] }) => {
        if (status) {
          setSos((prev) => prev ? { ...prev, status } : prev);
        }
        if (Array.isArray(nextResponders)) {
          setResponders(nextResponders);
          if (!selectedResponderId && nextResponders[0]?.user?._id) {
            setSelectedResponderId(nextResponders[0].user._id);
          }
        }
      });

      socket.on('new_message', ({ senderId, message, timestamp, responderId, sosId: msgSosId }: ChatMessage) => {
        setMessages((prev) => [...prev, { senderId, message, timestamp, responderId, sosId: msgSosId }]);
      });

      socket.on('live_location_update', ({ userId, longitude, latitude, responderId }: LiveLocationUpdate) => {
        setResponderLocations((prev) => ({
          ...prev,
          [responderId || userId]: { longitude, latitude }
        }));
      });

      socket.on('sos_resolved', ({ debrief }: { debrief?: string }) => {
        // Use ref to access latest sos state inside closure
        const currentSos = sosRef.current;
        const currentUser = useAuthStore.getState().user;
        const isBroadcasterNow = currentSos?.broadcaster?._id === currentUser?._id;

        if (!isBroadcasterNow) {
            const details = `${debrief || 'SOS resolved.'}\nReturning to dashboard...`;
            setPopup({ type: 'success', message: details });
            setTimeout(() => router.push('/dashboard'), 2000);
        }
      });

      socket.on('no_responders_found', () => {
        setPopup({ type: 'info', message: 'No responders found nearby. Expanding search...' });
      });

      socket.on('expanding_search', () => {
        setPopup({ type: 'info', message: 'Expanding search radius...' });
      });

      socket.on('sos_already_taken', () => {
        setPopup({ type: 'info', message: 'This SOS has already been accepted by another responder.' });
        setTimeout(() => router.replace('/dashboard'), 1500);
      });

      socket.on('guardians_notified', ({ count, message }: { count: number; message?: string }) => {
        setPopup({ type: 'success', message: message || `${count} guardian(s) notified first.` });
      });
    }

    const locationInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        shareLiveLocation(
          sosId,
          position.coords.longitude,
          position.coords.latitude,
          selectedResponderId
        );
      });
    }, 5000);

    return () => {
      clearInterval(locationInterval);
      if (socket) {
        socket.off('responder_accepted');
        socket.off('sos_state_updated');
        socket.off('new_message');
        socket.off('live_location_update');
        socket.off('sos_resolved');
        socket.off('no_responders_found');
        socket.off('expanding_search');
        socket.off('sos_already_taken');
        socket.off('guardians_notified');
      }
    };
  }, [sosId, selectedResponderId, router, loadSOSData]);

  const handleResolve = async () => {
    if (!window.confirm('Are you certain the emergency is over?')) return;
    try {
      const res = await sosAPI.resolve(sosId);
      const debrief = res.data?.data?.debrief || '';
      setResolveDebrief(debrief);
      setShowRatingModal(true);
    } catch {
      setPopup({ type: 'error', message: 'Failed to resolve SOS' });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim()) return;

    if (activeTab === 'ai') {
      const userMsg: AiChatMessage = { sender: 'user', text: messageInput };
      setAiMessages(prev => [...prev, userMsg]);
      setMessageInput('');
      setAiLoading(true);

      try {
        const history = aiMessages.map(m => ({
          role: (m.sender === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.text
        }));

        const response = await chatbotAPI.chat({
          question: messageInput,
          crisisType: sos?.crisisType || 'general',
          conversationHistory: history
        });

        const aiResponse = response.data.data.answer;
        setAiMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
      } catch {
        setAiMessages(prev => [...prev, { sender: 'ai', text: "Connection error. Please focus on safety." }]);
      } finally {
        setAiLoading(false);
      }
    } else {
      sendMessage(sosId, messageInput, selectedResponderId);
      setMessageInput('');
    }
  };

  const handleFlagFalse = async () => {
    if (!window.confirm('Are you sure this is a false alert?')) return;
    try {
      await sosAPI.flag(sosId);
      setPopup({ type: 'info', message: 'Alert flagged as false. Thank you.' });
    } catch {
      setPopup({ type: 'error', message: 'Failed to flag alert' });
    }
  };

  const visibleMessages = useMemo(() => {
    if (!selectedResponderId) return messages;
    return messages.filter((msg) => (msg.responderId || null) === selectedResponderId);
  }, [messages, selectedResponderId]);

  if (loading) return <PageLoader text="Connecting to Secure Channel..." />;
  if (!sos) return <div className="p-8 text-center text-red-600">SOS ID not found</div>;

  const isBroadcaster = sos?.broadcaster?._id === user?._id;
  const [longitude, latitude] = sos.location.coordinates;

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <ScreenPopup popup={popup} onClose={() => setPopup(null)} />

      {/* Map Section */}
      <div className={`relative isolate transition-all duration-300 ${isFullscreen ? 'w-full h-full absolute z-50' : 'w-full md:w-3/5 h-[40vh] md:h-full'}`}>
        <SosLiveMap
          sos={sos}
          latitude={latitude}
          longitude={longitude}
          responders={responders}
          responderLocations={responderLocations}
          nearbyResources={nearbyResources}
        />

        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-[999] flex gap-2">
           <button
             onClick={() => router.push('/dashboard')}
             className="bg-white/90 backdrop-blur text-gray-700 p-2 rounded-lg shadow-lg hover:bg-white transition-colors"
           >
             <ArrowLeft size={20} />
           </button>
        </div>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-4 right-4 z-[999] bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg hover:bg-white text-gray-700 hidden md:block"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>

        {/* Floating Status Badge on Map */}
        <div className="absolute bottom-6 left-4 right-4 md:left-auto md:right-4 z-[999]">
          <div className="bg-red-600/90 backdrop-blur text-white p-4 rounded-xl shadow-xl border border-red-500 max-w-md">
             <div className="flex items-center justify-between mb-2">
               <h2 className="font-bold flex items-center gap-2">
                 <AlertTriangle size={18} className="animate-pulse" />
                 Active Emergency
               </h2>
               <span className="text-xs bg-red-800 px-2 py-1 rounded uppercase tracking-wider font-bold">Live</span>
             </div>
             <p className="text-sm opacity-90 mb-3">{sos.crisisType.toUpperCase()} ALERT</p>

             <div className="flex gap-2">
                {isBroadcaster ? (
                  <button
                    onClick={handleResolve}
                    className="flex-1 bg-white text-red-600 py-2 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors"
                  >
                    Mark Safe
                  </button>
                ) : (
                  <button
                    onClick={handleFlagFalse}
                    className="flex-1 bg-red-800 text-white py-2 rounded-lg font-bold text-sm hover:bg-red-900 transition-colors flex items-center justify-center gap-1"
                  >
                    <Flag size={14} /> Report False
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Info & Chat Panel */}
      <div className={`bg-white flex flex-col border-l border-gray-200 shadow-xl z-20 transition-all ${isFullscreen ? 'hidden' : 'w-full md:w-2/5 h-[60vh] md:h-full'}`}>

        {/* Tabs / Header */}
        <div className="bg-white border-b border-gray-100 p-4">
           {/* Broadcaster & Responder Names */}
           {activeTab === 'team' && (
             <div className="mb-4 flex items-center gap-3 flex-wrap">
               <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                 <AlertTriangle size={14} className="text-red-500" />
                 <span className="text-xs font-bold text-red-700">
                   {isBroadcaster ? 'You (Broadcaster)' : (sos.broadcaster?.name || 'Anonymous')}
                 </span>
               </div>
               {responders.length > 0 && (
                 <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                   <ShieldCheck size={14} className="text-green-500" />
                   <span className="text-xs font-bold text-green-700">
                     {responders.map(r => r.user?._id === user?._id ? 'You (Responder)' : r.user?.name).filter(Boolean).join(', ')}
                   </span>
                 </div>
               )}
             </div>
           )}

           {guidance && activeTab === 'team' && (
             <div className="mb-4 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                <h3 className="text-sm font-bold text-blue-800 mb-1 flex items-center gap-2">
                  <ShieldCheck size={16} /> AI Safety Guidance
                </h3>
                <p className="text-xs text-blue-700 leading-relaxed max-h-20 overflow-y-auto">
                  {guidance.emergencyScript || emergencySummary}
                </p>
             </div>
           )}

           <div className="flex gap-4 border-b border-gray-100 mb-3">
             <button
               onClick={() => setActiveTab('team')}
               className={`pb-2 text-sm font-bold transition-all ${activeTab === 'team' ? 'text-gray-900 border-b-2 border-red-500' : 'text-gray-400'}`}
             >
               Responders ({responders.length})
             </button>
             <button
               onClick={() => setActiveTab('ai')}
               className={`pb-2 text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
             >
               <Bot size={14} /> AI Assistant
             </button>
           </div>

           {activeTab === 'team' && (
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {responders.length === 0 && (
                <div className="text-gray-400 text-xs italic p-2">Scanning for nearby heroes...</div>
              )}
              {responders.map((r) => {
                const hasSkills = (r.user?.skills?.length ?? 0) > 0;
                return (
                  <button
                    key={r.user._id}
                    onClick={() => setSelectedResponderId(prev => prev === r.user._id ? null : r.user._id)}
                    className={`
                      flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all
                      ${selectedResponderId === r.user._id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : hasSkills
                          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:border-amber-400 ring-1 ring-amber-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {hasSkills ? (
                      <Award size={12} className={selectedResponderId === r.user._id ? 'text-yellow-300' : 'text-amber-500'} />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    )}
                    {r.user.name.split(' ')[0]}
                    {hasSkills && (
                      <span className={`text-[9px] font-bold uppercase ${selectedResponderId === r.user._id ? 'text-blue-200' : 'text-amber-500'}`}>
                        {r.user.skills?.map(s => s.type?.replace('_', ' ').replace('medical professional', 'MD')).join(', ')}
                      </span>
                    )}
                    {r.user?.trustScore != null && (
                      <span className={`text-[9px] ${selectedResponderId === r.user._id ? 'text-blue-200' : 'text-gray-400'}`}>
                        ★{(r.user.trustScore * 5).toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
           </div>
           )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
          {activeTab === 'ai' ? (
             <AICrisisChat messages={aiMessages} />
          ) : (
             <div className="flex-1 flex flex-col gap-3">
            {visibleMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center flex-col text-gray-400 opacity-60">
                 <Navigation size={48} className="mb-2" />
                 <p className="text-sm">Start coordinating with responders</p>
              </div>
            ) : (
              visibleMessages.map((msg, i) => {
                const isMe = msg.senderId === user?._id;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
                      ${isMe
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      }
                    `}>
                      <p>{msg.message}</p>
                      <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
           {activeTab === 'ai' && aiLoading ? (
             <div className="text-xs text-blue-500 animate-pulse text-center mb-2">Analyzing situation...</div>
           ) : null}
           <form onSubmit={handleSendMessage} className="relative">
             <input
               type="text"
               value={messageInput}
               onChange={(e) => setMessageInput(e.target.value)}
               placeholder={
                 activeTab === 'ai'
                   ? "Ask for safety advice..."
                   : (selectedResponderId ? "Message responder..." : "Broadcast message...")
               }
               className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
             />
             <button
               type="submit"
               disabled={!messageInput.trim()}
               className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 transition-colors shadow-sm"
             >
               <Send size={16} />
             </button>
           </form>
           <p className="text-center text-[10px] text-gray-400 mt-2">
             Messages are encrypted and secure. Location is being shared.
           </p>
        </div>
      </div>

       {showRatingModal && (
        <RatingModal
          sosId={sosId}
          responders={responders}
          debrief={resolveDebrief}
          onClose={() => router.push('/dashboard')}
        />
      )}
    </div>
  );
}

export default function SOSBroadcastPage() {
  return (
    <AuthGuard>
      <SOSBroadcast />
    </AuthGuard>
  );
}
