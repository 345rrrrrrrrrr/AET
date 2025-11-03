import React from 'react';
import { SettingsIcon } from './icons/SettingsIcon';
import { TerminalIcon } from './icons/TerminalIcon';

interface HeaderProps {
    onTogglePanel: () => void;
    onToggleTerminal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onTogglePanel, onToggleTerminal }) => {
  return (
    <header className="p-4 border-b border-purple-500/30 shadow-lg shadow-purple-900/50 bg-black/30 flex items-center justify-between">
      {/* Left Group: Action Buttons */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onTogglePanel} 
          className="p-2 rounded-full text-purple-400 hover:bg-purple-500/20 hover:text-white transition-colors"
          aria-label="Toggle emotional matrix panel"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={onToggleTerminal} 
          className="p-2 rounded-full text-purple-400 hover:bg-purple-500/20 hover:text-white transition-colors"
          aria-label="Toggle command terminal"
        >
          <TerminalIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Middle Group: Title */}
      <h1 
        className="text-2xl md:text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 px-4 text-center"
        title="Artifical Emotion Terminal"
      >
        AET
      </h1>

      {/* Right Group: Spacer to balance the header */}
      <div className="flex items-center gap-2 invisible" aria-hidden="true">
        <div className="p-2 rounded-full">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div className="p-2 rounded-full">
          <TerminalIcon className="w-6 h-6" />
        </div>
      </div>
    </header>
  );
};