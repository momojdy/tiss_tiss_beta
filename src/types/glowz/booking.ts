export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';
export type LocationChoice = 'salon' | 'home';

export interface BookingItem {
  id: string;
  n: string;
  price: number;
  dur: number;
}

export interface BookingReview {
  s: number;
  t: string;
}

/** A saved booking. Price and policy are a snapshot taken at booking time. */
export interface Booking {
  ref: string;
  p: string;
  items: BookingItem[];
  staff: string;
  date: Date;
  time: number;
  loc: LocationChoice;
  addr?: string;
  status: BookingStatus;
  total: number;
  paid: string;
  policy: string;
  reviewed?: boolean;
  review?: BookingReview;
}

export interface DraftItem {
  id: string;
  add: string[];
}

export type BookingStep = 0 | 1 | 2 | 3 | 4 | 'done';

/** The in-progress booking. Lives in the store so every step keeps its choices. */
export interface BookingDraft {
  pid: string;
  items: DraftItem[];
  staff: string;
  date: Date | null;
  time: number | null;
  resolved: string | null;
  loc: LocationChoice;
  addr: string;
  addrErr?: string;
  promo: string;
  promoMsg?: string;
  applied: string | null;
  pay: string | null;
  dep: boolean;
  step: BookingStep;
  ref: string;
  processing: boolean;
  /** Epoch ms when the sample slot hold expires. */
  hold: number;
  /** Booking reference being rescheduled, when this draft moves an existing booking. */
  resched?: string;
}

export interface BookingTotals {
  sub: number;
  dur: number;
  disc: number;
  fee: number;
  trav: number;
  total: number;
  now: number;
  venue: boolean;
}

export type PromoResult = { ok: true; amount: number; msg: string } | { ok: false; msg: string };
