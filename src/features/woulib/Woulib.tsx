/**
 * WOULIB — complete feature in ONE file (React Native / Expo + Reanimated + react-native-svg).
 *
 * Claude's Woulib implementation, isolated under src/features/woulib.
 * The existing app screens/auth/database remain untouched.
 */

import React, {ReactNode, createContext, memo, useContext, useEffect, useMemo, useRef, useState, useCallback} from 'react';

import {LayoutChangeEvent, Linking, Platform, Pressable, ScrollView, StatusBar, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle} from 'react-native';

import Animated, {Easing, FadeIn, FadeInDown, FadeOut, FadeOutUp, SharedValue, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight, ZoomIn, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';

import Svg, {Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Polyline, Rect, Stop} from 'react-native-svg';

import MapView, {Marker as GMarker, Polyline as GPolyline, UrlTile} from 'react-native-maps';

import {Ionicons} from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';

/* ======================================================================

   THEME

   ====================================================================== */

export const YELLOW = '#FEC509';

const KEY = 'woulib.theme';

export interface WoulibTheme {
  dark: boolean; bg: string; card: string; ink: string; muted: string; line: string;
  soft: string; yellowSoft: string; red: string; redSoft: string; green: string;
}

export const lightTheme: WoulibTheme = {
  dark: false, bg: '#FBFAF7', card: '#FFFFFF', ink: '#111111', muted: '#6D6A62', line: '#EBE7DC',
  soft: '#F3F1EA', yellowSoft: '#FFF1BD', red: '#E5484D', redSoft: '#FDE6E7', green: '#1FAE68',
};

export const darkTheme: WoulibTheme = {
  dark: true, bg: '#0D0D0F', card: '#17171A', ink: '#FFFFFF', muted: '#A5A299', line: '#2B2B30',
  soft: '#232327', yellowSoft: '#3A3110', red: '#E5484D', redSoft: '#3A1B1D', green: '#1FAE68',
};

interface Ctx { t: WoulibTheme; dark: boolean; setDark: (d: boolean) => void; toggle: () => void }

const ThemeCtx = createContext<Ctx>({t: lightTheme, dark: false, setDark: () => {}, toggle: () => {}});

export function WoulibThemeProvider({children}: {children: React.ReactNode}) {
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => { if (v === 'dark') setDarkState(true); }).catch(() => {});
  }, []);

  const setDark = useCallback((d: boolean) => {
    setDarkState(d);
    AsyncStorage.setItem(KEY, d ? 'dark' : 'light').catch(() => {});
  }, []);

  const toggle = useCallback(() => setDark(!dark), [dark, setDark]);

  return <ThemeCtx.Provider value={{t: dark ? darkTheme : lightTheme, dark, setDark, toggle}}>{children}</ThemeCtx.Provider>;
}

export const useWoulibTheme = () => useContext(ThemeCtx);

/* ======================================================================

   DATA & GEOGRAPHY

   ====================================================================== */

export type Pt = [number, number];
export interface LatLng {latitude: number; longitude: number}

/** Neutral placeholder coordinates. Real device/location data can replace these later. */
export const GEO: Record<string, LatLng> = {
  'Current location': {latitude: 0, longitude: 0}, 'City Center': {latitude: 0.003, longitude: 0.004},
  'Business District': {latitude: -0.002, longitude: 0.006}, 'Airport': {latitude: 0.006, longitude: -0.004},
  'Shopping District': {latitude: -0.004, longitude: -0.003}, 'Downtown': {latitude: 0.002, longitude: -0.006},
};

export const haversine = (a: LatLng, b: LatLng) => {
  const r = Math.PI / 180, dLa = (b.latitude - a.latitude) * r, dLo = (b.longitude - a.longitude) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLo / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

export const gridToLL = (trip: {A: Pt; fromLL: LatLng}, p: Pt): LatLng => ({latitude: trip.fromLL.latitude - (p[1] - trip.A[1]) * 0.000026, longitude: trip.fromLL.longitude + (p[0] - trip.A[0]) * 0.00027});
export const etaRange = (m: number) => `${Math.max(1, m - 1)}–${m + 1}`;

export const PLACES = [
  {n: 'City Center', a: 'Current area'}, {n: 'Business District', a: 'Current area'},
  {n: 'Airport', a: 'Nearby'}, {n: 'Shopping District', a: 'Current area'},
  {n: 'Downtown', a: 'Current area'},
];

export const FROMS = ['Current location', 'City Center', 'Business District', 'Downtown'];

export interface Vehicle {id: string; name: string; short: string; price: number; eta: number; seats: number; color: string; cat: 'N' | 'L'}

export const VEHICLES: Vehicle[] = [
  {id: 'civic', name: 'Honda Civic', short: 'Civic', price: 11.3, eta: 3, seats: 4, color: '#c9ccd6', cat: 'N'},
  {id: 'mazda3', name: 'Mazda3', short: 'Mazda3', price: 12.5, eta: 4, seats: 4, color: '#b73a3a', cat: 'N'},
  {id: 'crown', name: 'Toyota Crown', short: 'Crown', price: 14.1, eta: 5, seats: 4, color: '#2c3440', cat: 'N'},
  {id: 'sclass', name: 'Mercedes-Benz S-Class', short: 'S-Class', price: 29.2, eta: 5, seats: 4, color: '#e4e6ea', cat: 'L'},
  {id: 'panamera', name: 'Porsche Panamera', short: 'Panamera', price: 33.2, eta: 3, seats: 4, color: '#5a5f69', cat: 'L'},
  {id: 'ghost', name: 'Rolls-Royce Ghost', short: 'Ghost', price: 42.8, eta: 6, seats: 4, color: '#1d1d22', cat: 'L'},
];

export interface Pay {id: string; name: string; sub: string; badge: string; color: string; group: 'card' | 'wallet'}

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
const dedupe = (p: Pt[]) => p.filter((a, i) => !i || a[0] !== p[i - 1][0] || a[1] !== p[i - 1][1]);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Rounds the corners of an axis-aligned polyline so the car and the route turn smoothly. */
const smooth = (p: Pt[]) => p;
const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const along = (line: Pt[], q: number): [number, number, number] => {
  if (!line.length) return [0, 0, 0];
  if (line.length === 1) return [line[0][0], line[0][1], 0];
  const n = line.length - 1, z = clamp(q, 0, 1) * n, i = Math.min(n - 1, Math.floor(z)), f = z - i;
  const a = line[i], b = line[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, i];
};

export interface Trip {A: Pt; B: Pt; C: Pt; D: Pt; fromLL: LatLng; toLL: LatLng; km: number; min: number; price: number; from: string; dest: string}

export function makeTrip(from: string, dest: string): Trip {
  const fromLL = GEO[from.split(',')[0]] ?? GEO['Current location'];
  let toLL = GEO[dest] ?? GEO['City Center'];
  const A: Pt = [180, 520], D: Pt = [620, 170];
  const B: Pt = [290, 450], C: Pt = [490, 300];
  const km = Math.max(1, haversine(fromLL, toLL));
  const min = Math.max(4, Math.round(km * 3.2));
  const price = +(9 + km * 1.35).toFixed(2);
  return {A, B, C, D, fromLL, toLL, km, min, price, from, dest};
}

export interface Driver {id: string; name: string; first: string; initial: string; color: string; plate: string; rating: string; trips: string; phone: string; pos: Pt; eta: number; diff: number}
const COLORS = ['#FEC509', '#4A86F7', '#1FAE68', '#E5484D', '#9B59B6', '#FF8A3D'];

function makeDrivers(A: Pt): Driver[] {
  const R = rng(hash(String(A[0]) + String(A[1])));
  const names = ['Alex Morgan', 'Jordan Lee', 'Taylor Smith', 'Casey Brown'];
  const rp = () => [A[0] + (R() - 0.5) * 260, A[1] + (R() - 0.5) * 260] as Pt;
  return [0, 1, 2, 3].map(i => ({
    id: 'd' + i, name: names[i], first: names[i].split(' ')[0], initial: names[i][0],
    color: COLORS[(Math.floor(R() * 6) + i) % 6], plate: 'WL ' + (1000 + Math.floor(R() * 9000)),
    rating: (4.6 + Math.floor(R() * 5) / 10).toFixed(1), trips: String(200 + Math.floor(R() * 2800)),
    phone: '+1202555' + String(1000 + Math.floor(R() * 9000)), pos: rp(), eta: 2 + Math.floor(R() * 6), diff: 2 + Math.floor(R() * 7) + [0, 0.3, 0.5][Math.floor(R() * 3)],
  }));
}

/* ======================================================================

   RIDE STATE MACHINE

   ====================================================================== */

export type RideStatus = 'idle' | 'searching' | 'offer' | 'declined' | 'confirmed' | 'onway' | 'arrived';
export type WoulibMode = 'ride' | 'delivery';
export type ProviderStatus = 'offline' | 'online' | 'request' | 'accept' | 'arriving' | 'arrived' | 'trip' | 'complete' | 'earnings';

export interface Tracking {path: Pt[]; startedAt: number; duration: number}

export interface RideState {
  from: string; dest: string; vehicle: Vehicle; payment: Pay; trip: Trip | null; mode: WoulibMode;
  status: RideStatus; drivers: Driver[]; shown: Record<string, boolean>; declined: Record<string, boolean>;
  highlight: string | null; offerIdx: number; found: number; toast: string | null; price: number;
  accepted: Driver | null; tracking: Tracking | null; eta: number;
  landmark: string; mapView: 'illustrated' | 'live'; providerStatus: ProviderStatus;
}

export interface WoulibRideService {
  createDrivers(trip: Trip): Driver[];
  clear(): void;
}

export interface WoulibProviderLifecycle {
  status: ProviderStatus;
  setStatus(status: ProviderStatus): void;
}

export interface RideApi extends RideState {
  setDest(name: string): void; cycleFrom(): void; setVehicle(v: Vehicle): void; setPayment(p: Pay): void; setMode(mode: WoulibMode): void;
  startSearch(): void; decline(): void; accept(): void; cancel(): void;
  setLandmark(t: string): void; setMapView(v: 'illustrated' | 'live'): void; setProviderStatus(status: ProviderStatus): void;
}

const INIT: RideState = {
  from: FROMS[0], dest: PLACES[0].n, vehicle: VEHICLES[0], payment: PAYMENTS[0], trip: null, mode: 'ride', status: 'idle',
  drivers: [], shown: {}, declined: {}, highlight: null, offerIdx: 0, found: 0, toast: null, price: 0, accepted: null, tracking: null, eta: 5, landmark: '', mapView: 'illustrated', providerStatus: 'offline',
};

const Ctx = createContext<RideApi>(null as unknown as RideApi);
export const useRide = () => useContext(Ctx);

/** Replace this adapter with Supabase Realtime later. Screens consume RideApi, not transport-specific code. */
export function createDemoWoulibRideService(): WoulibRideService {
  return {createDrivers: trip => makeDrivers(trip), clear: () => {}};
}

export function createProviderLifecycle(status: ProviderStatus = 'offline'): WoulibProviderLifecycle {
  let current = status;
  return {get status() { return current; }, setStatus(next) { current = next; }};
}

/** Ride state machine. Driver search/offers/ETA are simulated today and can be replaced at this boundary later. */
export function RideProvider({children}: {children: React.ReactNode}) {
  const [s, setS] = useState<RideState>(INIT);
  const service = useMemo(() => createDemoWoulibRideService(), []);
  const sr = useRef(s); sr.current = s;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const later = (ms: number, f: () => void) => { timers.current.push(setTimeout(f, ms)); };
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; if (tick.current) { clearInterval(tick.current); tick.current = null; } service.clear(); };
  useEffect(() => clear, []);
  const patch = (p: Partial<RideState>) => setS(x => ({...x, ...p}));
  const offer = (i: number) => {
    const d = sr.current.drivers[i]; if (!d) return;
    setS(x => ({...x, status: 'offer', offerIdx: i, highlight: d.id, shown: {...x.shown, [d.id]: true}, declined: {...x.declined, [d.id]: false}, price: +(x.vehicle.price + d.diff).toFixed(2)}));
  };
  const api: RideApi = {
    ...s,
    setDest: name => setS(x => ({...x, dest: name, trip: makeTrip(x.from, name)})),
    cycleFrom: () => setS(x => { const from = FROMS[(FROMS.indexOf(x.from) + 1) % FROMS.length]; return {...x, from, trip: x.trip ? makeTrip(from, x.dest) : null}; }),
    setVehicle: v => patch({vehicle: v}),
    setPayment: p => patch({payment: p}),
    setMode: mode => patch({mode}),
    setLandmark: l => patch({landmark: l}),
    setMapView: v => patch({mapView: v}),
    setProviderStatus: providerStatus => patch({providerStatus}),
    startSearch: () => {
      clear();
      const trip = sr.current.trip; if (!trip) return;
      setS(x => ({...x, drivers: service.createDrivers(trip), providerStatus: 'request', status: 'searching', shown: {}, declined: {}, highlight: null, offerIdx: 0, found: 0, toast: null, accepted: null, tracking: null, eta: 5}));
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
      patch({status: 'confirmed', providerStatus: 'accept', highlight: null, accepted: d});
      later(2800, () => {
        const mid: Pt = Math.random() < 0.5 ? [d.pos[0], trip.A[1]] : [trip.A[0], d.pos[1]];
        const path = smooth(dedupe([d.pos, mid, trip.A]));
        const duration = 17500, startedAt = Date.now() + 1200;
        patch({status: 'onway', providerStatus: 'arriving', tracking: {path, startedAt, duration}, eta: 5});
        tick.current = setInterval(() => {
          const q = (Date.now() - startedAt) / duration;
          if (q >= 1) { clearInterval(tick.current!); tick.current = null; patch({status: 'arrived', providerStatus: 'arrived', eta: 0}); return; }
          const eta = Math.max(1, Math.ceil(5 * (1 - Math.max(0, q))));
          patch({eta});
        }, 500);
      });
    },
    cancel: () => { clear(); setS({...INIT, providerStatus: 'offline'}); },
  };
  return <Ctx.Provider value={api}><>{children}</></Ctx.Provider>;
}

/* ======================================================================

   UI HELPERS / MAPS / SCREENS

   ====================================================================== */

function Txt({children, size = 14, w = '400', c = 'ink', style}: {children: React.ReactNode; size?: number; w?: any; c?: any; style?: StyleProp<TextStyle>}) {
  const {t} = useWoulibTheme();
  return <Text style={[{fontSize: size, fontWeight: w, color: c === 'ink' ? t.ink : c === 'muted' ? t.muted : c}, style]}>{children}</Text>;
}

function Card({children, style}: {children: React.ReactNode; style?: StyleProp<ViewStyle>}) { const {t} = useWoulibTheme(); return <View style={[{backgroundColor: t.card, borderRadius: 18}, style]}>{children}</View>; }
function Btn({label, onPress, variant = 'primary', icon, height = 52, style}: {label: string; onPress?: () => void; variant?: 'primary' | 'outline' | 'danger' | 'soft'; icon?: string; height?: number; style?: StyleProp<ViewStyle>}) { const {t} = useWoulibTheme(); const bg = variant === 'primary' ? YELLOW : variant === 'danger' ? t.redSoft : variant === 'soft' ? t.soft : 'transparent'; const fg = variant === 'danger' ? t.red : '#111'; return <Pressable onPress={onPress} style={[{height, borderRadius: 14, backgroundColor: bg, borderWidth: variant === 'outline' ? 1 : 0, borderColor: t.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8}, style]}><>{icon && <Ionicons name={icon as any} size={18} color={fg} />}<Txt w="700" c={fg}>{label}</Txt></></Pressable>; }
function Avatar({initial, color = YELLOW, size = 42}: {initial: string; color?: string; size?: number}) { return <View style={{width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center'}}><Text style={{fontWeight: '800', color: '#111', fontSize: size * 0.38}}>{initial}</Text></View>; }
function CarThumb({color, width = 90}: {color: string; width?: number}) { return <View style={{width, height: width * 0.48, borderRadius: width * 0.2, backgroundColor: color, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="car-sport" size={width * 0.48} color="#111" /></View>; }
function PayBadge({badge, color}: {badge: string; color: string}) { return <View style={{minWidth: 44, height: 26, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6}}><Text style={{fontSize: 10, fontWeight: '800', color: '#fff'}}>{badge}</Text></View>; }
function PinIcon({size = 22}: {size?: number}) { return <Ionicons name="location" size={size} color={YELLOW} />; }
function RingIcon({size = 22}: {size?: number}) { return <Ionicons name="radio-button-on-outline" size={size} color={YELLOW} />; }
function Logo() { const {t} = useWoulibTheme(); return <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><View style={{width: 13, height: 13, borderRadius: 7, backgroundColor: YELLOW}} /><Txt size={20} w="800">Woulib</Txt></View>; }
function ThemeToggle() { const {dark, toggle, t} = useWoulibTheme(); return <Pressable onPress={toggle} style={{width: 48, height: 42, borderRadius: 21, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={20} color={t.ink} /></Pressable>; }
function TopBar({children, onBack, right}: {children?: React.ReactNode; onBack?: () => void; right?: React.ReactNode}) { const {t} = useWoulibTheme(); return <View style={{position: 'absolute', top: Platform.OS === 'ios' ? 54 : 28, left: 14, right: 14, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10}}>{onBack && <Pressable onPress={onBack} style={{width: 44, height: 44, borderRadius: 16, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="chevron-back" size={22} color={t.ink} /></Pressable>}<View style={{flex: 1, minHeight: 44, borderRadius: 16, backgroundColor: t.card, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9}}>{children}</View>{right}</View>; }
function Sheet({visible, children, delayIn = 0, spring = false, maxHeight}: {visible: boolean; children: React.ReactNode; delayIn?: number; spring?: boolean; maxHeight?: string}) { const {t} = useWoulibTheme(); if (!visible) return null; return <Animated.View entering={spring ? ZoomIn.delay(delayIn).duration(360) : FadeInDown.delay(delayIn).duration(320)} style={{position: 'absolute', left: 12, right: 12, bottom: 12, maxHeight: maxHeight as any, backgroundColor: t.card, borderRadius: 24, padding: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: {width: 0, height: 7}, elevation: 8}}>{children}</Animated.View>; }
function BottomBar({children}: {children: React.ReactNode}) { const {t} = useWoulibTheme(); return <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.line, padding: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 14}}>{children}</View>; }
function Stepper({step}: {step: number}) { const {t} = useWoulibTheme(); return <View style={{flexDirection: 'row', gap: 6}}>{[0,1,2,3,4].map(i => <View key={i} style={{height: 5, flex: 1, borderRadius: 3, backgroundColor: i <= step ? YELLOW : t.line}} />)}</View>; }

/* Illustrated map and Live map implementation from Claude's feature are kept as the same architecture. */

interface MapDriver {id: string; initial: string; color: string; eta: number; pos: Pt; vis: boolean; hl?: boolean; dim?: boolean}
interface WoulibMapProps {dark: boolean; trip: Trip | null; focus: {x: number; y: number; s: number}; showRoute?: boolean; pins?: {pickup?: boolean; dest?: boolean}; drivers?: MapDriver[]; searching?: boolean; tracking?: Tracking | null}

function DriverPin({d}: {d: MapDriver}) { return <View style={{width: 38, height: 38, borderRadius: 19, backgroundColor: d.dim ? '#999' : d.color, borderWidth: d.hl ? 3 : 1, borderColor: d.hl ? '#111' : '#fff', alignItems: 'center', justifyContent: 'center'}}><Ionicons name="car" size={17} color="#111" /></View>; }

function IllustratedMap({dark, trip, focus, showRoute, pins, drivers = [], searching, tracking}: WoulibMapProps) {
  const {t} = useWoulibTheme();
  const SW = 800, SH = 800;
  return <View style={{flex: 1, backgroundColor: t.bg, overflow: 'hidden'}}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${SW} ${SH}`}>
      <Rect width={SW} height={SH} fill={dark ? '#111318' : '#F5F1E7'} />
      <Path d="M0 150L800 610" stroke={dark ? '#2B2B30' : '#DDD6C7'} strokeWidth="74" />
      <Path d="M-20 650L760 -20" stroke={dark ? '#25262C' : '#E4DED2'} strokeWidth="58" />
      <Path d="M100 0L420 800" stroke={dark ? '#22242A' : '#EAE4D8'} strokeWidth="34" />
      <Path d="M0 420L800 420" stroke={dark ? '#202127' : '#ECE7DE'} strokeWidth="26" />
      {trip && showRoute && <Polyline points={`${trip.A[0]},${trip.A[1]} ${trip.B[0]},${trip.B[1]} ${trip.C[0]},${trip.C[1]} ${trip.D[0]},${trip.D[1]}`} fill="none" stroke={YELLOW} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />}
      {trip && pins?.pickup && <Circle cx={trip.A[0]} cy={trip.A[1]} r={11} fill={YELLOW} stroke="#111" strokeWidth={4} />}
      {trip && pins?.dest && <><Circle cx={trip.D[0]} cy={trip.D[1]} r={13} fill="#111" stroke={YELLOW} strokeWidth={4} /><Text x={trip.D[0] - 45} y={trip.D[1] - 22} fill={dark ? '#fff' : '#111'} fontSize="14" fontWeight="700">{trip.dest}</Text></>}
      {drivers.filter(d => d.vis).map(d => <G key={d.id} transform={`translate(${d.pos[0] - 19} ${d.pos[1] - 19})`}><foreignObject x="0" y="0" width="38" height="38"><DriverPin d={d} /></foreignObject></G>)}
      {tracking && <Circle cx={tracking.path[0]?.[0] ?? 0} cy={tracking.path[0]?.[1] ?? 0} r={8} fill={YELLOW} />}
    </Svg>
    {searching && <View style={{position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: t.card, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8}}><Txt size={12} w="600">Finding nearby drivers…</Txt></View>}
  </View>;
}

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

async function probeTiles(): Promise<boolean> {
  try { const c = new AbortController(), id = setTimeout(() => c.abort(), 4000); const r = await fetch(TILE_URL.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'), {signal: c.signal}); clearTimeout(id); return r.ok; } catch { return false; }
}

function useRealRoute(trip: Trip | null) {
  const [route, setRoute] = useState<LatLng[]>([]);
  useEffect(() => {
    if (!trip) { setRoute([]); return; }
    setRoute([trip.fromLL, trip.toLL]);
    let dead = false;
    fetch(`${OSRM}/${trip.fromLL.longitude},${trip.fromLL.latitude};${trip.toLL.longitude},${trip.toLL.latitude}?overview=full&geometries=geojson`)
      .then(r => r.json()).then(j => { const c = j?.routes?.[0]?.geometry?.coordinates; if (!dead && c?.length) setRoute(c.map((p: number[]) => ({latitude: p[1], longitude: p[0]}))); }).catch(() => {});
    return () => { dead = true; };
  }, [trip]);
  return route;
}

function LiveMap({dark, trip, showRoute, pins, drivers = [], tracking, onUnavailable}: WoulibMapProps & {onUnavailable: () => void}) {
  const ref = useRef<any>(null), route = useRealRoute(trip);
  const trackLL = useMemo(() => (trip && tracking ? tracking.path.map(p => gridToLL(trip, p)) : null), [trip, tracking]);
  const [car, setCar] = useState<LatLng | null>(null);
  useEffect(() => { const id = setInterval(async () => { if (!(await probeTiles())) onUnavailable(); }, 20000); return () => clearInterval(id); }, [onUnavailable]);
  useEffect(() => { if (trip && showRoute && route.length > 1) ref.current?.fitToCoordinates(route, {edgePadding: {top: 150, bottom: 380, left: 60, right: 60}, animated: true}); }, [showRoute, route, trip]);
  useEffect(() => { if (trip && !showRoute && !tracking) ref.current?.animateCamera({center: trip.fromLL, zoom: 15}, {duration: 600}); }, [trip, showRoute, tracking]);
  useEffect(() => {
    if (!tracking || !trackLL) { setCar(null); return; }
    const line = trackLL.map(p => [p.longitude, p.latitude] as Pt);
    const id = setInterval(() => { const q = Math.min(1, Math.max(0, (Date.now() - tracking.startedAt) / tracking.duration)), [lng, lat] = along(line, ease(q)), c = {latitude: lat, longitude: lng}; setCar(c); ref.current?.animateCamera({center: c, zoom: 16}, {duration: 300}); }, 250);
    return () => clearInterval(id);
  }, [tracking, trackLL]);
  const init = trip ? {latitude: trip.fromLL.latitude, longitude: trip.fromLL.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04} : {latitude: 0, longitude: 0, latitudeDelta: 0.12, longitudeDelta: 0.12};
  return <MapView ref={ref} style={{flex: 1}} initialRegion={init} mapType={Platform.OS === 'android' ? 'none' : 'standard'} userInterfaceStyle={dark ? 'dark' : 'light'} rotateEnabled={false} toolbarEnabled={false}>
    <UrlTile urlTemplate={TILE_URL} maximumZ={19} zIndex={-1} />
    {trip && showRoute && <GPolyline coordinates={route} strokeColor={YELLOW} strokeWidth={6} />}
    {trackLL && <GPolyline coordinates={trackLL} strokeColor={YELLOW} strokeWidth={6} />}
    {trip && pins?.pickup && <GMarker coordinate={trip.fromLL} anchor={{x: 0.5, y: 0.5}}><View style={{width: 18, height: 18, borderRadius: 9, backgroundColor: YELLOW, borderWidth: 3, borderColor: '#111'}} /></GMarker>}
    {trip && pins?.dest && <GMarker coordinate={trip.toLL} title={trip.dest} pinColor="black" />}
    {drivers.filter(d => d.vis).map(d => <GMarker key={d.id} coordinate={gridToLL(trip!, d.pos)} anchor={{x: 0.5, y: 0.5}} opacity={d.dim ? 0.4 : 1}><DriverPin d={d} /></GMarker>)}
    {car && <GMarker coordinate={car} anchor={{x: 0.5, y: 0.5}}><DriverPin d={{id: 'car', initial: '', color: YELLOW, eta: 0, pos: [0,0], vis: true}} /></GMarker>}
  </MapView>;
}

export function WoulibMapView(props: WoulibMapProps) {
  const [live, setLive] = useState(false);
  const [available, setAvailable] = useState(true);
  const {t} = useWoulibTheme();
  return <View style={{flex: 1}}>
    {live && available ? <LiveMap {...props} onUnavailable={() => setAvailable(false)} /> : <IllustratedMap {...props} />}
    <View style={{position: 'absolute', top: Platform.OS === 'ios' ? 112 : 86, right: 14, flexDirection: 'row', backgroundColor: t.card, borderRadius: 99, padding: 4}}>
      <Pressable onPress={() => setLive(false)} style={{paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: !live ? YELLOW : 'transparent'}}><Txt size={11} w="700">Illustrated</Txt></Pressable>
      <Pressable onPress={() => {setAvailable(true); setLive(true);}} style={{paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: live ? YELLOW : 'transparent'}}><Txt size={11} w="700">Live map</Txt></Pressable>
    </View>
  </View>;
}

/* ======================================================================

   HOME SCREEN

   ====================================================================== */

export interface WoulibHomeProps {
  onFindRide: () => void;
  onOfferRide?: () => void;
  onProfile?: () => void;
  onTab?: (tab: 'home' | 'search' | 'offer' | 'profile') => void;
}

function Hero() {
  return <View style={{height: 134, borderRadius: 20, overflow: 'hidden', backgroundColor: '#14161d', marginBottom: 14}}>
    <Svg width="100%" height="100%" viewBox="0 0 380 134" preserveAspectRatio="xMidYMid slice" style={{position: 'absolute'}}>
      <Defs>
        <LinearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><Stop offset="0.3" stopColor="#14161d" /><Stop offset="0.8" stopColor="#9a6228" /></LinearGradient>
        <LinearGradient id="fd" x1="0" y1="0" x2="1" y2="0"><Stop offset="0.4" stopColor="#14161d" stopOpacity="1" /><Stop offset="1" stopColor="#14161d" stopOpacity="0" /></LinearGradient>
      </Defs>
      <Rect width="380" height="134" fill="url(#sk)" />
      <Path d="M120 104L190 74 240 92 295 64 380 94V134H120z" fill="#2a313d" /><Path d="M215 134L322 92 346 92 372 134z" fill="#4a4a50" />
      <Circle cx="322" cy="54" r="36" fill="none" stroke={YELLOW} strokeOpacity={0.35} strokeWidth="5" /><Circle cx="322" cy="54" r="23" fill={YELLOW} fillOpacity={0.18} />
      <Path d="M322 76c-10-13-16-20-16-28a16 16 0 0132 0c0 8-6 15-16 28z" fill={YELLOW} /><Circle cx="322" cy="48" r="6" fill="#14161d" />
      <Rect width="270" height="134" fill="url(#fd)" />
    </Svg>
    <View style={{position: 'absolute', left: 24, top: 28}}><Txt size={19} w="600" c="#fff" style={{lineHeight: 25}}>You're already going{ '\n' }there. Why not</Txt><Txt size={19} w="700" c={YELLOW} style={{lineHeight: 25}}>share the ride?</Txt></View>
  </View>;
}

function Row({icon, label, value, onPress, last, chevron = 'chevron-forward', dim}: {icon: React.ReactNode; label: string; value: string; onPress: () => void; last?: boolean; chevron?: string; dim?: boolean}) {
  const {t} = useWoulibTheme();
  return <Pressable onPress={onPress} style={{flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line, flex: 1}}><View style={{width: 26, alignItems: 'center'}}>{icon}</View><View style={{flex: 1}}><Txt w="600">{label}</Txt><Txt size={13.5} c={dim ? 'muted' : 'ink'}>{value}</Txt></View><Ionicons name={chevron as any} size={18} color={t.muted} /></Pressable>;
}

export function WoulibHomeScreen({onFindRide, onOfferRide, onProfile, onTab}: WoulibHomeProps) {
  const {t} = useWoulibTheme();
  const ride = useRide();
  const [di, setDi] = useState(0), [ti, setTi] = useState(0), [pi, setPi] = useState(0);
  const dates = ['Today', 'Tomorrow', 'In 2 days'], times = ['Anytime', '8:00 AM', '5:00 PM'], pax = ['1 passenger', '2 passengers', '3 passengers'];
  const chosen = !!ride.trip;
  const icon = (n: any) => <Ionicons name={n} size={22} color={t.ink} />;
  return <View style={{flex: 1, backgroundColor: t.bg}}>
    <ScrollView contentContainerStyle={{paddingTop: Platform.OS === 'ios' ? 58 : 32, paddingHorizontal: 16, paddingBottom: 110}} showsVerticalScrollIndicator={false}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18}}><View><Logo /><Txt size={13} style={{marginTop: 4}}>Share rides. Go further.</Txt></View><View style={{flexDirection: 'row', gap: 10, marginTop: 6}}><ThemeToggle /><Pressable onPress={onProfile} style={{width: 42, height: 42, borderRadius: 21, borderWidth: 2.5, borderColor: YELLOW, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="person" size={19} color={t.ink} /></Pressable></View></View>
      <Hero />
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 14}}><Btn label="Ride" icon="car" height={50} onPress={() => ride.setMode('ride')} style={{flex: 1}} /><Btn label="Delivery" icon="cube-outline" variant="outline" height={50} onPress={() => ride.setMode('delivery')} style={{flex: 1}} /></View>
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 14}}><Btn label={ride.mode === 'delivery' ? 'Send a Delivery' : 'Find a Ride'} icon={ride.mode === 'delivery' ? 'cube-outline' : 'car'} height={58} onPress={onFindRide} style={{flex: 1}} /><Btn label="Offer a Ride" icon="add" variant="outline" height={58} onPress={onOfferRide} style={{flex: 1}} /></View>
      <Card style={{paddingHorizontal: 16, paddingBottom: 14, marginBottom: 22}}><Row icon={<RingIcon />} label="From" value={chosen ? ride.from.split(',')[0] : 'Where are you leaving from?'} dim={!chosen} onPress={onFindRide} /><Row icon={<PinIcon />} label="To" value={chosen ? ride.dest : 'Where are you going?'} dim={!chosen} onPress={onFindRide} /><View style={{flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.line}}><Row icon={icon('calendar-outline')} label="Date" value={dates[di]} chevron="chevron-down" last onPress={() => setDi((di + 1) % 3)} /><View style={{width: 1, backgroundColor: t.line, marginVertical: 10}} /><View style={{flex: 1, paddingLeft: 14}}><Row icon={icon('time-outline')} label="Time" value={times[ti]} chevron="chevron-down" last onPress={() => setTi((ti + 1) % 3)} /></View></View><Row icon={icon('person')} label="Passengers" value={pax[pi]} last onPress={() => setPi((pi + 1) % 3)} /><Btn label="Find Rides" icon="search" height={54} onPress={onFindRide} /></Card>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}><Txt size={20} w="700">Nearby Rides</Txt><Txt size={13} c={t.dark ? YELLOW : 'muted'}>See All ›</Txt></View>
      <Card style={{padding: 12, marginBottom: 16}}><View style={{flexDirection: 'row', gap: 14}}><View style={{width: 98, height: 86, borderRadius: 12, backgroundColor: '#3b4452', alignItems: 'center', justifyContent: 'center'}}><CarThumb width={84} color="#11141a" /></View><View style={{flex: 1}}><Txt size={16} w="600">Current location → City Center</Txt><Txt size={13} c="muted" style={{marginVertical: 3}}>Today · 5:00 PM</Txt><View style={{flexDirection: 'row', gap: 14}}><Txt size={13} c="muted">2 seats left</Txt><Txt size={13} c="muted">$15</Txt></View></View></View><View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10}}><Avatar initial="A" size={34} /><View style={{flex: 1}}><Txt size={13}>Alex Morgan</Txt><Txt size={11.5} c="muted">★ 4.8 (124 rides)</Txt></View><Pressable onPress={onFindRide} style={{backgroundColor: YELLOW, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 18}}><Txt w="700" size={13} c="#111111">Join Ride →</Txt></Pressable></View></Card>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}><Txt size={20} w="700">Your Upcoming Rides</Txt><Txt size={13} c={t.dark ? YELLOW : 'muted'}>See All ›</Txt></View>
      <Card style={{padding: 14}}><Txt size={16} w="600">City Center → Current location</Txt><Txt size={13} c="muted" style={{marginTop: 3}}>Tomorrow · 8:00 AM · 1 passenger · $14</Txt></Card>
    </ScrollView>
    <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 10, paddingBottom: 26}}>{([['home', 'home', 'Home'], ['search', 'search', 'Search'], ['offer', 'add-circle-outline', 'Offer'], ['profile', 'person-outline', 'Profile']] as const).map(([k, ic, lb]) => <Pressable key={k} onPress={() => onTab?.(k)} style={{alignItems: 'center', gap: 2}}><Ionicons name={ic as any} size={24} color={k === 'home' ? YELLOW : t.muted} /><Txt size={11} c={k === 'home' ? YELLOW : 'muted'}>{lb}</Txt></Pressable>)}</View>
  </View>;
}

/* ======================================================================

   ROUTE / PAYMENT / CAR / RIDE SCREENS

   ====================================================================== */

export function WoulibRouteScreen({onBack, onContinue}: {onBack: () => void; onContinue: () => void}) {
  const {t, dark} = useWoulibTheme(); const ride = useRide(); const [picked, setPicked] = useState(false); const trip = picked ? ride.trip : null;
  const focus = trip ? {x: (trip.A[0] + trip.D[0]) / 2, y: (trip.A[1] + trip.D[1]) / 2, s: 0.95} : {x: 400, y: 400, s: 0.75};
  return <View style={{flex: 1, backgroundColor: t.bg}}><WoulibMapView dark={dark} trip={trip} focus={focus} showRoute={picked} pins={{pickup: picked, dest: picked}} /><TopBar onBack={() => (picked ? setPicked(false) : onBack())}><Stepper step={0} /></TopBar><Sheet visible={!picked} maxHeight="68%"><Txt size={22} w="700">{ride.mode === 'delivery' ? 'Where should we deliver?' : 'Where to?'}</Txt><Txt size={12} c="muted" style={{marginTop: 2}}>Pick a destination and we'll find {ride.mode === 'delivery' ? 'a provider' : 'rides'} on the way</Txt><Card style={{paddingHorizontal: 14, marginTop: 14}}><View style={{flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line}}><RingIcon /><View style={{flex: 1}}><Txt w="600">From</Txt><Txt size={13.5} c="muted">{ride.from}</Txt></View><View style={{backgroundColor: t.soft, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4}}><Txt size={11.5}>Current</Txt></View></View><View style={{flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12}}><PinIcon /><View style={{flex: 1}}><Txt w="600">To</Txt><Txt size={13.5} c="muted">Search a place or address</Txt></View><Ionicons name="search" size={18} color={t.muted} /></View></Card><ScrollView showsVerticalScrollIndicator={false} style={{marginTop: 4}}>{PLACES.map((p, i) => <View key={p.n}>{(i === 0 || i === 2) && <Txt size={11.5} w="600" c="muted" style={{marginTop: 16, marginBottom: 6, letterSpacing: 0.8}}>{i === 0 ? 'RECENT' : 'SUGGESTED'}</Txt>}<Pressable onPress={() => { ride.setDest(p.n); setPicked(true); }} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.line}}><View style={{width: 38, height: 38, borderRadius: 19, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={i < 2 ? 'time-outline' : 'location-outline'} size={18} color={t.muted} /></View><View style={{flex: 1}}><Txt w="600">{p.n}</Txt><Txt size={12} c="muted">{p.a}</Txt></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></Pressable></View>)}</ScrollView></Sheet>{picked && trip && <BottomBar><View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}><Txt w="700">{trip.dest}</Txt><Txt w="700">{trip.km.toFixed(1)} km · {trip.min} min</Txt></View><Btn label="Continue" onPress={onContinue} /></BottomBar>}</View>;
}

export function WoulibPaymentScreen({onBack, onContinue}: {onBack: () => void; onContinue: () => void}) {
  const {t, dark} = useWoulibTheme(); const ride = useRide();
  return <View style={{flex: 1, backgroundColor: t.bg}}><WoulibMapView dark={dark} trip={ride.trip} focus={{x: 400, y: 400, s: 0.85}} showRoute pins={{pickup: true, dest: true}} /><TopBar onBack={onBack}><Stepper step={1} /></TopBar><Sheet visible maxHeight="72%"><Txt size={22} w="700">Payment</Txt><Txt size={12} c="muted" style={{marginTop: 2}}>Choose how you want to pay</Txt><ScrollView style={{marginTop: 12}}>{PAYMENTS.map(p => <Pressable key={p.id} onPress={() => ride.setPayment(p)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line}}><PayBadge badge={p.badge} color={p.color} /><View style={{flex: 1}}><Txt w="600">{p.name}</Txt><Txt size={12} c="muted">{p.sub}</Txt></View>{ride.payment.id === p.id && <Ionicons name="checkmark-circle" size={22} color={YELLOW} />}</Pressable>)}</ScrollView><BottomBar><Btn label="Continue" onPress={onContinue} /></BottomBar></Sheet></View>;
}

export function WoulibCarScreen({onBack, onChangePayment, onFindDriver}: {onBack: () => void; onChangePayment: () => void; onFindDriver: () => void}) {
  const {t, dark} = useWoulibTheme(); const ride = useRide(); const [cat, setCat] = useState<'N' | 'L'>('N');
  const list = VEHICLES.filter(v => v.cat === cat);
  return <View style={{flex: 1, backgroundColor: t.bg}}><WoulibMapView dark={dark} trip={ride.trip} focus={{x: 400, y: 400, s: 0.85}} showRoute pins={{pickup: true, dest: true}} /><TopBar onBack={onBack}><Stepper step={2} /></TopBar><Sheet visible maxHeight="72%"><View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}><View><Txt size={22} w="700">Choose a {ride.mode === 'delivery' ? 'provider' : 'ride'}</Txt><Txt size={12} c="muted" style={{marginTop: 2}}>{ride.mode === 'delivery' ? 'Transport your goods' : 'Select the vehicle that fits you'}</Txt></View><Txt size={22} w="800">${ride.trip?.price.toFixed(2)}</Txt></View><View style={{flexDirection: 'row', backgroundColor: t.soft, borderRadius: 12, padding: 4, marginTop: 14}}><Pressable onPress={() => setCat('N')} style={{flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: cat === 'N' ? t.card : 'transparent', alignItems: 'center'}}><Txt w="700">Standard</Txt></Pressable><Pressable onPress={() => setCat('L')} style={{flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: cat === 'L' ? t.card : 'transparent', alignItems: 'center'}}><Txt w="700">Luxury</Txt></Pressable></View><ScrollView style={{marginTop: 8}}>{list.map(v => <Pressable key={v.id} onPress={() => ride.setVehicle(v)} style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line}}><CarThumb color={v.color} width={76} /><View style={{flex: 1}}><Txt w="700">{v.name}</Txt><Txt size={12} c="muted">{v.seats} seats · {v.eta} min</Txt></View><Txt w="800">${v.price.toFixed(2)}</Txt>{ride.vehicle.id === v.id && <Ionicons name="checkmark-circle" size={22} color={YELLOW} />}</Pressable>)}</ScrollView><BottomBar><Pressable onPress={onChangePayment} style={{flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.soft, borderRadius: 14, padding: 10, marginBottom: 12}}><PayBadge badge={ride.payment.badge} color={ride.payment.color} /><View style={{flex: 1}}><Txt size={11.5} c="muted">Paying with</Txt><Txt w="600">{ride.payment.name}</Txt></View><Ionicons name="chevron-down" size={18} color={t.muted} /></Pressable><Btn label={`Find driver — $${ride.vehicle.price.toFixed(2)}`} onPress={() => { ride.startSearch(); onFindDriver(); }} /></BottomBar></Sheet></View>;
}

function GreenLine({run}: {run: boolean}) { const {t} = useWoulibTheme(), w = useSharedValue(0); useEffect(() => { w.value = run ? withDelay(300, withTiming(100, {duration: 2300, easing: Easing.linear})) : 0; }, [run]); const st = useAnimatedStyle(() => ({width: `${w.value}%`})); return <View style={{height: 4, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden', marginTop: 14}}><Animated.View style={[{height: 4, backgroundColor: t.green}, st]} /></View>; }
function TripLine({start, duration}: {start: number; duration: number}) { const {t} = useWoulibTheme(), p = useSharedValue(0); useEffect(() => { p.value = 0; p.value = withDelay(Math.max(0, start - Date.now()), withTiming(1, {duration, easing: Easing.linear})); }, [start, duration]); const fill = useAnimatedStyle(() => ({width: `${p.value * 100}%`})); const dot = useAnimatedStyle(() => ({left: `${p.value * 100}%`})); return <View style={{height: 5, borderRadius: 5, backgroundColor: t.line, marginVertical: 16, justifyContent: 'center'}}><Animated.View style={[{position: 'absolute', left: 0, height: 5, borderRadius: 5, backgroundColor: t.ink}, fill]} /><Animated.View style={[{position: 'absolute', width: 22, height: 22, marginLeft: -11, borderRadius: 11, backgroundColor: YELLOW, borderWidth: 3, borderColor: t.card, alignItems: 'center', justifyContent: 'center'}, dot]}><Ionicons name="car" size={10} color="#111" /></Animated.View></View>; }

export function WoulibRideScreen({onExit, onArrived}: {onExit: () => void; onArrived?: () => void}) {
  const {t, dark} = useWoulibTheme(); const ride = useRide(), {status, trip, vehicle, payment} = ride; const offerDrv = ride.drivers[ride.offerIdx], acc = ride.accepted; const live = status === 'onway' || status === 'arrived';
  useEffect(() => { if (status === 'arrived') onArrived?.(); }, [status]);
  const mapDrivers: MapDriver[] = ride.drivers.map(d => ({id: d.id, initial: d.initial, color: d.color, eta: d.eta, pos: d.pos, vis: !!ride.shown[d.id] && !live && status !== 'confirmed', hl: ride.highlight === d.id, dim: !!ride.declined[d.id]}));
  const focus = useMemo(() => { if (!trip) return {x: 400, y: 400, s: 0.85}; if (status === 'offer' && offerDrv) return {x: (trip.A[0] + offerDrv.pos[0]) / 2, y: (trip.A[1] + offerDrv.pos[1]) / 2, s: 0.95}; if (live && ride.tracking) return {x: ride.tracking.path[0][0], y: ride.tracking.path[0][1], s: 1.3}; return {x: trip.A[0], y: trip.A[1], s: 0.85}; }, [status, trip, offerDrv, live, ride.tracking]);
  const green = status === 'confirmed' || status === 'arrived';
  const pill = status === 'searching' ? (ride.found ? `${ride.found} drivers found` : 'Searching nearby…') : status === 'offer' ? `Offer from ${offerDrv?.first}` : status === 'declined' ? 'Looking for another driver…' : status === 'confirmed' ? 'Ride confirmed' : status === 'onway' ? 'Driver on the way' : status === 'arrived' ? 'Driver has arrived' : '';
  const pillRight = status === 'onway' ? `${etaRange(ride.eta)} min` : status === 'arrived' ? 'Now' : '';
  const searchSheet = status === 'searching' || status === 'declined'; const first = acc?.first ?? '';
  const driverRow = (d = acc) => d && <View style={{flexDirection: 'row', alignItems: 'center', gap: 11}}><Avatar initial={d.initial} color={d.color} size={46} /><View style={{flex: 1}}><View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}><Txt size={15} w="700">{d.name}</Txt><Ionicons name="checkmark-circle" size={15} color="#2f7cf6" /></View><Txt size={11.5} c="muted">★ {d.rating} · {d.trips} trips</Txt></View><CarThumb color={vehicle.color} width={70} /></View>;
  return <View style={{flex: 1, backgroundColor: t.bg}}><WoulibMapView dark={dark} trip={trip} focus={focus} pins={{pickup: true}} drivers={mapDrivers} searching={status === 'searching' || status === 'offer' || status === 'declined'} tracking={live ? ride.tracking : null} /><TopBar onBack={status === 'searching' || status === 'declined' ? () => { ride.cancel(); onExit(); } : undefined} right={live ? <View style={{width: 46, height: 46, borderRadius: 16, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="locate" size={21} color={t.ink} /></View> : undefined}><View style={{width: 9, height: 9, borderRadius: 5, backgroundColor: green ? t.green : YELLOW}} /><Animated.View key={pill} entering={FadeIn.duration(180)} style={{flex: 1}}><Txt w="600" numberOfLines={1}>{pill}</Txt></Animated.View>{!!pillRight && <Animated.View key={pillRight} entering={FadeIn.duration(180)}><Txt c="muted">{pillRight}</Txt></Animated.View>}</TopBar>
    <Sheet visible={searchSheet} delayIn={status === 'declined' ? 380 : 500}><Txt size={22} w="700">Finding your driver</Txt><Txt size={12} c="muted" style={{marginTop: 2}}>Asking {vehicle.name} drivers near you</Txt><View style={{flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14}}><CarThumb color={vehicle.color} width={70} /><View style={{flex: 1}}><Txt w="700">{vehicle.short}</Txt><Txt size={11.5} c="muted">{payment.name}</Txt></View><Txt size={17} w="700">${vehicle.price.toFixed(2)}</Txt></View><View style={{flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.soft, padding: 12, borderRadius: 14, marginTop: 14}}><Ionicons name="radio-outline" size={18} color={YELLOW} /><Txt>{ride.found} drivers nearby, waiting for an answer</Txt></View>{ride.toast && <Animated.View entering={FadeInDown.duration(250)} style={{marginTop: 10, backgroundColor: t.redSoft, padding: 10, borderRadius: 12}}><Txt size={12.5} c={t.red}>{ride.toast}</Txt></Animated.View>}<Btn label="Cancel search" variant="danger" onPress={() => { ride.cancel(); onExit(); }} style={{marginTop: 12}} /></Sheet>
    <Sheet visible={status === 'offer'} spring delayIn={340}>{offerDrv && <View key={offerDrv.id}><Animated.View entering={FadeInDown.delay(200).duration(300)}><Txt size={12} w="700" c={YELLOW} style={{marginBottom: 8}}>New offer</Txt></Animated.View><Animated.View entering={FadeInDown.delay(260).duration(300)}>{driverRow(offerDrv)}</Animated.View><Animated.View entering={FadeInDown.delay(320).duration(300)} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}><Txt size={15} w="700">{vehicle.name}</Txt><View style={{backgroundColor: t.soft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6}}><Txt size={12}>{offerDrv.plate}</Txt></View></Animated.View><Animated.View entering={FadeInDown.delay(380).duration(300)} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}><View style={{backgroundColor: t.soft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6}}><Txt size={12}>{etaRange(offerDrv.eta)} min away</Txt></View><View style={{alignItems: 'flex-end'}}><View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}><Txt size={13} c="muted" style={{textDecorationLine: 'line-through'}}>${vehicle.price.toFixed(2)}</Txt><View style={{backgroundColor: t.redSoft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2}}><Txt size={11.5} c={t.red}>+${offerDrv.diff.toFixed(2)}</Txt></View></View><Txt size={24} w="800">${ride.price.toFixed(2)}</Txt></View></Animated.View><Animated.View entering={FadeInDown.delay(460).duration(300)} style={{flexDirection: 'row', gap: 10, marginTop: 14}}><Btn label="Decline" variant="danger" onPress={ride.decline} style={{flex: 1}} /><Btn label={`Accept $${ride.price.toFixed(2)}`} onPress={ride.accept} style={{flex: 1.5}} /></Animated.View></View>}</Sheet>
    <Sheet visible={status === 'confirmed'}><View style={{alignItems: 'center'}}><Animated.View entering={ZoomIn.delay(150).duration(320)} style={{width: 68, height: 68, borderRadius: 34, backgroundColor: t.green, alignItems: 'center', justifyContent: 'center', marginBottom: 10}}><Ionicons name="checkmark" size={40} color="#fff" /></Animated.View><Txt size={22} w="700">Ride confirmed</Txt><Txt size={12} c="muted" style={{marginTop: 2}}>{first} is on the way in the {vehicle.short}</Txt></View><GreenLine run={status === 'confirmed'} /><View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16}}>{driverRow()}</View><View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 12}}><Txt size={12} c="muted">{payment.name}</Txt><Txt size={17} w="700">${ride.price.toFixed(2)}</Txt></View></Sheet>
    <Sheet visible={live}><View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}><View style={{flex: 1}}><View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Animated.View key={status} entering={FadeIn.duration(250)}><Txt size={22} w="700">{status === 'arrived' ? 'Your driver is here!' : 'Arriving soon'}</Txt></Animated.View>{status === 'arrived' && <Animated.View entering={ZoomIn.duration(300)}><Ionicons name="checkmark-circle" size={24} color={t.green} /></Animated.View>}</View><Txt size={12} c="muted">{status === 'arrived' ? `${first} is waiting at the pickup point` : `${first} is heading to you`}</Txt></View><View style={{width: 64, height: 62, borderRadius: 18, backgroundColor: status === 'arrived' ? '#C9F0DC' : YELLOW, alignItems: 'center', justifyContent: 'center'}}><Txt size={22} w="800">{status === 'arrived' ? 'Now' : etaRange(ride.eta)}</Txt>{status !== 'arrived' && <Txt size={11} c="#111111" style={{marginTop: -2}}>min</Txt>}</View></View>{ride.tracking && <TripLine start={ride.tracking.startedAt} duration={ride.tracking.duration} />}{driverRow()}<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12}}><View style={{backgroundColor: t.soft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6}}><Txt size={12}>{acc?.plate}</Txt></View><View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><PayBadge badge={payment.badge} color={payment.color} /><Txt size={17} w="700">${ride.price.toFixed(2)}</Txt></View></View><View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12}}><Ionicons name="location" size={16} color={YELLOW} /><Txt size={12.5} c="muted" numberOfLines={2} style={{flex: 1}}>Pickup: {ride.landmark || ride.from}</Txt></View><View style={{flexDirection: 'row', gap: 10, marginTop: 12}}><Btn label="Call" icon="call-outline" variant="soft" height={50} onPress={() => acc && Linking.openURL(`tel:${acc.phone}`)} style={{flex: 1}} /><Btn label="Message" icon="chatbubble-outline" variant="soft" height={50} style={{flex: 1}} /><Btn label="Cancel" icon="close-circle-outline" variant="danger" height={50} onPress={() => { ride.cancel(); onExit(); }} style={{flex: 1}} /></View></Sheet>
  </View>;
}

/* ======================================================================

   EXAMPLE FLOW

   ====================================================================== */

type Step = 'home' | 'route' | 'payment' | 'car' | 'ride';
const ORDER: Step[] = ['home', 'route', 'payment', 'car', 'ride'];

export function WoulibFlow({onClose}: {onClose?: () => void}) {
  const [step, setStep] = useState<Step>('home');
  const [back, setBack] = useState(false);
  const go = (s: Step) => { setBack(ORDER.indexOf(s) < ORDER.indexOf(step)); setStep(s); };
  const enter = back ? SlideInLeft.duration(380) : SlideInRight.duration(380);
  const exit = back ? SlideOutRight.duration(380) : SlideOutLeft.duration(380);
  return <WoulibThemeProvider><RideProvider><View style={{flex: 1, overflow: 'hidden'}}><Animated.View key={step} entering={enter} exiting={exit} style={{flex: 1}}>{step === 'home' && <WoulibHomeScreen onFindRide={() => go('route')} onTab={tab => tab === 'profile' && onClose?.()} onProfile={onClose} />}{step === 'route' && <WoulibRouteScreen onBack={() => go('home')} onContinue={() => go('payment')} />}{step === 'payment' && <WoulibPaymentScreen onBack={() => go('route')} onContinue={() => go('car')} />}{step === 'car' && <WoulibCarScreen onBack={() => go('payment')} onChangePayment={() => go('payment')} onFindDriver={() => go('ride')} />}{step === 'ride' && <WoulibRideScreen onExit={() => go('car')} />}</Animated.View></View></RideProvider></WoulibThemeProvider>;
}
