import { withAccountVerification } from '../lib/authFlow';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Captcha from '../components/Captcha';
import { withCaptcha, type CaptchaHandle } from '../lib/captcha';
import { verifyMyPassword } from '../lib/verifyPassword';
import { deleteMyAccount } from '../lib/deletedAccount';
import { Body, Button, Field, Page, Title, check } from '../ui';

export function AccountAction({
  action,
  email,
  done,
}: {
  action: 'email' | 'delete';
  email: string;
  done: () => void;
}) {
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [nextEmail, setNextEmail] = useState('');
  const captcha = useRef<CaptchaHandle>(null);
  return (
    <Page>
      <Title>{action === 'email' ? 'Đổi email' : 'Xóa tài khoản'}</Title>
      {step === 0 && (
        <>
          <Body>Xác minh mật khẩu và email hiện tại trước khi tiếp tục.</Body>
          <Field
            label="Mật khẩu hiện tại"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Captcha ref={captcha} />
          <Button
            title="Gửi mã xác minh"
            onPress={async () => {
              const verified = await verifyMyPassword(password);
              if (verified.result !== 'ok')
                throw new Error(
                  verified.result === 'locked'
                    ? 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
                    : 'Mật khẩu hiện tại chưa đúng hoặc chưa xác minh được.',
                );
              const meta = await supabase.auth.updateUser({
                data: { pending_action: action === 'email' ? 'change_email' : 'delete_account' },
              });
              check(meta.error?.message);
              const result = await withCaptcha(captcha.current, (options) =>
                supabase.auth.resetPasswordForEmail(email, options),
              );
              check(result.error?.message);
              setStep(1);
            }}
          />
        </>
      )}
      {step === 1 && (
        <>
          <Field
            label="Mã xác minh gửi tới email hiện tại"
            value={token}
            onChangeText={setToken}
            keyboardType="number-pad"
          />
          <Button
            title="Xác minh email"
            onPress={async () => {
              await withAccountVerification(async () => {
                const result = await supabase.auth.verifyOtp({
                  email,
                  token: token.trim(),
                  type: 'recovery',
                });
                check(result.error?.message);
                setToken('');
                setStep(2);
              });
            }}
          />
        </>
      )}
      {step === 2 && action === 'email' && (
        <>
          <Field
            label="Email mới"
            value={nextEmail}
            onChangeText={setNextEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            title="Gửi mã tới email mới"
            onPress={async () => {
              const { error } = await supabase.auth.updateUser({ email: nextEmail.trim() });
              check(error?.message);
              setStep(3);
            }}
          />
        </>
      )}
      {step === 3 && (
        <>
          <Field
            label="Mã xác minh email mới"
            value={token}
            onChangeText={setToken}
            keyboardType="number-pad"
          />
          <Button
            title="Xác nhận đổi email"
            onPress={async () => {
              const { error } = await supabase.auth.verifyOtp({
                email: nextEmail.trim(),
                token: token.trim(),
                type: 'email_change',
              });
              check(error?.message);
              await supabase.auth.updateUser({ data: { pending_action: null } });
              Alert.alert('Đã cập nhật email');
              done();
            }}
          />
        </>
      )}
      {step === 2 && action === 'delete' && (
        <>
          <Body>
            Xóa tài khoản sẽ vô hiệu hóa hồ sơ của bạn. Đơn hàng đang xử lý cần hoàn thành trước khi
            xóa.
          </Body>
          <Button
            title="Xác nhận xóa tài khoản"
            onPress={() => {
              Alert.alert('Xóa tài khoản?', 'Thao tác này không thể hoàn tác.', [
                { text: 'Giữ tài khoản', style: 'cancel' },
                {
                  text: 'Xóa tài khoản',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      const error = await deleteMyAccount();
                      if (error) throw new Error(error.message);
                      await supabase.auth.signOut();
                    })().catch((e) => Alert.alert('Chưa xóa được', e.message));
                  },
                },
              ]);
            }}
          />
        </>
      )}
    </Page>
  );
}
