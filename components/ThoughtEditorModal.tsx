import React, { useState } from 'react';

interface ThoughtEditorModalProps {
  thoughtProcess: string;
  onApprove: (editedThought: string) => void;
  onClose: () => void;
}

export const ThoughtEditorModal: React.FC<ThoughtEditorModalProps> = ({ thoughtProcess, onApprove, onClose }) => {
  const [editedThought, setEditedThought] = useState(thoughtProcess);

  const handleApprove = () => {
    onApprove(editedThought);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className="bg-gray-900 border border-purple-500/50 rounded-lg shadow-2xl shadow-purple-900/50 p-6 w-full max-w-2xl m-4 flex flex-col">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Cognitive Intervention</h2>
        <p className="text-gray-400 mb-4 text-sm">
          The AI's intended thought process is displayed below. You can edit this monologue to guide its response before approving.
        </p>
        <textarea
          value={editedThought}
          onChange={(e) => setEditedThought(e.target.value)}
          className="w-full h-64 p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-400 resize-y"
          placeholder="The AI's thought process..."
        />
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-pink-700 text-white font-bold rounded-md hover:bg-pink-800 transition-colors duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            className="py-2 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-md hover:from-cyan-700 hover:to-blue-700 transition-all duration-300"
          >
            Approve Thought
          </button>
        </div>
      </div>
    </div>
  );
};
