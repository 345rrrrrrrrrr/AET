
import React, { useRef, useEffect } from 'react';
import type { Message } from '../types';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { PlayIcon } from './icons/PlayIcon';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onPlayAudio: (text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onPlayAudio }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent rounded-lg">
      {messages.filter(msg => !msg.hidden).map((msg, index) => (
        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl shadow-md ${
              msg.role === 'user'
                ? 'bg-purple-700 text-white rounded-br-none'
                : 'bg-gray-700 text-gray-200 rounded-bl-none relative group'
            }`}
          >
            {msg.imageUrl && (
              <div className="mb-2">
                <img src={msg.imageUrl} alt={msg.content} className="rounded-lg max-w-full h-auto" />
              </div>
            )}
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.role === 'model' && !msg.imageUrl && (
               <button onClick={() => onPlayAudio(msg.content)} className="absolute -right-4 -bottom-2 p-1 bg-pink-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none">
                 <PlayIcon className="w-5 h-5 text-white"/>
               </button>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-700 text-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-md flex items-center">
            <LoadingSpinner />
            <span className="ml-2 animate-pulse">Thinking...</span>
          </div>
        </div>
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
