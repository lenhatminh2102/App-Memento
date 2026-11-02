import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import { HCAPTCHA_SITE_KEY, type CaptchaHandle } from '../lib/captcha';
import { Body } from '../ui';

const Captcha = forwardRef<CaptchaHandle>(function Captcha(_, ref) {
  const widget = useRef<ConfirmHcaptcha>(null);
  const pending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function finish(error?: Error, token?: string) {
    const request = pending.current;
    pending.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    widget.current?.hide();
    if (error) request?.reject(error);
    else if (token) request?.resolve(token);
  }
  useEffect(() => () => finish(new Error('Xác minh đã đóng.')), []);
  useImperativeHandle(ref, () => ({
    getToken: () => new Promise<string>((resolve, reject) => {
      if (pending.current) { reject(new Error('Một xác minh khác đang chạy.')); return; }
      if (!widget.current) { reject(new Error('CAPTCHA chưa sẵn sàng.')); return; }
      pending.current = { resolve, reject };
      timer.current = setTimeout(() => finish(new Error('Xác minh hết thời gian. Vui lòng thử lại.')), 180000);
      widget.current.show();
    }),
    reset: () => finish(new Error('Vui lòng xác minh lại CAPTCHA.')),
  }));
  return <><Body muted>Nhấn nút tiếp tục để xác minh bảo mật hCaptcha.</Body><ConfirmHcaptcha ref={widget} siteKey={HCAPTCHA_SITE_KEY} baseUrl="https://hcaptcha.com" size="normal" languageCode="vi" theme="light" sentry={false} userJourney={false} onMessage={event => {
    if (!pending.current) return;
    if (event.nativeEvent.data === 'open') return;
    if (event.success && event.nativeEvent.data.length > 35) {
      event.markUsed?.();
      finish(undefined, event.nativeEvent.data);
    } else {
      const cancelled = event.nativeEvent.data === 'cancel';
      finish(new Error(cancelled ? 'Bạn đã hủy xác minh CAPTCHA.' : 'Xác minh CAPTCHA chưa thành công. Vui lòng thử lại.'));
    }
  }} /></>;
});
export default Captcha;
