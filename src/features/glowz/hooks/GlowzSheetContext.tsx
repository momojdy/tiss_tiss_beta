import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/** Every bottom sheet the feature can show, with its parameters. */
export type SheetDescriptor =
  | { kind: 'filter' }
  | { kind: 'sort' }
  | { kind: 'area' }
  | { kind: 'review'; ref: string }
  | { kind: 'cancel'; ref: string }
  | { kind: 'report'; pid: string }
  | { kind: 'editProfile' }
  | { kind: 'photo'; pid: string; index: number }
  | { kind: 'discard' };

interface SheetValue {
  sheet: SheetDescriptor | null;
  openSheet: (s: SheetDescriptor) => void;
  closeSheet: () => void;
}

const SheetContext = createContext<SheetValue>({ sheet: null, openSheet: () => undefined, closeSheet: () => undefined });

export function GlowzSheetProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetDescriptor | null>(null);
  const openSheet = useCallback((s: SheetDescriptor) => setSheet(s), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const value = useMemo(() => ({ sheet, openSheet, closeSheet }), [sheet, openSheet, closeSheet]);
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

export const useGlowzSheet = (): SheetValue => useContext(SheetContext);
