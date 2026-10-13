import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface Draft {
  listingId: string;
  roomId?: string;
  breakfast: boolean;
  special: string;
  methodId: string;
}

interface DraftValue {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  reset: (listingId: string, roomId?: string) => void;
}

const blank = (listingId = '', roomId?: string): Draft => ({ listingId, roomId, breakfast: false, special: '', methodId: 'wallet' });

const DraftContext = createContext<DraftValue | null>(null);

export const DraftProvider = ({ children }: { children: React.ReactNode }) => {
  const [draft, setState] = useState<Draft>(blank());
  const setDraft = useCallback((patch: Partial<Draft>) => setState(prev => ({ ...prev, ...patch })), []);
  const reset = useCallback((listingId: string, roomId?: string) => setState(prev => ({ ...blank(listingId, roomId), methodId: prev.methodId })), []);
  const value = useMemo(() => ({ draft, setDraft, reset }), [draft, setDraft, reset]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
};

export const useDraft = () => {
  const v = useContext(DraftContext);
  if (!v) throw new Error('DraftProvider missing');
  return v;
};
