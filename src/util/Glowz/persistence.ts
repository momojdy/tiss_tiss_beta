import { AREAS } from '../data/areas';
import { HOME_SECTIONS } from '../data/sections';
import { POSTS } from '../data/posts';
import type { Booking, BookingStatus } from '../types/booking';
import type { ChatMessage, GlowzState, Notification, PictureChoice } from '../types/state';
import { GlowzNavState, GlowzRoute, RESTORABLE_ROUTES, ROOT_TABS } from '../navigation/GlowzNavigationTypes';
import { getProvider, getServiceById } from './catalog';
import { STATE_VERSION } from './storage';

const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && isFinite(x);
const isArr = (x: unknown): x is unknown[] => Array.isArray(x);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !isArr(x);

export interface Snapshot {
  v: number;
  nav: { tab: string; stack: GlowzRoute[] };
  state: Record<string, unknown>;
}

export function createSnapshot(state: GlowzState, nav: GlowzNavState): string {
  const { bk: _draft, toast: _t, ...rest } = state as GlowzState & { toast?: unknown };
  void _draft;
  void _t;
  const snap = {
    v: STATE_VERSION,
    nav: { tab: nav.tab, stack: nav.stack.filter((r) => RESTORABLE_ROUTES.includes(r.name)) },
    state: { ...rest, bookings: state.bookings.map((b) => ({ ...b, date: b.date.getTime() })) },
  };
  return JSON.stringify(snap);
}

const pictureOf = (x: unknown): PictureChoice => {
  if (!isObj(x)) return null;
  if (x.kind === 'uri' && isStr(x.uri) && x.uri.length < 400000) return { kind: 'uri', uri: x.uri };
  if (x.kind === 'tone' && isNum(x.index) && x.index >= 0 && x.index < 4) return { kind: 'tone', index: Math.floor(x.index) };
  return null;
};

export function sanitizeBookings(raw: unknown): Booking[] | null {
  if (!isArr(raw)) return null;
  const ST: BookingStatus[] = ['confirmed', 'pending', 'completed', 'cancelled'];
  const out: Booking[] = [];
  for (const b of raw) {
    if (!isObj(b)) continue;
    const items = b.items;
    if (!isStr(b.ref) || !isStr(b.p) || !getProvider(b.p)) continue;
    if (!isArr(items) || !items.length) continue;
    if (!items.every((i) => isObj(i) && isStr(i.id) && isStr(i.n) && isNum(i.price) && isNum(i.dur))) continue;
    if (!isStr(b.staff) || !isNum(b.date) || !isNum(b.time) || !isStr(b.status) || !ST.includes(b.status as BookingStatus)) continue;
    if (!isNum(b.total) || !isStr(b.paid) || !isStr(b.policy)) continue;
    out.push({
      ref: b.ref,
      p: b.p,
      items: items as Booking['items'],
      staff: b.staff,
      date: new Date(b.date),
      time: b.time,
      loc: b.loc === 'home' ? 'home' : 'salon',
      addr: isStr(b.addr) ? b.addr : undefined,
      status: b.status as BookingStatus,
      total: b.total,
      paid: b.paid,
      policy: b.policy,
      reviewed: b.reviewed === true ? true : b.reviewed === false ? false : undefined,
      review: isObj(b.review) && isNum(b.review.s) && isStr(b.review.t) ? { s: b.review.s, t: b.review.t } : undefined,
    });
  }
  return out.length ? out : null;
}

/**
 * Validates saved JSON field by field and layers the valid parts over the defaults.
 * Anything unknown, malformed or pointing at a missing record is dropped; corrupt JSON gives the defaults back.
 */
export function restoreSnapshot(json: string | null, base: GlowzState): { state: GlowzState; nav: GlowzNavState } {
  const fallback = { state: base, nav: { tab: 'home', stack: [] } as GlowzNavState };
  if (!json) return fallback;
  let o: unknown;
  try {
    o = JSON.parse(json);
  } catch {
    return fallback;
  }
  if (!isObj(o) || o.v !== STATE_VERSION || !isObj(o.state)) return fallback;
  const s = o.state;
  const next: GlowzState = { ...base };

  const ids = (k: string, ok: (id: string) => boolean): string[] | null => (isArr(s[k]) ? (s[k] as unknown[]).filter((x): x is string => isStr(x) && ok(x)) : null);
  const setIf = <K extends keyof GlowzState>(k: K, v: GlowzState[K] | null) => {
    if (v !== null) next[k] = v;
  };
  setIf('favP', ids('favP', (id) => !!getProvider(id)));
  setIf('follow', ids('follow', (id) => !!getProvider(id)));
  setIf('favS', ids('favS', (id) => !!getServiceById(id)));
  setIf('favX', ids('favX', (id) => POSTS.some((x) => x.id === id)));
  setIf('likes', ids('likes', (id) => POSTS.some((x) => x.id === id)));
  setIf('wl', ids('wl', (k) => /^p\d+\|\d+$/.test(k) && !!getProvider(k.split('|')[0])));
  const recent = ids('recent', (id) => !!getProvider(id));
  if (recent) next.recent = recent.slice(0, 8);

  if (isArr(s.notes)) {
    const n = (s.notes as unknown[]).filter(
      (x): x is Record<string, unknown> => isObj(x) && isStr(x.t) && isStr(x.s) && ['bdetail', 'chat', 'goSearch'].includes(x.a as string),
    );
    if (n.length) {
      next.notes = n.map((x): Notification => ({ t: x.t as string, s: x.s as string, a: x.a as Notification['a'], id: isStr(x.id) ? x.id : '', u: x.u ? 1 : 0, k: x.k === 'promo' ? 'promo' : undefined }));
    }
  }
  if (isObj(s.prefs)) {
    const prefs = { ...base.prefs };
    (Object.keys(prefs) as (keyof typeof prefs)[]).forEach((k) => {
      const v = (s.prefs as Record<string, unknown>)[k];
      if (typeof v === 'boolean') prefs[k] = v;
    });
    next.prefs = prefs;
  }
  if (isStr(s.area) && AREAS.includes(s.area)) next.area = s.area;
  if (isObj(s.profile) && isStr(s.profile.name) && s.profile.name.trim() && s.profile.name.length <= 40) {
    next.profile = { name: s.profile.name.trim(), phone: isStr(s.profile.phone) ? s.profile.phone.slice(0, 20) : '' };
  }
  if (isObj(s.chat)) {
    const chat: Record<string, ChatMessage[]> = {};
    for (const id of Object.keys(s.chat)) {
      const raw = (s.chat as Record<string, unknown>)[id];
      if (!getProvider(id) || !isArr(raw)) continue;
      const m = raw
        .filter((x): x is Record<string, unknown> => isObj(x) && isStr(x.t) && (x.me === 0 || x.me === 1))
        .map((x): ChatMessage => ({ me: x.me as 0 | 1, t: (x.t as string).slice(0, 500), auto: x.auto ? 1 : undefined }));
      if (m.length) chat[id] = m;
    }
    next.chat = chat;
  }
  if (isObj(s.chatU)) {
    const c: Record<string, boolean> = {};
    for (const id of Object.keys(s.chatU)) if (getProvider(id) && (s.chatU as Record<string, unknown>)[id] === true) c[id] = true;
    next.chatU = c;
  }
  if (isArr(s.reports)) {
    next.reports = (s.reports as unknown[])
      .filter((r): r is Record<string, unknown> => isObj(r) && isStr(r.r) && isStr(r.pid))
      .slice(-50)
      .map((r) => ({ pid: r.pid as string, r: r.r as string, t: isStr(r.t) ? r.t : '', at: isNum(r.at) ? r.at : 0 }));
  }
  const bookings = sanitizeBookings(s.bookings);
  if (bookings) next.bookings = bookings;
  if (s.theme === 'dark' || s.theme === 'light') next.theme = s.theme;
  if (s.btab === 'up' || s.btab === 'pend' || s.btab === 'done' || s.btab === 'canc') next.btab = s.btab;
  if (s.ftab === 'p' || s.ftab === 's' || s.ftab === 'x') next.ftab = s.ftab;
  next.cover = pictureOf(s.cover);
  next.avatar = pictureOf(s.avatar);

  const nav: GlowzNavState = { tab: 'home', stack: [] };
  const rawNav = o.nav;
  if (isObj(rawNav)) {
    if (isStr(rawNav.tab) && (ROOT_TABS as string[]).includes(rawNav.tab)) nav.tab = rawNav.tab as GlowzNavState['tab'];
    if (isArr(rawNav.stack)) {
      const ok = (e: unknown): e is GlowzRoute => {
        if (!isObj(e) || !isStr(e.name) || !(RESTORABLE_ROUTES as string[]).includes(e.name)) return false;
        if (e.name === 'Provider' || e.name === 'Chat') return isStr(e.id) && !!getProvider(e.id);
        if (e.name === 'BookingDetail') return isStr(e.ref) && next.bookings.some((b) => b.ref === e.ref);
        if (e.name === 'SectionList') return isStr(e.id) && HOME_SECTIONS.some((x) => x.id === e.id) && isStr(e.title);
        return true;
      };
      nav.stack = (rawNav.stack as unknown[]).filter(ok).slice(0, 6);
    }
  }
  return { state: next, nav };
}
