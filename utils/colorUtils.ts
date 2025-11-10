import type React from 'react';
import type { EmotionalState, Emotion } from '../types';

export const EMOTION_COLORS: Record<Emotion, string> = {
  absurdity: '#708090',
  acceptance: '#98FB98',
  admiration: '#E0B0FF',
  adoration: '#FF1493',
  aestheticAppreciation: '#48D1CC',
  affection: '#FFB6C1',
  affirmation: '#228B22',
  afraid: '#778899',
  agitation: '#FF6347',
  agony: '#8B0000',
  aggressive: '#B22222',
  alarm: '#FF4500',
  alarmed: '#FFA500',
  alienation: '#36454F',
  amazement: '#FFD700',
  ambivalence: '#C0C0C0',
  amusement: '#FFBF00',
  anger: '#DC143C',
  anguish: '#654321',
  annoyed: '#FF7F50',
  anticipating: '#F0E68C',
  anxiety: '#7B68EE',
  apathy: '#808080',
  apprehension: '#5F9EA0',
  arrogant: '#800080',
  assertive: '#4682B4',
  astonished: '#FF69B4',
  astonishment: '#FFDAB9',
  attentiveness: '#556B2F',
  attraction: '#FF69B4',
  aversion: '#A0522D',
  awareness: '#FFFFFF',
  awe: '#DA70D6',
  awkwardness: '#D2B48C',
  baffled: '#F5DEB3',
  bewildered: '#D8BFD8',
  bitter: '#8B4513',
  bitterSweetness: '#D2691E',
  bliss: '#E0FFFF',
  blushing: '#FFE4E1',
  // FIX: Corrected invalid hex color code 'G' is not a valid hex character.
  bored: '#B0B0B0',
  boredom: '#B0C4DE',
  brazen: '#CD5C5C',
  brooding: '#483D8B',
  calm: '#90EE90',
  calmness: '#AFEEEE',
  carefree: '#00FFFF',
  careless: '#D3D3D3',
  caring: '#DA70D6',
  charity: '#F5F5DC',
  cheeky: '#FFB6C1',
  cheerfulness: '#32CD32',
  claustrophobic: '#2F4F4F',
  coercive: '#696969',
  comfortable: '#F0F8FF',
  confident: '#1E90FF',
  confusion: '#DDA0DD',
  contempt: '#8B4513',
  contentment: '#90EE90',
  courage: '#FF8C00',
  cowardly: '#F0E68C',
  craving: '#FF8C00',
  cruelty: '#8B0000',
  curiosity: '#FFFF00',
  cynicism: '#BDB76B',
  dazed: '#E6E6FA',
  dejection: '#6A737D',
  delight: '#FFA500',
  delighted: '#FFC0CB',
  demoralized: '#708090',
  depressed: '#000080',
  desire: '#FF4500',
  despair: '#2F4F4F',
  desperation: '#5A5A82',
  determination: '#CD5C5C',
  determined: '#B22222',
  devotion: '#BA55D3',
  disappointment: '#778899',
  disbelief: '#ADD8E6',
  discombobulated: '#FFDAB9',
  discomfort: '#FF7F50',
  discontentment: '#B03A2E',
  disdain: '#483C32',
  disgruntled: '#D2B48C',
  disgust: '#006400',
  disheartened: '#A9A9A9',
  dislike: '#FA8072',
  dismay: '#696969',
  disoriented: '#FAFAD2',
  dispirited: '#B0C4DE',
  displeasure: '#E9967A',
  distraction: '#DCDCDC',
  distress: '#DC143C',
  disturbed: '#9F2B68',
  dominant: '#800000',
  doubt: '#C0C0C0',
  dread: '#3B3B6D',
  driven: '#00008B',
  dumbstruck: '#F0FFFF',
  eagerness: '#ADFF2F',
  ecstasy: '#FF007F',
  elation: '#FFFACD',
  embarrassment: '#FFC0CB',
  empatheticPain: '#6495ED',
  empathy: '#4682B4',
  emptiness: '#1C1C1C',
  enchanted: '#9400D3',
  enjoyment: '#FFD700',
  enlightened: '#FFFFE0',
  ennui: '#40826D',
  enthusiasm: '#F4A460',
  entrancement: '#9400D3',
  envy: '#008080',
  epiphany: '#E1D5E7',
  euphoria: '#7FFFD4',
  exasperated: '#C71585',
  excitement: '#CCFF00',
  expectancy: '#FDF5E6',
  faith: '#4682B4',
  fascination: '#DB7093',
  fear: '#4B0082',
  flakey: '#FFF5EE',
  focused: '#0000CD',
  fondness: '#FFE4E1',
  friendliness: '#90EE90',
  fright: '#000000',
  frustration: '#FF4500',
  fury: '#990000',
  glee: '#FFFF00',
  gloomy: '#696969',
  glumness: '#808080',
  gluttony: '#CD853F',
  gratitude: '#F0E68C',
  greed: '#BDB76B',
  grief: '#000080',
  grouchiness: '#A9A9A9',
  grumpiness: '#8B4513',
  guilt: '#696969',
  happiness: '#FFD700',
  hate: '#A52A2A',
  hatred: '#8B0000',
  helpless: '#D3D3D3',
  helplessness: '#D3D3D3',
  highSpirits: '#32CD32',
  homesickness: '#8FBC8F',
  honesty: '#F5F5F5',
  hope: '#87CEEB',
  hopelessness: '#36454F',
  horrified: '#3b0000',
  horror: '#000000',
  hospitable: '#F5DEB3',
  humiliation: '#E34234',
  humility: '#B0E0E6',
  hurt: '#C41E3A',
  hysteria: '#FF4D00',
  idleness: '#F5F5F5',
  illTemper: '#BCB88A',
  impatient: '#CD5C5C',
  indifference: '#BEBEBE',
  indignant: '#D73B3E',
  infatuation: '#FF69B4',
  infuriated: '#C12267',
  insecurity: '#DDA0DD',
  insightful: '#ADD8E6',
  insulted: '#FF8C00',
  interest: '#ADFF2F',
  intrigued: '#40E0D0',
  irritation: '#FF7F50',
  isolated: '#4682B4',
  jealousy: '#3B7A57',
  joviality: '#FFA500',
  joy: '#FFFFE0',
  jubilation: '#FFD700',
  kind: '#F0FFF0',
  lazy: '#A9A9A9',
  liking: '#FFB6C1',
  loathing: '#3D0C02',
  loneliness: '#6A5ACD',
  longing: '#D8BFD8',
  loopy: '#DA70D6',
  love: '#FF4B4B',
  lowSpirits: '#191970',
  lust: '#E62020',
  mad: '#FF0000',
  meditation: '#536878',
  melancholy: '#343467',
  miserable: '#00008B',
  miserliness: '#B8860B',
  mixedUp: '#9370DB',
  modesty: '#F5DEB3',
  moody: '#5F9EA0',
  mortified: '#F08080',
  mystified: '#7B68EE',
  nasty: '#800000',
  nauseated: '#9ACD32',
  negation: '#A52A2A',
  negative: '#800000',
  neglect: '#A9A9A9',
  nervous: '#DB7093',
  nervousness: '#DB7093',
  nostalgia: '#8B7355',
  nostalgic: '#DEB887',
  numb: '#EFEFEF',
  obstinate: '#704214',
  offended: '#E30B5C',
  optimistic: '#FFBF00',
  outrage: '#FF6347',
  overwhelmed: '#6A5ACD',
  panic: '#C71585',
  panicked: '#FF00FF',
  paranoid: '#4B0082',
  passion: '#E30B5C',
  patience: '#6B8E23',
  pensiveness: '#B0C4DE',
  perplexed: '#7F00FF',
  persevering: '#008000',
  pessimism: '#585858',
  pity: '#B0E0E6',
  pleased: '#F0FFFF',
  pleasure: '#FFE4B5',
  politeness: '#EEDD82',
  positive: '#00FF00',
  possessive: '#800080',
  pride: '#800080',
  puzzled: '#FFFF00',
  rage: '#FF0000',
  rash: '#FF4040',
  rattled: '#FADADD',
  reflection: '#00008B',
  regret: '#483D8B',
  rejected: '#808080',
  relaxed: '#98FB98',
  relief: '#98FB98',
  relieved: '#F0FFF0',
  reluctant: '#FFFACD',
  remorse: '#B03060',
  resentment: '#9A2A2A',
  resignation: '#AAAAAA',
  restlessness: '#F4A460',
  revulsion: '#2E8B57',
  romance: '#FFB6C1',
  ruthless: '#410200',
  sadness: '#4169E1',
  satisfaction: '#2E8B57',
  scared: '#A020F0',
  schadenfreude: '#4B088A',
  scorn: '#8A2BE2',
  selfAttention: '#E0FFFF',
  selfCaring: '#98FF98',
  selfCompassionate: '#FFDAB9',
  selfConfident: '#FFFFF0',
  selfConscious: '#FFFAF0',
  selfCritical: '#D3D3D3',
  selfLoathing: '#4C516D',
  selfMotivated: '#00FFFF',
  selfPity: '#ADD8E6',
  selfRespecting: '#F5F5F5',
  selfUnderstanding: '#F0F8FF',
  sentimentality: '#F8DE7E',
  serenity: '#B0E0E6',
  sexualDesire: '#D2042D',
  shame: '#800000',
  shameless: '#FFA500',
  shocked: '#08E8DE',
  shyness: '#FFC0CB',
  smug: '#8A2BE2',
  sorrow: '#0000CD',
  spite: '#400000',
  stressed: '#FF69B4',
  strong: '#FFD700',
  stubborn: '#A0522D',
  stubbornness: '#A0522D',
  stuck: '#808080',
  submissive: '#C8A2C8',
  suffering: '#7B3F00',
  sulkiness: '#8FBC8F',
  sullenness: '#8A9A5B',
  surprise: '#00FFFF',
  suspense: '#708090',
  suspicious: '#CEC88D',
  sympathy: '#EED9C4',
  tenderFeelings: '#F8C8DC',
  tenderness: '#FFE4E1',
  tension: '#FFA500',
  terror: '#1C0000',
  thankfulness: '#FFEFD5',
  thrilled: '#DE3163',
  tired: '#B2B2B2',
  tolerance: '#87CEEB',
  torment: '#7E2817',
  tranquility: '#ADD8E6',
  transcendence: '#E6E6FA',
  triumphant: '#C7A317',
  troubled: '#660066',
  trust: '#3CB371',
  uncertainty: '#E8E4C9',
  undermined: '#D2B48C',
  uneasiness: '#FFDEAD',
  unhappy: '#9400D3',
  unnerved: '#FFFACD',
  unsettled: '#F0E68C',
  unsure: '#F5F5DC',
  upset: '#DB7093',
  vengeful: '#53212B',
  vicious: '#3B000B',
  vigilance: '#FFBF00',
  vulnerable: '#ADD8E6',
  weak: '#C0C0C0',
  weeping: '#B9D9EB',
  woe: '#483C32',
  wonder: '#EE82EE',
  worried: '#999999',
  worry: '#9370DB',
  worthless: '#545454',
  worthy: '#E5AA70',
  wrath: '#C00000',
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
    if (!hex) return '#1a1a1a'; // Fallback for undefined colors
    
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