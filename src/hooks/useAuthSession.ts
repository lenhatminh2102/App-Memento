import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from '../lib/supabase';
import { isVerifyingAccountAction } from '../lib/authFlow';

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    let authEventReceived = false;
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      authEventReceived = true;
      setSession(next);
      setLoading(false);
      setError(null);
      if (event === 'PASSWORD_RECOVERY' && !isVerifyingAccountAction()) setRecovery(true);
      if (!next) setRecovery(false);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return;
        setSession(data.session);
        setError(error?.message || null);
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (!active || authEventReceived) return;
        setError(failure instanceof Error ? failure.message : 'Không tải được phiên đăng nhập.');
        setLoading(false);
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, error, recovery, finishRecovery: () => setRecovery(false) };
}
