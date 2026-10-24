import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const expectedSupabaseUrl = 'https://ycbirmgppwavorwudlrv.supabase.co';
const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!configuredSupabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL. Configure the Wantiss Supabase project before starting the app.');
}

if (configuredSupabaseUrl !== expectedSupabaseUrl) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL does not match the configured Wantiss backend.');
}

if (!supabasePublishableKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Configure the public Supabase publishable key before starting the app.');
}

export const supabase = createClient(configuredSupabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
