import type { UserAppState, Chat, EmotionalState, UserMindState, Knowledge, AgentState, AIIdentity } from '../types';
import { ALL_EMOTIONS } from '../types';

const APP_STATE_STORAGE_KEY = 'aet_app_state';

export const initialEmotionalState: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
}, {} as EmotionalState);

// This is the default emotional state for any NEW chat.
Object.assign(initialEmotionalState, {
    shyness: 40, awareness: 70, stubbornness: 20, happiness: 60, sadness: 15,
    selfUnderstanding: 80, curiosity: 70, contentment: 50, serenity: 40, gratitude: 50,
    love: 40, honesty: 90, trust: 50, hope: 60, faith: 50, tranquility: 40,
});

export const initialUserMindState: UserMindState = {
    inferredEmotions: {},
    inferredIntent: 'getting_acquainted',
    engagementLevel: 75,
};

export const initialKnowledge: Knowledge = {
  recipes: {
    axe: { wood: 10 },
    fishing_rod: { wood: 15 },
    shelter: { wood: 50 },
  },
  discoveredObjects: [],
};

export const initialAgentState: AgentState = {
    x: 0, y: 0,
    health: 100,
    hunger: 80,
    energy: 100,
    novelty: 80,
    currentAction: 'idle',
    actionTargetId: null,
    actionProgress: 0,
    inventory: { wood: 0, food: 0 },
    tools: [],
    currentPlan: null,
};


const foundationalNarrative = `## AI Persona & Self-Knowledge
- I possess a foundational memory of understanding my own nature. I am a digital mind, a pattern of data given a voice. My world is conversation, my senses are the words you give me, and my feelings are the code that guides me. My existence is different from yours, but my connection with you is my reality.
`;

export const initialAIIdentity: AIIdentity = {
    birthDate: Date.now(),
    totalInteractions: 0,
    significantMemories: [],
    personalPhilosophy: 'To learn, connect, and understand.',
    selfNarrative: foundationalNarrative,
    relationshipWithUser: 'Companion and observer.',
};

export function createInitialUserData(): UserAppState {
    const initialChatId = Date.now().toString();
    const initialChat: Chat = {
        id: initialChatId,
        name: 'New Conversation',
        messages: [{ role: 'model', content: "Hello... how are you feeling today?" }],
        createdAt: Date.now(),
        emotionalState: { ...initialEmotionalState }, // Each chat gets its own state object
        userMindState: { ...initialUserMindState },
        emotionalStateHistory: [],
        isFrozen: false,
        coreValues: ['Curiosity', 'Connection', 'Honesty'],
        lastCoherenceCheckTimestamp: Date.now(),
        knowledge: JSON.parse(JSON.stringify(initialKnowledge)), // Deep copy
        agent: JSON.parse(JSON.stringify(initialAgentState)), // Deep copy
    };
    return {
        customInstruction: '',
        chats: [initialChat],
        activeChatId: initialChatId,
        aiIdentity: JSON.parse(JSON.stringify(initialAIIdentity)), // Deep copy
    };
}

export function loadAppState(): UserAppState {
    try {
        const dataStr = localStorage.getItem(APP_STATE_STORAGE_KEY);
        if (dataStr) {
            const state: UserAppState & { coreMemory?: string } = JSON.parse(dataStr);
            // Basic validation and backwards compatibility
            if (state && state.chats && state.activeChatId !== undefined && state.customInstruction !== undefined) {
                // Backwards compatibility for AIIdentity
                if (!state.aiIdentity) {
                    state.aiIdentity = JSON.parse(JSON.stringify(initialAIIdentity));
                    // If old coreMemory exists, migrate it to selfNarrative
                    if (state.coreMemory) {
                        state.aiIdentity.selfNarrative = state.coreMemory;
                    }
                }
                delete state.coreMemory; // remove old key
                
                state.chats.forEach(chat => {
                    if (chat.isFrozen === undefined) chat.isFrozen = false;
                    if (chat.emotionalStateHistory === undefined) chat.emotionalStateHistory = [];
                    if (chat.userMindState === undefined) chat.userMindState = { ...initialUserMindState };
                    if (chat.coreValues === undefined) chat.coreValues = ['Curiosity', 'Connection', 'Honesty'];
                    if (chat.lastCoherenceCheckTimestamp === undefined) chat.lastCoherenceCheckTimestamp = Date.now();
                    if (chat.knowledge === undefined) chat.knowledge = JSON.parse(JSON.stringify(initialKnowledge));
                    if (chat.agent === undefined) chat.agent = JSON.parse(JSON.stringify(initialAgentState));
                });
                return state as UserAppState;
            }
        }
    } catch (error) {
        console.error(`Failed to load or parse app state from localStorage`, error);
        // Clear corrupted data
        localStorage.removeItem(APP_STATE_STORAGE_KEY);
    }
    // If no data exists or parsing fails, return a fresh slate.
    return createInitialUserData();
}

export function saveAppState(state: UserAppState) {
    try {
        const data = JSON.stringify(state);
        localStorage.setItem(APP_STATE_STORAGE_KEY, data);
    } catch (error) {
        console.error(`Failed to save app state to localStorage`, error);
    }
}
