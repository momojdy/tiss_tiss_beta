import { PRICE } from '../data/prices';
import { PROMOS } from '../data/promos';
import type { BookingDraft, BookingTotals, PromoResult } from '../types/booking';
import type { PromoCode, Provider } from '../types/provider';
import { getServiceOf } from './catalog';
import { peso } from './format';

const SERVICE_FEE_RATE = 0.03;
export const DEPOSIT_RATE = 0.3;
export const isVenuePayment = (pay: string | null): boolean => pay === 'Pay at venue' || pay === 'Pay at service';

export function checkPromo(code: string, sub: number, p: Provider): PromoResult {
  const c = PROMOS[code as PromoCode];
  if (!c) return { ok: false, msg: 'That code is not valid.' };
  if (code === 'GLOW10' && p.promo !== 'GLOW10') return { ok: false, msg: 'GLOW10 does not apply to this provider.' };
  if (sub < c.min) return { ok: false, msg: `Spend at least ${peso(c.min)} to use ${code}.` };
  return {
    ok: true,
    amount: c.type === 'pct' ? Math.round((sub * c.v) / 100) : Math.min(c.v, sub),
    msg: c.label + ' applied.',
  };
}

export function addOnPrice(p: Provider, serviceId: string, name: string): number {
  const s = getServiceOf(p, serviceId);
  return s?.add.find((x) => x[0] === name)?.[1] ?? 0;
}

/** Totals for the draft: subtotal, promo, 3% service fee, travel and how much is due now. */
export function bookingTotals(b: BookingDraft, p: Provider): BookingTotals {
  let sub = 0;
  let dur = 0;
  for (const it of b.items) {
    const s = getServiceOf(p, it.id);
    if (!s) continue;
    sub += PRICE[it.id];
    dur += s.d;
    for (const a of it.add) sub += addOnPrice(p, it.id, a);
  }
  let disc = 0;
  if (b.applied) {
    const r = checkPromo(b.applied, sub, p);
    disc = r.ok ? r.amount : 0;
  }
  const fee = Math.round((sub - disc) * SERVICE_FEE_RATE);
  const trav = b.loc === 'home' && p.travel ? p.travel : 0;
  const total = sub - disc + fee + trav;
  const venue = isVenuePayment(b.pay);
  const now = venue ? 0 : b.dep ? Math.round(total * DEPOSIT_RATE) : total;
  return { sub, dur, disc, fee, trav, total, now, venue };
}

/** Starting-price services make the total an estimate. */
export const isEstimate = (b: BookingDraft, starting: Record<string, 1>): boolean => b.items.some((i) => starting[i.id]);
