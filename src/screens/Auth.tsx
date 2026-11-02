import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Body, Button, Card, ErrorText, Field, Page, Title, s } from '../ui';
import { assertAuthSuccess, authErrorMessage } from '../lib/authErrors';
import Captcha from '../components/Captcha';
import { withCaptcha, type CaptchaHandle } from '../lib/captcha';

export default function Auth({ recovery, onRecovered }: { recovery: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify' | 'forgot' | 'recovery-code'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const captcha = useRef<CaptchaHandle>(null);
  async function perform(action: () => Promise<unknown>) {
    setError(null); setInfo(null);
    try { await action(); } catch (failure) { setError(authErrorMessage(failure)); }
  }
  async function submit() {
    const address = email.trim();
    if (recovery) {
      if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
      const { error } = await supabase.auth.updateUser({ password }); assertAuthSuccess(error); onRecovered(); return;
    }
    if (!address) throw new Error('Nhập email hoặc tên đăng nhập.');
    if (mode === 'forgot') { const { error } = await withCaptcha(captcha.current, options => supabase.auth.resetPasswordForEmail(address, options)); assertAuthSuccess(error); setMode('recovery-code'); return; }
    if (mode === 'verify' || mode === 'recovery-code') { const { error } = await supabase.auth.verifyOtp({ email: address, token: token.trim(), type: mode === 'verify' ? 'signup' : 'recovery' }); assertAuthSuccess(error); return; }
    if (mode === 'signup') {
      if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
      const { data, error } = await withCaptcha(captcha.current, options => supabase.auth.signUp({ email: address, password, options })); assertAuthSuccess(error);
      if (data.user?.identities?.length === 0) throw new Error('Không thể đăng ký bằng email này.');
      if (!data.session) setMode('verify'); return;
    }
    let resolved = address;
    if (!resolved.includes('@')) { const { data, error } = await supabase.rpc('find_email_by_username', { p_username: resolved }); if (error || !data) throw new Error('Tên đăng nhập hoặc mật khẩu chưa đúng.'); resolved = data; }
    const { error } = await withCaptcha(captcha.current, options => supabase.auth.signInWithPassword({ email: resolved, password, options })); assertAuthSuccess(error);
  }
  const title = recovery ? 'Đặt mật khẩu mới' : ({ login: 'Đăng nhập', signup: 'Tạo tài khoản', verify: 'Xác nhận email', forgot: 'Quên mật khẩu', 'recovery-code': 'Mã khôi phục' }[mode]);
  return <Page><View style={s.hero}><Text style={[s.title, { color: 'white' }]}>Memento</Text><Text style={[s.text, { color: '#BEE9DD' }]}>Kết nối cảm xúc qua từng khoảnh khắc</Text></View><Title>{title}</Title><Card>
    {!recovery && <Field label="Email / tên đăng nhập" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" />}
    {(recovery || mode === 'login' || mode === 'signup') && <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />}
    {(mode === 'verify' || mode === 'recovery-code') && <><Body>Nhập mã được gửi đến email của bạn.</Body><Field label="Mã xác nhận" value={token} onChangeText={setToken} keyboardType="number-pad" /></>}
    {!recovery && mode !== 'recovery-code' && <Captcha key={mode} ref={captcha} />}
    <ErrorText error={error} />{info && <Body>{info}</Body>}<Button title={title} onPress={() => perform(submit)} />
    {!recovery && <><Button secondary title={mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Quay lại đăng nhập'} onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setToken(''); setError(null); setInfo(null); }} />{mode === 'login' && <Button secondary title="Quên mật khẩu" onPress={() => { setMode('forgot'); setError(null); }} />}{mode === 'verify' && <Button secondary title="Gửi lại mã" onPress={() => perform(async () => { const { error } = await withCaptcha(captcha.current, options => supabase.auth.resend({ type: 'signup', email: email.trim(), options })); assertAuthSuccess(error); setInfo('Đã gửi lại mã xác nhận. Kiểm tra email của bạn.'); })} />}</>}
  </Card></Page>;
}
