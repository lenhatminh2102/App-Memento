import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Route } from '../navigation/routes';

export function useAppNavigation() {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const route = stack[stack.length - 1];
  const navigate = useCallback((next: Route) => setStack((previous) => [...previous, next]), []);
  const reset = useCallback((routes: Route[] = [{ name: 'home' }]) => {
    setStack(routes.length ? routes : [{ name: 'home' }]);
  }, []);
  const back = useCallback(
    () => setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous)),
    [],
  );

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        back();
        return true;
      }
      if (route.name !== 'home') {
        reset();
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [back, reset, route.name, stack.length]);

  return { route, navigate, reset, back, canGoBack: stack.length > 1 };
}
