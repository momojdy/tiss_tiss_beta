import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  formatDateShort,
  formatDateTime,
  formatMoney,
  formatTimeLeft,
} from '../../lib/prezo/format';

interface PrezoEnvironmentValue {
  currencySymbol: string;
  now: number;
}

const PrezoEnvironmentContext = createContext<PrezoEnvironmentValue | null>(null);

interface ProviderProps {
  currencySymbol: string;
  tickMs?: number;
  children: React.ReactNode;
}

export const PrezoEnvironmentProvider = ({
  currencySymbol,
  tickMs = 30000,
  children,
}: ProviderProps) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  const value = useMemo(() => ({ currencySymbol, now }), [currencySymbol, now]);
  return (
    <PrezoEnvironmentContext.Provider value={value}>{children}</PrezoEnvironmentContext.Provider>
  );
};

export interface PrezoFormat {
  now: number;
  currencySymbol: string;
  money: (amount: number) => string;
  dateTime: (timestamp: number) => string;
  dateShort: (timestamp: number) => string;
  timeLeft: (deadline: number) => string;
}

export const usePrezoFormat = (): PrezoFormat => {
  const env = useContext(PrezoEnvironmentContext);
  if (!env) throw new Error('usePrezoFormat must be used inside PrezoEnvironmentProvider');
  return useMemo(
    () => ({
      now: env.now,
      currencySymbol: env.currencySymbol,
      money: (amount: number) => formatMoney(amount, env.currencySymbol),
      dateTime: formatDateTime,
      dateShort: formatDateShort,
      timeLeft: (deadline: number) => formatTimeLeft(deadline, env.now),
    }),
    [env],
  );
};

