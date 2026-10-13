import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SupabaseClient } from '@supabase/supabase-js';
import { RootNavigator } from './navigation/RootNavigator';
import { StayzApi } from './services/api';
import { demoApi } from './services/demoApi';
import { getSupabase } from './services/supabase';
import { createSupabaseApi } from './services/supabaseApi';
import { ApiProvider } from './store/ApiContext';
import { DraftProvider } from './store/DraftContext';
import { HostActions, HostProvider } from './store/HostContext';
import { SavedProvider } from './store/SavedContext';
import { SearchProvider } from './store/SearchContext';
import { SettingsProvider, useSettings } from './store/SettingsContext';
import { ThemeProvider, useTheme } from './theme/ThemeContext';

export interface StayzAppProps extends Partial<HostActions> {
  client?: SupabaseClient;
  api?: StayzApi;
}

const noop = () => undefined;

const Themed = () => {
  const { dark } = useSettings();
  return (
    <ThemeProvider isDark={dark}>
      <Navigation />
    </ThemeProvider>
  );
};

const Navigation = () => {
  const { colors, isDark } = useTheme();
  const theme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.line, primary: colors.brand } };
  }, [colors, isDark]);
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
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
      <SettingsProvider>
        <ApiProvider api={resolved}>
          <HostProvider actions={actions}>
            <SearchProvider>
              <SavedProvider>
                <DraftProvider>
                  <Themed />
                </DraftProvider>
              </SavedProvider>
            </SearchProvider>
          </HostProvider>
        </ApiProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
};
