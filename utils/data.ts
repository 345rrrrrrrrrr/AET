
import type { UserAppState, Chat, EmotionalState } from '../types';
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

export function createInitialUserData(): UserAppState {
    const initialChatId = Date.now().toString();
    const initialChat: Chat = {
        id: initialChatId,
        name: 'New Conversation',
        messages: [{ role: 'model', content: "Hello... how are you feeling today?" }],
        createdAt: Date.now(),
        emotionalState: { ...initialEmotionalState }, // Each chat gets its own state object
    };
    return {
        customInstruction: '',
        chats: [initialChat],
        activeChatId: initialChatId,
    };
}

export function loadAppState(): UserAppState {
    try {
        const dataStr = localStorage.getItem(APP_STATE_STORAGE_KEY);
        if (dataStr) {
            const state = JSON.parse(dataStr);
            // Basic validation to ensure the loaded data has the expected structure
            if (state && state.chats && state.activeChatId !== undefined && state.customInstruction !== undefined) {
                return state;
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
