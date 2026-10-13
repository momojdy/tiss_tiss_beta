import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const useAsync = <T,>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then(r => {
        if (!cancelled && alive.current) setData(r);
      })
      .catch(e => {
        if (!cancelled && alive.current) setError(e instanceof Error ? e.message : 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled && alive.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, reload };
};
