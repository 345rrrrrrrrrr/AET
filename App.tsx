import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { Header } from './components/Header';
import { CustomInstructionModal } from './components/CustomInstructionModal';
import { ThoughtEditorModal } from './components/ThoughtEditorModal';
import { Terminal } from './components/Terminal';
import type { EmotionalState, Message, Emotion, TerminalLog, PendingThought } from './types';
import { getFullAiResponse, generateThoughtAndShifts, generateResponseFromThought, getTextToSpeech } from './services/geminiService';
import { playAudio } from './utils/audioUtils';
import { ALL_EMOTIONS } from './types';
import { generateGradientStyle } from './utils/colorUtils';

const initialEmotionalState: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
}, {} as Record<Emotion, number>);

Object.assign(initialEmotionalState, {
    shyness: 40, awareness: 70, stubbornness: 20, happiness: 60, sadness: 15,
    understanding: 80, curiosity: 70, contentment: 50, serenity: 40, gratitude: 50,
    love: 40, honesty: 90, trust: 50, hope: 60, faith: 50, tranquility: 40,
});

export default function App() {
  const [emotionalState, setEmotionalState] = useState<EmotionalState>(initialEmotionalState);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hello... how are you feeling today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomInstructionModalOpen, setCustomInstructionModalOpen] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [isPanelVisible, setPanelVisible] = useState(true);
  const [isTerminalVisible, setTerminalVisible] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [chatBackground, setChatBackground] = useState<React.CSSProperties>({});
  
  // New state for interactive thought mode
  const [logThinking, setLogThinking] = useState(false);
  const [interactiveThought, setInteractiveThought] = useState(false);
  const [pendingThought, setPendingThought] = useState<PendingThought | null>(null);
  const [isThoughtModalOpen, setIsThoughtModalOpen] = useState(false);
  
  const [terminalPosition, setTerminalPosition] = useState({ x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 - 225 });
  const [terminalSize, setTerminalSize] = useState({ width: 700, height: 450 });

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastUserMessageRef = useRef<Message | null>(null);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type,
    };
    setTerminalLogs(prev => [...prev.slice(-100), newLog]); // Keep last 100 logs
  }, []);

  useEffect(() => {
    addLog("Terminal initialized. Type 'help' for a list of commands.", 'system');
  }, [addLog]);

  useEffect(() => {
    setChatBackground(generateGradientStyle(emotionalState));
  }, [emotionalState]);
  
  useEffect(() => {
    if (window.innerWidth < 768) {
      setPanelVisible(false);
    }
     const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      document.removeEventListener('click', initAudioContext);
    };
    document.addEventListener('click', initAudioContext);
    return () => {
      document.removeEventListener('click', initAudioContext);
    };
  }, []);

  const handleEmotionalShifts = useCallback((shifts: Partial<EmotionalState>) => {
    if (shifts && Object.keys(shifts).length > 0) {
        const shiftLogs = Object.entries(shifts).map(([emotion, newValue]) => {
          const oldValue = emotionalState[emotion as Emotion];
          const diff = (newValue || 0) - oldValue;
          const sign = diff >= 0 ? '+' : '';
          return `${emotion} ${sign}${diff.toFixed(0)} (${oldValue} -> ${newValue})`;
        });
        addLog(`AI emotional shift detected: ${shiftLogs.join(', ')}`, 'system');
        setEmotionalState(prev => ({ ...prev, ...shifts }));
    }
  }, [addLog, emotionalState]);
  
  const handleFinalResponse = useCallback(async (responseText: string) => {
      const modelMessage: Message = { role: 'model', content: responseText };
      setMessages(prev => [...prev, modelMessage]);

      if (audioContextRef.current) {
        const audioData = await getTextToSpeech(responseText);
        if (audioData) {
          playAudio(audioData, audioContextRef.current);
        }
      }
  }, []);
  
  const handleSendMessage = useCallback(async (newMessage: string): Promise<string | null> => {
    if (!newMessage.trim()) return null;

    const userMessage: Message = { role: 'user', content: newMessage };
    lastUserMessageRef.current = userMessage;
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      if (interactiveThought) {
        const thoughtResult = await generateThoughtAndShifts(
          currentMessages, emotionalState, customInstruction
        );
        setPendingThought(thoughtResult);
        setIsThoughtModalOpen(true);
        setIsLoading(false); // Waiting for user input now
        return null; // Response will be handled by modal
      } else {
        const { thoughtProcess, responseText, emotionalShifts } = await getFullAiResponse(
          currentMessages, emotionalState, customInstruction
        );

        if (logThinking && thoughtProcess) {
          addLog(`THOUGHT:\n${thoughtProcess}`, 'thought');
        }
        handleEmotionalShifts(emotionalShifts);
        await handleFinalResponse(responseText);
        return responseText;
      }
    } catch (error) {
      console.error("Error communicating with Gemini:", error);
      const errorMessage: Message = { role: 'model', content: "Sorry, I encountered a complex feeling and couldn't respond. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
      addLog(`Error during Gemini API call: ${(error as Error).message}`, 'error');
      return null;
    } finally {
      if (!interactiveThought) setIsLoading(false);
    }
  }, [messages, emotionalState, customInstruction, addLog, logThinking, interactiveThought, handleEmotionalShifts, handleFinalResponse]);
  
  const handleApproveThought = useCallback(async (approvedThought: string) => {
    if (!pendingThought || !lastUserMessageRef.current) return;
    
    setIsThoughtModalOpen(false);
    setIsLoading(true);

    try {
        if (logThinking) {
          addLog(`APPROVED THOUGHT:\n${approvedThought}`, 'thought');
        }
        handleEmotionalShifts(pendingThought.emotionalShifts);

        // Calculate the new state after shifts are applied
        const newState = { ...emotionalState, ...pendingThought.emotionalShifts };
        
        const { responseText } = await generateResponseFromThought(
            [...messages, lastUserMessageRef.current], newState, approvedThought, customInstruction
        );
        
        await handleFinalResponse(responseText);

    } catch (error) {
        console.error("Error after approving thought:", error);
        addLog(`Error generating response from thought: ${(error as Error).message}`, 'error');
    } finally {
        setIsLoading(false);
        setPendingThought(null);
    }
  }, [pendingThought, messages, emotionalState, customInstruction, logThinking, addLog, handleEmotionalShifts, handleFinalResponse]);

  const handlePlayAudio = useCallback(async (text: string) => {
     if (audioContextRef.current) {
        try {
            setIsLoading(true);
            const audioData = await getTextToSpeech(text);
            if (audioData) { playAudio(audioData, audioContextRef.current); }
        } catch(error) {
            console.error("Error generating TTS audio:", error);
            addLog(`Error during TTS generation: ${(error as Error).message}`, 'error');
        } finally { setIsLoading(false); }
    } else { alert("Audio has not been enabled. Please click anywhere on the page first."); }
  }, [addLog]);

  const handleTerminalCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;
    
    addLog(`${trimmedCommand}`, 'command');
    setCommandHistory(prev => {
        if (prev.length === 0 || prev[prev.length - 1] !== trimmedCommand) {
            return [...prev, trimmedCommand];
        }
        return prev;
    });

    const parts = trimmedCommand.split(/\s+/);
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (action) {
        case 'say': {
            const message = args.join(' ');
            if (!message) return addLog(`Error: 'say' command requires a message.`, 'error');
            const aiResponse = await handleSendMessage(message);
            if (aiResponse) addLog(`AET: ${aiResponse}`, 'response');
            break;
        }
        case 'set': {
            const [emotion, valueStr] = args;
            const value = parseInt(valueStr, 10);
            if (!emotion || isNaN(value) || value < 0 || value > 100) return addLog(`Error: Invalid syntax. Use: set <emotion> <0-100>`, 'error');
            if (!ALL_EMOTIONS.includes(emotion as Emotion)) return addLog(`Error: Unknown emotion '${emotion}'. Type 'list emotions'.`, 'error');
            setEmotionalState(prev => ({ ...prev, [emotion]: value }));
            addLog(`OK: Emotion '${emotion}' set to ${value}.`, 'response');
            break;
        }
        case 'get': {
             const [emotion] = args;
             if (!emotion || !ALL_EMOTIONS.includes(emotion as Emotion)) return addLog(`Error: Unknown emotion '${emotion}'. Use: get <emotion>`, 'error');
             addLog(`${emotion}: ${emotionalState[emotion as Emotion]}`, 'response');
             break;
        }
        case 'list': {
             addLog(`Available emotions: ${ALL_EMOTIONS.join(', ')}`, 'response');
             break;
        }
        case 'map': {
            if (args[0] === 'emotions') {
                const prominentEmotions = (Object.keys(emotionalState) as Emotion[]).map(key => ({ emotion: key, value: emotionalState[key] })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
                if (prominentEmotions.length === 0) return addLog("No dominant emotions to map.", 'info');
                const barWidth = 30;
                let mapOutput = "-- Emotional Bias Map --\nDominant emotions shaping current behavior:\n\n";
                prominentEmotions.forEach(({ emotion, value }) => {
                    const filledCount = Math.round((value / 100) * barWidth);
                    const bar = '█'.repeat(filledCount) + ' '.repeat(barWidth - filledCount);
                    mapOutput += `${emotion.padEnd(15)} [${bar}] ${value}\n`;
                });
                addLog(mapOutput.trim(), 'response');
            } else {
                addLog(`Error: Unknown map command. Did you mean 'map emotions'?`, 'error');
            }
            break;
        }
        case 'config': {
            const [key, value] = args;
            if (!key) return addLog(`Error: Missing config key. Use 'help config' for options.`, 'error');
            switch (key) {
                case 'log_thinking':
                    if (value === 'on') { setLogThinking(true); addLog('OK: AI thought process logging is now ON.', 'response'); } 
                    else if (value === 'off') { setLogThinking(false); addLog('OK: AI thought process logging is now OFF.', 'response'); } 
                    else { addLog(`Error: Invalid value. Use 'on' or 'off'. Current: ${logThinking ? 'on' : 'off'}.`, 'error'); }
                    break;
                case 'interactive_thought':
                    if (value === 'on') { setInteractiveThought(true); addLog('OK: Interactive thought mode is now ON.', 'response'); }
                    else if (value === 'off') { setInteractiveThought(false); addLog('OK: Interactive thought mode is now OFF.', 'response'); }
                    else { addLog(`Error: Invalid value. Use 'on' or 'off'. Current: ${interactiveThought ? 'on' : 'off'}.`, 'error');}
                    break;
                default:
                    addLog(`Error: Unknown config key '${key}'. Available: log_thinking, interactive_thought`, 'error');
            }
            break;
        }
        case 'help': {
            if (args[0] === 'config') {
                addLog(`'config' command details:\n  Used to change internal application settings.\n\nUsage: config <key> <value>\n\nAvailable Keys:\n  - log_thinking <on|off>\n    Toggles logging the AI's internal monologue to the terminal.\n  - interactive_thought <on|off>\n    Toggles a modal allowing you to view and edit the AI's thought\n    process before it generates a final response.`, 'response');
            } else {
                addLog(`Available commands:\n  say <message>          - Sends a message to the AI.\n  set <emotion> <value>  - Sets an emotion's value (0-100).\n  get <emotion>          - Gets an emotion's current value.\n  list emotions          - Lists all available emotions.\n  map emotions           - Displays a map of dominant emotions.\n  config <key> <value>   - Change a setting. (e.g., config log_thinking on)\n  help [command]         - Shows this help message or details for a specific command.\n  clear                  - Clears the terminal screen.`, 'response');
            }
            break;
        }
        case 'clear': {
            setTerminalLogs([]);
            break;
        }
        default:
            addLog(`Error: Unknown command '${action}'. Type 'help' for assistance.`, 'error');
    }
  }, [addLog, emotionalState, handleSendMessage, logThinking, interactiveThought]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      <Header onTogglePanel={() => setPanelVisible(p => !p)} onToggleTerminal={() => setTerminalVisible(p => !p)} />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <aside className={`transition-all duration-300 ease-in-out ${isPanelVisible ? 'w-full md:w-1/3 lg:w-1/4 md:p-4' : 'w-0 p-0'} overflow-hidden`}>
           <div className="h-full overflow-y-auto">
             <ControlPanel emotionalState={emotionalState} setEmotionalState={setEmotionalState} onCustomInstructionClick={() => setCustomInstructionModalOpen(true)} />
           </div>
        </aside>
        <main style={chatBackground} className="flex-1 flex flex-col bg-black/20 transition-all duration-1000 overflow-hidden">
          <div className="w-full h-full max-w-4xl mx-auto flex flex-col">
            <ChatWindow messages={messages} isLoading={isLoading} onPlayAudio={handlePlayAudio} />
            <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </div>
        </main>
      </div>
      {isCustomInstructionModalOpen && (
        <CustomInstructionModal onClose={() => setCustomInstructionModalOpen(false)} onSave={setCustomInstruction} currentInstruction={customInstruction} />
      )}
      {isThoughtModalOpen && pendingThought && (
        <ThoughtEditorModal 
          thoughtProcess={pendingThought.thoughtProcess}
          onApprove={handleApproveThought}
          onClose={() => {
            setIsThoughtModalOpen(false);
            setPendingThought(null);
          }}
        />
      )}
      {isTerminalVisible && (
        <Terminal 
          logs={terminalLogs} 
          onCommand={handleTerminalCommand} 
          history={commandHistory}
          onClose={() => setTerminalVisible(false)}
          position={terminalPosition}
          setPosition={setTerminalPosition}
          size={terminalSize}
          setSize={setTerminalSize}
        />
      )}
    </div>
  );
}