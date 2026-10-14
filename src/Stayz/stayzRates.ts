import { CURRENCIES, Rates } from './stayzMoney';
import { readJSON, writeJSON } from './stayzStorage';

const KEY = 'stayz.rates.v1';
const TTL = 6 * 3600 * 1000;

interface Cached {
  at: number;
  rates: Rates;
}

export const fallbackRates = (): Rates => ({ USD: 1, HTG: CURRENCIES.HTG.fallback, DOP: CURRENCIES.DOP.fallback });

export const loadRates = async (): Promise<Rates> => {
  const cached = await readJSON<Cached | null>(KEY, null);
  if (cached && Date.now() - cached.at < TTL) return cached.rates;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await res.json();
    const htg = Number(json?.rates?.HTG);
    const dop = Number(json?.rates?.DOP);
    if (!htg || !dop) throw new Error('rates');
    const rates: Rates = { USD: 1, HTG: htg, DOP: dop };
    await writeJSON(KEY, { at: Date.now(), rates });
    return rates;
  } catch {
    return cached?.rates ?? fallbackRates();
  }
};
