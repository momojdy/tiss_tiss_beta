import { createContext, useContext } from 'react';
export const palette = { midnight: '#0E0B1D', deepViolet: '#2A1E4D', royal: '#5A3B8C', lavender: '#8B7CC7', lilac: '#C9C2E3', slate: '#3A3A52' } as const;
export type GatherzTheme = { name: 'light' | 'dark'; bg: string; card: string; text: string; mute: string; line: string; accent: string; onAccent: string; soft: string; stripe: string; navBg: string; navBorder: string };
export const lightTheme: GatherzTheme = { name: 'light', bg: '#F4F1FB', card: '#FFFFFF', text: palette.midnight, mute: '#6B6785', line: '#DDD7EE', accent: palette.royal, onAccent: '#FFFFFF', soft: '#E9E3F7', stripe: '#DED5F2', navBg: 'rgba(255,255,255,0.88)', navBorder: 'rgba(255,255,255,0.55)' };
export const darkTheme: GatherzTheme = { name: 'dark', bg: palette.midnight, card: '#17132B', text: '#F2EEFF', mute: palette.lilac, line: palette.slate, accent: palette.lavender, onAccent: palette.midnight, soft: palette.deepViolet, stripe: '#342849', navBg: 'rgba(31,25,49,0.88)', navBorder: 'rgba(139,124,199,0.40)' };
// Reuses the Inter weights already loaded by App.tsx, so Gatherz adds no font dependency.
export const fonts = { regular: 'Inter_400Regular', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' } as const;
export const radius = { card: 22, pill: 999, input: 18 } as const;
export const artGradients: readonly [string, string][] = [[palette.royal, palette.midnight], [palette.lavender, palette.deepViolet], [palette.deepViolet, palette.royal], [palette.slate, palette.midnight], [palette.lilac, palette.royal]];
export const ThemeContext = createContext<GatherzTheme>(lightTheme);
export const useGatherzTheme = () => useContext(ThemeContext);