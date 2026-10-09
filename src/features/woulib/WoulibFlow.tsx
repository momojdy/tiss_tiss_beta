/**
 * WOULIB — complete feature in ONE file (React Native / Expo + Reanimated + react-native-svg + react-native-maps).
 *
 * Drop this file in src/features/woulib/ and render <WoulibFlow /> (it brings its own theme + ride providers).
 * The existing app screens / auth / database stay untouched.
 *
 * Peer deps: react-native-reanimated (v3), react-native-svg, react-native-maps, @expo/vector-icons,
 *            @react-native-async-storage/async-storage.
 *
 * What's in this file
 *  - Theme (light/dark, brand yellow #FEC509) + ride state machine (RideProvider)
 *  - WoulibHome: the landing screen (Find a ride / Offer a ride, Nearby rides, Upcoming rides)
 *  - WoulibOffer: the "Offer a ride" form (pickup, destination, time, seats, price) → Publish adds it to Upcoming
 *  - Navigation: Home → Find (map + ride flow) and Home → Offer. The back arrow on the first Find step resets the ride.
 *  - Illustrated isometric city: two-way roads, 3 cars per lane, buses, signals that really stop traffic,
 *    ~90 pedestrians on the sidewalks, defined trees (palm / round / bloom / pine) and flower beds,
 *    many building shapes incl. an iron-market hall, a street bazaar and gingerbread-style houses.
 *    Cars, pedestrians and the taxi are depth-sorted (zIndex) so they layer correctly against each other,
 *    and buildings always stay in front of them.
 *  - Live map (Uber style): road-snapped cars that cruise continuously (and keep their distance),
 *    smoothed heading, real OSRM route + real distance/ETA, camera that follows the taxi
 *  - WoulibFlow: every screen (home → destination → vehicle → searching → offer → on the way → arrived →
 *    riding → complete) with a tall bottom card that auto-sizes per step and can be collapsed
 *
 * Host-app hooks (all optional props of <WoulibFlow />)
 *  - onOfferRide()          called when the user taps "Offer a ride" (the built-in Offer screen opens either way)
 *  - onPublishRide(ride)    called when the user publishes an offered ride → save it to your database here
 *  - service                custom WoulibRideService (drivers source)
 *
 * Live map notes
 *  - iOS uses Apple Maps. Android draws OpenStreetMap tiles (mapType="none"). react-native-maps still
 *    initialises the Google Maps SDK on Android, so keep your Google Maps key in app.json / AndroidManifest.
 *  - Tiles come from tile.openstreetmap.org and routes from the public OSRM demo server. Both are for
 *    DEMOS ONLY. For production use your own OSRM / Mapbox / Google Directions and a licensed tile provider
 *    (swap TILE_URL and OSRM below). OSM attribution is shown on the map as required.
 *  - Performance knobs: TRAFFIC_DENSITY (cars per lane), PED_COUNT, and DEPTH_SORT / DEPTH_STEP below.
 */

import React, {createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {InteractionManager, KeyboardAvoidingView, LayoutChangeEvent, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import Animated, {Easing, FadeIn, FadeInDown, FadeOut, SharedValue, useAnimatedProps, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Ellipse, G, Path, Polygon, Polyline} from 'react-native-svg';
import MapView, {Circle as GCircle, Marker as GMarker, Polyline as GPolyline, UrlTile} from 'react-native-maps';
import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ───────────────────────────── Theme ───────────────────────────── */

export const YELLOW = '#FEC509';
const KEY = 'woulib.theme';

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

/* ───────────────────────────── Data + helpers ───────────────────────────── */

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

/** great-circle distance in km */
export const haversine = (a: LatLng, b: LatLng) => {
  const r = Math.PI / 180, dLa = (b.latitude - a.latitude) * r, dLo = (b.longitude - a.longitude) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
/** illustrated-map grid point → real coordinates (≈2.5 m per grid unit, y grows southwards) */
export const gridToLL = (trip: {A: Pt; fromLL: LatLng}, p: Pt): LatLng => ({
  latitude: trip.fromLL.latitude - ((p[1] - trip.A[1]) * 2.5) / 111320,
  longitude: trip.fromLL.longitude + ((p[0] - trip.A[0]) * 2.5) / (111320 * Math.cos((trip.fromLL.latitude * Math.PI) / 180)),
});
export const etaRange = (m: number) => `${Math.max(1, m - 1)}–${m + 1}`;
/** money formatter (defined here, before any screen uses it) */
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
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** rounds the corners of an orthogonal polyline */
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
/** point + heading at fraction q (0..1) along a polyline — runs on the UI thread */
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

/* ───────────────────────────── Ride state ───────────────────────────── */

export type RideStatus = 'idle' | 'searching' | 'offer' | 'declined' | 'confirmed' | 'onway' | 'arrived' | 'riding' | 'complete';
export type WoulibMode = 'ride' | 'delivery';
export type ProviderStatus = 'offline' | 'online' | 'request' | 'accept' | 'arriving' | 'arrived' | 'trip' | 'complete' | 'earnings';

// Integration stubs for the host app (wallet, notifications, history…)
export interface WantissUserRef { id: string; displayName?: string; email?: string; role?: string }
export interface WoulibRideRecord { id: string; userId: string; mode: WoulibMode; from: string; destination: string; status: string; fare?: number }
export interface WoulibDriverProviderRef { id: string; userId?: string; providerType: 'driver' | 'delivery_provider'; status: ProviderStatus }
export interface WantissWalletTransaction { id: string; userId: string; type: 'ride' | 'delivery' | 'refund' | 'earning'; amount: number; currency: string; referenceId?: string }
export interface WantissNotificationRef { id: string; userId: string; type: string; title: string; body: string; read?: boolean; referenceId?: string }
export interface WoulibRideHistoryEntry { id: string; userId: string; mode: WoulibMode; completedAt?: string; from: string; destination: string; fare?: number }

/** a ride the user offers to others (published from the Offer screen) */
export interface WoulibOfferedRide { id: string; from: string; destination: string; when: string; seats: number; pricePerSeat: number }

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
  /** real distance / duration from the routing engine replaces the haversine estimate */
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

    /** passenger is in the car → drive the real trip A → D */
    startTrip: () => {
      const x0 = sr.current, trip = x0.trip, d = x0.accepted;
      if (!trip || !d) return;
      clear();
      const path = smooth(trip.path);
      const duration = clamp(trip.min * 1700, 16000, 32000), startedAt = Date.now() + 700; // demo speed-up: real ETA is shown, animation is compressed
      patch({status: 'riding', tracking: {path, startedAt, duration, kind: 'trip', driverId: d.id, fromLL: trip.fromLL, toLL: trip.toLL}, eta: trip.min});
      tick.current = setInterval(() => {
        const q = (Date.now() - startedAt) / duration;
        if (q >= 1) { clearInterval(tick.current!); tick.current = null; patch({status: 'complete', eta: 0}); return; }
        const eta = Math.max(1, Math.ceil(trip.min * (1 - Math.max(0, q))));
        if (eta !== sr.current.eta) patch({eta});
      }, 250);
    },

    cancel: () => { clear(); setS(x => ({...x, status: 'idle', tracking: null, shown: {}, drivers: [], highlight: null, toast: null, accepted: null})); },

    /** trip finished / user left the flow → back to a clean slate (keeps the user's vehicle / payment / mode choices) */
    finish: () => { clear(); setS(x => ({...INIT, vehicle: x.vehicle, payment: x.payment, mode: x.mode, mapView: x.mapView})); },
  };
  return <RideCtx.Provider value={useMemo(() => api, [s])}>{children}</RideCtx.Provider>;
}

/* ───────────────────────────── Shared styles ───────────────────────────── */

const styles = StyleSheet.create({
  abs: {position: 'absolute', left: 0, top: 0},
  absFill: {...StyleSheet.absoluteFillObject},
  world: {position: 'absolute', left: 0, top: 0, width: 2500, height: 1620},
  anchor: {position: 'absolute', left: 0, top: 0},
  // flow
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

/* ═══════════════════════════════════════════════════════════════════════
 *  ILLUSTRATED CITY — isometric, alive (two-way roads, signals, cars, buses, people)
 *  Grid: 10×10 blocks, 100 units apart. Roads sit on multiples of 100, lanes at ±7.5.
 * ═══════════════════════════════════════════════════════════════════════ */

const NB = 10, RW = 15, LOT = 70, LANE = 7.5, STOP = 26, LO = -200, LEN = 1400;
const SW = 2500, SH = 1620, OX = 1250, OY = 360;
export const CENTER = 500;
const T0 = Date.now(), CYCLE = 12, MOVE_T = 4.2;
const MAP_TOP = 100;
const TOP_SAFE = MAP_TOP + 24;
/** performance knobs */
const TRAFFIC_DENSITY = 2; // cars per lane (44 lanes)
const PED_COUNT = 60;
/**
 * Depth sorting: cars, pedestrians and the taxi get zIndex = 400 + (x + y) / DEPTH_STEP, so whatever is further
 * "down" the isometric screen draws on top. The value is quantised, so the native view order is only touched when a
 * vehicle crosses a DEPTH_STEP boundary (not every frame) — this keeps Android cheap.
 * If you ever see jank on a low-end Android, raise DEPTH_STEP (e.g. 30) or set DEPTH_SORT = false.
 * Buildings (BlockLayer) sit at zIndex 5000, so they always stay in front of vehicles.
 */
const DEPTH_SORT = true;
const DEPTH_STEP = 20;
const depthZ = (x: number, y: number, bias = 0) => { 'worklet'; return DEPTH_SORT ? 400 + Math.round((x + y) / DEPTH_STEP) + bias : 0; };

const P = (x: number, y: number, z = 0): [number, number] => { 'worklet'; return [(x - y) * 0.866, (x + y) * 0.5 - z]; };
const f1 = (n: number) => n.toFixed(1);
const pts = (a: [number, number][]) => a.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ');
const pd = (a: [number, number][]) => 'M' + a.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';

type Shape =
  | {k: 'p'; pts: string; f: string; o?: number; s?: string; w?: number}
  | {k: 'd'; d: string; f: string; o?: number}
  | {k: 'c'; x: number; y: number; r: number; f: string; o?: number}
  | {k: 'e'; x: number; y: number; rx: number; ry: number; f: string; o?: number; s?: string; w?: number};
const poly = (a: [number, number][], f: string, o?: number, s?: string, w?: number): Shape => ({k: 'p', pts: pts(a), f, o, s, w});
const hx = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) => { const x = hx(a), y = hx(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
type Dk = (c: string) => string;

/** an iso box: c = [top, front-left face, front-right face] */
function box(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, c: string[], win: boolean, d: Dk, dark = false, R: () => number = Math.random): Shape[] {
  const o: Shape[] = [
    poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], d(c[1])),
    poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], d(c[2])),
    poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], d(c[0])),
  ];
  if (win) {
    const dx = x1 - x0, dy = y1 - y0, n1 = Math.max(2, Math.floor(dx / 12)), n2 = Math.max(2, Math.floor(dy / 12));
    let l1 = '', u1 = '', l2 = '', u2 = '';
    for (let a = z0 + 11; a + 8 < z1 - 3; a += 14) {
      for (let q = 0; q < n1; q++) {
        const u = 0.1 + (0.8 * q) / n1, v = u + (0.8 / n1) * 0.62;
        const p = pd([P(x0 + dx * u, y1, a), P(x0 + dx * v, y1, a), P(x0 + dx * v, y1, a + 8), P(x0 + dx * u, y1, a + 8)]);
        if (dark && R() < 0.55) l1 += p; else u1 += p;
      }
      for (let q = 0; q < n2; q++) {
        const u = 0.1 + (0.8 * q) / n2, v = u + (0.8 / n2) * 0.62;
        const p = pd([P(x1, y0 + dy * u, a), P(x1, y0 + dy * v, a), P(x1, y0 + dy * v, a + 8), P(x1, y0 + dy * u, a + 8)]);
        if (dark && R() < 0.55) l2 += p; else u2 += p;
      }
    }
    o.push({k: 'd', d: u1, f: dark ? '#222b44' : '#7fa3cf', o: 0.92}, {k: 'd', d: u2, f: dark ? '#1b2238' : '#5a7fae', o: 0.92});
    if (dark) o.push({k: 'd', d: l1, f: '#ffe08a'}, {k: 'd', d: l2, f: YELLOW});
    o.push(
      poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z0 + 9), P(x0, y1, z0 + 9)], d('#4b5266'), 0.45),
      poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z0 + 9), P(x1, y0, z0 + 9)], d('#3a4052'), 0.45),
    );
  }
  return o;
}

const PAL = [
  ['#eef0f7', '#dfe3f0', '#c4cae0'], ['#f5e5c6', '#ecd6ad', '#d9bf90'], ['#f2cdb0', '#e8b896', '#d39c78'], ['#e6efdf', '#d3e2c9', '#b9cfae'],
  ['#f4d9dc', '#e7c0c5', '#cfa3aa'], ['#d9eceb', '#c1dddc', '#a3c3c2'], ['#ece6f5', '#d9cfe9', '#bdb0d5'], ['#f3ecdd', '#e4d8bf', '#cdbf9f'],
];

function roofBits(bx0: number, by0: number, bx1: number, by1: number, h: number, R: () => number, d: Dk): Shape[] {
  const o: Shape[] = [], w = bx1 - bx0, l = by1 - by0;
  if (R() < 0.8) o.push(...box(bx0 + 4, by0 + 4, bx0 + 4 + Math.min(10, w * 0.3), by0 + 4 + Math.min(8, l * 0.25), h, h + 5, ['#dfe3ea', '#bfc5d0', '#a2a9b6'], false, d));
  if (R() < 0.5) {
    const [a, b] = P(bx1 - 9, by1 - 9, h);
    o.push({k: 'e', x: a, y: b, rx: 4.2, ry: 2, f: d('#7e8797')}, {k: 'd', d: `M${f1(a - 4)} ${f1(b)}L${f1(a - 4)} ${f1(b - 9)}L${f1(a + 4)} ${f1(b - 9)}L${f1(a + 4)} ${f1(b)}Z`, f: d('#9aa3b2')}, {k: 'e', x: a, y: b - 9, rx: 4.2, ry: 2.2, f: d('#c3cad6')});
  }
  if (R() < 0.35) { const [a, b] = P(bx0 + w / 2, by0 + l / 2, h); o.push({k: 'd', d: `M${f1(a - 0.5)} ${f1(b)}L${f1(a - 0.5)} ${f1(b - 16)}L${f1(a + 0.5)} ${f1(b - 16)}L${f1(a + 0.5)} ${f1(b)}Z`, f: d('#555b68')}, {k: 'c', x: a, y: b - 16, r: 1.3, f: '#ff4a4a'}); }
  return o;
}

type TreeKind = 'round' | 'pine' | 'palm' | 'bloom';
function tree(x: number, y: number, kind: TreeKind, d: Dk, R: () => number): Shape[] {
  const [a, b] = P(x, y);
  const o: Shape[] = [{k: 'e', x: a + 3, y: b + 1.5, rx: 10, ry: 4.5, f: '#000000', o: 0.16}];
  const trunk = (h: number, w = 1.4) => `M${f1(a - w)} ${f1(b)}L${f1(a - w)} ${f1(b - h)}L${f1(a + w)} ${f1(b - h)}L${f1(a + w)} ${f1(b)}Z`;
  if (kind === 'pine') {
    o.push({k: 'd', d: trunk(14), f: d('#6b4a2b')},
      {k: 'd', d: `M${f1(a - 10)} ${f1(b - 9)}L${f1(a)} ${f1(b - 33)}L${f1(a + 10)} ${f1(b - 9)}Z`, f: d('#2c7a43')},
      {k: 'd', d: `M${f1(a - 8)} ${f1(b - 20)}L${f1(a)} ${f1(b - 42)}L${f1(a + 8)} ${f1(b - 20)}Z`, f: d('#3f9d57')});
  } else if (kind === 'palm') {
    let l1 = '', l2 = '';
    for (let k = 0; k < 7; k++) {
      const th = (k / 7) * Math.PI * 2 + R() * 0.4, tx = a + Math.cos(th) * 14, ty = b - 30 + Math.sin(th) * 6 + 5, mx = a + Math.cos(th) * 7, my = b - 30 + Math.sin(th) * 3 - 3;
      const s = `M${f1(a)} ${f1(b - 30)}L${f1(mx)} ${f1(my - 2.2)}L${f1(tx)} ${f1(ty)}L${f1(mx)} ${f1(my + 2.2)}Z`;
      if (k % 2) l1 += s; else l2 += s;
    }
    o.push({k: 'd', d: trunk(29, 1.2), f: d('#8a6a45')}, {k: 'd', d: l1, f: d('#2f9a4a')}, {k: 'd', d: l2, f: d('#45b85c')}, {k: 'c', x: a, y: b - 29, r: 1.8, f: d('#6b4a2b')});
  } else {
    const bl = kind === 'bloom';
    o.push({k: 'd', d: trunk(17), f: d('#6b4a2b')},
      {k: 'c', x: a, y: b - 25, r: 11.5, f: d(bl ? '#e58fb0' : '#2f8a3c')},
      {k: 'c', x: a - 2, y: b - 28, r: 8.8, f: d(bl ? '#f4a9c6' : '#46a64a')},
      {k: 'c', x: a - 4, y: b - 31, r: 4, f: d(bl ? '#ffd6e6' : '#8bd46c')});
    if (bl) for (let k = 0; k < 6; k++) o.push({k: 'c', x: a + (R() - 0.5) * 18, y: b - 25 + (R() - 0.5) * 14, r: 1.4, f: d('#ffffff')});
  }
  return o;
}

/* ───────────── extra building parts: pitched roofs, cones, cylinders, domes ───────────── */

/** pitched (gable) roof sitting on top of a box. c = [front slope, back slope, gable end]. Keep h < half the roof depth. */
function gable(x0: number, y0: number, x1: number, y1: number, z: number, h: number, c: string[], d: Dk, alongX = true): Shape[] {
  if (alongX) {
    const ym = (y0 + y1) / 2;
    return [
      poly([P(x0, y0, z), P(x1, y0, z), P(x1, ym, z + h), P(x0, ym, z + h)], d(c[1])),
      poly([P(x1, y0, z), P(x1, y1, z), P(x1, ym, z + h)], d(c[2])),
      poly([P(x0, y1, z), P(x1, y1, z), P(x1, ym, z + h), P(x0, ym, z + h)], d(c[0])),
    ];
  }
  const xm = (x0 + x1) / 2;
  return [
    poly([P(x0, y0, z), P(x0, y1, z), P(xm, y1, z + h), P(xm, y0, z + h)], d(c[1])),
    poly([P(x0, y1, z), P(x1, y1, z), P(xm, y1, z + h)], d(c[2])),
    poly([P(x1, y0, z), P(x1, y1, z), P(xm, y1, z + h), P(xm, y0, z + h)], d(c[0])),
  ];
}
/** conical roof / turret cap. c = [left, base, right] */
function cone(cx: number, cy: number, r: number, z: number, h: number, c: string[], d: Dk): Shape[] {
  const [a, b] = P(cx, cy, z), rx = r * 1.2247, ry = r * 0.7071;
  return [
    {k: 'e', x: a, y: b, rx, ry, f: d(c[1])},
    {k: 'd', d: `M${f1(a - rx)} ${f1(b)}L${f1(a)} ${f1(b - h)}L${f1(a)} ${f1(b + ry)}Z`, f: d(c[0])},
    {k: 'd', d: `M${f1(a + rx)} ${f1(b)}L${f1(a)} ${f1(b - h)}L${f1(a)} ${f1(b + ry)}Z`, f: d(c[2])},
  ];
}
/** round tower. c = [top, left face, right face] */
function cylinder(cx: number, cy: number, r: number, z0: number, z1: number, c: string[], d: Dk): Shape[] {
  const [a, b0] = P(cx, cy, z0), b1 = P(cx, cy, z1)[1], rx = r * 1.2247, ry = r * 0.7071;
  return [
    {k: 'e', x: a, y: b0, rx, ry, f: d(c[2])},
    {k: 'd', d: `M${f1(a - rx)} ${f1(b0)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(a)} ${f1(b0 + ry)}L${f1(a)} ${f1(b0)}Z`, f: d(c[1])},
    {k: 'd', d: `M${f1(a - rx)} ${f1(b0)}L${f1(a)} ${f1(b0)}L${f1(a)} ${f1(b1)}L${f1(a - rx)} ${f1(b1)}Z`, f: d(c[1])},
    {k: 'd', d: `M${f1(a)} ${f1(b0)}L${f1(a + rx)} ${f1(b0)}L${f1(a + rx)} ${f1(b1)}L${f1(a)} ${f1(b1)}Z`, f: d(c[2])},
    {k: 'e', x: a, y: b1, rx, ry, f: d(c[0])},
  ];
}
function dome(cx: number, cy: number, r: number, z: number, h: number, c: string[], d: Dk): Shape[] {
  const [a, b] = P(cx, cy, z), rx = r * 1.2247;
  return [
    {k: 'd', d: `M${f1(a - rx)} ${f1(b)}A${f1(rx)} ${f1(h)} 0 0 1 ${f1(a)} ${f1(b - h)}L${f1(a)} ${f1(b)}Z`, f: d(c[0])},
    {k: 'd', d: `M${f1(a)} ${f1(b - h)}A${f1(rx)} ${f1(h)} 0 0 1 ${f1(a + rx)} ${f1(b)}L${f1(a)} ${f1(b)}Z`, f: d(c[2])},
    {k: 'c', x: a, y: b - h - 1.5, r: 1.5, f: d('#d4a72c')},
  ];
}

/** Iron-market style hall: red walls, arched openings, green tin roof, corner turrets and a central clock tower */
function ironMarket(x0: number, y0: number, x1: number, y1: number, d: Dk): Shape[] {
  const o: Shape[] = [], H = 15, RED = ['#e0a69a', '#c4453a', '#9c2f27'], GREEN = ['#3fae7c', '#2f8f6b', '#237557'];
  const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
  o.push(...box(x0, y0, x1, y1, 1, H, RED, false, d));
  let a1 = '', a2 = '';
  for (let q = 0; q < 5; q++) {
    const u = 0.08 + q * 0.18, v = u + 0.11, w = (u + v) / 2;
    a1 += pd([P(x0 + (x1 - x0) * u, y1, 2), P(x0 + (x1 - x0) * v, y1, 2), P(x0 + (x1 - x0) * v, y1, 9), P(x0 + (x1 - x0) * w, y1, 11.8), P(x0 + (x1 - x0) * u, y1, 9)]);
    a2 += pd([P(x1, y0 + (y1 - y0) * u, 2), P(x1, y0 + (y1 - y0) * v, 2), P(x1, y0 + (y1 - y0) * v, 9), P(x1, y0 + (y1 - y0) * w, 11.8), P(x1, y0 + (y1 - y0) * u, 9)]);
  }
  o.push({k: 'd', d: a1, f: d('#33150f')}, {k: 'd', d: a2, f: d('#26100b')},
    poly([P(x0, y1, H - 2.6), P(x1, y1, H - 2.6), P(x1, y1, H), P(x0, y1, H)], '#f4e9d0', 0.9),
    poly([P(x1, y0, H - 2.6), P(x1, y1, H - 2.6), P(x1, y1, H), P(x1, y0, H)], '#e6d9b8', 0.9));
  o.push(...gable(x0 - 1, y0 - 1, x1 + 1, y1 + 1, H, 10, ['#9fc0ab', '#7fa38d', '#5f8670'], d, true));
  o.push(...box(xm - 5, ym - 5, xm + 5, ym + 5, H + 3, H + 17, RED, false, d), ...cone(xm, ym, 7.2, H + 17, 12, GREEN, d));
  const tur: [number, number][] = [[x0 + 5, y1 - 5], [x1 - 5, y0 + 5], [x1 - 5, y1 - 5]];
  for (const [cx, cy] of tur) o.push(...box(cx - 4, cy - 4, cx + 4, cy + 4, 1, H + 9, RED, false, d), ...cone(cx, cy, 6.4, H + 9, 10, GREEN, d));
  return o;
}

/** open street market: tin-roofed hall at the back, rows of striped-awning stalls, colourful parasols */
function bazaar(x0: number, y0: number, x1: number, y1: number, d: Dk): Shape[] {
  const o: Shape[] = [], hx0 = x0 + 8, hx1 = x1 - 8, hy0 = y0 + 8;
  const cols = ['#e5484d', '#ffb02e', '#3d6db5', '#2f8f6b', '#b57bff', '#ff6b4a'];
  o.push(...box(hx0, hy0, hx1, hy0 + 16, 1, 9, ['#d8d3c8', '#c9c2b2', '#a79f8d'], false, d), ...gable(hx0 - 1, hy0 - 1, hx1 + 1, hy0 + 17, 9, 6.5, ['#a9bac6', '#8a9eae', '#6f8393'], d, true));
  for (const [px, py, ci] of [[hx0 + 8, hy0 + 20, 0], [hx0 + 27, hy0 + 20, 1], [hx0 + 45, hy0 + 20, 3]] as [number, number, number][]) {
    const [a, b] = P(px, py);
    o.push({k: 'e', x: a + 2, y: b + 1, rx: 7, ry: 3, f: '#000000', o: 0.14}, {k: 'd', d: `M${f1(a - 0.6)} ${f1(b)}L${f1(a - 0.6)} ${f1(b - 13)}L${f1(a + 0.6)} ${f1(b - 13)}L${f1(a + 0.6)} ${f1(b)}Z`, f: d('#5b5f6b')}, {k: 'e', x: a, y: b - 13, rx: 8, ry: 4, f: d(cols[ci])}, {k: 'e', x: a, y: b - 13.6, rx: 3.6, ry: 1.8, f: d('#ffffff'), o: 0.8});
  }
  const stalls: [number, number, number][] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) stalls.push([hx0 + c * 17.5, hy0 + 24 + r * 17, (r * 3 + c) % cols.length]);
  stalls.sort((p, q) => p[0] + p[1] - q[0] - q[1]);
  for (const [sx, sy, ci] of stalls) {
    o.push(...box(sx, sy, sx + 13, sy + 9, 1, 6, ['#e9dfc8', '#d8c9a4', '#b9a77d'], false, d));
    for (let q = 0; q < 4; q++) {
      const xa = sx + (13 * q) / 4, xb = sx + (13 * (q + 1)) / 4;
      o.push(poly([P(xa, sy + 9, 9), P(xb, sy + 9, 9), P(xb, sy + 14, 6), P(xa, sy + 14, 6)], d(q % 2 ? '#ffffff' : cols[ci])));
    }
    o.push({k: 'c', x: P(sx + 6.5, sy + 4.5, 7)[0], y: P(sx + 6.5, sy + 4.5, 7)[1], r: 1.6, f: d(cols[(ci + 2) % cols.length])});
  }
  return o;
}

/** a cluster of small gingerbread-style houses: bright walls, pitched tin roofs, balconies, shutters-style windows */
function houses(x0: number, y0: number, x1: number, y1: number, d: Dk, dark: boolean, R: () => number): Shape[] {
  const o: Shape[] = [];
  const HC = [['#fbd0cb', '#f4a6a0', '#e07a72'], ['#d3ecf7', '#9fd1e8', '#6fb0d0'], ['#fdeaa8', '#f6d77a', '#dcb24a'], ['#d6f0cf', '#a8dba0', '#7cc072'], ['#e8d5f5', '#c9a6e8', '#a67fcb']];
  const RC = [['#f0955a', '#d9622b', '#b84e1f'], ['#b9c6d1', '#8fa0b0', '#6f8294'], ['#e56e62', '#c4453a', '#9c2f27'], ['#5b95d6', '#3d6db5', '#2d5490']];
  const spots: number[][] = [[x0 + 8, y0 + 8, 22, 22], [x0 + 38, y0 + 9, 22, 20], [x0 + 9, y0 + 38, 24, 22], [x0 + 38, y0 + 37, 22, 24]];
  spots.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  const glass = dark ? '#ffe08a' : '#7fa3cf';
  for (const [sx, sy, w, l] of spots) {
    const pal = HC[Math.floor(R() * HC.length)], rc = RC[Math.floor(R() * RC.length)], h = 13 + R() * 8;
    const fy = (u0: number, u1: number, z0: number, z1: number) => pd([P(sx + w * u0, sy + l, z0), P(sx + w * u1, sy + l, z0), P(sx + w * u1, sy + l, z1), P(sx + w * u0, sy + l, z1)]);
    const fx = (u0: number, u1: number, z0: number, z1: number) => pd([P(sx + w, sy + l * u0, z0), P(sx + w, sy + l * u1, z0), P(sx + w, sy + l * u1, z1), P(sx + w, sy + l * u0, z1)]);
    o.push(...box(sx, sy, sx + w, sy + l, 1, h, pal, false, d));
    o.push({k: 'd', d: fy(0.12, 0.32, h * 0.55, h * 0.85) + fy(0.68, 0.88, h * 0.55, h * 0.85) + fy(0.12, 0.32, 3, h * 0.4) + fy(0.68, 0.88, 3, h * 0.4) + fx(0.2, 0.45, h * 0.45, h * 0.8) + fx(0.58, 0.82, h * 0.45, h * 0.8), f: d(glass)});
    o.push({k: 'd', d: fy(0.4, 0.6, 1, h * 0.45), f: d('#6b4a2b')});
    o.push(...box(sx + 1.5, sy + l, sx + w - 1.5, sy + l + 3.5, h * 0.5, h * 0.5 + 1.2, ['#ffffff', '#f1f1f1', '#d5d5d5'], false, d));
    o.push(poly([P(sx, sy + l, h - 2.5), P(sx + w, sy + l, h - 2.5), P(sx + w, sy + l, h), P(sx, sy + l, h)], '#ffffff', 0.85));
    o.push(...gable(sx - 1.5, sy - 1.5, sx + w + 1.5, sy + l + 1.5, h, 7, rc, d, R() < 0.5));
  }
  return o;
}

/** fixed landmark lots (grid cell → kind): an iron-market hall and two street bazaars */
const SPECIAL: Record<string, string> = {'3_5': 'iron', '6_3': 'bazaar', '1_7': 'bazaar'};

interface Block { id: string; x0: number; y0: number; hh: number; shapes: Shape[] }
interface City { ground: Shape[]; blocks: Block[]; bg: string }
const cityCache: Record<string, City> = {};
const getCity = (dark: boolean) => { const k = dark ? 'd' : 'l'; if (!cityCache[k]) cityCache[k] = buildCity(dark); return cityCache[k]; };

function buildCity(dark: boolean): City {
  const d: Dk = c => (dark ? mix(c, '#080a14', 0.55) : c);
  const R = rng(23);
  const ground: Shape[] = [], gShapes: Shape[] = [], blocks: Block[] = [];
  const rc = (x0: number, y0: number, x1: number, y1: number, z = 0.5) => pd([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)]);
  const vb = (x: number, y: number, z0: number, z1: number, w: number) => { const [px, py] = P(x, y); return `M${f1(px - w)} ${f1(py - z0)}L${f1(px + w)} ${f1(py - z0)}L${f1(px + w)} ${f1(py - z1)}L${f1(px - w)} ${f1(py - z1)}Z`; };
  const dot = (x: number, y: number, z: number, r: number) => { const [px, py] = P(x, y, z); return `M${f1(px - r)} ${f1(py)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`; };
  const FL = ['#ff5f8f', '#ffb02e', '#ffffff', '#b57bff', '#ff6b4a', YELLOW];
  const flo: Record<string, string> = {}; FL.forEach(c => (flo[c] = ''));
  const bloom = (x: number, y: number, z = 3.2) => { const c = FL[Math.floor(R() * FL.length)]; flo[c] += dot(x, y, z, 1.25); };
  let asphalt = '', sidewalk = '', pave = '', grass = '', sand = '', hedge = '', bed = '', mark = '', yel = '', stop = '', shadow = '', pole = '', planter = '', lamp = '', glow = '', core = '';

  for (let c = -2; c <= NB + 2; c++) asphalt += rc(-300, c * 100 - RW, 1300, c * 100 + RW, 0.4) + rc(c * 100 - RW, -300, c * 100 + RW, 1300, 0.4);

  // intersections: zebra crossings, stop lines, double-yellow centre lines, signal poles
  for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) {
    if ((i + j) % 3 !== 0) continue;
    const cx = i * 100, cy = j * 100;
    for (let k = 0; k < 5; k++) {
      const o = -13.5 + k * 5.4;
      mark += rc(cx + 16, cy + o, cx + 22, cy + o + 2.8, 0.6) + rc(cx - 22, cy + o, cx - 16, cy + o + 2.8, 0.6) + rc(cx + o, cy + 16, cx + o + 2.8, cy + 22, 0.6) + rc(cx + o, cy - 22, cx + o + 2.8, cy - 16, 0.6);
    }
    stop += rc(cx + 23, cy - 14.5, cx + 25.4, cy - 0.5, 0.6) + rc(cx - 25.4, cy + 0.5, cx - 23, cy + 14.5, 0.6) + rc(cx - 14.5, cy - 25.4, cx - 0.5, cy - 23, 0.6) + rc(cx + 0.5, cy + 23, cx + 14.5, cy + 25.4, 0.6);
    if (i < NB) yel += rc(cx + 28, cy - 1.6, cx + 72, cy - 0.7, 0.6) + rc(cx + 28, cy + 0.7, cx + 72, cy + 1.6, 0.6);
    if (j < NB) yel += rc(cx - 1.6, cy + 28, cx - 0.7, cy + 72, 0.6) + rc(cx + 0.7, cy + 28, cx + 1.6, cy + 72, 0.6);
    pole += vb(cx + 19, cy - 19, 0, 30, 0.8) + vb(cx - 19, cy + 19, 0, 30, 0.8);
  }

  const cells: [number, number][] = [];
  for (let j = -2; j < NB + 2; j++) for (let i = -2; i < NB + 2; i++) cells.push([i, j]);
  cells.sort((a, b) => a[0] + a[1] - b[0] - b[1] || a[0] - b[0]); // painter's order

  const tk = (): TreeKind => { const r = R(); return r < 0.3 ? 'palm' : r < 0.6 ? 'round' : r < 0.8 ? 'bloom' : 'pine'; };

  for (const [i, j] of cells) {
    const x0 = i * 100 + 15, y0 = j * 100 + 15, x1 = x0 + LOT, y1 = y0 + LOT;
    const inner = i >= 0 && i < NB && j >= 0 && j < NB;
    const r = R();
    const kind: string = !inner ? 'far' : SPECIAL[`${i}_${j}`] ?? (r < 0.10 ? 'park' : r < 0.22 ? 'shops' : r < 0.32 ? 'tower' : r < 0.42 ? 'mid' : r < 0.52 ? 'lshape' : r < 0.60 ? 'cyl' : r < 0.69 ? 'glass' : r < 0.79 ? 'houses' : r < 0.89 ? 'stepped' : 'shops');
    const pal = PAL[Math.floor(R() * PAL.length)];
    const bs: Shape[] = [], trees: [number, number, TreeKind][] = [];
    let hh = 0;
    const edgeTree = () => { const e = Math.floor(R() * 4), t = 10 + R() * (LOT - 20), k = tk(); trees.push(e === 0 ? [x0 + 3, y0 + t, k] : e === 1 ? [x0 + t, y0 + 3, k] : e === 2 ? [x1 - 3, y0 + t, k] : [x0 + t, y1 - 3, k]); };
    const shade = (bx0: number, by0: number, bx1: number, by1: number, h: number) => { const sh = Math.min(12, h * 0.22); shadow += pd([P(bx1, by0, 1.2), P(bx1 + sh, by0 + sh, 1.2), P(bx1 + sh, by1 + sh, 1.2), P(bx0 + sh, by1 + sh, 1.2), P(bx0, by1, 1.2), P(bx1, by1, 1.2)]); };
    sidewalk += rc(x0, y0, x1, y1, 1);

    if (kind === 'park') {
      grass += rc(x0 + 5, y0 + 5, x1 - 5, y1 - 5, 1.4);
      const mx = x0 + LOT / 2, my = y0 + LOT / 2;
      sand += rc(x0 + 5, my - 2.5, x1 - 5, my + 2.5, 1.6) + rc(mx - 2.5, y0 + 5, mx + 2.5, y1 - 5, 1.6);
      const [pa, pb] = P(mx + 15, my + 15, 1.8);
      gShapes.push({k: 'e', x: pa, y: pb, rx: 12, ry: 7, f: d('#7fc1ea'), s: '#ffffff', w: 2});
      const bx = mx - 24, by = my - 24;
      bed += rc(bx, by, bx + 16, by + 16, 1.7) + rc(mx + 8, my - 26, mx + 24, my - 10, 1.7);
      for (let k = 0; k < 16; k++) { bloom(bx + 1.5 + R() * 13, by + 1.5 + R() * 13, 2.6); bloom(mx + 9.5 + R() * 13, my - 24.5 + R() * 13, 2.6); }
      for (let k = 0; k < 7; k++) {
        const tx = x0 + 9 + R() * 52, ty = y0 + 9 + R() * 52;
        if (Math.abs(tx - mx) < 6 || Math.abs(ty - my) < 6 || (tx > mx - 26 && tx < mx - 6 && ty > my - 26 && ty < my - 6)) continue;
        trees.push([tx, ty, tk()]);
      }
      hh = 48;
    } else if (kind === 'far') {
      const h = 10 + R() * 28;
      pave += rc(x0 + 5, y0 + 5, x1 - 5, y1 - 5, 1.3);
      bs.push(...box(x0 + 8, y0 + 8, x1 - 8, y1 - 8, 1, h, pal, false, d));
      if (R() < 0.5) edgeTree();
      hh = h;
    } else {
      pave += rc(x0 + 5, y0 + 5, x1 - 5, y1 - 5, 1.3);
      const m = kind === 'shops' ? 11 + R() * 3 : kind === 'tower' ? 15 + R() * 4 : 12 + R() * 4;
      const bx0 = x0 + m, by0 = y0 + m, bx1 = x1 - m, by1 = y1 - m;
      if (kind === 'shops') {
        const h = 18 + R() * 10;
        bs.push(...box(bx0, by0, bx1, by1, 1, h, pal, true, d, dark, R));
        let yw = '', ww = '';
        for (let q = 0, xa = bx0; xa < bx1 - 0.1; q++, xa += 6) { const xb = Math.min(bx1, xa + 6), s = pd([P(xa, by1, 15), P(xb, by1, 15), P(xb, by1 + 4.5, 11), P(xa, by1 + 4.5, 11)]); if (q % 2) ww += s; else yw += s; }
        for (let q = 0, ya = by0; ya < by1 - 0.1; q++, ya += 6) { const yb = Math.min(by1, ya + 6), s = pd([P(bx1, ya, 15), P(bx1, yb, 15), P(bx1 + 4.5, yb, 11), P(bx1 + 4.5, ya, 11)]); if (q % 2) ww += s; else yw += s; }
        bs.push({k: 'd', d: yw, f: d(YELLOW)}, {k: 'd', d: ww, f: d('#ffffff')}, ...roofBits(bx0, by0, bx1, by1, h, R, d));
        shade(bx0, by0, bx1, by1, h); hh = h + 12;
      } else if (kind === 'tower') {
        const h = 38 + R() * 22, h2 = 24 + R() * 40, q = 7 + R() * 3;
        bs.push(...box(bx0, by0, bx1, by1, 1, h, pal, true, d, dark, R), ...box(bx0 + q, by0 + q, bx1 - q, by1 - q, h, h + h2, pal, true, d, dark, R));
        const [a, b] = P((bx0 + bx1) / 2, (by0 + by1) / 2, h + h2);
        bs.push(...box((bx0 + bx1) / 2 - 3, (by0 + by1) / 2 - 3, (bx0 + bx1) / 2 + 3, (by0 + by1) / 2 + 3, h + h2, h + h2 + 7, PAL[0], false, d), {k: 'd', d: `M${f1(a - 0.5)} ${f1(b - 7)}L${f1(a - 0.5)} ${f1(b - 22)}L${f1(a + 0.5)} ${f1(b - 22)}L${f1(a + 0.5)} ${f1(b - 7)}Z`, f: d('#555b68')}, {k: 'c', x: a, y: b - 22, r: 1.4, f: '#ff4a4a'});
        shade(bx0, by0, bx1, by1, h + h2); hh = h + h2 + 24;
      } else if (kind === 'lshape') {
        const h = 34 + R() * 18, h2 = 16 + R() * 12, mx = (bx0 + bx1) / 2, my = (by0 + by1) / 2;
        bs.push(...box(bx0, by0, mx, by1, 1, h, pal, true, d, dark, R), ...box(mx, by0, bx1, my, 1, h2, PAL[Math.floor(R() * PAL.length)], true, d, dark, R), ...roofBits(bx0, by0, mx, by1, h, R, d));
        shade(bx0, by0, bx1, by1, h); hh = h + 16;
      } else if (kind === 'glass') {
        const GL = ['#d4ecf5', '#8fc3dc', '#5c9bb8'], h = 46 + R() * 24, q = 6 + R() * 3, cxm = (bx0 + bx1) / 2, cym = (by0 + by1) / 2;
        bs.push(...box(bx0 - 1, by0 - 1, bx1 + 1, by1 + 1, 1, h, GL, true, d, dark, R), ...box(bx0 + q, by0 + q, bx1 - q, by1 - q, h, h + 16, GL, true, d, dark, R));
        const [a, b] = P(cxm, cym, h + 16);
        bs.push({k: 'd', d: `M${f1(a - 0.5)} ${f1(b)}L${f1(a - 0.5)} ${f1(b - 20)}L${f1(a + 0.5)} ${f1(b - 20)}L${f1(a + 0.5)} ${f1(b)}Z`, f: d('#555b68')}, {k: 'c', x: a, y: b - 20, r: 1.4, f: '#ff4a4a'});
        shade(bx0, by0, bx1, by1, h + 16); hh = h + 38;
      } else if (kind === 'stepped') {
        const h1 = 24 + R() * 10, h2 = h1 + 16 + R() * 8, h3 = h2 + 12 + R() * 8;
        bs.push(...box(bx0 - 2, by0 - 2, bx1 + 2, by1 + 2, 1, h1, pal, true, d, dark, R), ...box(bx0 + 4, by0 + 4, bx1 - 4, by1 - 4, h1, h2, pal, true, d, dark, R), ...box(bx0 + 9, by0 + 9, bx1 - 9, by1 - 9, h2, h3, pal, true, d, dark, R));
        shade(bx0, by0, bx1, by1, h3); hh = h3 + 10;
      } else if (kind === 'cyl') {
        const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, rr = 19 + R() * 3, h = 26 + R() * 14;
        const c1 = PAL[Math.floor(R() * PAL.length)], c2 = PAL[Math.floor(R() * PAL.length)];
        bs.push(...cylinder(cxm, cym, rr, 1, h, c1, d), ...cylinder(cxm, cym, rr - 5, h, h + 10, c2, d));
        let wn = '';
        for (let ang = -30; ang <= 120; ang += 25) for (const zf of [0.3, 0.55, 0.8]) {
          const th = (ang * Math.PI) / 180, [wa, wb] = P(cxm + rr * Math.cos(th), cym + rr * Math.sin(th), 1 + h * zf);
          wn += `M${f1(wa - 1.4)} ${f1(wb - 2.4)}h2.8v4.8h-2.8Z`;
        }
        bs.push({k: 'd', d: wn, f: dark ? '#ffe08a' : '#6f93bb', o: 0.9}, ...dome(cxm, cym, rr - 5, h + 10, 9 + R() * 5, ['#f4f4f4', '#e5e5ea', '#cfd2da'], d));
        shade(cxm - rr, cym - rr, cxm + rr, cym + rr, h + 10); hh = h + 28;
      } else if (kind === 'iron') {
        bs.push(...ironMarket(x0 + 9, y0 + 9, x1 - 9, y1 - 9, d));
        shade(x0 + 9, y0 + 9, x1 - 9, y1 - 9, 30); hh = 48;
      } else if (kind === 'bazaar') {
        bs.push(...bazaar(x0, y0, x1, y1, d));
        hh = 24;
      } else if (kind === 'houses') {
        bs.push(...houses(x0, y0, x1, y1, d, dark, R));
        hh = 30;
      } else {
        const h = 28 + R() * 22;
        bs.push(...box(bx0, by0, bx1, by1, 1, h, pal, true, d, dark, R), ...roofBits(bx0, by0, bx1, by1, h, R, d));
        shade(bx0, by0, bx1, by1, h); hh = h + 16;
      }
      const open = kind === 'iron' || kind === 'bazaar' || kind === 'houses';
      if (kind !== 'shops' && !open) hedge += rc(bx0 - 1, by1 + 1.5, bx1 + 1, by1 + 4.5, 1.8) + rc(bx1 + 1.5, by0 - 1, bx1 + 4.5, by1 + 1, 1.8);
      if (!open) for (let k = 0; k < 7; k++) { bloom(bx0 + R() * (bx1 - bx0), by1 + (kind === 'shops' ? 7 : 3), 3.4); bloom(bx1 + (kind === 'shops' ? 7 : 3), by0 + R() * (by1 - by0), 3.4); }
      const n = 2 + (R() < 0.5 ? 1 : 0); for (let k = 0; k < n; k++) edgeTree();
    }

    if (inner) { // planters + street lamps on the sidewalk
      for (const [px, py] of [[x0 + 6, y1 - 4.5], [x1 - 4.5, y0 + 6]]) { planter += rc(px - 2.4, py - 2.4, px + 2.4, py + 2.4, 2.8); for (let k = 0; k < 5; k++) bloom(px - 2 + R() * 4, py - 2 + R() * 4, 3.6); }
      for (const [lx, ly] of [[x0 + 28 + R() * 14, y0 + 2.8], [x1 - 2.8, y0 + 28 + R() * 14]]) {
        pole += vb(lx, ly, 0, 22, 0.7); lamp += dot(lx, ly, 23.5, 2.3);
        if (dark) { glow += dot(lx, ly, 22, 13); core += dot(lx, ly, 22, 5); }
      }
    }

    trees.sort((p, q) => p[0] + p[1] - q[0] - q[1]);
    const cdepth = (x0 + x1) / 2 + (y0 + y1) / 2, pre: Shape[] = [], post: Shape[] = [];
    trees.forEach(t => (kind === 'park' || t[0] + t[1] < cdepth ? pre : post).push(...tree(t[0], t[1], t[2], d, R)));
    blocks.push({id: `${i}_${j}`, x0, y0, hh, shapes: [...pre, ...bs, ...post]});
  }

  ground.push(
    poly([P(-700, -700), P(1900, -700), P(1900, 1900), P(-700, 1900)], d('#FFF8D6')),
    {k: 'd', d: asphalt, f: d('#555a69')}, {k: 'd', d: sidewalk, f: d('#d3cebf')}, {k: 'd', d: pave, f: d('#e6e2d5')},
    {k: 'd', d: grass, f: d('#a6d58a')}, {k: 'd', d: sand, f: d('#eadfc2')}, {k: 'd', d: hedge, f: d('#5fae56')}, {k: 'd', d: bed, f: d('#79b45f')},
    ...gShapes,
    {k: 'd', d: shadow, f: '#000000', o: 0.14},
    {k: 'd', d: mark, f: d('#f4f4f4'), o: 0.92}, {k: 'd', d: stop, f: d('#f4f4f4'), o: 0.95}, {k: 'd', d: yel, f: d(YELLOW)},
    {k: 'd', d: planter, f: d('#8a5a3a')},
    ...FL.map((c): Shape => ({k: 'd', d: flo[c], f: d(c)})),
    {k: 'd', d: pole, f: d('#2b2e38')}, {k: 'd', d: lamp, f: dark ? YELLOW : '#f6efc4'},
  );
  if (dark) ground.push({k: 'd', d: glow, f: YELLOW, o: 0.13}, {k: 'd', d: core, f: YELLOW, o: 0.4});
  return {ground, blocks, bg: d('#FFF8D6')};
}

/* ───────────── traffic + people (deterministic, driven by one shared clock) ───────────── */

interface CarSpec { axis: 0 | 1; dir: 1 | -1; lane: number; start: number; delay: number; kind: 'car' | 'bus'; color: string }
interface PedSpec { axis: 0 | 1; line: number; lo: number; hi: number; speed: number; off: number; shirt: string; skin: string }
const CAR_COL = ['#eceff4', '#2b3140', '#c0463d', '#3d6db5', '#8a93a3', YELLOW, '#2f8f6b', '#f2f2f2', '#6c4a9e'];
const BUS_COL = ['#d9433f', '#2d7bd6', YELLOW, '#1f9a63'];
const SHIRT = ['#e5484d', '#3d6db5', YELLOW, '#2f8f6b', '#8a5cc2', '#ff8a3d', '#ffffff', '#2b3140'];
const SKIN = ['#f1c9a5', '#e0ac82', '#c68a5e', '#8d5a3b', '#f5d7b8'];

/**
 * Every car advances exactly one block per signal cycle and rests just behind the stop line,
 * so traffic really stops on red and flows on green (horizontal and vertical phases alternate).
 * Cars in the same lane use different block slots, and the car in front always starts moving first
 * (delay grows toward the back of the queue), so a follower can never run into the car ahead.
 */
const carXY = (t: number, s: CarSpec): [number, number] => {
  'worklet';
  const cyc = Math.floor(t / CYCLE), f = t - cyc * CYCLE;
  const u = Math.min(1, Math.max(0, (f - s.axis * 6 - s.delay) / MOVE_T)), p = cyc + u * u * (3 - 2 * u);
  const a = LO + ((((s.start - LO + s.dir * 100 * p) % LEN) + LEN) % LEN);
  return s.axis === 0 ? [a, s.lane] : [s.lane, a];
};
const pedXY = (t: number, s: PedSpec): [number, number] => {
  'worklet';
  const L = s.hi - s.lo, q = (t * s.speed + s.off) % (2 * L), u = s.lo + (q < L ? q : 2 * L - q);
  return s.axis === 0 ? [u, s.line] : [s.line, u];
};
/** 0 = green (4.8 s), 1 = amber (1.2 s), 2 = red */
const lightState = (t: number, axis: number) => { const g = (((t - axis * 6) % CYCLE) + CYCLE) % CYCLE; return g < 4.8 ? 0 : g < 6 ? 1 : 2; };

function buildTraffic() {
  const R = rng(77), cars: CarSpec[] = [], peds: PedSpec[] = [];
  for (let axis = 0; axis < 2; axis++) for (let c = 0; c <= NB; c++) for (const dir of [1, -1] as const) {
    const slots = Array.from({length: 12}, (_, i) => i - 1).sort(() => R() - 0.5).slice(0, TRAFFIC_DENSITY);
    for (const I of slots) {
      const bus = R() < 0.1, half = bus ? 20 : 10;
      cars.push({axis: axis as 0 | 1, dir, kind: bus ? 'bus' : 'car', color: bus ? BUS_COL[Math.floor(R() * BUS_COL.length)] : CAR_COL[Math.floor(R() * CAR_COL.length)], delay: dir === 1 ? (10 - I) * 0.05 : (I + 1) * 0.05, start: I * 100 + (dir === 1 ? -(STOP + half) : STOP + half), lane: c * 100 + (axis === 0 ? dir * LANE : -dir * LANE)});
    }
  }
  for (let k = 0; k < PED_COUNT; k++) {
    const lo = Math.floor(R() * NB) * 100 + 28;
    peds.push({axis: R() < 0.5 ? 0 : 1, line: Math.floor(R() * (NB + 1)) * 100 + (R() < 0.5 ? -1 : 1) * (RW + 2.5), lo, hi: lo + 44, speed: 4 + R() * 5, off: R() * 90, shirt: SHIRT[Math.floor(R() * SHIRT.length)], skin: SKIN[Math.floor(R() * SKIN.length)]});
  }
  return {cars, peds};
}
let trafficCache: ReturnType<typeof buildTraffic> | null = null;
const getTraffic = () => { if (!trafficCache) trafficCache = buildTraffic(); return trafficCache; };

function vehicleShapes(axisY: boolean, color: string, bus: boolean, taxi: boolean, dark: boolean): Shape[] {
  const id: Dk = c => (dark ? mix(c, '#0a0c18', 0.28) : c);
  const hl = bus ? 20 : 10, hw = bus ? 5.6 : 4.6, H = bus ? 15 : 8;
  const X = axisY ? hw : hl, Y = axisY ? hl : hw;
  const o: Shape[] = [
    poly([P(-X - 2, -Y - 2, 0.4), P(X + 3, -Y - 2, 0.4), P(X + 3, Y + 3, 0.4), P(-X - 2, Y + 3, 0.4)], '#000000', 0.26),
    ...box(-X, -Y, X, Y, 2, H, [mix(color, '#ffffff', 0.25), color, mix(color, '#000000', 0.22)], false, id),
  ];
  const wh = (x: number, y: number) => { const [a, b] = P(x, y, 2.6); o.push({k: 'e', x: a, y: b, rx: 2.1, ry: 2.4, f: '#1b1c22'}, {k: 'c', x: a, y: b, r: 0.9, f: '#a9afbb'}); };
  const k = bus ? 0.62 : 0.55;
  if (axisY) { wh(X, -Y * k); wh(X, Y * k); } else { wh(-X * k, Y); wh(X * k, Y); }
  if (bus) {
    o.push(poly([P(-X + 2, Y, 6.5), P(X - 2, Y, 6.5), P(X - 2, Y, 12), P(-X + 2, Y, 12)], id('#8fb3d9')), poly([P(X, -Y + 2, 6.5), P(X, Y - 2, 6.5), P(X, Y - 2, 12), P(X, -Y + 2, 12)], id('#6f93bb')),
      poly([P(-X, Y, 3.4), P(X, Y, 3.4), P(X, Y, 5), P(-X, Y, 5)], '#ffffff', 0.85), poly([P(X, -Y, 3.4), P(X, Y, 3.4), P(X, Y, 5), P(X, -Y, 5)], '#ffffff', 0.7));
  } else {
    const cx = axisY ? X * 0.82 : X * 0.5, cy = axisY ? Y * 0.5 : Y * 0.82;
    o.push(...box(-cx, -cy, cx, cy, H, H + 5, [mix(color, '#ffffff', 0.15), '#a9c4da', '#86a6c0'], false, id));
  }
  if (taxi) o.push(...box(-2.2, -2.2, 2.2, 2.2, H + 5, H + 8.6, ['#ffffff', '#eeeeee', '#cfcfcf'], false, id));
  return o;
}
const spriteCache = new Map<string, Shape[]>();
const spriteShapes = (axisY: boolean, color: string, bus: boolean, taxi: boolean, dark: boolean) => {
  const k = `${axisY}|${color}|${bus}|${taxi}|${dark}`;
  let s = spriteCache.get(k);
  if (!s) { s = vehicleShapes(axisY, color, bus, taxi, dark); spriteCache.set(k, s); }
  return s;
};

const Shapes = memo(({shapes}: {shapes: Shape[]}) => <>{shapes.map((s, i) => {
  switch (s.k) {
    case 'p': return <Polygon key={i} points={s.pts} fill={s.f} fillOpacity={s.o} stroke={s.s} strokeWidth={s.w} />;
    case 'd': return <Path key={i} d={s.d} fill={s.f} fillOpacity={s.o} />;
    case 'c': return <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.f} fillOpacity={s.o} />;
    default: return <Ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={s.f} stroke={s.s} strokeWidth={s.w} fillOpacity={s.o ?? 1} />;
  }
})}</>);

/** the big ground SVG is cut into 2×2 tiles so Android never has to allocate one 2500×1620 surface */
const GroundLayer = memo(({ground}: {ground: Shape[]}) => {
  const w = SW / 2, h = SH / 2;
  return (
    <>{[0, 1].flatMap(r => [0, 1].map(c => {
      const x = c * w, y = r * h;
      return (
        <Svg key={`${r}${c}`} width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`} style={{position: 'absolute', left: x, top: y}}>
          <G x={OX} y={OY}><Shapes shapes={ground} /></G>
        </Svg>
      );
    }))}</>
  );
});
const BlockG = memo(({b, fade}: {b: Block; fade: boolean}) => <G opacity={fade ? 0.22 : 1}><Shapes shapes={b.shapes} /></G>);
/** zIndex 5000: buildings always draw in front of the depth-sorted vehicles and pedestrians (which live at ~350–700) */
const BlockLayer = memo(({blocks, fade}: {blocks: Block[]; fade: Record<string, boolean>}) => <Svg width={SW} height={SH} style={[styles.abs, {zIndex: 5000}]}><G x={OX} y={OY}>{blocks.map(b => <BlockG key={b.id} b={b} fade={!!fade[b.id]} />)}</G></Svg>);

const ClockCtx = createContext<SharedValue<number>>(null as unknown as SharedValue<number>);
const VB = '-30 -36 60 54';
const Sprite = memo(({axisY, color, bus, taxi, dark}: {axisY: boolean; color: string; bus?: boolean; taxi?: boolean; dark: boolean}) => {
  const sh = useMemo(() => spriteShapes(axisY, color, !!bus, !!taxi, dark), [axisY, color, bus, taxi, dark]);
  return <Svg width={60} height={54} viewBox={VB}><Shapes shapes={sh} /></Svg>;
});
const TrafficVehicle = memo(({s, dark}: {s: CarSpec; dark: boolean}) => {
  const clock = useContext(ClockCtx);
  const st = useAnimatedStyle(() => { const p = carXY(clock.value, s), q = P(p[0], p[1]); return {zIndex: depthZ(p[0], p[1]), transform: [{translateX: q[0] + OX - 30}, {translateY: q[1] + OY - 36}]}; });
  return <Animated.View pointerEvents="none" style={[styles.anchor, {width: 60, height: 54}, st]}><Sprite axisY={s.axis === 1} color={s.color} bus={s.kind === 'bus'} dark={dark} /></Animated.View>;
});
const Walker = memo(({s}: {s: PedSpec}) => {
  const clock = useContext(ClockCtx);
  const st = useAnimatedStyle(() => { const p = pedXY(clock.value, s), q = P(p[0], p[1]), bob = Math.abs(Math.sin(clock.value * 7 + s.off)) * 1.4; return {zIndex: depthZ(p[0], p[1]), transform: [{translateX: q[0] + OX - 4}, {translateY: q[1] + OY - 16 - bob}]}; });
  return (
    <Animated.View pointerEvents="none" style={[styles.anchor, {width: 8, height: 16, alignItems: 'center'}, st]}>
      <View style={{position: 'absolute', bottom: -1, width: 8, height: 3, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)'}} />
      <View style={{width: 4.6, height: 4.6, borderRadius: 3, backgroundColor: s.skin}} />
      <View style={{width: 6.4, height: 7, borderRadius: 2.5, backgroundColor: s.shirt, marginTop: 0.4}} />
      <View style={{flexDirection: 'row'}}><View style={{width: 2, height: 3.6, backgroundColor: '#2a2d3a', marginRight: 1.2}} /><View style={{width: 2, height: 3.6, backgroundColor: '#2a2d3a'}} /></View>
    </Animated.View>
  );
});

/* traffic signals: real 3-lamp heads (red / amber / green) drawn as a few SVG paths per tile instead of hundreds of Views.
   The state changes a handful of times per cycle → plain React, no per-frame work. */
const circ = (x: number, y: number, r: number) => `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const HEADS = (() => {
  const hs: [number, number][] = [], vs: [number, number][] = [];
  for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) {
    if ((i + j) % 3 !== 0) continue;
    const h = P(i * 100 + 19, j * 100 - 19, 25), v = P(i * 100 - 19, j * 100 + 19, 25);
    hs.push([h[0] + OX, h[1] + OY]); vs.push([v[0] + OX, v[1] + OY]);
  }
  const lamps = (a: [number, number][]) => { const r = ['', '', '']; for (const [x, y] of a) { r[0] += circ(x, y - 4.6, 1.7); r[1] += circ(x, y, 1.7); r[2] += circ(x, y + 4.6, 1.7); } return r; };
  let housing = '';
  for (const [x, y] of [...hs, ...vs]) housing += `M${f1(x - 3.1)} ${f1(y - 8)}h6.2v16h-6.2Z`;
  return {h: lamps(hs), v: lamps(vs), housing};
})();
const LAMP_COL = ['#ff4a4a', '#ffb800', '#38d46f']; // red, amber, green
const LightsLayer = memo(({h, v}: {h: number; v: number}) => {
  const w = SW / 2, hgt = SH / 2;
  return (
    <>{[0, 1].flatMap(r => [0, 1].map(c => {
      const x = c * w, y = r * hgt;
      return (
        <Svg key={`${r}${c}`} width={w} height={hgt} viewBox={`${x} ${y} ${w} ${hgt}`} style={{position: 'absolute', left: x, top: y}} pointerEvents="none">
          <Path d={HEADS.housing} fill="#14161c" />
          {HEADS.h.map((p, k) => <Path key={`h${k}`} d={p} fill={k === 2 - h ? LAMP_COL[k] : '#3a3d46'} />)}
          {HEADS.v.map((p, k) => <Path key={`v${k}`} d={p} fill={k === 2 - v ? LAMP_COL[k] : '#3a3d46'} />)}
        </Svg>
      );
    }))}</>
  );
});
function useLights(): [number, number] {
  const [s, setS] = useState<[number, number]>([0, 2]);
  useEffect(() => {
    const f = () => { const t = (Date.now() - T0) / 1000, a = lightState(t, 0), b = lightState(t, 1); setS(p => (p[0] === a && p[1] === b ? p : [a, b])); };
    f(); const id = setInterval(f, 200); return () => clearInterval(id);
  }, []);
  return s;
}

/* ───────────── route, markers, taxi ───────────── */

const APoly = Animated.createAnimatedComponent(Polyline);
function RouteLayer({path, prog}: {path: Pt[]; prog: SharedValue<number>}) {
  const g = useMemo(() => {
    const p = smooth(path).map(a => P(a[0], a[1], 1)), xs = p.map(a => a[0]), ys = p.map(a => a[1]);
    const x0 = Math.min(...xs) - 16, y0 = Math.min(...ys) - 16;
    let len = 0; for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return {pp: pts(p.map(a => [a[0] - x0, a[1] - y0] as [number, number])), x0, y0, w: Math.max(...xs) - x0 + 16, h: Math.max(...ys) - y0 + 16, len};
  }, [path]);
  const ap = useAnimatedProps(() => ({strokeDashoffset: g.len * (1 - prog.value)}));
  const dash = `${g.len} ${g.len}`;
  return (
    <Svg pointerEvents="none" style={{position: 'absolute', left: g.x0 + OX, top: g.y0 + OY}} width={g.w} height={g.h}>
      <APoly points={g.pp} fill="none" stroke="#111111" strokeOpacity={0.3} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} animatedProps={ap} />
      <APoly points={g.pp} fill="none" stroke={YELLOW} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} animatedProps={ap} />
    </Svg>
  );
}

interface Cam { camT: SharedValue<{tx: number; ty: number; s: number; bx: number; by: number}> }
const CamCtx = createContext<Cam>(null as unknown as Cam);
/** screen-space marker that follows a world point (pins, driver chips, radar) */
function Marker({x, y, z = 0, scaled, ax = 0, ay = 0, children}: {x: number | SharedValue<number>; y: number | SharedValue<number>; z?: number; scaled?: boolean; ax?: number; ay?: number; children: React.ReactNode}) {
  const {camT} = useContext(CamCtx);
  const st = useAnimatedStyle(() => {
    const wx = typeof x === 'number' ? x : x.value, wy = typeof y === 'number' ? y : y.value, p = P(wx, wy, z), c = camT.value;
    const X = c.tx + c.s * (p[0] + OX), Y = c.ty + c.s * (p[1] + OY);
    return {transform: scaled ? [{translateX: X}, {translateY: Y}, {scale: c.s}] : [{translateX: X}, {translateY: Y}]};
  });
  return <Animated.View pointerEvents="none" style={[styles.anchor, st]}><View style={{position: 'absolute', left: ax, top: ay}}>{children}</View></Animated.View>;
}

function DriverPin({d}: {d: MapDriver}) {
  const ring = useSharedValue(0), sc = useSharedValue(1);
  useEffect(() => { sc.value = withTiming(d.hl ? 1.18 : 1, {duration: 250}); if (d.hl) { ring.value = 0; ring.value = withTiming(1, {duration: 900}); } }, [d.hl]);
  const st = useAnimatedStyle(() => ({transform: [{scale: sc.value}]}));
  const rs = useAnimatedStyle(() => ({opacity: d.hl ? 1 - ring.value : 0, transform: [{scale: 1 + ring.value * 0.9}]}));
  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(250)} style={{alignItems: 'center', width: 60, opacity: d.dim ? 0.4 : 1}}>
      <View style={{width: 38, height: 38, alignItems: 'center', justifyContent: 'center'}}>
        <Animated.View style={[{position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: YELLOW}, rs]} />
        <Animated.View style={[{width: 36, height: 36, borderRadius: 18, backgroundColor: d.color, borderWidth: 3, borderColor: d.hl ? YELLOW : '#fff', alignItems: 'center', justifyContent: 'center'}, st]}><Text style={{color: '#fff', fontWeight: '800'}}>{d.initial}</Text></Animated.View>
      </View>
      <View style={{backgroundColor: '#111', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3}}><Text style={{color: YELLOW, fontSize: 10.5, fontWeight: '700'}}>{Math.max(1, d.eta - 1)}–{d.eta + 1} min</Text></View>
    </Animated.View>
  );
}

/** the passenger's taxi: yellow, roof sign, drives in the right-hand lane (bias +1 → wins depth ties against other cars) */
function Taxi({car, dark}: {car: SharedValue<number[]>; dark: boolean}) {
  const st = useAnimatedStyle(() => { const q = P(car.value[0], car.value[1]); return {zIndex: depthZ(car.value[0], car.value[1], 1), transform: [{translateX: q[0] + OX - 30}, {translateY: q[1] + OY - 36}]}; });
  const sa = useAnimatedStyle(() => ({opacity: Math.abs(Math.cos(car.value[2])) >= Math.abs(Math.sin(car.value[2])) ? 1 : 0}));
  const sb = useAnimatedStyle(() => ({opacity: Math.abs(Math.cos(car.value[2])) >= Math.abs(Math.sin(car.value[2])) ? 0 : 1}));
  return (
    <Animated.View pointerEvents="none" style={[styles.anchor, {width: 60, height: 54}, st]}>
      <Animated.View style={[styles.abs, sa]}><Sprite axisY={false} color={YELLOW} taxi dark={dark} /></Animated.View>
      <Animated.View style={[styles.abs, sb]}><Sprite axisY color={YELLOW} taxi dark={dark} /></Animated.View>
    </Animated.View>
  );
}

/** shift a polyline sideways (right-hand traffic) */
function offsetPath(p: Pt[], off: number): Pt[] {
  return p.map((a, i) => {
    const b = p[Math.max(0, i - 1)], c = p[Math.min(p.length - 1, i + 1)], dx = c[0] - b[0], dy = c[1] - b[1], l = Math.hypot(dx, dy) || 1;
    return [a[0] - (dy / l) * off, a[1] + (dx / l) * off] as Pt;
  });
}
/** buildings that stand in front of the taxi and cover it fade out */
function fadeSet(blocks: Block[], x: number, y: number) {
  const fade: Record<string, boolean> = {}, [px, py] = P(x, y);
  for (const b of blocks) {
    if (!b.hh || b.x0 + b.y0 + LOT <= x + y) continue;
    if (px > (b.x0 - b.y0 - LOT) * 0.866 - 12 && px < (b.x0 + LOT - b.y0) * 0.866 + 12 && py > (b.x0 + b.y0) * 0.5 - b.hh - 12 && py < (b.x0 + b.y0 + 2 * LOT) * 0.5 + 4) fade[b.id] = true;
  }
  return fade;
}

/**
 * Pan limit: the camera centre may only travel inside the diamond that is actually drawn
 * (grid −200…1200 → world px (1250,860) ± (1212, 700)), so the user never scrolls into empty space.
 * px/py = requested pan, s = total scale, bx/by = world point the camera is focused on.
 */
const clampPan = (px: number, py: number, s: number, bx: number, by: number): [number, number] => {
  'worklet';
  const ax = 1212 * 0.88, ay = 700 * 0.88;
  const wx = bx - px / s, wy = by - py / s;
  const nx = (wx - 1250) / ax, ny = (wy - 860) / ay, m = Math.abs(nx) + Math.abs(ny);
  if (m <= 1) return [px, py];
  return [(bx - (1250 + (wx - 1250) / m)) * s, (by - (860 + (wy - 860) / m)) * s];
};

export interface MapDriver { id: string; initial: string; color: string; eta: number; pos: Pt; ll: LatLng; vis: boolean; hl: boolean; dim: boolean }
export interface WoulibMapProps { dark?: boolean; trip: Trip | null; focus: {x: number; y: number; s: number}; cardH?: number; showRoute?: boolean; pins?: {pickup?: boolean; dest?: boolean}; drivers?: MapDriver[]; searching?: boolean; tracking?: Tracking | null }

/** camera framing that fits the whole trip in the map area ABOVE the bottom card */
function useFocus(trip: Trip | null, cardH: number) {
  const {width, height} = useWindowDimensions();
  return useMemo(() => {
    if (!trip) return {x: CENTER, y: CENTER, s: 0.7};
    const a = trip.A, e = trip.D;
    const sx = Math.abs(a[0] - a[1] - (e[0] - e[1])) * 0.866 + 150, sy = Math.abs(a[0] + a[1] - (e[0] + e[1])) * 0.5 + 200;
    const availH = Math.max(160, height - cardH - TOP_SAFE - 30);
    return {x: (a[0] + e[0]) / 2, y: (a[1] + e[1]) / 2, s: Math.min(1.1, Math.max(0.3, Math.min((width - 30) / sx, availH / sy)))};
  }, [trip?.from, trip?.dest, width, height, cardH]);
}

export function WoulibMap({dark = false, trip, focus, cardH = 320, showRoute, pins, drivers = [], searching, tracking}: WoulibMapProps) {
  const city = useMemo(() => getCity(dark), [dark]);
  const traffic = useMemo(() => getTraffic(), []);
  const [hl, vl] = useLights();
  const clock = useSharedValue(0);
  useFrameCallback(() => { clock.value = (Date.now() - T0) / 1000; });

  const vw = useSharedValue(410), vh = useSharedValue(800), ch = useSharedValue(cardH), cx = useSharedValue(focus.x), cy = useSharedValue(focus.y), cs = useSharedValue(focus.s);
  const panX = useSharedValue(0), panY = useSharedValue(0), zoom = useSharedValue(1);
  const prog = useSharedValue(0), follow = useSharedValue(0), r1 = useSharedValue(0), r2 = useSharedValue(0);
  const saX = useSharedValue(trip?.A[0] ?? 300), saY = useSharedValue(trip?.A[1] ?? 300), saOp = useSharedValue(0);
  const [moved, setMoved] = useState(false);
  const lanePath = useMemo(() => (tracking ? offsetPath(tracking.path, LANE) : null), [tracking]);

  const recenter = useCallback(() => {
    const o = {duration: 500, easing: Easing.out(Easing.cubic)};
    panX.value = withTiming(0, o); panY.value = withTiming(0, o); zoom.value = withTiming(1, o); setMoved(false);
  }, []);

  useEffect(() => { ch.value = withTiming(cardH, {duration: 350, easing: Easing.out(Easing.cubic)}); }, [cardH]);
  useEffect(() => {
    const o = {duration: 900, easing: Easing.bezier(0.4, 0, 0.2, 1)};
    cx.value = withTiming(focus.x, o); cy.value = withTiming(focus.y, o); cs.value = withTiming(focus.s, o);
    recenter();
  }, [focus.x, focus.y, focus.s]);
  useEffect(() => { r1.value = withTiming(showRoute ? 1 : 0, {duration: 900, easing: Easing.out(Easing.cubic)}); }, [showRoute]);
  useEffect(() => {
    saOp.value = withTiming(searching ? 1 : 0, {duration: 400});
    if (!searching || !trip) return;
    saX.value = trip.A[0]; saY.value = trip.A[1];
    const id = setInterval(() => {
      const o = {duration: 1300, easing: Easing.inOut(Easing.quad)};
      saX.value = withTiming(trip.A[0] + (Math.random() - 0.5) * 360, o); saY.value = withTiming(trip.A[1] + (Math.random() - 0.5) * 360, o);
    }, 1300);
    return () => clearInterval(id);
  }, [searching, trip]);
  useEffect(() => {
    if (!tracking) { prog.value = 0; r2.value = withTiming(0, {duration: 300}); follow.value = withTiming(0, {duration: 600}); return; }
    prog.value = 0; r2.value = withTiming(1, {duration: 900}); follow.value = withDelay(300, withTiming(1, {duration: 900}));
    prog.value = withDelay(Math.max(0, tracking.startedAt - Date.now()), withTiming(1, {duration: tracking.duration, easing: Easing.linear}));
    recenter();
  }, [tracking]);

  const car = useDerivedValue(() => (lanePath ? along(lanePath, ease(prog.value)) : [0, 0, 0]), [lanePath]);
  const camT = useDerivedValue(() => {
    const f = follow.value, fx = cx.value + (car.value[0] - cx.value) * f, fy = cy.value + (car.value[1] - cy.value) * f, p = P(fx, fy), s = cs.value * zoom.value;
    const bx = p[0] + OX, by = p[1] + OY;
    const midY = (TOP_SAFE + vh.value - ch.value) / 2; // centre of the free map area above the card
    const pn = clampPan(panX.value, panY.value, s, bx, by);
    return {tx: vw.value / 2 - s * bx + pn[0], ty: midY - s * by + pn[1], s, bx, by};
  });
  // RN scales around the view centre, so compensate to get: screen = tx + s·p (origin = top-left)
  const camStyle = useAnimatedStyle(() => { const c = camT.value; return {transform: [{translateX: c.tx - (SW / 2) * (1 - c.s)}, {translateY: c.ty - (SH / 2) * (1 - c.s)}, {scale: c.s}]}; });
  const saStyle = useAnimatedStyle(() => ({opacity: saOp.value}));

  const [fade, setFade] = useState<Record<string, boolean>>({}), fk = useRef('');
  useEffect(() => {
    if (!tracking || !lanePath) { fk.current = ''; setFade(p => (Object.keys(p).length ? {} : p)); return; }
    const id = setInterval(() => {
      const q = clamp((Date.now() - tracking.startedAt) / tracking.duration, 0, 1), [x, y] = along(lanePath, ease(q));
      const f = fadeSet(city.blocks, x, y), key = Object.keys(f).join(',');
      if (key !== fk.current) { fk.current = key; setFade(f); }
    }, 140);
    return () => clearInterval(id);
  }, [tracking, lanePath, city]);

  // drag to pan (kept inside the drawn city), two fingers to pinch-zoom (baselines are re-captured whenever the finger count changes → no jumps)
  const touch = useRef({px: 0, py: 0, z: 1, d0: 0, n: 0, moved: false});
  const resp = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { touch.current = {px: panX.value, py: panY.value, z: zoom.value, d0: 0, n: Math.min(2, e.nativeEvent.touches.length), moved: false}; },
    onPanResponderMove: (e, g) => {
      const ts = e.nativeEvent.touches, t = touch.current, n = Math.min(2, ts.length);
      if (n !== t.n) { t.n = n; t.px = panX.value - g.dx; t.py = panY.value - g.dy; t.d0 = 0; t.z = zoom.value; }
      if (n >= 2) {
        const dist = Math.hypot(ts[0].pageX - ts[1].pageX, ts[0].pageY - ts[1].pageY);
        if (!t.d0) { t.d0 = dist; t.z = zoom.value; }
        zoom.value = clamp((t.z * dist) / t.d0, Math.min(1, Math.max(0.5, 0.4 / cs.value)), 2.4);
      }
      const c = camT.value, pn = clampPan(t.px + g.dx, t.py + g.dy, c.s, c.bx, c.by);
      panX.value = pn[0]; panY.value = pn[1];
      if (!t.moved && (Math.abs(g.dx) + Math.abs(g.dy) > 6 || n >= 2)) { t.moved = true; setMoved(true); }
    },
  }), []);

  const ctx = useMemo(() => ({camT}), [camT]);
  const pinLabel = (text: string) => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={{width: 180, alignItems: 'center'}}>
      <View style={{backgroundColor: '#111', borderColor: YELLOW, borderWidth: 2, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 6}}><Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}} numberOfLines={1}>{text}</Text></View>
      <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#111', borderWidth: 2.5, borderColor: YELLOW, marginTop: 4}} />
    </Animated.View>
  );

  return (
    <View style={{flex: 1, overflow: 'hidden', backgroundColor: "#FFF8D6"}} onLayout={(e: LayoutChangeEvent) => { vw.value = e.nativeEvent.layout.width; vh.value = e.nativeEvent.layout.height; }} {...resp.panHandlers}>
      <ClockCtx.Provider value={clock}><CamCtx.Provider value={ctx}>
        <Animated.View pointerEvents="none" style={[styles.world, camStyle]}>
          <GroundLayer ground={city.ground} />
          <LightsLayer h={hl} v={vl} />
          {trip && <RouteLayer path={trip.path} prog={r1} />}
          {tracking && <RouteLayer path={tracking.path} prog={r2} />}
          {traffic.cars.map((c, i) => <TrafficVehicle key={i} s={c} dark={dark} />)}
          {traffic.peds.map((p, i) => <Walker key={i} s={p} />)}
          {tracking && lanePath && <Taxi car={car} dark={dark} />}
          <BlockLayer blocks={city.blocks} fade={fade} />
        </Animated.View>
        <View pointerEvents="none" style={styles.absFill}>
          <Animated.View style={[styles.abs, saStyle]}><Marker x={saX} y={saY} scaled ax={-40} ay={-40}><View style={{width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: YELLOW, backgroundColor: 'rgba(254,197,9,.15)'}} /></Marker></Animated.View>
          {drivers.filter(d => d.vis).map(d => <Marker key={d.id} x={d.pos[0]} y={d.pos[1]} z={10} ax={-30} ay={-19}><DriverPin d={d} /></Marker>)}
          {trip && pins?.pickup && <Marker x={trip.A[0]} y={trip.A[1]} ax={-90} ay={-52}>{pinLabel(trip.from)}</Marker>}
          {trip && pins?.dest && <Marker x={trip.D[0]} y={trip.D[1]} ax={-90} ay={-52}>{pinLabel(trip.dest)}</Marker>}
        </View>
      </CamCtx.Provider></ClockCtx.Provider>
      {moved && (
        <Pressable onPress={recenter} style={{position: 'absolute', top: MAP_TOP + 46, right: 16, width: 38, height: 38, borderRadius: 13, backgroundColor: dark ? '#17171A' : '#fff', alignItems: 'center', justifyContent: 'center'}}>
          <Ionicons name="locate" size={19} color={dark ? '#fff' : '#111'} />
        </Pressable>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 *  LIVE MAP — the real world (Uber style): road-snapped cars with smoothed heading,
 *  real routes + real ETA, camera that follows the taxi.
 *  Works on the first screen too (no destination yet): shows your pickup point and nearby cars.
 * ═══════════════════════════════════════════════════════════════════════ */

const LIVE_OSM = Platform.OS !== 'ios'; // iOS → Apple Maps; Android → OSM tiles
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'; // production: use your own tile provider
const OSRM = 'https://router.project-osrm.org/route/v1/driving'; // production: self-host OSRM / Mapbox / Google

async function probeTiles(): Promise<boolean> {
  if (!LIVE_OSM) return true;
  try {
    const ctl = new AbortController(), id = setTimeout(() => ctl.abort(), 4500);
    const r = await fetch(TILE_URL.replace('{z}', '3').replace('{x}', '4').replace('{y}', '3'), {signal: ctl.signal});
    clearTimeout(id);
    return r.ok;
  } catch { return false; }
}
interface RouteRes { pts: LatLng[]; dist: number; dur: number }
async function routeFull(a: LatLng, b: LatLng): Promise<RouteRes> {
  try {
    const r = await fetch(`${OSRM}/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=full&geometries=geojson`);
    const j = await r.json(), rt = j?.routes?.[0];
    const pts: LatLng[] = rt?.geometry?.coordinates?.map((p: [number, number]) => ({latitude: p[1], longitude: p[0]})) ?? [];
    return {pts, dist: rt?.distance ?? 0, dur: rt?.duration ?? 0};
  } catch { return {pts: [], dist: 0, dur: 0}; }
}
const routeLL = async (a: LatLng, b: LatLng) => (await routeFull(a, b)).pts;

const RAD = Math.PI / 180;
const meters = (a: LatLng, b: LatLng) => haversine(a, b) * 1000;
const bearing = (a: LatLng, b: LatLng) => {
  const dl = (b.longitude - a.longitude) * RAD;
  const y = Math.sin(dl) * Math.cos(b.latitude * RAD);
  const x = Math.cos(a.latitude * RAD) * Math.sin(b.latitude * RAD) - Math.sin(a.latitude * RAD) * Math.cos(b.latitude * RAD) * Math.cos(dl);
  return ((Math.atan2(y, x) / RAD) + 360) % 360;
};
const offsetLL = (a: LatLng, m: number, ang: number): LatLng => ({latitude: a.latitude + (Math.cos(ang) * m) / 111320, longitude: a.longitude + (Math.sin(ang) * m) / (111320 * Math.cos(a.latitude * RAD))});
/** move angle a toward b along the shortest arc (k = 0..1) — keeps cars from snapping 180° */
const lerpAngle = (a: number, b: number, k: number) => (a + ((((b - a) % 360) + 540) % 360 - 180) * k + 360) % 360;
/** smallest absolute difference between two compass angles (0..180) */
const angDiff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

interface Poly { pts: LatLng[]; cum: number[]; len: number }
const mkPoly = (pts: LatLng[]): Poly => {
  const p = pts.length > 1 ? pts : [pts[0], pts[0]], cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + meters(p[i - 1], p[i]));
  return {pts: p, cum, len: cum[cum.length - 1]};
};
const atDist = (p: Poly, dist: number) => {
  const d = clamp(dist, 0, p.len);
  let i = 0;
  while (i < p.cum.length - 2 && p.cum[i + 1] < d) i++;
  const a = p.pts[i], b = p.pts[i + 1], seg = p.cum[i + 1] - p.cum[i] || 1, f = clamp((d - p.cum[i]) / seg, 0, 1);
  return {ll: {latitude: a.latitude + (b.latitude - a.latitude) * f, longitude: a.longitude + (b.longitude - a.longitude) * f}, h: bearing(a, b), i};
};
/** heading looking ~14 m ahead, so turns are anticipated instead of snapping at the vertex */
const headingAt = (p: Poly, d: number) => {
  const a = atDist(p, d), b = atDist(p, d + 14);
  return meters(a.ll, b.ll) > 3 ? bearing(a.ll, b.ll) : a.h;
};

/** keeps tracksViewChanges on for a moment whenever `dep` changes, so Android re-renders the marker bitmap */
function useBrief(ms = 700, dep: unknown = 0) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(true); const id = setTimeout(() => setOn(false), ms); return () => clearTimeout(id); }, [ms, dep]);
  return on;
}

/** top-down car, rotated by compass heading */
function CarMarker({ll, heading, hl, dim, taxi}: {ll: LatLng; heading: number; hl?: boolean; dim?: boolean; taxi?: boolean}) {
  const tv = useBrief(500, `${!!hl}|${!!dim}|${!!taxi}`);
  const body = taxi ? YELLOW : '#1b1c22';
  return (
    <GMarker coordinate={ll} rotation={heading} flat anchor={{x: 0.5, y: 0.5}} tracksViewChanges={tv} zIndex={taxi ? 6 : hl ? 4 : 3} opacity={dim ? 0.45 : 1}>
      <View style={{width: 24, height: 40, alignItems: 'center', justifyContent: 'center'}}>
        <View style={{position: 'absolute', width: 20, height: 36, borderRadius: 8, backgroundColor: body, borderWidth: hl || taxi ? 2.5 : 1.5, borderColor: hl ? YELLOW : taxi ? '#111' : '#fff'}} />
        <View style={{position: 'absolute', top: 9, width: 13, height: 7, borderRadius: 2.5, backgroundColor: '#9fb6cf'}} />
        <View style={{position: 'absolute', top: 17, width: 13, height: 9, borderRadius: 3, backgroundColor: taxi ? '#f0b800' : '#2c2f38'}} />
        <View style={{position: 'absolute', top: 27, width: 13, height: 4, borderRadius: 2, backgroundColor: '#7f97b0'}} />
        {taxi && <View style={{position: 'absolute', top: 19, width: 7, height: 4, borderRadius: 1.5, backgroundColor: '#fff'}} />}
      </View>
    </GMarker>
  );
}
function PinMarker({ll, label, dest}: {ll: LatLng; label: string; dest?: boolean}) {
  const tv = useBrief(900, label);
  return (
    <GMarker coordinate={ll} anchor={{x: 0.5, y: 1}} tracksViewChanges={tv} zIndex={5}>
      <View style={{alignItems: 'center', width: 150}}>
        <View style={{backgroundColor: '#111', borderColor: YELLOW, borderWidth: 2, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 6}}><Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}} numberOfLines={1}>{label}</Text></View>
        <View style={{width: 14, height: 14, borderRadius: dest ? 3 : 7, backgroundColor: '#111', borderWidth: 3, borderColor: YELLOW, marginTop: 4}} />
      </View>
    </GMarker>
  );
}

interface Sim { poly: Poly; d: number; v: number; busy: boolean; h: number }

function LiveMap({trip, center, from, dark, cardH, drivers, tracking, searching, onReady, onRoute}: {trip: Trip | null; center: LatLng; from: string; dark: boolean; cardH: number; drivers: MapDriver[]; tracking?: Tracking | null; searching?: boolean; onReady: (ok: boolean) => void; onRoute: (km: string, min: number) => void}) {
  const ref = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [cars, setCars] = useState<Record<string, {ll: LatLng; h: number}>>({});
  const [trk, setTrk] = useState<{ll: LatLng; h: number; rest: LatLng[]} | null>(null);
  const sims = useRef<Record<string, Sim>>({});
  const trkRoute = useRef<Poly | null>(null);
  const trkH = useRef(0);
  const cur = useRef<Record<string, LatLng>>({});
  const visKey = drivers.filter(d => d.vis).map(d => d.id).join(',');

  // 1. can we reach the map tiles at all?
  useEffect(() => {
    let alive = true;
    probeTiles().then(ok => { if (alive) { setReady(ok); onReady(ok); } });
    return () => { alive = false; };
  }, []);

  // 2. real driving route for the trip (+ real distance / duration → ride state). No destination yet → no route.
  useEffect(() => {
    if (!trip) { setRoute([]); return; }
    const t = trip;
    let alive = true;
    setRoute([]);
    routeFull(t.fromLL, t.toLL).then(r => {
      if (!alive) return;
      setRoute(r.pts.length > 1 ? r.pts : [t.fromLL, t.toLL]);
      if (r.dist > 0 && r.dur > 0) onRoute((r.dist / 1000).toFixed(1), Math.max(2, Math.round(r.dur / 60)));
    });
    return () => { alive = false; };
  }, [trip?.from, trip?.dest]);

  // 3. camera: whole route when idle (kept above the card), pickup while searching, pickup area on the first screen
  useEffect(() => {
    if (!ready || tracking) return;
    const m = ref.current; if (!m) return;
    if (!trip) m.animateCamera({center: offsetLL(center, -(cardH / 2) * 5.3, 0), zoom: 14.8}, {duration: 700});
    else if (searching) m.animateCamera({center: trip.fromLL, zoom: 15.4}, {duration: 700});
    else m.fitToCoordinates(route.length ? route : [trip.fromLL, trip.toLL], {edgePadding: {top: TOP_SAFE + 40, bottom: cardH + 50, left: 50, right: 50}, animated: true});
  }, [ready, route, searching, !!tracking, cardH, !!trip, center.latitude, center.longitude]);

  // 4. nearby drivers cruise along real roads and keep going (new leg from where they stopped)
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    for (const d of drivers) {
      if (!d.vis || sims.current[d.id]) continue;
      sims.current[d.id] = {poly: mkPoly([d.ll, d.ll]), d: 0, v: 6 + Math.random() * 3, busy: true, h: Math.random() * 360};
      const target = offsetLL(d.ll, 350 + Math.random() * 500, Math.random() * Math.PI * 2);
      routeLL(d.ll, target).then(r => { const s = sims.current[d.id]; if (alive && s) { if (r.length > 1) { s.poly = mkPoly(r); s.d = 0; } s.busy = false; } });
    }
    return () => { alive = false; };
  }, [ready, visKey]);

  // 5. route for the driver that was accepted (pickup leg, then the trip itself)
  useEffect(() => {
    if (!tracking) { trkRoute.current = null; setTrk(null); return; }
    let alive = true;
    const start = tracking.kind === 'pickup' && cur.current[tracking.driverId] ? cur.current[tracking.driverId] : tracking.fromLL;
    trkRoute.current = null; // the previous marker stays on screen until the new route arrives → no flicker
    routeLL(start, tracking.toLL).then(r => { if (alive) trkRoute.current = mkPoly(r.length > 1 ? r : [start, tracking.toLL]); });
    return () => { alive = false; };
  }, [tracking]);

  // 6. 8 Hz ticker — moves every car along its polyline (a car stops when another car is right in front of it),
  //    smooths heading, drives the camera
  useEffect(() => {
    if (!ready) return;
    let n = 0, last = Date.now();
    const id = setInterval(() => {
      const now = Date.now(), dt = Math.min(0.5, (now - last) / 1000); last = now; n++;
      const next: Record<string, {ll: LatLng; h: number}> = {};
      const keys = Object.keys(sims.current), here: Record<string, LatLng> = {};
      for (const k of keys) here[k] = atDist(sims.current[k].poly, sims.current[k].d).ll;
      for (const k of keys) {
        const s = sims.current[k];
        if (s.busy) { next[k] = {ll: here[k], h: s.h}; continue; }
        // car-following: blocked when another car heading the same way is less than ~28 m ahead
        let blocked = false;
        for (const o of keys) {
          if (o === k) continue;
          const dist = meters(here[k], here[o]);
          if (dist > 28 || angDiff(s.h, sims.current[o].h) > 60) continue;
          if (angDiff(bearing(here[k], here[o]), s.h) < 55 && (dist > 3 || k > o)) { blocked = true; break; }
        }
        if (!blocked) s.d += s.v * dt;
        if (s.d >= s.poly.len - 0.5) {
          s.d = s.poly.len; s.busy = true;
          const end = atDist(s.poly, s.poly.len).ll, sim = s;
          routeLL(end, offsetLL(end, 350 + Math.random() * 500, Math.random() * Math.PI * 2)).then(r => {
            if (r.length > 1) sim.poly = mkPoly(r); else sim.poly = mkPoly([...sim.poly.pts].reverse());
            sim.d = 0; sim.busy = false;
          });
        }
        const a = atDist(s.poly, s.d);
        s.h = lerpAngle(s.h, headingAt(s.poly, s.d), 0.22);
        next[k] = {ll: a.ll, h: s.h};
        cur.current[k] = a.ll;
      }
      setCars(next);
      const tr = trkRoute.current;
      if (tracking && tr) {
        const q = clamp((now - tracking.startedAt) / tracking.duration, 0, 1), dd = ease(q) * tr.len, a = atDist(tr, dd);
        trkH.current = lerpAngle(trkH.current, headingAt(tr, dd), 0.25);
        setTrk({ll: a.ll, h: trkH.current, rest: [a.ll, ...tr.pts.slice(a.i + 1)]});
        cur.current[tracking.driverId] = a.ll;
        if (n % 8 === 0) ref.current?.animateCamera({center: a.ll, zoom: 16.2}, {duration: 1000});
      }
    }, 125);
    return () => clearInterval(id);
  }, [ready, tracking]);

  if (!ready) return null;
  const rt = route.length ? route : trip ? [trip.fromLL, trip.toLL] : [];
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={ref} style={{flex: 1}} mapType={LIVE_OSM ? 'none' : 'standard'} userInterfaceStyle={dark ? 'dark' : 'light'}
        initialRegion={{latitude: center.latitude, longitude: center.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03}}
        showsCompass={false} pitchEnabled={false} toolbarEnabled={false} moveOnMarkerPress={false}>
        {LIVE_OSM && <UrlTile urlTemplate={TILE_URL} maximumZ={19} flipY={false} zIndex={-1} />}
        {!!trip && <GPolyline coordinates={trk ? trk.rest : rt} strokeColor="#111111" strokeWidth={9} />}
        {!!trip && <GPolyline coordinates={trk ? trk.rest : rt} strokeColor={YELLOW} strokeWidth={5} />}
        {searching && !!trip && <GCircle center={trip.fromLL} radius={320} fillColor="rgba(254,197,9,0.16)" strokeColor={YELLOW} strokeWidth={2} />}
        <PinMarker ll={center} label={trip ? trip.from : from} />
        {!!trip && <PinMarker ll={trip.toLL} label={trip.dest} dest />}
        {!tracking && drivers.filter(d => d.vis && cars[d.id]).map(d => <CarMarker key={d.id} ll={cars[d.id].ll} heading={cars[d.id].h} hl={d.hl} dim={d.dim} />)}
        {trk && <CarMarker ll={trk.ll} heading={trk.h} taxi />}
      </MapView>
      {dark && LIVE_OSM && <View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,12,0.45)'}]} />}
      {LIVE_OSM && <View pointerEvents="none" style={{position: 'absolute', top: MAP_TOP + 46, left: 16, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2}}><Text style={{fontSize: 9.5, color: '#333'}}>© OpenStreetMap contributors</Text></View>}
    </View>
  );
}

/** Illustrated ⇄ Live switch (available on every screen, also before a destination is chosen).
 *  The illustrated city unmounts once the live map is ready (saves memory + CPU) and only mounts after the screen transition has finished. */
function WoulibMapView(props: WoulibMapProps) {
  const ride = useRide();
  const {dark = false, trip, cardH = 320} = props;
  const live = ride.mapView === 'live';
  const [liveOK, setLiveOK] = useState(false);
  const [note, setNote] = useState('');
  const [mounted, setMounted] = useState(true);
  useEffect(() => { const h = InteractionManager.runAfterInteractions(() => setMounted(true)); return () => h.cancel(); }, []);
  const center = trip?.fromLL ?? GEO[ride.from.split(',')[0]] ?? GEO['Current location'];
  const hasTrip = !!trip;
  // first screen (no destination yet): a few cars cruise around the pickup point
  const ambient: MapDriver[] = useMemo(() => (hasTrip ? [] : makeDrivers([500, 500], center).map(d => ({id: 'a' + d.id, initial: d.initial, color: d.color, eta: d.eta, pos: d.pos, ll: d.ll, vis: true, hl: false, dim: false}))), [hasTrip, center.latitude, center.longitude]);
  const onReady = useCallback((ok: boolean) => {
    setLiveOK(ok);
    if (!ok) { ride.setMapView('illustrated'); setNote('Live map needs a connection — showing the illustrated map'); setTimeout(() => setNote(''), 3500); }
  }, []);
  useEffect(() => { if (!live) setLiveOK(false); }, [live]);
  const pill = (active: boolean) => ({paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, backgroundColor: active ? YELLOW : 'transparent'});
  const txt = (active: boolean) => ({fontSize: 11, fontWeight: '700' as const, color: active || !dark ? '#111' : '#fff'});
  const placeholder = dark ? mix('#c3c9d8', '#080a14', 0.55) : '#c3c9d8';
  return (
    <View style={{flex: 1}}>
      {!(live && liveOK) && (mounted ? <WoulibMap {...props} /> : <View style={{flex: 1, backgroundColor: placeholder}} />)}
      {live && <LiveMap trip={trip} center={center} from={ride.from} dark={dark} cardH={cardH} drivers={hasTrip ? props.drivers ?? [] : ambient} tracking={props.tracking} searching={props.searching} onReady={onReady} onRoute={ride.setRouteInfo} />}
      <View style={{position: 'absolute', top: MAP_TOP, right: 16, flexDirection: 'row', backgroundColor: dark ? '#17171A' : '#fff', borderRadius: 99, padding: 3}}>
        <Pressable onPress={() => ride.setMapView('illustrated')} style={pill(!live)}><Text style={txt(!live)}>Illustrated</Text></Pressable>
        <Pressable onPress={() => ride.setMapView('live')} style={pill(live)}><Text style={txt(live)}>Live map</Text></Pressable>
      </View>
      {!!note && <View style={{position: 'absolute', top: MAP_TOP + 76, left: 16, right: 70, backgroundColor: '#111', borderRadius: 12, padding: 10}}><Text style={{color: '#fff', fontSize: 12}}>{note}</Text></View>}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 *  WOULIB HOME — landing screen: Find a ride / Offer a ride, Nearby rides, Upcoming rides
 *  (the lists below are placeholder data — replace with your real rides)
 * ═══════════════════════════════════════════════════════════════════════ */

export interface WoulibUpcomingRide { id: string; to: string; from: string; when: string; driver: string; status: string }

const NEARBY = [
  {id: 'n1', name: 'Ronald Richards', color: '#5b7fd0', from: 'Business District', to: 'City Center', seats: 3, price: 8.5, away: '0.4 km', when: 'Leaves in 5 min'},
  {id: 'n2', name: 'Jane Cooper', color: '#e0714f', from: 'Shopping District', to: 'Airport', seats: 2, price: 14, away: '0.9 km', when: 'Leaves in 12 min'},
  {id: 'n3', name: 'Marcus Lee', color: '#4aa391', from: 'City Center', to: 'Downtown', seats: 1, price: 9.75, away: '1.3 km', when: 'Leaves in 20 min'},
  {id: 'n4', name: 'Sofia Alvarez', color: '#b36fc4', from: 'Downtown', to: 'Business District', seats: 3, price: 11, away: '2.1 km', when: 'Leaves in 30 min'},
];
const UPCOMING: WoulibUpcomingRide[] = [
  {id: 'u1', to: 'Airport', from: 'Business District', when: 'Today · 6:30 PM', driver: 'Sofia Alvarez', status: 'Confirmed'},
  {id: 'u2', to: 'Downtown', from: 'Current location', when: 'Tomorrow · 8:15 AM', driver: 'Daniel Okafor', status: 'Confirmed'},
  {id: 'u3', to: 'Shopping District', from: 'City Center', when: 'Sat · 2:00 PM', driver: 'Priya Nair', status: 'Pending'},
];

function WoulibHome({
  upcoming,
  onFind,
  onOffer,
  onExit,
}: {
  upcoming: WoulibUpcomingRide[];
  onFind: (dest?: string) => void;
  onOffer: () => void;
  onExit?: () => void;
}) {
  const {t, dark, toggle} = useWoulibTheme();

  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    const h = InteractionManager.runAfterInteractions(() => {
      id = setTimeout(() => {
        getCity(dark);
        getTraffic();
      }, 300);
    });
    return () => {
      h.cancel();
      if (id) clearTimeout(id);
    };
  }, [dark]);

  const field = (icon: string, label: string, value: string) => (
    <View
      style={{
        flex: 1,
        minWidth: '45%',
        backgroundColor: t.soft,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
      }}
    >
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 7}}>
        <Ionicons name={icon as any} size={16} color={t.muted} />
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: t.muted,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 5,
          fontSize: 14,
          fontWeight: '700',
          color: t.ink,
        }}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View style={{flex: 1, backgroundColor: t.bg}}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 0,
          paddingHorizontal: 18,
          paddingBottom: 112,
        }}
      >
        {/* Header */}
        <View
          style={{
            height: 100,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            {onExit ? (
              <Pressable
                onPress={onExit}
                hitSlop={10}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Ionicons name="arrow-back" size={19} color={t.ink} />
              </Pressable>
            ) : null}

            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{fontSize: 27, fontWeight: '900', color: t.ink, letterSpacing: -0.8}}>Woulib</Text>
              <Ionicons name="location-sharp" size={26} color={YELLOW} style={{marginLeft: 2, marginTop: 5}} />
            </View>
          </View>

          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Pressable
              onPress={toggle}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={dark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={t.ink}
              />
            </Pressable>

            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: t.yellowSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-outline" size={18} color={t.ink} />
            </View>
          </View>
        </View>

        {/* Hero */}
        <View
          style={{
            backgroundColor: t.yellowSoft,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: t.line,
            overflow: 'hidden',
          }}
        >
          <Text
            style={{
              color: t.ink,
              fontSize: 25,
              lineHeight: 30,
              fontWeight: '900',
              letterSpacing: -0.6,
              maxWidth: 300,
            }}
          >
            You’re already going there.{'\n'}Why not share the ride?
          </Text>

          <Text
            style={{
              color: t.muted,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 9,
              maxWidth: 310,
            }}
          >
            Find a nearby ride, save money, and get where you need to go.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              marginTop: 18,
              gap: 9,
            }}
          >
            <Pressable
              onPress={() => onFind()}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: 14,
                backgroundColor: YELLOW,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: '#111111',
                  fontSize: 13,
                  fontWeight: '900',
                }}
              >
                Share a ride
              </Text>
            </Pressable>

            <Pressable
              onPress={onOffer}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: t.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: t.ink,
                  fontSize: 13,
                  fontWeight: '900',
                }}
              >
                Offer a Ride
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={{backgroundColor: t.card, borderRadius: 20, borderWidth: 1, borderColor: t.line, paddingHorizontal: 14, paddingTop: 5, paddingBottom: 12, marginTop: 18}}>
          <Pressable onPress={() => onFind()} style={{minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.line}}><Ionicons name="location" size={21} color={YELLOW} style={{marginHorizontal: 7, marginRight: 14}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>From</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Where are you leaving from?</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></Pressable>
          <Pressable onPress={() => onFind()} style={{minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.line}}><Ionicons name="location" size={21} color={t.ink} style={{marginHorizontal: 7, marginRight: 14}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>To</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Where are you going?</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></Pressable>
          <View style={{flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.line}}><Pressable onPress={() => onFind()} style={{flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingLeft: 7}}><Ionicons name="calendar-outline" size={20} color={t.ink} style={{marginRight: 13}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>Date</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Today</Text></View><Ionicons name="chevron-down" size={17} color={t.ink} /></Pressable><View style={{width: 1, backgroundColor: t.line, marginVertical: 10}} /><Pressable onPress={() => onFind()} style={{flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingLeft: 15}}><Ionicons name="time-outline" size={20} color={t.ink} style={{marginRight: 13}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>Time</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Anytime</Text></View><Ionicons name="chevron-down" size={17} color={t.ink} /></Pressable></View>
          <Pressable onPress={() => onFind()} style={{minHeight: 62, flexDirection: 'row', alignItems: 'center'}}><Ionicons name="person" size={20} color={t.ink} style={{marginHorizontal: 7, marginRight: 14}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>Passengers</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>1 passenger</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></Pressable>
          <Pressable onPress={() => onFind()} style={{height: 52, borderRadius: 14, backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 2}}><Ionicons name="search-outline" size={20} color="#111111" /><Text style={{color: '#111111', fontSize: 15, fontWeight: '900'}}>Find Rides</Text></Pressable>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 11}}><Text style={{color: t.ink, fontSize: 19, fontWeight: '900'}}>Nearby Rides</Text><Text style={{color: YELLOW, fontSize: 12, fontWeight: '800'}}>See All ›</Text></View>
        {NEARBY.slice(0, 3).map((ride) => (<Pressable key={ride.id} onPress={() => onFind(ride.to)} style={{backgroundColor: t.card, borderRadius: 17, borderWidth: 1, borderColor: t.line, padding: 10, marginBottom: 10}}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 82, height: 82, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', marginRight: 11}}><Ionicons name="car-sport" size={43} color={YELLOW} /></View><View style={{flex: 1, minWidth: 0}}><Text numberOfLines={1} style={{color: t.ink, fontSize: 14, fontWeight: '900'}}>{ride.from} → {ride.to}</Text><Text style={{color: t.muted, fontSize: 12, marginTop: 4}}>{ride.when}</Text><View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}><Ionicons name="people-outline" size={14} color={t.ink} /><Text style={{color: t.muted, fontSize: 11, marginLeft: 4}}>{ride.seats} seats left</Text><Ionicons name="cash-outline" size={14} color={t.ink} style={{marginLeft: 10}} /><Text style={{color: t.ink, fontSize: 12, fontWeight: '800', marginLeft: 4}}>${ride.price.toFixed(0)}</Text></View></View></View><View style={{flexDirection: 'row', alignItems: 'center', marginTop: 9}}><View style={{width: 31, height: 31, borderRadius: 16, backgroundColor: ride.color, alignItems: 'center', justifyContent: 'center', marginRight: 8}}><Text style={{color: '#FFFFFF', fontSize: 12, fontWeight: '900'}}>{ride.name.charAt(0)}</Text></View><View style={{flex: 1}}><Text numberOfLines={1} style={{color: t.ink, fontSize: 12, fontWeight: '700'}}>{ride.name}</Text><Text style={{color: t.muted, fontSize: 10, marginTop: 1}}>★ 4.8 (124 rides)</Text></View><View style={{backgroundColor: YELLOW, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8}}><Text style={{color: '#111111', fontSize: 12, fontWeight: '900'}}>Join Ride  ›</Text></View></View></Pressable>))}
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 21, marginBottom: 11}}><Text style={{color: t.ink, fontSize: 19, fontWeight: '900'}}>Your Upcoming Rides</Text><Text style={{color: YELLOW, fontSize: 12, fontWeight: '800'}}>See All ›</Text></View>
        {upcoming.slice(0, 3).map((ride) => (<View key={ride.id} style={{backgroundColor: t.card, borderRadius: 17, borderWidth: 1, borderColor: t.line, padding: 10, marginBottom: 10}}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 82, height: 72, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', marginRight: 11}}><Ionicons name="car-sport" size={38} color={YELLOW} /></View><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 14, fontWeight: '900'}}>{ride.from} → {ride.to}</Text><Text style={{color: t.muted, fontSize: 12, marginTop: 4}}>{ride.when}</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></View></View>))}
      </ScrollView>

      {/* Bottom navigation */}
      <View
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 68,
          borderRadius: 18,
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 5,
        }}
      >
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
          <View
            style={{
              width: 38,
              height: 30,
              borderRadius: 15,
              backgroundColor: t.yellowSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="home" size={18} color={t.ink} />
          </View>
          <Text style={{fontSize: 9, fontWeight: '800', color: t.ink, marginTop: 2}}>
            Home
          </Text>
        </View>

        <Pressable
          onPress={() => onFind()}
          style={{alignItems: 'center', justifyContent: 'center', flex: 1}}
        >
          <Ionicons name="search-outline" size={20} color={t.muted} />
          <Text style={{fontSize: 9, fontWeight: '700', color: t.muted, marginTop: 3}}>
            Search
          </Text>
        </Pressable>

        <Pressable
          onPress={onOffer}
          style={{alignItems: 'center', justifyContent: 'center', flex: 1}}
        >
          <Ionicons name="add-circle-outline" size={21} color={t.muted} />
          <Text style={{fontSize: 9, fontWeight: '700', color: t.muted, marginTop: 2}}>
            Offer
          </Text>
        </Pressable>

        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
          <Ionicons name="person-outline" size={20} color={t.muted} />
          <Text style={{fontSize: 9, fontWeight: '700', color: t.muted, marginTop: 3}}>
            Profile
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 *  WOULIB FLOW — every screen, one tall bottom card
 * ═══════════════════════════════════════════════════════════════════════ */

function Btn({label, onPress, kind = 'primary', icon, disabled, flex}: {label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; flex?: number}) {
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

function Seg({value, onChange}: {value: WoulibMode; onChange: (m: WoulibMode) => void}) {
  const {t} = useWoulibTheme();
  const opt = (m: WoulibMode, label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <Pressable key={m} onPress={() => onChange(m)} style={{flex: 1, height: 42, borderRadius: 12, backgroundColor: value === m ? YELLOW : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row'}}>
      <Ionicons name={icon} size={17} color={value === m ? '#111' : t.muted} style={{marginRight: 6}} />
      <Text style={{fontWeight: '800', color: value === m ? '#111' : t.muted}}>{label}</Text>
    </Pressable>
  );
  return <View style={{flexDirection: 'row', backgroundColor: t.soft, borderRadius: 14, padding: 3}}>{opt('ride', 'Ride', 'car')}{opt('delivery', 'Delivery', 'cube')}</View>;
}

function DriverRow({d, vehicle, right}: {d: Driver; vehicle: Vehicle; right?: React.ReactNode}) {
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

function Card({height, onToggle, children}: {height: number; onToggle: () => void; children: React.ReactNode}) {
  const {t} = useWoulibTheme();
  const h = useSharedValue(height);
  useEffect(() => { h.value = withTiming(height, {duration: 350, easing: Easing.out(Easing.cubic)}); }, [height]);
  const st = useAnimatedStyle(() => ({height: h.value}));
  return (
    <Animated.View style={[styles.card, {backgroundColor: t.card}, st]}>
      <Pressable onPress={onToggle} hitSlop={14} style={styles.handleWrap}><View style={[styles.handle, {backgroundColor: t.line}]} /></Pressable>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </Animated.View>
  );
}

/** card height as a share of the screen, per step — selection steps are tall, live-tracking steps leave the map open */
const FRAC: Record<Exclude<RideStatus, 'idle'>, number> = {searching: 0.44, offer: 0.5, declined: 0.42, confirmed: 0.4, onway: 0.4, arrived: 0.4, riding: 0.36, complete: 0.54};

function FlowInner({onHome}: {onHome: () => void}) {
  const ride = useRide();
  const {t, dark, toggle} = useWoulibTheme();
  const {height} = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [stars, setStars] = useState(5);
  useEffect(() => { setCollapsed(false); }, [ride.status, !!ride.trip]);

  const frac = ride.status === 'idle' ? (ride.trip ? 0.64 : 0.5) : FRAC[ride.status];
  const cardH = collapsed ? 150 : Math.round(clamp(height * frac, 280, height * 0.72));
  const focus = useFocus(ride.trip, cardH);
  const trip = ride.trip, st = ride.status;
  const noun = ride.mode === 'delivery' ? 'delivery' : 'ride';
  const veh = ride.vehicle;

  const mapDrivers: MapDriver[] = useMemo(() => ride.drivers.map(d => ({
    id: d.id, initial: d.initial, color: d.color, eta: d.eta, pos: d.pos, ll: d.ll,
    vis: (!!ride.shown[d.id] && (st === 'searching' || st === 'offer' || st === 'declined')) || (ride.accepted?.id === d.id && st === 'confirmed'),
    hl: ride.highlight === d.id, dim: !!ride.declined[d.id],
  })), [ride.drivers, ride.shown, ride.highlight, ride.declined, ride.accepted, st]);

  const open = (n: string) => Linking.openURL(n).catch(() => {});
  const label = (s: string) => <Text style={[styles.label, {color: t.muted}]}>{s}</Text>;
  const summary = trip ? `${trip.from} → ${trip.dest} · ${trip.km} km · ${trip.min} min` : '';

  const vehicleRow = (v: Vehicle) => {
    const sel = v.id === veh.id;
    return (
      <Pressable key={v.id} onPress={() => ride.setVehicle(v)} style={[styles.vRow, {borderColor: sel ? YELLOW : t.line, backgroundColor: sel ? t.yellowSoft : t.card}]}>
        <View style={{width: 46, height: 46, borderRadius: 14, backgroundColor: v.color, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="car-sport" size={24} color={v.cat === 'L' && v.color === '#1d1d22' ? YELLOW : '#111'} /></View>
        <View style={{flex: 1, marginLeft: 12}}>
          <Text style={[styles.h2, {color: t.ink}]}>{v.name}</Text>
          <Text style={{color: t.muted, fontSize: 12.5}}>{v.seats} seats · {etaRange(v.eta)} min away</Text>
        </View>
        <Text style={[styles.h2, {color: t.ink}]}>{fare(v.price)}</Text>
      </Pressable>
    );
  };

  let body: React.ReactNode = null;
  if (st === 'idle' && !trip) {
    body = (
      <Animated.View entering={FadeInDown.duration(300)}>
        <Text style={[styles.h1, {color: t.ink, marginBottom: 12}]}>{ride.mode === 'delivery' ? 'Send something' : 'Where to?'}</Text>
        <Seg value={ride.mode} onChange={ride.setMode} />
        {label('Pickup')}
        <Pressable onPress={ride.cycleFrom} style={[styles.field, {backgroundColor: t.soft}]}>
          <View style={[styles.dot, {backgroundColor: YELLOW, borderColor: '#111'}]} />
          <Text style={{flex: 1, color: t.ink, fontWeight: '700'}}>{ride.from}</Text>
          <Text style={{color: t.muted, fontSize: 12}}>Tap to change</Text>
        </Pressable>
        {label('Destination')}
        {PLACES.map(p => (
          <Pressable key={p.n} onPress={() => ride.setDest(p.n)} style={[styles.row, {borderBottomWidth: 1, borderBottomColor: t.line}]}>
            <View style={{width: 38, height: 38, borderRadius: 19, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="location" size={18} color={t.ink} /></View>
            <View style={{flex: 1, marginLeft: 12}}><Text style={[styles.h2, {color: t.ink}]}>{p.n}</Text><Text style={{color: t.muted, fontSize: 12.5}}>{p.a}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={t.muted} />
          </Pressable>
        ))}
      </Animated.View>
    );
  } else if (st === 'idle' && trip) {
    body = (
      <Animated.View entering={FadeInDown.duration(300)}>
        <Text style={[styles.h1, {color: t.ink}]}>Choose a {noun}</Text>
        <Text style={{color: t.muted, marginTop: 4, fontSize: 13}}>{summary}</Text>
        {label('Standard')}
        {VEHICLES.filter(v => v.cat === 'N').map(vehicleRow)}
        {label('Luxury')}
        {VEHICLES.filter(v => v.cat === 'L').map(vehicleRow)}
        {label(ride.mode === 'delivery' ? 'Note for the courier' : 'Pickup note')}
        <TextInput value={ride.landmark} onChangeText={ride.setLandmark} placeholder="Landmark, gate, floor…" placeholderTextColor={t.muted} style={[styles.field, {backgroundColor: t.soft, color: t.ink}]} />
        {label('Payment')}
        <Pressable onPress={() => setShowPay(v => !v)} style={[styles.field, {backgroundColor: t.soft}]}>
          <View style={{backgroundColor: ride.payment.color, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 12}}><Text style={{color: '#fff', fontSize: 10.5, fontWeight: '800'}}>{ride.payment.badge}</Text></View>
          <View style={{flex: 1}}><Text style={{color: t.ink, fontWeight: '700'}}>{ride.payment.name}</Text><Text style={{color: t.muted, fontSize: 12}}>{ride.payment.sub}</Text></View>
          <Ionicons name={showPay ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
        </Pressable>
        {showPay && PAYMENTS.map(p => (
          <Pressable key={p.id} onPress={() => { ride.setPayment(p); setShowPay(false); }} style={[styles.row, {paddingLeft: 6}]}>
            <View style={{backgroundColor: p.color, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 12, minWidth: 44, alignItems: 'center'}}><Text style={{color: '#fff', fontSize: 10.5, fontWeight: '800'}}>{p.badge}</Text></View>
            <View style={{flex: 1}}><Text style={{color: t.ink, fontWeight: '600'}}>{p.name}</Text><Text style={{color: t.muted, fontSize: 12}}>{p.sub}</Text></View>
            {p.id === ride.payment.id && <Ionicons name="checkmark-circle" size={20} color={t.green} />}
          </Pressable>
        ))}
        <View style={{flexDirection: 'row', marginTop: 18}}>
          <Btn label="Back" kind="secondary" onPress={ride.clearTrip} flex={1} />
          <View style={{width: 10}} />
          <Btn label={`Request ${veh.short} · ${fare(veh.price)}`} onPress={ride.startSearch} flex={3} />
        </View>
      </Animated.View>
    );
  } else if (st === 'searching') {
    body = (
      <Animated.View entering={FadeIn}>
        <Text style={[styles.h1, {color: t.ink}]}>Finding your driver…</Text>
        <Text style={{color: t.muted, marginTop: 4}}>{ride.found === 0 ? 'Looking around your pickup point' : `${ride.found} driver${ride.found === 1 ? '' : 's'} nearby`}</Text>
        <View style={[styles.bar, {backgroundColor: t.soft}]}><Animated.View style={{height: 8, width: `${Math.min(100, 20 + ride.found * 25)}%`, backgroundColor: YELLOW, borderRadius: 4}} /></View>
        {ride.drivers.filter(d => ride.shown[d.id]).map(d => (
          <Animated.View key={d.id} entering={FadeInDown.duration(250)}><DriverRow d={d} vehicle={veh} right={<Text style={{color: t.ink, fontWeight: '800'}}>{etaRange(d.eta)} min</Text>} /></Animated.View>
        ))}
        <View style={{marginTop: 14}}><Btn label={`Cancel ${noun}`} kind="danger" onPress={ride.cancel} /></View>
      </Animated.View>
    );
  } else if ((st === 'offer' || st === 'declined') && ride.drivers[ride.offerIdx]) {
    const d = ride.drivers[ride.offerIdx];
    body = (
      <Animated.View entering={FadeIn}>
        <Text style={[styles.h1, {color: t.ink}]}>{st === 'offer' ? `${d.first} can pick you up` : 'Finding another driver…'}</Text>
        <DriverRow d={d} vehicle={veh} />
        <View style={{backgroundColor: t.yellowSoft, borderRadius: 16, padding: 14, marginTop: 8, flexDirection: 'row', alignItems: 'center'}}>
          <View style={{flex: 1}}><Text style={{color: t.muted, fontSize: 12}}>Offer</Text><Text style={{color: t.ink, fontSize: 26, fontWeight: '800'}}>{fare(ride.price)}</Text></View>
          <View style={{alignItems: 'flex-end'}}><Text style={{color: t.muted, fontSize: 12}}>Arrives in</Text><Text style={{color: t.ink, fontSize: 18, fontWeight: '800'}}>{etaRange(d.eta)} min</Text></View>
        </View>
        {st === 'offer' && (
          <View style={{flexDirection: 'row', marginTop: 16}}>
            <Btn label="Decline" kind="secondary" onPress={ride.decline} flex={1} />
            <View style={{width: 10}} />
            <Btn label="Accept" onPress={ride.accept} flex={2} />
          </View>
        )}
      </Animated.View>
    );
  } else if (st === 'confirmed' && ride.accepted) {
    body = (
      <Animated.View entering={FadeIn}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="checkmark-circle" size={26} color={t.green} /><Text style={[styles.h1, {color: t.ink, marginLeft: 8}]}>Driver confirmed</Text></View>
        <DriverRow d={ride.accepted} vehicle={veh} />
        <Text style={{color: t.muted, marginTop: 6}}>{ride.accepted.first} is getting ready to head to you…</Text>
      </Animated.View>
    );
  } else if (st === 'onway' && ride.accepted) {
    const d = ride.accepted;
    body = (
      <Animated.View entering={FadeIn}>
        <Text style={[styles.h1, {color: t.ink}]}>{d.first} arrives in {ride.eta} min</Text>
        <DriverRow d={d} vehicle={veh} right={
          <View style={{flexDirection: 'row'}}>
            <Pressable onPress={() => open(`sms:${d.phone}`)} style={[styles.circle, {backgroundColor: t.soft, marginRight: 8, elevation: 0}]}><Ionicons name="chatbubble" size={18} color={t.ink} /></Pressable>
            <Pressable onPress={() => open(`tel:${d.phone}`)} style={[styles.circle, {backgroundColor: YELLOW, elevation: 0}]}><Ionicons name="call" size={18} color="#111" /></Pressable>
          </View>} />
        {!!ride.landmark && <Text style={{color: t.muted, fontSize: 13, marginTop: 4}}>Your note: {ride.landmark}</Text>}
        <View style={{marginTop: 14}}><Btn label={`Cancel ${noun}`} kind="danger" onPress={ride.cancel} /></View>
      </Animated.View>
    );
  } else if (st === 'arrived' && ride.accepted) {
    const d = ride.accepted;
    body = (
      <Animated.View entering={FadeIn}>
        <Text style={[styles.h1, {color: t.ink}]}>Your driver has arrived</Text>
        <DriverRow d={d} vehicle={veh} />
        <View style={{backgroundColor: YELLOW, borderRadius: 14, padding: 12, marginTop: 6, alignItems: 'center'}}><Text style={{color: '#111', fontWeight: '800', fontSize: 20, letterSpacing: 1}}>{d.plate}</Text></View>
        <View style={{marginTop: 14}}><Btn label={ride.mode === 'delivery' ? 'Package handed over' : "I'm in the car"} icon="navigate" onPress={ride.startTrip} /></View>
      </Animated.View>
    );
  } else if (st === 'riding' && trip) {
    const p = clamp(1 - ride.eta / Math.max(1, trip.min), 0, 1);
    body = (
      <Animated.View entering={FadeIn}>
        <Text style={[styles.h1, {color: t.ink}]}>Heading to {trip.dest}</Text>
        <Text style={{color: t.muted, marginTop: 4}}>{ride.eta} min left · {trip.km} km</Text>
        <View style={[styles.bar, {backgroundColor: t.soft}]}><View style={{height: 8, width: `${Math.round(p * 100)}%`, backgroundColor: YELLOW, borderRadius: 4}} /></View>
        {ride.accepted && <DriverRow d={ride.accepted} vehicle={veh} />}
      </Animated.View>
    );
  } else if (st === 'complete' && trip) {
    body = (
      <Animated.View entering={FadeIn}>
        <View style={{alignItems: 'center', marginTop: 4}}>
          <Ionicons name="checkmark-circle" size={44} color={t.green} />
          <Text style={[styles.h1, {color: t.ink, marginTop: 6}]}>{ride.mode === 'delivery' ? 'Delivered' : "You've arrived"}</Text>
          <Text style={{color: t.muted, marginTop: 2}}>{trip.dest} · {trip.km} km</Text>
          <Text style={{color: t.ink, fontSize: 34, fontWeight: '800', marginTop: 10}}>{fare(ride.price)}</Text>
          <Text style={{color: t.muted, fontSize: 12.5}}>Paid with {ride.payment.name}</Text>
        </View>
        {label('Rate your driver')}
        <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 14}}>
          {[1, 2, 3, 4, 5].map(n => <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}><Ionicons name={n <= stars ? 'star' : 'star-outline'} size={34} color={YELLOW} style={{marginHorizontal: 4}} /></Pressable>)}
        </View>
        <Btn label="Done" onPress={() => { setStars(5); ride.finish(); }} />
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1, backgroundColor: t.bg}}>
      <WoulibMapView
        dark={dark} trip={trip} focus={focus} cardH={cardH}
        showRoute={!!trip && !ride.tracking} pins={{pickup: !!trip, dest: !!trip}}
        drivers={mapDrivers} searching={st === 'searching' || st === 'offer' || st === 'declined'} tracking={ride.tracking}
      />
      <View style={[styles.topBar, {top: MAP_TOP}]}>
        <Pressable onPress={toggle} style={[styles.circle, {backgroundColor: t.card, marginRight: 8}]}><Ionicons name={dark ? 'sunny' : 'moon'} size={18} color={t.ink} /></Pressable>
        {/* one back arrow on the idle steps: with a trip chosen it goes back to destinations, otherwise it leaves to Home (and resets the ride) */}
        {st === 'idle' && <Pressable onPress={trip ? ride.clearTrip : onHome} style={[styles.circle, {backgroundColor: t.card}]}><Ionicons name="arrow-back" size={19} color={t.ink} /></Pressable>}
      </View>
      {!!ride.toast && <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.toast, {top: MAP_TOP + 52}]}><Text style={{color: '#fff', fontWeight: '600'}}>{ride.toast}</Text></Animated.View>}
      <Card height={cardH} onToggle={() => setCollapsed(c => !c)}>{body}</Card>
    </KeyboardAvoidingView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 *  WOULIB OFFER — "Offer a ride": pickup, destination, time, seats, price → Publish adds it to Upcoming
 * ═══════════════════════════════════════════════════════════════════════ */

const OFFER_WHEN = ['In 15 min', 'In 1 hour', 'Tonight · 7:00 PM', 'Tomorrow · 8:00 AM'];

function WoulibOffer({onBack, onPublish}: {onBack: () => void; onPublish: (r: WoulibOfferedRide) => void}) {
  const {t} = useWoulibTheme();
  const places = useMemo(() => PLACES.map(p => p.n), []);
  const [from, setFrom] = useState(FROMS[0]);
  const [to, setTo] = useState(PLACES[0].n);
  const [when, setWhen] = useState(OFFER_WHEN[1]);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(10);
  const same = from === to;
  const next = (list: string[], v: string) => list[(list.indexOf(v) + 1) % list.length];
  const field = (label: string, value: string, onPress: () => void) => (
    <View>
      <Text style={[styles.label, {color: t.muted}]}>{label}</Text>
      <Pressable onPress={onPress} style={[styles.field, {backgroundColor: t.soft}]}>
        <Text style={{flex: 1, color: t.ink, fontWeight: '700'}}>{value}</Text>
        <Text style={{color: t.muted, fontSize: 12}}>Tap to change</Text>
      </Pressable>
    </View>
  );
  const stepper = (label: string, value: string, dec: () => void, inc: () => void) => (
    <View style={{flex: 1}}>
      <Text style={[styles.label, {color: t.muted}]}>{label}</Text>
      <View style={[styles.field, {backgroundColor: t.soft, justifyContent: 'space-between'}]}>
        <Pressable onPress={dec} hitSlop={10}><Ionicons name="remove-circle" size={26} color={t.ink} /></Pressable>
        <Text style={{color: t.ink, fontWeight: '800', fontSize: 16}}>{value}</Text>
        <Pressable onPress={inc} hitSlop={10}><Ionicons name="add-circle" size={26} color={t.ink} /></Pressable>
      </View>
    </View>
  );
  return (
    <View style={{flex: 1, backgroundColor: t.bg}}>
      <ScrollView contentContainerStyle={{paddingTop: MAP_TOP - 20, paddingHorizontal: 18, paddingBottom: 40}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Pressable onPress={onBack} style={[styles.circle, {backgroundColor: t.card, marginRight: 12}]}><Ionicons name="arrow-back" size={19} color={t.ink} /></Pressable>
          <Text style={{color: t.ink, fontSize: 26, fontWeight: '800'}}>Offer a ride</Text>
        </View>
        <Text style={{color: t.muted, marginTop: 10, fontSize: 13}}>Share your trip and let others book a seat.</Text>
        {field('Pickup', from, () => setFrom(next(FROMS, from)))}
        {field('Destination', to, () => setTo(next(places, to)))}
        {same && <Text style={{color: t.red, fontSize: 12.5, marginTop: 8}}>Pickup and destination must be different.</Text>}
        {field('When', when, () => setWhen(next(OFFER_WHEN, when)))}
        <View style={{flexDirection: 'row'}}>
          {stepper('Seats', String(seats), () => setSeats(s => Math.max(1, s - 1)), () => setSeats(s => Math.min(6, s + 1)))}
          <View style={{width: 10}} />
          {stepper('Price / seat', fare(price), () => setPrice(p => Math.max(1, p - 1)), () => setPrice(p => Math.min(200, p + 1)))}
        </View>
        <View style={{marginTop: 26}}>
          <Btn label="Publish ride" icon="checkmark-circle" disabled={same} onPress={() => onPublish({id: 'o' + Date.now(), from, destination: to, when, seats, pricePerSeat: price})} />
        </View>
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 *  NAVIGATION — Home → Find (map + ride flow) and Home → Offer
 * ═══════════════════════════════════════════════════════════════════════ */

/** Home ⇄ Find ⇄ Offer switch (lives inside the providers so Home can preselect a destination). */
function WoulibRoot({onOfferRide, onPublishRide, onExit}: {onOfferRide?: () => void; onPublishRide?: (r: WoulibOfferedRide) => void; onExit?: () => void}) {
  const ride = useRide();
  const [screen, setScreen] = useState<'home' | 'find' | 'offer'>('home');
  const [findLoading, setFindLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<WoulibUpcomingRide[]>(UPCOMING);

  const goHome = useCallback(() => { ride.finish(); setScreen('home'); }, [ride]); // leaving Find always resets the ride

  if (findLoading) return <View style={{flex: 1, backgroundColor: '#FBFAF7', alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 28, fontWeight: '900', color: '#111'}}>Woulib</Text><Ionicons name='location-sharp' size={34} color={YELLOW} style={{marginTop: 4}} /><Text style={{marginTop: 18, fontSize: 14, fontWeight: '600', color: '#6D6A62'}}>Loading Find a Ride…</Text></View>;
  if (screen === 'find') return <FlowInner onHome={goHome} />;
  if (screen === 'offer') {
    return (
      <WoulibOffer
        onBack={() => setScreen('home')}
        onPublish={r => {
          const left = `${r.seats} seat${r.seats === 1 ? '' : 's'} · ${fare(r.pricePerSeat)}/seat`;
          setUpcoming(u => [{id: r.id, to: r.destination, from: r.from, when: r.when, driver: `You · ${left}`, status: 'Published'}, ...u]);
          onPublishRide?.(r);
          setScreen('home');
        }}
      />
    );
  }
  return (
    <WoulibHome
      upcoming={upcoming}
      onExit={onExit}
      onOffer={() => { onOfferRide?.(); setScreen('offer'); }}
      onFind={dest => { ride.setMode('ride'); if (dest) ride.setDest(dest); setScreen('find'); }}
    />
  );
}

/** Render this anywhere in the app: it brings its own theme + ride providers. Opens on the Home screen. */
export function WoulibFlow({service, onOfferRide, onPublishRide, onExit}: {service?: WoulibRideService; onOfferRide?: () => void; onPublishRide?: (ride: WoulibOfferedRide) => void; onExit?: () => void}) {
  return (
    <WoulibThemeProvider>
      <RideProvider service={service}>
        <WoulibRoot onOfferRide={onOfferRide} onPublishRide={onPublishRide} onExit={onExit} />
      </RideProvider>
    </WoulibThemeProvider>
  );
}
export default WoulibFlow;
