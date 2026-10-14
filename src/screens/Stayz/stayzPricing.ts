import { DayUseWindow, Listing, Quote, QuoteLine, Room, StayMode } from './stayzTypes';
import { addDays, diffDays, fromISO } from './stayzDates';
import { round2 } from './stayzMoney';

export const TAX_RATE = 0.1;
export const CLEANING_RATE = 0.022;

export interface QuoteInput {
  listing: Listing;
  mode: StayMode;
  startDate: string;
  endDate: string;
  hours: number;
  windowIndex: number;
  room: Room | null;
  adults: number;
  breakfast: boolean;
}

export const hasCleaning = (l: Listing) => l.type === 'Apartment' || l.type === 'Villa';

export const nightsOf = (start: string, end: string) => Math.max(1, diffDays(start, end));

export const nightlyPrices = (l: Listing, room: Room | null, start: string, nights: number) => {
  const base = room ? room.price : l.price;
  const out: number[] = [];
  for (let i = 0; i < nights; i++) {
    const dow = fromISO(addDays(start, i)).getDay();
    let p = l.weekend && (dow === 5 || dow === 6) ? l.weekend : base;
    if (nights >= 28 && l.monthly) p = l.monthly;
    else if (nights >= 7 && l.weekly) p = l.weekly;
    out.push(p);
  }
  return out;
};

export const hourlyPrice = (l: Listing, hours: number) => l.hourly.find(h => h.hours === hours)?.price ?? 0;

export const dayUseWindow = (l: Listing, i: number): DayUseWindow | undefined => l.dayUse[i] ?? l.dayUse[0];

export const startingPrice = (l: Listing, mode: StayMode, hours: number, windowIndex: number) => {
  if (mode === 'hourly') return { amount: hourlyPrice(l, hours) || Math.min(...l.hourly.map(h => h.price)), unit: hourlyPrice(l, hours) ? `${hours} hr` : 'from' };
  if (mode === 'dayuse') return { amount: dayUseWindow(l, windowIndex)?.price ?? 0, unit: 'day' };
  if (mode === 'extended') return { amount: l.monthly ?? l.weekly ?? l.price, unit: 'night' };
  return { amount: l.price, unit: 'night' };
};

export const quote = (i: QuoteInput): Quote => {
  const { listing: l, mode } = i;
  const lines: QuoteLine[] = [];
  let base = 0;
  let first = 0;
  let nights = 1;

  if (mode === 'hourly') {
    base = hourlyPrice(l, i.hours);
    first = base;
    lines.push({ label: `${i.hours} hour${i.hours > 1 ? 's' : ''}`, amount: base });
  } else if (mode === 'dayuse') {
    base = dayUseWindow(l, i.windowIndex)?.price ?? 0;
    first = base;
    lines.push({ label: 'Day use', amount: base });
  } else {
    nights = nightsOf(i.startDate, i.endDate);
    const prices = nightlyPrices(l, i.room, i.startDate, nights);
    base = prices.reduce((a, b) => a + b, 0);
    first = prices[0] ?? 0;
    lines.push({ label: `${nights} night${nights > 1 ? 's' : ''}${i.room ? ` · ${i.room.name}` : ''}`, amount: base });
  }

  const breakfast = mode === 'overnight' || mode === 'extended' ? (i.breakfast && l.breakfast ? round2(l.breakfast * i.adults * nights) : 0) : 0;
  if (breakfast) lines.push({ label: `Breakfast · ${i.adults} guest${i.adults > 1 ? 's' : ''} × ${nights} night${nights > 1 ? 's' : ''}`, amount: breakfast });

  const cleaning = hasCleaning(l) ? round2(first * CLEANING_RATE) : 0;
  if (cleaning) lines.push({ label: 'Cleaning fee', amount: cleaning });

  const discount = l.promo ? round2(base * (l.promo.percent / 100)) : 0;
  if (discount) lines.push({ label: l.promo!.title, amount: -discount, negative: true });

  const total = round2(base + breakfast + cleaning - discount);
  const tax = round2(total - total / (1 + TAX_RATE));
  return { base: round2(base), breakfast, cleaning, discount, total, tax, deposit: l.deposit ?? 0, lines };
};

export const extensionPrice = (l: Listing, mode: StayMode, units: number) => round2((l.extPrice ?? 0) * units);

export const extensionUnit = (mode: StayMode): 'hour' | 'night' => (mode === 'hourly' ? 'hour' : 'night');
