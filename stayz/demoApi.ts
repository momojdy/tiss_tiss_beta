import { SAMPLE_LISTINGS } from '../data/sample';
import { addDays, today, toISO } from '../lib/dates';
import { detectBrand, digits } from '../lib/card';
import { refundFor } from '../lib/cancellation';
import { round2 } from '../lib/money';
import { Booking, BookingInput, BookingResult, CardInput, ChatMessage, Notice, PaymentMethod, Review, Thread } from '../types';
import { StayzApi } from './api';
import { readJSON, writeJSON } from './storage';

interface Store {
  bookings: Booking[];
  saved: string[];
  methods: PaymentMethod[];
  wallet: number;
  threads: Thread[];
  messages: Record<string, ChatMessage[]>;
  notices: Notice[];
  reviews: Record<string, Review[]>;
}

const KEY = 'stayz.demo.v1';

const empty = (): Store => ({
  bookings: [],
  saved: [],
  methods: [
    { id: 'wallet', kind: 'wallet', label: 'Wallet' },
    { id: 'moncash', kind: 'moncash', label: 'MonCash' },
    { id: 'natcash', kind: 'natcash', label: 'NatCash' },
  ],
  wallet: 182.4,
  threads: [],
  messages: {},
  notices: [],
  reviews: {},
});

let cache: Store | null = null;

const load = async () => {
  if (!cache) cache = await readJSON<Store>(KEY, empty());
  return cache;
};

const save = async (s: Store) => {
  cache = s;
  await writeJSON(KEY, s);
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const notice = (s: Store, title: string, body: string, bookingId?: string) => {
  s.notices.unshift({ id: uid(), title, body, createdAt: new Date().toISOString(), read: false, bookingId });
};

const doorCode = () => String(Math.floor(1000 + Math.random() * 9000));

const blockedFor = (id: string) => {
  const t = today();
  if (id === 'l-bleu') return [addDays(t, 6), addDays(t, 7), addDays(t, 8)];
  if (id === 'l-marina') return [addDays(t, 3)];
  return [];
};

const dateRange = (start: string, end: string) => {
  const out: string[] = [];
  let d = start;
  while (d < end) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out.length ? out : [start];
};

const sameDay = (iso: string, date: string) => toISO(new Date(iso)) === date;

export const demoApi: StayzApi = {
  async searchListings(q) {
    const s = await load();
    const taken = (id: string) => {
      const blocked = blockedFor(id);
      const wanted = q.mode === 'overnight' || q.mode === 'extended' ? dateRange(q.start, q.end) : [q.start];
      if (wanted.some(d => blocked.includes(d))) return true;
      if (q.mode === 'overnight' || q.mode === 'extended') {
        const listing = SAMPLE_LISTINGS.find(l => l.id === id)!;
        const rooms = listing.rooms.reduce((a, r) => a + r.qty, 0);
        const used = s.bookings.filter(b => b.listingId === id && !['Cancelled', 'No-show', 'Completed'].includes(b.status) && (b.mode === 'overnight' || b.mode === 'extended') && toISO(new Date(b.start)) < q.end && toISO(new Date(b.end)) > q.start).length;
        return used >= rooms;
      }
      return false;
    };
    return SAMPLE_LISTINGS.filter(l => l.modes.includes(q.mode) && !taken(l.id));
  },
  async getListing(id) {
    const l = SAMPLE_LISTINGS.find(x => x.id === id);
    if (!l) throw new Error('Listing not found');
    return l;
  },
  async getListings(ids) {
    return SAMPLE_LISTINGS.filter(l => ids.includes(l.id));
  },
  async getUnavailableDates(id) {
    const s = await load();
    const booked = s.bookings
      .filter(b => b.listingId === id && !['Cancelled', 'No-show', 'Completed'].includes(b.status) && (b.mode === 'overnight' || b.mode === 'extended'))
      .flatMap(b => dateRange(toISO(new Date(b.start)), toISO(new Date(b.end))));
    const listing = SAMPLE_LISTINGS.find(l => l.id === id);
    const rooms = listing ? listing.rooms.reduce((a, r) => a + r.qty, 0) : 1;
    const counts: Record<string, number> = {};
    booked.forEach(d => (counts[d] = (counts[d] ?? 0) + 1));
    const full = Object.keys(counts).filter(d => counts[d] >= rooms);
    return [...blockedFor(id), ...full];
  },
  async getBusyHours(id, date) {
    const s = await load();
    const out: string[] = [];
    s.bookings
      .filter(b => b.listingId === id && (b.mode === 'hourly' || b.mode === 'dayuse') && !['Cancelled', 'No-show'].includes(b.status) && sameDay(b.start, date))
      .forEach(b => {
        const a = new Date(b.start).getHours();
        const e = new Date(b.end).getHours();
        for (let h = a; h < e; h++) out.push(`${String(h).padStart(2, '0')}:00`);
      });
    return out;
  },
  async getReviews(id) {
    const s = await load();
    return s.reviews[id] ?? [];
  },
  async listBookings() {
    const s = await load();
    const now = new Date();
    let changed = false;
    s.bookings.forEach(b => {
      if (b.status === 'Upcoming' && new Date(b.start) <= now && new Date(b.end) > now) {
        b.status = 'Checked in';
        changed = true;
      }
      if ((b.status === 'Upcoming' || b.status === 'Checked in') && new Date(b.end) <= now) {
        b.status = 'Completed';
        changed = true;
      }
    });
    if (changed) await save(s);
    return [...s.bookings].sort((a, b) => b.start.localeCompare(a.start));
  },
  async getBooking(id) {
    const list = await demoApi.listBookings();
    const b = list.find(x => x.id === id);
    if (!b) throw new Error('Booking not found');
    return b;
  },
  async createBooking(input: BookingInput): Promise<BookingResult> {
    const s = await load();
    const l = SAMPLE_LISTINGS.find(x => x.id === input.listingId);
    if (!l) return { ok: false, reason: 'unavailable' };
    const method = s.methods.find(m => m.id === input.methodId);
    if (!method) return { ok: false, reason: 'declined' };
    const charge = round2(input.quote.total);
    if (method.kind === 'wallet' && s.wallet < charge) return { ok: false, reason: 'insufficient_balance' };
    if (method.kind === 'wallet') s.wallet = round2(s.wallet - charge);
    const room = l.rooms.find(r => r.id === input.roomId);
    const booking: Booking = {
      id: uid(),
      listingId: l.id,
      title: l.title,
      city: l.city,
      photo: l.photos[0],
      mode: input.mode,
      start: input.start,
      end: input.end,
      guests: input.guests,
      roomName: room?.name,
      status: l.instant ? 'Upcoming' : 'Requested',
      total: charge,
      breakfast: input.quote.breakfast > 0,
      breakfastAmount: input.quote.breakfast,
      cleaning: input.quote.cleaning,
      discount: input.quote.discount,
      deposit: input.quote.deposit,
      paymentLabel: method.detail ? `${method.label} ${method.detail}` : method.label,
      doorCode: doorCode(),
      cxAllowed: l.cxAllowed,
      cxFree: l.cxFree,
      cxLate: l.cxLate,
      extOn: l.extOn,
      extPrice: l.extPrice,
      special: input.special || undefined,
      reviewed: false,
      createdAt: new Date().toISOString(),
    };
    s.bookings.push(booking);
    notice(s, l.instant ? 'Booking confirmed' : 'Request sent', `${l.title} · ${l.city}`, booking.id);
    await save(s);
    return { ok: true, booking };
  },
  async cancelBooking(id) {
    const s = await load();
    const b = s.bookings.find(x => x.id === id);
    if (!b) throw new Error('Booking not found');
    const { amount } = refundFor(b);
    b.status = 'Cancelled';
    if (amount > 0) {
      b.refund = { amount, status: 'processing' };
    }
    notice(s, 'Booking cancelled', amount > 0 ? `Refund of $${amount.toFixed(2)} is on its way within 14 business days.` : 'This booking was cancelled without a refund.', b.id);
    await save(s);
    return b;
  },
  async requestChange(id, start, end, diff) {
    const s = await load();
    const b = s.bookings.find(x => x.id === id);
    if (!b) throw new Error('Booking not found');
    b.change = { start, end, diff, status: 'pending' };
    notice(s, 'Change requested', `${b.title}: waiting for the property to approve.`, b.id);
    await save(s);
    return b;
  },
  async requestExtension(id, units, price, methodId) {
    const s = await load();
    const b = s.bookings.find(x => x.id === id);
    if (!b) throw new Error('Booking not found');
    const m = s.methods.find(x => x.id === methodId);
    if (m?.kind === 'wallet') {
      if (s.wallet < price) throw new Error('insufficient_balance');
      s.wallet = round2(s.wallet - price);
    }
    b.extension = { units, unit: b.mode === 'hourly' ? 'hour' : 'night', price, status: 'pending' };
    notice(s, 'Extension requested', `${b.title}: the property will confirm if available.`, b.id);
    await save(s);
    return b;
  },
  async submitReview(bookingId, rating, text) {
    const s = await load();
    const b = s.bookings.find(x => x.id === bookingId);
    if (!b || b.status !== 'Completed' || b.reviewed) throw new Error('Not allowed');
    b.reviewed = true;
    s.reviews[b.listingId] = [{ id: uid(), author: 'You', rating, text, createdAt: new Date().toISOString() }, ...(s.reviews[b.listingId] ?? [])];
    await save(s);
  },
  async listSaved() {
    return (await load()).saved;
  },
  async toggleSaved(id) {
    const s = await load();
    s.saved = s.saved.includes(id) ? s.saved.filter(x => x !== id) : [...s.saved, id];
    await save(s);
    return s.saved;
  },
  async walletBalance() {
    return (await load()).wallet;
  },
  async listPaymentMethods() {
    return (await load()).methods;
  },
  async addCard(input: CardInput) {
    const s = await load();
    const n = digits(input.number);
    const brand = detectBrand(n);
    if (!brand) throw new Error('Unsupported card');
    const m: PaymentMethod = { id: uid(), kind: 'card', label: brand, detail: `•••• ${n.slice(-4)}`, brand };
    s.methods.push(m);
    await save(s);
    return m;
  },
  async removeMethod(id) {
    const s = await load();
    s.methods = s.methods.filter(m => m.id !== id || m.kind !== 'card');
    await save(s);
  },
  async listThreads() {
    return [...(await load()).threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async startThread(listingId, title) {
    const s = await load();
    const existing = s.threads.find(t => t.listingId === listingId);
    if (existing) return existing.id;
    const t: Thread = { id: uid(), listingId, title, last: '', updatedAt: new Date().toISOString(), unread: false };
    s.threads.push(t);
    s.messages[t.id] = [];
    await save(s);
    return t.id;
  },
  async listMessages(threadId) {
    return (await load()).messages[threadId] ?? [];
  },
  async sendMessage(threadId, body) {
    const s = await load();
    const m: ChatMessage = { id: uid(), mine: true, body, createdAt: new Date().toISOString() };
    s.messages[threadId] = [...(s.messages[threadId] ?? []), m];
    const t = s.threads.find(x => x.id === threadId);
    if (t) {
      t.last = body;
      t.updatedAt = m.createdAt;
    }
    await save(s);
    return m;
  },
  async listNotices() {
    return (await load()).notices;
  },
  async markNoticesRead() {
    const s = await load();
    s.notices.forEach(n => (n.read = true));
    await save(s);
  },
};
