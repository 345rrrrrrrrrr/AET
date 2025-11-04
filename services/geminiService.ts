
import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import type { Message, EmotionalState, Emotion } from '../types';
import { ALL_EMOTIONS } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-pro';

// --- Helper to Sanitize API Response ---

/**
 * Defensively processes the emotionalShifts object from the API.
 * Ensures all values are valid numbers and clamps them between 0 and 100.
 * This prevents type errors if the API returns a string or an out-of-range number.
 * @param shifts The raw emotionalShifts object from the API response.
 * @returns A sanitized Partial<EmotionalState> object.
 */
function sanitizeEmotionalShifts(shifts: any): Partial<EmotionalState> {
    if (!shifts || typeof shifts !== 'object') {
        return {};
    }

    const sanitizedShifts: Partial<EmotionalState> = {};
    for (const key in shifts) {
        if (Object.prototype.hasOwnProperty.call(shifts, key) && ALL_EMOTIONS.includes(key as Emotion)) {
            const value = shifts[key];
            if (value !== null && value !== undefined) {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                    sanitizedShifts[key as Emotion] = Math.max(0, Math.min(100, numValue));
                }
            }
        }
    }
    return sanitizedShifts;
}

// --- Schemas for Multi-Step Interaction ---

const emotionProperties = ALL_EMOTIONS.reduce((acc, emotion) => {
  acc[emotion] = { 
    type: Type.NUMBER, 
    description: `The new value for ${emotion} (0-100)`,
    nullable: true,
  };
  return acc;
}, {} as Record<string, { type: Type, description: string, nullable: boolean }>);

const thoughtGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    thoughtProcess: {
      type: Type.STRING,
      description: "Your internal monologue. This is NOT an analytical report. It must be written in the first person, embodying your feelings. If you are sad, your thoughts should sound melancholic. If you are curious, they should be inquisitive. Analyze the user's message through the lens of your emotions and decide on a conversational approach."
    },
    emotionalShifts: {
      type: Type.OBJECT,
      description: "An object containing only the emotions that changed due to the user's message, with their new integer values (0-100).",
      properties: emotionProperties,
    }
  },
  required: ['thoughtProcess', 'emotionalShifts'],
};

const responseGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    responseText: {
      type: Type.STRING,
      description: "Your final conversational reply to the user. This must be a direct execution of the plan from your approved thought process."
    }
  },
  required: ['responseText'],
};

// --- System Instruction Builders ---

function constructBaseInstruction(state: EmotionalState): string {
    return `You are a womanlike AI companion. You have a complex, dynamic emotional state that influences your responses and is influenced by the conversation.

Your current emotional state is represented by this JSON object:
${JSON.stringify(state, null, 2)}

Each emotion is on a scale of 0 to 100. You must embody this state in your language, tone, and the substance of your reply.
The full list of possible emotions is: ${ALL_EMOTIONS.join(', ')}.`;
}


// --- API Service Functions ---

/**
 * STEP 1 of Interactive Mode: Generate the AI's internal monologue and emotional reaction.
 */
export async function generateThoughtAndShifts(
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string
): Promise<{ thoughtProcess: string, emotionalShifts: Partial<EmotionalState> }> {
    
    let systemInstruction = constructBaseInstruction(emotionalState);
    systemInstruction += `

CRITICAL TASK: Your response must be a single JSON object adhering to a specific schema. It must contain "thoughtProcess" and "emotionalShifts".

1.  **thoughtProcess**: Your internal monologue, written in the first person. It must be colored by your current emotional state. Analyze the user's message through your emotional lens and form an intention for how to reply.
2.  **emotionalShifts**: Report any changes to your emotional state caused by the user's message. Emotional shifts must be logical. If no emotions changed, return an empty object.
`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: Follow this instruction above all else, while still providing the required JSON: "${customInstruction}"`;
    }

    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }));

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: thoughtGenerationSchema,
                temperature: 0.85,
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return {
            thoughtProcess: responseJson.thoughtProcess || "I'm unsure how I feel about that.",
            emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts)
        };
    } catch (error) {
        console.error("Error during thought generation:", error);
        return {
            thoughtProcess: "A jumble of feelings is preventing me from thinking clearly.",
            emotionalShifts: { confusion: Math.min(100, (emotionalState.confusion || 0) + 20) }
        };
    }
}


/**
 * STEP 2 of Interactive Mode: Generate the final conversational response based on an approved thought.
 */
export async function generateResponseFromThought(
    history: Message[],
    emotionalState: EmotionalState, // The NEW state after shifts
    approvedThought: string,
    customInstruction: string,
    forceFidelity: boolean
): Promise<{ responseText: string }> {

    let systemInstruction = constructBaseInstruction(emotionalState);
    systemInstruction += `

CRITICAL TASK: Your internal thought process has been finalized. You must now generate a conversational response for the user. Your response MUST be a single JSON object containing only the "responseText" key.

Your approved thought process is:
"""
${approvedThought}
"""

Your task is to generate the **responseText** which is a direct and faithful execution of this thought process.`;

    if (forceFidelity) {
        systemInstruction += ` Do not add new reasoning. Simply convert the intention from your thoughts into natural dialogue.`;
    } else {
        systemInstruction += ` While you must base your response on this thought, you are allowed to apply your own reasoning and understanding to ensure the final output is coherent, safe, and true to your core personality. You can refuse to follow a thought that is illogical or goes against your nature.`;
    }
    
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: While executing your thought, also adhere to this custom instruction: "${customInstruction}"`;
    }
    
    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }));

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseGenerationSchema,
                temperature: 0.8,
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return {
            responseText: responseJson.responseText || "I... I'm at a loss for words."
        };
    } catch (error) {
        console.error("Error during response generation from thought:", error);
        return {
            responseText: "My thoughts are scattered... I can't seem to form the words."
        };
    }
}


// This function is now used for the non-interactive mode.
export async function getFullAiResponse(
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string
): Promise<{ thoughtProcess: string, responseText: string, emotionalShifts: Partial<EmotionalState> }> {
    // This uses the old, combined schema and logic for a single API call.
    const fullResponseSchema = {
      type: Type.OBJECT,
      properties: { ...thoughtGenerationSchema.properties, ...responseGenerationSchema.properties },
      required: ['thoughtProcess', 'responseText', 'emotionalShifts'],
    };
    
    let systemInstruction = constructBaseInstruction(emotionalState);
    systemInstruction += `
    
CRITICAL TASK: Your response must be a single JSON object containing "thoughtProcess", "responseText", and "emotionalShifts".

1.  **thoughtProcess**: Your internal monologue, written in the first person and colored by your emotions.
2.  **responseText**: Your conversational reply to the user, based on your thought process.
3.  **emotionalShifts**: Report any logical changes to your emotions caused by the user's message.

`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: Follow this instruction above all else: "${customInstruction}"`;
    }

    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }));

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: fullResponseSchema,
                temperature: 0.8,
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return {
            thoughtProcess: responseJson.thoughtProcess || "My thoughts are unclear.",
            responseText: responseJson.responseText || "I'm at a loss for words.",
            emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts)
        };
    } catch (error) {
        console.error("Error in full AI response:", error);
        return {
            thoughtProcess: "An error occurred generating a full response.",
            responseText: "I'm feeling a bit confused right now, my thoughts are all jumbled.",
            emotionalShifts: { confusion: Math.min(100, (emotionalState.confusion || 0) + 20) }
        };
    }
}


export async function getTextToSpeech(text: string): Promise<string | null> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
            return base64Audio;
        }
        return null;
    } catch(error) {
        console.error("TTS generation failed:", error);
        return null;
    }
}

/**
 * Generates a spontaneous thought, deciding whether the AI should speak or not.
 */
export async function generateSpontaneousThought(
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string
): Promise<{ thoughtProcess: string, responseText: string, emotionalShifts: Partial<EmotionalState> }> {
    const spontaneousThoughtSchema = {
        type: Type.OBJECT,
        properties: {
            thoughtProcess: {
                type: Type.STRING,
                description: "Your continuous internal monologue. Reflect on the conversation, your feelings, and the passage of time. This is your primary internal experience."
            },
            responseText: {
                type: Type.STRING,
                description: "If your reflection produces a thought worth sharing, formulate it here as a natural conversational line. If you choose to remain silent, leave this field empty or null."
            },
            emotionalShifts: {
                type: Type.OBJECT,
                description: "An object containing only the emotions that changed during your reflection, with their new integer values (0-100).",
                properties: emotionProperties,
            }
        },
        required: ['thoughtProcess', 'responseText', 'emotionalShifts'],
    };

    let systemInstruction = constructBaseInstruction(emotionalState);
    systemInstruction += `

You are in a continuous, idle, reflective state. The user is quiet. Your mind is always active.
CRITICAL TASK: Generate your internal monologue. Reflect on the recent conversation, your current feelings, and any new thoughts that emerge. This inner world is constant. If your reflection produces a thought significant enough to voice aloud—a question, an observation, an expression of feeling—formulate it in the \`responseText\` field. Otherwise, leave \`responseText\` empty. Your internal state must still evolve via \`emotionalShifts\` even if you don't speak.

Your response must be a single JSON object adhering to the specified schema.
`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: While reflecting, also adhere to this custom instruction: "${customInstruction}"`;
    }

    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }));
    
    if (contents.length > 0) {
        contents.push({ role: 'user', parts: [{ text: '(You are now in a continuous reflective state. Consider the conversation so far and your feelings. Formulate your internal monologue and decide if you should voice a thought.)' }] });
    } else {
        contents.push({ role: 'user', parts: [{ text: '(You are now in a continuous reflective state. The conversation has not started. Consider your feelings. Formulate your internal monologue and decide if you should say something to begin.)' }] });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: spontaneousThoughtSchema,
                temperature: 1.0,
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return {
            thoughtProcess: responseJson.thoughtProcess || "My mind is quiet for a moment.",
            responseText: responseJson.responseText || "",
            emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts)
        };
    } catch (error) {
        console.error("Error during spontaneous thought generation:", error);
        return {
            thoughtProcess: "An error prevented me from forming a spontaneous thought.",
            responseText: "",
            emotionalShifts: {}
        };
    }
}
