import React, { useState } from 'react';
import type { EmotionalState, Emotion } from '../types';
import { EMOTION_GROUPS } from '../types';
import { EMOTION_COLORS, adjustColor } from '../utils/colorUtils';

interface ControlPanelProps {
  emotionalState: EmotionalState;
  setEmotionalState: React.Dispatch<React.SetStateAction<EmotionalState>>;
  onCustomInstructionClick: () => void;
}

const Slider: React.FC<{
  label: Emotion;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, onChange }) => {
    const activeColor = adjustColor(EMOTION_COLORS[label], value);

    const thumbStyle: React.CSSProperties = {
        backgroundColor: activeColor,
        boxShadow: `0 0 5px ${activeColor}, 0 0 10px ${activeColor}`
    };

    return (
        <div className="mb-4">
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


export const ControlPanel: React.FC<ControlPanelProps> = ({ emotionalState, setEmotionalState, onCustomInstructionClick }) => {
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

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20 h-full min-w-[280px]">
      <h2 className="text-xl font-bold mb-6 text-purple-400 text-center">Emotional Matrix</h2>
      
      {Object.entries(EMOTION_GROUPS).map(([groupName, emotions]) => (
        <div key={groupName} className="mb-4 border-b border-purple-500/10">
          <button 
            onClick={() => toggleGroup(groupName)} 
            className="w-full text-left font-semibold text-purple-300 p-2 rounded-md hover:bg-purple-500/10 flex justify-between items-center"
          >
            <span>{groupName}</span>
            <span className={`transition-transform duration-200 ${openGroups[groupName] ? 'rotate-180' : ''}`}>▼</span>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openGroups[groupName] ? 'max-h-[1000px] py-2' : 'max-h-0'}`}>
             {emotions.map(key => (
              <Slider
                key={key}
                label={key as Emotion}
                value={emotionalState[key as Emotion]}
                onChange={handleSliderChange(key as Emotion)}
              />
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={onCustomInstructionClick}
        className="w-full mt-6 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white"
      >
        Custom Instructions
      </button>
    </div>
  );
};