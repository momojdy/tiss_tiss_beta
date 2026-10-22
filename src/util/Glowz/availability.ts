import type { Booking } from '../../types/glowz/booking';
import type { Provider } from '../../types/glowz/provider';
import { DEMO_MIN, addDays, sameDay, today } from './clock';
import { hash } from './hash';

/** Whether a 30 minute block is taken. Deterministic mock plus the customer's own bookings. */
export function isBusy(p: Provider, staff: string, date: Date, blk: number, bookings: Booking[]): boolean {
  const own = bookings.some((b) => {
    if (b.p !== p.id || b.staff !== staff || !sameDay(b.date, date)) return false;
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    const dur = b.items.reduce((a, i) => a + i.dur, 0);
    return blk >= b.time / 30 && blk < (b.time + dur) / 30;
  });
  return own || hash(p.id + staff + date.getTime() + ':' + blk) % 100 < 26;
}

/** Start times (minutes after midnight) with enough free consecutive blocks. */
export function slotsFor(p: Provider, staff: string, date: Date, dur: number, bookings: Booking[]): number[] {
  const need = Math.ceil(dur / 30);
  const out: number[] = [];
  const isToday = sameDay(date, today());
  const closed = date.getDay() === 0 && p.id === 'p3';
  if (closed) return out;
  for (let m = 540; m + dur <= 1140; m += 30) {
    if (isToday && m < DEMO_MIN + 60) continue;
    let ok = true;
    for (let k = 0; k < need; k++) {
      if (isBusy(p, staff, date, m / 30 + k, bookings)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(m);
  }
  return out;
}

export interface NextSlot {
  date: Date;
  time: number;
  /** Days from today. */
  d: number;
}

export function nextSlot(p: Provider, bookings: Booking[]): NextSlot | null {
  const t = today();
  for (let d = 0; d < 14; d++) {
    const dt = addDays(t, d);
    const dur = p.svc[0].d;
    for (const s of p.staff) {
      const sl = slotsFor(p, s.n, dt, dur, bookings);
      if (sl.length) return { date: dt, time: sl[0], d };
    }
  }
  return null;
}

export function hasSlotsToday(p: Provider, bookings: Booking[]): boolean {
  return slotsFor(p, p.staff[0].n, today(), p.svc[0].d, bookings).length > 0;
}

/** Hours between the demo clock and the appointment start. */
export function hoursUntil(b: Booking): number {
  return (b.date.getTime() + b.time * 60000 - (today().getTime() + DEMO_MIN * 60000)) / 3600000;
}
