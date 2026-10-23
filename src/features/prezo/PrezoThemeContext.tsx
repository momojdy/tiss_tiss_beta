import React, { createContext, useContext, useMemo } from 'react';
import { prezoColors, type PrezoColors } from '../../theme/prezoTheme';
import type { PrezoThemeMode } from '../../types/prezo';

interface PrezoThemeValue {
  mode: PrezoThemeMode;
  colors: PrezoColors;
  setMode: (mode: PrezoThemeMode) => void;
}

const PrezoThemeContext = createContext<PrezoThemeValue | null>(null);

interface ProviderProps {
  mode: PrezoThemeMode;
  setMode: (mode: PrezoThemeMode) => void;
  children: React.ReactNode;
}

export const PrezoThemeProvider = ({ mode, setMode, children }: ProviderProps) => {
  const value = useMemo(
    () => ({ mode, colors: prezoColors[mode], setMode }),
    [mode, setMode],
  );
  return <PrezoThemeContext.Provider value={value}>{children}</PrezoThemeContext.Provider>;
};

export const usePrezoTheme = (): PrezoThemeValue => {
  const value = useContext(PrezoThemeContext);
  if (!value) throw new Error('usePrezoTheme must be used inside PrezoThemeProvider');
  return value;
};

