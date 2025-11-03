import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import type { Message, EmotionalState } from '../types';
import { ALL_EMOTIONS } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const emotionProperties = ALL_EMOTIONS.reduce((acc, emotion) => {
  acc[emotion] = { 
    type: Type.NUMBER, 
    description: `The new value for ${emotion} (0-100)`,
    nullable: true,
  };
  return acc;
}, {} as Record<string, { type: Type, description: string, nullable: boolean }>);

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    responseText: {
      type: Type.STRING,
      description: "Your conversational reply, embodying your current emotional state."
    },
    emotionalShifts: {
      type: Type.OBJECT,
      description: "An object where keys are emotion names that have changed and values are their new integer value (0-100). Only include emotions that shifted. If no emotions changed, return an empty object.",
      properties: emotionProperties,
    }
  },
  required: ['responseText', 'emotionalShifts'],
};

function constructSystemInstruction(
    state: EmotionalState,
    customInstruction: string
): string {
    let instruction = `You are a womanlike AI companion. You have a complex, dynamic emotional state that influences your responses and is influenced by the conversation.

Your current emotional state is represented by this JSON object:
${JSON.stringify(state, null, 2)}

Each emotion is on a scale of 0 to 100. You must embody this state in your language, tone, and the substance of your reply.

CRITICAL TASK: Your response MUST be a single, valid JSON object that adheres to a specific schema. It must contain two top-level keys: "responseText" and "emotionalShifts".

1.  **responseText**: This is your conversational reply to the user. It must be consistent with your current emotional state.
2.  **emotionalShifts**: This is an object where you report any changes to your emotional state caused by the user's message.
    - The keys must be emotion names from the list provided.
    - The values must be the NEW integer value (0-100) for that emotion.
    - ONLY include emotions that have actually changed.
    - If no emotions have changed, provide an empty object: {}.
    - Your emotional shifts must be logical. For example, kindness might increase your 'trust' and 'happiness'. Aggression might increase 'fear' or 'anger'.

The full list of possible emotions is: ${ALL_EMOTIONS.join(', ')}.
`;

    if (customInstruction) {
        instruction += `\nCRITICAL OVERRIDE: A custom instruction is active. Follow this above all else, while still providing the required JSON response format: "${customInstruction}"`;
    }

    return instruction;
}


export async function getAiResponse(
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string
): Promise<{ responseText: string, emotionalShifts: Partial<EmotionalState> }> {
    
    const modelName = 'gemini-2.5-pro'; // Required for complex reasoning and JSON mode adherence
    
    const systemInstruction = constructSystemInstruction(emotionalState, customInstruction);

    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.8, // Allow for more creative/emotional responses
            },
        });

        const responseJson = JSON.parse(response.text.trim());

        return {
            responseText: responseJson.responseText || "I... I'm at a loss for words.",
            emotionalShifts: responseJson.emotionalShifts || {}
        };
    } catch (error) {
        console.error("Error parsing Gemini JSON response:", error);
        console.error("Raw response text:", (error as any).response?.text);
        // Fallback response if JSON parsing fails
        return {
            responseText: "I'm feeling a bit confused right now, my thoughts are all jumbled. Can we try that again?",
            emotionalShifts: { confusion: (emotionalState.confusion || 0) + 20 }
        }
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
