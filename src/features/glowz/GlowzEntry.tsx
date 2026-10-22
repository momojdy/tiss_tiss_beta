import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { createInitialState } from './data/seeds';
import { GlowzHost, GlowzHostProvider } from './hooks/GlowzHostContext';
import { GlowzSheetProvider } from './hooks/GlowzSheetContext';
import { GlowzStoreProvider, useGlowzState } from './hooks/GlowzStore';
import { GlowzToastProvider } from './hooks/GlowzToast';
import { GlowzNavigationProvider } from './navigation/GlowzNavigationContext';
import type { GlowzNavState } from './navigation/GlowzNavigationTypes';
import { GlowzNavigator } from './navigation/GlowzNavigator';
import { GlowzLayoutProvider, Insets } from './styles/LayoutContext';
import { GlowzThemeProvider } from './styles/ThemeContext';
import { restoreSnapshot } from './utils/persistence';
import { createMemoryStorage, GlowzStorage, STATE_KEY } from './utils/storage';
import { setStorageOk } from './utils/storageStatus';
import type { GlowzState } from './types/state';

export interface GlowzEntryProps {
  /** Persistent storage (AsyncStorage, MMKV adapter). Defaults to memory: nothing survives a restart. */
  storage?: GlowzStorage;
  /** Safe-area insets from the host (for example from react-native-safe-area-context). */
  insets?: Insets;
  copyToClipboard?: GlowzHost['copyToClipboard'];
  pickImage?: GlowzHost['pickImage'];
  shareLink?: GlowzHost['shareLink'];
  /** Called when back is pressed on a root screen: lets the host leave Glowz. */
  onExit?: () => void;
}

function ThemedNavigator() {
  const { theme } = useGlowzState();
  return (
    <GlowzThemeProvider mode={theme}>
      <GlowzToastProvider>
        <GlowzNavigator />
      </GlowzToastProvider>
    </GlowzThemeProvider>
  );
}

function Loaded({ initial, nav, onExit }: { initial: GlowzState; nav: GlowzNavState; onExit?: () => void }) {
  return (
    <GlowzStoreProvider initial={initial}>
      <GlowzSheetProvider>
        <GlowzNavigationProvider initial={nav} onExit={onExit}>
          <ThemedNavigator />
        </GlowzNavigationProvider>
      </GlowzSheetProvider>
    </GlowzStoreProvider>
  );
}

/** Mount point of the Glowz feature. Loads saved state, then renders the navigator. */
export function GlowzEntry({ storage, insets, copyToClipboard, pickImage, shareLink, onExit }: GlowzEntryProps) {
  const store = useMemo(() => storage ?? createMemoryStorage(), [storage]);
  const host = useMemo<GlowzHost>(() => ({ storage: store, copyToClipboard, pickImage, shareLink }), [store, copyToClipboard, pickImage, shareLink]);
  const [loaded, setLoaded] = useState<{ state: GlowzState; nav: GlowzNavState } | null>(null);

  useEffect(() => {
    let alive = true;
    store
      .getItem(STATE_KEY)
      .then((json) => restoreSnapshot(json, createInitialState()))
      .catch(() => {
        setStorageOk(false);
        return { state: createInitialState(), nav: { tab: 'home', stack: [] } as GlowzNavState };
      })
      .then((r) => { if (alive) setLoaded(r); });
    return () => { alive = false; };
  }, [store]);

  return (
    <GlowzLayoutProvider insets={insets}>
      <GlowzHostProvider host={host}>
        {loaded ? <Loaded initial={loaded.state} nav={loaded.nav} onExit={onExit} /> : <View style={{ flex: 1, backgroundColor: '#FFF7F0' }} />}
      </GlowzHostProvider>
    </GlowzLayoutProvider>
  );
}
