import { useEffect } from 'react';
import { registerPush } from '../lib/push';

export function usePushRegistration(userId: string | undefined, onTap: () => void) {
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void registerPush(onTap)
      .then((stop) => {
        if (disposed) stop();
        else cleanup = stop;
      })
      .catch((error: unknown) => {
        console.warn('Đăng ký thông báo chưa thành công:', error);
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [userId, onTap]);
}
