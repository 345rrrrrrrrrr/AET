import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { SimulationState } from '../types';

interface SimulationWindowProps {
    position: { x: number; y: number };
    size: { width: number; height: number };
    setPosition: (pos: { x: number; y: number }) => void;
    setSize: (size: { width: number; height: number }) => void;
    simulationState: SimulationState | null;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    speechBubble: { text: string, visible: boolean };
}

export const SimulationWindow: React.FC<SimulationWindowProps> = ({
    position, size, setPosition, setSize, simulationState, canvasRef, speechBubble
}) => {
    const isDraggingRef = useRef(false);
    const isResizingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPositionRef = useRef({ x: 0, y: 0 });
    const initialSizeRef = useRef({ width: 0, height: 0 });

    const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialPositionRef.current = position;
        e.preventDefault();
    };

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isResizingRef.current = true;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialSizeRef.current = size;
        e.preventDefault();
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingRef.current) {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setPosition({
                x: initialPositionRef.current.x + dx,
                y: initialPositionRef.current.y + dy,
            });
        }
        if (isResizingRef.current) {
            const dw = e.clientX - dragStartRef.current.x;
            const dh = e.clientY - dragStartRef.current.y;
            const minWidth = 500;
            const minHeight = 400;
            setSize({
                width: Math.max(minWidth, initialSizeRef.current.width + dw),
                height: Math.max(minHeight, initialSizeRef.current.height + dh),
            });
        }
    }, [setPosition, setSize]);

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
        isResizingRef.current = false;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    // Calculate speech bubble position
    const agentX = simulationState?.agent.x ?? 0;
    const agentY = simulationState?.agent.y ?? 0;
    const bubbleStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${agentX}px`,
        bottom: `${size.height - agentY + 10}px`,
        transform: 'translateX(-50%)',
        opacity: speechBubble.visible ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
    };

    return (
        <div
            className="fixed bg-black/80 backdrop-blur-sm border-2 border-cyan-500/50 z-40 flex flex-col font-mono text-sm shadow-2xl shadow-cyan-900/50 rounded-lg overflow-hidden"
            style={{ top: `${position.y}px`, left: `${position.x}px`, width: `${size.width}px`, height: `${size.height}px` }}
        >
            <div
                className="flex justify-center items-center p-2 bg-gray-900 border-b border-cyan-500/30 flex-shrink-0 cursor-move"
                onMouseDown={handleDragMouseDown}
            >
                <h3 className="text-cyan-400 font-bold tracking-widest select-none">AI SIMULATION - DAY {simulationState?.day ?? 1}</h3>
            </div>
            <div className="flex-1 w-full h-full relative">
                <canvas ref={canvasRef} width={size.width} height={size.height - 36} className="absolute top-0 left-0" />
                {speechBubble.text && (
                    <div style={bubbleStyle} className="bg-white text-black p-2 rounded-lg shadow-lg max-w-xs text-sm pointer-events-none">
                        {speechBubble.text}
                         <div className="absolute left-1/2 -bottom-2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white" style={{ transform: 'translateX(-50%)' }}></div>
                    </div>
                )}
            </div>
             <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={handleResizeMouseDown}
                title="Resize Simulation"
             />
        </div>
    );
};
