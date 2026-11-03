import { useEffect, useState } from 'react';
import { Alert, Linking, Text } from 'react-native';
import type { Photographer } from '../types';
import { supabase } from '../lib/supabase';
import * as B from '../lib/bookings';
import { bookingToChatTarget, openBookingChat, type ChatTarget } from '../lib/chat';
import { Body, Button, Card, ErrorText, Field, Page, Title, check, s } from '../ui';

export function BookingForm({
  photographer: p,
  userId,
  done,
}: {
  photographer: Photographer;
  userId: string;
  done: () => void;
}) {
  const options = B.buildServiceOptions(p);
  const [selected, setSelected] = useState(options[0]?.id);
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('11:00');
  const [note, setNote] = useState('');
  return (
    <Page>
      <Title>Đặt lịch với {p.name}</Title>
      {options.map((o) => (
        <Button
          key={o.id}
          secondary={o.id !== selected}
          title={`${o.name} · ${B.formatVnd(o.price)}`}
          onPress={() => setSelected(o.id)}
        />
      ))}
      {!options.length && <Body muted>Nhiếp ảnh gia chưa công bố gói dịch vụ.</Body>}
      <Field
        label="Ngày chụp (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        placeholder="2026-12-01"
      />
      <Field label="Giờ bắt đầu (HH:mm)" value={start} onChangeText={setStart} />
      <Field label="Giờ kết thúc (HH:mm)" value={end} onChangeText={setEnd} />
      <Field label="Ghi chú, địa điểm" value={note} onChangeText={setNote} multiline />
      <Button
        title="Gửi yêu cầu đặt lịch"
        disabled={!selected}
        onPress={async () => {
          const option = options.find((o) => o.id === selected);
          if (!option) return;
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
            end <= start ||
            new Date(`${date}T${start}:00`).getTime() <= Date.now() ||
            !Number.isFinite(new Date(`${date}T${start}:00`).getTime())
          )
            throw new Error(
              'Kiểm tra ngày và giờ chụp; giờ kết thúc phải sau giờ bắt đầu và lịch phải ở tương lai.',
            );
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name,avatar_url')
            .eq('id', userId)
            .single();
          const result = await B.createBooking({
            client_id: userId,
            client_name: profile?.full_name,
            client_avatar: profile?.avatar_url,
            photographer_user_id: p.user_id ?? null,
            photographer_id: p.id,
            photographer_name: p.name,
            photographer_avatar: p.avatar,
            package_name: option.name,
            package_price: option.price,
            package_category: option.category,
            booking_date: date,
            start_time: start,
            end_time: end,
            client_note: note.trim() || null,
          });
          check(result.error);
          Alert.alert('Đã gửi yêu cầu', 'Chờ nhiếp ảnh gia xác nhận lịch chụp.');
          done();
        }}
      />
    </Page>
  );
}
export function Bookings({
  userId,
  openChat,
  detail,
}: {
  userId: string;
  openChat: (target: ChatTarget) => void;
  detail: (id: string) => void;
}) {
  const [rows, setRows] = useState<B.BookingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drive, setDrive] = useState('');
  async function load() {
    try {
      setRows(await B.fetchMyBookings(userId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được lịch hẹn.');
    }
  }
  useEffect(() => {
    void load();
    const ch = supabase
      .channel('native-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId]);
  async function action(fn: () => Promise<string | null>) {
    check(await fn());
    await load();
  }
  return (
    <Page>
      <Title>Lịch hẹn</Title>
      <ErrorText error={error} />
      {!rows.length && !error && <Body muted>Chưa có lịch hẹn.</Body>}
      {rows.map((b) => {
        const client = b.client_id === userId;
        return (
          <Card key={b.id}>
            <Text style={s.heading}>
              {client ? b.photographer_name : b.client_name || 'Khách hàng'}
            </Text>
            <Body>
              {b.package_name} · {B.formatVnd(b.package_price)}
            </Body>
            <Body>
              {b.booking_date} · {b.start_time}–{b.end_time}
            </Body>
            <Body>{B.bookingPhaseLabel(b)}</Body>
            {b.client_note && <Body muted>{b.client_note}</Body>}
            <Button
              secondary
              title="Chi tiết / thanh toán / bàn giao"
              onPress={() => detail(b.id)}
            />
            {!client && b.status === 'pending' && (
              <>
                <Button
                  title="Xác nhận lịch"
                  onPress={() => action(() => B.updateBookingStatus(b.id, 'confirmed'))}
                />
                <Button
                  secondary
                  title="Từ chối yêu cầu"
                  onPress={() => action(() => B.updateBookingStatus(b.id, 'rejected'))}
                />
              </>
            )}
            {!['cancelled', 'rejected'].includes(b.status) && (
              <Button
                secondary
                title="Nhắn tin"
                onPress={async () => {
                  const r = await openBookingChat(b.id);
                  check(r.error);
                  if (r.id) openChat(bookingToChatTarget(b, userId, r.id));
                }}
              />
            )}
            {client && B.isAwaitingDeposit(b) && (
              <>
                <Body>
                  Đặt cọc {B.DEPOSIT_PCT}%: {B.formatVnd(B.getDepositAmount(b))}. Chỉ xác nhận sau
                  khi đã chuyển khoản cho Memento.
                </Body>
                <Button
                  secondary
                  title={
                    B.isUserTransferReported(b)
                      ? 'Đang chờ xác nhận chuyển khoản'
                      : 'Tôi đã chuyển khoản đặt cọc'
                  }
                  disabled={B.isUserTransferReported(b)}
                  onPress={() => action(() => B.reportUserTransfer(b.id))}
                />
              </>
            )}
            {B.isPaid(b) &&
              B.isShootDay(b) &&
              !['cancelled', 'rejected', 'completed'].includes(b.status) &&
              !(client ? b.shoot_confirm_client_at : b.shoot_confirm_ptg_at) && (
                <Button
                  title="Xác nhận đã chụp xong"
                  onPress={() => action(() => B.confirmShoot(b.id))}
                />
              )}
            {!client &&
              B.bothShootConfirmed(b) &&
              !['completed', 'cancelled', 'rejected'].includes(b.status) && (
                <>
                  <Field
                    label="Link Google Drive bàn giao"
                    value={drive}
                    onChangeText={setDrive}
                    autoCapitalize="none"
                  />
                  <Button
                    title="Gửi ảnh bàn giao"
                    onPress={() => action(() => B.submitDriveUrl(b.id, drive.trim()))}
                  />
                </>
              )}
            {b.drive_url && (!client || b.final_paid_at || b.drive_released_at) && (
              <Button
                secondary
                title="Mở ảnh bàn giao"
                onPress={async () => {
                  if (!/^https:\/\//.test(b.drive_url!))
                    throw new Error('Link bàn giao không hợp lệ.');
                  await Linking.openURL(b.drive_url!);
                }}
              />
            )}
            {B.cancelMode(b) === 'free' && (
              <Button
                secondary
                title="Hủy lịch hẹn"
                onPress={() =>
                  new Promise<void>((resolve) =>
                    Alert.alert('Hủy lịch hẹn?', 'Bạn muốn hủy yêu cầu này?', [
                      { text: 'Giữ lại', onPress: () => resolve() },
                      {
                        text: 'Hủy lịch',
                        style: 'destructive',
                        onPress: () => {
                          void action(() => B.updateBookingStatus(b.id, 'cancelled'))
                            .then(resolve)
                            .catch((e) => {
                              Alert.alert('Lỗi', e.message);
                              resolve();
                            });
                        },
                      },
                    ]),
                  )
                }
              />
            )}
          </Card>
        );
      })}
      <Button secondary title="Tải lại" onPress={load} />
    </Page>
  );
}
