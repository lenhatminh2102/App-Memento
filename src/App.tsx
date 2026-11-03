import { useCallback, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { configured, supabase } from './lib/supabase';
import { useProfile } from './hooks/useProfile';
import { useAuthSession } from './hooks/useAuthSession';
import { useAppNavigation } from './hooks/useAppNavigation';
import { usePushRegistration } from './hooks/usePushRegistration';
import { RouteView } from './navigation/RouteView';
import { BottomTabs } from './components/BottomTabs';
import Auth from './screens/Auth';
import { PersonalInfo } from './screens/Profile';
import { Body, Button, ErrorText, Loading, Page, Title, s } from './ui';

function Main() {
  const { session, loading, error, recovery, finishRecovery } = useAuthSession();
  const navigation = useAppNavigation();
  const { reset, back, route, canGoBack } = navigation;
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refresh,
  } = useProfile(session?.user.id);
  const openNotifications = useCallback(
    () => reset([{ name: 'messages' }, { name: 'notifications' }]),
    [reset],
  );
  usePushRegistration(session?.user.id, openNotifications);
  useEffect(() => {
    reset();
  }, [session?.user.id, reset]);

  if (!configured)
    return (
      <Page>
        <Title>Cấu hình Memento</Title>
        <Body>
          Chưa có cấu hình kết nối dữ liệu. Thêm hai giá trị Supabase public vào file .env theo
          .env.example rồi khởi động lại app.
        </Body>
      </Page>
    );
  if (loading) return <Loading />;
  if (!session || recovery)
    return (
      <>
        <ErrorText error={error} />
        <Auth recovery={recovery} onRecovered={finishRecovery} />
      </>
    );
  if (profileLoading) return <Loading />;
  if (profileError || !profile)
    return (
      <Page>
        <Title>Chưa tải được hồ sơ</Title>
        <ErrorText error={profileError || 'Không tìm thấy hồ sơ tài khoản.'} />
        <Button title="Thử lại" onPress={refresh} />
        <Button secondary title="Đăng xuất" onPress={() => supabase.auth.signOut()} />
      </Page>
    );
  if (profile.deleted_at || profile.banned_at)
    return (
      <Page>
        <Title>Tài khoản không khả dụng</Title>
        <Body>{profile.ban_reason || 'Tài khoản đã bị khóa hoặc đã xóa.'}</Body>
        <Button title="Đăng xuất" onPress={() => supabase.auth.signOut()} />
      </Page>
    );
  if (!profile.onboarding_completed)
    return (
      <PersonalInfo
        key={session.user.id}
        profile={profile}
        userId={session.user.id}
        onboarding
        done={refresh}
      />
    );

  return (
    <View style={s.page}>
      {canGoBack && (
        <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
          <Pressable accessibilityRole="button" onPress={back} style={{ paddingVertical: 10 }}>
            <Text style={s.heading}>‹ Quay lại</Text>
          </Pressable>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <RouteView
          route={route}
          user={session.user}
          profile={profile}
          refreshProfile={refresh}
          navigation={navigation}
        />
      </View>
      {!canGoBack && <BottomTabs selected={route.name} onSelect={(name) => reset([{ name }])} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.page}>
        <StatusBar style="dark" />
        <Main />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
