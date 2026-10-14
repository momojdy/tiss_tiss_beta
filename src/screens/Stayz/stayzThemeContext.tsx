import React, { createContext, useContext, useMemo } from 'react';
import { Palette, dark, light } from './stayzColors';

interface ThemeValue {
  colors: Palette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue>({ colors: light, isDark: false });

export const StayzThemeProvider = ({ isDark, children }: { isDark: boolean; children: React.ReactNode }) => {
  const value = useMemo(() => ({ colors: isDark ? dark : light, isDark }), [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useStayzTheme = () => useContext(ThemeContext);
