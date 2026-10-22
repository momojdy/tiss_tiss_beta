import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { GlowzState } from '../types/state';

type Updater = (s: GlowzState) => GlowzState;

interface StoreValue {
  state: GlowzState;
  /** Functional update so concurrent actions never overwrite each other. */
  update: (fn: Updater) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function GlowzStoreProvider({ initial, children }: { initial: GlowzState; children: React.ReactNode }) {
  const [state, setState] = useState<GlowzState>(initial);
  const update = useCallback((fn: Updater) => setState(fn), []);
  const value = useMemo(() => ({ state, update }), [state, update]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useGlowzStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useGlowzStore must be used inside GlowzStoreProvider');
  return v;
}

export const useGlowzState = (): GlowzState => useGlowzStore().state;
