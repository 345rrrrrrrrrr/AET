import React, { useState } from 'react';
import { SendIcon } from './icons/SendIcon';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="p-4 border-t border-purple-500/20 bg-gray-900/50">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Say something..."
          disabled={isLoading}
          className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/30"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
};
