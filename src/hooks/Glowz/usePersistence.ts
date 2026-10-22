import { useEffect, useRef } from 'react';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { createSnapshot } from '../../util/Glowz/persistence';
import { setStorageOk } from '../../util/Glowz/storageStatus';
import { STATE_KEY, THEME_KEY } from '../../util/Glowz/storage';
import { useGlowzHost } from './GlowzHostContext';
import { useGlowzState } from './GlowzStore';

/** Saves state and navigation (debounced) whenever they change. Failures never crash the app. */
export function usePersistence(): void {
  const { storage } = useGlowzHost();
  const state = useGlowzState();
  const { navState } = useGlowzNav();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      storage
        .setItem(STATE_KEY, createSnapshot(state, navState))
        .then(() => storage.setItem(THEME_KEY, state.theme))
        .then(() => setStorageOk(true))
        .catch(() => setStorageOk(false));
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, navState, storage]);
}
