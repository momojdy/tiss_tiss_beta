import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApi } from './ApiContext';

interface SavedValue {
  ids: string[];
  toggle: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const SavedContext = createContext<SavedValue | null>(null);

export const SavedProvider = ({ children }: { children: React.ReactNode }) => {
  const api = useApi();
  const [ids, setIds] = useState<string[]>([]);

  const reload = useCallback(async () => {
    try {
      setIds(await api.listSaved());
    } catch {
      setIds([]);
    }
  }, [api]);

  const toggle = useCallback(
    async (id: string) => {
      setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
      try {
        setIds(await api.toggleSaved(id));
      } catch {
        await reload();
      }
    },
    [api, reload],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => ({ ids, toggle, reload }), [ids, toggle, reload]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
};

export const useSaved = () => {
  const v = useContext(SavedContext);
  if (!v) throw new Error('SavedProvider missing');
  return v;
};
