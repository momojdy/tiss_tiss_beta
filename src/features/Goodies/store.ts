/* Goodies store. Ports the v24 state, persistence, pricing, cart and order logic 1:1.
   Data comes from the active provider (demo now, Supabase later); this file never imports a provider directly. */
import {useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../../lib/supabase';
import type {Store, Item, Address, CartLine, Order} from './data/types';
import {RAW_STORES, STX, PROMOS, DEALS} from './data/seed';
import {STAGES_DELIVERY, STAGES_PICKUP} from './data/seed';

export const KEY = 'goodies-v3';
export const WKEY = 'goodies-wantiss-shared-mock-v1';

/* ---------- catalog (built exactly like v24) ---------- */
export const IT: Record<string, Item> = {};
export const STB: Record<string, Store> = {};
export const ST: Store[] = RAW_STORES.map(a => {
  const s: any = {id: a.id, n: a.n, c: a.c, e: a.e, bg: a.bg, r: a.r, rv: a.rv, km: a.km, eta: a.eta, fee: a.fee, min: a.min, pr: a.pr, k: a.k};
  s.it = a.items.map((x, i) => {
    const o: any = {id: a.id + '_' + i, s: a.id, n: x.n, p: x.p, e: x.e};
    IT[o.id] = o;
    return o;
  });
  STB[s.id] = s;
  return s;
});
export const PV: Record<string, boolean> = {};
ST.forEach(s => (PV[s.id] = Math.random() < 0.5));
ST.forEach(s => {
  const x = STX[s.id] || ({} as any);
  s.km0 = s.km; s.eta0 = s.eta;
  s.open = x.open === 0 ? 0 : 1;
  s.h = x.h || (s.c === 'restaurants' ? '10am–10pm' : '8am–9pm');
  s.nx = x.nx || '';
  s.acceptScheduledOrders = x.scheduled === true;
  s.scheduledOrderStartMinutes = Number(x.scheduledStartMinutes ?? 60);
});
Object.keys(IT).forEach((k, n) => {
  const i = IT[k], s = STB[i.s];
  i.stock = 4 + ((n * 7) % 9);
  i.oos = k === 's2_2' || k === 's6_3' ? 1 : 0;
  if (i.oos) i.stock = 0;
  i.d = i.n + ' from ' + s.n + '. Prepared or packed fresh the same day.';
  i.al = s.c === 'bakery' ? 'Contains gluten, eggs and dairy.' : s.id === 's2' ? 'Contains fish or shellfish.' : '';
  i.w = /\blb\b/.test(i.n);
  i.restriction = /clairin|\brum\b|rhum|beer|wine|vodka|whisk/i.test(i.n) ? 'alcohol' : s.c === 'drugstore' ? 'otc' : 'none';
});
export const PR = PROMOS;
export const contentHooks: {coupons?: () => any[]; fees?: () => any; minAge?: (cc: string) => number} = {};
const coupons = () => (contentHooks.coupons ? contentHooks.coupons() : PR);
const feesNow = () => (contentHooks.fees ? contentHooks.fees() : {svc: 0.5, firstFree: true, far: 5.5, tips: [0, 1, 2, 5], lead: 30, step: 15, slots: 5, pay: {Wallet: 1, MonCash: 1, Card: 1, Cash: 1}, rfSvc: true, rfTip: true});
export {DEALS};

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
  pf: {n: 'Guest', e: 'guest@wantiss.demo', ph: '+509 3700 0000', av: ''},
  addr: [
    {id: 1, l: 'Home', t: 'Delmas 33, Port-au-Prince', apt: '', inst: '', def: 1, z: 0, cc: 'HT'},
    {id: 2, l: 'Work', t: 'Rue Lamarre, Pétion-Ville', apt: '', inst: '', def: 0, z: 1.4, cc: 'HT'},
  ] as Address[],
});
const GDEF = () => ({
  notifs: [
    {id: 1, t: 'Welcome to Goodies 🎉', d: 'Your first order ships free. Tap to start browsing.', r: 'catlist', p: 'restaurants', u: 1},
    {id: 2, t: 'Earn double points this weekend', d: 'Pay with your Wallet on any order. See the coupons page for current offers.', r: 'promos', p: '', u: 1},
  ] as any[],
  orders: [] as Order[], cart: {sid: null as string | null, lines: [] as CartLine[]}, fav: [] as string[], favp: [] as string[], cards: [] as any[],
  wallet: 45, hasWallet: true, pay: 'wallet', mode: 'delivery', tip: 0, promo: '', as: 0, gc: [] as any[], cc: 'w', np: {orders: 1, promos: 1}, rev: {} as any, rec: [] as any[], rv: [] as any[],
});
export const WP = ['pf', 'addr'], GP = ['notifs', 'orders', 'cart', 'fav', 'favp', 'cards', 'wallet', 'hasWallet', 'pay', 'mode', 'tip', 'promo', 'as', 'gc', 'cc', 'np', 'rev', 'rec', 'rv'];

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
  if (!S.addr.some((a: Address) => a.def)) S.addr[0].def = 1;
  if (!S.pf || !S.pf.n) S.pf = WDEF().pf; if (!S.pf.ph) S.pf.ph = WDEF().pf.ph;
  S.gc = S.gc.filter((c: any) => c && c.id && c.ph);
  if (S.cc !== 'w' && !S.gc.some((c: any) => c.id === S.cc)) S.cc = 'w';
  if (!S.addr.some((a: Address) => a.id === S.as)) S.as = defAddr().id;
  try { /* DEMO bridge: store settings saved in the Vendor Dashboard (production: backend) */
    const o = JSON.parse((await AsyncStorage.getItem('goodies-stores-v1')) || 'null');
    if (o) Object.keys(o).forEach(sid => {
      const s: any = STB[sid], v = o[sid]; if (!s || !v) return;
      if (v.category) s.c = v.category; if (v.kind) s.k = v.kind; if (typeof v.fee === 'number') s.fee = v.fee; if (typeof v.minOrder === 'number') s.min = v.minOrder;
      if (v.etaMin && v.etaMax) s.eta0 = v.etaMin + '–' + v.etaMax; s.pr = v.promo || '';
    });
  } catch (e) {}
  /* Live vendor-published opening hours and scheduled-order settings. Demo seeds remain the fallback. */
  try {
    const {data} = await supabase.from('goodies_store_schedules').select('store_id,hours,accept_scheduled_orders,scheduled_order_start_minutes,is_live').eq('is_live', true);
    (data || []).forEach((v: any) => {
      const s: any = STB[v.store_id]; if (!s) return;
      s.scheduleHours = v.hours || {};
      s.acceptScheduledOrders = !!v.accept_scheduled_orders;
      s.scheduledOrderStartMinutes = Math.max(0, Number(v.scheduled_order_start_minutes ?? 60));
      const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const today = s.scheduleHours[names[new Date().getDay()]];
      if (today && !today.closed && today.open && today.close) {
        const [oh, om] = String(today.open).split(':').map(Number), [ch, cm] = String(today.close).split(':').map(Number);
        const now = new Date(), openAt = new Date(now), closeAt = new Date(now);
        openAt.setHours(oh, om || 0, 0, 0); closeAt.setHours(ch, cm || 0, 0, 0);
        s.h = formatHour(openAt) + '–' + formatHour(closeAt);
        s.open = now >= openAt && now < closeAt ? 1 : 0;
        s.nx = now < openAt ? 'Opens at ' + formatHour(openAt) + ' today' : now >= closeAt ? 'Opens tomorrow according to store hours' : '';
      } else {
        s.open = 0;
        s.nx = 'Closed today according to store hours';
        for (let n = 1; n <= 7; n++) {
          const d = new Date(Date.now() + n * 86400000), h = s.scheduleHours[names[d.getDay()]];
          if (h && !h.closed && h.open) { s.nx = 'Opens ' + names[d.getDay()] + ' at ' + h.open; break; }
        }
      }
    });
  } catch (e) { /* Public schedule fetch is optional; seeded demo values remain usable offline. */ }
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
  const z = addr().z || 0, d = Math.round(z * 3);
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
  const n = o.pk ? 5 : 7;
  let i = Math.min(n - 1, Math.floor((Date.now() - o.t0) / 5000));
  if (o.sch && Date.now() < o.sch) i = Math.min(i, 1);
  if (o.alc && o.alc.status === 'pending') i = Math.min(i, o.pk ? 3 : 5);
  return i;
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
  if (!s.open) {toast(s.n + ' is closed. ' + s.nx); return false;}
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
