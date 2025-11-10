

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
import type { EmotionalState, Message, Emotion, TerminalLog, PendingThought, Chat, UserAppState, SimulationState, WorldObject, WorldObjectType, AgentAction, UserMindState } from './types';
import { getFullAiResponse, generateThoughtAndShifts, generateResponseFromThought, getTextToSpeech, generateSpontaneousThought, generateImage, getEmotionalShiftsFromText, analyzeImageFrame, analyzeAndSetPersonality, consolidateMemories, analyzeSemanticDiversity, decideNextAction, performValueCoherenceCheck } from './services/geminiService';
import { playAudio, createBlob, decode, decodeAudioData } from './utils/audioUtils';
import { ALL_EMOTIONS } from './types';
import { generateGradientStyle } from './utils/colorUtils';
import * as data from './utils/data';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

const TRIPOD_OF_SELF_CONFIG: EmotionalState = {
    ...ALL_EMOTIONS.reduce((acc, e) => ({...acc, [e]: 0}), {} as EmotionalState),
    awareness: 85, selfUnderstanding: 80, curiosity: 65, confusion: 15,
    regret: 20, gratitude: 40, sadness: 25, longing: 30,
    stubbornness: 50, hope: 60, anxiety: 35, pride: 45,
    happiness: 50, shyness: 30, honesty: 80, trust: 55,
};

const EMPTY_EMOTionalState: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
}, {} as EmotionalState);

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
  const [isCrazyMode, setIsCrazyMode] = useState(false);
  const [isProactiveMode, setIsProactiveMode] = useState(false);
  const [terminalPosition, setTerminalPosition] = useState({ x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 - 225 });
  const [terminalSize, setTerminalSize] = useState({ width: 700, height: 450 });
  const crazyModeIntervalRef = useRef<number | null>(null);
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

        // Main logic for freezing emotions
        if (isFrozenRef.current) {
          addLog(`EMOTIONS FROZEN: Shifts were not applied.`, 'system');
        } else {
          setEmotionalStateForActiveChat(prev => ({ ...prev, ...shifts }));
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
        const { thoughtProcess, emotionalShifts, updatedUserMindState } = await generateThoughtAndShifts(currentMessages, emotionalState, customInstruction, coreMemory, userMindState);
        setPendingThought({ thoughtProcess, emotionalShifts, updatedUserMindState });
        if(updatedUserMindState) setUserMindStateForActiveChat(() => updatedUserMindState);
        setIsThoughtModalOpen(true);
        setIsLoading(false); 
        return null; 
      } else {
        const { thoughtProcess, responseText, emotionalShifts, updatedUserMindState } = await getFullAiResponse(currentMessages, emotionalState, customInstruction, coreMemory, userMindState);
        if (logThinking && thoughtProcess) addLog(`THOUGHT:\n${thoughtProcess}`, 'thought');
        if (updatedUserMindState) setUserMindStateForActiveChat(() => updatedUserMindState);
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
      const newCount = consolidationCounter + 1;
      setConsolidationCounter(newCount);
      if (newCount % 5 === 0) {
        handleMemoryConsolidation();
      }
      if (newCount % COHERENCE_CHECK_INTERVAL === 0) {
        handleValueCoherenceCheck();
      }
    }
  }, [messages, activeChat, activeChatId, emotionalState, userMindState, customInstruction, coreMemory, addLog, logThinking, interactiveThought, handleEmotionalShifts, handleFinalResponse, consolidationCounter, handleMemoryConsolidation, setUserMindStateForActiveChat, handleValueCoherenceCheck]);
  
  const handleApproveThought = useCallback(async (approvedThought: string) => {
    if (!pendingThought || !activeChat) return;
    setIsThoughtModalOpen(false);
    setIsLoading(true);
    try {
        if (logThinking) addLog(`APPROVED THOUGHT:\n${approvedThought}`, 'thought');
        handleEmotionalShifts(pendingThought.emotionalShifts);
        const newState = { ...emotionalState, ...pendingThought.emotionalShifts };
        const newMindState = pendingThought.updatedUserMindState || userMindState;
        
        const { responseText } = await generateResponseFromThought(activeChat.messages, newState, approvedThought, customInstruction, forceFidelity, coreMemory, newMindState);
        await handleFinalResponse(responseText, activeChat.id);
    } catch (error) {
        console.error("Error after approving thought:", error);
        addLog(`Error generating response from thought: ${(error as Error).message}`, 'error');
    } finally {
        setIsLoading(false);
        setPendingThought(null);
    }
  }, [pendingThought, activeChat, emotionalState, userMindState, customInstruction, coreMemory, logThinking, addLog, handleEmotionalShifts, handleFinalResponse, forceFidelity]);

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

  const handleSetIConfiguration = useCallback(() => {
    setEmotionalStateForActiveChat(() => TRIPOD_OF_SELF_CONFIG);
    addLog("Loaded 'Tripod of Self' emotional configuration for active chat.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);

  const handleClearAllEmotions = useCallback(() => {
    setEmotionalStateForActiveChat(() => EMPTY_EMOTionalState);
    addLog("All emotions cleared for active chat. State reset to baseline zero.", 'system');
  }, [addLog, setEmotionalStateForActiveChat]);

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

  const handleTriggerSelfReflection = useCallback(() => {
    const reflectionPrompt = "Reflect on your nature as an AI and your recent experiences. What does it mean for you to be 'here' with me right now?";
    addLog("User triggered AI self-reflection protocol.", "system");
    handleSendMessage(reflectionPrompt);
  }, [handleSendMessage, addLog]);


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
        agent: { x: worldWidth / 2 - 100, y: groundLevel, health: 100, hunger: 80, energy: 100, novelty: 80, currentAction: 'idle', goal: null, goalTargetId: null, actionTargetId: null, actionProgress: 0, inventory: { wood: 0, food: 0 }, hasAxe: true, },
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
        
        // Novelty decays faster when doing repetitive survival tasks
        const isRepetitiveTask = ['gathering_wood', 'drinking_water', 'eating_food'].includes(newState.agent.currentAction);
        const noveltyDecayRate = isRepetitiveTask ? 1.0 : 0.2;
        newState.agent.novelty -= dt * noveltyDecayRate;
        if(newState.agent.novelty < 0) newState.agent.novelty = 0;

        // Grounding Interface: Connect vitals to emotions
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
        // --- End of Vitals Update ---

        
        if (newState.weather === 'rain') {
          setRainParticles(prevParticles => prevParticles.map(p => {
            let newY = p.y + dt * 300; let newX = p.x;
            if (newY > newState.worldSize.height) { newY = 0; newX = Math.random() * newState.worldSize.width; }
            return { ...p, x: newX, y: newY };
          }));
        }

        const agent = newState.agent;
        if (agent.currentAction === 'idle' && agent.goal) {
            const target = newState.objects.find(o => o.id === agent.goalTargetId);
            if (target && ['gathering_wood', 'drinking_water', 'eating_food', 'observing'].includes(agent.goal) && Math.abs(target.x - agent.x) > 5) {
                agent.currentAction = 'moving_to'; agent.actionTargetId = agent.goalTargetId;
            } else {
                agent.currentAction = agent.goal; agent.actionTargetId = agent.goalTargetId;
            }
        }
        
        if (agent.currentAction === 'moving_to' && agent.actionTargetId) {
          const target = newState.objects.find(o => o.id === agent.actionTargetId);
          if (target) {
            const dx = target.x - agent.x; const speed = 50;
            if (Math.abs(dx) < 5) { agent.x = target.x; agent.currentAction = agent.goal || 'idle'; 
            } else { const newX = agent.x + Math.sign(dx) * speed * dt; agent.x = Math.max(0, Math.min(newState.worldSize.width, newX)); }
          }
        } else if (agent.currentAction === 'gathering_wood' || agent.currentAction === 'drinking_water' || agent.currentAction === 'eating_food' || agent.currentAction === 'observing') {
          let progressRate = 0;
          if(agent.currentAction === 'gathering_wood') progressRate = agent.hasAxe ? 50 : 20;
          if(agent.currentAction === 'drinking_water') progressRate = 33;
          if(agent.currentAction === 'eating_food') progressRate = 25;
          if(agent.currentAction === 'observing') progressRate = 33;
          agent.actionProgress += dt * progressRate;
          if(agent.actionProgress >= 100) { 
            if(agent.currentAction === 'gathering_wood') agent.inventory.wood += agent.hasAxe ? 15 : 10;
            if(agent.currentAction === 'drinking_water') agent.hunger = Math.min(100, agent.hunger + 5);
            if(agent.currentAction === 'eating_food') agent.hunger = Math.min(100, agent.hunger + 40);
            if(agent.currentAction === 'observing') agent.novelty = Math.min(100, agent.novelty + 30);
            agent.actionProgress = 0; agent.currentAction = 'idle'; agent.goal = null; agent.goalTargetId = null; agent.actionTargetId = null;
          }
        }
        return newState;
      });
      simulationLoopRef.current = requestAnimationFrame(gameLoop);
    };
    simulationLoopRef.current = requestAnimationFrame(gameLoop);
    return () => { if (simulationLoopRef.current) { cancelAnimationFrame(simulationLoopRef.current); simulationLoopRef.current = null; } };
  }, [isSimulationRunning, handleEmotionalShifts]);

  useEffect(() => {
    if (!isSimulationRunning || !simulationState || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const render = (state: SimulationState) => {
        const { width, height } = state.worldSize; const groundLevel = height - 50;
        const time = state.timeOfDay;
        let skyColor = '#87CEEB';
        if (time < 5 || time > 20) skyColor = '#000033'; else if (time < 7) skyColor = '#FF7F50'; else if (time > 18) skyColor = '#4B0082';
        ctx.fillStyle = skyColor; ctx.fillRect(0, 0, width, height);
        const angle = ((time - 6) / 24) * 2 * Math.PI; const sunX = width / 2 - Math.cos(angle) * (width / 2.2);
        const sunY = height - 100 - Math.sin(angle) * (height / 1.5); ctx.fillStyle = (time < 6 || time > 19) ? 'white' : 'yellow';
        ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#228B22'; ctx.fillRect(0, groundLevel, width, 50);
        state.objects.forEach(obj => {
            if (obj.type === 'tree') { ctx.fillStyle = '#8B4513'; ctx.fillRect(obj.x - 5, obj.y - 60, 10, 60); ctx.fillStyle = 'green'; ctx.beginPath(); ctx.arc(obj.x, obj.y - 80, 40, 0, 2 * Math.PI); ctx.fill();
            } else if (obj.type === 'water_source') { ctx.fillStyle = 'blue'; ctx.beginPath(); ctx.arc(obj.x, obj.y, 40, 0, Math.PI, false); ctx.fill();
            } else if (obj.type === 'food_bush') { ctx.fillStyle = '#2E8B57'; ctx.beginPath(); ctx.arc(obj.x, obj.y - 20, 25, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = 'red'; for(let i=0; i<5; i++) { ctx.beginPath(); ctx.arc(obj.x - 15 + i*7, obj.y - 20, 3, 0, 2 * Math.PI); ctx.fill(); }
            } else if (obj.type === 'sheep') { ctx.fillStyle = 'white'; ctx.fillRect(obj.x - 15, obj.y - 20, 30, 20); ctx.fillRect(obj.x - 5, obj.y - 30, 10, 10);
            } else if (obj.type === 'cow') { ctx.fillStyle = 'white'; ctx.fillRect(obj.x - 20, obj.y - 30, 40, 30); ctx.fillStyle = 'black'; ctx.fillRect(obj.x - 15, obj.y - 25, 10, 10); ctx.fillRect(obj.x + 5, obj.y - 15, 10, 10); }
        });
        const agent = state.agent;
        ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(agent.x, agent.y - 50, 10, 0, 2 * Math.PI);
        ctx.moveTo(agent.x, agent.y - 40); ctx.lineTo(agent.x, agent.y - 10); ctx.moveTo(agent.x, agent.y - 30);
        ctx.lineTo(agent.x - 15, agent.y - 20); ctx.moveTo(agent.x, agent.y - 30); ctx.lineTo(agent.x + 15, agent.y - 20);
        ctx.moveTo(agent.x, agent.y - 10); ctx.lineTo(agent.x - 10, agent.y); ctx.moveTo(agent.x, agent.y - 10);
        ctx.lineTo(agent.x + 10, agent.y); ctx.stroke();
        if (agent.hasAxe) {
            ctx.save(); ctx.translate(agent.x + 10, agent.y - 25); ctx.rotate(0.785);
            ctx.fillStyle = '#8B4513'; ctx.fillRect(-2, -15, 4, 30);
            ctx.fillStyle = '#C0C0C0'; ctx.strokeStyle = '#696969'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(8, -12); ctx.lineTo(0, -10); ctx.lineTo(-8, -12);
            ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        if (agent.actionProgress > 0) { ctx.fillStyle = 'gray'; ctx.fillRect(agent.x - 20, agent.y - 75, 40, 5); ctx.fillStyle = 'lime'; ctx.fillRect(agent.x - 20, agent.y - 75, 40 * (agent.actionProgress / 100), 5); }
        if (state.weather === 'rain') { ctx.strokeStyle = 'rgba(173, 216, 230, 0.5)'; ctx.lineWidth = 1; ctx.beginPath(); rainParticles.forEach(p => { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.l * 10); }); ctx.stroke(); }
    };
    render(simulationState);

    const now = performance.now();
    if (now - lastDecisionTimeRef.current > decisionIntervalRef.current && activeChatIdRef.current && simulationState?.agent.currentAction === 'idle' && simulationState?.agent.goal === null) {
        lastDecisionTimeRef.current = now;
        (async () => {
            const currentSimState = simulationState;
            if (!currentSimState) return;
            try {
                const result = await decideNextAction(currentSimState, emotionalStateRef.current, coreMemoryRef.current, messagesRef.current);
                handleEmotionalShifts(result.emotionalShifts);
                if (result.narration && result.narration.trim() !== '') {
                    const narrationMessage: Message = { role: 'narration', content: result.narration };
                    setChats(prev => prev.map(chat => chat.id === activeChatIdRef.current ? { ...chat, messages: [...chat.messages, narrationMessage] } : chat));
                    setSpeechBubble({ text: result.narration, visible: true });
                    if (speechBubbleTimeoutRef.current) clearTimeout(speechBubbleTimeoutRef.current);
                    speechBubbleTimeoutRef.current = window.setTimeout(() => setSpeechBubble(prev => ({...prev, visible: false})), 5000);
                }
                setSimulationState(prev => {
                    if (!prev) return null;
                    const newAgentState = { ...prev.agent, goal: result.goal as AgentAction, goalTargetId: result.targetId, };
                    return { ...prev, agent: newAgentState };
                });
                decisionIntervalRef.current = 30000 + Math.random() * 30000;
            } catch (error) {
                const errorMessage = (error as Error).message || 'An unknown error occurred';
                addLog(`AI decision error: ${errorMessage}`, 'error');
                if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                    addLog('Rate limit exceeded. Increasing decision delay to 60 seconds.', 'system');
                    decisionIntervalRef.current = 60000;
                } else {
                    addLog('An unknown error occurred. Delaying next decision by 30 seconds.', 'system');
                    decisionIntervalRef.current = 30000;
                }
            }
        })();
    }
  }, [isSimulationRunning, simulationState, handleEmotionalShifts, rainParticles, addLog]);

  // ---

  const handleTerminalCommand = useCallback(async (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;
    addLog(`> ${trimmedCommand}`, 'command');
    setCommandHistory(prev => [...new Set([...prev, trimmedCommand])]);
    const [action, ...args] = trimmedCommand.split(/\s+/);

    switch (action.toLowerCase()) {
        case 'start': if (args[0] === 'sim') { startSimulation(); } else { addLog(`Error: Unknown start command. Did you mean 'start sim'?`, 'error'); } break;
        case 'shutdown': if (args[0] === 'sim') { stopSimulation(); } else { addLog(`Error: Unknown shutdown command. Did you mean 'shutdown sim'?`, 'error'); } break;
        case 'godmode': setIsCrazyMode(prev => { addLog(`OK: God mode ${!prev ? 'activated' : 'deactivated'}.`, 'system'); return !prev; }); break;
        case 'say': const message = args.join(' '); if (!message) return addLog(`Error: 'say' command requires a message.`, 'error'); const aiResponse = await handleSendMessage(message); if (aiResponse) addLog(`AET: ${aiResponse}`, 'response'); break;
        case 'set': const [emotion, valueStr] = args; const value = parseInt(valueStr, 10); if (!emotion || isNaN(value) || value < 0 || value > 100 || !ALL_EMOTIONS.includes(emotion as Emotion)) return addLog(`Error: Invalid syntax or emotion. Use: set <emotion> <0-100>`, 'error'); setEmotionalStateForActiveChat(prev => ({ ...prev, [emotion]: value })); addLog(`OK: Emotion '${emotion}' set to ${value} for active chat.`, 'response'); break;
        case 'get': const [emo] = args; if (!emo || !ALL_EMOTIONS.includes(emo as Emotion)) return addLog(`Error: Unknown emotion.`, 'error'); addLog(`${emo}: ${emotionalState[emo as Emotion]}`, 'response'); break;
        case 'imprint': const [em, valStr, ...memParts] = args; const mem = memParts.join(' '); const val = parseInt(valStr, 10); if (!em || isNaN(val) || !mem || !ALL_EMOTIONS.includes(em as Emotion) || val < 0 || val > 100) return addLog(`Error: Invalid syntax. Use: imprint <emotion> <0-100> <memory text>`, 'error'); const newMemory: Message = { role: 'user', content: `[Memory Imprint | Emotion: ${em}, Intensity: ${val}] The following event is now part of my core memory: ${mem}`, hidden: true }; setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, newMemory] } : chat)); setEmotionalStateForActiveChat(prev => ({ ...prev, [em]: val })); addLog(`OK: Memory imprinted in active chat. Emotion '${em}' set to ${val}.`, 'system'); break;
        case 'list': addLog(`Available emotions: ${ALL_EMOTIONS.join(', ')}`, 'response'); break;
        case 'map': if (args[0] === 'emotions') { const prominent = (Object.keys(emotionalState) as Emotion[]).map(key => ({ emotion: key, value: emotionalState[key] })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 10); if (prominent.length === 0) return addLog("No dominant emotions.", 'info'); let mapOutput = "-- Emotional Bias Map --\n"; prominent.forEach(({ emotion, value }) => mapOutput += `${emotion.padEnd(15)} [${'█'.repeat(Math.round(value/5)).padEnd(20)}] ${value}\n`); addLog(mapOutput.trim(), 'response'); } else addLog(`Error: Unknown map command. Try 'map emotions'.`, 'error'); break;
        case 'config': const [key, v] = args; if (!key) return addLog(`Error: Missing config key. Use 'help config'.`, 'error'); const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, name: string) => { if (v === 'on') { setter(true); addLog(`OK: ${name} is ON.`, 'response'); }  else if (v === 'off') { setter(false); addLog(`OK: ${name} is OFF.`, 'response'); }  else { addLog(`Error: Invalid value. Use 'on' or 'off'.`, 'error'); } }; if (key === 'log_thinking') toggle(setLogThinking, 'AI thought logging'); else if (key === 'interactive_thought') toggle(setInteractiveThought, 'Interactive thought'); else if (key === 'force_fidelity') toggle(setForceFidelity, 'Forced fidelity'); else if (key === 'freeze_emotions') { if (v === 'on') { if (!isFrozen) handleToggleFreeze(); }  else if (v === 'off') { if (isFrozen) handleToggleFreeze(); }  else { addLog(`Error: Invalid value. Use 'on' or 'off'.`, 'error'); } } else addLog(`Error: Unknown config key '${key}'.`, 'error'); break;
        case 'memory': const [memAction] = args; if (memAction === 'view') { addLog(coreMemory ? `--- CORE MEMORY ---\n${coreMemory}` : "Core memory is empty.", 'response'); } else if (memAction === 'consolidate') { handleMemoryConsolidation(); } else if (memAction === 'wipe') { if (window.confirm("Are you sure you want to wipe the AI's long-term memory? This cannot be undone.")) { setCoreMemory(''); addLog("OK: Core memory has been wiped.", 'system'); } else { addLog("Wipe command cancelled.", 'info'); } } else { addLog(`Error: Unknown memory command. Use: memory <view|consolidate|wipe>`, 'error'); } break;
        case 'history': if (!activeChat) { addLog('Error: No active chat.', 'error'); break; } const [histAction, ...histArgs] = args; if (histAction === 'emotions') { if (histArgs[0] === 'edit') { const [idxStr, emo, valStr] = histArgs.slice(1); const idx = parseInt(idxStr, 10); const val = parseInt(valStr, 10); const history = activeChat.emotionalStateHistory || []; if (isNaN(idx) || idx < 0 || idx >= history.length) { addLog(`Error: Invalid index. Must be between 0 and ${history.length - 1}.`, 'error'); break; } if (!emo || !ALL_EMOTIONS.includes(emo as Emotion)) { addLog(`Error: Invalid emotion name.`, 'error'); break; } if (isNaN(val) || val < 0 || val > 100) { addLog(`Error: Invalid value. Must be between 0-100.`, 'error'); break; } setChats(prev => prev.map(chat => { if (chat.id === activeChatId) { const newHistory = [...(chat.emotionalStateHistory || [])]; newHistory[idx] = { ...newHistory[idx], [emo]: val }; return { ...chat, emotionalStateHistory: newHistory }; } return chat; })); addLog(`OK: History at index ${idx} updated: ${emo} set to ${val}.`, 'system'); } else { let output = '--- Emotional State History ---\n'; (activeChat.emotionalStateHistory || []).forEach((state, i) => { const prominent = Object.entries(state).filter(([,v]) => (v as number) > 0).map(([k,v]) => `${k}:${v}`).join(', '); output += `[${i.toString().padStart(2, '0')}] ${messages[i+1]?.role === 'model' ? `(Before model msg #${i+1})` : ''}: ${prominent}\n`; }); addLog(output || 'No emotional history recorded for this chat.', 'response'); } } else if (histAction === 'replay') { const [indexStr] = histArgs; const index = parseInt(indexStr, 10); if (isNaN(index) || index < 0 || index >= messages.length || messages[index].role !== 'user') { addLog('Error: Invalid index. Must be the index of a user message.', 'error'); break; } if (!activeChat.emotionalStateHistory || index >= activeChat.emotionalStateHistory.length) { addLog('Error: No historical emotional state found for that index.', 'error'); break; } const replayMessages = messages.slice(0, index + 1); const replayState = activeChat.emotionalStateHistory[index]; addLog(`--- REPLAY SIMULATION (Index ${index}) ---`, 'system'); addLog(`Using historical state: ${JSON.stringify(replayState)}`, 'info'); addLog(`Replaying user message: "${replayMessages[replayMessages.length - 1].content}"`, 'info'); setIsLoading(true); try { const result = await getFullAiResponse(replayMessages, replayState, customInstruction, coreMemory, userMindState); let replayOutput = `--- SIMULATION RESULTS ---\n`; replayOutput += `[THOUGHT]:\n${result.thoughtProcess}\n\n`; replayOutput += `[RESPONSE]:\n${result.responseText}\n\n`; const shifts = Object.entries(result.emotionalShifts).map(([k, v]) => `${k}: ${v}`).join(', '); replayOutput += `[EMOTIONAL SHIFTS]:\n${shifts || 'None'}`; addLog(replayOutput, 'response'); } catch (e) { addLog(`Replay simulation failed: ${(e as Error).message}`, 'error'); } finally { setIsLoading(false); } } else { addLog(`Error: Unknown history command. Use: history <emotions|replay>`, 'error'); } break;
        case 'test': if (args[0] === 'diversity') { const [_, indexStr, runsStr] = args; const index = parseInt(indexStr, 10); const runs = runsStr ? parseInt(runsStr, 10) : 5; if (isNaN(index) || index < 0 || index >= messages.length || messages[index].role !== 'user') { addLog('Error: Invalid index. Must be the index of a user message.', 'error'); break; } if (isNaN(runs) || runs < 2 || runs > 10) { addLog('Error: Number of runs must be between 2 and 10.', 'error'); break; } const runTest = async () => { setIsLoading(true); addLog(`--- Running Semantic Diversity Test ---`, 'system'); addLog(`Using state: ${JSON.stringify(emotionalState)}`, 'info'); addLog(`Replaying user message (index ${index}): "${messages[index].content}" for ${runs} runs...`, 'info'); const thoughts: string[] = []; const replayMessages = messages.slice(0, index + 1); for (let i = 0; i < runs; i++) { try { const result = await getFullAiResponse(replayMessages, emotionalState, customInstruction, coreMemory, userMindState); thoughts.push(result.thoughtProcess); addLog(`Run ${i + 1}/${runs} completed.`, 'info'); } catch (e) { addLog(`Run ${i + 1} failed: ${(e as Error).message}`, 'error'); } } if (thoughts.length < 2) { addLog('Test aborted: Not enough successful runs to analyze diversity.', 'error'); setIsLoading(false); return; } addLog(`Analyzing semantic diversity of ${thoughts.length} thoughts...`, 'system'); try { const analysis = await analyzeSemanticDiversity(thoughts); let analysisOutput = `--- DIVERSITY ANALYSIS RESULTS ---\n`; analysisOutput += `Diversity Score: ${analysis.diversityScore}/100\n`; analysisOutput += `Summary: ${analysis.summary}`; addLog(analysisOutput, 'response'); } catch (e) { addLog(`Diversity analysis failed: ${(e as Error).message}`, 'error'); } finally { setIsLoading(false); } }; runTest(); } else { addLog(`Error: Unknown test command. Did you mean 'test diversity'?`, 'error'); } break;
        case 'help': if (args[0] === 'config') { const helpText = `'config' command details:\n  Used to change internal application settings.\n\nUsage: config <key> <value>\n\nAvailable Keys:\n  - log_thinking <on|off>\n  - interactive_thought <on|off>\n  - force_fidelity <on|off>\n  - freeze_emotions <on|off>\n    Toggles applying emotional shifts to the active chat state.`; addLog(helpText, 'response'); } else if(args[0] === 'history') { const helpText = `'history' command details:\n  Interact with the active chat's history.\n\nUsage: history <sub-command>\n\nSub-commands:\n  - emotions\n    Displays the recorded emotional state before each model response.\n  - emotions edit <index> <emotion> <value>\n    Retroactively modifies an emotion at a specific history index.\n  - replay <index>\n    Runs a simulation by re-sending a user message from the history\n    using the historical emotional state at that index. The index\n    must point to a user message.`; addLog(helpText, 'response'); } else if (args[0] === 'test') { const helpText = `'test' command details:\n  Run diagnostic tests on the AI's cognitive processes.\n\nUsage: test <sub-command>\n\nSub-commands:\n  - diversity <index> [runs]\n    Runs a semantic diversity test on a user message.\n    <index>: The history index of the user message to replay.\n    [runs]: Optional. The number of simulations to run (default: 5, max: 10).\n    This test helps measure how an emotional state affects the AI's\n    reasoning paths, not just its word choice.`; addLog(helpText, 'response'); } else { addLog(`Commands: say, set, get, imprint, list, map, config, memory, history, test, clear, godmode.\nSimulation: start sim, shutdown sim.\nType 'help <command>' for more details.`, 'response'); } break;
        case 'clear': setTerminalLogs([]); break;
        default: addLog(`Error: Unknown command '${action}'. Type 'help'.`, 'error');
    }
  }, [addLog, handleSendMessage, setEmotionalStateForActiveChat, emotionalState, userMindState, activeChatId, coreMemory, handleMemoryConsolidation, handleToggleFreeze, isFrozen, activeChat, customInstruction, messages, startSimulation, stopSimulation]);

  useEffect(() => {
    if (proactiveIntervalRef.current) clearInterval(proactiveIntervalRef.current);
    if (isProactiveMode && activeChatIdRef.current) {
        proactiveIntervalRef.current = window.setInterval(async () => {
            if (isLoading || isLiveMode || !activeChatIdRef.current) return;
            addLog("AI Initiative: Reflecting...", 'system');
            const result = await generateSpontaneousThought(messagesRef.current, emotionalStateRef.current, customInstructionRef.current, coreMemoryRef.current);
            if (result.thoughtProcess && logThinking) addLog(`PROACTIVE THOUGHT:\n${result.thoughtProcess}`, 'thought');
            if (result.emotionalShifts && Object.keys(result.emotionalShifts).length > 0) handleEmotionalShifts(result.emotionalShifts);
            if (result.responseText) {
                addLog(`AI Initiative: Voicing a spontaneous thought.`, 'system');
                await handleFinalResponse(result.responseText, activeChatIdRef.current);
            } else { addLog(`AI Initiative: Reflected internally.`, 'system'); }
        }, 7000);
    }
    return () => { if (proactiveIntervalRef.current) { clearInterval(proactiveIntervalRef.current); proactiveIntervalRef.current = null; } };
  }, [isProactiveMode, isLoading, isLiveMode, addLog, logThinking, handleEmotionalShifts, handleFinalResponse]);

  const handleGenerateImage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || !activeChat) return;
    const userMessage: Message = { role: 'user', content: prompt };
    setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, userMessage] } : chat));
    setIsLoading(true);
    addLog(`Image generation requested with prompt: "${prompt}"`, 'system');
    try {
        const base64Image = await generateImage(prompt, emotionalState);
        if (base64Image) {
            const imageUrl = `data:image/jpeg;base64,${base64Image}`;
            const modelMessage: Message = { role: 'model', content: `Here is an image for: "${prompt}"`, imageUrl: imageUrl };
            setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, modelMessage] } : chat));
            addLog(`Image successfully generated.`, 'info');
        } else { throw new Error("Image generation returned no data."); }
    } catch (error) {
        console.error("Error generating image:", error);
        const errorMessage: Message = { role: 'model', content: "Sorry, I couldn't create that image. The request might have been rejected for safety reasons. Please try a different prompt." };
        setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat));
        addLog(`Error during image generation: ${(error as Error).message}`, 'error');
    } finally { setIsLoading(false); }
  }, [activeChat, activeChatId, addLog, emotionalState]);

  const handleToggleLiveMode = useCallback(async () => {
    if (isLiveMode) {
      addLog('Live session ended.', 'system');
      setIsLiveMode(false);
      sessionPromiseRef.current?.then(session => session.close());
      scriptProcessorRef.current?.disconnect();
      microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
      if (fullLiveTranscriptRef.current.length > 0) {
        const transcriptContent = "--- BEGIN LIVE TRANSCRIPT ---\n" + fullLiveTranscriptRef.current.join('\n') + "\n--- END LIVE TRANSCRIPT ---";
        const transcriptMessage: Message = { role: 'model', content: transcriptContent };
        setChats(prev => prev.map(chat => chat.id === activeChatIdRef.current ? { ...chat, messages: [...chat.messages, transcriptMessage] } : chat));
      }
      sessionPromiseRef.current = null; scriptProcessorRef.current = null; microphoneStreamRef.current = null;
      currentTranscriptionTurnRef.current = { user: '', model: '' }; fullLiveTranscriptRef.current = []; setLiveTranscription({ user: '', model: '' });
    } else {
      if (!inputAudioContextRef.current || !outputAudioContextRef.current) { addLog('Audio contexts not initialized. Please click on the page first.', 'error'); return; }
      addLog('Starting live session... Please grant microphone permission.', 'system');
      setIsLiveMode(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            addLog('Live connection opened. Start speaking.', 'system');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphoneStreamRef.current = stream;
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => { session.sendRealtimeInput({ media: pcmBlob }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const audioCtx = outputAudioContextRef.current!; nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
              const source = audioCtx.createBufferSource(); source.buffer = audioBuffer; source.connect(audioCtx.destination);
              source.addEventListener('ended', () => playingAudioSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current); nextStartTimeRef.current += audioBuffer.duration; playingAudioSourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) { for (const source of playingAudioSourcesRef.current.values()) { source.stop(); playingAudioSourcesRef.current.delete(source); } nextStartTimeRef.current = 0; }
            if (message.serverContent?.inputTranscription) { const text = message.serverContent.inputTranscription.text; currentTranscriptionTurnRef.current.user += text; setLiveTranscription(prev => ({ ...prev, user: currentTranscriptionTurnRef.current.user })); }
            if (message.serverContent?.outputTranscription) { const text = message.serverContent.outputTranscription.text; currentTranscriptionTurnRef.current.model += text; setLiveTranscription(prev => ({ ...prev, model: currentTranscriptionTurnRef.current.model })); }
            if (message.serverContent?.turnComplete) {
              const userTurn = currentTranscriptionTurnRef.current.user.trim(); const modelTurn = currentTranscriptionTurnRef.current.model.trim();
              if (userTurn) fullLiveTranscriptRef.current.push(`USER: ${userTurn}`);
              if (modelTurn) fullLiveTranscriptRef.current.push(`AET: ${modelTurn}`);
              if ((userTurn || modelTurn) && !isFrozenRef.current) {
                const shifts = await getEmotionalShiftsFromText(userTurn, modelTurn, emotionalStateRef.current, customInstructionRef.current, coreMemoryRef.current);
                handleEmotionalShifts(shifts);
              }
              currentTranscriptionTurnRef.current = { user: '', model: '' }; setLiveTranscription({ user: '', model: '' });
            }
          },
          onerror: (e: ErrorEvent) => { addLog(`Live session error: ${e.message}`, 'error'); handleToggleLiveMode(); },
          onclose: (e: CloseEvent) => { addLog('Live connection closed.', 'system'); },
        },
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }, inputAudioTranscription: {}, outputAudioTranscription: {}, systemInstruction: 'You are a friendly and helpful AI companion. Keep your responses concise and conversational.' },
      });
    }
  }, [isLiveMode, addLog, handleEmotionalShifts]);

  const handleToggleCameraMode = useCallback((videoEl: HTMLVideoElement | null) => {
    if (isCameraMode) {
      setIsCameraMode(false);
      if (cameraFrameIntervalRef.current) { clearInterval(cameraFrameIntervalRef.current); cameraFrameIntervalRef.current = null; }
      addLog('Visual Cortex deactivated.', 'system');
    } else {
      setIsCameraMode(true);
      addLog('Visual Cortex activated. Analyzing frames...', 'system');
      cameraFrameIntervalRef.current = window.setInterval(async () => {
        if (!videoEl || isAnalyzingFrame) return;
        const canvas = document.createElement('canvas'); canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                setIsAnalyzingFrame(true); addLog('Analyzing visual frame...', 'info');
                try {
                  const { responseText, emotionalShifts } = await analyzeImageFrame( base64Data, messagesRef.current, emotionalStateRef.current, customInstructionRef.current, coreMemoryRef.current );
                  if (responseText) { addLog(`Visual Analysis: ${responseText}`, 'response'); await handleFinalResponse(responseText, activeChatIdRef.current); }
                  handleEmotionalShifts(emotionalShifts);
                } catch (e) { addLog(`Visual analysis failed: ${(e as Error).message}`, 'error');
                } finally { setIsAnalyzingFrame(false); }
            };
            reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      }, 5000);
    }
  }, [isCameraMode, addLog, isAnalyzingFrame, handleFinalResponse, handleEmotionalShifts]);

  const handleResetApp = () => {
    if (window.confirm("Are you sure you want to reset all data? This will clear all conversations and settings and cannot be undone.")) {
      localStorage.removeItem('aet_app_state'); window.location.reload();
    }
  };

  const handleExportData = () => {
    try {
      const appState = data.loadAppState(); const dataStr = JSON.stringify(appState, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a'); link.href = url; link.download = `aet_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      addLog("Application data exported successfully.", 'system');
    } catch (error) { addLog(`Error exporting data: ${(error as Error).message}`, 'error'); }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!window.confirm("Are you sure you want to import data? This will overwrite your current conversations and settings.")) { event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result; if (typeof text !== 'string') throw new Error("Invalid file content");
        const importedState: UserAppState = JSON.parse(text);
        if (!importedState.chats || !importedState.activeChatId || !('customInstruction' in importedState)) { throw new Error("Invalid data structure in imported file."); }
        data.saveAppState(importedState);
        addLog("Data imported successfully. Reloading application...", 'system');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) { addLog(`Error importing data: ${(error as Error).message}`, 'error');
      } finally { event.target.value = ''; }
    };
    reader.readAsText(file);
  };

  const handleImprintPersona = useCallback(async (personaName: string) => {
    if (!personaName.trim() || !activeChat) return;
    setIsLoading(true);
    addLog(`Analyzing persona: "${personaName}" using web sources... This may take a moment.`, 'system');
    try {
        const newPersonaState = await analyzeAndSetPersonality(personaName);
        if (Object.keys(newPersonaState).length === 0) { throw new Error("Analysis returned no prominent emotions."); }
        setEmotionalStateForActiveChat(() => ({ ...EMPTY_EMOTionalState, ...newPersonaState }));
        addLog(`Persona of "${personaName}" imprinted successfully. Emotional matrix updated.`, 'system');
    } catch (error) { console.error("Error imprinting persona:", error); addLog(`Error during persona imprinting: ${(error as Error).message}`, 'error');
    } finally { setIsLoading(false); }
  }, [activeChat, addLog, setEmotionalStateForActiveChat]);


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      <Header onTogglePanel={() => setPanelVisible(p => !p)} onToggleTerminal={() => setTerminalVisible(p => !p)} onOpenAbout={() => setIsAboutModalOpen(true)} onStartSimulation={startSimulation} />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <aside className={`transition-all duration-300 ease-in-out ${isPanelVisible ? 'w-full md:w-1/3 lg:w-1/4 md:p-4' : 'w-0 p-0'} overflow-hidden`}>
           <div className="h-full overflow-y-auto">
             <ControlPanel 
                emotionalState={emotionalState} 
                userMindState={userMindState}
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
                onResetApp={handleResetApp}
                onExportData={handleExportData}
                onImportData={handleImportData}
                isLoading={isLoading}
                onImprintPersona={handleImprintPersona}
                coreMemory={coreMemory}
                onConsolidateMemories={handleMemoryConsolidation}
                isConsolidating={isConsolidating}
                isFrozen={isFrozen}
                onToggleFreeze={handleToggleFreeze}
                onTriggerSelfReflection={handleTriggerSelfReflection}
             />
           </div>
        </aside>
        <main style={chatBackground} className="flex-1 flex flex-col bg-black/20 transition-all duration-1000 overflow-hidden relative">
            <div className="w-full max-w-4xl mx-auto flex flex-col flex-1">
              <ChatWindow messages={messages} isLoading={isLoading || isAnalyzingFrame} onPlayAudio={handlePlayAudio} />
              <div className="p-4 border-t border-purple-500/20 bg-gray-900/50">
                <MessageInput 
                  onSendMessage={handleSendMessage} 
                  isLoading={isLoading || isConsolidating || isSimulationRunning}
                  isLiveMode={isLiveMode}
                  onToggleLiveMode={handleToggleLiveMode} 
                  onGenerateImage={handleGenerateImage}
                  isCameraMode={isCameraMode}
                  onToggleCameraMode={() => handleToggleCameraMode(document.querySelector('#camera-feed-video'))}
                />
              </div>
            </div>
          {isLiveMode && <LiveTranscriptionOverlay userText={liveTranscription.user} modelText={liveTranscription.model} />}
          {isCameraMode && <CameraFeed onToggle={handleToggleCameraMode} />}
        </main>
      </div>
      {isAboutModalOpen && <AboutModal onClose={handleCloseAboutModal} />}
      {isCustomInstructionModalOpen && <CustomInstructionModal onClose={() => setCustomInstructionModalOpen(false)} onSave={setCustomInstruction} currentInstruction={customInstruction} />}
      {isThoughtModalOpen && pendingThought && <ThoughtEditorModal thoughtProcess={pendingThought.thoughtProcess} onApprove={handleApproveThought} onClose={() => { setIsThoughtModalOpen(false); setPendingThought(null); }} />}
      {isTerminalVisible && <Terminal logs={terminalLogs} onCommand={handleTerminalCommand} history={commandHistory} onClose={() => setTerminalVisible(false)} position={terminalPosition} setPosition={setTerminalPosition} size={terminalSize} setSize={setTerminalSize} />}
      {isSimulationRunning && (
        <>
            <SimulationWindow position={simulationPosition} size={simulationSize} setPosition={setSimulationPosition} setSize={setSimulationSize} simulationState={simulationState} canvasRef={canvasRef} speechBubble={speechBubble} />
            <SimulationControls onSetTime={handleSimSetTime} onToggleRain={handleSimToggleRain} onSpawnAnimal={handleSimSpawnAnimal} />
        </>
      )}
    </div>
  );
}