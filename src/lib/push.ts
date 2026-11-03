import { Platform } from 'react-native';
import { supabase } from './supabase';

let currentToken: string | null = null;
async function saveToken(token: string) {
  currentToken = token;
  const { error } = await supabase.rpc('register_device_token', {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
}
export async function registerPush(onTap: () => void) {
  if (Platform.OS !== 'android') return () => {};
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Memento',
    importance: Notifications.AndroidImportance.HIGH,
  });
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return () => {};
  const token = await Notifications.getDevicePushTokenAsync();
  await saveToken(String(token.data));
  const rotated = Notifications.addPushTokenListener((token) => {
    void saveToken(String(token.data)).catch(console.warn);
  });
  const tapped = Notifications.addNotificationResponseReceivedListener(onTap);
  return () => {
    rotated.remove();
    tapped.remove();
  };
}
export async function signOutSafely() {
  if (currentToken) {
    const { error } = await supabase.rpc('unregister_device_token', { p_token: currentToken });
    if (error) throw error;
    currentToken = null;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
