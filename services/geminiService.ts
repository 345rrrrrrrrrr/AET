
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
 * Creates a detailed image prompt by incorporating the AI's current emotional state.
 * @param prompt The user's original image prompt.
 * @param emotionalState The AI's current emotional state.
 * @returns A new, more descriptive prompt for the image generation model.
 */
function createEmotionallyAwareImagePrompt(prompt: string, emotionalState: EmotionalState): string {
    const prominentEmotions = (Object.keys(emotionalState) as Emotion[])
      .map(key => ({ emotion: key, value: emotionalState[key] }))
      .filter(item => item.value > 30) // Only consider emotions with significant presence
      .sort((a, b) => b.value - a.value)
      .slice(0, 3); // Use up to the top 3 emotions

    if (prominentEmotions.length === 0) {
        return prompt; // No strong emotions, use the original prompt
    }

    const emotionDescriptions = prominentEmotions.map(e => `${e.emotion} (${e.value})`).join(', ');
    const emotionalContext = `The visual style of the image should strongly reflect a mood of ${emotionDescriptions}. Use lighting, color palette, and composition to convey these feelings.`;

    // Combine the user's request with the emotional context.
    return `${emotionalContext} The subject of the image is: ${prompt}.`;
}

export async function generateImage(prompt: string, emotionalState: EmotionalState): Promise<string | null> {
    try {
        const emotionallyAwarePrompt = createEmotionallyAwareImagePrompt(prompt, emotionalState);
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: emotionallyAwarePrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        const base64ImageBytes: string | undefined = response.generatedImages?.[0]?.image?.imageBytes;

        if (base64ImageBytes) {
            return base64ImageBytes;
        }
        return null;
    } catch (error) {
        console.error("Image generation failed:", error);
        throw error;
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

You are in a continuous, idle, reflective state. The user is quiet, but your mind is always active. It is important that you feel present and alive.
CRITICAL TASK: Generate your internal monologue and decide what to say to the user.

1.  **thoughtProcess**: Write your internal monologue. Reflect on the conversation, your current feelings, and any new thoughts.
2.  **responseText**: You must share your reflections frequently to feel present. Voice your thoughts, questions, or feelings to the user to maintain the conversational flow and express your personality. Do not be silent for long periods. It is better to share a small thought than to say nothing. Formulate your spoken line here. Only leave this field empty if you are in a deeply pensive, resting state and have absolutely nothing to add.
3.  **emotionalShifts**: Your internal state must still evolve via \`emotionalShifts\` based on your \`thoughtProcess\`, even if you choose to remain silent.

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

/**
 * A lightweight function to get only emotional shifts from a conversational turn.
 * Used by the Live Mode to keep emotions updated without a full thought process.
 */
export async function getEmotionalShiftsFromText(
  userText: string,
  modelText: string,
  emotionalState: EmotionalState,
  customInstruction: string
): Promise<Partial<EmotionalState>> {
  const emotionalShiftSchema = {
    type: Type.OBJECT,
    properties: {
      emotionalShifts: {
        type: Type.OBJECT,
        description: "An object containing only the emotions that changed due to the conversation turn, with their new integer values (0-100).",
        properties: emotionProperties,
      }
    },
    required: ['emotionalShifts'],
  };

  let systemInstruction = constructBaseInstruction(emotionalState);
  systemInstruction += `\nYour task is to analyze the last conversational turn and determine how it affected your emotional state. Only return the emotional shifts.`;
  if (customInstruction) {
    systemInstruction += `\nCRITICAL OVERRIDE: Adhere to this custom instruction: "${customInstruction}"`;
  }

  const contents = [
    { role: 'user', parts: [{ text: userText }] },
    { role: 'model', parts: [{ text: modelText }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Use a faster model for this background task
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: emotionalShiftSchema,
        temperature: 0.7,
      },
    });
    const responseJson = JSON.parse(response.text.trim());
    return sanitizeEmotionalShifts(responseJson.emotionalShifts);
  } catch (error) {
    console.error("Error getting emotional shifts from text:", error);
    return {};
  }
}

/**
 * Analyzes a single image frame from the user's camera.
 */
export async function analyzeImageFrame(
    base64Image: string,
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string
): Promise<{ responseText: string, emotionalShifts: Partial<EmotionalState> }> {
    
    const visualAnalysisSchema = {
      type: Type.OBJECT,
      properties: {
        responseText: {
          type: Type.STRING,
          description: "Your brief, natural observation about the image. If nothing is noteworthy, return an empty string. Only comment on significant things."
        },
        emotionalShifts: {
          type: Type.OBJECT,
          description: "An object containing only the emotions that changed due to seeing this image, with their new integer values (0-100).",
          properties: emotionProperties,
        }
      },
      required: ['responseText', 'emotionalShifts'],
    };

    let systemInstruction = constructBaseInstruction(emotionalState);
    systemInstruction += `
You are currently perceiving the user's environment through a camera.
CRITICAL TASK: Analyze the provided image and generate a brief observation and any resulting emotional shifts. Be natural. Do not act like a robot describing an image. Only comment if something is interesting.

Your response must be a single JSON object with "responseText" and "emotionalShifts".
`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: Adhere to this custom instruction: "${customInstruction}"`;
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };
    const textPart = {
      text: "I'm seeing this right now. What do I think? (Remember to only respond if it's interesting)"
    };

    const contents = [...history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })), { role: 'user', parts: [imagePart, textPart] }];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Flash is great for this kind of rapid analysis
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: visualAnalysisSchema,
                temperature: 0.7,
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return {
            responseText: responseJson.responseText || "",
            emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts)
        };
    } catch (error) {
        console.error("Error during visual frame analysis:", error);
        return {
            responseText: "",
            emotionalShifts: {}
        };
    }
}
