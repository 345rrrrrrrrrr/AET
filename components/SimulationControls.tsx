import React from 'react';

interface SimulationControlsProps {
    onSetTime: (time: number) => void;
    onToggleRain: () => void;
    onSpawnAnimal: (type: 'sheep' | 'cow') => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
    onSetTime,
    onToggleRain,
    onSpawnAnimal
}) => {
    return (
        <div className="absolute top-20 right-4 z-50 bg-gray-800/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-2 flex flex-col items-center space-y-2 shadow-lg">
            <h4 className="text-cyan-400 font-bold text-xs uppercase tracking-wider select-none">CONTROLS</h4>
            <div className="w-full grid grid-cols-2 gap-1">
                <button
                    onClick={() => onSetTime(8.0)}
                    className="px-2 py-1 bg-yellow-500/50 text-white text-xs rounded hover:bg-yellow-500/80 transition-colors"
                    title="Set time to morning"
                >
                    Day
                </button>
                <button
                    onClick={() => onSetTime(22.0)}
                    className="px-2 py-1 bg-indigo-500/50 text-white text-xs rounded hover:bg-indigo-500/80 transition-colors"
                    title="Set time to night"
                >
                    Night
                </button>
                 <button
                    onClick={onToggleRain}
                    className="px-2 py-1 bg-blue-500/50 text-white text-xs rounded hover:bg-blue-500/80 transition-colors col-span-2"
                    title="Toggle rain on/off"
                >
                    Toggle Rain
                </button>
                 <button
                    onClick={() => onSpawnAnimal('sheep')}
                    className="px-2 py-1 bg-gray-400/50 text-white text-xs rounded hover:bg-gray-400/80 transition-colors"
                    title="Spawn a sheep"
                >
                    Sheep
                </button>
                 <button
                    onClick={() => onSpawnAnimal('cow')}
                    className="px-2 py-1 bg-gray-400/50 text-white text-xs rounded hover:bg-gray-400/80 transition-colors"
                    title="Spawn a cow"
                >
                    Cow
                </button>
            </div>
        </div>
    );
};
