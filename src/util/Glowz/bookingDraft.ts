import type { BookingDraft, BookingStep } from '../types/booking';
import type { Provider } from '../types/provider';
import { bookingTotals } from './pricing';
import { slotsFor } from './availability';
import type { Booking } from '../types/booking';
import { today } from './clock';

export const BOOKING_STEP_TITLES = ['Services', 'Professional', 'Date and time', 'Location', 'Review and pay'];
export const HOLD_MS = 300000;

/** The steps a draft walks through. A reschedule only picks a new time. */
export const stepsFor = (d: Pick<BookingDraft, 'resched'>): number[] => (d.resched ? [2] : [0, 1, 2, 3, 4]);

export function newDraft(p: Provider, serviceId: string | null): BookingDraft {
  return {
    pid: p.id,
    items: serviceId ? [{ id: serviceId, add: [] }] : [],
    staff: 'any',
    date: null,
    time: null,
    resolved: null,
    loc: p.type === 'home' ? 'home' : 'salon',
    addr: '',
    promo: '',
    applied: null,
    pay: null,
    dep: false,
    step: 0,
    ref: 'GLZ-' + (5000 + Math.floor(Math.random() * 4000)),
    processing: false,
    hold: 0,
  };
}

export function rescheduleDraft(b: Booking): BookingDraft {
  return {
    pid: b.p,
    items: b.items.map((i) => ({ id: i.id, add: [] })),
    staff: 'any',
    date: today(),
    time: null,
    resolved: null,
    loc: b.loc,
    addr: b.addr ?? '',
    promo: '',
    applied: null,
    pay: null,
    dep: false,
    step: 2,
    ref: b.ref,
    processing: false,
    hold: 0,
    resched: b.ref,
  };
}

/** Map of start time to the professional who would take it, for the chosen staff and date. */
export function resolveStaff(d: BookingDraft, p: Provider, bookings: Booking[]): Record<number, string> {
  const { dur } = bookingTotals(d, p);
  const list = d.staff === 'any' ? p.staff.map((s) => s.n) : [d.staff];
  const map: Record<number, string> = {};
  if (!d.date) return map;
  for (const n of list) {
    for (const m of slotsFor(p, n, d.date, dur, bookings)) {
      if (!map[m]) map[m] = n;
    }
  }
  return map;
}

export const isNumericStep = (s: BookingStep): s is 0 | 1 | 2 | 3 | 4 => s !== 'done';

/** Why Continue is disabled, or an empty string when it is enabled. */
export function stepHint(d: BookingDraft, ok: boolean): string {
  if (ok) return '';
  if (d.step === 0) return 'Select at least one service to continue.';
  if (d.step === 2) return 'Choose an available time to continue.';
  if (d.step === 4) return d.processing ? '' : 'Choose a payment method to continue.';
  return '';
}
