import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { supabase } from '../lib/supabase';
import { Body, Button, Card, ErrorText, Field, Page, Picture, Title, check, s } from '../ui';

type ApplicationRow = { user_id: string; full_name: string; bio: string; phone: string; avatar_url: string; banner_url: string; cccd_front_url: string; cccd_back_url: string; work_locations: string[]; selected_styles: string[]; boards: unknown[]; standalone_pins: string[]; rental_boards: unknown[]; rental_pins: string[]; price_groups: unknown[]; skill_makeup: boolean; skill_edit: boolean; skill_rental: boolean; status: string };
export default function Admin() {
  const [rows, setRows] = useState<ApplicationRow[]>([]); const [note, setNote] = useState(''); const [error, setError] = useState<string | null>(null);
  async function load() { const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return; const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).single(); if (profile?.role !== 'admin') { setError('Bạn không có quyền truy cập.'); return; } const { data, error } = await supabase.from('photographer_applications').select('*').eq('status', 'submitted').order('submitted_at', { ascending: false }); setError(error?.message || null); setRows(data || []); }
  useEffect(() => { void load(); }, []);
  async function decide(row: ApplicationRow, approved: boolean) {
    if (!approved && !note.trim()) throw new Error('Nhập lý do từ chối hồ sơ.');
    const decision = await supabase.from('photographer_applications').update({ status: approved ? 'approved' : 'rejected', admin_note: approved ? null : note.trim() }).eq('user_id', row.user_id); check(decision.error?.message);
    if (approved) {
      const role = await supabase.from('profiles').update({ role: 'photographer' }).eq('id', row.user_id); check(role.error?.message);
      const payload = { user_id: row.user_id, name: row.full_name, location: (row.work_locations || []).join(', '), specialty: row.selected_styles?.[0] || '', avatar: row.avatar_url, cover: row.banner_url, portfolio: row.standalone_pins || [], bio: row.bio, tags: row.selected_styles || [], boards: row.boards || [], standalone_pins: row.standalone_pins || [], rental_boards: row.rental_boards || [], rental_pins: row.rental_pins || [], price_groups: row.price_groups || [], skill_makeup: !!row.skill_makeup, skill_edit: !!row.skill_edit, skill_rental: !!row.skill_rental };
      const { data: existing, error } = await supabase.from('photographers').select('id').eq('user_id', row.user_id).maybeSingle(); check(error?.message);
      const result = existing ? await supabase.from('photographers').update(payload).eq('id', existing.id) : await supabase.from('photographers').insert({ ...payload, price: 0, rating: 0, bookings: 0 }); check(result.error?.message);
    }
    await load();
  }
  return <Page><Title>Duyệt nhiếp ảnh gia</Title><ErrorText error={error} />{rows.map(row => <Card key={row.user_id}><Text style={s.heading}>{row.full_name}</Text><Body>{row.phone}</Body><Body>{row.bio}</Body><Body>{(row.work_locations || []).join(', ')}</Body><Picture uri={row.banner_url} />{row.cccd_front_url && <Picture uri={row.cccd_front_url} />}{row.cccd_back_url && <Picture uri={row.cccd_back_url} />}<Field label="Lý do từ chối" value={note} onChangeText={setNote} multiline /><Button title="Duyệt hồ sơ" onPress={() => decide(row, true)} /><Button secondary title="Từ chối hồ sơ" onPress={() => decide(row, false)} /></Card>)}{!rows.length && <Body muted>Không có hồ sơ chờ duyệt.</Body>}<Button secondary title="Tải lại" onPress={load} /></Page>;
}
