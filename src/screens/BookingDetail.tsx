import { useEffect, useState } from 'react';
import { Alert, Linking, Text } from 'react-native';
import * as B from '../lib/bookings';
import { supabase } from '../lib/supabase';
import { Body, Button, Card, ErrorText, Field, Page, Picture, Title, check, s } from '../ui';

const payment = { bank: 'BIDV', account: '96247JRBXH224200509', accountName: 'HOANG VU DAT' };
export default function BookingDetail({ id, userId }: { id: string; userId: string }) {
  const [booking, setBooking] = useState<B.BookingRow | null>(null);
  const [feedback, setFeedback] = useState<B.PhotoFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [bank, setBank] = useState<B.MyBank>({
    bank_code: '',
    bank_name: '',
    bank_account: '',
    bank_account_name: '',
  });
  async function load() {
    const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (error) {
      setError(error.message);
      return;
    }
    setBooking(data as B.BookingRow);
    setFeedback(await B.fetchPhotoFeedback(id));
    setError(null);
  }
  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`native-booking:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);
  async function act(action: () => Promise<string | null>) {
    check(await action());
    await load();
  }
  const b = booking;
  if (!b)
    return (
      <Page>
        <Title>Chi tiết lịch hẹn</Title>
        <ErrorText error={error} />
        <Button secondary title="Tải lại" onPress={load} />
      </Page>
    );
  const client = b.client_id === userId;
  const role = client ? 'client' : 'ptg';
  const block = B.finalConfirmBlock(b, role, feedback.filter((f) => !f.resolved).length);
  const final = B.canPayFinalNow(b);
  const amount = final ? B.getRemainingAmount(b) : B.getDepositAmount(b);
  const description = final ? B.buildFinalDescription(b.id) : B.buildDepositDescription(b.id);
  return (
    <Page>
      <Title>{b.package_name}</Title>
      <Body>{B.bookingPhaseLabel(b)}</Body>
      <Body>
        {b.booking_date} · {b.start_time}–{b.end_time}
      </Body>
      <Body>{B.formatVnd(b.package_price)}</Body>
      <ErrorText error={error} />
      {client && (B.isAwaitingDeposit(b) || final) && (
        <Card>
          <Text style={s.heading}>{final ? 'Thanh toán phần còn lại' : 'Đặt cọc 20%'}</Text>
          <Picture uri={B.buildVietQrUrl({ ...payment, amount, description })} />
          <Body>Ngân hàng: {payment.bank}</Body>
          <Body>Chủ tài khoản: {payment.accountName}</Body>
          <Body>Số tài khoản: {payment.account}</Body>
          <Body>Số tiền: {B.formatVnd(amount)}</Body>
          <Body>Nội dung: {description}</Body>
          {!final && (
            <Button
              title={
                B.isUserTransferReported(b) ? 'Chờ xác nhận chuyển khoản' : 'Tôi đã chuyển khoản'
              }
              disabled={B.isUserTransferReported(b)}
              onPress={() => act(() => B.reportUserTransfer(b.id))}
            />
          )}
          <Body muted>Trạng thái được cập nhật sau khi hệ thống xác nhận nhận tiền.</Body>
        </Card>
      )}
      {b.drive_url && (!client || !!b.final_paid_at || !!b.drive_released_at) && (
        <Button title="Xem ảnh bàn giao" onPress={() => Linking.openURL(b.drive_url!)} />
      )}
      <Text style={s.heading}>Yêu cầu chỉnh sửa ảnh</Text>
      {feedback.map((f) => (
        <Card key={f.id}>
          <Body>
            {f.photo_label}: {f.note}
          </Body>
          <Body muted>{f.resolved ? 'Đã xử lý' : 'Chờ chỉnh sửa'}</Body>
          {f.image_urls?.map((uri) => (
            <Picture key={uri} uri={uri} />
          ))}
          {!client && !f.resolved && (
            <Button
              secondary
              title="Đánh dấu đã chỉnh xong"
              onPress={() => act(() => B.resolveFeedback(f.id, true))}
            />
          )}
        </Card>
      ))}
      {client && B.isPaid(b) && !['completed', 'cancelled', 'rejected'].includes(b.status) && (
        <Card>
          <Field label="Tên / số thứ tự ảnh" value={label} onChangeText={setLabel} />
          <Field label="Nội dung cần chỉnh" value={note} onChangeText={setNote} multiline />
          <Button
            title="Gửi yêu cầu chỉnh ảnh"
            onPress={async () => {
              if (!label.trim() || !note.trim()) throw new Error('Nhập ảnh cần chỉnh và nội dung.');
              const result = await B.addPhotoFeedback(b.id, userId, label, note);
              check(result.error);
              setLabel('');
              setNote('');
              await load();
            }}
          />
        </Card>
      )}
      {block ? (
        <Body muted>{block}</Body>
      ) : (
        !['completed', 'cancelled', 'rejected'].includes(b.status) && (
          <Button
            title="Xác nhận hoàn tất đơn"
            onPress={() => act(() => B.confirmOrderSuccess(b.id, role))}
          />
        )
      )}
      {B.cancelMode(b) === 'mutual' && (
        <Card>
          <Body>Hủy đơn đã đặt cọc cần cả hai bên đồng ý.</Body>
          <Button
            secondary
            title={
              B.cancelRequestState(b, userId) === 'mine'
                ? 'Rút yêu cầu hủy'
                : B.cancelRequestState(b, userId) === 'theirs'
                  ? 'Đồng ý hủy đơn'
                  : 'Yêu cầu hai bên hủy đơn'
            }
            onPress={async () => {
              if (B.cancelRequestState(b, userId) === 'mine')
                await act(() => B.withdrawCancelRequest(b.id));
              else {
                const result = await B.requestMutualCancel(b.id);
                check(result.error);
                await load();
              }
            }}
          />
        </Card>
      )}
      {client && b.refund_status === 'need_info' && (
        <Card>
          <Text style={s.heading}>Thông tin nhận hoàn cọc</Text>
          {(['bank_code', 'bank_name', 'bank_account', 'bank_account_name'] as const).map((key) => (
            <Field
              key={key}
              label={
                {
                  bank_code: 'Mã ngân hàng',
                  bank_name: 'Tên ngân hàng',
                  bank_account: 'Số tài khoản',
                  bank_account_name: 'Chủ tài khoản',
                }[key]
              }
              value={bank[key] || ''}
              onChangeText={(value) => setBank((current) => ({ ...current, [key]: value }))}
            />
          ))}
          <Button
            title="Gửi thông tin hoàn tiền"
            onPress={() => act(() => B.submitRefundInfo(b.id, bank, true))}
          />
        </Card>
      )}
      <Button
        secondary
        title="Ghim / bỏ ghim lịch hẹn"
        onPress={async () => {
          const result = await B.togglePinBooking(b.id);
          check(result.error);
          Alert.alert(result.pinned ? 'Đã ghim lịch' : 'Đã bỏ ghim');
        }}
      />
      <Button secondary title="Tải lại" onPress={load} />
    </Page>
  );
}
