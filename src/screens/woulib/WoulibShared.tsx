import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const YELLOW = '#FEC509';
const KEY = 'woulib.theme';
export const MAP_TOP = 100;

export interface WoulibTheme { dark: boolean; bg: string; card: string; ink: string; muted: string; line: string; soft: string; yellowSoft: string; red: string; redSoft: string; green: string; }
export const lightTheme: WoulibTheme = { dark: false, bg: '#FBFAF7', card: '#FFFFFF', ink: '#111111', muted: '#6D6A62', line: '#EBE7DC', soft: '#F3F1EA', yellowSoft: '#FFF1BD', red: '#E5484D', redSoft: '#FDE6E7', green: '#1FAE68' };
export const darkTheme: WoulibTheme = { dark: true, bg: '#0D0D0F', card: '#17171A', ink: '#FFFFFF', muted: '#A5A299', line: '#2B2B30', soft: '#232327', yellowSoft: '#3A3110', red: '#E5484D', redSoft: '#3A1B1D', green: '#1FAE68' };

interface Ctx { t: WoulibTheme; dark: boolean; setDark: (d: boolean) => void; toggle: () => void }
const ThemeCtx = createContext<Ctx>({t: lightTheme, dark: false, setDark: () => {}, toggle: () => {}});

export function WoulibThemeProvider({children}: {children: React.ReactNode}) {
  const [dark, setDarkState] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v === 'dark') setDarkState(true); }).catch(() => {}); }, []);
  const setDark = useCallback((d: boolean) => { setDarkState(d); AsyncStorage.setItem(KEY, d ? 'dark' : 'light').catch(() => {}); }, []);
  const value = useMemo(() => ({t: dark ? darkTheme : lightTheme, dark, setDark, toggle: () => setDark(!dark)}), [dark, setDark]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useWoulibTheme = () => useContext(ThemeCtx);

export type Pt = [number, number];
export interface LatLng { latitude: number; longitude: number }

export const GEO: Record<string, LatLng> = {
  'Current location': {latitude: 14.5506, longitude: 121.0484},
  'City Center': {latitude: 14.5547, longitude: 121.0244},
  'Business District': {latitude: 14.5506, longitude: 121.0484},
  'Airport': {latitude: 14.5086, longitude: 121.0197},
  'Shopping District': {latitude: 14.5519, longitude: 121.0224},
  'Downtown': {latitude: 14.5995, longitude: 120.9842},
};

export const haversine = (a: LatLng, b: LatLng) => {
  const r = Math.PI / 180, dLa = (b.latitude - a.latitude) * r, dLo = (b.longitude - a.longitude) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
export const gridToLL = (trip: {A: Pt; fromLL: LatLng}, p: Pt): LatLng => ({
  latitude: trip.fromLL.latitude - ((p[1] - trip.A[1]) * 2.5) / 111320,
  longitude: trip.fromLL.longitude + ((p[0] - trip.A[0]) * 2.5) / (111320 * Math.cos((trip.fromLL.latitude * Math.PI) / 180)),
});
export const etaRange = (m: number) => `${Math.max(1, m - 1)}–${m + 1}`;
export const fare = (n: number) => `$${n.toFixed(2)}`;

export const PLACES = [{n: 'City Center', a: 'Current area'}, {n: 'Business District', a: 'Current area'}, {n: 'Airport', a: 'Nearby'}, {n: 'Shopping District', a: 'Current area'}, {n: 'Downtown', a: 'Current area'}];
export const FROMS = ['Current location', 'City Center', 'Business District', 'Downtown'];

export interface Vehicle { id: string; name: string; short: string; price: number; eta: number; seats: number; color: string; cat: 'N' | 'L' }
export const VEHICLES: Vehicle[] = [
  {id: 'civic', name: 'Honda Civic', short: 'Civic', price: 11.3, eta: 3, seats: 4, color: '#c9ccd6', cat: 'N'},
  {id: 'mazda3', name: 'Mazda3', short: 'Mazda3', price: 12.5, eta: 4, seats: 4, color: '#b73a3a', cat: 'N'},
  {id: 'crown', name: 'Toyota Crown', short: 'Crown', price: 14.1, eta: 5, seats: 4, color: '#2c3440', cat: 'N'},
  {id: 'sclass', name: 'Mercedes-Benz S-Class', short: 'S-Class', price: 29.2, eta: 5, seats: 4, color: '#e4e6ea', cat: 'L'},
  {id: 'panamera', name: 'Porsche Panamera', short: 'Panamera', price: 33.2, eta: 3, seats: 4, color: '#5a5f69', cat: 'L'},
  {id: 'ghost', name: 'Rolls-Royce Ghost', short: 'Ghost', price: 42.8, eta: 6, seats: 4, color: '#1d1d22', cat: 'L'},
];

export interface Pay { id: string; name: string; sub: string; badge: string; color: string; group: 'card' | 'wallet' }
export const PAYMENTS: Pay[] = [
  {id: 'visa', name: 'Visa Debit', sub: '•••• 4242 · 08/28', badge: 'VISA', color: '#1a3fa6', group: 'card'},
  {id: 'mc', name: 'Mastercard Credit', sub: '•••• 5531 · 11/27', badge: 'MC', color: '#e5482d', group: 'card'},
  {id: 'amex', name: 'American Express', sub: '•••• 1007 · 04/29', badge: 'AMEX', color: '#2b84c6', group: 'card'},
  {id: 'apple', name: 'Apple Pay', sub: 'alex@icloud.com', badge: 'Pay', color: '#111111', group: 'wallet'},
  {id: 'google', name: 'Google Pay', sub: 'alex@gmail.com', badge: 'G Pay', color: '#4a86f7', group: 'wallet'},
  {id: 'paypal', name: 'PayPal', sub: 'alex@paypal.com', badge: 'PP', color: '#1d2f74', group: 'wallet'},
];

export const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 2147483646) + 1; };
export const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const dedupe = (p: Pt[]) => p.filter((a, i) => !i || a[0] !== p[i - 1][0] || a[1] !== p[i - 1][1]);
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function smooth(p: Pt[], r = 32): Pt[] {
  if (p.length < 3) return p.map(a => [a[0], a[1]] as Pt);
  const o: Pt[] = [[p[0][0], p[0][1]]];
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i], c = p[i + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]), k = Math.min(r, l1 / 2, l2 / 2);
    const s: Pt = [b[0] + ((a[0] - b[0]) / l1) * k, b[1] + ((a[1] - b[1]) / l1) * k];
    const e: Pt = [b[0] + ((c[0] - b[0]) / l2) * k, b[1] + ((c[1] - b[1]) / l2) * k];
    for (let t = 0; t <= 8; t++) { const u = t / 8, w = 1 - u; o.push([w * w * s[0] + 2 * w * u * b[0] + u * u * e[0], w * w * s[1] + 2 * w * u * b[1] + u * u * e[1]]); }
  }
  o.push([p[p.length - 1][0], p[p.length - 1][1]]);
  return o;
}
export function along(path: Pt[], q: number): [number, number, number] {
  'worklet';
  const n = path.length;
  let L = 0;
  for (let i = 1; i < n; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  let d = Math.min(1, Math.max(0, q)) * L;
  for (let i = 1; i < n; i++) {
    const dx = path[i][0] - path[i - 1][0], dy = path[i][1] - path[i - 1][1], l = Math.hypot(dx, dy);
    if (d <= l || i === n - 1) { const f = l ? Math.min(1, d / l) : 0; return [path[i - 1][0] + dx * f, path[i - 1][1] + dy * f, Math.atan2(dy, dx)]; }
    d -= l;
  }
  return [path[0][0], path[0][1], 0];
}
export const ease = (q: number) => { 'worklet'; return 0.5 * q + 0.5 * q * q * (3 - 2 * q); };

export interface Trip { from: string; dest: string; A: Pt; D: Pt; path: Pt[]; km: string; min: number; fromLL: LatLng; toLL: LatLng }
export function makeTrip(from: string, dest: string): Trip {
  const R = rng(hash(from + '>' + dest));
  const I = () => (1 + Math.floor(R() * 8)) * 100;
  let A: Pt, D: Pt;
  do { A = [I(), I()]; D = [I(), I()]; } while (Math.abs(A[0] - D[0]) + Math.abs(A[1] - D[1]) < 300);
  const path = dedupe(R() < 0.5 ? [A, [A[0], D[1]], D] : [A, [D[0], A[1]], D]);
  const fromLL = GEO[from.split(',')[0]] ?? GEO['Current location'];
  let toLL = GEO[dest] ?? GEO['City Center'];
  if (haversine(fromLL, toLL) < 0.5) toLL = {latitude: toLL.latitude + 0.006, longitude: toLL.longitude + 0.004};
  const road = haversine(fromLL, toLL) * 1.35, km = road.toFixed(1);
  return {from, dest, A, D, path, km, min: Math.max(4, Math.round((road / 18) * 60) + 2), fromLL, toLL};
}

export interface Driver { id: string; name: string; first: string; initial: string; color: string; plate: string; rating: string; trips: string; pos: Pt; ll: LatLng; eta: number; diff: number; phone: string }
const NAMES = ['Ronald Richards', 'Jane Cooper', 'Marcus Lee', 'Sofia Alvarez', 'Daniel Okafor', 'Priya Nair', 'Jean Pierre', 'Marie Joseph'];
const COLORS = ['#5b7fd0', '#e0714f', '#4aa391', '#b36fc4', '#d0a23b', '#d0587f'];
export function makeDrivers(A: Pt, from: LatLng = GEO['Current location']): Driver[] {
  const R = rng((Date.now() % 2147483646) + 1), names = [...NAMES].sort(() => R() - 0.5);
  const rp = (): Pt => {
    let p: Pt;
    do { p = [clamp(A[0] + (Math.floor(R() * 7) - 3) * 100, 100, 800), clamp(A[1] + (Math.floor(R() * 7) - 3) * 100, 100, 800)]; } while (Math.abs(p[0] - A[0]) + Math.abs(p[1] - A[1]) < 200);
    return p;
  };
  return [0, 1, 2, 3].map(i => {
    const pos = rp();
    return {
      id: 'd' + i, name: names[i], first: names[i].split(' ')[0], initial: names[i][0], color: COLORS[(Math.floor(R() * 6) + i) % 6],
      plate: 'WL ' + (1000 + Math.floor(R() * 9000)), rating: (4.6 + Math.floor(R() * 5) / 10).toFixed(1), trips: String(200 + Math.floor(R() * 2800)),
      phone: '+1202555' + (1000 + Math.floor(R() * 8999)), pos, ll: gridToLL({A, fromLL: from}, pos), eta: 2 + Math.floor(R() * 6),
      diff: 2 + Math.floor(R() * 7) + [0, 0.3, 0.5][Math.floor(R() * 3)],
    };
  });
}

export type RideStatus = 'idle' | 'searching' | 'offer' | 'declined' | 'confirmed' | 'onway' | 'arrived' | 'riding' | 'complete';
export type WoulibMode = 'ride' | 'delivery';
export type ProviderStatus = 'offline' | 'online' | 'request' | 'accept' | 'arriving' | 'arrived' | 'trip' | 'complete' | 'earnings';

export interface WantissUserRef { id: string; displayName?: string; email?: string; role?: string }
export interface WoulibRideRecord { id: string; userId: string; mode: WoulibMode; from: string; destination: string; status: string; fare?: number }
export interface WoulibDriverProviderRef { id: string; userId?: string; providerType: 'driver' | 'delivery_provider'; status: ProviderStatus }
export interface WantissWalletTransaction { id: string; userId: string; type: 'ride' | 'delivery' | 'refund' | 'earning'; amount: number; currency: string; referenceId?: string }
export interface WantissNotificationRef { id: string; userId: string; type: string; title: string; body: string; read?: boolean; referenceId?: string }
export interface WoulibRideHistoryEntry { id: string; userId: string; mode: WoulibMode; completedAt?: string; from: string; destination: string; fare?: number }

export interface WoulibOfferedRide { id: string; from: string; destination: string; when: string; seats: number; pricePerSeat: number }
export interface WoulibUpcomingRide { id: string; to: string; from: string; when: string; driver: string; status: string }

export interface Tracking { path: Pt[]; startedAt: number; duration: number; kind: 'pickup' | 'trip'; driverId: string; fromLL: LatLng; toLL: LatLng }
export interface RideState {
  from: string; dest: string; vehicle: Vehicle; payment: Pay; trip: Trip | null; mode: WoulibMode; status: RideStatus; drivers: Driver[];
  shown: Record<string, boolean>; declined: Record<string, boolean>; highlight: string | null; offerIdx: number; found: number; toast: string | null;
  price: number; accepted: Driver | null; tracking: Tracking | null; eta: number; landmark: string; mapView: 'illustrated' | 'live'; providerStatus: ProviderStatus;
}

export interface WoulibRideService { createDrivers(trip: Trip): Driver[]; clear(): void }
export interface WoulibProviderLifecycle { status: ProviderStatus; setStatus(status: ProviderStatus): void }
export function createDemoWoulibRideService(): WoulibRideService { return {createDrivers: trip => makeDrivers(trip.A, trip.fromLL), clear: () => {}}; }
export function createProviderLifecycle(status: ProviderStatus = 'offline'): WoulibProviderLifecycle {
  let current = status;
  return {get status() { return current; }, setStatus(next) { current = next; }};
}

export interface RideApi extends RideState {
  setDest(name: string): void; clearTrip(): void; cycleFrom(): void; setVehicle(v: Vehicle): void; setPayment(p: Pay): void; setMode(mode: WoulibMode): void;
  startSearch(): void; decline(): void; accept(): void; cancel(): void; startTrip(): void; finish(): void;
  setLandmark(t: string): void; setMapView(v: 'illustrated' | 'live'): void; setProviderStatus(status: ProviderStatus): void;
  setRouteInfo(km: string, min: number): void;
}

const INIT: RideState = {
  from: FROMS[0], dest: PLACES[0].n, vehicle: VEHICLES[0], payment: PAYMENTS[0], trip: null, mode: 'ride', status: 'idle', drivers: [], shown: {}, declined: {},
  highlight: null, offerIdx: 0, found: 0, toast: null, price: 0, accepted: null, tracking: null, eta: 5, landmark: '', mapView: 'illustrated', providerStatus: 'offline',
};
const RideCtx = createContext<RideApi>(null as unknown as RideApi);
export const useRide = () => useContext(RideCtx);

export function RideProvider({children, service}: {children: React.ReactNode; service?: WoulibRideService}) {
  const rideService = useMemo(() => service ?? createDemoWoulibRideService(), [service]);
  const [s, setS] = useState<RideState>(INIT);
  const sr = useRef(s); sr.current = s;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const later = (ms: number, f: () => void) => { timers.current.push(setTimeout(f, ms)); };
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; if (tick.current) { clearInterval(tick.current); tick.current = null; } };
  useEffect(() => () => { clear(); rideService.clear(); }, [rideService]);
  const patch = (p: Partial<RideState>) => setS(x => ({...x, ...p}));

  const offer = (i: number) => {
    const d = sr.current.drivers[i];
    if (!d) return;
    setS(x => ({...x, status: 'offer', offerIdx: i, highlight: d.id, shown: {...x.shown, [d.id]: true}, declined: {...x.declined, [d.id]: false}, price: +(x.vehicle.price + d.diff).toFixed(2)}));
  };

  const api: RideApi = {
    ...s,
    setDest: name => setS(x => ({...x, dest: name, trip: makeTrip(x.from, name)})),
    clearTrip: () => patch({trip: null}),
    cycleFrom: () => setS(x => { const from = FROMS[(FROMS.indexOf(x.from) + 1) % FROMS.length]; return {...x, from, trip: x.trip ? makeTrip(from, x.dest) : null}; }),
    setVehicle: v => patch({vehicle: v}),
    setPayment: p => patch({payment: p}),
    setMode: mode => patch({mode}),
    setLandmark: l => patch({landmark: l}),
    setMapView: v => patch({mapView: v}),
    setProviderStatus: providerStatus => patch({providerStatus}),
    setRouteInfo: (km, min) => setS(x => (x.trip && (x.trip.km !== km || x.trip.min !== min) ? {...x, trip: {...x.trip, km, min}} : x)),

    startSearch: () => {
      clear();
      const trip = sr.current.trip;
      if (!trip) return;
      setS(x => ({...x, drivers: rideService.createDrivers(trip), status: 'searching', shown: {}, declined: {}, highlight: null, offerIdx: 0, found: 0, toast: null, accepted: null, tracking: null, eta: 5}));
      later(1500, () => setS(x => ({...x, found: 2, shown: {...x.shown, [x.drivers[2].id]: true, [x.drivers[3].id]: true}})));
      later(2800, () => setS(x => ({...x, found: 3, shown: {...x.shown, [x.drivers[0].id]: true}})));
      later(3600 + Math.random() * 1800, () => offer(0));
    },

    decline: () => {
      const x0 = sr.current, d = x0.drivers[x0.offerIdx], next = (x0.offerIdx + 1) % 2;
      setS(x => ({...x, status: 'declined', highlight: null, declined: {...x.declined, [d.id]: true}, toast: `You declined ${d.first}'s offer`}));
      later(3000, () => patch({toast: null}));
      if (next === 1) later(1800, () => setS(x => ({...x, found: x.found + 1, shown: {...x.shown, [x.drivers[1].id]: true}})));
      later(3800, () => offer(next));
    },

    accept: () => {
      const x0 = sr.current, d = x0.drivers[x0.offerIdx], trip = x0.trip!;
      clear();
      patch({status: 'confirmed', highlight: null, accepted: d});
      later(2800, () => {
        const mid: Pt = Math.random() < 0.5 ? [d.pos[0], trip.A[1]] : [trip.A[0], d.pos[1]];
        const path = smooth(dedupe([d.pos, mid, trip.A]));
        const duration = 17500, startedAt = Date.now() + 1200;
        patch({status: 'onway', tracking: {path, startedAt, duration, kind: 'pickup', driverId: d.id, fromLL: d.ll, toLL: trip.fromLL}, eta: 5});
        tick.current = setInterval(() => {
          const q = (Date.now() - startedAt) / duration;
          if (q >= 1) { clearInterval(tick.current!); tick.current = null; patch({status: 'arrived', eta: 0}); return; }
          const eta = Math.max(1, Math.ceil(5 * (1 - Math.max(0, q))));
          if (eta !== sr.current.eta) patch({eta});
        }, 250);
      });
    },

    startTrip: () => {
      const x0 = sr.current, trip = x0.trip, d = x0.accepted;
      if (!trip || !d) return;
      clear();
      const path = smooth(trip.path);
      const duration = clamp(trip.min * 1700, 16000, 32000), startedAt = Date.now() + 700;
      patch({status: 'riding', tracking: {path, startedAt, duration, kind: 'trip', driverId: d.id, fromLL: trip.fromLL, toLL: trip.toLL}, eta: trip.min});
      tick.current = setInterval(() => {
        const q = (Date.now() - startedAt) / duration;
        if (q >= 1) { clearInterval(tick.current!); tick.current = null; patch({status: 'complete', eta: 0}); return; }
        const eta = Math.max(1, Math.ceil(trip.min * (1 - Math.max(0, q))));
        if (eta !== sr.current.eta) patch({eta});
      }, 250);
    },

    cancel: () => { clear(); setS(x => ({...x, status: 'idle', tracking: null, shown: {}, drivers: [], highlight: null, toast: null, accepted: null})); },

    finish: () => { clear(); setS(x => ({...INIT, vehicle: x.vehicle, payment: x.payment, mode: x.mode, mapView: x.mapView})); },
  };
  return <RideCtx.Provider value={useMemo(() => api, [s])}>{children}</RideCtx.Provider>;
}

export const styles = StyleSheet.create({
  abs: {position: 'absolute', left: 0, top: 0},
  absFill: {...StyleSheet.absoluteFillObject},
  world: {position: 'absolute', left: 0, top: 0, width: 2500, height: 1620},
  anchor: {position: 'absolute', left: 0, top: 0},
  card: {position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', elevation: 18, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: {width: 0, height: -6}},
  handleWrap: {alignItems: 'center', paddingTop: 9, paddingBottom: 7},
  handle: {width: 44, height: 5, borderRadius: 3},
  body: {paddingHorizontal: 18, paddingBottom: 30},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8},
  h1: {fontSize: 22, fontWeight: '800'},
  h2: {fontSize: 15.5, fontWeight: '700'},
  label: {fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 14, marginBottom: 6},
  avatar: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
  avatarTxt: {color: '#fff', fontWeight: '800', fontSize: 18},
  btn: {height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row'},
  btnTxt: {fontSize: 16, fontWeight: '800'},
  field: {flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, height: 48, marginTop: 6},
  dot: {width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, marginRight: 12},
  vRow: {flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8},
  circle: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: {width: 0, height: 2}},
  topBar: {position: 'absolute', left: 16, top: 62, flexDirection: 'row'},
  toast: {position: 'absolute', alignSelf: 'center', backgroundColor: '#111', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10},
  bar: {height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 12},
});

export function Btn({label, onPress, kind = 'primary', icon, disabled, flex}: {label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; flex?: number}) {
  const {t} = useWoulibTheme();
  const bg = kind === 'primary' ? YELLOW : kind === 'danger' ? t.redSoft : t.soft;
  const fg = kind === 'primary' ? '#111111' : kind === 'danger' ? t.red : t.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({pressed}) => [styles.btn, {backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, flex}]}>
      {icon && <Ionicons name={icon} size={19} color={fg} style={{marginRight: 8}} />}
      <Text style={[styles.btnTxt, {color: fg}]}>{label}</Text>
    </Pressable>
  );
}

export function Seg({value, onChange}: {value: WoulibMode; onChange: (m: WoulibMode) => void}) {
  const {t} = useWoulibTheme();
  const opt = (m: WoulibMode, label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <Pressable key={m} onPress={() => onChange(m)} style={{flex: 1, height: 42, borderRadius: 12, backgroundColor: value === m ? YELLOW : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row'}}>
      <Ionicons name={icon} size={17} color={value === m ? '#111' : t.muted} style={{marginRight: 6}} />
      <Text style={{fontWeight: '800', color: value === m ? '#111' : t.muted}}>{label}</Text>
    </Pressable>
  );
  return <View style={{flexDirection: 'row', backgroundColor: t.soft, borderRadius: 14, padding: 3}}>{opt('ride', 'Ride', 'car')}{opt('delivery', 'Delivery', 'cube')}</View>;
}

export function DriverRow({d, vehicle, right}: {d: Driver; vehicle: Vehicle; right?: React.ReactNode}) {
  const {t} = useWoulibTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, {backgroundColor: d.color}]}><Text style={styles.avatarTxt}>{d.initial}</Text></View>
      <View style={{flex: 1, marginLeft: 12}}>
        <Text style={[styles.h2, {color: t.ink}]}>{d.name}</Text>
        <Text style={{color: t.muted, fontSize: 12.5, marginTop: 2}}>★ {d.rating} · {d.trips} trips · {vehicle.name} · {d.plate}</Text>
      </View>
      {right}
    </View>
  );
}
