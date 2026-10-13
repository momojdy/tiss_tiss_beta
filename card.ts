import { CardBrand } from '../types';

export const digits = (s: string) => s.replace(/\D/g, '');

export const detectBrand = (raw: string): CardBrand | null => {
  const n = digits(raw);
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]|[3-6]|7[01]|720))/.test(n)) return 'Mastercard';
  if (/^(6011|65|64[4-9])/.test(n)) return 'Discover';
  if (/^35(2[89]|[3-8])/.test(n)) return 'JCB';
  if (/^62/.test(n)) return 'UnionPay';
  return null;
};

export const luhn = (raw: string) => {
  const n = digits(raw);
  if (n.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
};

export const formatCardNumber = (raw: string) => digits(raw).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

export const formatExpiry = (raw: string) => {
  const d = digits(raw).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export const expiryValid = (v: string) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const end = new Date(year, month, 1);
  return end.getTime() > Date.now();
};
