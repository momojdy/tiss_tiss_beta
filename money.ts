import { CurrencyCode } from '../types';

export const MARGIN = 1.0077;

export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string; decimals: number; fallback: number }> = {
  USD: { symbol: '$', name: 'US dollar', decimals: 2, fallback: 1 },
  HTG: { symbol: 'G ', name: 'Haitian gourde', decimals: 0, fallback: 131 },
  DOP: { symbol: 'RD$ ', name: 'Dominican peso', decimals: 0, fallback: 60 },
};

export type Rates = Record<CurrencyCode, number>;

export const convert = (usd: number, cur: CurrencyCode, rates: Rates) => (cur === 'USD' ? usd : usd * rates[cur] * MARGIN);

export const formatMoney = (usd: number, cur: CurrencyCode, rates: Rates) => {
  const c = CURRENCIES[cur];
  const v = convert(usd, cur, rates);
  const sign = v < 0 ? '-' : '';
  const body = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  return `${sign}${c.symbol}${body}`;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
