import React, { useState, useRef } from 'react';
import type { Chat, UserMindState, AgentState, EmotionalState, EmotionGroup, Emotion, AIIdentity } from '../types';
import { EMOTION_GROUPS, ALL_EMOTIONS } from '../types';
import { EMOTION_COLORS } from '../utils/colorUtils';

interface ControlPanelProps {
  userMindState: UserMindState;
  agentState: AgentState;
  setAgentState: React.Dispatch<React.SetStateAction<AgentState>>;
  onCustomInstructionClick: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onResetApp: () => void;
  onExportData: () => void;
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
  aiIdentity: AIIdentity;
  onConsolidateMemories: () => void;
  isConsolidating: boolean;
  emotionalState: EmotionalState;
  setEmotionalState: (updater: React.SetStateAction<EmotionalState>) => void;
  isFrozen: boolean;
  onToggleFreeze: () => void;
  onSetConfigI: () => void;
  onClearEmotions: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    userMindState, agentState, setAgentState, onCustomInstructionClick,
    chats, activeChatId, onNewChat, onSelectChat, onResetApp, onExportData, onImportData,
    aiIdentity, onConsolidateMemories, isConsolidating,
    emotionalState, setEmotionalState, isFrozen, onToggleFreeze, onSetConfigI, onClearEmotions
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [activeEmotionTab, setActiveEmotionTab] = useState<EmotionGroup | 'All'>('Affective');

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleGiveItem = (item: 'wood' | 'food', amount: number) => {
    setAgentState(prev => ({
        ...prev,
        inventory: {
            ...prev.inventory,
            [item]: (prev.inventory[item] || 0) + amount,
        }
    }));
  };

  const prominentUserEmotions = Object.entries(userMindState.inferredEmotions)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);
    
  const emotionTabs: (EmotionGroup | 'All')[] = [...(Object.keys(EMOTION_GROUPS) as EmotionGroup[]), 'All'];
  const emotionsToList: readonly Emotion[] = activeEmotionTab === 'All'
    ? ALL_EMOTIONS
    : EMOTION_GROUPS[activeEmotionTab as EmotionGroup];

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20 h-full min-w-[280px]">
      <style>{`
        .chat-list::-webkit-scrollbar, .emotion-sliders::-webkit-scrollbar, textarea::-webkit-scrollbar { width: 4px; }
        .chat-list::-webkit-scrollbar-track, .emotion-sliders::-webkit-scrollbar-track, textarea::-webkit-scrollbar-track { background: transparent; }
        .chat-list::-webkit-scrollbar-thumb, .emotion-sliders::-webkit-scrollbar-thumb, textarea::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 2px; }
        .data-button { width: 100%; padding-top: 0.5rem; padding-bottom: 0.5rem; padding-left: 1rem; padding-right: 1rem; font-weight: 700; border-radius: 0.375rem; transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 300ms; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); font-size: 0.875rem; }
        input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type=range]:focus { outline: none; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #4a5568; border-radius: 5px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: currentColor; cursor: pointer; margin-top: -6px; border: 2px solid #2d3748; }
        input[type=range]:disabled::-webkit-slider-thumb { background: #718096; cursor: not-allowed; }
      `}</style>
      
      <div className="mb-6 pb-4 border-b border-purple-500/30">
          <h2 className="text-xl font-bold mb-3 text-purple-400 text-center">Emotional Matrix</h2>
          <button onClick={onToggleFreeze} className={`w-full py-2 px-4 font-bold rounded-md transition-colors duration-300 shadow-lg text-sm mb-3 text-white ${isFrozen ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}>
              {isFrozen ? 'Unfreeze Emotions' : 'Freeze Emotions'}
          </button>
          <div className="flex flex-wrap justify-center text-xs border-b border-gray-600 mb-2">
              {emotionTabs.map(group => (
                  <button key={group} onClick={() => setActiveEmotionTab(group)} className={`px-2 py-1 transition-colors ${activeEmotionTab === group ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400 hover:text-white'}`}>
                      {group}
                  </button>
              ))}
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-2 emotion-sliders">
              {activeChatId && emotionsToList.map(emotion => (
                  <div key={emotion}>
                      <label className="text-xs text-gray-400 capitalize flex justify-between">
                          <span>{emotion}</span>
                          <span>{emotionalState[emotion] || 0}</span>
                      </label>
                      <input
                          type="range"
                          min="0"
                          max="100"
                          value={emotionalState[emotion] || 0}
                          onChange={(e) => {
                              if (!isFrozen) {
                                  setEmotionalState(prev => ({...prev, [emotion]: parseInt(e.target.value)}))
                              }
                          }}
                          disabled={isFrozen || !activeChatId}
                          style={{ color: EMOTION_COLORS[emotion] }}
                      />
                  </div>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={onSetConfigI} disabled={!activeChatId} className="py-1 px-2 bg-purple-700/50 text-white font-bold rounded-md hover:bg-purple-600/50 transition-colors duration-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed">Config: Tripod of Self</button>
              <button onClick={onClearEmotions} disabled={!activeChatId} className="py-1 px-2 bg-purple-700/50 text-white font-bold rounded-md hover:bg-purple-600/50 transition-colors duration-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed">Clear Emotions</button>
          </div>
      </div>

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
        <h2 className="text-xl font-bold mb-3 text-purple-400 text-center">Self Narrative</h2>
        <textarea
            readOnly
            value={aiIdentity.selfNarrative || "No self-narrative yet."}
            className="w-full h-24 p-2 bg-gray-900/50 border border-gray-600 rounded-md text-gray-300 text-xs font-mono resize-none"
        />
        <button
            onClick={onConsolidateMemories}
            disabled={isConsolidating}
            className="w-full mt-2 py-2 px-4 bg-yellow-600 text-white font-bold rounded-md hover:bg-yellow-700 transition-colors duration-300 shadow-lg shadow-yellow-500/20 text-sm disabled:opacity-50 disabled:cursor-wait"
        >
            {isConsolidating ? 'Consolidating...' : 'Consolidate Identity'}
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

      <div className="mb-4 pb-4 border-b border-purple-500/30">
        <h2 className="text-xl font-bold mb-3 text-yellow-400 text-center">AI Agent State</h2>
        <div className="text-sm space-y-2 text-gray-300 font-mono p-2 bg-gray-900/50 rounded-md">
            <div className="flex justify-between items-center"><span>Hunger:</span> <span className="text-yellow-300">{agentState.hunger.toFixed(0)}</span></div>
            <div className="flex justify-between items-center"><span>Novelty:</span> <span className="text-yellow-300">{agentState.novelty.toFixed(0)}</span></div>
            <div className="flex justify-between items-center"><span>Wood:</span> <span className="text-yellow-300">{agentState.inventory.wood || 0}</span></div>
            <div className="flex justify-between items-center"><span>Food:</span> <span className="text-yellow-300">{agentState.inventory.food || 0}</span></div>
            <div className="flex justify-between items-center"><span>Tools:</span> <span className="text-yellow-300">{agentState.tools.join(', ') || 'None'}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => handleGiveItem('wood', 10)} className="py-1 px-2 bg-yellow-700/50 text-white font-bold rounded-md hover:bg-yellow-600/50 transition-colors duration-300 text-xs">Give 10 Wood</button>
            <button onClick={() => handleGiveItem('food', 10)} className="py-1 px-2 bg-yellow-700/50 text-white font-bold rounded-md hover:bg-yellow-600/50 transition-colors duration-300 text-xs">Give 10 Food</button>
        </div>
      </div>

      <button onClick={onCustomInstructionClick} className="w-full mt-6 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white">
        Custom Instructions
      </button>

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
