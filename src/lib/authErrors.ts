type AuthFailure = { code?: string; message?: string };

export function authErrorMessage(error: unknown): string {
  const failure = error && typeof error === 'object' ? (error as AuthFailure) : {};
  const message = failure.message || (typeof error === 'string' ? error : '');
  if (failure.code === 'captcha_failed' || /captcha protection/i.test(message))
    return 'Xác minh CAPTCHA chưa hợp lệ hoặc đã hết hạn. Vui lòng xác minh lại rồi thử đăng nhập.';
  if (failure.code === 'invalid_credentials' || /invalid login credentials/i.test(message))
    return 'Email / tên đăng nhập hoặc mật khẩu chưa đúng.';
  if (failure.code === 'email_not_confirmed') return 'Bạn cần xác nhận email trước khi đăng nhập.';
  if (
    failure.code === 'over_request_rate_limit' ||
    failure.code === 'over_email_send_rate_limit' ||
    /rate limit/i.test(message)
  )
    return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.';
  if (/network request failed|failed to fetch|fetch failed/i.test(message))
    return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.';
  return message || 'Không thực hiện được yêu cầu. Vui lòng thử lại.';
}

export function assertAuthSuccess(error: AuthFailure | null | undefined): void {
  if (error) throw new Error(authErrorMessage(error));
}
