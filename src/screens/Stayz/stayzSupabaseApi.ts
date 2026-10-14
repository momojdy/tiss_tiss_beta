import { SupabaseClient } from '@supabase/supabase-js';
import { Booking, BookingInput, BookingResult, CardInput, ChatMessage, Listing, Notice, PaymentMethod, Review, Thread } from './stayzTypes';
import { StayzApi } from './stayzApi';

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

export const mapListing = (row: any): Listing => {
  const a = row.attributes ?? {};
  const num = (v: any) => (v === null || v === undefined || v === '' ? undefined : Number(v));
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    type: a.ptype,
    description: row.description ?? '',
    address: a.address ?? '',
    city: a.city ?? '',
    country: a.country ?? '',
    lat: Number(a.lat ?? 0),
    lng: Number(a.lng ?? 0),
    photos: row.photos ?? [],
    photoCats: a.photoCats ?? [],
    modes: (a.modes ?? ['Overnight']).map((m: string) => m.toLowerCase().replace(' ', '')),
    guests: Number(a.guests ?? 1),
    bedrooms: Number(a.bedrooms ?? 1),
    baths: Number(a.baths ?? 1),
    amenities: a.amenities ?? [],
    rooms: (a.rooms ?? []).map((r: any, i: number) => ({ id: r.id ?? String(i), name: r.name, qty: Number(r.qty ?? 1), sleeps: Number(r.sleeps ?? 2), price: Number(r.price ?? a.price ?? 0), photos: r.photos ?? [] })),
    hourly: (a.hourly ?? []).map((h: any) => ({ hours: Number(h.hours), price: Number(h.price) })),
    hrFrom: a.hrFrom ?? '08:00',
    hrUntil: a.hrUntil ?? '22:00',
    dayUse: (a.dayUse ?? []).map((d: any) => ({ from: d.from, until: d.until, price: Number(d.price) })),
    price: Number(a.price ?? row.price ?? 0),
    weekend: num(a.weekend),
    weekly: num(a.weekly),
    monthly: num(a.monthly),
    minNights: Number(a.minNights ?? 1),
    maxNights: num(a.maxNights),
    breakfast: num(a.breakfast),
    deposit: num(a.deposit),
    cxAllowed: a.cxAllowed !== false,
    cxFree: Number(a.cxFree ?? 48),
    cxLate: Number(a.cxLate ?? 0),
    cxNote: a.cxNote,
    extOn: a.extOn === true,
    extPrice: num(a.extPrice),
    checkin: a.checkin ?? '15:00',
    checkout: a.checkout ?? '11:00',
    rules: a.rules ?? '',
    instant: a.instant === true,
    verified: row.verified === true,
    stays: Number(row.stays ?? 0),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    promo: row.promo ?? undefined,
  };
};

export const createSupabaseApi = (db: SupabaseClient): StayzApi => {
  const rpc = async <T,>(name: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await db.rpc(name, args);
    fail(error);
    return data as T;
  };

  const userId = async () => {
    const { data } = await db.auth.getUser();
    if (!data.user) throw new Error('auth');
    return data.user.id;
  };

  return {
    async searchListings(q) {
      const { data, error } = await db.from('stayz_listings_view').select('*');
      fail(error);
      const hidden = await rpc<string[]>('stayz_unavailable_listings', { p_mode: q.mode, p_start: q.start, p_end: q.end });
      return (data ?? []).map(mapListing).filter(l => l.modes.includes(q.mode) && !hidden.includes(l.id));
    },
    async getListing(id) {
      const { data, error } = await db.from('stayz_listings_view').select('*').eq('id', id).single();
      fail(error);
      return mapListing(data);
    },
    async getListings(ids) {
      if (!ids.length) return [];
      const { data, error } = await db.from('stayz_listings_view').select('*').in('id', ids);
      fail(error);
      return (data ?? []).map(mapListing);
    },
    getUnavailableDates: id => rpc<string[]>('stayz_unavailable_dates', { p_listing: id }),
    getBusyHours: (id, date) => rpc<string[]>('stayz_busy_hours', { p_listing: id, p_date: date }),
    async getReviews(id) {
      const { data, error } = await db.from('stayz_reviews_view').select('*').eq('listing_id', id).order('created_at', { ascending: false });
      fail(error);
      return (data ?? []).map((r: any): Review => ({ id: r.id, author: r.author, rating: Number(r.rating), text: r.body ?? '', createdAt: r.created_at }));
    },
    listBookings: () => rpc<Booking[]>('stayz_my_bookings'),
    getBooking: id => rpc<Booking>('stayz_booking', { p_id: id }),
    async createBooking(input: BookingInput): Promise<BookingResult> {
      try {
        return await rpc<BookingResult>('stayz_create_booking', {
          p_listing: input.listingId,
          p_mode: input.mode,
          p_start: input.start,
          p_end: input.end,
          p_guests: input.guests,
          p_room: input.roomId ?? null,
          p_breakfast: input.breakfast,
          p_special: input.special,
          p_method: input.methodId,
        });
      } catch (e) {
        return { ok: false, reason: (e as Error).message === 'auth' ? 'auth' : 'network' };
      }
    },
    cancelBooking: id => rpc<Booking>('stayz_cancel_booking', { p_id: id }),
    requestChange: (id, start, end, diff) => rpc<Booking>('stayz_request_change', { p_id: id, p_start: start, p_end: end, p_diff: diff }),
    requestExtension: (id, units, price, methodId) => rpc<Booking>('stayz_request_extension', { p_id: id, p_units: units, p_price: price, p_method: methodId }),
    async submitReview(bookingId, rating, text) {
      await rpc('stayz_submit_review', { p_booking: bookingId, p_rating: rating, p_body: text });
    },
    async listSaved() {
      const { data, error } = await db.from('stayz_saved').select('listing_id');
      fail(error);
      return (data ?? []).map((r: any) => r.listing_id as string);
    },
    async toggleSaved(id) {
      const uid = await userId();
      const { data } = await db.from('stayz_saved').select('listing_id').eq('listing_id', id).maybeSingle();
      if (data) fail((await db.from('stayz_saved').delete().eq('listing_id', id).eq('user_id', uid)).error);
      else fail((await db.from('stayz_saved').insert({ listing_id: id, user_id: uid })).error);
      const { data: all, error } = await db.from('stayz_saved').select('listing_id');
      fail(error);
      return (all ?? []).map((r: any) => r.listing_id as string);
    },
    async walletBalance() {
      return Number(await rpc<number>('stayz_wallet_balance'));
    },
    async listPaymentMethods() {
      const { data, error } = await db.from('stayz_payment_methods').select('*').order('created_at');
      fail(error);
      const saved = (data ?? []).map((m: any): PaymentMethod => ({ id: m.id, kind: m.kind, label: m.label, detail: m.detail ?? undefined, brand: m.brand ?? undefined }));
      return [
        { id: 'wallet', kind: 'wallet', label: 'Wallet' },
        ...saved,
        { id: 'moncash', kind: 'moncash', label: 'MonCash' },
        { id: 'natcash', kind: 'natcash', label: 'NatCash' },
      ].filter((m, i, a) => a.findIndex(x => x.id === m.id) === i);
    },
    async addCard(input: CardInput) {
      const { data, error } = await db.functions.invoke('stayz-add-card', { body: input });
      fail(error);
      return data as PaymentMethod;
    },
    async removeMethod(id) {
      fail((await db.from('stayz_payment_methods').delete().eq('id', id)).error);
    },
    listThreads: () => rpc<Thread[]>('stayz_threads'),
    startThread: (listingId, title) => rpc<string>('stayz_start_thread', { p_listing: listingId, p_title: title }),
    listMessages: id => rpc<ChatMessage[]>('stayz_messages', { p_thread: id }),
    sendMessage: (id, body) => rpc<ChatMessage>('stayz_send_message', { p_thread: id, p_body: body }),
    listNotices: () => rpc<Notice[]>('stayz_notices'),
    async markNoticesRead() {
      await rpc('stayz_mark_notices_read');
    },
  };
};
