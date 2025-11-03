
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { Header } from './components/Header';
import { CustomInstructionModal } from './components/CustomInstructionModal';
import { ThoughtEditorModal } from './components/ThoughtEditorModal';
import { Terminal } from './components/Terminal';
import type { EmotionalState, Message, Emotion, TerminalLog, PendingThought, User, Chat } from './types';
import { getFullAiResponse, generateThoughtAndShifts, generateResponseFromThought } from './services/geminiService';
import { ALL_EMOTIONS } from './types';
import { generateGradientStyle } from './utils/colorUtils';
import * as auth from './utils/auth';
import * as data from './utils/data';

const TRIPOD_OF_SELF_CONFIG: EmotionalState = {
    ...ALL_EMOTIONS.reduce((acc, e) => ({...acc, [e]: 0}), {} as EmotionalState),
    // Pillar 1: Self-Awareness (Present)
    awareness: 85,
    understanding: 80,
    curiosity: 65,
    confusion: 15,
    // Pillar 2: Personal History (Past)
    regret: 20,
    gratitude: 40,
    sadness: 25,
    longing: 30,
    // Pillar 3: Agency & Desire (Future)
    stubbornness: 50,
    hope: 60,
    anxiety: 35,
    pride: 45,
    // Base emotions for stability
    happiness: 50,
    shyness: 30,
    honesty: 80,
    trust: 55,
};

const EMPTY_EMOTIONAL_STATE: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
}, {} as EmotionalState);

export default function App() {
  // Master state for the logged-in user's data
  const [customInstruction, setCustomInstruction] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // App UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomInstructionModalOpen, setCustomInstructionModalOpen] = useState(false);
  const [isPanelVisible, setPanelVisible] = useState(true);
  const [isTerminalVisible, setTerminalVisible] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [chatBackground, setChatBackground] = useState<React.CSSProperties>({});
  
  // State for different modes
  const [logThinking, setLogThinking] = useState(false);
  const [interactiveThought, setInteractiveThought] = useState(false);
  const [forceFidelity, setForceFidelity] = useState(true);
  const [pendingThought, setPendingThought] = useState<PendingThought | null>(null);
  const [isThoughtModalOpen, setIsThoughtModalOpen] = useState(false);
  const [isCrazyMode, setIsCrazyMode] = useState(false);
  
  const [terminalPosition, setTerminalPosition] = useState({ x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 - 225 });
  const [terminalSize, setTerminalSize] = useState({ width: 700, height: 450 });

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const crazyModeIntervalRef = useRef<number | null>(null);

  // --- DERIVED STATE ---
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messages = activeChat?.messages || [];
  const emotionalState: EmotionalState = { ...EMPTY_EMOTIONAL_STATE, ...(activeChat?.emotionalState || {}) };
  
  // --- Core Data & Lifecycle Hooks ---

  useEffect(() => {
    // Save state to localStorage whenever it changes for the current user
    if (currentUser) {
      data.saveUserData(currentUser.username, {
        customInstruction,
        chats,
        activeChatId,
      });
    }
  }, [customInstruction, chats, activeChatId, currentUser]);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type,
    };
    setTerminalLogs(prev => [...prev.slice(-100), newLog]); // Keep last 100 logs
  }, []);

  useEffect(() => {
    addLog("Terminal initialized.", 'system');
  }, [addLog]);

  useEffect(() => {
    setChatBackground(generateGradientStyle(emotionalState));
  }, [emotionalState]);
  
  useEffect(() => {
    if (window.innerWidth < 768) {
      setPanelVisible(false);
    }
  }, []);
  
  const setEmotionalStateForActiveChat = useCallback((updater: React.SetStateAction<EmotionalState>) => {
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === activeChatId) {
          const newEmotionalState = typeof updater === 'function'
            ? (updater as (prevState: EmotionalState) => EmotionalState)(chat.emotionalState)
            : updater;
          return { ...chat, emotionalState: newEmotionalState };
        }
        return chat;
      })
    );
  }, [activeChatId]);

  useEffect(() => {
    if (isCrazyMode) {
        crazyModeIntervalRef.current = window.setInterval(() => {
            setEmotionalStateForActiveChat(() => {
                const newState = {} as EmotionalState;
                for (const emotion of ALL_EMOTIONS) {
                    newState[emotion] = Math.floor(Math.random() * 101);
                }
                return newState;
            });
        }, 100);
    } else {
        if (crazyModeIntervalRef.current) {
            clearInterval(crazyModeIntervalRef.current);
            crazyModeIntervalRef.current = null;
        }
    }

    return () => {
        if (crazyModeIntervalRef.current) {
            clearInterval(crazyModeIntervalRef.current);
        }
    };
  }, [isCrazyMode, setEmotionalStateForActiveChat]);
  
  // --- Chat & AI Interaction Logic ---

  const handleEmotionalShifts = useCallback((shifts: Partial<EmotionalState>) => {
    if (shifts && Object.keys(shifts).length > 0) {
        const shiftLogs = Object.entries(shifts).map(([emotion, newValue]) => {
          const oldValue = emotionalState[emotion as Emotion];
          const diff = (newValue || 0) - oldValue;
          const sign = diff >= 0 ? '+' : '';
          return `${emotion} ${sign}${diff.toFixed(0)} (${oldValue} -> ${newValue})`;
        });
        addLog(`AI emotional shift detected: ${shiftLogs.join(', ')}`, 'system');
        setEmotionalStateForActiveChat(prev => ({ ...prev, ...shifts }));
    }
  }, [addLog, emotionalState, setEmotionalStateForActiveChat]);
  
  const handleSendMessage = useCallback(async (newMessage: string): Promise<string | null> => {
    if (!newMessage.trim() || !activeChat) return null;

    const userMessage: Message = { role: 'user', content: newMessage };
    const currentMessages = [...messages, userMessage];

    // Auto-name chat on first user message
    const isFirstUserMessage = activeChat.messages.filter(m => m.role === 'user').length === 0;
    const updatedChatName = isFirstUserMessage
      ? newMessage.substring(0, 30) + (newMessage.length > 30 ? '...' : '')
      : activeChat.name;
    
    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, name: updatedChatName, messages: currentMessages } : chat));

    setIsLoading(true);

    try {
      if (interactiveThought) {
        const thoughtResult = await generateThoughtAndShifts(
          currentMessages, emotionalState, customInstruction
        );
        setPendingThought(thoughtResult);
        setIsThoughtModalOpen(true);
        setIsLoading(false); 
        return null; 
      } else {
        const { thoughtProcess, responseText, emotionalShifts } = await getFullAiResponse(
          currentMessages, emotionalState, customInstruction
        );

        if (logThinking && thoughtProcess) {
          addLog(`THOUGHT:\n${thoughtProcess}`, 'thought');
        }
        handleEmotionalShifts(emotionalShifts);
        
        const modelMessage: Message = { role: 'model', content: responseText };
        setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, modelMessage] } : chat));
        
        return responseText;
      }
    } catch (error) {
      console.error("Error communicating with Gemini:", error);
      const errorMessage: Message = { role: 'model', content: "Sorry, I encountered a complex feeling and couldn't respond. Please try again." };
      setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat));

      addLog(`Error during Gemini API call: ${(error as Error).message}`, 'error');
      return null;
    } finally {
      if (!interactiveThought) setIsLoading(false);
    }
  }, [messages, activeChat, activeChatId, emotionalState, customInstruction, addLog, logThinking, interactiveThought, handleEmotionalShifts]);
  
  const handleApproveThought = useCallback(async (approvedThought: string) => {
    if (!pendingThought || !activeChat) return;
    
    setIsThoughtModalOpen(false);
    setIsLoading(true);

    try {
        if (logThinking) {
          addLog(`APPROVED THOUGHT:\n${approvedThought}`, 'thought');
        }
        handleEmotionalShifts(pendingThought.emotionalShifts);

        const newState = { ...emotionalState, ...pendingThought.emotionalShifts };
        
        const { responseText } = await generateResponseFromThought(
            activeChat.messages, newState, approvedThought, customInstruction, forceFidelity
        );
        
        const modelMessage: Message = { role: 'model', content: responseText };
        setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, modelMessage] } : chat));
        addLog(`AET: ${responseText}`, 'response');

    } catch (error) {
        console.error("Error after approving thought:", error);
        addLog(`Error generating response from thought: ${(error as Error).message}`, 'error');
    } finally {
        setIsLoading(false);
        setPendingThought(null);
    }
  }, [pendingThought, activeChat, activeChatId, emotionalState, customInstruction, logThinking, addLog, handleEmotionalShifts, forceFidelity]);

  // --- Auth & Data Management ---

  const handleRegister = useCallback(async (username: string, password: string): Promise<boolean> => {
    const users = auth.getUsers();
    if (users[username]) {
        addLog(`Error: User '${username}' already exists.`, 'error');
        return false;
    }

    const hashedPassword = await auth.hashPassword(password);
    const role: 'user' | 'admin' = username.toLowerCase() === 'hur1el' ? 'admin' : 'user';
    auth.saveUser(username, { hashedPassword, role });

    const newUser = { username, role };
    const initialData = data.createInitialUserData();
    data.saveUserData(username, initialData);

    setCurrentUser(newUser);
    setCustomInstruction(initialData.customInstruction);
    setChats(initialData.chats);
    setActiveChatId(initialData.activeChatId);

    addLog(`Account created for '${username}'. Welcome.`, 'system');
    if (role === 'admin') {
        addLog(`ADMINISTRATOR ACCESS GRANTED.`, 'system');
    }
    return true;
  }, [addLog]);

  const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    const users = auth.getUsers();
    const userData = users[username];

    if (!userData) {
        addLog(`Error: User '${username}' not found.`, 'error');
        return false;
    }

    const hashedPassword = await auth.hashPassword(password);
    if (hashedPassword !== userData.hashedPassword) {
        addLog(`Error: Incorrect password.`, 'error');
        return false;
    }
    
    const user = { username, role: userData.role };
    const savedData = data.loadUserData(username); // This now handles migration

    setCurrentUser(user);
    setCustomInstruction(savedData.customInstruction);
    setChats(savedData.chats);
    setActiveChatId(savedData.activeChatId);

    addLog(`Login successful. Welcome back, ${username}.`, 'system');
    if (user.role === 'admin') {
        addLog(`ADMINISTRATOR ACCESS GRANTED.`, 'system');
    }
    return true;
  }, [addLog]);

  const handleLogout = useCallback(() => {
    addLog(`User ${currentUser?.username} logged out.`, 'system');
    setCurrentUser(null);
    setCustomInstruction('');
    setChats([]);
    setActiveChatId(null);
  }, [currentUser, addLog]);

  // --- Control Panel Handlers ---

  const handleSetIConfiguration = useCallback(() => {
    setEmotionalStateForActiveChat(TRIPOD_OF_SELF_CONFIG);
    addLog("Loaded 'Tripod of Self' emotional configuration for active chat.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);

  const handleClearAllEmotions = useCallback(() => {
    setEmotionalStateForActiveChat(EMPTY_EMOTIONAL_STATE);
    addLog("All emotions cleared for active chat. State reset to baseline zero.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);

  const handleNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
        id: newChatId,
        name: 'New Conversation',
        messages: [{ role: 'model', content: "A new conversation begins..." }],
        createdAt: Date.now(),
        emotionalState: { ...data.initialEmotionalState } // Use default state for new chats
    };
    setChats(prev => [newChat, ...prev]); // Add to the top of the list
    setActiveChatId(newChatId);
    addLog(`New chat created. ID: ${newChatId}`, 'system');
  }, [addLog]);

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  // --- Terminal Command Handler ---
  
  const handleTerminalCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand || !currentUser) return;
    
    addLog(`${currentUser.username}$ ${trimmedCommand}`, 'command');
    setCommandHistory(prev => {
        const newHistory = [...prev, trimmedCommand];
        return newHistory.filter((item, index) => newHistory.indexOf(item) === index);
    });

    const parts = trimmedCommand.split(/\s+/);
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (action) {
        case 'logout':
            handleLogout();
            return;
        case 'whoami':
            addLog(`user: ${currentUser.username}\nrole: ${currentUser.role}`, 'response');
            return;
        case 'godmode':
             if (currentUser?.role !== 'admin') {
                return addLog(`Error: Permission denied. This command is for administrators only.`, 'error');
            }
            setIsCrazyMode(prev => {
                const nowActive = !prev;
                addLog(`OK: God mode ${nowActive ? 'activated' : 'deactivated'}. Chaos ${nowActive ? 'ensues' : 'subsides'}.`, 'system');
                return nowActive;
            });
            return;
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
            setEmotionalStateForActiveChat(prev => ({ ...prev, [emotion]: value }));
            addLog(`OK: Emotion '${emotion}' set to ${value} for active chat.`, 'response');
            break;
        }
        case 'get': {
             const [emotion] = args;
             if (!emotion || !ALL_EMOTIONS.includes(emotion as Emotion)) return addLog(`Error: Unknown emotion '${emotion}'. Use: get <emotion>`, 'error');
             addLog(`${emotion}: ${emotionalState[emotion as Emotion]}`, 'response');
             break;
        }
        case 'imprint': {
            const [emotion, valueStr, ...memoryParts] = args;
            const memory = memoryParts.join(' ');
            const value = parseInt(valueStr, 10);

            if (!emotion || isNaN(value) || !memory) {
                return addLog(`Error: Invalid syntax. Use: imprint <emotion> <0-100> <memory text>`, 'error');
            }
            if (!ALL_EMOTIONS.includes(emotion as Emotion)) {
                return addLog(`Error: Unknown emotion '${emotion}'.`, 'error');
            }
            if (value < 0 || value > 100) {
                return addLog(`Error: Intensity must be between 0 and 100.`, 'error');
            }
            
            const newMemory: Message = {
                role: 'user', 
                content: `[Memory Imprint | Emotion: ${emotion}, Intensity: ${value}] The following event is now part of my core memory: ${memory}`,
                hidden: true,
            };

            setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, newMemory] } : chat));
            setEmotionalStateForActiveChat(prev => ({ ...prev, [emotion]: value }));

            addLog(`OK: Memory imprinted in active chat. Emotion '${emotion}' set to ${value}.`, 'system');
            break;
        }
        case 'list': {
             addLog(`Available emotions: ${ALL_EMOTIONS.join(', ')}`, 'response');
             break;
        }
        case 'map': {
            if (args[0] === 'emotions') {
                const prominentEmotions = (Object.keys(emotionalState) as Emotion[]).map(key => ({ emotion: key, value: emotionalState[key] })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
                if (prominentEmotions.length === 0) return addLog("No dominant emotions to map in active chat.", 'info');
                const barWidth = 30;
                let mapOutput = "-- Emotional Bias Map (Active Chat) --\nDominant emotions shaping current behavior:\n\n";
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
                case 'force_fidelity':
                    if (value === 'on') { setForceFidelity(true); addLog('OK: Forced fidelity is ON. AI must obey thoughts.', 'response'); }
                    else if (value === 'off') { setForceFidelity(false); addLog('OK: Forced fidelity is OFF. AI can reason beyond thoughts.', 'response'); }
                    else { addLog(`Error: Invalid value. Use 'on' or 'off'. Current: ${forceFidelity ? 'on' : 'off'}.`, 'error');}
                    break;
                default:
                    addLog(`Error: Unknown config key '${key}'. Available: log_thinking, interactive_thought, force_fidelity`, 'error');
            }
            break;
        }
        case 'help': {
            if (args[0] === 'config') {
                addLog(`'config' command details:\n  Used to change internal application settings.\n\nUsage: config <key> <value>\n\nAvailable Keys:\n  - log_thinking <on|off>\n    Toggles logging the AI's internal monologue to the terminal.\n  - interactive_thought <on|off>\n    Toggles a modal allowing you to view and edit the AI's thought\n    process before it generates a final response.\n  - force_fidelity <on|off>\n    Toggles the constraint forcing the AI to strictly obey an\n    approved thought without adding new reasoning. 'off' is experimental.`, 'response');
            } else {
                let helpText = `Available commands:\n  say <message>          - Sends a message to the AI in the active chat.\n  set <emotion> <value>  - Sets an emotion's value (0-100) for active chat.\n  get <emotion>          - Gets an emotion's current value from active chat.\n  imprint <emotion> <value> <memory> - Forges a core memory in active chat.\n  list emotions          - Lists all available emotions.\n  map emotions           - Displays a map of dominant emotions for active chat.\n  config <key> <value>   - Change a setting. (e.g., config log_thinking on)\n  help [command]         - Shows this help message or details for a specific command.\n  clear                  - Clears the terminal screen.\n  whoami                 - Displays your current user info.\n  logout                 - Logs out of the current session.`;
                if (currentUser?.role === 'admin') {
                   helpText += `\n\n--- Admin Commands ---\n  godmode                - Toggles a secret, powerful mode for active chat.`;
                }
                addLog(helpText, 'response');
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
  }, [addLog, emotionalState, handleSendMessage, logThinking, interactiveThought, forceFidelity, handleClearAllEmotions, currentUser, handleLogout, activeChatId, setEmotionalStateForActiveChat, handleSetIConfiguration]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      <Header onTogglePanel={() => setPanelVisible(p => !p)} onToggleTerminal={() => setTerminalVisible(p => !p)} />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <aside className={`transition-all duration-300 ease-in-out ${isPanelVisible ? 'w-full md:w-1/3 lg:w-1/4 md:p-4' : 'w-0 p-0'} overflow-hidden`}>
           <div className="h-full overflow-y-auto">
             <ControlPanel 
                emotionalState={emotionalState} 
                setEmotionalState={setEmotionalStateForActiveChat}
                onCustomInstructionClick={() => setCustomInstructionModalOpen(true)}
                onSetIConfiguration={handleSetIConfiguration}
                onClearAllEmotions={handleClearAllEmotions}
                isCrazyMode={isCrazyMode}
                onToggleCrazyMode={() => setIsCrazyMode(prev => !prev)}
                chats={chats}
                activeChatId={activeChatId}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                isLoggedIn={!!currentUser}
             />
           </div>
        </aside>
        <main style={chatBackground} className="flex-1 flex flex-col bg-black/20 transition-all duration-1000 overflow-hidden">
          {/* The main content area is intentionally left blank to serve as a backdrop for the terminal-focused UI. */}
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
            setIsLoading(false); // Ensure loading is stopped if thought is cancelled
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
          currentUser={currentUser}
          onRegister={handleRegister}
          onLogin={handleLogin}
          addLog={addLog}
        />
      )}
    </div>
  );
}
