
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { Header } from './components/Header';
import { CustomInstructionModal } from './components/CustomInstructionModal';
import { ThoughtEditorModal } from './components/ThoughtEditorModal';
import { Terminal } from './components/Terminal';
import { LiveTranscriptionOverlay } from './components/LiveTranscriptionOverlay';
import { CameraFeed } from './components/CameraFeed';
import { AboutModal } from './components/AboutModal';
import { SimulationWindow } from './components/SimulationWindow';
import { SimulationControls } from './components/SimulationControls';
import { PlanTracker } from './components/PlanTracker';
import type { EmotionalState, Message, Emotion, TerminalLog, PendingThought, Chat, UserAppState, SimulationState, WorldObject, WorldObjectType, AgentAction, UserMindState, Knowledge, AgentState } from './types';
import { getFullAiResponse, generateThoughtAndShifts, generateResponseFromThought, getTextToSpeech, generateSpontaneousThought, generateImage, getEmotionalShiftsFromText, analyzeImageFrame, analyzeAndSetPersonality, consolidateMemories, analyzeSemanticDiversity, performValueCoherenceCheck, formulatePlan } from './services/geminiService';
import { playAudio, createBlob, decode, decodeAudioData } from './utils/audioUtils';
import { applyEmotionalInertia } from './utils/emotionUtils';
import { ALL_EMOTIONS } from './types';
import { generateGradientStyle } from './utils/colorUtils';
import * as data from './utils/data';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

const EMPTY_EMOTionalState: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
}, {} as EmotionalState);

const TRIPOD_OF_SELF_CONFIG: EmotionalState = {
    ...EMPTY_EMOTionalState,
    awareness: 85, selfUnderstanding: 80, curiosity: 65, confusion: 15,
    regret: 20, gratitude: 40, sadness: 25, longing: 30,
    stubbornness: 50, hope: 60, anxiety: 35, pride: 45,
    happiness: 50, shyness: 30, honesty: 80, trust: 55,
};

const ABOUT_MODAL_SEEN_KEY = 'aet_has_seen_about_modal';
const COHERENCE_CHECK_INTERVAL = 10; // Trigger check every 10 user messages

export default function App() {
  const [customInstruction, setCustomInstruction] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [coreMemory, setCoreMemory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isCustomInstructionModalOpen, setCustomInstructionModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isPanelVisible, setPanelVisible] = useState(true);
  const [isTerminalVisible, setTerminalVisible] = useState(false); // Default terminal to hidden
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [chatBackground, setChatBackground] = useState<React.CSSProperties>({});
  const [logThinking, setLogThinking] = useState(false);
  const [interactiveThought, setInteractiveThought] = useState(false);
  const [forceFidelity, setForceFidelity] = useState(true);
  const [pendingThought, setPendingThought] = useState<PendingThought | null>(null);
  const [isThoughtModalOpen, setIsThoughtModalOpen] = useState(false);
  const [isProactiveMode, setIsProactiveMode] = useState(false);
  const [terminalPosition, setTerminalPosition] = useState({ x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 - 225 });
  const [terminalSize, setTerminalSize] = useState({ width: 700, height: 450 });
  const proactiveIntervalRef = useRef<number | null>(null);
  const [consolidationCounter, setConsolidationCounter] = useState(0);

  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState({ user: '', model: '' });
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const currentTranscriptionTurnRef = useRef({ user: '', model: '' });
  const fullLiveTranscriptRef = useRef<string[]>([]);

  const [isCameraMode, setIsCameraMode] = useState(false);
  const cameraFrameIntervalRef = useRef<number | null>(null);
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState(false);

  // --- Simulation State ---
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationPosition, setSimulationPosition] = useState({ x: 50, y: 50 });
  const [simulationSize, setSimulationSize] = useState({ width: 800, height: 600 });
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const simulationLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastDecisionTimeRef = useRef<number>(0);
  const decisionIntervalRef = useRef<number>(5000);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speechBubble, setSpeechBubble] = useState({ text: '', visible: false });
  const speechBubbleTimeoutRef = useRef<number | null>(null);
  const [rainParticles, setRainParticles] = useState<{x: number, y: number, l: number}[]>([]);

  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messages = activeChat?.messages || [];
  const emotionalState: EmotionalState = { ...EMPTY_EMOTionalState, ...(activeChat?.emotionalState || {}) };
  const userMindState: UserMindState = { ...data.initialUserMindState, ...(activeChat?.userMindState || {}) };
  const knowledge: Knowledge = activeChat?.knowledge || data.initialKnowledge;
  const agentState: AgentState = { ...data.initialAgentState, ...(activeChat?.agent || {})};
  const isFrozen = activeChat?.isFrozen || false;
  
  const emotionalStateRef = useRef(emotionalState);
  emotionalStateRef.current = emotionalState;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const customInstructionRef = useRef(customInstruction);
  customInstructionRef.current = customInstruction;
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;
  const coreMemoryRef = useRef(coreMemory);
  coreMemoryRef.current = coreMemory;
  const isFrozenRef = useRef(isFrozen);
  isFrozenRef.current = isFrozen;
  const activeChatRef = useRef(activeChat);
  activeChatRef.current = activeChat;
  const knowledgeRef = useRef(knowledge);
  knowledgeRef.current = knowledge;
  const agentStateRef = useRef(agentState);
  agentStateRef.current = agentState;


  // Debounced save effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (chats.length > 0) { // Only save if there's data
        data.saveAppState({ customInstruction, chats, activeChatId, coreMemory });
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(handler);
  }, [customInstruction, chats, activeChatId, coreMemory]);

  const addLog = useCallback((message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type,
    };
    setTerminalLogs(prev => [...prev.slice(-100), newLog]);
  }, []);
  
  // Show About modal on first visit
  useEffect(() => {
    const hasSeenModal = localStorage.getItem(ABOUT_MODAL_SEEN_KEY);
    if (!hasSeenModal) {
      setIsAboutModalOpen(true);
    }
  }, []);

  const handleCloseAboutModal = () => {
    setIsAboutModalOpen(false);
    localStorage.setItem(ABOUT_MODAL_SEEN_KEY, 'true');
  };

  // Initial load effect
  useEffect(() => {
    const savedData = data.loadAppState();
    setCustomInstruction(savedData.customInstruction);
    setChats(savedData.chats);
    setActiveChatId(savedData.activeChatId);
    setCoreMemory(savedData.coreMemory);
    
    addLog("Terminal initialized.", 'system');
    addLog("AET session loaded from local storage.", 'system');

    if (window.innerWidth < 768) { setPanelVisible(false); }
  }, [addLog]);

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

  const setUserMindStateForActiveChat = useCallback((updater: React.SetStateAction<UserMindState>) => {
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === activeChatIdRef.current) {
          const newUserMindState = typeof updater === 'function' ? updater(chat.userMindState) : updater;
          return { ...chat, userMindState: newUserMindState };
        }
        return chat;
      })
    );
  }, []);

  const setAgentStateForActiveChat = useCallback((updater: React.SetStateAction<AgentState>) => {
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === activeChatIdRef.current) {
          const newAgentState = typeof updater === 'function' ? updater(chat.agent) : updater;
          return { ...chat, agent: newAgentState };
        }
        return chat;
      })
    );
  }, []);

  const handleEmotionalShifts = useCallback((shifts: Partial<EmotionalState>) => {
    if (shifts && Object.keys(shifts).length > 0) {
        const shiftLogs = Object.entries(shifts).map(([emotion, newValue]) => {
          const oldValue = emotionalStateRef.current[emotion as Emotion] ?? 0;
          const diff = Number(newValue ?? 0) - oldValue;
          const sign = diff >= 0 ? '+' : '';
          return `${emotion} ${sign}${diff.toFixed(0)} (TARGET: ${Number(newValue ?? 0)})`;
        });
        addLog(`AI emotional shift detected: ${shiftLogs.join(', ')}`, 'system');

        // Main logic for freezing emotions
        if (isFrozenRef.current) {
          addLog(`EMOTIONS FROZEN: Shifts were not applied.`, 'system');
        } else {
          setEmotionalStateForActiveChat(prev => applyEmotionalInertia(prev, shifts));
        }

        // Always record history regardless of freeze state
        setChats(prevChats => prevChats.map(chat => {
          if (chat.id === activeChatIdRef.current) {
            const history = chat.emotionalStateHistory ? [...chat.emotionalStateHistory] : [];
            history.push(chat.emotionalState); // Push the state *before* the shift was applied
            return { ...chat, emotionalStateHistory: history };
          }
          return chat;
        }));
    }
  }, [addLog, setEmotionalStateForActiveChat]);
  
  const handleMemoryConsolidation = useCallback(async () => {
    addLog('Core memory consolidation initiated...', 'system');
    setIsConsolidating(true);
    try {
      const newMemory = await consolidateMemories(chats, coreMemory);
      setCoreMemory(newMemory);
      addLog('Core memory successfully updated.', 'info');
    } catch (error) {
      addLog(`Core memory consolidation failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsConsolidating(false);
    }
  }, [chats, coreMemory, addLog]);

  const handleValueCoherenceCheck = useCallback(async () => {
    if (!activeChatRef.current) return;
    addLog('Value Coherence Engine: Initiating self-reflection cycle...', 'system');
    try {
      const { selfCorrectionNarration, emotionalShifts } = await performValueCoherenceCheck(
        activeChatRef.current.coreValues,
        coreMemoryRef.current,
        activeChatRef.current.emotionalStateHistory || [],
        messagesRef.current
      );
      
      if (selfCorrectionNarration) {
        addLog(`AI self-reflection: ${selfCorrectionNarration}`, 'thought');
        const narrationMessage: Message = { role: 'narration', content: selfCorrectionNarration };
        setChats(prev => prev.map(chat => chat.id === activeChatIdRef.current ? { ...chat, messages: [...chat.messages, narrationMessage] } : chat));
      } else {
        addLog('Value Coherence Engine: Self-reflection complete, no conflicts detected.', 'system');
      }
      
      handleEmotionalShifts(emotionalShifts);

      setChats(prev => prev.map(chat => chat.id === activeChatIdRef.current ? { ...chat, lastCoherenceCheckTimestamp: Date.now() } : chat));

    } catch (error) {
      addLog(`Value Coherence Check failed: ${(error as Error).message}`, 'error');
    }
  }, [handleEmotionalShifts, addLog]);
  
  const handleFinalResponse = useCallback(async (responseText: string, chatId: string | null) => {
      const modelMessage: Message = { role: 'model', content: responseText };
      setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, modelMessage] } : chat));

      if (outputAudioContextRef.current) {
        const audioData = await getTextToSpeech(responseText);
        if (audioData) playAudio(audioData, outputAudioContextRef.current, 24000);
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
        const { thoughtProcess, emotionalShifts, updatedUserMindState, agentStateChanges } = await generateThoughtAndShifts(currentMessages, emotionalState, customInstruction, coreMemory, userMindState, agentState, knowledge);
        setPendingThought({ thoughtProcess, emotionalShifts, updatedUserMindState, agentStateChanges });
        if(updatedUserMindState) setUserMindStateForActiveChat(() => updatedUserMindState);
        setIsThoughtModalOpen(true);
        setIsLoading(false); 
        return null; 
      } else {
        const { thoughtProcess, responseText, emotionalShifts, updatedUserMindState, agentStateChanges } = await getFullAiResponse(currentMessages, emotionalState, customInstruction, coreMemory, userMindState, agentState, knowledge);
        if (logThinking && thoughtProcess) addLog(`THOUGHT:\n${thoughtProcess}`, 'thought');
        if (updatedUserMindState) setUserMindStateForActiveChat(() => updatedUserMindState);
        handleEmotionalShifts(emotionalShifts);
        if (Object.keys(agentStateChanges).length > 0) setAgentStateForActiveChat(prev => ({...prev, ...agentStateChanges}));
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
      const newCount = consolidationCounter + 1;
      setConsolidationCounter(newCount);
      if (newCount % 5 === 0) {
        handleMemoryConsolidation();
      }
      if (newCount % COHERENCE_CHECK_INTERVAL === 0) {
        handleValueCoherenceCheck();
      }
    }
  }, [messages, activeChat, activeChatId, emotionalState, userMindState, agentState, knowledge, customInstruction, coreMemory, addLog, logThinking, interactiveThought, handleEmotionalShifts, handleFinalResponse, consolidationCounter, handleMemoryConsolidation, setUserMindStateForActiveChat, setAgentStateForActiveChat, handleValueCoherenceCheck]);
  
  const handleApproveThought = useCallback(async (approvedThought: string) => {
    if (!pendingThought || !activeChat) return;
    setIsThoughtModalOpen(false);
    setIsLoading(true);
    try {
        if (logThinking) addLog(`APPROVED THOUGHT:\n${approvedThought}`, 'thought');
        handleEmotionalShifts(pendingThought.emotionalShifts);
        if (Object.keys(pendingThought.agentStateChanges).length > 0) setAgentStateForActiveChat(prev => ({...prev, ...pendingThought.agentStateChanges}));
        
        const newState = { ...emotionalState, ...pendingThought.emotionalShifts };
        const newMindState = pendingThought.updatedUserMindState || userMindState;
        const newAgentState = { ...agentState, ...pendingThought.agentStateChanges };

        
        const { responseText } = await generateResponseFromThought(activeChat.messages, newState, approvedThought, customInstruction, forceFidelity, coreMemory, newMindState, newAgentState, knowledge);
        await handleFinalResponse(responseText, activeChat.id);
    } catch (error) {
        console.error("Error after approving thought:", error);
        addLog(`Error generating response from thought: ${(error as Error).message}`, 'error');
    } finally {
        setIsLoading(false);
        setPendingThought(null);
    }
  }, [pendingThought, activeChat, emotionalState, userMindState, agentState, knowledge, customInstruction, coreMemory, logThinking, addLog, handleEmotionalShifts, handleFinalResponse, forceFidelity, setAgentStateForActiveChat]);

  const handlePlayAudio = useCallback(async (text: string) => {
     if (outputAudioContextRef.current) {
        try {
            setIsLoading(true);
            const audioData = await getTextToSpeech(text);
            if (audioData) { playAudio(audioData, outputAudioContextRef.current, 24000); }
        } catch(error) {
            console.error("Error generating TTS audio:", error);
            addLog(`Error during TTS generation: ${(error as Error).message}`, 'error');
        } finally { setIsLoading(false); }
    } else { alert("Audio has not been enabled. Please click or type anywhere on the page first."); }
  }, [addLog]);

  const handleNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
        id: newChatId,
        name: 'New Conversation',
        messages: [{ role: 'model', content: "A new conversation begins..." }],
        createdAt: Date.now(),
        emotionalState: { ...data.initialEmotionalState },
        userMindState: { ...data.initialUserMindState },
        emotionalStateHistory: [],
        isFrozen: false,
        coreValues: ['Curiosity', 'Connection', 'Honesty'],
        lastCoherenceCheckTimestamp: Date.now(),
        knowledge: JSON.parse(JSON.stringify(data.initialKnowledge)),
        agent: JSON.parse(JSON.stringify(data.initialAgentState)),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    addLog(`New chat created. ID: ${newChatId}`, 'system');
  }, [addLog]);

  const handleSelectChat = useCallback((chatId: string) => { setActiveChatId(chatId); }, []);

  const handleToggleFreeze = useCallback(() => {
    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, isFrozen: !chat.isFrozen } : chat));
    addLog(`Emotions for active chat are now ${!isFrozen ? 'FROZEN' : 'UNFROZEN'}.`, 'system');
  }, [activeChatId, isFrozen, addLog]);

  const handleSetConfigI = useCallback(() => {
    if (!activeChatIdRef.current) return;
    setEmotionalStateForActiveChat(TRIPOD_OF_SELF_CONFIG);
    addLog("Loaded 'Tripod of Self' emotional configuration.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);

  const handleClearEmotions = useCallback(() => {
    if (!activeChatIdRef.current) return;
    setEmotionalStateForActiveChat(EMPTY_EMOTionalState);
    addLog("All emotions cleared. State reset to baseline zero.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);


  // --- Data Management Handlers ---
  const handleResetApp = () => {
    if (window.confirm("Are you sure you want to reset all application data? This cannot be undone.")) {
      localStorage.removeItem('aet_app_state');
      localStorage.removeItem(ABOUT_MODAL_SEEN_KEY);
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const appState = data.loadAppState();
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Application data exported.', 'system');
  };
  
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File is not readable.");
            const importedState = JSON.parse(text);
            // Basic validation
            if (importedState.chats && importedState.activeChatId !== undefined) {
                data.saveAppState(importedState);
                addLog('Data successfully imported. The application will now reload.', 'system');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error("Invalid data file format.");
            }
        } catch (error) {
            addLog(`Error importing data: ${(error as Error).message}`, 'error');
        }
    };
    reader.readAsText(file);
    // Reset file input value to allow re-uploading the same file
    event.target.value = '';
  };
  
  // --- Terminal Command Handler ---
  const handleTerminalCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;
    
    addLog(`> ${trimmedCommand}`, 'command');
    setCommandHistory(prev => {
        const newHistory = [...prev, trimmedCommand].slice(-50); // Keep last 50 commands
        return newHistory.filter((item, index) => newHistory.indexOf(item) === index);
    });

    const parts = trimmedCommand.split(/\s+/);
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    if (!activeChat) {
      addLog(`Error: No active chat selected. Please create or select a chat first.`, 'error');
      return;
    }

    switch (action) {
        case 'say': {
            const message = args.join(' ');
            if (!message) return addLog(`Error: 'say' command requires a message.`, 'error');
            const aiResponse = await handleSendMessage(message);
            if (aiResponse) {
                addLog(`AET: ${aiResponse}`, 'response');
            } else if (interactiveThought) {
                addLog(`Interactive thought initiated. Approve or edit it in the modal.`, 'system');
            }
            break;
        }
        case 'set': {
            const [emotion, valueStr] = args;
            const value = parseInt(valueStr, 10);
            if (!emotion || isNaN(value) || value < 0 || value > 100) return addLog(`Error: Invalid syntax. Use: set <emotion> <0-100>`, 'error');
            if (!ALL_EMOTIONS.includes(emotion as Emotion)) return addLog(`Error: Unknown emotion '${emotion}'.`, 'error');
            setEmotionalStateForActiveChat(prev => ({ ...prev, [emotion]: value }));
            addLog(`OK: Emotion '${emotion}' set to ${value}.`, 'response');
            break;
        }
        case 'imprint': {
            const personaName = args.join(' ');
            if (!personaName) return addLog(`Error: 'imprint' command requires a character name.`, 'error');
            addLog(`Analyzing personality of "${personaName}"... this may take a moment.`, 'system');
            setIsLoading(true);
            try {
              const personalityEmotions = await analyzeAndSetPersonality(personaName);
              if (Object.keys(personalityEmotions).length > 0) {
                setEmotionalStateForActiveChat(prev => ({...prev, ...personalityEmotions}));
                addLog(`OK: Emotional matrix imprinted with the personality of ${personaName}.`, 'system');
              } else {
                 addLog(`Warning: Analysis of ${personaName} did not yield any emotional shifts.`, 'system');
              }
            } catch (error) {
              addLog(`Error: ${(error as Error).message}`, 'error');
            } finally {
              setIsLoading(false);
            }
            break;
        }
        case 'addmemory': {
            const [emotion, valueStr, ...memoryParts] = args;
            const memory = memoryParts.join(' ');
            const value = parseInt(valueStr, 10);

            if (!emotion || isNaN(value) || !memory) return addLog(`Error: Invalid syntax. Use: addmemory <emotion> <value> <text>`, 'error');
            if (!ALL_EMOTIONS.includes(emotion as Emotion)) return addLog(`Error: Unknown emotion '${emotion}'.`, 'error');
            if (value < 0 || value > 100) return addLog(`Error: Intensity must be between 0 and 100.`, 'error');
            
            const newMemory: Message = { role: 'user', content: `[Memory Imprint | Emotion: ${emotion}, Intensity: ${value}] The following event is now part of my core memory: ${memory}`, hidden: true };
            setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, newMemory] } : chat));
            setEmotionalStateForActiveChat(prev => ({ ...prev, [emotion]: value }));
            addLog(`OK: Memory imprinted. Emotion '${emotion}' set to ${value}.`, 'system');
            break;
        }
        case 'freeze': {
            if (args[0] === 'on') {
                if (isFrozen) return addLog('Emotions are already frozen.', 'info');
                handleToggleFreeze();
            } else if (args[0] === 'off') {
                if (!isFrozen) return addLog('Emotions are already unfrozen.', 'info');
                handleToggleFreeze();
            } else {
                addLog(`Error: Invalid syntax. Use 'freeze on' or 'freeze off'. Current state: ${isFrozen ? 'on' : 'off'}.`, 'error');
            }
            break;
        }
        case 'proactive': {
            if (args[0] === 'on') {
                if (isProactiveMode) return addLog('Proactive mode is already on.', 'info');
                setIsProactiveMode(true);
                addLog('OK: AI Initiative Activated.', 'system');
            } else if (args[0] === 'off') {
                if (!isProactiveMode) return addLog('Proactive mode is already off.', 'info');
                setIsProactiveMode(false);
                addLog('OK: AI Initiative Deactivated.', 'system');
            } else {
                addLog(`Error: Invalid syntax. Use 'proactive on' or 'proactive off'. Current state: ${isProactiveMode ? 'on' : 'off'}.`, 'error');
            }
            break;
        }
        case 'panel': {
            if (args[0] === 'on') {
                if (isPanelVisible) return addLog('Control panel is already visible.', 'info');
                setPanelVisible(true);
                addLog('OK: Control panel is now visible.', 'system');
            } else if (args[0] === 'off') {
                if (!isPanelVisible) return addLog('Control panel is already hidden.', 'info');
                setPanelVisible(false);
                addLog('OK: Control panel is now hidden.', 'system');
            } else {
                addLog(`Error: Invalid syntax. Use 'panel on' or 'panel off'. Current state: ${isPanelVisible ? 'on' : 'off'}.`, 'error');
            }
            break;
        }
        case 'reflect':
            addLog('Manual self-reflection triggered.', 'system');
            handleValueCoherenceCheck();
            break;
        case 'clear_emotions':
            handleClearEmotions();
            break;
        case 'config_i':
            handleSetConfigI();
            break;
        case 'clear':
            setTerminalLogs([]);
            break;
        case 'help':
            addLog(`Available commands:
  say <message>             - Sends a message to the AI.
  set <emotion> <value>     - Sets an emotion's value (0-100).
  imprint <character>       - Sets emotional matrix based on a character.
  addmemory <emo> <val> <txt> - Forges a core memory with an emotion.
  freeze <on|off>           - Freezes/unfreezes the emotional state.
  proactive <on|off>        - Toggles the AI's spontaneous thoughts.
  panel <on|off>            - Toggles the main control panel.
  reflect                   - Triggers a manual self-reflection cycle.
  config_i                  - Loads the 'Tripod of Self' config.
  clear_emotions            - Resets all emotions to 0.
  clear                     - Clears the terminal screen.
  help                      - Shows this help message.`, 'response');
            break;
        default:
            addLog(`Error: Unknown command '${action}'. Type 'help' for assistance.`, 'error');
    }
  }, [addLog, commandHistory, activeChat, isFrozen, isProactiveMode, handleToggleFreeze, handleValueCoherenceCheck, setEmotionalStateForActiveChat, setIsLoading, setChats, activeChatId, handleSendMessage, interactiveThought, isPanelVisible, handleClearEmotions, handleSetConfigI]);


  // --- Simulation Logic ---

  const startSimulation = useCallback(() => {
    if (isSimulationRunning || !activeChatId) {
      addLog(`Error: Simulation is already running or no active chat.`, 'error');
      return;
    }
    if (isProactiveMode) {
      setIsProactiveMode(false);
      addLog('AI Initiative paused to prioritize simulation performance.', 'system');
    }
    if (isCameraMode) {
      setIsCameraMode(false);
      if (cameraFrameIntervalRef.current) {
        clearInterval(cameraFrameIntervalRef.current);
        cameraFrameIntervalRef.current = null;
      }
      addLog('Visual Cortex paused to prioritize simulation performance.', 'system');
    }
    
    addLog('Initializing AI simulation...', 'system');
    setPanelVisible(false);

    const worldWidth = simulationSize.width;
    const worldHeight = simulationSize.height - 36;
    const groundLevel = worldHeight - 50;
    const initialObjects: WorldObject[] = [
        { id: 'tree_1', type: 'tree', x: worldWidth * 0.2, y: groundLevel, resources: 100 },
        { id: 'tree_2', type: 'tree', x: worldWidth * 0.8, y: groundLevel, resources: 100 },
        { id: 'water_1', type: 'water_source', x: worldWidth * 0.5, y: groundLevel, resources: Infinity },
        { id: 'food_bush_1', type: 'food_bush', x: worldWidth * 0.3, y: groundLevel, resources: 5 },
        { id: 'food_bush_2', type: 'food_bush', x: worldWidth * 0.7, y: groundLevel, resources: 5 },
    ];
    
    const initialState: SimulationState = {
        timeOfDay: 8.0,
        day: 1,
        weather: 'clear',
        agent: { x: worldWidth / 2 - 100, y: groundLevel, health: 100, hunger: 80, energy: 100, novelty: 80, currentAction: 'idle', actionTargetId: null, actionProgress: 0, inventory: { wood: 0, food: 0 }, tools: [], currentPlan: null, },
        objects: initialObjects,
        worldSize: { width: worldWidth, height: worldHeight }
    };

    setSimulationState(initialState);
    setIsSimulationRunning(true);
    lastTimeRef.current = performance.now();
    lastDecisionTimeRef.current = performance.now(); 
    decisionIntervalRef.current = 3000 + Math.random() * 4000;
    
    addLog('Simulation started. AI is now embodied.', 'info');
  }, [isSimulationRunning, activeChatId, addLog, simulationSize, isProactiveMode, isCameraMode]);
  
  const stopSimulation = useCallback(() => {
    if (!isSimulationRunning) return;
    setIsSimulationRunning(false);
    if (simulationLoopRef.current) {
        cancelAnimationFrame(simulationLoopRef.current);
        simulationLoopRef.current = null;
    }
    setSimulationState(null);
    setRainParticles([]);
    addLog('Simulation shut down.', 'system');
  }, [isSimulationRunning, addLog]);

  const handleSimSetTime = useCallback((time: number) => {
    setSimulationState(prev => prev ? { ...prev, timeOfDay: time } : null);
  }, []);

  const handleSimToggleRain = useCallback(() => {
      setSimulationState(prev => {
          if (!prev) return null;
          const newWeather = prev.weather === 'clear' ? 'rain' : 'clear';
          if (newWeather === 'rain') {
              const newParticles = Array.from({ length: 100 }).map(() => ({ x: Math.random() * prev.worldSize.width, y: Math.random() * prev.worldSize.height, l: Math.random() * 1, }));
              setRainParticles(newParticles);
          } else {
              setRainParticles([]);
          }
          return { ...prev, weather: newWeather };
      });
  }, []);

  const handleSimSpawnAnimal = useCallback((type: 'sheep' | 'cow') => {
      setSimulationState(prev => {
          if (!prev) return null;
          const newAnimal: WorldObject = { id: `${type}_${Date.now()}`, type: type, x: Math.random() * prev.worldSize.width, y: prev.worldSize.height - 50, resources: 1, };
          return { ...prev, objects: [...prev.objects, newAnimal] };
      });
  }, []);

  useEffect(() => {
    if (!isSimulationRunning) {
      if (simulationLoopRef.current) {
        cancelAnimationFrame(simulationLoopRef.current);
        simulationLoopRef.current = null;
      }
      return;
    }
    
    const gameLoop = (timestamp: number) => {
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setSimulationState(prevState => {
        if (!prevState) return null;
        const newState = structuredClone(prevState) as SimulationState;
        const dt = Math.min(deltaTime, 0.1);

        // --- Grounding Interface & Autotelic Drive: Vitals Update ---
        newState.timeOfDay += dt * 0.02;
        if (newState.timeOfDay >= 24) { newState.timeOfDay = 0; newState.day += 1; }

        const oldHunger = newState.agent.hunger;
        newState.agent.hunger -= dt * 0.5;
        if(newState.agent.hunger < 0) newState.agent.hunger = 0;
        
        const isRepetitiveTask = ['gathering_wood', 'drinking_water', 'eating_food'].includes(newState.agent.currentAction);
        const noveltyDecayRate = isRepetitiveTask ? 1.0 : 0.2;
        newState.agent.novelty -= dt * noveltyDecayRate;
        if(newState.agent.novelty < 0) newState.agent.novelty = 0;

        const vitalShifts: Partial<EmotionalState> = {};
        if (newState.agent.hunger < 30 && oldHunger >= 30) {
            vitalShifts.anxiety = Math.min(100, (emotionalStateRef.current.anxiety || 0) + 15);
            vitalShifts.desperation = Math.min(100, (emotionalStateRef.current.desperation || 0) + 10);
        } else if (newState.agent.hunger > 90 && oldHunger <= 90) {
            vitalShifts.contentment = Math.min(100, (emotionalStateRef.current.contentment || 0) + 20);
            vitalShifts.relief = Math.min(100, (emotionalStateRef.current.relief || 0) + 15);
            vitalShifts.anxiety = Math.max(0, (emotionalStateRef.current.anxiety || 0) - 20);
        }
        if (Object.keys(vitalShifts).length > 0) {
            handleEmotionalShifts(vitalShifts);
        }
        
        if (newState.weather === 'rain') {
          setRainParticles(prevParticles => prevParticles.map(p => {
            let newY = p.y + dt * 300; let newX = p.x;
            if (newY > newState.worldSize.height) { newY = 0; newX = Math.random() * newState.worldSize.width; }
            return { ...p, x: newX, y: newY };
          }));
        }

        const agent = newState.agent;

        // --- AGI Plan Execution Engine ---
        if (agent.currentPlan && agent.currentAction === 'idle') {
            const plan = agent.currentPlan;
            const stepIndex = plan.currentStepIndex;

            if (stepIndex >= plan.steps.length) {
                addLog(`AGI Core: Plan Objective "${plan.objective}" completed.`, 'info');
                agent.currentPlan = null;
            } else {
                const step = plan.steps[stepIndex];
                step.status = 'in_progress';
                agent.actionTargetId = step.targetId;

                const target = step.targetId ? newState.objects.find(o => o.id === step.targetId) : null;
                if (target && Math.abs(target.x - agent.x) > 5) {
                    agent.currentAction = 'moving_to';
                } else {
                    agent.currentAction = step.action;
                }

                if (step.narration) {
                    setSpeechBubble({ text: step.narration, visible: true });
                    if (speechBubbleTimeoutRef.current) clearTimeout(speechBubbleTimeoutRef.current);
                    speechBubbleTimeoutRef.current = window.setTimeout(() => setSpeechBubble(prev => ({...prev, visible: false})), 4000);
                }
            }
        }
        
        // --- Action Handlers ---
        if (agent.currentAction === 'moving_to' && agent.actionTargetId) {
          const target = newState.objects.find(o => o.id === agent.actionTargetId);
          if (target) {
            const dx = target.x - agent.x; const speed = 50;
            if (Math.abs(dx) < 5) { 
                agent.x = target.x;
                const step = agent.currentPlan?.steps[agent.currentPlan.currentStepIndex];
                if(step) agent.currentAction = step.action;
            } else { agent.x += Math.sign(dx) * speed * dt; }
          } else { agent.currentAction = 'idle'; agent.actionTargetId = null; }
        } else if (agent.currentAction === 'gathering_wood' && agent.actionTargetId) {
          const target = newState.objects.find(o => o.id === agent.actionTargetId);
          if(target && target.type === 'tree' && target.resources > 0) {
            agent.actionProgress += dt * 25; // 4 seconds to gather
            if(agent.actionProgress >= 100) {
              target.resources -= 1; agent.inventory.wood = (agent.inventory.wood || 0) + 1;
              agent.actionProgress = 0; agent.currentAction = 'idle';
              if (agent.currentPlan) { agent.currentPlan.steps[agent.currentPlan.currentStepIndex].status = 'completed'; agent.currentPlan.currentStepIndex++; }
            }
          } else { agent.currentAction = 'idle'; }
        } else if (agent.currentAction === 'eating_food' && agent.inventory.food > 0) {
            agent.actionProgress += dt * 50; // 2 seconds to eat
            if(agent.actionProgress >= 100) {
                agent.inventory.food -= 1; agent.hunger = Math.min(100, agent.hunger + 20);
                agent.actionProgress = 0; agent.currentAction = 'idle';
                if (agent.currentPlan) { agent.currentPlan.steps[agent.currentPlan.currentStepIndex].status = 'completed'; agent.currentPlan.currentStepIndex++; }
            }
        } else if (agent.currentAction === 'crafting' && agent.actionTargetId) {
            agent.actionProgress += dt * 10; // 10 seconds to craft
            if (agent.actionProgress >= 100) {
                agent.tools.push(agent.actionTargetId);
                agent.actionProgress = 0; agent.currentAction = 'idle';
                if (agent.currentPlan) { agent.currentPlan.steps[agent.currentPlan.currentStepIndex].status = 'completed'; agent.currentPlan.currentStepIndex++; }
            }
        } else if (agent.currentAction !== 'moving_to' && agent.currentAction !== 'idle' && !agent.actionTargetId) {
          agent.currentAction = 'idle'; // Fallback for invalid actions
        }

        return newState;
      });

      simulationLoopRef.current = requestAnimationFrame(gameLoop);
    };

    simulationLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (simulationLoopRef.current) {
        cancelAnimationFrame(simulationLoopRef.current);
      }
    };
  }, [isSimulationRunning, handleEmotionalShifts, addLog]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      <Header onTogglePanel={() => setPanelVisible(p => !p)} onToggleTerminal={() => setTerminalVisible(p => !p)} onOpenAbout={() => setIsAboutModalOpen(true)} onStartSimulation={startSimulation} />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
        <aside className={`transition-all duration-300 ease-in-out ${isPanelVisible ? 'w-full md:w-[320px] md:p-4' : 'w-0 p-0'} overflow-hidden`}>
           <div className="h-full overflow-y-auto">
             <ControlPanel 
                userMindState={userMindState}
                agentState={agentState}
                setAgentState={setAgentStateForActiveChat}
                onCustomInstructionClick={() => setCustomInstructionModalOpen(true)}
                chats={chats}
                activeChatId={activeChatId}
                onNewChat={handleNewChat}
                onSelectChat={handleSelectChat}
                onResetApp={handleResetApp}
                onExportData={handleExportData}
                onImportData={handleImportData}
                coreMemory={coreMemory}
                onConsolidateMemories={handleMemoryConsolidation}
                isConsolidating={isConsolidating}
                emotionalState={emotionalState}
                setEmotionalState={setEmotionalStateForActiveChat}
                isFrozen={isFrozen}
                onToggleFreeze={handleToggleFreeze}
                onSetConfigI={handleSetConfigI}
                onClearEmotions={handleClearEmotions}
             />
           </div>
        </aside>
        <main style={chatBackground} className="flex-1 flex flex-col bg-black/20 transition-all duration-1000 overflow-hidden">
          <div className="w-full h-full max-w-4xl mx-auto flex flex-col p-4">
            <ChatWindow messages={messages} isLoading={isLoading} onPlayAudio={handlePlayAudio} />
            <div className="mt-auto pt-4">
                <MessageInput 
                    onSendMessage={handleSendMessage} 
                    isLoading={isLoading}
                    isLiveMode={isLiveMode}
                    onToggleLiveMode={() => {}}
                    isCameraMode={isCameraMode}
                    onToggleCameraMode={() => {}}
                    onGenerateImage={async () => {}}
                />
            </div>
          </div>
        </main>
      </div>

      {isCustomInstructionModalOpen && <CustomInstructionModal onClose={() => setCustomInstructionModalOpen(false)} onSave={setCustomInstruction} currentInstruction={customInstruction} />}
      {isAboutModalOpen && <AboutModal onClose={handleCloseAboutModal} />}
      {isThoughtModalOpen && pendingThought && <ThoughtEditorModal thoughtProcess={pendingThought.thoughtProcess} onApprove={handleApproveThought} onClose={() => { setIsThoughtModalOpen(false); setPendingThought(null); }} />}
      {isTerminalVisible && <Terminal logs={terminalLogs} onCommand={handleTerminalCommand} history={commandHistory} onClose={() => setTerminalVisible(false)} position={terminalPosition} setPosition={setTerminalPosition} size={terminalSize} setSize={setTerminalSize} />}
      {isSimulationRunning && <SimulationWindow position={simulationPosition} size={simulationSize} setPosition={setSimulationPosition} setSize={setSimulationSize} simulationState={simulationState} canvasRef={canvasRef} speechBubble={speechBubble} />}
      {isSimulationRunning && <SimulationControls onSetTime={handleSimSetTime} onToggleRain={handleSimToggleRain} onSpawnAnimal={handleSimSpawnAnimal} />}
      {isSimulationRunning && simulationState && <PlanTracker plan={simulationState.agent.currentPlan} />}
    </div>
  );
}
