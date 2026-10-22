import React, { createContext, useContext } from 'react';
import { Platform, StatusBar, useWindowDimensions } from 'react-native';

export interface Insets { top: number; bottom: number; left: number; right: number }

/** Sensible defaults when the host does not pass real safe-area insets. */
export function defaultInsets(): Insets {
  return Platform.OS === 'ios'
    ? { top: 47, bottom: 34, left: 0, right: 0 }
    : { top: StatusBar.currentHeight ?? 24, bottom: 0, left: 0, right: 0 };
}

const LayoutContext = createContext<Insets>({ top: 0, bottom: 0, left: 0, right: 0 });

export function GlowzLayoutProvider({ insets, children }: { insets?: Insets; children: React.ReactNode }) {
  return <LayoutContext.Provider value={insets ?? defaultInsets()}>{children}</LayoutContext.Provider>;
}

export const useInsets = (): Insets => useContext(LayoutContext);

/** Horizontal page padding: 18, or the side inset when larger (landscape notches). */
export function useGutter(): { left: number; right: number } {
  const i = useInsets();
  return { left: Math.max(18, i.left), right: Math.max(18, i.right) };
}

/** Usable content width: the window, capped at the 480 phone-column width used by the prototype. */
export function useContentWidth(): number {
  return Math.min(useWindowDimensions().width, 480);
}
