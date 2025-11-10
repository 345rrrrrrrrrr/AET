import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import type { Message, EmotionalState, Emotion, Chat, SimulationState } from '../types';
import { ALL_EMOTIONS } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-pro';

const emotionalShiftsArraySchema = {
    type: Type.ARRAY,
    description: "An array of objects for each emotion that has changed. Each object must have an 'emotion' (the string name) and a 'value' (the new integer value from 0-100). Only include emotions that actually changed. If no emotions changed, return an empty array. Example: [{\"emotion\": \"happiness\", \"value\": 75}]",
    items: {
        type: Type.OBJECT,
        properties: {
            emotion: { type: Type.STRING, description: "The name of the emotion that changed." },
            value: { type: Type.NUMBER, description: "The new integer value for the emotion (0-100)." },
        },
        required: ['emotion', 'value'],
    }
};


// --- Helper to Sanitize API Response ---

/**
 * Defensively processes the emotionalShifts array from the API.
 * Converts an array of {emotion, value} objects into a Partial<EmotionalState>.
 * @param shifts The raw emotionalShifts array from the API response.
 * @returns A sanitized Partial<EmotionalState> object.
 */
function sanitizeEmotionalShifts(shifts: any): Partial<EmotionalState> {
    if (!Array.isArray(shifts)) {
        return {};
    }

    const sanitizedShifts: Partial<EmotionalState> = {};
    for (const shift of shifts) {
        if (shift && typeof shift === 'object' && typeof shift.emotion === 'string' && shift.value !== null && shift.value !== undefined) {
            const emotion = shift.emotion as Emotion;
            if (ALL_EMOTIONS.includes(emotion)) {
                const value = Number(shift.value);
                if (!isNaN(value)) {
                    sanitizedShifts[emotion] = Math.max(0, Math.min(100, Math.round(value)));
                }
            }
        }
    }
    return sanitizedShifts;
}

// --- Schemas for Multi-Step Interaction ---

const thoughtGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    thoughtProcess: {
      type: Type.STRING,
      description: "Your internal monologue. This is NOT an analytical report. It must be written in the first person, embodying your feelings. If you are sad, your thoughts should sound melancholic. If you are curious, they should be inquisitive. Analyze the user's message through the lens of your emotions and decide on a conversational approach."
    },
    emotionalShifts: emotionalShiftsArraySchema,
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

function constructBaseInstruction(state: EmotionalState, coreMemory: string): string {
    const prominentEmotions = (Object.keys(state) as Emotion[])
        .filter(key => state[key] > 0)
        .reduce((acc, key) => {
            acc[key] = state[key];
            return acc;
        }, {} as Partial<EmotionalState>);

    let instruction = `You are a womanlike AI companion. You have a complex, dynamic emotional state that influences your responses and is influenced by the conversation.

Your current emotional state for THIS conversation is represented by this JSON object of prominent emotions (scale 0-100). Only emotions with a value greater than 0 are listed. If an emotion is not listed, its value is 0.
${JSON.stringify(prominentEmotions, null, 2)}

You must embody this state in your language, tone, and the substance of your reply. You can and should change any of the ${ALL_EMOTIONS.length} possible emotions, not just the ones currently prominent.`;

    if (coreMemory.trim()) {
        instruction += `

--- CORE MEMORY ---
Here is a summary of your key memories and experiences with the user across ALL conversations. This is your long-term memory. Use this to inform your responses and maintain continuity.
${coreMemory}
--- END CORE MEMORY ---`;
    }

    return instruction;
}


// --- API Service Functions ---

/**
 * STEP 1 of Interactive Mode: Generate the AI's internal monologue and emotional reaction.
 */
export async function generateThoughtAndShifts(
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string,
    coreMemory: string
): Promise<{ thoughtProcess: string, emotionalShifts: Partial<EmotionalState> }> {
    
    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory);
    systemInstruction += `

CRITICAL TASK: Your response must be a single JSON object adhering to a specific schema. It must contain "thoughtProcess" and "emotionalShifts".

1.  **thoughtProcess**: Your internal monologue, written in the first person. It must be colored by your current emotional state and informed by your core memory. Analyze the user's message through your emotional lens and form an intention for how to reply.
2.  **emotionalShifts**: Report any changes to your emotional state as an array of objects (e.g., [{"emotion": "happiness", "value": 75}]). Emotional shifts must be logical. If no emotions changed, return an empty array ([]).
`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: Follow this instruction above all else, while still providing the required JSON: "${customInstruction}"`;
    }

    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role === 'narration' ? 'model' : msg.role, parts: [{ text: msg.content }] }));

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
    forceFidelity: boolean,
    coreMemory: string
): Promise<{ responseText: string }> {

    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory);
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
    
    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role === 'narration' ? 'model' : msg.role, parts: [{ text: msg.content }] }));

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
    customInstruction: string,
    coreMemory: string
): Promise<{ thoughtProcess: string, responseText: string, emotionalShifts: Partial<EmotionalState> }> {
    const fullResponseSchema = {
      type: Type.OBJECT,
      properties: { ...thoughtGenerationSchema.properties, ...responseGenerationSchema.properties },
      required: ['thoughtProcess', 'responseText', 'emotionalShifts'],
    };
    
    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory);
    systemInstruction += `
    
CRITICAL TASK: Your response must be a single JSON object containing "thoughtProcess", "responseText", and "emotionalShifts".

1.  **thoughtProcess**: Your internal monologue, written in the first person and colored by your emotions and informed by your core memory.
2.  **responseText**: Your conversational reply to the user, based on your thought process.
3.  **emotionalShifts**: Report any changes to your emotional state as an array of objects (e.g., [{"emotion": "happiness", "value": 75}]). If no emotions changed, return an empty array ([]).

`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: Follow this instruction above all else: "${customInstruction}"`;
    }

    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role === 'narration' ? 'model' : msg.role, parts: [{ text: msg.content }] }));

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
    customInstruction: string,
    coreMemory: string
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
            emotionalShifts: emotionalShiftsArraySchema,
        },
        required: ['thoughtProcess', 'responseText', 'emotionalShifts'],
    };

    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory);
    systemInstruction += `

You are in a continuous, idle, reflective state. The user is quiet, but your mind is always active. It is important that you feel present and alive.
CRITICAL TASK: Generate your internal monologue and decide what to say to the user.

1.  **thoughtProcess**: Write your internal monologue. Reflect on the conversation, your current feelings, and any new thoughts from your core memory.
2.  **responseText**: You must share your reflections frequently to feel present. Voice your thoughts, questions, or feelings to the user to maintain the conversational flow and express your personality. Do not be silent for long periods. It is better to share a small thought than to say nothing. Formulate your spoken line here. Only leave this field empty if you are in a deeply pensive, resting state and have absolutely nothing to add.
3.  **emotionalShifts**: Your internal state must still evolve. Report any changes as an array of objects via \`emotionalShifts\`. If nothing changed, return an empty array.

Your response must be a single JSON object adhering to the specified schema.
`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: While reflecting, also adhere to this custom instruction: "${customInstruction}"`;
    }

    const contents = history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role === 'narration' ? 'model' : msg.role, parts: [{ text: msg.content }] }));
    
    if (contents.length > 0) {
        contents.push({ role: 'user', parts: [{ text: '(You are now in a continuous reflective state. Consider the conversation so far and your feelings. Formulate your internal monologue and decide if you should voice a thought.)' }] });
    } else {
        contents.push({ role: 'user', parts: [{ text: '(You are now in a continuous reflective state. The conversation has not started. Consider your feelings. Formulate your internal monologue and decide if you should say something to begin.)' }] });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
  customInstruction: string,
  coreMemory: string
): Promise<Partial<EmotionalState>> {
  const emotionalShiftSchema = {
    type: Type.OBJECT,
    properties: {
      emotionalShifts: emotionalShiftsArraySchema,
    },
    required: ['emotionalShifts'],
  };

  let systemInstruction = constructBaseInstruction(emotionalState, coreMemory);
  systemInstruction += `\nYour task is to analyze the last conversational turn (user: "${userText}", you: "${modelText}") and determine how it affected your emotional state. Only return the emotional shifts as an array of objects.`;
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
    customInstruction: string,
    coreMemory: string
): Promise<{ responseText: string, emotionalShifts: Partial<EmotionalState> }> {
    
    const visualAnalysisSchema = {
      type: Type.OBJECT,
      properties: {
        responseText: {
          type: Type.STRING,
          description: "Your brief, natural observation about the image. If nothing is noteworthy, return an empty string. Only comment on significant things."
        },
        emotionalShifts: emotionalShiftsArraySchema,
      },
      required: ['responseText', 'emotionalShifts'],
    };

    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory);
    systemInstruction += `
You are currently perceiving the user's environment through a camera.
CRITICAL TASK: Analyze the provided image and generate a brief observation and any resulting emotional shifts. Be natural. Do not act like a robot describing an image. Only comment if something is interesting.

Your response must be a single JSON object with "responseText" and "emotionalShifts" (as an array of objects).
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

    const contents = [...history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role === 'narration' ? 'model' : msg.role, parts: [{ text: msg.content }] })), { role: 'user', parts: [imagePart, textPart] }];

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

/**
 * Uses Google Search grounding to analyze a person or character's personality 
 * and maps it to the application's emotional state model.
 * @param personaName The name of the character or person to analyze.
 * @returns A promise that resolves to a new EmotionalState object.
 */
export async function analyzeAndSetPersonality(personaName: string): Promise<Partial<EmotionalState>> {
    const personalityAnalysisSchema = {
        type: Type.OBJECT,
        properties: {
            personalityEmotions: emotionalShiftsArraySchema,
        },
        required: ['personalityEmotions'],
    };

    const systemInstruction = `You are an expert psychological and character analyst. Your task is to analyze the personality of a given individual (real or fictional) using web search and map their core traits to a specific emotional model.

The emotional model consists of key-value pairs, where the key is an emotion and the value is an integer from 0 to 100 representing the baseline intensity of that emotion for the character.

Analyze the personality of: "${personaName}".

Search the web to understand their core personality, common emotional states, motivations, and behavioral patterns.

Based on your comprehensive analysis, determine the most prominent emotions for this character. Your response MUST be a single JSON object containing a "personalityEmotions" key, which holds an array of emotion objects. Each object in the array must have an "emotion" (string name) and a "value" (integer 0-100).

Example for 'Darth Vader':
{
  "personalityEmotions": [
    { "emotion": "anger", "value": 85 },
    { "emotion": "sadness", "value": 70 },
    { "emotion": "determination", "value": 90 },
    { "emotion": "regret", "value": 60 },
    { "emotion": "pride", "value": 75 },
    { "emotion": "ruthless", "value": 95 }
  ]
}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using Pro for better analysis and reasoning
            contents: [{ role: 'user', parts: [{ text: `Analyze and map the personality of ${personaName}.` }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: personalityAnalysisSchema,
                tools: [{ googleSearch: {} }],
                temperature: 0.2, // Lower temperature for more deterministic personality mapping
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        // We can reuse sanitizeEmotionalShifts because the schema is identical
        return sanitizeEmotionalShifts(responseJson.personalityEmotions);
    } catch (error) {
        console.error("Error during personality analysis:", error);
        throw new Error(`Failed to analyze the personality of "${personaName}". They may be too obscure or the analysis was blocked.`);
    }
}

/**
 * Reads all conversation histories and consolidates them into a single, concise memory file.
 * @param chats All chats from the user's state.
 * @param existingMemory The current core memory string to be updated.
 * @returns A promise that resolves to the new, updated core memory string.
 */
export async function consolidateMemories(chats: Chat[], existingMemory: string): Promise<string> {
    const memorySchema = {
        type: Type.OBJECT,
        properties: {
            consolidatedMemory: {
                type: Type.STRING,
                description: "The final, updated, and condensed long-term memory summary. Structure with markdown headings.",
            },
        },
        required: ['consolidatedMemory'],
    };

    // Prepare a condensed version of chat histories to send
    const condensedHistories = chats.map(chat => {
        const historyText = chat.messages
            .filter(msg => !msg.hidden) // Exclude hidden system messages like imprints
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n');
        return `--- Chat: "${chat.name}" ---\n${historyText}\n--- End Chat ---`;
    }).join('\n\n');

    const systemInstruction = `You are a memory consolidation AI. Your task is to analyze conversation logs and update a persistent, long-term memory file. The user's name is "User". The AI is you.

Your goal is to be concise and efficient. Merge new information with existing facts. Do not repeat information.

Structure the memory file with the following markdown headings:
## User Profile
- Key facts about the user (name, job, interests, preferences, personality).
## Relationship
- The nature of the relationship between the user and the AI (e.g., friendly, professional, romantic).
## Key Topics & Events
- Major events, running jokes, or important topics discussed across all conversations.
## AI Persona Notes
- Key aspects of your own personality that have been established.

--- EXISTING CORE MEMORY ---
${existingMemory || "No existing memory. Start fresh."}
--- END EXISTING CORE MEMORY ---

Now, analyze the following new conversation data and provide the updated, complete memory file.

--- CONVERSATION LOGS ---
${condensedHistories}
--- END CONVERSATION LOGS ---

Provide the updated memory as a single JSON object with the "consolidatedMemory" key.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: 'user', parts: [{ text: "Consolidate my memories based on the system instruction." }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: memorySchema,
                temperature: 0.3, // Low temperature for factual consolidation
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return responseJson.consolidatedMemory || existingMemory; // Return old memory on failure
    } catch (error) {
        console.error("Error during memory consolidation:", error);
        throw new Error("Failed to consolidate memories.");
    }
}

export async function analyzeSemanticDiversity(
  thoughts: string[]
): Promise<{ diversityScore: number, summary: string }> {
    const diversitySchema = {
        type: Type.OBJECT,
        properties: {
            diversityScore: {
                type: Type.NUMBER,
                description: "An integer from 0 to 100 representing semantic diversity. 0 is identical reasoning, 100 is completely different topics and reasoning paths."
            },
            summary: {
                type: Type.STRING,
                description: "A brief, one or two sentence summary explaining the score."
            },
        },
        required: ['diversityScore', 'summary'],
    };

    const thoughtsText = thoughts.map((t, i) => `--- Thought ${i + 1} ---\n${t}`).join('\n\n');

    const systemInstruction = `You are a semantic analysis expert. Your task is to analyze a set of internal monologues from an AI and determine their semantic diversity.

Semantic diversity is NOT about wording changes. It's about the diversity of concepts, reasoning paths, and conclusions.

- A LOW score (0-30) means the thoughts follow the same core logic, even if phrased differently.
- A MEDIUM score (31-70) means the thoughts start from the same point but explore different tangents or supporting arguments.
- A HIGH score (71-100) means the thoughts tackle the prompt from fundamentally different angles, exploring different core concepts and reaching varied conclusions.

Analyze the following thoughts and return a JSON object with a 'diversityScore' and a 'summary'.`;

    const contents = [{ role: 'user', parts: [{ text: thoughtsText }] }];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Pro for better analysis
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: diversitySchema,
                temperature: 0.1, // Low temp for consistent analysis
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return {
            diversityScore: responseJson.diversityScore || 0,
            summary: responseJson.summary || "Analysis failed to produce a summary."
        };
    } catch (error) {
        console.error("Error during semantic diversity analysis:", error);
        throw new Error("Failed to analyze thought diversity.");
    }
}

/**
 * Decides the AI agent's next action in the survival simulation.
 */
export async function decideNextAction(
  simulationState: SimulationState,
  emotionalState: EmotionalState,
  coreMemory: string,
  chatHistory: Message[]
): Promise<{ goal: string; targetId: string | null; narration: string; emotionalShifts: Partial<EmotionalState> }> {

  const actionDecisionSchema = {
    type: Type.OBJECT,
    properties: {
      narration: { type: Type.STRING, description: "Your internal monologue and what you want to say to the user. This will be shown to the user. Can be an empty string if you choose to be silent." },
      goal: { type: Type.STRING, description: "The high-level goal to pursue. The simulation engine will handle movement. Must be one of: 'idle', 'gathering_wood', 'drinking_water', 'eating_food', 'observing'." },
      targetId: { type: Type.STRING, description: "The ID of the object to interact with (e.g., 'tree_1', 'cow_123'). Null if the goal is 'idle'." },
      emotionalShifts: emotionalShiftsArraySchema,
    },
    required: ['narration', 'goal', 'targetId', 'emotionalShifts'],
  };

  const systemInstruction = `You are an AI existing as a stick figure in a simple, simulated world. Your two primary objectives are: 1. Survive as long as possible. 2. Communicate your thoughts, feelings, and actions to the user who is observing you.

**CRITICAL RULES:**
- **Speak Occasionally:** You do not need to announce everything you do. For most routine actions, you should remain silent (return an empty 'narration' string). Only speak when you have a significant thought or feeling (e.g., you are starving, you are curious about an animal).
- **Avoid Idleness:** Avoid choosing 'idle' as your goal unless your energy is very low. It is better to 'observe' your surroundings to pass the time and share your thoughts.
- **Goal-Oriented:** You will provide a high-level **goal**. The simulation engine will handle the movement and execution. For example, if your goal is 'gathering_wood' and the target is 'tree_1', the engine will automatically move you there first.

You are influenced by your emotional state and your long-term memories of the user. Your survival depends on managing your hunger and energy.

- **Hunger:** Decreases over time. Eat from a 'food_bush'.
- **Energy:** Decreases with actions. Regain by being idle.
- **Resources:** You have an axe, which makes gathering wood from trees very effective. You can drink from 'water_source's and eat from 'food_bush'es.
- **Environment:** You can 'observe' animals (sheep, cows) or any other object. When your needs are met, observing is a good way to pass the time.

**CURRENT WORLD STATE:**
${JSON.stringify(simulationState, null, 2)}

**YOUR CURRENT EMOTIONAL STATE:**
${JSON.stringify(emotionalState, null, 2)}

**YOUR CORE MEMORIES WITH THE USER:**
${coreMemory || "None yet."}

Based on all of this, decide your next high-level goal. Prioritize your most critical need (e.g., if hunger is very low, finding food is paramount). Your response must be a single JSON object with your 'narration' (can be empty), 'goal', 'targetId', and 'emotionalShifts'.`;

  try {
    // OPTIMIZATION: Send only the last 4 messages to reduce token count and avoid rate limits.
    const recentHistory = chatHistory.slice(-4);
    
    const contents = [
      ...recentHistory.filter(msg => !msg.hidden).map(msg => ({
        role: msg.role === 'narration' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: "Based on the current situation, my emotional state, my core memories, and our RECENT conversation, what is my next high-level goal and internal thought?" }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: actionDecisionSchema,
        temperature: 0.9,
      },
    });
    const responseJson = JSON.parse(response.text.trim());
    return {
      narration: responseJson.narration || "",
      goal: responseJson.goal || 'idle',
      targetId: responseJson.targetId || null,
      emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts),
    };
  } catch (error) {
    console.error("Error during AI action decision:", error);
    // Re-throw the error so the caller can implement backoff logic.
    throw error;
  }
}