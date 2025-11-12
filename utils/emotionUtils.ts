
import type { EmotionalState } from '../types';

const INERTIA_FACTOR = 0.5; // 0 = no change, 1 = instant change. 0.5 means it moves halfway to the target.

// Defines emotions that should change more slowly (e.g., deep-seated moods)
const HEAVY_EMOTIONS: Partial<Record<keyof EmotionalState, boolean>> = {
    sadness: true,
    grief: true,
    despair: true,
    love: true,
    trust: true,
    contentment: true,
    selfUnderstanding: true,
};

/**
 * Applies inertia to emotional shifts, preventing instant, jarring changes
 * and creating a more realistic emotional flow.
 * @param currentState The current emotional state before shifts.
 * @param targetShifts An object of emotions and their target values.
 * @returns The new emotional state with inertia applied.
 */
export function applyEmotionalInertia(
    currentState: EmotionalState,
    targetShifts: Partial<EmotionalState>
): EmotionalState {
    const newState = { ...currentState };

    for (const key in targetShifts) {
        const emotion = key as keyof EmotionalState;
        const targetValue = targetShifts[emotion];

        if (targetValue !== undefined) {
            const oldValue = currentState[emotion] || 0;
            const isHeavy = HEAVY_EMOTIONS[emotion];
            const factor = isHeavy ? INERTIA_FACTOR / 2 : INERTIA_FACTOR; // Heavy emotions change slower

            // Calculate the new value by moving part of the way to the target
            let newValue = oldValue + (targetValue - oldValue) * factor;

            // Ensure the new value is within bounds and an integer
            newValue = Math.round(Math.max(0, Math.min(100, newValue)));
            
            newState[emotion] = newValue;
        }
    }

    return newState;
}
