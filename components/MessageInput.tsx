
import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './icons/SendIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { BroadcastIcon } from './icons/BroadcastIcon';
import { ImageIcon } from './icons/ImageIcon';

// Extend window type for webkitSpeechRecognition
declare global {
  interface Window {
    // Fix: Use 'any' for experimental browser APIs to avoid type errors.
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStartLive: () => void;
  onGenerateImage: (prompt: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading, onStartLive, onGenerateImage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  // Fix: Use 'any' as SpeechRecognition type might not be in standard TS lib.
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after first utterance
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInputValue(finalTranscript + interimTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
    }

    recognitionRef.current = recognition;
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInputValue(''); // Clear previous text
      recognitionRef.current.start();
      setIsListening(true);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
        recognitionRef.current?.stop();
    }
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
          placeholder={isListening ? "Listening..." : "Say something..."}
          disabled={isLoading}
          className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isLoading || !recognitionRef.current}
          className={`p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 relative ${
            isListening 
            ? 'bg-red-600 text-white' 
            : 'bg-gray-700 text-purple-300 hover:bg-gray-600'
          }`}
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          <MicrophoneIcon />
          {isListening && <span className="absolute inset-0 rounded-lg bg-red-500 animate-pulse -z-10"></span>}
        </button>
        <button
          type="button"
          onClick={onStartLive}
          disabled={isLoading}
          className="p-3 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
          aria-label="Start Live Conversation"
          title="Start Live Conversation"
        >
          <BroadcastIcon />
        </button>
        <button
          type="button"
          onClick={handleGenerateImageClick}
          disabled={isLoading || !inputValue.trim()}
          className="p-3 bg-teal-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
          aria-label="Generate Image"
          title="Generate Image"
        >
          <ImageIcon />
        </button>
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/30"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
  );
};
