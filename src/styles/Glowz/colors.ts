export interface GlowzColors {
  bg: string; surface: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string; roseInk: string; tint: string; tintInk: string;
  mocha: string; sage: string; sageSoft: string; sageInk: string;
  ok: string; okBg: string; warn: string; warnBg: string; bad: string; badBg: string;
  star: string; gold: string;
  /** Text colour used on the dark "on" chip and toast. */
  inkOn: string;
  scrim: string;
  shadow: string;
}

export interface Tone { a: string; b: string; c: string; d: string }

/** Light is the default. Dark is chosen in Profile. */
export const LIGHT: GlowzColors = {
  bg: '#FFF7F0', surface: '#FFFDF9', ink: '#37302D', muted: '#7A6B63', line: '#F0E3D9',
  accent: '#C98283', accentInk: '#37302D', roseInk: '#9A5659', tint: '#F7E6E0', tintInk: '#8A4A4D',
  mocha: '#8A6654', sage: '#849780', sageSoft: '#E7EDE4', sageInk: '#46573F',
  ok: '#46573F', okBg: '#E7EDE4', warn: '#85592B', warnBg: '#F7E8D4', bad: '#A3433B', badBg: '#F8E1DC',
  star: '#C08A57', gold: '#C08A57', inkOn: '#FFF7F0', scrim: 'rgba(40,28,22,0.5)', shadow: '#5A3C2D',
};

export const DARK: GlowzColors = {
  bg: '#1E1917', surface: '#2A2321', ink: '#F5EBE3', muted: '#BBA99F', line: '#3B312D',
  accent: '#D79A9B', accentInk: '#2A1B1B', roseInk: '#EBB5B6', tint: '#3A2829', tintInk: '#F0C3C4',
  mocha: '#C9A08B', sage: '#9DB09A', sageSoft: '#28312A', sageInk: '#C5D6C1',
  ok: '#BCD3B8', okBg: '#28312A', warn: '#E3B47A', warnBg: '#3A2C1A', bad: '#EE9A92', badBg: '#3D211E',
  star: '#D9A56F', gold: '#D9A56F', inkOn: '#1E1917', scrim: 'rgba(40,28,22,0.5)', shadow: '#000000',
};

/** Illustration palettes standing in for photography (no image assets exist yet). */
export const TONES_LIGHT: Tone[] = [
  { a: '#F6E3DE', b: '#EBC4C0', c: '#C98283', d: '#8E4F52' },
  { a: '#EEE0D5', b: '#D9BFAE', c: '#8A6654', d: '#5E4234' },
  { a: '#E7EDE4', b: '#C9D6C5', c: '#849780', d: '#4C5E49' },
  { a: '#FFF0E2', b: '#F4DCC8', c: '#DDB394', d: '#8A6654' },
];
export const TONES_DARK: Tone[] = [
  { a: '#3F2B2C', b: '#5A3C3D', c: '#D79A9B', d: '#F3CACB' },
  { a: '#392C26', b: '#51403A', c: '#C9A08B', d: '#EBCDBB' },
  { a: '#2A332B', b: '#3B4A3C', c: '#9DB09A', d: '#D2E1CF' },
  { a: '#3D3025', b: '#574433', c: '#D9A56F', d: '#F1D2AE' },
];
