import type { Booking } from '../types/booking';
import type { Provider } from '../types/provider';
import { nextSlot } from './availability';
import { fmtD, fmtT } from './format';

/** "Today, 11:00 AM", "Tomorrow, 9:30 AM", "Wed, Oct 21, 2:00 PM" or the 14-day empty message. */
export function nextSlotLabel(p: Provider, bookings: Booking[]): string {
  const n = nextSlot(p, bookings);
  if (!n) return 'No openings in 14 days';
  return (n.d === 0 ? 'Today' : n.d === 1 ? 'Tomorrow' : fmtD(n.date)) + ', ' + fmtT(n.time);
}