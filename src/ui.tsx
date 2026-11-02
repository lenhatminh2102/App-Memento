import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors = { bg: '#F2F7F4', green: '#0C4139', mint: '#08B99A', muted: '#71867E', border: '#DBE7E0', white: '#FFFFFF' };
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, gap: 16, paddingBottom: 36 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 25, fontWeight: '800', color: colors.green }, heading: { fontSize: 19, fontWeight: '700', color: colors.green },
  text: { color: colors.green, fontSize: 15, lineHeight: 23 }, muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 14, color: colors.green, fontSize: 16 },
  button: { backgroundColor: colors.green, borderRadius: 14, padding: 15, alignItems: 'center', minHeight: 48 },
  secondary: { backgroundColor: '#DCF3EC' }, buttonText: { color: 'white', fontSize: 15, fontWeight: '700' },
  cover: { width: '100%', height: 220, borderRadius: 16, backgroundColor: colors.border },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border },
  hero: { padding: 24, gap: 18, borderRadius: 26, backgroundColor: colors.green },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 13, gap: 5 },
});
export function Page({ children }: { children: React.ReactNode }) {
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></KeyboardAvoidingView>;
}
export function Card({ children }: { children: React.ReactNode }) { return <View style={s.card}>{children}</View>; }
export function Title({ children }: { children: React.ReactNode }) { return <Text style={s.title}>{children}</Text>; }
export function Body({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) { return <Text style={muted ? s.muted : s.text}>{children}</Text>; }
export function Picture({ uri, avatar = false }: { uri?: string | null; avatar?: boolean }) {
  return uri ? <Image source={{ uri }} style={avatar ? s.avatar : s.cover} accessibilityLabel={avatar ? 'Ảnh đại diện' : 'Ảnh chụp'} /> : <View style={avatar ? s.avatar : s.cover} />;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={s.muted}>{label}</Text><TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.multiline && { minHeight: 100, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void | Promise<unknown>; secondary?: boolean; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  return <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={async () => { setBusy(true); try { await onPress(); } catch (e) { Alert.alert('Không thực hiện được', e instanceof Error ? e.message : 'Vui lòng thử lại.'); } finally { setBusy(false); } }} style={[s.button, secondary && s.secondary, (busy || disabled) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color={secondary ? colors.green : 'white'} /> : <Text style={[s.buttonText, secondary && { color: colors.green }]}>{title}</Text>}</Pressable>;
}
export function ErrorText({ error }: { error?: string | null }) { return error ? <Text accessibilityRole="alert" style={{ color: '#AF2737', lineHeight: 22 }}>{error}</Text> : null; }
export function Loading() { return <ActivityIndicator style={{ padding: 30 }} size="large" color={colors.mint} />; }
export function check(error: string | null | undefined) { if (error) throw new Error(error); }
