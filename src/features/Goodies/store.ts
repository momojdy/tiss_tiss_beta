/* Goodies state, persistence, pricing and cart logic. */
import {useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../../lib/supabase';
import type {Store, Item, Address, CartLine, Order} from './data/types';
import {STAGES_DELIVERY, STAGES_PICKUP} from './data/seed';
export const KEY = 'goodies-live-v4';
export const WKEY = 'goodies-live-profile-v2';

/* The customer catalog is empty until published backend products are available. */
export const IT: Record<string, Item> = {};
export const STB: Record<string, Store> = {};
export const ST: Store[] = [];
export const PV: Record<string, boolean> = {};
export const PR: any[] = [];
export const contentHooks: {coupons?: () => any[]; fees?: () => any; minAge?: (cc: string) => number} = {};
const coupons = () => (contentHooks.coupons ? contentHooks.coupons() : []);
const feesNow = () => (contentHooks.fees ? contentHooks.fees() : {svc: 0, firstFree: false, far: 0, tips: [], lead: 0, step: 0, slots: 0, pay: {Wallet: 0, MonCash: 0, Card: 0, Cash: 0}, rfSvc: false, rfTip: false});
export const DEALS: any[] = [];

/* ---------- helpers ---------- */
const LOC: Record<string, string> = {en: 'en-US', fr: 'fr-FR', ht: 'fr-HT', es: 'es-ES', 'zh-Hans': 'zh-Hans-CN'};
/* Language only changes the number format. The currency stays USD until the Admin Display currency setting is wired in. */
export const money = (n: number) => {
  try {return new Intl.NumberFormat(LOC[S.lang] || 'en-US', {style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol'}).format(n);} catch (e) {return '$' + n.toFixed(2);}
};
export const fmtTime = (d: Date) => {
  try {return new Intl.DateTimeFormat(LOC[S.lang] || 'en-US', {hour: 'numeric', minute: '2-digit'}).format(d);} catch (e) {let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0'); return (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');}
};
export const fmtDay = (d: Date) => {
  try {return new Intl.DateTimeFormat(LOC[S.lang] || 'en-US', {month: 'short', day: 'numeric'}).format(d);} catch (e) {return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate();}
};
export const dp = (i: Item, off: number) => Math.round(i.p * (100 - off)) / 100;
export const cname = (id: string, cats: {id: string; name: any}[]) => (cats.find(c => c.id === id) as any)?.name || 'All stores';
const zoneOf = (t: string) => {let x = 0; for (let i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) % 97; return Math.round((x % 5) * 9) / 10;};
export const phoneOK = (s: string) => {s = String(s || '').trim(); const d = s.replace(/\D/g, ''); return /^[+\d][\d\s().-]*$/.test(s) && d.length >= 8 && d.length <= 15;};

/* ---------- state ---------- */
const WDEF = () => ({
  pf: {n: '', e: '', ph: '', av: ''},
  addr: [] as Address[],
});
const GDEF = () => ({
  notifs: [] as any[],
  orders: [] as Order[], cart: {sid: null as string | null, lines: [] as CartLine[]}, fav: [] as string[], favp: [] as string[], cards: [] as any[],
  wallet: 0, hasWallet: false, pay: 'cash', mode: 'delivery', tip: 0, promo: '', as: 0, gc: [] as any[], cc: 'w', np: {orders: 0, promos: 0}, rev: {} as any, driverRev: {} as any, rec: [] as any[], rv: [] as any[], groupOrder: null as any,
});
export const WP = ['pf', 'addr'], GP = ['notifs', 'orders', 'cart', 'fav', 'favp', 'cards', 'wallet', 'hasWallet', 'pay', 'mode', 'tip', 'promo', 'as', 'gc', 'cc', 'np', 'rev', 'driverRev', 'rec', 'rv', 'groupOrder'];

export interface Route {r: string; p?: any; u: number; sy?: number}
export const S: any = Object.assign(WDEF(), GDEF());
let uid = 0;
S.stack = [{r: 'home', u: ++uid}] as Route[];
Object.assign(S, {f: '', sub: '', ot: 'active', ft: 'stores', sh: null, pend: null, bump: 0, cs: 0, time: 'ASAP', sch: 0, note: '', pin: '', busy: 0, ss: {}, srt: 'rel', sr: {q: '', sort: 'rel', f: {}}, theme: 'light', lang: 'en', ready: false});

/* ---------- subscription ---------- */
const subs = new Set<() => void>();
let ver = 0;
export const emit = () => {ver++; subs.forEach(f => f());};
export function useGoodies() {return useSyncExternalStore(cb => {subs.add(cb); return () => {subs.delete(cb);};}, () => ver);}

/* ---------- ui bridge (toast / sheet) ---------- */
export const ui: {toast: (t: string) => void; sheet: (h: any) => void; close: () => void} = {toast: () => {}, sheet: () => {}, close: () => {}};
export const toast = (t: string) => ui.toast(t);

function formatHour(d: Date) {
  let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return (h % 12 || 12) + (m === '00' ? '' : ':' + m) + (h >= 12 ? 'pm' : 'am');
}

export async function refreshLiveSchedules() {
  emit();
}

/* ---------- persistence ---------- */
export async function load() {
  const merge = async (key: string, D: any) => {
    try {
      const raw = JSON.parse((await AsyncStorage.getItem(key)) || 'null');
      if (raw && typeof raw === 'object') for (const k in D) if (raw[k] !== undefined && typeof raw[k] === typeof D[k] && Array.isArray(raw[k]) === Array.isArray(D[k])) S[k] = raw[k];
    } catch (e) {}
  };
  await merge(WKEY, WDEF()); await merge(KEY, GDEF());
  try {const t = await AsyncStorage.getItem('goodies-theme'); if (t === 'light' || t === 'dark') S.theme = t;} catch (e) {}
  try {const l = await AsyncStorage.getItem('goodies-lang'); if (l) S.lang = l;} catch (e) {}
  /* sanitise exactly like v24 */
  const c = S.cart;
  if (!c || !Array.isArray(c.lines)) S.cart = {sid: null, lines: []};
  S.cart.lines = S.cart.lines.filter((l: any) => l && ((l.byo && l.byo.bid && l.byo.sel && l.byo.lines) || IT[l.id]) && l.q > 0);
  if (!S.cart.lines.length) S.cart.sid = null;
  S.orders = S.orders.filter((o: any) => o && STB[o.sid] && Array.isArray(o.lines));
  S.fav = S.fav.filter((x: string) => STB[x]); S.favp = S.favp.filter((x: string) => IT[x]);
  S.addr = S.addr.filter((a: any) => a && a.t); if (!S.addr.length) S.addr = WDEF().addr;
  S.addr.forEach((a: any) => {if (typeof a.z !== 'number') a.z = zoneOf(a.t); if (!a.cc) a.cc = 'HT';});
  if (S.addr.length && !S.addr.some((a: Address) => a.def)) S.addr[0].def = 1;
  if (!S.pf || !S.pf.n) S.pf = WDEF().pf; if (!S.pf.ph) S.pf.ph = WDEF().pf.ph;
  S.gc = S.gc.filter((c: any) => c && c.id && c.ph);
  if (S.cc !== 'w' && !S.gc.some((c: any) => c.id === S.cc)) S.cc = 'w';
  if (!S.addr.some((a: Address) => a.id === S.as)) S.as = defAddr()?.id ?? 0;
  await refreshLiveSchedules();
  applyZone(); S.ready = true; emit();
}
export function save() {
  try {
    const w: any = {}, g: any = {};
    WP.forEach(k => (w[k] = S[k])); GP.forEach(k => (g[k] = S[k]));
    AsyncStorage.setItem(WKEY, JSON.stringify(w)); AsyncStorage.setItem(KEY, JSON.stringify(g));
  } catch (e) {}
}
export const setTheme = (t: 'light' | 'dark') => {S.theme = t; AsyncStorage.setItem('goodies-theme', t); emit();};
export const setLang = (l: string) => {S.lang = l; AsyncStorage.setItem('goodies-lang', l); emit();};

/* ---------- derived ---------- */
export const defAddr = (): Address => S.addr.filter((a: Address) => a.def)[0] || S.addr[0];
export const addr = (): Address => S.addr.filter((a: Address) => a.id === S.as)[0] || defAddr();
export const cur = (): Route => S.stack[S.stack.length - 1];
export const cnt = () => S.cart.lines.reduce((a: number, l: CartLine) => a + l.q, 0);
export const unread = () => S.notifs.some((n: any) => n.u);
export const first = () => S.orders.length === 0;
export const isPk = () => S.mode === 'pickup' || !!(S.cart.sid && STB[S.cart.sid].far);
export function applyZone() {
  const z = addr()?.z || 0, d = Math.round(z * 3);
  ST.forEach(s => {
    s.km = Math.round((s.km0 + z) * 10) / 10;
    const q = s.eta0.split('–');
    s.eta = (+q[0] + d) + '–' + (+q[1] + d);
    s.far = s.km > feesNow().far;
  });
}
export function ctOf() {
  if (S.cc !== 'w') {const c = S.gc.filter((x: any) => x.id === S.cc)[0]; if (c) return {id: c.id, ph: c.ph, l: c.l || 'Goodies number', w: 0};}
  return {id: 'w', ph: S.pf.ph, l: 'Default Wantiss number', w: 1};
}
export const done = (o: Order) => o.cx || (o.st as number) >= (o.pk ? 4 : 6);
export const TL = STAGES_DELIVERY, TP = STAGES_PICKUP;
export function stage(o: Order) {
  if (!o.backendId) return 0;
  const map: Record<string, number> = {scheduled: 0, placed: 0, accepted: 1, preparing: 2, ready: 3, completed: o.pk ? 4 : 6, cancelled: 0};
  return map[String(o.serverStatus || 'scheduled').toLowerCase()] ?? 0;
}
export function notify(t: string, d: string, r: string, p: string, k?: string) {
  if (k === 'o' && !S.np.orders) return;
  if (k === 'p' && !S.np.promos) return;
  S.notifs.unshift({id: Date.now() + Math.random(), t, d, r, p, u: 1});
}

/* ---------- pricing ---------- */
export function pChk(code: string, sub: number, sid: string | null) {
  const p = coupons().filter((x: any) => x.c === code)[0];
  if (!p) return {e: 'That code is not valid'} as any;
  if (p.st && sid && p.st !== sid) return {e: 'Only valid at ' + STB[p.st].n} as any;
  if (sub < p.min) return {e: 'Spend ' + money(p.min - sub) + ' more to use ' + code} as any;
  return {p} as any;
}
export function totals() {
  const st = S.cart.sid ? STB[S.cart.sid] : null;
  const sub = S.cart.lines.reduce((a: number, l: CartLine) => a + l.p * l.q, 0), pk = isPk();
  const pc: any = S.promo && sub ? pChk(S.promo, sub, S.cart.sid) : {}, p = pc.p, ship = p && p.ty === 'ship';
  const F = feesNow(), fee = !st || pk ? 0 : (first() && F.firstFree) || ship || st.fee === 0 ? 0 : st.fee, svc = sub ? F.svc : 0;
  const disc = p && p.ty === 'pct' ? Math.round(sub * p.v) / 100 : 0, tip = pk ? 0 : S.tip;
  return {st, sub, fee, svc, disc, tip, total: sub + fee + svc - disc + tip, free: !!st && !pk && st.fee > 0 && fee === 0, perr: S.promo && sub && pc.e ? pc.e : '', pok: !!p};
}
export const qtyIn = (id: string) => S.cart.lines.filter((l: CartLine) => l.id === id).reduce((a: number, l: CartLine) => a + l.q, 0);
export function canBuy(i: Item) {
  const s = STB[i.s];
  if (!s.open && !s.acceptScheduledOrders) {toast(s.n + ' is closed. ' + s.nx); return false;}
  if (i.oos) {toast('Sorry, ' + i.n + ' is out of stock'); return false;}
  return true;
}

/* ---------- navigation (internal stack, same semantics as v24) ---------- */
export function push(r: string, p?: any) {ui.close(); S.stack.push({r, p, u: ++uid}); emit();}
export function reset(r: string) {ui.close(); S.stack = [{r, u: ++uid}]; emit();}
export const hooks: {byoGuard: () => boolean; byoClear: () => void; bGet: any; bCheck: any; bLine: any} = {byoGuard: () => false, byoClear: () => {}, bGet: null, bCheck: null, bLine: null};
export function navBack(): 'exit' | void {
  const c = cur();
  if (c.r === 'byo' && hooks.byoGuard()) return;
  ui.close();
  if (c.r === 'byo') hooks.byoClear();
  if (c.r === 'checkout' && S.cs > 0) {S.cs--; emit(); return;}
  if (S.stack.length > 1) S.stack.pop();
  else if (c.r === 'home') {S.stack = [{r: 'wantiss', u: ++uid}]; emit(); return 'exit';}
  else if (c.r !== 'wantiss') S.stack = [{r: 'home', u: ++uid}];
  emit();
}

/* ---------- cart ops ---------- */
export function cartAdd(i: Item, o: {q: number; size?: number; drink?: number; off?: number; note?: string}) {
  if (!canBuy(i)) return;
  const c = S.cart;
  if (c.sid && c.sid !== i.s && c.lines.length) {S.pend = [i, o]; ui.sheet({kind: 'newcart', from: STB[c.sid].n, to: STB[i.s].n}); return;}
  if (qtyIn(i.id) + o.q > i.stock) {toast('Only ' + i.stock + ' available'); return;}
  if ((i as any).restriction === 'alcohol' && !S.alcAck) {S.pend = [i, o]; ui.sheet({kind: 'alcrules'}); return;}
  c.sid = i.s;
  const base = o.off ? dp(i, o.off) : i.p, unit = base + ((o.size || 0) > 0 ? 1.5 : 0) + (o.drink ? 1 : 0);
  const k = [i.id, o.size, o.drink, o.off || 0, o.note || ''].join('|'), l = c.lines.filter((x: CartLine) => x.k === k)[0];
  if (l) l.q += o.q;
  else c.lines.push({k, id: i.id, n: i.n, e: i.e, p: unit, q: o.q, d: [(o.size || 0) > 0 ? 'Large' : o.size === 0 && ['restaurants', 'bakery', 'beverages'].indexOf(STB[i.s].c) > -1 ? 'Regular' : '', o.drink ? '+ drink' : '', o.note || ''].filter(Boolean).join(', ')});
  S.bump = 1; toast('Added ' + i.n + ' to your cart'); save(); emit();
}
export function reorderLines(o: Order) {
  const s = STB[o.sid], miss: string[] = [], ok: CartLine[] = [];
  o.lines.forEach(l => {
    if (l.byo) {
      const b = hooks.bGet(l.byo.sid, l.byo.bid), d = {sid: l.byo.sid, size: l.byo.size, sel: l.byo.sel, note: l.nt || ''};
      if (!b || !s.open || !hooks.bCheck(b, d).ok) {miss.push(l.n); return;}
      ok.push(hooks.bLine(b, d, l.q)); return;
    }
    const i = IT[l.id];
    if (!i || i.oos || !s.open || i.stock < 1) miss.push(l.n);
    else ok.push({k: l.k, id: l.id, n: l.n, e: l.e, p: l.p, q: Math.min(l.q, i.stock), d: l.d});
  });
  return {ok, miss};
}
export function filt(list: Store[]) {
  const f = S.f; let l = list.slice();
  if (f === 'offers') l = l.filter(s => s.pr);
  if (f === 'free') l = l.filter(s => s.fee === 0);
  if (f === 'top') l = l.filter(s => s.r >= 4.5);
  if (f === 'fast') l = l.filter(s => parseInt(s.eta.split('–')[1], 10) <= 30);
  if (f === 'open') l = l.filter(s => s.open);
  if (f === 'near') l.sort((a, b) => a.km - b.km);
  return l;
}
export const FCH: [string, string][] = [['', 'All'], ['offers', 'Offers'], ['free', 'Free delivery'], ['top', 'Rating 4.5+'], ['fast', 'Under 30 min'], ['open', 'Open now'], ['near', 'Nearest']];

/* demo only: wipes local data */
export async function resetDemo() {
  const {assertDemoOnly} = require('./providers');
  assertDemoOnly('Reset demo data');
  await AsyncStorage.multiRemove([KEY, WKEY]);
  Object.assign(S, WDEF(), GDEF());
  S.stack = [{r: 'home', u: ++uid}];
  applyZone(); emit();
}

/* ---------- restricted goods (alcohol) ---------- */
export const hasAlcohol = (lines?: CartLine[]) => (lines || S.cart.lines).some((l: any) => !l.byo && IT[l.id] && (IT[l.id] as any).restriction === 'alcohol');
export const alcAge = (pickupStoreId?: string | null) => {
  const cc = isPk() ? ((pickupStoreId && (STB[pickupStoreId] as any).cc) || 'HT') : (addr() as any).cc || 'HT';
  return {cc, age: contentHooks.minAge ? contentHooks.minAge(cc) : cc === 'HT' || cc === 'DO' ? 18 : 21};
};
