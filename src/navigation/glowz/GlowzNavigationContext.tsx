import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import { useGlowzSheet } from '../../hooks/Glowz/GlowzSheetContext';
import type { GlowzNavState, GlowzRoute, ProviderTab, RootTab } from './GlowzNavigationTypes';
import { initialNav, navigationReducer } from './navigationReducer';

/** A screen can claim the back action (for example a booking step). Return true when handled. */
export type BackHandler = () => boolean;

export interface GlowzNavigation {
  tab: RootTab;
  stack: GlowzRoute[];
  current: GlowzRoute | null;
  canGoBack: boolean;
  push: (route: GlowzRoute) => void;
  /** Pop the top secondary screen. Does nothing on a root screen. */
  pop: () => void;
  setTab: (tab: RootTab) => void;
  /** Leave everything and show a root tab. */
  goRoot: (tab: RootTab) => void;
  replaceStack: (tab: RootTab, stack: GlowzRoute[]) => void;
  setProviderTab: (tab: ProviderTab) => void;
  /** Full back behaviour: sheet, then screen-specific handler, then stack pop, then host exit. */
  back: () => boolean;
  registerBackHandler: (h: BackHandler) => () => void;
  navState: GlowzNavState;
}

const NavContext = createContext<GlowzNavigation | null>(null);

interface ProviderProps {
  initial?: GlowzNavState;
  /** Called when back is pressed on a root screen with nothing to close. */
  onExit?: () => void;
  children: React.ReactNode;
}

export function GlowzNavigationProvider({ initial, onExit, children }: ProviderProps) {
  const [nav, dispatch] = useReducer(navigationReducer, initial ?? initialNav);
  const { sheet, closeSheet } = useGlowzSheet();
  const handlers = useRef<BackHandler[]>([]);
  const navRef = useRef(nav);
  navRef.current = nav;
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;

  const registerBackHandler = useCallback((h: BackHandler) => {
    handlers.current.push(h);
    return () => {
      handlers.current = handlers.current.filter((x) => x !== h);
    };
  }, []);

  const back = useCallback((): boolean => {
    if (sheetRef.current) {
      closeSheet();
      return true;
    }
    for (let i = handlers.current.length - 1; i >= 0; i--) {
      if (handlers.current[i]()) return true;
    }
    if (navRef.current.stack.length) {
      dispatch({ type: 'pop' });
      return true;
    }
    if (onExit) {
      onExit();
      return true;
    }
    return false;
  }, [closeSheet, onExit]);

  const value = useMemo<GlowzNavigation>(
    () => ({
      tab: nav.tab,
      stack: nav.stack,
      current: nav.stack.length ? nav.stack[nav.stack.length - 1] : null,
      canGoBack: nav.stack.length > 0 || !!sheet,
      push: (route) => dispatch({ type: 'push', route }),
      pop: () => dispatch({ type: 'pop' }),
      setTab: (tab) => dispatch({ type: 'setTab', tab }),
      goRoot: (tab) => dispatch({ type: 'reset', tab }),
      replaceStack: (tab, stack) => dispatch({ type: 'replaceStack', tab, stack }),
      setProviderTab: (tab) => dispatch({ type: 'setProviderTab', tab }),
      back,
      registerBackHandler,
      navState: nav,
    }),
    [nav, sheet, back, registerBackHandler],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useGlowzNav(): GlowzNavigation {
  const v = useContext(NavContext);
  if (!v) throw new Error('useGlowzNav must be used inside GlowzNavigationProvider');
  return v;
}
