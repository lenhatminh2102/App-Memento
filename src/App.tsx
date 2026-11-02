import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './lib/supabase';
import { useProfile } from './hooks/useProfile';
import type { Photographer } from './types';
import type { ChatTarget } from './lib/chat';
import type { PhotoRequest } from './lib/photoRequests';
import Auth from './screens/Auth';
import { Explore, PhotographerDetail } from './screens/Explore';
import { BookingForm, Bookings } from './screens/Bookings';
import { Chat, Inbox, Notifications } from './screens/Inbox';
import { CreateRequest, RequestDetail, Requests } from './screens/Requests';
import { ChangePassword, PersonalInfo, ProfileMenu } from './screens/Profile';
import Application from './screens/Application';
import BookingDetail from './screens/BookingDetail';
import { AccountAction, verifyingAccountAction } from './screens/Account';
import { registerPush } from './lib/push';
import Admin from './screens/Admin';
import { Body, Button, ErrorText, Loading, Page, Title, colors, s } from './ui';

const tabs = [{ id: 'home', title: 'Trang chủ', icon: '⌂' }, { id: 'search', title: 'Khám phá', icon: '⌕' }, { id: 'bookings', title: 'Lịch hẹn', icon: '▦' }, { id: 'messages', title: 'Tin nhắn', icon: '✉' }, { id: 'profile', title: 'Hồ sơ', icon: '○' }];
type Route = { name: string; photographer?: Photographer; chat?: ChatTarget; request?: PhotoRequest; bookingId?: string };
function Main() {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true); const [authError, setAuthError] = useState<string | null>(null); const [recovery, setRecovery] = useState(false);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]); const route = stack[stack.length - 1]; const go = (name: string, rest: Omit<Route, 'name'> = {}) => setStack(previous => [...previous, { name, ...rest }]); const back = () => setStack(previous => previous.slice(0, -1));
  const { profile, loading: profileLoading, error: profileError, refresh } = useProfile(session?.user.id);
  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data, error }) => { setSession(data.session); setAuthError(error?.message || null); setLoading(false); }).catch(e => { setAuthError(e.message); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, next) => { setSession(next); if (event === 'PASSWORD_RECOVERY' && !verifyingAccountAction) setRecovery(true); if (!next) { setStack([{ name: 'home' }]); setRecovery(false); } });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { const handler = BackHandler.addEventListener('hardwareBackPress', () => { if (stack.length > 1) { back(); return true; } if (route.name !== 'home') { setStack([{ name: 'home' }]); return true; } return false; }); return () => handler.remove(); }, [stack]);
  useEffect(() => {
    if (!session?.user.id) return;
    let disposed = false; let cleanup: (() => void) | undefined;
    void registerPush(() => setStack([{ name: 'messages' }, { name: 'notifications' }])).then(stop => { if (disposed) stop(); else cleanup = stop; }).catch(e => console.warn('Đăng ký thông báo chưa thành công:', e.message));
    return () => { disposed = true; cleanup?.(); };
  }, [session?.user.id]);
  if (!configured) return <Page><Title>Cấu hình Memento</Title><Body>Chưa có cấu hình kết nối dữ liệu. Thêm hai giá trị Supabase public vào file .env theo .env.example rồi khởi động lại app.</Body></Page>;
  if (loading) return <Loading />;
  if (!session || recovery) return <><ErrorText error={authError} /><Auth recovery={recovery} onRecovered={() => setRecovery(false)} /></>;
  if (profileLoading) return <Loading />;
  if (profileError || !profile) return <Page><Title>Chưa tải được hồ sơ</Title><ErrorText error={profileError || 'Không tìm thấy hồ sơ tài khoản.'} /><Button title="Thử lại" onPress={refresh} /><Button secondary title="Đăng xuất" onPress={() => supabase.auth.signOut()} /></Page>;
  if (profile.deleted_at || profile.banned_at) return <Page><Title>Tài khoản không khả dụng</Title><Body>{profile.ban_reason || 'Tài khoản đã bị khóa hoặc đã xóa.'}</Body><Button title="Đăng xuất" onPress={() => supabase.auth.signOut()} /></Page>;
  const uid = session.user.id; const open = (p: Photographer) => go('photographer', { photographer: p }); const openChat = (chat: ChatTarget) => go('chat', { chat });
  if (!profile.onboarding_completed) return <PersonalInfo key={uid} profile={profile} userId={uid} onboarding done={refresh} />;
  let content: React.ReactNode;
  switch (route.name) {
    case 'home': case 'search': content = <Explore key={route.name} home={route.name === 'home'} open={open} requests={() => go('requests')} />; break;
    case 'photographer': content = route.photographer && <PhotographerDetail photographer={route.photographer} book={() => go('booking', { photographer: route.photographer })} />; break;
    case 'booking': content = route.photographer && <BookingForm photographer={route.photographer} userId={uid} done={() => setStack([{ name: 'bookings' }])} />; break;
    case 'bookings': content = <Bookings userId={uid} openChat={openChat} detail={bookingId => go('booking-detail', { bookingId })} />; break;
    case 'booking-detail': content = route.bookingId && <BookingDetail id={route.bookingId} userId={uid} />; break;
    case 'messages': content = <Inbox open={openChat} notifications={() => go('notifications')} />; break;
    case 'chat': content = route.chat && <Chat key={route.chat.id} target={route.chat} userId={uid} />; break;
    case 'notifications': content = <Notifications userId={uid} />; break;
    case 'profile': content = <ProfileMenu profile={profile} email={session.user.email || ''} go={go} />; break;
    case 'personal': content = <PersonalInfo profile={profile} userId={uid} done={() => { refresh(); back(); }} />; break;
    case 'password': content = <ChangePassword />; break;
    case 'email': case 'delete': content = <AccountAction action={route.name} email={session.user.email || ''} done={() => { refresh(); back(); }} />; break;
    case 'application': content = <Application userId={uid} />; break;
    case 'admin': content = profile.role === 'admin' ? <Admin /> : <Page><Body>Bạn không có quyền truy cập.</Body></Page>; break;
    case 'requests': case 'my-requests': content = <Requests key={route.name} userId={uid} mine={route.name === 'my-requests'} create={() => go('create-request')} open={request => go('request', { request })} />; break;
    case 'create-request': content = <CreateRequest name={profile.full_name || profile.username} done={() => setStack([{ name: 'profile' }, { name: 'my-requests' }])} />; break;
    case 'request': content = route.request && <RequestDetail request={route.request} userId={uid} photographer={profile.role === 'photographer'} done={() => setStack([{ name: 'bookings' }])} />; break;
    default: content = <Page><Title>Không tìm thấy màn hình</Title><Button title="Về trang chủ" onPress={() => setStack([{ name: 'home' }])} /></Page>;
  }
  return <View style={s.page}>{stack.length > 1 && <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}><Pressable accessibilityRole="button" onPress={back} style={{ paddingVertical: 10 }}><Text style={s.heading}>‹ Quay lại</Text></Pressable></View>}<View style={{ flex: 1 }}>{content}</View>{stack.length === 1 && <View style={s.tabs}>{tabs.map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: route.name === tab.id }} onPress={() => setStack([{ name: tab.id }])} style={s.tab}><Text style={{ fontSize: 24, color: route.name === tab.id ? colors.mint : colors.muted }}>{tab.icon}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: route.name === tab.id ? colors.mint : colors.muted }}>{tab.title}</Text></Pressable>)}</View>}</View>;
}
export default function App() { return <SafeAreaProvider><SafeAreaView style={s.page}><StatusBar style="dark" /><Main /></SafeAreaView></SafeAreaProvider>; }
