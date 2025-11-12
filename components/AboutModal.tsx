
import React from 'react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-purple-500/50 rounded-lg shadow-2xl shadow-purple-900/50 p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                About AET
            </h2>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl font-bold"
                aria-label="Close"
            >
                &times;
            </button>
        </div>
        
        <div className="text-gray-300 space-y-4">
          <p>
            The <strong className="text-purple-300">Artificial Emotion Terminal (AET)</strong> is an advanced conversational AI application designed to simulate a 'womanlike' personality with a complex, dynamic emotional state.
          </p>
          <p>
            Unlike traditional chatbots, AET's responses are deeply influenced by a persistent emotional matrix. Every interaction subtly shifts her feelings, leading to more nuanced, context-aware, and lifelike conversations. The control panel allows you to observe and directly manipulate this emotional state, providing a unique window into the AI's inner world.
          </p>
          <p>
            This project is an exploration into creating more believable and engaging AI companions by modeling the complexities of human emotion and cognition.
          </p>
        </div>

        <div className="mt-8 text-center">
            <button
                onClick={onClose}
                className="py-2 px-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
