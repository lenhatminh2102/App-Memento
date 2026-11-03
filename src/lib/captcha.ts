// Public site key restored from the original Memento hCaptcha integration.
export const HCAPTCHA_SITE_KEY =
  process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY || 'a4e4d806-e516-49a8-87b6-dc1e6d1c15f0';

export interface CaptchaHandle {
  getToken(): Promise<string>;
  reset(): void;
}

export function captchaOptions(token: string) {
  if (!token.trim()) throw new Error('Vui lòng hoàn thành xác minh CAPTCHA.');
  return { captchaToken: token };
}

export async function withCaptcha<T>(
  captcha: CaptchaHandle | null,
  action: (options: { captchaToken: string }) => Promise<T>,
): Promise<T> {
  if (!captcha) throw new Error('Xác minh bảo mật chưa sẵn sàng. Vui lòng thử lại.');
  try {
    const token = await captcha.getToken();
    return await action(captchaOptions(token));
  } finally {
    // Tokens are single-use, including when the password is wrong or the network fails.
    captcha.reset();
  }
}
