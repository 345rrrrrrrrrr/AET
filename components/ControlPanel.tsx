
import React, { useState } from 'react';
import type { EmotionalState, Emotion, EmotionGroup, Chat } from '../types';
import { EMOTION_GROUPS } from '../types';
import { EMOTION_COLORS, adjustColor } from '../utils/colorUtils';

interface ControlPanelProps {
  emotionalState: EmotionalState;
  setEmotionalState: React.Dispatch<React.SetStateAction<EmotionalState>>;
  onCustomInstructionClick: () => void;
  onSetIConfiguration: () => void;
  onClearAllEmotions: () => void;
  isCrazyMode: boolean;
  onToggleCrazyMode: () => void;
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  isLoggedIn: boolean;
}

const Slider: React.FC<{
  label: Emotion;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCrazyMode: boolean;
}> = ({ label, value, onChange, isCrazyMode }) => {
    const activeColor = adjustColor(EMOTION_COLORS[label], value);

    const thumbStyle: React.CSSProperties = {
        backgroundColor: activeColor,
        boxShadow: `0 0 5px ${activeColor}, 0 0 10px ${activeColor}`
    };

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
    emotionalState, setEmotionalState, onCustomInstructionClick, onSetIConfiguration, 
    onClearAllEmotions, isCrazyMode, onToggleCrazyMode, chats, activeChatId,
    onNewChat, onSelectChat, isLoggedIn
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    Object.keys(EMOTION_GROUPS).forEach(group => initialState[group] = true); // Default to open
    return initialState;
  });

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

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20 h-full min-w-[280px]">
      <style>{`
        @keyframes crazy-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .crazy-mode-slider {
          animation: crazy-shake 0.1s infinite;
        }
        .group-control-button {
            background-color: rgba(139, 92, 246, 0.2);
            color: #c4b5fd;
            border: 1px solid rgba(139, 92, 246, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease-in-out;
        }
        .group-control-button:hover {
            background-color: rgba(139, 92, 246, 0.4);
            color: white;
        }
        .chat-list::-webkit-scrollbar { width: 4px; }
        .chat-list::-webkit-scrollbar-track { background: transparent; }
        .chat-list::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 2px; }
      `}</style>
      
      {isLoggedIn && (
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
      )}

      <h2 className="text-xl font-bold mb-4 text-purple-400 text-center">Emotional Matrix</h2>
       <div className="space-y-2 mb-6">
         <button
            onClick={onSetIConfiguration}
            disabled={!isLoggedIn}
            className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors duration-300 shadow-lg shadow-blue-500/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set "I" Configuration
          </button>
          <button
            onClick={onClearAllEmotions}
            disabled={!isLoggedIn}
            className="w-full py-2 px-4 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-800 transition-colors duration-300 shadow-lg shadow-gray-900/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All Emotions
          </button>
          <button
            onClick={onToggleCrazyMode}
            disabled={!isLoggedIn}
            className={`w-full py-2 px-4 font-bold rounded-md transition-all duration-300 shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isCrazyMode 
                ? 'bg-red-700 text-white shadow-red-500/30 hover:bg-red-800 animate-pulse' 
                : 'bg-gray-600 text-gray-200 shadow-gray-700/30 hover:bg-gray-700'
            }`}
          >
            {isCrazyMode ? 'Deactivate Crazy Mode' : 'Activate Crazy Mode'}
          </button>
       </div>
      
      {Object.entries(EMOTION_GROUPS).map(([groupName, emotions]) => (
        <div key={groupName} className="mb-4 border-b border-purple-500/10">
          <div className="w-full text-left p-2 rounded-md flex justify-between items-center hover:bg-purple-500/10">
            <button 
              onClick={() => toggleGroup(groupName)} 
              className="flex items-center flex-grow text-purple-300 disabled:opacity-50"
              disabled={!isLoggedIn}
            >
              <span className="font-semibold">{groupName}</span>
              <span className={`transition-transform duration-200 ml-2 ${openGroups[groupName] ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <div className="flex items-center space-x-1 flex-shrink-0">
                <button onClick={() => handleAdjustGroup(groupName as EmotionGroup, -10)} disabled={!isLoggedIn} className="group-control-button w-6 h-6 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed" aria-label={`Decrease ${groupName} by 10`}>-</button>
                <button onClick={() => handleAdjustGroup(groupName as EmotionGroup, 10)} disabled={!isLoggedIn} className="group-control-button w-6 h-6 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed" aria-label={`Increase ${groupName} by 10`}>+</button>
                <button onClick={() => handleSetGroupMax(groupName as EmotionGroup)} disabled={!isLoggedIn} className="group-control-button px-2 h-6 rounded-lg font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed" aria-label={`Set ${groupName} to max`}>MAX</button>
            </div>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openGroups[groupName] ? 'max-h-[1000px] py-2' : 'max-h-0'}`}>
             {isLoggedIn ? emotions.map(key => (
              <Slider
                key={key}
                label={key as Emotion}
                value={emotionalState[key as Emotion] || 0}
                onChange={handleSliderChange(key as Emotion)}
                isCrazyMode={isCrazyMode}
              />
            )) : <p className="text-gray-500 text-center text-sm py-4">Log in to control emotions.</p>}
          </div>
        </div>
      ))}

      <button
        onClick={onCustomInstructionClick}
        disabled={!isLoggedIn}
        className="w-full mt-6 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Custom Instructions
      </button>
    </div>
  );
};
