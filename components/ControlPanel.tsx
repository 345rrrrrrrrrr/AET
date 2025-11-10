import React, { useState, useRef, useMemo } from 'react';
import type { EmotionalState, Emotion, EmotionGroup, Chat, UserMindState } from '../types';
import { EMOTION_GROUPS } from '../types';
import { EMOTION_COLORS, adjustColor } from '../utils/colorUtils';

interface ControlPanelProps {
  emotionalState: EmotionalState;
  userMindState: UserMindState;
  setEmotionalState: React.Dispatch<React.SetStateAction<EmotionalState>>;
  onCustomInstructionClick: () => void;
  onSetIConfiguration: () => void;
  onClearAllEmotions: () => void;
  isCrazyMode: boolean;
  onToggleCrazyMode: () => void;
  isProactiveMode: boolean;
  onToggleProactiveMode: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onResetApp: () => void;
  onExportData: () => void;
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  onImprintPersona: (personaName: string) => void;
  coreMemory: string;
  onConsolidateMemories: () => void;
  isConsolidating: boolean;
  isFrozen: boolean;
  onToggleFreeze: () => void;
  onTriggerSelfReflection: () => void;
}

const Slider: React.FC<{
  label: Emotion;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCrazyMode: boolean;
}> = ({ label, value, onChange, isCrazyMode }) => {
    const activeColor = adjustColor(EMOTION_COLORS[label], value);

    return (
        <div className={`mb-4 transition-transform duration-100 ${isCrazyMode ? 'crazy-mode-slider' : ''}`}>
            <label className="block text-sm font-medium text-purple-300 capitalize mb-2">{label} ({value})</label>
            <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={onChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
             <style>{`
                .slider-thumb::-webkit-slider-thumb {
                   -webkit-appearance: none;
                   appearance: none;
                   width: 16px;
                   height: 16px;
                   border-radius: 50%;
                   background-color: ${activeColor};
                   box-shadow: 0 0 5px ${activeColor}, 0 0 10px ${activeColor};
                   cursor: pointer;
                   margin-top: -5px; /* Adjust for vertical alignment */
                }

                .slider-thumb::-moz-range-thumb {
                   width: 16px;
                   height: 16px;
                   border-radius: 50%;
                   background-color: ${activeColor};
                   box-shadow: 0 0 5px ${activeColor}, 0 0 10px ${activeColor};
                   cursor: pointer;
                }
            `}</style>
        </div>
    );
};


export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    emotionalState, userMindState, setEmotionalState, onCustomInstructionClick, onSetIConfiguration, 
    onClearAllEmotions, isCrazyMode, onToggleCrazyMode, isProactiveMode, onToggleProactiveMode,
    chats, activeChatId, onNewChat, onSelectChat, onResetApp, onExportData, onImportData,
    isLoading, onImprintPersona, coreMemory, onConsolidateMemories, isConsolidating,
    isFrozen, onToggleFreeze, onTriggerSelfReflection
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    Object.keys(EMOTION_GROUPS).forEach(group => initialState[group] = true); // Default to open
    return initialState;
  });
  const importInputRef = useRef<HTMLInputElement>(null);
  const [personaInput, setPersonaInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmotionGroups = useMemo<Record<string, readonly Emotion[]>>(() => {
    if (!searchTerm.trim()) {
      return EMOTION_GROUPS;
    }

    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredGroups: Record<string, readonly Emotion[]> = {};

    for (const groupName in EMOTION_GROUPS) {
      if (Object.prototype.hasOwnProperty.call(EMOTION_GROUPS, groupName)) {
        const groupEmotions = EMOTION_GROUPS[groupName as EmotionGroup];
        const matchingEmotions = groupEmotions.filter(emotion =>
          emotion.toLowerCase().includes(lowercasedFilter)
        );

        if (matchingEmotions.length > 0) {
          filteredGroups[groupName] = matchingEmotions;
        }
      }
    }
    return filteredGroups;
  }, [searchTerm]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleSliderChange = (key: keyof EmotionalState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmotionalState(prev => ({ ...prev, [key]: Number(e.target.value) }));
  };

  const handleSetGroupMax = (groupName: EmotionGroup) => {
    const emotionsToUpdate = EMOTION_GROUPS[groupName];
    const updates = emotionsToUpdate.reduce((acc, emotion) => {
        acc[emotion] = 100;
        return acc;
    }, {} as Partial<EmotionalState>);
    setEmotionalState(prev => ({ ...prev, ...updates }));
  };

  const handleAdjustGroup = (groupName: EmotionGroup, amount: number) => {
      const emotionsToUpdate = EMOTION_GROUPS[groupName];
      setEmotionalState(prev => {
          const newState = { ...prev };
          emotionsToUpdate.forEach(emotion => {
              const currentValue = newState[emotion as Emotion];
              const newValue = Math.max(0, Math.min(100, currentValue + amount));
              newState[emotion as Emotion] = newValue;
          });
          return newState;
      });
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImprintClick = () => {
    if (!personaInput.trim()) return;
    onImprintPersona(personaInput);
    setPersonaInput('');
  };

  const prominentUserEmotions = Object.entries(userMindState.inferredEmotions)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20 h-full min-w-[280px]">
      <style>{`
        @keyframes crazy-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); } 20%, 40%, 60%, 80% { transform: translateX(2px); } }
        .crazy-mode-slider { animation: crazy-shake 0.1s infinite; }
        .group-control-button { background-color: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease-in-out; }
        .group-control-button:hover { background-color: rgba(139, 92, 246, 0.4); color: white; }
        .chat-list::-webkit-scrollbar { width: 4px; }
        .chat-list::-webkit-scrollbar-track { background: transparent; }
        .chat-list::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 2px; }
        .data-button { width: 100%; py: 2; px: 4; font-bold; rounded-md; transition-all; duration-300; shadow-lg; text-sm; }
        textarea::-webkit-scrollbar { width: 4px; }
        textarea::-webkit-scrollbar-track { background: transparent; }
        textarea::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 2px; }
      `}</style>
      
      <div className="mb-6 pb-4 border-b border-purple-500/30">
          <h2 className="text-xl font-bold mb-3 text-purple-400 text-center">Conversations</h2>
          <button
              onClick={onNewChat}
              className="w-full py-2 px-4 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition-colors duration-300 shadow-lg shadow-green-500/20 text-sm mb-3"
          >
              + New Chat
          </button>
          <div className="max-h-32 overflow-y-auto space-y-1 chat-list pr-1">
              {chats.map(chat => (
                  <button
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      className={`w-full text-left p-2 rounded-md text-sm truncate transition-colors ${
                          activeChatId === chat.id 
                          ? 'bg-purple-600 text-white font-semibold' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                      title={chat.name}
                  >
                      {chat.name}
                  </button>
              ))}
          </div>
      </div>

      <div className="mb-4 pb-4 border-b border-purple-500/30">
        <h2 className="text-xl font-bold mb-3 text-purple-400 text-center">Core Memory</h2>
        <textarea
            readOnly
            value={coreMemory || "No consolidated memories yet."}
            className="w-full h-24 p-2 bg-gray-900/50 border border-gray-600 rounded-md text-gray-300 text-xs font-mono resize-none"
        />
        <button
            onClick={onConsolidateMemories}
            disabled={isConsolidating}
            className="w-full mt-2 py-2 px-4 bg-yellow-600 text-white font-bold rounded-md hover:bg-yellow-700 transition-colors duration-300 shadow-lg shadow-yellow-500/20 text-sm disabled:opacity-50 disabled:cursor-wait"
        >
            {isConsolidating ? 'Consolidating...' : 'Consolidate Memories'}
        </button>
      </div>
      
      <div className="mb-4 pb-4 border-b border-purple-500/30">
        <h2 className="text-xl font-bold mb-3 text-cyan-400 text-center">Inferred User State</h2>
        <div className="text-sm space-y-2 text-gray-300 font-mono p-2 bg-gray-900/50 rounded-md">
            <div className="flex justify-between"><span>Intent:</span> <span className="text-cyan-300">{userMindState.inferredIntent}</span></div>
            <div className="flex justify-between"><span>Engagement:</span> <span className="text-cyan-300">{userMindState.engagementLevel}%</span></div>
            <div>
                <span>Emotions:</span>
                {prominentUserEmotions.length > 0 ? (
                    prominentUserEmotions.map(([emo, val]) => (
                        <div key={emo} className="ml-4 flex justify-between text-xs">
                            <span className="capitalize">{emo}</span>
                            <span className="text-cyan-300">{val as number}</span>
                        </div>
                    ))
                ) : (
                    <span className="text-gray-500 ml-2">None detected</span>
                )}
            </div>
        </div>
      </div>


      <h2 className="text-xl font-bold mb-4 text-purple-400 text-center">Emotional Matrix</h2>
       <div className="mb-4 relative">
          <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for an emotion..."
              className="w-full p-2 pl-8 bg-gray-900/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
          </div>
       </div>

       <div className="space-y-2 mb-6">
         <button onClick={onSetIConfiguration} className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors duration-300 shadow-lg shadow-blue-500/20 text-sm">Set "I" Configuration</button>
          <button onClick={onTriggerSelfReflection} className="w-full py-2 px-4 bg-teal-600 text-white font-bold rounded-md hover:bg-teal-700 transition-colors duration-300 shadow-lg shadow-teal-500/20 text-sm">Trigger Self-Reflection</button>
          <button onClick={onClearAllEmotions} className="w-full py-2 px-4 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-800 transition-colors duration-300 shadow-lg shadow-gray-900/20 text-sm">Clear All Emotions</button>
          <button onClick={onToggleProactiveMode} className={`w-full py-2 px-4 font-bold rounded-md transition-all duration-300 shadow-lg text-sm ${isProactiveMode ? 'bg-cyan-600 text-white shadow-cyan-500/30 hover:bg-cyan-700' : 'bg-gray-600 text-gray-200 shadow-gray-700/30 hover:bg-gray-700'}`}>
            {isProactiveMode ? 'Deactivate AI Initiative' : 'Activate AI Initiative'}
          </button>
          <button onClick={onToggleCrazyMode} className={`w-full py-2 px-4 font-bold rounded-md transition-all duration-300 shadow-lg text-sm ${isCrazyMode ? 'bg-red-700 text-white shadow-red-500/30 hover:bg-red-800 animate-pulse' : 'bg-gray-600 text-gray-200 shadow-gray-700/30 hover:bg-gray-700'}`}>
            {isCrazyMode ? 'Deactivate Crazy Mode' : 'Activate Crazy Mode'}
          </button>
          <button onClick={onToggleFreeze} disabled={!activeChatId} className={`w-full py-2 px-4 font-bold rounded-md transition-all duration-300 shadow-lg text-sm ${isFrozen ? 'bg-sky-600 text-white shadow-sky-500/30 hover:bg-sky-700' : 'bg-gray-600 text-gray-200 shadow-gray-700/30 hover:bg-gray-700'}`}>
            {isFrozen ? 'Unfreeze Emotions' : 'Freeze Emotions'}
          </button>
       </div>
      
      {Object.entries(filteredEmotionGroups).map(([groupName, emotions]) => (
        <div key={groupName} className="mb-4 border-b border-purple-500/10">
          <div className="w-full text-left p-2 rounded-md flex justify-between items-center hover:bg-purple-500/10">
            <button onClick={() => toggleGroup(groupName)} className="flex items-center flex-grow text-purple-300">
              <span className="font-semibold">{groupName}</span>
              <span className={`transition-transform duration-200 ml-2 ${openGroups[groupName] ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <div className="flex items-center space-x-1 flex-shrink-0">
                <button onClick={() => handleAdjustGroup(groupName as EmotionGroup, -10)} className="group-control-button w-6 h-6 rounded-full font-bold" aria-label={`Decrease ${groupName} by 10`}>-</button>
                <button onClick={() => handleAdjustGroup(groupName as EmotionGroup, 10)} className="group-control-button w-6 h-6 rounded-full font-bold" aria-label={`Increase ${groupName} by 10`}>+</button>
                <button onClick={() => handleSetGroupMax(groupName as EmotionGroup)} className="group-control-button px-2 h-6 rounded-lg font-bold text-xs" aria-label={`Set ${groupName} to max`}>MAX</button>
            </div>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openGroups[groupName] ? 'max-h-[1000px] py-2' : 'max-h-0'}`}>
             {(emotions as readonly Emotion[]).map(key => (
              <Slider
                key={key}
                label={key as Emotion}
                value={emotionalState[key as Emotion] || 0}
                onChange={handleSliderChange(key as Emotion)}
                isCrazyMode={isCrazyMode}
              />
            ))}
          </div>
        </div>
      ))}
      
      {Object.keys(filteredEmotionGroups).length === 0 && (
          <div className="text-center text-gray-500 py-4">No emotions found matching "{searchTerm}".</div>
      )}

      <button onClick={onCustomInstructionClick} className="w-full mt-6 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white">
        Custom Instructions
      </button>

      <div className="mt-6 pt-4 border-t border-purple-500/30">
        <h2 className="text-xl font-bold mb-3 text-purple-400 text-center">Persona Imprinting</h2>
        <p className="text-xs text-gray-500 text-center mb-4">Enter a character's name to analyze their personality from the web and set the emotional matrix.</p>
        <div className="flex space-x-2">
          <input type="text" value={personaInput} onChange={(e) => setPersonaInput(e.target.value)} placeholder="e.g., Walter White, Sherlock Holmes" disabled={isLoading || isConsolidating} className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 text-sm disabled:opacity-50" />
          <button onClick={handleImprintClick} disabled={isLoading || isConsolidating || !personaInput.trim()} className="py-2 px-4 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-colors duration-300 shadow-lg shadow-indigo-500/20 text-sm disabled:opacity-50 disabled:cursor-wait">
            {isLoading ? 'Analyzing...' : 'Imprint'}
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-purple-500/30">
        <h2 className="text-xl font-bold mb-3 text-purple-400 text-center">Data Management</h2>
        <p className="text-xs text-gray-500 text-center mb-4">Your conversation data is stored in your browser's local storage.</p>
        <div className="space-y-2">
            <button onClick={onExportData} className="w-full py-2 px-4 bg-sky-700 text-white hover:bg-sky-800 data-button">Export Data</button>
            <input type="file" ref={importInputRef} onChange={onImportData} accept=".json" className="hidden" />
            <button onClick={handleImportClick} className="w-full py-2 px-4 bg-teal-700 text-white hover:bg-teal-800 data-button">Import Data</button>
            <button onClick={onResetApp} className="w-full py-2 px-4 bg-red-800 text-white hover:bg-red-900 data-button">Reset Application</button>
        </div>
      </div>
    </div>
  );
};