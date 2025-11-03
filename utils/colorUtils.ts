
import type { EmotionalState, Emotion } from '../types';
import { ALL_EMOTIONS } from '../types';

// A hand-picked, comprehensive color map for all 56 emotions.
export const EMOTION_COLORS: Record<Emotion, string> = {
  // Positive Warm
  happiness: '#FFD700', // Gold
  love: '#FF4B4B', // Bright Red
  delight: '#FFA500', // Orange
  ecstasy: '#FF007F', // Deep Pink
  contentment: '#90EE90', // Light Green
  amusement: '#FFBF00', // Amber
  gratitude: '#F0E68C', // Khaki
  hope: '#87CEEB', // Sky Blue
  faith: '#4682B4', // Steel Blue
  pride: '#800080', // Purple
  lust: '#E62020', // Vivid Red
  gluttony: '#CD853F', // Peru
  greed: '#BDB76B', // Dark Khaki

  // Positive Calm
  understanding: '#87CEFA', // Light Sky Blue
  serenity: '#B0E0E6', // Powder Blue
  tranquility: '#ADD8E6', // Light Blue
  relief: '#98FB98', // Pale Green
  awe: '#DA70D6', // Orchid
  wonder: '#EE82EE', // Violet
  transcendence: '#E6E6FA', // Lavender

  // Neutral/Cognitive
  awareness: '#FFFFFF', // White
  curiosity: '#FFFF00', // Yellow
  honesty: '#F5F5F5', // White Smoke
  trust: '#3CB371', // Medium Sea Green
  stubbornness: '#A0522D', // Sienna
  absurdity: '#708090', // Slate Gray
  confusion: '#DDA0DD', // Plum

  // Negative Active
  anger: '#DC143C', // Crimson
  hatred: '#8B0000', // Dark Red
  outrage: '#FF6347', // Tomato
  irritation: '#FF7F50', // Coral
  frustration: '#FF4500', // Orange Red
  resentment: '#B22222', // Firebrick
  jealousy: '#3B7A57', // Pine Green
  contempt: '#8B4513', // Saddle Brown

  // Negative Passive/Sad
  sadness: '#4169E1', // Royal Blue
  grief: '#000080', // Navy
  despair: '#2F4F4F', // Dark Slate Gray
  loneliness: '#6A5ACD', // Slate Blue
  disappointment: '#778899', // Light Slate Gray
  regret: '#483D8B', // Dark Slate Blue
  guilt: '#696969', // Dim Gray
  emptiness: '#1C1C1C', // Almost Black
  alienation: '#36454F', // Charcoal
  desperation: '#5A5A82', // Dark Slate Blue/Purple

  // Fear/Anxiety
  fear: '#4B0082', // Indigo
  anxiety: '#7B68EE', // Medium Slate Blue
  worry: '#9370DB', // Medium Purple
  dread: '#3B3B6D', // Dark Purple Blue
  horror: '#000000', // Black
  panic: '#C71585', // Medium Violet Red
  apprehension: '#5F9EA0', // Cadet Blue
  nervousness: '#DB7093', // Pale Violet Red
  disgust: '#006400', // Dark Green
  
  // Others
  shyness: '#FFC0CB', // Pink
  surprise: '#00FFFF', // Cyan
  longing: '#D8BFD8'  // Thistle
};


/**
 * Converts a hex color string to an HSL array.
 */
function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

/**
 * Converts an HSL color value to a hex string.
 */
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Adjusts the brightness of a color based on the emotional value (0-100).
 * @param hex The base hex color for the emotion.
 * @param value The intensity of the emotion (0-100).
 * @returns A new hex color string with adjusted brightness.
 */
export function adjustColor(hex: string, value: number): string {
    if (value <= 0) return '#1a1a1a'; // A very dark grey for zero value
    
    const [h, s, baseL] = hexToHsl(hex);
    
    // We want the lightness to range from a dark point (e.g., 10%) up to the color's natural lightness.
    // The base lightness (baseL) is considered the color at 100%.
    // We map the value [0, 100] to the lightness range [10, baseL].
    const minLightness = 15; // The darkest the color can be
    const newLightness = minLightness + (baseL - minLightness) * (value / 100);

    return hslToHex(h, s, Math.min(100, newLightness));
}

/**
 * Generates a CSS style object for a background gradient based on the emotional state.
 */
export function generateGradientStyle(emotionalState: EmotionalState): React.CSSProperties {
  // Get emotions with significant intensity, sort them to have the strongest ones first
  const prominentEmotions = (Object.keys(emotionalState) as Emotion[])
    .map(key => ({ emotion: key, value: emotionalState[key] }))
    .filter(item => item.value > 20) // Only consider emotions with some presence
    .sort((a, b) => b.value - a.value)
    .slice(0, 4); // Use up to the top 4 emotions to avoid a muddy mix

  if (prominentEmotions.length === 0) {
    // Default background if no strong emotions are present
    return { background: 'linear-gradient(135deg, #1a202c, #2d3748)' };
  }
  
  if (prominentEmotions.length === 1) {
    const color = adjustColor(EMOTION_COLORS[prominentEmotions[0].emotion], prominentEmotions[0].value);
    // Use a radial gradient for a single dominant emotion for a nice "glow" effect
    return { background: `radial-gradient(ellipse at center, ${color} 0%, #111 80%)` };
  }

  const colorStops = prominentEmotions
    .map(item => adjustColor(EMOTION_COLORS[item.emotion], item.value))
    .join(', ');

  return { backgroundImage: `linear-gradient(135deg, ${colorStops})` };
}