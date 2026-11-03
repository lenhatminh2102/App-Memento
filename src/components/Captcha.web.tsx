import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { HCAPTCHA_SITE_KEY, type CaptchaHandle } from '../lib/captcha';
import { Body, ErrorText } from '../ui';

const Captcha = forwardRef<CaptchaHandle>(function Captcha(_, ref) {
  const widget = useRef<HCaptcha>(null);
  const token = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // hCaptcha refuses bare localhost/127.0.0.1. Chromium resolves *.localhost
  // to this same machine; no hosts-file or public DNS changes are needed.
  const useDevelopmentHostname =
    __DEV__ &&
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);
  useEffect(() => {
    if (useDevelopmentHostname) {
      const destination = new URL(window.location.href);
      destination.hostname = 'memento.localhost';
      window.location.replace(destination.href);
    }
  }, [useDevelopmentHostname]);
  useImperativeHandle(ref, () => ({
    getToken: async () => {
      const current = token.current;
      token.current = null;
      if (!current) throw new Error('Vui lòng hoàn thành xác minh CAPTCHA bên dưới.');
      return current;
    },
    reset: () => {
      token.current = null;
      widget.current?.resetCaptcha();
    },
  }));
  if (useDevelopmentHostname) return <Body muted>Đang mở trang xác minh bảo mật…</Body>;
  return (
    <>
      <HCaptcha
        ref={widget}
        sitekey={HCAPTCHA_SITE_KEY}
        languageOverride="vi"
        reCaptchaCompat={false}
        sentry={false}
        onVerify={(value) => {
          token.current = value;
          setError(null);
        }}
        onExpire={() => {
          token.current = null;
        }}
        onChalExpired={() => {
          token.current = null;
        }}
        onError={() => {
          token.current = null;
          setError('Không tải được CAPTCHA. Kiểm tra mạng và thử lại.');
        }}
      />
      <ErrorText error={error} />
    </>
  );
});
export default Captcha;
