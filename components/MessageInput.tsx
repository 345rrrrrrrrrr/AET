
import React, { useState } from 'react';
import { SendIcon } from './icons/SendIcon';
import { BroadcastIcon } from './icons/BroadcastIcon';
import { ImageIcon } from './icons/ImageIcon';
import { CameraIcon } from './icons/CameraIcon';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isLiveMode: boolean;
  onToggleLiveMode: () => void;
  onGenerateImage: (prompt: string) => void;
  isCameraMode: boolean;
  onToggleCameraMode: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, isLoading, isLiveMode, onToggleLiveMode, 
  onGenerateImage, isCameraMode, onToggleCameraMode 
}) => {
  const [inputValue, setInputValue] = useState('');
  const isDisabled = isLoading || isLiveMode || isCameraMode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleGenerateImageClick = () => {
    if (isLoading || !inputValue.trim()) return;
    onGenerateImage(inputValue);
    setInputValue('');
  };

  return (
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            isLiveMode ? "Live mode is active..." : 
            isCameraMode ? "Visual Cortex is active..." : 
            "Say something or describe an image..."
          }
          disabled={isDisabled}
          className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onToggleLiveMode}
          disabled={isLoading || isCameraMode}
          className={`p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative ${
            isLiveMode
            ? 'bg-red-600 text-white'
            : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          aria-label={isLiveMode ? "Stop Live Conversation" : "Start Live Conversation"}
          title={isLiveMode ? "Stop Live Conversation" : "Start Live Conversation"}
        >
          <BroadcastIcon />
           {isLiveMode && <span className="absolute inset-0 rounded-lg bg-red-500 animate-pulse -z-10"></span>}
        </button>
        <button
          type="button"
          onClick={onToggleCameraMode}
          disabled={isLoading || isLiveMode}
          className={`p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative ${
            isCameraMode
            ? 'bg-red-600 text-white'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          aria-label={isCameraMode ? "Deactivate Visual Cortex" : "Activate Visual Cortex"}
          title={isCameraMode ? "Deactivate Visual Cortex" : "Activate Visual Cortex"}
        >
          <CameraIcon />
           {isCameraMode && <span className="absolute inset-0 rounded-lg bg-red-500 animate-pulse -z-10"></span>}
        </button>
        <button
          type="button"
          onClick={handleGenerateImageClick}
          disabled={isDisabled || !inputValue.trim()}
          className="p-3 bg-teal-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
          aria-label="Generate Image"
          title="Generate Image"
        >
          <ImageIcon />
        </button>
        <button
          type="submit"
          disabled={isDisabled || !inputValue.trim()}
          className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/30"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
  );
};
