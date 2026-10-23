import React, { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrezoShell } from '../../components/prezo/navigation/PrezoShell';
import type { PrezoRepository } from '../../data/prezo/PrezoRepository';
import { createUnconnectedRepository } from '../../data/prezo/unconnectedRepository';
import type { PrezoRoute, PrezoThemeMode } from '../../types/prezo';
import { PrezoCampaignActionsProvider } from './PrezoCampaignActions';
import { PrezoDataProvider, usePrezoData } from './PrezoDataContext';
import { PrezoEnvironmentProvider } from './PrezoEnvironment';
import { PrezoExploreProvider } from './PrezoExploreContext';
import { PrezoNavigationProvider } from './PrezoNavigationContext';
import { PrezoThemeProvider } from './PrezoThemeContext';
import { PrezoToastProvider } from './PrezoToastContext';
import { usePrezoFonts } from './usePrezoFonts';

export interface PrezoStandaloneEntryProps {
  repository?: PrezoRepository;
  currencySymbol?: string;
  initialTheme?: PrezoThemeMode;
  initialRoute?: PrezoRoute;
  onExitRequested?: () => void;
}

const SavedThemeSync = ({ setMode }: { setMode: (mode: PrezoThemeMode) => void }) => {
  const data = usePrezoData();
  const saved = data.preferences.status === 'ready' ? data.preferences.data.theme : null;
  useEffect(() => {
    if (saved) setMode(saved);
  }, [saved, setMode]);
  return null;
};

export const PrezoStandaloneEntry = ({
  repository,
  currencySymbol = '$',
  initialTheme,
  initialRoute,
  onExitRequested,
}: PrezoStandaloneEntryProps) => {
  const fontsReady = usePrezoFonts();
  const scheme = useColorScheme();
  const [mode, setMode] = useState<PrezoThemeMode>(
    initialTheme ?? (scheme === 'light' ? 'light' : 'dark'),
  );
  const activeRepository = useMemo(() => repository ?? createUnconnectedRepository(), [repository]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <PrezoEnvironmentProvider currencySymbol={currencySymbol}>
        <PrezoThemeProvider mode={mode} setMode={setMode}>
          <PrezoToastProvider>
            <PrezoDataProvider repository={activeRepository}>
              <SavedThemeSync setMode={setMode} />
              <PrezoNavigationProvider initialRoute={initialRoute} onExitRequested={onExitRequested}>
                <PrezoExploreProvider>
                  <PrezoCampaignActionsProvider>
                    <PrezoShell />
                  </PrezoCampaignActionsProvider>
                </PrezoExploreProvider>
              </PrezoNavigationProvider>
            </PrezoDataProvider>
          </PrezoToastProvider>
        </PrezoThemeProvider>
      </PrezoEnvironmentProvider>
    </SafeAreaProvider>
  );
};

export default PrezoStandaloneEntry;

