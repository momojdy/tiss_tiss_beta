import { Booking, Listing } from '../types';
import { combine, hoursBetween } from './dates';
import { round2 } from './money';

type Policy = Pick<Listing, 'cxAllowed' | 'cxFree' | 'cxLate'>;

export const policyText = (p: Policy) => {
  if (!p.cxAllowed) return 'Non-refundable. This property does not allow cancellations.';
  const late = p.cxLate > 0 ? `${p.cxLate}% refund after that.` : 'No refund after that.';
  return `Free cancellation until ${p.cxFree} hours before check-in. ${late}`;
};

export const shortPolicy = (p: Policy) => (!p.cxAllowed ? 'Non-refundable' : `Free cancellation ${p.cxFree}h before`);

export const refundPercent = (p: Policy, hoursLeft: number) => {
  if (!p.cxAllowed) return 0;
  return hoursLeft >= p.cxFree ? 100 : p.cxLate;
};

export const hoursToStart = (b: Booking, now = new Date()) => hoursBetween(now, new Date(b.start));

export const refundFor = (b: Booking, now = new Date()) => {
  const pct = refundPercent(b, hoursToStart(b, now));
  return { pct, amount: round2(b.total * (pct / 100)) };
};

export const canCancel = (b: Booking) => (b.status === 'Requested' || b.status === 'Accepted' || b.status === 'Upcoming') && new Date(b.start) > new Date();

export const startOf = (date: string, time: string) => combine(date, time);
