import { useCallback, useEffect, useState } from 'react';
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true; set(s => ({ ...s, loading: true, error: undefined }));
    fn().then(data => alive && set({ data, loading: false }), e => alive && set({ error: e instanceof Error ? e.message : 'Something went wrong.', loading: false }));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: useCallback(() => setTick(x => x + 1), []) };
}