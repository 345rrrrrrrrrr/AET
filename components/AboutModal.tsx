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
                Welcome to AET
            </h2>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl font-bold"
                aria-label="Close"
            >
                &times;
            </button>
        </div>
        <p className="text-gray-400 mb-6 text-base">
          The <span className="font-bold text-purple-300">Artifical Emotion Terminal</span> is a sophisticated interface for interacting with a womanlike AI companion. Her personality is not static; it is a dynamic, complex emotional state that you can observe and influence directly.
        </p>

        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">The Emotional Matrix</h3>
                <p className="text-gray-400">
                    The control panel is the core of the AET. Here, you can manually adjust over 50 different emotional parameters, from 'happiness' and 'shyness' to 'curiosity' and 'stubbornness'. Your conversations will directly impact this matrix, and in turn, the matrix will shape the tone, language, and substance of her replies.
                </p>
            </div>
            <div>
                <h3 className="text-xl font-semibold text-green-400 mb-2">Live Conversation</h3>
                <p className="text-gray-400">
                    Engage in real-time, low-latency voice conversations. The live mode allows for a natural, fluid dialogue where the AI can respond instantly and even be interrupted, creating a truly immersive experience. Her emotional state will shift based on the spoken conversation.
                </p>
            </div>
             <div>
                <h3 className="text-xl font-semibold text-blue-400 mb-2">Visual Cortex</h3>
                <p className="text-gray-400">
                    Activate the AI's visual cortex to allow her to "see" your environment through your camera. She can observe and comment on what she sees, adding another layer of contextual awareness to your interactions. This feature allows for conversations about your shared, immediate reality.
                </p>
            </div>
            <div>
                <h3 className="text-xl font-semibold text-yellow-400 mb-2">Command Terminal</h3>
                <p className="text-gray-400">
                   For power users, the terminal provides direct access to the AI's core functions. Set emotions with precision, imprint core memories, change system configurations, and more. Type <code className="bg-gray-800 text-yellow-300 px-1 rounded">help</code> for a full list of commands.
                </p>
            </div>
        </div>

        <div className="mt-8 text-center">
            <button
                onClick={onClose}
                className="py-2 px-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-md hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
                Continue
            </button>
        </div>
      </div>
    </div>
  );
};