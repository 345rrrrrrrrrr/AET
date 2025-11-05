
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CameraFeedProps {
  onToggle: (videoEl: HTMLVideoElement | null) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onToggle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPositionRef = useRef({ x: 20, y: 20 });
  const [position, setPosition] = useState({ x: 20, y: 20 });

  useEffect(() => {
    async function setupCamera() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setError("Camera permission denied. Please enable it in your browser settings.");
          setTimeout(() => onToggle(null), 3000);
        }
      } else {
        setError("Camera not supported on this device.");
        setTimeout(() => onToggle(null), 3000);
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [onToggle]);

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialPositionRef.current = position;
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
  }, [position]);

  const handleMouseUp = useCallback(() => {
      isDraggingRef.current = false;
  }, []);

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [handleMouseMove, handleMouseUp]);


  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-48 h-36 bg-black border-2 border-red-500 rounded-lg shadow-2xl shadow-red-900/50 overflow-hidden"
      style={{ top: `${position.y}px`, right: `${position.x}px` }}
    >
      <div className="absolute top-0 left-0 right-0 h-6 bg-black/50 text-red-400 text-xs font-mono flex items-center justify-center cursor-move" onMouseDown={handleDragMouseDown}>
        VISUAL CORTEX
      </div>
      {error ? (
        <div className="w-full h-full flex items-center justify-center p-2 text-center text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <video
          id="camera-feed-video"
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        ></video>
      )}
      <button 
        onClick={() => onToggle(videoRef.current)} 
        className="absolute bottom-1 right-1 w-6 h-6 bg-red-600/80 text-white rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-700"
        title="Deactivate Visual Cortex"
      >
        X
      </button>
    </div>
  );
};
