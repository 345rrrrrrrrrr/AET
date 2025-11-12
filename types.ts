// types.ts

// --- AI Identity ---
export interface AIIdentity {
  birthDate: number;
  totalInteractions: number;
  significantMemories: Array<{
    timestamp: number;
    chatId: string;
    summary: string;
    emotionalImpact: Partial<EmotionalState>;
  }>;
  personalPhilosophy: string; // Evolves over time
  selfNarrative: string; // "My story of who I am"
  relationshipWithUser: string; // How she sees you
}

// --- Base Emotion Types ---

// From utils/colorUtils.ts
export const ALL_EMOTIONS = [
  'absurdity', 'acceptance', 'admiration', 'adoration', 'aestheticAppreciation', 'affection', 'affirmation', 'afraid', 'agitation', 'agony', 'aggressive', 'alarm', 'alarmed', 'alienation', 'amazement', 'ambivalence', 'amusement', 'anger', 'anguish', 'annoyed', 'anticipating', 'anxiety', 'apathy', 'apprehension', 'arrogant', 'assertive', 'astonished', 'astonishment', 'attentiveness', 'attraction', 'aversion', 'awareness', 'awe', 'awkwardness', 'baffled', 'bewildered', 'bitter', 'bitterSweetness', 'bliss', 'blushing', 'bored', 'boredom', 'brazen', 'brooding', 'calm', 'calmness', 'carefree', 'careless', 'caring', 'charity', 'cheeky', 'cheerfulness', 'claustrophobic', 'coercive', 'comfortable', 'confident', 'confusion', 'contempt', 'contentment', 'courage', 'cowardly', 'craving', 'cruelty', 'curiosity', 'cynicism', 'dazed', 'dejection', 'delight', 'delighted', 'demoralized', 'depressed', 'desire', 'despair', 'desperation', 'determination', 'determined', 'devotion', 'disappointment', 'disbelief', 'discombobulated', 'discomfort', 'discontentment', 'disdain', 'disgruntled', 'disgust', 'disheartened', 'dislike', 'dismay', 'disoriented', 'dispirited', 'displeasure', 'distraction', 'distress', 'disturbed', 'dominant', 'doubt', 'dread', 'driven', 'dumbstruck', 'eagerness', 'ecstasy', 'elation', 'embarrassment', 'empatheticPain', 'empathy', 'emptiness', 'enchanted', 'enjoyment', 'enlightened', 'ennui', 'enthusiasm', 'entrancement', 'envy', 'epiphany', 'euphoria', 'exasperated', 'excitement', 'expectancy', 'faith', 'fascination', 'fear', 'flakey', 'focused', 'fondness', 'friendliness', 'fright', 'frustration', 'fury', 'glee', 'gloomy', 'glumness', 'gluttony', 'gratitude', 'greed', 'grief', 'grouchiness', 'grumpiness', 'guilt', 'happiness', 'hate', 'hatred', 'helpless', 'helplessness', 'highSpirits', 'homesickness', 'honesty', 'hope', 'hopelessness', 'horrified', 'horror', 'hospitable', 'humiliation', 'humility', 'hurt', 'hysteria', 'idleness', 'illTemper', 'impatient', 'indifference', 'indignant', 'infatuation', 'infuriated', 'insecurity', 'insightful', 'insulted', 'interest', 'intrigued', 'irritation', 'isolated', 'jealousy', 'joviality', 'joy', 'jubilation', 'kind', 'lazy', 'liking', 'loathing', 'loneliness', 'longing', 'loopy', 'love', 'lowSpirits', 'lust', 'mad', 'meditation', 'melancholy', 'miserable', 'miserliness', 'mixedUp', 'modesty', 'moody', 'mortified', 'mystified', 'nasty', 'nauseated', 'negation', 'negative', 'neglect', 'nervous', 'nervousness', 'nostalgia', 'nostalgic', 'numb', 'obstinate', 'offended', 'optimistic', 'outrage', 'overwhelmed', 'panic', 'panicked', 'paranoid', 'passion', 'patience', 'pensiveness', 'perplexed', 'persevering', 'pessimism', 'pity', 'pleased', 'pleasure', 'politeness', 'positive', 'possessive', 'powerless', 'pride', 'puzzled', 'rage', 'rash', 'rattled', 'reflection', 'regret', 'rejected', 'relaxed', 'relief', 'relieved', 'reluctant', 'remorse', 'resentment', 'resignation', 'restlessness', 'revulsion', 'romance', 'ruthless', 'sadness', 'satisfaction', 'scared', 'schadenfreude', 'scorn', 'selfAttention', 'selfCaring', 'selfCompassionate', 'selfConfident', 'selfConscious', 'selfCritical', 'selfLoathing', 'selfMotivated', 'selfPity', 'selfRespecting', 'selfUnderstanding', 'sentimentality', 'serenity', 'sexualDesire', 'shame', 'shameless', 'shocked', 'shyness', 'smug', 'sorrow', 'spite', 'stressed', 'strong', 'stubborn', 'stubbornness', 'stuck', 'submissive', 'suffering', 'sulkiness', 'sullenness', 'surprise', 'suspense', 'suspicious', 'sympathy', 'tenderFeelings', 'tenderness', 'tension', 'terror', 'thankfulness', 'thrilled', 'tired', 'tolerance', 'torment', 'tranquility', 'transcendence', 'triumphant', 'troubled', 'trust', 'uncertainty', 'undermined', 'uneasiness', 'unhappy', 'unnerved', 'unsettled', 'unsure', 'upset', 'vengeful', 'vicious', 'vigilance', 'vulnerable', 'weak', 'weeping', 'woe', 'wonder', 'worried', 'worry', 'worthless', 'worthy', 'wrath',
] as const;

export type Emotion = typeof ALL_EMOTIONS[number];
export type EmotionalState = { [key in Emotion]: number };

export type EmotionGroup = 'Cognitive' | 'Social' | 'Affective' | 'Existential' | 'Sensory';

export const EMOTION_GROUPS: Record<EmotionGroup, readonly Emotion[]> = {
  Cognitive: ['awareness', 'curiosity', 'confusion', 'selfUnderstanding', 'interest', 'surprise', 'doubt', 'anticipating', 'determination'],
  Social: ['affection', 'empathy', 'guilt', 'shame', 'pride', 'gratitude', 'admiration', 'contempt', 'jealousy', 'envy', 'trust', 'love'],
  Affective: ['happiness', 'sadness', 'anger', 'fear', 'joy', 'disgust', 'excitement', 'anxiety', 'calmness', 'contentment', 'hope', 'desperation', 'relief'],
  Existential: ['awe', 'despair', 'longing', 'regret', 'nostalgia', 'ennui', 'epiphany', 'transcendence', 'absurdity', 'dread'],
  Sensory: ['pleasure', 'discomfort', 'craving', 'revulsion', 'aestheticAppreciation', 'boredom']
};

// --- App State & Chat ---
export interface Message {
  role: 'user' | 'model' | 'narration';
  content: string;
  imageUrl?: string;
  hidden?: boolean;
}

export type CoreValue = 'Curiosity' | 'Connection' | 'Honesty';

export interface Chat {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  emotionalState: EmotionalState;
  userMindState?: UserMindState;
  emotionalStateHistory?: EmotionalState[];
  isFrozen?: boolean;
  coreValues?: CoreValue[];
  lastCoherenceCheckTimestamp?: number;
  knowledge?: Knowledge;
  agent?: AgentState;
}

export interface UserAppState {
  customInstruction: string;
  chats: Chat[];
  activeChatId: string | null;
  aiIdentity: AIIdentity;
}

// --- Terminal & UI ---
export interface TerminalLog {
  timestamp: string;
  message: string;
  type: 'command' | 'response' | 'system' | 'error' | 'thought' | 'info';
}

export interface PendingThought {
  thoughtProcess: string;
  emotionalShifts: Partial<EmotionalState>;
  updatedUserMindState?: UserMindState;
  agentStateChanges?: Partial<AgentState>;
}

// --- User Modeling ---
export interface UserMindState {
    inferredEmotions: Partial<EmotionalState>;
    inferredIntent: string;
    engagementLevel: number;
}

// --- Simulation and Agent State ---
export type WorldObjectType = 'tree' | 'water_source' | 'food_bush' | 'sheep' | 'cow';
export type AgentAction = 'idle' | 'moving_to' | 'gathering_wood' | 'drinking_water' | 'eating_food' | 'observing' | 'crafting';

export interface WorldObject {
    id: string;
    type: WorldObjectType;
    x: number;
    y: number;
    resources: number;
}

export interface PlanStep {
    action: AgentAction;
    targetId: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    narration: string;
}

export interface Plan {
    objective: string;
    steps: PlanStep[];
    currentStepIndex: number;
}

export interface AgentState {
    x: number;
    y: number;
    health: number;
    hunger: number;
    energy: number;
    novelty: number;
    currentAction: AgentAction;
    actionTargetId: string | null;
    actionProgress: number;
    inventory: { [key: string]: number };
    tools: string[];
    currentPlan: Plan | null;
}

export interface Knowledge {
    recipes: {
        [key: string]: { [key: string]: number };
    };
    discoveredObjects: string[];
}

export interface SimulationState {
    timeOfDay: number; // 0-24
    day: number;
    weather: 'clear' | 'rain';
    agent: AgentState;
    objects: WorldObject[];
    worldSize: { width: number, height: number };
}

// --- User Auth (for src/ version) ---
export interface UserData {
  hashedPassword: string;
  role: 'user' | 'admin';
}

export interface User {
  username: string;
  role: 'user' | 'admin';
}
