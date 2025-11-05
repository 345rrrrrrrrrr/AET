import React from 'react';
import { TerminalIcon } from './icons/TerminalIcon';

interface LoginOverlayProps {
  onOpenTerminal: () => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({ onOpenTerminal }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/50 text-center p-8">
      <h2 className="text-4xl font-bold text-red-500 animate-pulse mb-4 tracking-widest">
        [ AUTHENTICATION REQUIRED ]
      </h2>
      <p className="text-gray-300 mb-8 max-w-md">
        User session not detected. Please log in or register via the Command Terminal to initialize the Artifical Emotion Terminal.
      </p>
      <button
        onClick={onOpenTerminal}
        className="flex items-center gap-3 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/30 text-lg"
      >
        <TerminalIcon className="w-6 h-6" />
        Open Login Terminal
      </button>
    </div>
  );
};
