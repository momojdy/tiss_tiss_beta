import { BookingInput, Listing, SearchState } from './stayzTypes';
import { addHours, combine, diffDays, hourSlots, pad } from './stayzDates';
import { dayUseWindow, quote } from './stayzPricing';

export const stayWindow = (l: Listing, s: SearchState) => {
  if (s.mode === 'hourly') {
    const start = combine(s.date, s.time);
    return { start, end: addHours(start, s.hours) };
  }
  if (s.mode === 'dayuse') {
    const w = dayUseWindow(l, s.windowIndex);
    return { start: combine(s.date, w?.from ?? '09:00'), end: combine(s.date, w?.until ?? '17:00') };
  }
  return { start: combine(s.date, l.checkin), end: combine(s.endDate, l.checkout) };
};

export const nightsFor = (s: SearchState) => Math.max(1, diffDays(s.date, s.endDate));

export const validHourlyStarts = (l: Listing, hours: number, busy: string[], date: string, now = new Date()) => {
  const all = hourSlots(l.hrFrom, l.hrUntil);
  const lastEnd = Number(l.hrUntil.split(':')[0]);
  return all.map(t => {
    const h = Number(t.split(':')[0]);
    const overlaps = Array.from({ length: hours }).some((_, i) => busy.includes(`${pad(h + i)}:00`));
    const fits = h + hours <= lastEnd;
    const past = combine(date, t) <= now;
    return { time: t, ok: fits && !overlaps && !past };
  });
};

export interface DraftLike {
  roomId?: string;
  breakfast: boolean;
  special: string;
  methodId: string;
}

export const buildQuote = (l: Listing, s: SearchState, d: DraftLike) =>
  quote({ listing: l, mode: s.mode, startDate: s.date, endDate: s.endDate, hours: s.hours, windowIndex: s.windowIndex, room: l.rooms.find(r => r.id === d.roomId) ?? null, adults: s.adults, breakfast: d.breakfast });

export const buildInput = (l: Listing, s: SearchState, d: DraftLike): BookingInput => {
  const w = stayWindow(l, s);
  return {
    listingId: l.id,
    mode: s.mode,
    start: w.start.toISOString(),
    end: w.end.toISOString(),
    guests: s.adults + s.children,
    roomId: d.roomId,
    breakfast: d.breakfast,
    special: d.special.trim(),
    methodId: d.methodId,
    quote: buildQuote(l, s, d),
  };
};
