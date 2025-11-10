import React from 'react';
import { SettingsIcon } from './icons/SettingsIcon';
import { TerminalIcon } from './icons/TerminalIcon';
import { InfoIcon } from './icons/InfoIcon'; 
import { BrainIcon } from './icons/BrainIcon';

interface HeaderProps {
    onTogglePanel: () => void;
    onToggleTerminal: () => void;
    onOpenAbout: () => void;
    onStartSimulation: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onTogglePanel, onToggleTerminal, onOpenAbout, onStartSimulation }) => {
  return (
    <header className="p-4 border-b border-purple-500/30 shadow-lg shadow-purple-900/50 bg-black/30 flex items-center justify-between z-10">
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
        <button
            onClick={onStartSimulation}
            className="p-2 rounded-full text-cyan-400 hover:bg-cyan-500/20 hover:text-white transition-colors"
            aria-label="Start AI Simulation"
            title="Start AI Simulation"
        >
            <BrainIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={onOpenAbout} 
          className="p-2 rounded-full text-purple-400 hover:bg-purple-500/20 hover:text-white transition-colors"
          aria-label="Open about modal"
        >
          <InfoIcon className="w-6 h-6" />
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
        <div className="p-2 rounded-full">
          <BrainIcon className="w-6 h-6" />
        </div>
        <div className="p-2 rounded-full">
          <InfoIcon className="w-6 h-6" />
        </div>
      </div>
    </header>
  );
};
