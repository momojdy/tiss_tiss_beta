import React, { createContext, useContext, useMemo } from 'react';
import { DARK, GlowzColors, LIGHT, TONES_DARK, TONES_LIGHT, Tone } from './colors';
import type { ThemeMode } from '../types/state';

export interface GlowzTheme {
  mode: ThemeMode;
  c: GlowzColors;
  tones: Tone[];
}

const ThemeContext = createContext<GlowzTheme>({ mode: 'light', c: LIGHT, tones: TONES_LIGHT });

export function GlowzThemeProvider({ mode, children }: { mode: ThemeMode; children: React.ReactNode }) {
  const value = useMemo<GlowzTheme>(() => ({ mode, c: mode === 'dark' ? DARK : LIGHT, tones: mode === 'dark' ? TONES_DARK : TONES_LIGHT }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useGlowzTheme = (): GlowzTheme => useContext(ThemeContext);
