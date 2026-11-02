import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { conversationToTarget, fetchConversations, fetchMessages, markConversationRead, sendMessage, subscribeConversation, type ChatMessage, type ChatTarget, type ConversationItem } from '../lib/chat';
import { fetchNotifications, markNotificationsRead, type AppNotification } from '../lib/notifications';
import { Body, Button, Card, ErrorText, Field, Page, Picture, Title, check, s } from '../ui';

export function Inbox({ open, notifications }: { open: (t: ChatTarget) => void; notifications: () => void }) {
  const [rows, setRows] = useState<ConversationItem[]>([]); const [error, setError] = useState<string | null>(null);
  async function load() { const r = await fetchConversations(); setRows(r.items); setError(r.error); }
  useEffect(() => { void load(); const ch = supabase.channel('native-inbox').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load(); }).subscribe(); return () => { void supabase.removeChannel(ch); }; }, []);
  return <Page><Title>Tin nhắn</Title><Button secondary title="Thông báo hệ thống" onPress={notifications} /><ErrorText error={error} />{rows.map(c => <Card key={c.conversation_id}><View style={s.row}><Picture avatar uri={c.partner_avatar} /><Text style={s.heading}>{c.partner_name}</Text></View><Body>{c.last_body || 'Chưa có tin nhắn'}</Body>{c.unread_count > 0 && <Body>{c.unread_count} tin chưa đọc</Body>}<Button secondary title="Mở trò chuyện" onPress={() => open(conversationToTarget(c))} /></Card>)}{!rows.length && <Body muted>Chưa có cuộc trò chuyện. Bạn có thể mở chat từ lịch hẹn.</Body>}<Button secondary title="Tải lại" onPress={load} /></Page>;
}
export function Chat({ target, userId }: { target: ChatTarget; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [body, setBody] = useState(''); const [error, setError] = useState<string | null>(null); const [hasMore, setHasMore] = useState(false);
  const load = async () => { const r = await fetchMessages(target.id); setMessages(r.messages); setHasMore(r.hasMore); setError(r.error); await markConversationRead(target.id); };
  useEffect(() => { void load(); return subscribeConversation(target.id, { onInsert: () => { void load(); }, onUpdate: () => { void load(); }, onResync: () => { void load(); } }); }, [target.id]);
  return <Page><Title>{target.partnerName}</Title><ErrorText error={error} />{hasMore && <Button secondary title="Tải tin cũ hơn" onPress={async () => { const r = await fetchMessages(target.id, messages[0]?.created_at); check(r.error); setMessages(previous => [...r.messages, ...previous]); setHasMore(r.hasMore); }} />}
    {messages.map(m => <View key={m.id} style={[s.card, { alignSelf: m.sender_id === userId ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.sender_id === userId ? '#DDF5EB' : 'white' }]}><Body>{m.body}</Body><Body muted>{new Date(m.created_at).toLocaleString('vi-VN')}{m.read_at && m.sender_id === userId ? ' · Đã xem' : ''}</Body></View>)}
    {target.canSend ? <Card><Field label="Tin nhắn" value={body} onChangeText={setBody} multiline maxLength={2000} /><Button title="Gửi" disabled={!body.trim()} onPress={async () => { const r = await sendMessage(target.id, body.trim()); check(r.error); setBody(''); await load(); }} /></Card> : <Body muted>Cuộc trò chuyện này chỉ cho phép xem lại.</Body>}
  </Page>;
}
export function Notifications({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AppNotification[]>([]); const [error, setError] = useState<string | null>(null);
  async function load() { const r = await fetchNotifications(userId); if (r) setRows(r); else setError('Không tải được thông báo.'); }
  useEffect(() => { void load(); }, [userId]);
  return <Page><Title>Thông báo</Title><ErrorText error={error} /><Button secondary title="Đánh dấu tất cả đã đọc" onPress={async () => { await markNotificationsRead(); await load(); }} />{rows.map(n => <Card key={n.id}><Text style={s.heading}>{n.read_at ? '' : '● '}{n.title}</Text><Body>{n.body}</Body><Body muted>{new Date(n.created_at).toLocaleString('vi-VN')}</Body></Card>)}{!rows.length && <Body muted>Chưa có thông báo.</Body>}<Button secondary title="Tải lại" onPress={load} /></Page>;
}
