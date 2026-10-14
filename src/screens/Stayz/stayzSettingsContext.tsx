import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CurrencyCode } from './stayzTypes';
import { Rates, formatMoney } from './stayzMoney';
import { fallbackRates, loadRates } from './stayzRates';
import { readJSON, writeJSON } from './stayzStorage';

interface Settings {
  currency: CurrencyCode;
  dark: boolean;
}

interface SettingsValue extends Settings {
  rates: Rates;
  setCurrency: (c: CurrencyCode) => void;
  setDark: (v: boolean) => void;
  money: (usd: number) => string;
}

const KEY = 'stayz.settings.v1';
const SettingsContext = createContext<SettingsValue | null>(null);

export const StayzSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [s, setS] = useState<Settings>({ currency: 'USD', dark: false });
  const [rates, setRates] = useState<Rates>(fallbackRates());

  useEffect(() => {
    readJSON<Settings>(KEY, { currency: 'USD', dark: false }).then(setS);
    loadRates().then(setRates);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setS(prev => {
      const next = { ...prev, ...patch };
      writeJSON(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      ...s,
      rates,
      setCurrency: currency => update({ currency }),
      setDark: dark => update({ dark }),
      money: usd => formatMoney(usd, s.currency, rates),
    }),
    [s, rates, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useStayzSettings = () => {
  const v = useContext(SettingsContext);
  if (!v) throw new Error('StayzSettingsProvider missing');
  return v;
};
