
import type { UserAppState, Chat, EmotionalState, Emotion } from '../types';
import { ALL_EMOTIONS } from '../types';

export const initialEmotionalState: EmotionalState = ALL_EMOTIONS.reduce((acc, emotion) => {
    acc[emotion] = 0;
    return acc;
}, {} as EmotionalState);

// This is the default emotional state for any NEW chat.
Object.assign(initialEmotionalState, {
    shyness: 40, awareness: 70, stubbornness: 20, happiness: 60, sadness: 15,
    understanding: 80, curiosity: 70, contentment: 50, serenity: 40, gratitude: 50,
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

export function loadUserData(username: string): UserAppState {
    try {
        const dataStr = localStorage.getItem(`aet_userdata_${username}`);
        if (dataStr) {
            const state = JSON.parse(dataStr);
            
            // --- ONE-TIME MIGRATION SCRIPT ---
            // If `state.emotionalState` exists, it's the old format. We must migrate it.
            if (state.emotionalState && state.chats && state.chats.length > 0 && !state.chats[0].emotionalState) {
                console.warn(`MIGRATING user data for ${username} to per-chat emotional state format.`);
                
                // Apply the old global emotional state to every existing chat.
                const migratedChats = state.chats.map((chat: Omit<Chat, 'emotionalState'>) => ({
                    ...chat,
                    emotionalState: state.emotionalState 
                }));

                const migratedState: UserAppState = {
                    customInstruction: state.customInstruction,
                    chats: migratedChats,
                    activeChatId: state.activeChatId,
                };
                
                // Save the migrated data back to localStorage immediately.
                saveUserData(username, migratedState); 
                return migratedState;
            }
            
            // If the data is already in the new format or is malformed, return it as is.
            return state;
        }
    } catch (error) {
        console.error(`Failed to load or parse user data for ${username}`, error);
    }
    // If no data exists or parsing fails, return a fresh slate for the user.
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