
import React from 'react';

interface LiveTranscriptionOverlayProps {
  userText: string;
  modelText: string;
}

export const LiveTranscriptionOverlay: React.FC<LiveTranscriptionOverlayProps> = ({ userText, modelText }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/70 backdrop-blur-sm pointer-events-none">
      <div className="max-w-4xl mx-auto font-mono text-lg">
        <div className="flex items-start mb-2">
          <span className="text-purple-400 font-bold w-16 flex-shrink-0">USER:</span>
          <p className="text-gray-200 flex-1">{userText}<span className="animate-pulse">|</span></p>
        </div>
        <div className="flex items-start">
          <span className="text-cyan-400 font-bold w-16 flex-shrink-0">AET:</span>
          <p className="text-white flex-1">{modelText}<span className="animate-pulse">|</span></p>
        </div>
      </div>
    </div>
  );
};
