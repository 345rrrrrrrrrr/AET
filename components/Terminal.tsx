
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TerminalLog } from '../types';

interface TerminalProps {
    logs: TerminalLog[];
    onCommand: (command: string) => void;
    history: string[];
    onClose: () => void;
    position: { x: number; y: number };
    size: { width: number; height: number };
    setPosition: (pos: { x: number; y: number }) => void;
    setSize: (size: { width: number; height: number }) => void;
}

const getLogColor = (type: TerminalLog['type']): string => {
    switch (type) {
        case 'command': return 'text-purple-400';
        case 'response': return 'text-white';
        case 'system': return 'text-yellow-400';
        case 'error': return 'text-red-500';
        case 'thought': return 'text-cyan-400';
        case 'info':
        default:
            return 'text-gray-300';
    }
}

export const Terminal: React.FC<TerminalProps> = ({ logs, onCommand, history, onClose, position, size, setPosition, setSize }) => {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(history.length);
  const endOfLogsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftInputRef = useRef('');
  
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPositionRef = useRef({ x: 0, y: 0 });
  const initialSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
      // When a new command is added to history from props, reset the index to the end
      setHistoryIndex(history.length);
  }, [history]);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          const minWidth = 400;
          const minHeight = 250;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onCommand(input);
      setInput('');
      draftInputRef.current = '';
      return;
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length === 0 || historyIndex <= 0) return;
        
        // If we're at the bottom (new command), save the current input as a draft
        if (historyIndex === history.length) {
            draftInputRef.current = input;
        }

        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex >= history.length) return;
        
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);

        // If we're moving back to the new command line, restore the draft
        setInput(newIndex === history.length ? draftInputRef.current : (history[newIndex] || ''));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // Any typing should "break" from history navigation and start a new entry
    setHistoryIndex(history.length);
  };


  return (
    <div 
        className="fixed bg-black/90 backdrop-blur-sm border-2 border-purple-500/50 z-50 flex flex-col font-mono text-sm shadow-2xl shadow-purple-900/50 rounded-lg overflow-hidden"
        style={{
            top: `${position.y}px`,
            left: `${position.x}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
        }}
    >
      <div 
        className="flex justify-between items-center p-2 bg-gray-900 border-b border-purple-500/30 flex-shrink-0"
        onMouseDown={handleDragMouseDown}
        style={{ cursor: 'move' }}
      >
        <h3 className="text-purple-400 font-bold tracking-widest select-none">COMMAND TERMINAL</h3>
        <button onClick={onClose} className="text-red-500 hover:text-white font-bold px-2 rounded-md hover:bg-red-500/20 transition-colors z-10">X</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2" onClick={() => inputRef.current?.focus()}>
        {logs.map((log, index) => (
          <div key={index} className="flex">
            <span className="text-gray-500 mr-2 flex-shrink-0">{log.timestamp}</span>
            <p className={`whitespace-pre-wrap break-words ${getLogColor(log.type)}`}>
              {log.message}
            </p>
          </div>
        ))}
        <div ref={endOfLogsRef} />
      </div>
      <div className="flex items-center p-2 border-t border-purple-500/30 flex-shrink-0">
        <span className="text-green-400 mr-2">$</span>
        <input 
          ref={inputRef}
          type="text" 
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-white outline-none"
          placeholder="Type a command... (e.g., set happiness 80, help)"
        />
      </div>
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeMouseDown}
        title="Resize Terminal"
      />
    </div>
  );
};