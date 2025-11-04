
import type { UserAppState, Chat, EmotionalState, Emotion } from '../types';
import { ALL_EMOTIONS } from '../types';

// Fix: Export initialEmotionalState so it can be used in other files.
export const initialEmotionalState: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
// Fix: Import Emotion type and cast initial reduce object to EmotionalState to satisfy the compiler.
}, {} as EmotionalState);

Object.assign(initialEmotionalState, {
    shyness: 40, awareness: 70, stubbornness: 20, happiness: 60, sadness: 15,
    understanding: 80, curiosity: 70, contentment: 50, serenity: 40, gratitude: 50,
    love: 40, honesty: 90, trust: 50, hope: 60, faith: 50, tranquility: 40,
});

export function createInitialUserData(): UserAppState {
    const initialChatId = Date.now().toString();
    // Fix: Add emotionalState to the Chat object, as required by the Chat type.
    const initialChat: Chat = {
        id: initialChatId,
        name: 'New Conversation',
        messages: [{ role: 'model', content: "Hello... how are you feeling today?" }],
        createdAt: Date.now(),
        emotionalState: { ...initialEmotionalState },
    };
    // Fix: Return a valid UserAppState object without the top-level emotionalState property.
    return {
        customInstruction: '',
        chats: [initialChat],
        activeChatId: initialChatId,
    };
}

export function loadUserData(username: string): UserAppState {
    try {
        const data = localStorage.getItem(`aet_userdata_${username}`);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Failed to load or parse user data for ${username}`, error);
    }
    // If no data or parsing fails, return a fresh slate
    return createInitialUserData();
}

export function saveUserData(username: string, state: UserAppState) {
    try {
        const data = JSON.stringify(state);
        localStorage.setItem(`aet_userdata_${username}`, data);
    } catch (error) {
        console.error(`Failed to save user data for ${username}`, error);
    }
}