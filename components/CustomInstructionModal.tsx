
import React, { useState } from 'react';

interface CustomInstructionModalProps {
  onClose: () => void;
  onSave: (instruction: string) => void;
  currentInstruction: string;
}

export const CustomInstructionModal: React.FC<CustomInstructionModalProps> = ({ onClose, onSave, currentInstruction }) => {
  const [instruction, setInstruction] = useState(currentInstruction);

  const handleSave = () => {
    onSave(instruction);
    onClose();
  };
  
  const handleClear = () => {
    setInstruction('');
    onSave('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-purple-500/50 rounded-lg shadow-2xl shadow-purple-900/50 p-6 w-full max-w-lg m-4">
        <h2 className="text-2xl font-bold text-purple-400 mb-4">Custom Instructions</h2>
        <p className="text-gray-400 mb-4 text-sm">Provide a specific instruction to override the AI's personality settings for the next interactions. This is a powerful tool to guide the conversation.</p>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          className="w-full h-40 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 resize-none"
          placeholder="e.g., Act as a professional software engineer and help me debug this code..."
        />
        <div className="mt-6 flex justify-between">
          <button
            onClick={handleClear}
            className="py-2 px-4 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700 transition-colors duration-300"
          >
            Clear & Close
          </button>
          <div className="flex space-x-4">
             <button
                onClick={onClose}
                className="py-2 px-4 bg-pink-700 text-white font-bold rounded-md hover:bg-pink-800 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
              >
                Save & Close
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};
