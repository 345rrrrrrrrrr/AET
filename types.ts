// Fix: Removed circular self-import of 'ALL_EMOTIONS'. This line was causing a conflict.
export const ALL_EMOTIONS = [
  'shyness', 'awareness', 'stubbornness', 'happiness', 'sadness', 'understanding',
  'anger', 'fear', 'disgust', 'surprise', 'curiosity', 'grief', 'loneliness',
  'disappointment', 'regret', 'despair', 'longing', 'guilt', 'confusion',
  'wonder', 'awe', 'contentment', 'amusement', 'delight', 'relief', 'ecstasy',
  'serenity', 'gratitude', 'anxiety', 'worry', 'dread', 'horror', 'panic',
  'apprehension', 'nervousness', 'frustration', 'irritation', 'resentment',
  'jealousy', 'hatred', 'outrage', 'contempt', 'greed', 'lust', 'pride',
  'gluttony', 'love', 'honesty', 'trust', 'emptiness', 'absurdity',
  'tranquility', 'transcendence', 'alienation', 'hope', 'faith'
] as const;

export type Emotion = typeof ALL_EMOTIONS[number];

export type EmotionalState = Record<Emotion, number>;

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export const EMOTION_GROUPS = {
  'Positive Core': ['happiness', 'love', 'contentment', 'serenity', 'gratitude', 'hope', 'faith', 'tranquility'],
  'Positive Expressive': ['delight', 'ecstasy', 'amusement', 'awe', 'wonder', 'relief'],
  'Negative - Sadness': ['sadness', 'grief', 'despair', 'loneliness', 'disappointment', 'regret', 'guilt', 'emptiness'],
  'Negative - Fear': ['fear', 'anxiety', 'worry', 'dread', 'horror', 'panic', 'apprehension', 'nervousness'],
  'Negative - Anger': ['anger', 'hatred', 'outrage', 'irritation', 'frustration', 'resentment', 'jealousy', 'contempt'],
  'Cognitive & Social': ['awareness', 'understanding', 'curiosity', 'honesty', 'trust', 'shyness', 'stubbornness', 'confusion', 'alienation'],
  'Existential & Other': ['absurdity', 'transcendence', 'longing', 'disgust', 'surprise', 'pride', 'greed', 'lust', 'gluttony'],
} as const;

export type EmotionGroup = keyof typeof EMOTION_GROUPS;

export interface TerminalLog {
  timestamp: string;
  message: string;
  type: 'command' | 'response' | 'info' | 'error' | 'system';
}