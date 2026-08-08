'use client';

import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AiChatMessage } from '@/types';

interface AICrisisChatProps {
  messages: AiChatMessage[];
}

function AICrisisChat({ messages }: AICrisisChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!messages || messages.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 h-full">
      {messages.map((msg, index) => {
        const isAI = msg.sender === 'ai';
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
              isAI
                ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                : 'bg-blue-600 text-white rounded-br-none'
            }`}>
              {isAI && (
                <div className="flex items-center gap-2 mb-1 border-b border-gray-100 pb-1">
                  <Bot size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-gray-500">Safety Assistant</span>
                </div>
              )}
              <p className="leading-relaxed">{msg.text}</p>
            </div>
          </motion.div>
        );
      })}
      <div ref={scrollRef} />
    </div>
  );
}

export default AICrisisChat;
