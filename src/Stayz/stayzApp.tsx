import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SupabaseClient } from '@supabase/supabase-js';
import { StayzRootNavigator } from './stayzRootNavigator';
import { StayzApi } from './stayzApi';
import { demoApi } from './stayzDemoApi';
import { getSupabase } from './stayzSupabase';
import { createSupabaseApi } from './stayzSupabaseApi';
import { StayzApiProvider } from './stayzApiContext';
import { StayzDraftProvider } from './stayzDraftContext';
import { HostActions, StayzHostProvider } from './stayzHostContext';
import { StayzSavedProvider } from './stayzSavedContext';
import { StayzSearchProvider } from './stayzSearchContext';
import { StayzSettingsProvider, useStayzSettings } from './stayzSettingsContext';
import { StayzThemeProvider, useStayzTheme } from './stayzThemeContext';

export interface StayzAppProps extends Partial<HostActions> {
  client?: SupabaseClient;
  api?: StayzApi;
}

const noop = () => undefined;

const Themed = () => {
  const { dark } = useStayzSettings();
  return (
    <StayzThemeProvider isDark={dark}>
      <Navigation />
    </StayzThemeProvider>
  );
};

const Navigation = () => {
  const { colors, isDark } = useStayzTheme();
  const theme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.line, primary: colors.brand } };
  }, [colors, isDark]);
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <StayzRootNavigator />
    </NavigationContainer>
  );
};

export const StayzApp = ({ client, api, onOpenWallet = noop, onExitToWantiss = noop, onListProperty = noop }: StayzAppProps) => {
  const resolved = useMemo<StayzApi>(() => {
    if (api) return api;
    const db = client ?? getSupabase();
    return db ? createSupabaseApi(db) : demoApi;
  }, [api, client]);

  const actions = useMemo(() => ({ onOpenWallet, onExitToWantiss, onListProperty }), [onOpenWallet, onExitToWantiss, onListProperty]);

  return (
    <SafeAreaProvider>
      <StayzSettingsProvider>
        <StayzApiProvider api={resolved}>
          <StayzHostProvider actions={actions}>
            <StayzSearchProvider>
              <StayzSavedProvider>
                <StayzDraftProvider>
                  <Themed />
                </StayzDraftProvider>
              </StayzSavedProvider>
            </StayzSearchProvider>
          </StayzHostProvider>
        </StayzApiProvider>
      </StayzSettingsProvider>
    </SafeAreaProvider>
  );
};
