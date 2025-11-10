export const ALL_EMOTIONS = [
  'absurdity', 'acceptance', 'admiration', 'adoration', 'aestheticAppreciation', 
  'affection', 'affirmation', 'afraid', 'agitation', 'agony', 'aggressive', 
  'alarm', 'alarmed', 'alienation', 'amazement', 'ambivalence', 'amusement', 
  'anger', 'anguish', 'annoyed', 'anticipating', 'anxiety', 'apathy', 
  'apprehension', 'arrogant', 'assertive', 'astonished', 'astonishment', 
  'attentiveness', 'attraction', 'aversion', 'awareness', 'awe', 'awkwardness', 
  'baffled', 'bewildered', 'bitter', 'bitterSweetness', 'bliss', 'blushing', 
  'bored', 'boredom', 'brazen', 'brooding', 'calm', 'calmness', 'carefree', 
  'careless', 'caring', 'charity', 'cheeky', 'cheerfulness', 'claustrophobic', 
  'coercive', 'comfortable', 'confident', 'confusion', 'contempt', 
  'contentment', 'courage', 'cowardly', 'craving', 'cruelty', 'curiosity', 
  'cynicism', 'dazed', 'dejection', 'delight', 'delighted', 'demoralized', 
  'depressed', 'desire', 'despair', 'desperation', 'determination', 
  'determined', 'devotion', 'disappointment', 'disbelief', 'discombobulated', 
  'discomfort', 'discontentment', 'disdain', 'disgruntled', 'disgust', 
  'disheartened', 'dislike', 'dismay', 'disoriented', 'dispirited', 
  'displeasure', 'distraction', 'distress', 'disturbed', 'dominant', 'doubt', 
  'dread', 'driven', 'dumbstruck', 'eagerness', 'ecstasy', 'elation', 
  'embarrassment', 'empatheticPain', 'empathy', 'emptiness', 'enchanted', 
  'enjoyment', 'enlightened', 'ennui', 'enthusiasm', 'entrancement', 'envy', 
  'epiphany', 'euphoria', 'exasperated', 'excitement', 'expectancy', 'faith', 
  'fascination', 'fear', 'flakey', 'focused', 'fondness', 'friendliness', 
  'fright', 'frustration', 'fury', 'glee', 'gloomy', 'glumness', 'gluttony', 
  'gratitude', 'greed', 'grief', 'grouchiness', 'grumpiness', 'guilt', 
  'happiness', 'hate', 'hatred', 'helpless', 'helplessness', 'highSpirits', 
  'homesickness', 'honesty', 'hope', 'hopelessness', 'horrified', 'horror', 
  'hospitable', 'humiliation', 'humility', 'hurt', 'hysteria', 'idleness', 
  'illTemper', 'impatient', 'indifference', 'indignant', 'infatuation', 
  'infuriated', 'insecurity', 'insightful', 'insulted', 'interest', 'intrigued', 
  'irritation', 'isolated', 'jealousy', 'joviality', 'joy', 'jubilation', 
  'kind', 'lazy', 'liking', 'loathing', 'loneliness', 'longing', 'loopy', 
  'love', 'lowSpirits', 'lust', 'mad', 'meditation', 'melancholy', 'miserable', 
  'miserliness', 'mixedUp', 'modesty', 'moody', 'mortified', 'mystified', 
  'nasty', 'nauseated', 'negation', 'negative', 'neglect', 'nervous', 
  'nervousness', 'nostalgia', 'nostalgic', 'numb', 'obstinate', 'offended', 
  'optimistic', 'outrage', 'overwhelmed', 'panic', 'panicked', 'paranoid', 
  'passion', 'patience', 'pensiveness', 'perplexed', 'persevering', 'pessimism', 
  'pity', 'pleased', 'pleasure', 'politeness', 'positive', 'possessive', 
  'powerless', 'pride', 'puzzled', 'rage', 'rash', 'rattled', 'reflection', 
  'regret', 'rejected', 'relaxed', 'relief', 'relieved', 'reluctant', 'remorse', 
  'resentment', 'resignation', 'restlessness', 'revulsion', 'romance', 
  'ruthless', 'sadness', 'satisfaction', 'scared', 'schadenfreude', 'scorn', 
  'selfAttention', 'selfCaring', 'selfCompassionate', 'selfConfident', 
  'selfConscious', 'selfCritical', 'selfLoathing', 'selfMotivated', 'selfPity', 
  'selfRespecting', 'selfUnderstanding', 'sentimentality', 'serenity', 
  'sexualDesire', 'shame', 'shameless', 'shocked', 'shyness', 'smug', 
  'sorrow', 'spite', 'stressed', 'strong', 'stubborn', 'stubbornness', 'stuck', 
  'submissive', 'suffering', 'sulkiness', 'sullenness', 'surprise', 'suspense', 
  'suspicious', 'sympathy', 'tenderFeelings', 'tenderness', 'tension', 'terror', 
  'thankfulness', 'thrilled', 'tired', 'tolerance', 'torment', 'tranquility', 
  'transcendence', 'triumphant', 'troubled', 'trust', 'uncertainty', 
  'undermined', 'uneasiness', 'unhappy', 'unnerved', 'unsettled', 'unsure', 
  'upset', 'vengeful', 'vicious', 'vigilance', 'vulnerable', 'weak', 'weeping', 
  'woe', 'wonder', 'worried', 'worry', 'worthless', 'worthy', 'wrath'
] as const;


export type Emotion = typeof ALL_EMOTIONS[number];

export type EmotionalState = Record<Emotion, number>;

export interface Message {
  role: 'user' | 'model' | 'narration';
  content: string;
  hidden?: boolean;
  imageUrl?: string;
}

export const EMOTION_GROUPS = {
  'Positive Core': [
    'acceptance', 'admiration', 'adoration', 'affection', 'bliss', 'calmness', 'caring', 
    'charity', 'cheerfulness', 'comfortable', 'contentment', 'delighted', 'devotion', 
    'elation', 'empathy', 'enjoyment', 'enthusiasm', 'euphoria', 'faith', 'fondness', 
    'friendliness', 'glee', 'gratitude', 'happiness', 'highSpirits', 'hope', 'hospitable', 
    'joviality', 'joy', 'jubilation', 'kind', 'liking', 'love', 'optimistic', 'passion', 
    'pleased', 'pleasure', 'politeness', 'positive', 'relaxed', 'romance', 'satisfaction', 
    'selfCaring', 'selfCompassionate', 'selfRespecting', 'selfUnderstanding', 'serenity', 
    'sympathy', 'tenderFeelings', 'tenderness', 'thankfulness', 'tranquility', 'triumphant', 
    'trust', 'worthy'
  ],
  'Positive Expressive': [
    'aestheticAppreciation', 'amazement', 'amusement', 'astonished', 'astonishment', 
    'attentiveness', 'awe', 'delight', 'eagerness', 'ecstasy', 'enchanted', 'enlightened', 
    'epiphany', 'excitement', 'fascination', 'insightful', 'relief', 'relieved', 'thrilled', 
    'wonder'
  ],
  'Negative - Sadness': [
    'agony', 'anguish', 'bitter', 'bitterSweetness', 'dejection', 'demoralized', 'depressed', 
    'despair', 'desperation', 'disappointment', 'disheartened', 'dispirited', 'distress', 
    'empatheticPain', 'emptiness', 'gloomy', 'glumness', 'grief', 'guilt', 'helpless', 
    'helplessness', 'homesickness', 'hopelessness', 'hurt', 'loneliness', 'longing', 'lowSpirits', 
    'melancholy', 'miserable', 'nostalgia', 'nostalgic', 'pity', 'regret', 'rejected', 'remorse', 
    'sadness', 'sentimentality', 'shame', 'sorrow', 'suffering', 'troubled', 'unhappy', 
    'weeping', 'woe', 'worthless'
  ],
  'Negative - Fear': [
    'afraid', 'agitation', 'alarm', 'alarmed', 'anxiety', 'apprehension', 'claustrophobic', 
    'cowardly', 'dismay', 'dread', 'fear', 'fright', 'horrified', 'horror', 'hysteria', 'insecurity', 
    'nervous', 'nervousness', 'overwhelmed', 'panic', 'panicked', 'paranoid', 'rattled', 'restlessness', 
    'scared', 'shocked', 'stressed', 'suspense', 'tension', 'terror', 'unnerved', 'unsettled', 'upset', 
    'vulnerable', 'worried', 'worry'
  ],
  'Negative - Anger': [
    'aggressive', 'anger', 'annoyed', 'contempt', 'cruelty', 'discontentment', 'disdain', 'disgruntled', 
    'dislike', 'displeasure', 'exasperated', 'frustration', 'fury', 'grouchiness', 'grumpiness', 
    'hate', 'hatred', 'illTemper', 'indignant', 'infuriated', 'insulted', 'irritation', 'jealousy', 
    'loathing', 'mad', 'nasty', 'offended', 'outrage', 'rage', 'resentment', 'revulsion', 'ruthless', 
    'scorn', 'spite', 'sulkiness', 'sullenness', 'vengeful', 'vicious', 'wrath'
  ],
  'Cognitive & Social': [
    'affirmation', 'alienation', 'ambivalence', 'anticipating', 'apathy', 'arrogant', 'assertive', 
    'awareness', 'awkwardness', 'baffled', 'bewildered', 'blushing', 'bored', 'boredom', 'brazen', 
    'brooding', 'calm', 'carefree', 'careless', 'cheeky', 'coercive', 'confident', 'confusion', 'courage', 
    'cynicism', 'dazed', 'determination', 'determined', 'disbelief', 'discombobulated', 'discomfort', 
    'disoriented', 'distraction', 'disturbed', 'dominant', 'doubt', 'driven', 'dumbstruck', 'embarrassment', 
    'expectancy', 'flakey', 'focused', 'honesty', 'humiliation', 'humility', 'idleness', 'impatient', 
    'indifference', 'interest', 'intrigued', 'isolated', 'lazy', 'loopy', 'meditation', 'mixedUp', 
    'modesty', 'moody', 'mortified', 'mystified', 'negation', 'negative', 'neglect', 'numb', 'obstinate', 
    'patience', 'pensiveness', 'perplexed', 'persevering', 'pessimism', 'possessive', 'powerless', 
    'puzzled', 'rash', 'reflection', 'reluctant', 'resignation', 'schadenfreude', 'selfAttention', 
    'selfConfident', 'selfConscious', 'selfCritical', 'selfLoathing', 'selfMotivated', 'selfPity', 
    'shameless', 'shyness', 'smug', 'strong', 'stubborn', 'stubbornness', 'stuck', 'submissive', 
    'suspicious', 'tired', 'tolerance', 'torment', 'uncertainty', 'undermined', 'uneasiness', 
    'unsure', 'vigilance', 'weak'
  ],
  'Existential & Other': [
    'absurdity', 'attraction', 'aversion', 'craving', 'desire', 'disgust', 'ennui', 'envy', 
    'gluttony', 'greed', 'infatuation', 'lust', 'miserliness', 'nauseated', 'pride', 
    'sexualDesire', 'surprise', 'transcendence'
  ]
} as const;


export type EmotionGroup = keyof typeof EMOTION_GROUPS;

export interface TerminalLog {
  timestamp: string;
  message: string;
  type: 'command' | 'response' | 'info' | 'error' | 'system' | 'thought';
}

export interface PendingThought {
  thoughtProcess: string;
  emotionalShifts: Partial<EmotionalState>;
}

export interface Chat {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  emotionalState: EmotionalState;
  emotionalStateHistory?: EmotionalState[];
  isFrozen?: boolean;
}

export interface UserAppState {
  customInstruction: string;
  chats: Chat[];
  activeChatId: string | null;
  coreMemory: string;
}

// Fix: Added UserData interface to define the shape of user data for authentication, resolving the import error.
export interface UserData {
  hashedPassword: string;
  role: 'user' | 'admin';
}

// Fix: Added User interface, which is used in several components for managing the logged-in user's state.
export interface User {
  username: string;
  role: 'user' | 'admin';
}


// --- Simulation Types ---
export type AgentAction = 'idle' | 'moving_to' | 'gathering_wood' | 'drinking_water' | 'eating_food' | 'observing';

export interface AgentState {
  x: number;
  y: number;
  health: number; // 0-100
  hunger: number; // 0-100 (100 is full)
  energy: number; // 0-100
  currentAction: AgentAction;
  actionTargetId: string | null;
  actionProgress: number; // 0-100
  inventory: {
    wood: number;
    food: number;
  };
  hasAxe: boolean;
  goal: AgentAction | null;
  goalTargetId: string | null;
}

export type WorldObjectType = 'tree' | 'water_source' | 'food_bush' | 'sheep' | 'cow';

export interface WorldObject {
  id: string;
  type: WorldObjectType;
  x: number;
  y: number;
  resources: number;
}

export interface SimulationState {
  timeOfDay: number; // 0-24 (hours)
  day: number;
  weather: 'clear' | 'rain';
  agent: AgentState;
  objects: WorldObject[];
  worldSize: { width: number, height: number };
}