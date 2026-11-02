import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

export const configured = !!(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://unconfigured.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'unconfigured',
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

// Register once at module scope. Refresh credentials only while the native app is active.
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
