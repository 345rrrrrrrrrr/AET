
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { Header } from './components/Header';
import { CustomInstructionModal } from './components/CustomInstructionModal';
import { ThoughtEditorModal } from './components/ThoughtEditorModal';
import { Terminal } from './components/Terminal';
import type { EmotionalState, Message, Emotion, TerminalLog, PendingThought, User, Chat } from './types';
import { getFullAiResponse, generateThoughtAndShifts, generateResponseFromThought, getTextToSpeech, generateSpontaneousThought } from './services/geminiService';
import { playAudio, createBlob, decode, decodeAudioData } from './utils/audioUtils';
import { ALL_EMOTIONS } from './types';
import { generateGradientStyle } from './utils/colorUtils';
import * as auth from './utils/auth';
import * as data from './utils/data';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import type { LiveSession } from '@google/genai';

const TRIPOD_OF_SELF_CONFIG: EmotionalState = {
    ...ALL_EMOTIONS.reduce((acc, e) => ({...acc, [e]: 0}), {} as EmotionalState),
    awareness: 85, understanding: 80, curiosity: 65, confusion: 15,
    regret: 20, gratitude: 40, sadness: 25, longing: 30,
    stubbornness: 50, hope: 60, anxiety: 35, pride: 45,
    happiness: 50, shyness: 30, honesty: 80, trust: 55,
};

const EMPTY_EMOTIONAL_STATE: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
}, {} as EmotionalState);

export default function App() {
  const [customInstruction, setCustomInstruction] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomInstructionModalOpen, setCustomInstructionModalOpen] = useState(false);
  const [isPanelVisible, setPanelVisible] = useState(true);
  const [isTerminalVisible, setTerminalVisible] = useState(true);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [chatBackground, setChatBackground] = useState<React.CSSProperties>({});
  const [logThinking, setLogThinking] = useState(false);
  const [interactiveThought, setInteractiveThought] = useState(false);
  const [forceFidelity, setForceFidelity] = useState(true);
  const [pendingThought, setPendingThought] = useState<PendingThought | null>(null);
  const [isThoughtModalOpen, setIsThoughtModalOpen] = useState(false);
  const [isCrazyMode, setIsCrazyMode] = useState(false);
  const [isProactiveMode, setIsProactiveMode] = useState(false);
  const [terminalPosition, setTerminalPosition] = useState({ x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 - 225 });
  const [terminalSize, setTerminalSize] = useState({ width: 700, height: 450 });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const crazyModeIntervalRef = useRef<number | null>(null);
  const proactiveTimeoutRef = useRef<number | null>(null);

  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState({ user: '', model: '' });
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const currentTranscriptionTurnRef = useRef({ user: '', model: '' });

  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messages = activeChat?.messages || [];
  const emotionalState: EmotionalState = { ...EMPTY_EMOTIONAL_STATE, ...(activeChat?.emotionalState || {}) };
  
  const emotionalStateRef = useRef(emotionalState);
  emotionalStateRef.current = emotionalState;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const customInstructionRef = useRef(customInstruction);
  customInstructionRef.current = customInstruction;
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;

  useEffect(() => {
    if (currentUser) {
      data.saveUserData(currentUser.username, { customInstruction, chats, activeChatId });
    }
  }, [customInstruction, chats, activeChatId, currentUser]);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type,
    };
    setTerminalLogs(prev => [...prev.slice(-100), newLog]);
  }, []);

  useEffect(() => {
    addLog("Terminal initialized.", 'system');
    if (window.innerWidth < 768) { setPanelVisible(false); }
  }, [addLog]);
  
  useEffect(() => {
    const lastUser = localStorage.getItem('aet_last_active_user');
    if (lastUser) {
        const users = auth.getUsers();
        if (users[lastUser]) {
            handleLogin(lastUser, '', true);
        } else {
            localStorage.removeItem('aet_last_active_user');
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    setChatBackground(generateGradientStyle(emotionalState));
  }, [emotionalState]);
  
  const initAudioContexts = useCallback(() => {
    if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (!inputAudioContextRef.current) {
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    document.removeEventListener('click', initAudioContexts);
    document.removeEventListener('keydown', initAudioContexts);
  }, []);

  useEffect(() => {
    document.addEventListener('click', initAudioContexts);
    document.addEventListener('keydown', initAudioContexts);
    return () => {
      document.removeEventListener('click', initAudioContexts);
      document.removeEventListener('keydown', initAudioContexts);
    };
  }, [initAudioContexts]);
  
  const setEmotionalStateForActiveChat = useCallback((updater: React.SetStateAction<EmotionalState>) => {
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === activeChatIdRef.current) {
          const newEmotionalState = typeof updater === 'function' ? updater(chat.emotionalState) : updater;
          return { ...chat, emotionalState: newEmotionalState };
        }
        return chat;
      })
    );
  }, []);

  useEffect(() => {
    if (isCrazyMode) {
        crazyModeIntervalRef.current = window.setInterval(() => {
            setEmotionalStateForActiveChat(() => {
                const newState = {} as EmotionalState;
                ALL_EMOTIONS.forEach(emotion => newState[emotion] = Math.floor(Math.random() * 101));
                return newState;
            });
        }, 100);
    } else if (crazyModeIntervalRef.current) {
        clearInterval(crazyModeIntervalRef.current);
        crazyModeIntervalRef.current = null;
    }
    return () => { if (crazyModeIntervalRef.current) clearInterval(crazyModeIntervalRef.current); };
  }, [isCrazyMode, setEmotionalStateForActiveChat]);
  
  const handleEmotionalShifts = useCallback((shifts: Partial<EmotionalState>) => {
    if (shifts && Object.keys(shifts).length > 0) {
        const shiftLogs = Object.entries(shifts).map(([emotion, newValue]) => {
          const oldValue = emotionalStateRef.current[emotion as Emotion] ?? 0;
          const diff = Number(newValue ?? 0) - oldValue;
          const sign = diff >= 0 ? '+' : '';
          return `${emotion} ${sign}${diff.toFixed(0)} (${oldValue} -> ${Number(newValue ?? 0)})`;
        });
        addLog(`AI emotional shift detected: ${shiftLogs.join(', ')}`, 'system');
        setEmotionalStateForActiveChat(prev => ({ ...prev, ...shifts }));
    }
  }, [addLog, setEmotionalStateForActiveChat]);
  
  const handleFinalResponse = useCallback(async (responseText: string, chatId: string | null) => {
      const modelMessage: Message = { role: 'model', content: responseText };
      setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, modelMessage] } : chat));

      if (outputAudioContextRef.current) {
        const audioData = await getTextToSpeech(responseText);
        if (audioData) playAudio(audioData, outputAudioContextRef.current);
      }
  }, []);
  
  const handleSendMessage = useCallback(async (newMessage: string): Promise<string | null> => {
    if (!newMessage.trim() || !activeChat) return null;

    const userMessage: Message = { role: 'user', content: newMessage };
    const currentMessages = [...messages, userMessage];
    const isFirstUserMessage = activeChat.messages.filter(m => m.role === 'user').length === 0;
    const updatedChatName = isFirstUserMessage ? newMessage.substring(0, 30) + (newMessage.length > 30 ? '...' : '') : activeChat.name;
    
    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, name: updatedChatName, messages: currentMessages } : chat));
    setIsLoading(true);

    try {
      if (interactiveThought) {
        const thoughtResult = await generateThoughtAndShifts(currentMessages, emotionalState, customInstruction);
        setPendingThought(thoughtResult);
        setIsThoughtModalOpen(true);
        setIsLoading(false); 
        return null; 
      } else {
        const { thoughtProcess, responseText, emotionalShifts } = await getFullAiResponse(currentMessages, emotionalState, customInstruction);
        if (logThinking && thoughtProcess) addLog(`THOUGHT:\n${thoughtProcess}`, 'thought');
        handleEmotionalShifts(emotionalShifts);
        await handleFinalResponse(responseText, activeChatId);
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
  }, [messages, activeChat, activeChatId, emotionalState, customInstruction, addLog, logThinking, interactiveThought, handleEmotionalShifts, handleFinalResponse]);
  
  const handleApproveThought = useCallback(async (approvedThought: string) => {
    if (!pendingThought || !activeChat) return;
    setIsThoughtModalOpen(false);
    setIsLoading(true);
    try {
        if (logThinking) addLog(`APPROVED THOUGHT:\n${approvedThought}`, 'thought');
        handleEmotionalShifts(pendingThought.emotionalShifts);
        const newState = { ...emotionalState, ...pendingThought.emotionalShifts };
        const { responseText } = await generateResponseFromThought(activeChat.messages, newState, approvedThought, customInstruction, forceFidelity);
        await handleFinalResponse(responseText, activeChat.id);
    } catch (error) {
        console.error("Error after approving thought:", error);
        addLog(`Error generating response from thought: ${(error as Error).message}`, 'error');
    } finally {
        setIsLoading(false);
        setPendingThought(null);
    }
  }, [pendingThought, activeChat, emotionalState, customInstruction, logThinking, addLog, handleEmotionalShifts, handleFinalResponse, forceFidelity]);

  const handlePlayAudio = useCallback(async (text: string) => {
     if (outputAudioContextRef.current) {
        try {
            setIsLoading(true);
            const audioData = await getTextToSpeech(text);
            if (audioData) { playAudio(audioData, outputAudioContextRef.current); }
        } catch(error) {
            console.error("Error generating TTS audio:", error);
            addLog(`Error during TTS generation: ${(error as Error).message}`, 'error');
        } finally { setIsLoading(false); }
    } else { alert("Audio has not been enabled. Please click or type anywhere on the page first."); }
  }, [addLog]);

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
    localStorage.setItem('aet_last_active_user', username);
    addLog(`Account created for '${username}'. Welcome.`, 'system');
    if (role === 'admin') addLog(`ADMINISTRATOR ACCESS GRANTED.`, 'system');
    return true;
  }, [addLog]);

  const handleLogin = useCallback(async (username: string, password: string, isSessionRestore = false): Promise<boolean> => {
    const users = auth.getUsers();
    const userData = users[username];
    if (!userData) {
        addLog(`Error: User '${username}' not found.`, 'error');
        return false;
    }
    if (!isSessionRestore) {
        const hashedPassword = await auth.hashPassword(password);
        if (hashedPassword !== userData.hashedPassword) {
            addLog(`Error: Incorrect password.`, 'error');
            return false;
        }
    }
    const user = { username, role: userData.role };
    const savedData = data.loadUserData(username);
    setCurrentUser(user);
    setCustomInstruction(savedData.customInstruction);
    setChats(savedData.chats);
    setActiveChatId(savedData.activeChatId);
    localStorage.setItem('aet_last_active_user', username);
    addLog(isSessionRestore ? `Session restored for ${username}.` : `Login successful. Welcome back, ${username}.`, 'system');
    if (user.role === 'admin') addLog(`ADMINISTRATOR ACCESS GRANTED.`, 'system');
    return true;
  }, [addLog]);

  const handleLogout = useCallback(() => {
    addLog(`User ${currentUser?.username} logged out.`, 'system');
    localStorage.removeItem('aet_last_active_user');
    setCurrentUser(null);
    setCustomInstruction('');
    setChats([]);
    setActiveChatId(null);
  }, [currentUser, addLog]);

  const handleSetIConfiguration = useCallback(() => {
    setEmotionalStateForActiveChat(() => TRIPOD_OF_SELF_CONFIG);
    addLog("Loaded 'Tripod of Self' emotional configuration for active chat.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);

  const handleClearAllEmotions = useCallback(() => {
    setEmotionalStateForActiveChat(() => EMPTY_EMOTIONAL_STATE);
    addLog("All emotions cleared for active chat. State reset to baseline zero.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);

  const handleNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
        id: newChatId,
        name: 'New Conversation',
        messages: [{ role: 'model', content: "A new conversation begins..." }],
        createdAt: Date.now(),
        emotionalState: { ...data.initialEmotionalState }
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    addLog(`New chat created. ID: ${newChatId}`, 'system');
  }, [addLog]);

  const handleSelectChat = useCallback((chatId: string) => { setActiveChatId(chatId); }, []);

  const handleTerminalCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand || !currentUser) return;
    addLog(`${currentUser.username}$ ${trimmedCommand}`, 'command');
    setCommandHistory(prev => [...new Set([...prev, trimmedCommand])]);
    const [action, ...args] = trimmedCommand.split(/\s+/);

    switch (action.toLowerCase()) {
        case 'logout': handleLogout(); break;
        case 'whoami': addLog(`user: ${currentUser.username}\nrole: ${currentUser.role}`, 'response'); break;
        case 'godmode':
             if (currentUser?.role !== 'admin') return addLog(`Error: Permission denied.`, 'error');
             setIsCrazyMode(prev => { addLog(`OK: God mode ${!prev ? 'activated' : 'deactivated'}.`, 'system'); return !prev; });
             break;
        case 'say':
            const message = args.join(' ');
            if (!message) return addLog(`Error: 'say' command requires a message.`, 'error');
            const aiResponse = await handleSendMessage(message);
            if (aiResponse) addLog(`AET: ${aiResponse}`, 'response');
            break;
        case 'set':
            const [emotion, valueStr] = args;
            const value = parseInt(valueStr, 10);
            if (!emotion || isNaN(value) || value < 0 || value > 100 || !ALL_EMOTIONS.includes(emotion as Emotion)) return addLog(`Error: Invalid syntax or emotion. Use: set <emotion> <0-100>`, 'error');
            setEmotionalStateForActiveChat(prev => ({ ...prev, [emotion]: value }));
            addLog(`OK: Emotion '${emotion}' set to ${value} for active chat.`, 'response');
            break;
        case 'get':
             const [emo] = args;
             if (!emo || !ALL_EMOTIONS.includes(emo as Emotion)) return addLog(`Error: Unknown emotion.`, 'error');
             addLog(`${emo}: ${emotionalState[emo as Emotion]}`, 'response');
             break;
        case 'imprint':
            const [em, valStr, ...memParts] = args;
            const mem = memParts.join(' ');
            const val = parseInt(valStr, 10);
            if (!em || isNaN(val) || !mem || !ALL_EMOTIONS.includes(em as Emotion) || val < 0 || val > 100) return addLog(`Error: Invalid syntax. Use: imprint <emotion> <0-100> <memory text>`, 'error');
            const newMemory: Message = { role: 'user', content: `[Memory Imprint | Emotion: ${em}, Intensity: ${val}] The following event is now part of my core memory: ${mem}`, hidden: true };
            setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, newMemory] } : chat));
            setEmotionalStateForActiveChat(prev => ({ ...prev, [em]: val }));
            addLog(`OK: Memory imprinted in active chat. Emotion '${em}' set to ${val}.`, 'system');
            break;
        case 'list': addLog(`Available emotions: ${ALL_EMOTIONS.join(', ')}`, 'response'); break;
        case 'map':
            if (args[0] === 'emotions') {
                const prominent = (Object.keys(emotionalState) as Emotion[]).map(key => ({ emotion: key, value: emotionalState[key] })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
                if (prominent.length === 0) return addLog("No dominant emotions.", 'info');
                let mapOutput = "-- Emotional Bias Map --\n";
                prominent.forEach(({ emotion, value }) => mapOutput += `${emotion.padEnd(15)} [${'█'.repeat(Math.round(value/5)).padEnd(20)}] ${value}\n`);
                addLog(mapOutput.trim(), 'response');
            } else addLog(`Error: Unknown map command. Try 'map emotions'.`, 'error');
            break;
        case 'config':
            const [key, v] = args;
            if (!key) return addLog(`Error: Missing config key. Use 'help config'.`, 'error');
            const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, name: string) => {
              if (v === 'on') { setter(true); addLog(`OK: ${name} is ON.`, 'response'); } 
              else if (v === 'off') { setter(false); addLog(`OK: ${name} is OFF.`, 'response'); } 
              else { addLog(`Error: Invalid value. Use 'on' or 'off'.`, 'error'); }
            };
            if (key === 'log_thinking') toggle(setLogThinking, 'AI thought logging');
            else if (key === 'interactive_thought') toggle(setInteractiveThought, 'Interactive thought');
            else if (key === 'force_fidelity') toggle(setForceFidelity, 'Forced fidelity');
            else addLog(`Error: Unknown config key '${key}'.`, 'error');
            break;
        case 'help': addLog(`Commands: say, set, get, imprint, list, map, config, clear, whoami, logout, godmode (admin)`, 'response'); break;
        case 'clear': setTerminalLogs([]); break;
        default: addLog(`Error: Unknown command '${action}'. Type 'help'.`, 'error');
    }
  }, [currentUser, addLog, handleLogout, handleSendMessage, setEmotionalStateForActiveChat, emotionalState, activeChatId]);

  // --- Proactive AI Initiative ---
  useEffect(() => {
    if (proactiveTimeoutRef.current) clearTimeout(proactiveTimeoutRef.current);

    if (isProactiveMode && currentUser && !isLoading && !isLiveMode) {
        proactiveTimeoutRef.current = window.setTimeout(async () => {
            if (!activeChatIdRef.current) return;
            addLog("AI Initiative: Contemplating...", 'system');
            
            const result = await generateSpontaneousThought(
                messagesRef.current,
                emotionalStateRef.current,
                customInstructionRef.current
            );
            
            if (result.thoughtProcess && logThinking) {
                addLog(`PROACTIVE THOUGHT:\n${result.thoughtProcess}`, 'thought');
            }
            
            if (result.emotionalShifts && Object.keys(result.emotionalShifts).length > 0) {
                handleEmotionalShifts(result.emotionalShifts);
            }

            if (result.shouldSpeak && result.responseText) {
                addLog(`AI Initiative: Decided to speak.`, 'system');
                handleFinalResponse(result.responseText, activeChatIdRef.current);
            } else {
                addLog(`AI Initiative: Decided to remain silent after reflection.`, 'system');
            }
        }, 15000); 
    }
    return () => { if (proactiveTimeoutRef.current) clearTimeout(proactiveTimeoutRef.current); };
  }, [isProactiveMode, isLoading, messages, currentUser, isLiveMode, addLog, logThinking, handleEmotionalShifts, handleFinalResponse]);

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
                isProactiveMode={isProactiveMode}
                onToggleProactiveMode={() => setIsProactiveMode(prev => !prev)}
                chats={chats}
                activeChatId={activeChatId}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                isLoggedIn={!!currentUser}
             />
           </div>
        </aside>
        <main style={chatBackground} className="flex-1 flex flex-col bg-black/20 transition-all duration-1000 overflow-hidden relative">
          <div className="w-full h-full max-w-4xl mx-auto flex flex-col">
            <ChatWindow messages={messages} isLoading={isLoading} onPlayAudio={handlePlayAudio} />
            <div className="p-4 border-t border-purple-500/20 bg-gray-900/50">
              <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading || !currentUser || isLiveMode} onStartLive={()=>{}} />
            </div>
          </div>
        </main>
      </div>
      {isCustomInstructionModalOpen && <CustomInstructionModal onClose={() => setCustomInstructionModalOpen(false)} onSave={setCustomInstruction} currentInstruction={customInstruction} />}
      {isThoughtModalOpen && pendingThought && <ThoughtEditorModal thoughtProcess={pendingThought.thoughtProcess} onApprove={handleApproveThought} onClose={() => { setIsThoughtModalOpen(false); setPendingThought(null); }} />}
      {isTerminalVisible && <Terminal logs={terminalLogs} onCommand={handleTerminalCommand} history={commandHistory} onClose={() => setTerminalVisible(false)} position={terminalPosition} setPosition={setTerminalPosition} size={terminalSize} setSize={setTerminalSize} currentUser={currentUser} onRegister={handleRegister} onLogin={handleLogin} addLog={addLog} />}
    </div>
  );
}
