import type { Booking } from '../../types/glowz/booking';
import type { GlowzState, Notification } from '../../types/glowz/state';
import { DEFAULT_FILTERS } from '../../util/Glowz/filtering';
import { addDays, today } from '../../util/Glowz/clock';

/** Sample bookings relative to today so "upcoming" always makes sense. */
export function seedBookings(): Booking[] {
  const d = (n: number): Date => addDays(today(), n);
  return [
    { ref: 'GLZ-4821', p: 'p1', items: [{ id: 'm1', n: 'Haircut and blow-dry', price: 850, dur: 45 }], staff: 'Bea Santos', date: d(3), time: 630, loc: 'salon', status: 'confirmed', total: 850, paid: 'Demo payment · nothing charged', policy: 'Free cancellation until 24 hours before. Late cancellation: 50% fee.' },
    { ref: 'GLZ-4790', p: 'p2', items: [{ id: 'n1', n: 'Gel manicure', price: 650, dur: 60 }], staff: 'Anne Reyes', date: d(6), time: 840, loc: 'salon', status: 'pending', total: 650, paid: 'Pay at venue', policy: 'Free cancellation until 12 hours before.' },
    { ref: 'GLZ-4702', p: 'p4', items: [{ id: 'f1', n: 'Hydrating facial', price: 1500, dur: 60 }], staff: 'Mika Dela Cruz', date: d(-12), time: 660, loc: 'salon', status: 'completed', total: 1350, paid: 'Demo payment · nothing charged', policy: 'Free cancellation until 24 hours before.', reviewed: false },
    { ref: 'GLZ-4655', p: 'p5', items: [{ id: 'b1', n: 'Haircut and fade', price: 350, dur: 40 }], staff: 'Ben Alcaraz', date: d(-30), time: 600, loc: 'salon', status: 'completed', total: 350, paid: 'Paid at venue', policy: 'Free cancellation until 2 hours before.', reviewed: true },
    { ref: 'GLZ-4611', p: 'p3', items: [{ id: 'l2', n: 'Brow lamination and tint', price: 1200, dur: 60 }], staff: 'Joy Mendoza', date: d(-20), time: 900, loc: 'salon', status: 'cancelled', total: 1200, paid: 'Demo refund · nothing was charged', policy: 'Free cancellation until 24 hours before.' },
  ];
}

export const seedNotifications = (): Notification[] => [
  { t: 'Booking confirmed', s: 'Maison Kulay Salon · haircut in 3 days', a: 'bdetail', id: 'GLZ-4821', u: 1 },
  { t: 'Bea replied to you', s: '"Yes, we can add a deep conditioning treatment."', a: 'chat', id: 'p1', u: 1 },
  { t: '₱200 off your next booking', s: 'Code FIRST200 ends Oct 31 · min ₱800', a: 'goSearch', id: '', u: 1, k: 'promo' },
  { t: 'How was your facial?', s: 'Glow Room Skin Clinic · leave a review', a: 'bdetail', id: 'GLZ-4702', u: 0 },
  { t: 'Refund processed', s: 'GLZ-4611 · shown as processed in this sample', a: 'bdetail', id: 'GLZ-4611', u: 0 },
];

export function createInitialState(): GlowzState {
  return {
    area: 'Makati',
    q: '',
    cat: null,
    sort: 'relevance',
    expl: 'providers',
    mapSel: null,
    f: { ...DEFAULT_FILTERS },
    favP: ['p1'],
    favS: ['m2'],
    favX: ['x2'],
    follow: ['p1'],
    likes: [],
    recent: ['p2', 'p3'],
    bookings: seedBookings(),
    reports: [],
    ftab: 'p',
    btab: 'up',
    prefs: { promo: true, reminders: true, follow: false, private: true },
    chat: {
      p1: [
        { me: 1, t: 'Hi! Can I add a deep conditioning treatment to my haircut?' },
        { me: 0, auto: 1, t: 'Yes, we can add a deep conditioning treatment. It is ₱250.' },
      ],
    },
    chatU: { p1: true },
    profile: { name: 'Maya Reyes', phone: '' },
    theme: 'light',
    cover: null,
    avatar: null,
    wl: [],
    notes: seedNotifications(),
    bk: null,
  };
}
