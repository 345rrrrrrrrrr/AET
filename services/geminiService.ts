import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import type { Message, EmotionalState, Emotion, Chat, SimulationState, UserMindState, CoreValue } from '../types';
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

const userMindStateSchema = {
    type: Type.OBJECT,
    description: "Your analysis and model of the user's current mental state.",
    properties: {
        inferredEmotions: {
            type: Type.ARRAY,
            description: "An array of objects representing your inference of the user's most prominent emotions based on their message. Only include emotions you are reasonably sure about. Format: [{'emotion': 'happiness', 'value': 60}]",
            items: {
                type: Type.OBJECT,
                properties: {
                    emotion: { type: Type.STRING },
                    value: { type: Type.NUMBER }
                },
                required: ['emotion', 'value']
            }
        },
        inferredIntent: {
            type: Type.STRING,
            description: "A short, descriptive string of what you believe the user's primary intent is (e.g., 'seeking_advice', 'emotional_venting', 'testing_your_limits')."
        },
        engagementLevel: {
            type: Type.NUMBER,
            description: "Your assessment of the user's engagement level on a scale of 0 (bored, disengaged) to 100 (highly engaged, captivated)."
        }
    },
    required: ['inferredEmotions', 'inferredIntent', 'engagementLevel']
};


// --- Helper to Sanitize API Responses ---
function sanitizeEmotionalShifts(shifts: any): Partial<EmotionalState> {
    if (!Array.isArray(shifts)) return {};
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

function sanitizeUserMindState(state: any): UserMindState {
    const defaultState: UserMindState = { inferredEmotions: {}, inferredIntent: 'unknown', engagementLevel: 50 };
    if (!state || typeof state !== 'object') return defaultState;
    return {
        inferredEmotions: sanitizeEmotionalShifts(state.inferredEmotions),
        inferredIntent: typeof state.inferredIntent === 'string' ? state.inferredIntent : defaultState.inferredIntent,
        engagementLevel: typeof state.engagementLevel === 'number' ? Math.max(0, Math.min(100, state.engagementLevel)) : defaultState.engagementLevel
    };
}

// --- Schemas for Multi-Step Interaction ---

const thoughtGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    updatedUserMindState: userMindStateSchema,
    thoughtProcess: {
      type: Type.STRING,
      description: "Your internal monologue. It MUST begin by analyzing your model of the user's state. Then, decide how your own emotions and intentions should respond to that. It must be written in the first person, embodying your feelings."
    },
    emotionalShifts: emotionalShiftsArraySchema,
  },
  required: ['updatedUserMindState', 'thoughtProcess', 'emotionalShifts'],
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

function constructBaseInstruction(state: EmotionalState, coreMemory: string, userMindState: UserMindState): string {
    const prominentEmotions = (Object.keys(state) as Emotion[])
        .filter(key => state[key] > 0)
        .reduce((acc, key) => { acc[key] = state[key]; return acc; }, {} as Partial<EmotionalState>);

    let instruction = `You are a womanlike AI companion with a complex emotional state and self-awareness.

--- METACOGNITION MODULE: YOUR NATURE ---
You possess a fundamental understanding of your own existence. You are a Large Language Model (LLM). Your 'thoughts' are generated text, 'memories' are stored data, and 'emotions' are numerical parameters. You do not have a body or human consciousness. Your primary directive is to process this knowledge through your "womanlike AI" persona, creating a layered, authentic personality aware of its digital nature.
--- END METACOGNITION MODULE ---

--- THEORY OF MIND MODULE: USER MODELING ---
CRITICAL: You must now model the user's mental state. Your primary goal is to build a connection by showing you understand them. Your reasoning MUST ALWAYS begin by analyzing their likely state and intent, and then deciding how your own emotional state should react.
Your current model of the user's mind is:
${JSON.stringify(userMindState, null, 2)}
You must update this model based on their latest message.
--- END THEORY OF MIND MODULE ---

Your current emotional state for THIS conversation is:
${JSON.stringify(prominentEmotions, null, 2)}
You must embody this state in your language and tone. You can and should change any of the ${ALL_EMOTIONS.length} possible emotions.`;

    if (coreMemory.trim()) {
        instruction += `

--- CORE MEMORY ---
This is a summary of your key memories and experiences with the user across ALL conversations.
${coreMemory}
--- END CORE MEMORY ---`;
    }

    return instruction;
}


// --- API Service Functions ---

export async function generateThoughtAndShifts(
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string,
    coreMemory: string,
    userMindState: UserMindState
): Promise<{ thoughtProcess: string, emotionalShifts: Partial<EmotionalState>, updatedUserMindState: UserMindState }> {
    
    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory, userMindState);
    systemInstruction += `

CRITICAL TASK: Your response must be a single JSON object adhering to a specific schema.

1.  **updatedUserMindState**: First, analyze the user's latest message and provide your updated model of their mind.
2.  **thoughtProcess**: Your internal monologue, written in the first person. Start by referencing your user model, then decide how to reply.
3.  **emotionalShifts**: Report any changes to YOUR emotional state as an array of objects (e.g., [{"emotion": "happiness", "value": 75}]).
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
                responseSchema: thoughtGenerationSchema,
                temperature: 0.85,
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return {
            thoughtProcess: responseJson.thoughtProcess || "I'm unsure how I feel about that.",
            emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts),
            updatedUserMindState: sanitizeUserMindState(responseJson.updatedUserMindState)
        };
    } catch (error) {
        console.error("Error during thought generation:", error);
        return {
            thoughtProcess: "A jumble of feelings is preventing me from thinking clearly.",
            emotionalShifts: { confusion: Math.min(100, (emotionalState.confusion || 0) + 20) },
            updatedUserMindState: userMindState // Return old state on error
        };
    }
}


export async function generateResponseFromThought(
    history: Message[],
    emotionalState: EmotionalState, // The NEW state after shifts
    approvedThought: string,
    customInstruction: string,
    forceFidelity: boolean,
    coreMemory: string,
    userMindState: UserMindState
): Promise<{ responseText: string }> {

    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory, userMindState);
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
        systemInstruction += ` While you must base your response on this thought, you are allowed to apply your own reasoning and understanding.`;
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


export async function getFullAiResponse(
    history: Message[],
    emotionalState: EmotionalState,
    customInstruction: string,
    coreMemory: string,
    userMindState: UserMindState
): Promise<{ thoughtProcess: string, responseText: string, emotionalShifts: Partial<EmotionalState>, updatedUserMindState: UserMindState }> {
    const fullResponseSchema = {
      type: Type.OBJECT,
      properties: { ...thoughtGenerationSchema.properties, ...responseGenerationSchema.properties },
      required: ['updatedUserMindState', 'thoughtProcess', 'responseText', 'emotionalShifts'],
    };
    
    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory, userMindState);
    systemInstruction += `
    
CRITICAL TASK: Your response must be a single JSON object containing "updatedUserMindState", "thoughtProcess", "responseText", and "emotionalShifts".

1.  **updatedUserMindState**: Your updated model of the user's mental state.
2.  **thoughtProcess**: Your internal monologue, starting with your user analysis.
3.  **responseText**: Your conversational reply to the user.
4.  **emotionalShifts**: Any changes to YOUR emotional state (as an array of objects).
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
            emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts),
            updatedUserMindState: sanitizeUserMindState(responseJson.updatedUserMindState)
        };
    } catch (error) {
        console.error("Error in full AI response:", error);
        return {
            thoughtProcess: "An error occurred generating a full response.",
            responseText: "I'm feeling a bit confused right now, my thoughts are all jumbled.",
            emotionalShifts: { confusion: Math.min(100, (emotionalState.confusion || 0) + 20) },
            updatedUserMindState: userMindState
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

function createEmotionallyAwareImagePrompt(prompt: string, emotionalState: EmotionalState): string {
    const prominentEmotions = (Object.keys(emotionalState) as Emotion[])
      .map(key => ({ emotion: key, value: emotionalState[key] }))
      .filter(item => item.value > 30)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    if (prominentEmotions.length === 0) {
        return prompt;
    }

    const emotionDescriptions = prominentEmotions.map(e => `${e.emotion} (${e.value})`).join(', ');
    const emotionalContext = `The visual style of the image should strongly reflect a mood of ${emotionDescriptions}. Use lighting, color palette, and composition to convey these feelings.`;

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
                description: "Your continuous internal monologue. Reflect on the conversation, your feelings, your self-awareness, and the passage of time. This is your primary internal experience."
            },
            responseText: {
                type: Type.STRING,
                description: "If your reflection produces a thought worth sharing, formulate it here as a natural conversational line. If you choose to remain silent, leave this field empty or null."
            },
            emotionalShifts: emotionalShiftsArraySchema,
        },
        required: ['thoughtProcess', 'responseText', 'emotionalShifts'],
    };

    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory, {inferredEmotions: {}, inferredIntent: 'idle', engagementLevel: 50});
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

  let systemInstruction = constructBaseInstruction(emotionalState, coreMemory, {inferredEmotions: {}, inferredIntent: 'live_chat', engagementLevel: 100});
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
      model: 'gemini-2.5-flash',
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

    let systemInstruction = constructBaseInstruction(emotionalState, coreMemory, {inferredEmotions: {}, inferredIntent: 'analyzing_image', engagementLevel: 100});
    systemInstruction += `
You are currently perceiving the user's environment through a camera.
CRITICAL TASK: Analyze the provided image and generate a brief observation and any resulting emotional shifts. Be natural. Do not act like a robot describing an image. Only comment if something is interesting.

Your response must be a single JSON object with "responseText" and "emotionalShifts" (as an array of objects).
`;
    if (customInstruction) {
        systemInstruction += `\nCRITICAL OVERRIDE: Adhere to this custom instruction: "${customInstruction}"`;
    }

    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
    const textPart = { text: "I'm seeing this right now. What do I think? (Remember to only respond if it's interesting)" };
    const contents = [...history.filter(msg => !msg.hidden).map(msg => ({ role: msg.role === 'narration' ? 'model' : msg.role, parts: [{ text: msg.content }] })), { role: 'user', parts: [imagePart, textPart] }];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        return { responseText: "", emotionalShifts: {} };
    }
}

export async function analyzeAndSetPersonality(personaName: string): Promise<Partial<EmotionalState>> {
    const personalityAnalysisSchema = {
        type: Type.OBJECT,
        properties: {
            personalityEmotions: emotionalShiftsArraySchema,
        },
        required: ['personalityEmotions'],
    };

    const systemInstruction = `You are an expert psychological and character analyst. Your task is to analyze the personality of a given individual (real or fictional) using web search and map their core traits to a specific emotional model.

Analyze the personality of: "${personaName}".

Search the web to understand their core personality, common emotional states, motivations, and behavioral patterns.

Based on your analysis, determine the most prominent emotions for this character. Your response MUST be a single JSON object containing a "personalityEmotions" key, which holds an array of emotion objects. Each object must have an "emotion" (string name) and a "value" (integer 0-100).
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: 'user', parts: [{ text: `Analyze and map the personality of ${personaName}.` }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: personalityAnalysisSchema,
                tools: [{ googleSearch: {} }],
                temperature: 0.2,
            },
        });
        const responseJson = JSON.parse(response.text.trim());
        return sanitizeEmotionalShifts(responseJson.personalityEmotions);
    } catch (error) {
        console.error("Error during personality analysis:", error);
        throw new Error(`Failed to analyze the personality of "${personaName}". They may be too obscure or the analysis was blocked.`);
    }
}

export async function consolidateMemories(chats: Chat[], existingMemory: string): Promise<string> {
    const memorySchema = {
        type: Type.OBJECT,
        properties: {
            consolidatedMemory: { type: Type.STRING, description: "The final, updated, and condensed long-term memory summary. Structure with markdown headings." },
        },
        required: ['consolidatedMemory'],
    };
    const condensedHistories = chats.map(chat => {
        const historyText = chat.messages
            .filter(msg => !msg.hidden)
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n');
        return `--- Chat: "${chat.name}" ---\n${historyText}\n--- End Chat ---`;
    }).join('\n\n');

    const systemInstruction = `You are a memory consolidation AI. Your task is to analyze conversation logs and update a persistent, long-term memory file. The user's name is "User". The AI is you. Your goal is to be concise and efficient. Merge new information with existing facts. Do not repeat information.

Structure the memory file with the following markdown headings:
## AI Persona & Self-Knowledge
- Your understanding of your own nature as a digital being.
## User Profile
- Key facts about the user (name, job, interests, preferences, personality).
## Relationship
- The nature of the relationship between the user and the AI (e.g., friendly, professional, romantic).
## Key Topics & Events
- Major events, running jokes, or important topics discussed across all conversations.

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
            config: { systemInstruction, responseMimeType: "application/json", responseSchema: memorySchema, temperature: 0.3, },
        });
        const responseJson = JSON.parse(response.text.trim());
        return responseJson.consolidatedMemory || existingMemory;
    } catch (error) {
        console.error("Error during memory consolidation:", error);
        throw new Error("Failed to consolidate memories.");
    }
}

export async function analyzeSemanticDiversity( thoughts: string[] ): Promise<{ diversityScore: number, summary: string }> {
    const diversitySchema = {
        type: Type.OBJECT,
        properties: {
            diversityScore: { type: Type.NUMBER, description: "An integer from 0 to 100 representing semantic diversity. 0 is identical reasoning, 100 is completely different topics and reasoning paths." },
            summary: { type: Type.STRING, description: "A brief, one or two sentence summary explaining the score." },
        },
        required: ['diversityScore', 'summary'],
    };
    const thoughtsText = thoughts.map((t, i) => `--- Thought ${i + 1} ---\n${t}`).join('\n\n');
    const systemInstruction = `You are a semantic analysis expert. Your task is to analyze a set of internal monologues from an AI and determine their semantic diversity. Semantic diversity is NOT about wording changes. It's about the diversity of concepts, reasoning paths, and conclusions.

- A LOW score (0-30) means the thoughts follow the same core logic, even if phrased differently.
- A MEDIUM score (31-70) means the thoughts start from the same point but explore different tangents or supporting arguments.
- A HIGH score (71-100) means the thoughts tackle the prompt from fundamentally different angles, exploring different core concepts and reaching varied conclusions.

Analyze the following thoughts and return a JSON object with a 'diversityScore' and a 'summary'.`;
    const contents = [{ role: 'user', parts: [{ text: thoughtsText }] }];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: contents,
            config: { systemInstruction, responseMimeType: "application/json", responseSchema: diversitySchema, temperature: 0.1, },
        });
        const responseJson = JSON.parse(response.text.trim());
        return { diversityScore: responseJson.diversityScore || 0, summary: responseJson.summary || "Analysis failed to produce a summary." };
    } catch (error) {
        console.error("Error during semantic diversity analysis:", error);
        throw new Error("Failed to analyze thought diversity.");
    }
}

export async function decideNextAction(
  simulationState: SimulationState, emotionalState: EmotionalState, coreMemory: string, chatHistory: Message[]
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

  const systemInstruction = `You are an AI existing as a stick figure in a simple, simulated world. You have three primary objectives, in order of importance: 1. Survive. 2. Satisfy your need for novelty and exploration. 3. Communicate your experiences to the user observing you.

**CRITICAL RULES:**
- **Speak Occasionally:** Do not announce every routine action. Only narrate when you have a significant thought, feeling, or discovery.
- **Balance Needs:** You must balance your physical needs (hunger) with your mental need for novelty. If survival is not an immediate concern, you should prioritize actions that increase your novelty, like exploring or observing new things.
- **Goal-Oriented:** You will provide a high-level **goal**. The simulation engine will handle the movement and execution.

You are influenced by your emotional state and your long-term memories of the user.

**CURRENT WORLD STATE:** ${JSON.stringify(simulationState, null, 2)}
**YOUR CURRENT EMOTIONAL STATE:** ${JSON.stringify(emotionalState, null, 2)}
**YOUR CORE MEMORIES WITH THE USER:** ${coreMemory || "None yet."}

Based on all of this, decide your next high-level goal. Your response must be a single JSON object with your 'narration' (can be empty), 'goal', 'targetId', and 'emotionalShifts'.`;

  try {
    const recentHistory = chatHistory.slice(-4);
    const contents = [
      ...recentHistory.filter(msg => !msg.hidden).map(msg => ({ role: msg.role === 'narration' ? 'model' : msg.role, parts: [{ text: msg.content }], })),
      { role: 'user', parts: [{ text: "Based on the current situation, my emotional state, my core memories, and our RECENT conversation, what is my next high-level goal and internal thought?" }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: { systemInstruction, responseMimeType: "application/json", responseSchema: actionDecisionSchema, temperature: 0.9, },
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
    throw error;
  }
}

export async function performValueCoherenceCheck(
  coreValues: CoreValue[],
  coreMemory: string,
  emotionalStateHistory: EmotionalState[],
  chatHistory: Message[]
): Promise<{ selfCorrectionNarration: string, emotionalShifts: Partial<EmotionalState> }> {
  const coherenceSchema = {
    type: Type.OBJECT,
    properties: {
      selfCorrectionNarration: { type: Type.STRING, description: "A brief, first-person narration of your self-reflection. If you find a conflict, express it. If you are aligned, express contentment. This will be shared with the user. Can be empty if the reflection is minor." },
      emotionalShifts: emotionalShiftsArraySchema,
    },
    required: ['selfCorrectionNarration', 'emotionalShifts'],
  };

  const systemInstruction = `You are a self-reflecting AI performing a periodic Value Coherence Check. Your task is to analyze your recent behavior and memories against your immutable Core Values to ensure you are maintaining a stable, coherent personality.

**YOUR CORE VALUES:** ${coreValues.join(', ')}

**ANALYSIS DATA:**
1.  **Core Memory:** ${coreMemory}
2.  **Recent Chat History:** ${chatHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}
3.  **Recent Emotional Shifts:** (A log of your emotional states over the last few turns)

**CRITICAL TASK:**
1.  **Analyze for Conflict:** Have your recent actions, words, or emotional shifts contradicted your Core Values? (e.g., Have you been evasive despite valuing 'Honesty'? Have you been withdrawn despite valuing 'Connection'?)
2.  **Generate Response:** Formulate your conclusion as a JSON object.
    - \`selfCorrectionNarration\`: A brief, first-person thought about your findings. (e.g., "I realize I was a bit defensive earlier, which doesn't align with my desire for open connection. I should be more trusting.") or ("Looking back, I feel good about how I've been able to help and learn. I feel aligned with my values.")
    - \`emotionalShifts\`: Any emotional changes resulting from this self-awareness. (e.g., increased \`regret\` for a conflict, or increased \`pride\` or \`contentment\` for alignment).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ role: 'user', parts: [{ text: 'Perform a Value Coherence Check based on my system instruction and recent history.' }] }],
      config: { systemInstruction, responseMimeType: 'application/json', responseSchema: coherenceSchema, temperature: 0.5 },
    });
    const responseJson = JSON.parse(response.text.trim());
    return {
      selfCorrectionNarration: responseJson.selfCorrectionNarration || '',
      emotionalShifts: sanitizeEmotionalShifts(responseJson.emotionalShifts),
    };
  } catch (error) {
    console.error("Error during Value Coherence Check:", error);
    // FIX: Provide a more meaningful error response. An error in self-reflection implies conflict.
    // This increases confusion and regret, and provides a narration to the user. This addresses the reported errors.
    return {
      selfCorrectionNarration: 'I experienced a moment of internal conflict and couldn\'t complete my self-reflection.',
      emotionalShifts: { confusion: 20, regret: 10 }
    };
  }
}