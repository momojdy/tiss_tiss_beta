import React, {createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {InteractionManager, KeyboardAvoidingView, LayoutChangeEvent, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import Animated, {Easing, FadeIn, FadeOut, SharedValue, useAnimatedProps, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Ellipse, G, Path, Polygon, Polyline} from 'react-native-svg';
import MapView, {Circle as GCircle, Marker as GMarker, Polyline as GPolyline, UrlTile} from 'react-native-maps';
import {Ionicons} from '@expo/vector-icons';
import {
  GEO,
  LatLng,
  MAP_TOP,
  Pt,
  RideProvider,
  RideStatus,
  Tracking,
  Trip,
  WoulibOfferedRide,
  WoulibRideService,
  WoulibThemeProvider,
  WoulibUpcomingRide,
  YELLOW,
  along,
  clamp,
  ease,
  fare,
  haversine,
  makeDrivers,
  rng,
  smooth,
  styles,
  useRide,
  useWoulibTheme,
} from './WoulibShared';
import {WoulibHomeScreen} from './WoulibHomeScreen';
import {WoulibOfferScreen} from './WoulibOfferScreen';
import {WoulibRouteScreen} from './WoulibRouteScreen';
import {WoulibCarScreen} from './WoulibCarScreen';
import {WoulibSearchingScreen} from './WoulibSearchingScreen';
import {WoulibOfferDriverScreen} from './WoulibOfferDriverScreen';
import {WoulibConfirmedScreen} from './WoulibConfirmedScreen';
import {WoulibOnWayScreen} from './WoulibOnWayScreen';
import {WoulibArrivedScreen} from './WoulibArrivedScreen';
import {WoulibRidingScreen} from './WoulibRidingScreen';
import {WoulibCompleteScreen} from './WoulibCompleteScreen';

export * from './WoulibShared';

const NB = 10, RW = 15, LOT = 70, LANE = 7.5, STOP = 26, LO = -200, LEN = 1400;
const SW = 2500, SH = 1620, OX = 1250, OY = 360;
export const CENTER = 500;
const T0 = Date.now(), CYCLE = 12, MOVE_T = 4.2;
const TOP_SAFE = MAP_TOP + 24;
const TRAFFIC_DENSITY = 2;
const PED_COUNT = 60;
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

function box(x0: number, y0: number, x1: number, y1: number, z0: number, h: number, pal: string | string[], windows: boolean, d: Dk, dark = false, R = rng(1)): Shape[] {
  const a = Array.isArray(pal) ? pal : [pal, pal, pal];
  const [A, B, C] = a;
  const top = pd([P(x0, y0, z0 + h), P(x1, y0, z0 + h), P(x1, y1, z0 + h), P(x0, y1, z0 + h)]);
  const front = pd([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z0 + h), P(x0, y1, z0 + h)]);
  const side = pd([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z0 + h), P(x1, y0, z0 + h)]);
  const out: Shape[] = [{k: 'd', d: front, f: d(B)}, {k: 'd', d: side, f: d(C)}, {k: 'd', d: top, f: d(A)}];
  if (windows) {
    let ww = '';
    for (let i = 0; i < 4; i++) {
      const q = (i + 1) / 5;
      const y = y0 + (y1 - y0) * q;
      const x = x0 + (x1 - x0) * q;
      const z = z0 + 5 + R() * Math.max(4, h - 12);
      ww += pd([P(x0 + 1.5, y, z), P(x0 + 1.5, y + 3.2, z), P(x0 + 1.5, y + 3.2, z + 3.4), P(x0 + 1.5, y, z + 3.4)]);
      ww += pd([P(x, y0 + 1.5, z), P(x + 3.2, y0 + 1.5, z), P(x + 3.2, y0 + 1.5, z + 3.4), P(x, y0 + 1.5, z + 3.4)]);
    }
    out.push({k: 'd', d: ww, f: dark ? '#ffe08a' : '#6f93bb', o: 0.85});
  }
  return out;
}

const PAL = ['#e5c07b', '#d8a85f', '#c7d7df', '#d6c2a8', '#b7c9b2', '#d9b5b5', '#b9b9c9'];
function roofBits(x0: number, y0: number, x1: number, y1: number, h: number, R: () => number, d: Dk): Shape[] {
  const out: Shape[] = [];
  if (R() < 0.6) out.push({k: 'd', d: pd([P(x0 + 3, y0 + 3, h + 0.5), P(x1 - 3, y0 + 3, h + 0.5), P(x1 - 3, y1 - 3, h + 0.5), P(x0 + 3, y1 - 3, h + 0.5)]), f: d('#f4f4f4'), o: 0.3});
  return out;
}
type TreeKind = 'palm' | 'round' | 'bloom' | 'pine';
function tree(x: number, y: number, k: TreeKind, d: Dk, R: () => number): Shape[] {
  const out: Shape[] = [];
  const [px, py] = P(x, y, 1);
  out.push({k: 'c', x: px, y: py, r: 4, f: d('#4e3a2d'), o: 0.9});
  if (k === 'palm') {
    out.push({k: 'c', x: px, y: py - 12, r: 7, f: d('#3f8d54')}, {k: 'e', x: px, y: py - 18, rx: 9, ry: 4, f: d('#5ea66a')});
  } else if (k === 'pine') {
    out.push({k: 'c', x: px, y: py - 10, r: 9, f: d('#3d8b52')}, {k: 'c', x: px, y: py - 17, r: 7, f: d('#4d9b5b')});
  } else {
    const c = k === 'bloom' ? ['#ff5f8f', '#ffb02e', '#ffffff'][Math.floor(R() * 3)] : '#4c9b55';
    out.push({k: 'c', x: px, y: py - 12, r: 10, f: d(c)}, {k: 'c', x: px + 6, y: py - 10, r: 7, f: d(c)}, {k: 'c', x: px - 6, y: py - 10, r: 7, f: d(c)});
  }
  return out;
}
function gable(x0: number, y0: number, x1: number, y1: number, h: number, d: Dk): Shape[] { const m = (x0 + x1) / 2; return [{k: 'p', pts: pts([P(x0, y1, h), P(x1, y1, h), P(m, y1, h + 12)]), f: d('#b86f54')}, {k: 'd', d: pd([P(x0, y1, h), P(x1, y1, h), P(x1, y1, h + 2), P(x0, y1, h + 2)]), f: d('#e6d7c5')}]; }
function cone(x: number, y: number, r: number, z: number, h: number, f: string, d: Dk): Shape[] { const [a, b] = P(x, y, z + h); return [{k: 'c', x: a, y: b, r, f: d(f)}, {k: 'c', x: a, y: b + h * 0.15, r: r * 0.65, f: d('#6d4c3b')}]; }
function cylinder(x: number, y: number, r: number, z: number, h: number, pal: string, d: Dk): Shape[] { const [a, b] = P(x, y, z); return [{k: 'e', x: a, y: b, rx: r, ry: r * 0.5, f: d(pal)}, {k: 'd', d: `M${f1(a - r)} ${f1(b)}A${r} ${r * 0.5} 0 0 0 ${f1(a + r)} ${f1(b)}`, f: d(pal)}, {k: 'e', x: a, y: b - h, rx: r, ry: r * 0.5, f: d(pal)}]; }
function dome(x: number, y: number, r: number, z: number, h: number, pal: string[], d: Dk): Shape[] { const [a, b] = P(x, y, z); return [{k: 'e', x: a, y: b - h, rx: r, ry: r * 0.45, f: d(pal[0])}, {k: 'e', x: a, y: b - h - 3, rx: r * 0.65, ry: r * 0.3, f: d(pal[1])}]; }
function ironMarket(x0: number, y0: number, x1: number, y1: number, d: Dk): Shape[] { return box(x0, y0, x1, y1, 1, 30, ['#d7d0bf', '#bda98b', '#8f7f68'], true, d).concat([{k: 'd', d: pd([P(x0 + 2, y0 + 2, 31), P(x1 - 2, y0 + 2, 31), P(x1 - 2, y1 - 2, 31), P(x0 + 2, y1 - 2, 31)]), f: d(YELLOW), o: 0.7}]); }
function bazaar(x0: number, y0: number, x1: number, y1: number, d: Dk): Shape[] { const out = box(x0, y0, x1, y1, 1, 24, ['#d6c1a8', '#b78f6c', '#8f7258'], true, d); for (let x = x0 + 8; x < x1 - 5; x += 10) out.push(...cone(x, y1 + 2, 3.5, 1, 8, ['#e5484d', '#3d6db5', YELLOW][Math.floor((x - x0) / 10) % 3], d)); return out; }
function houses(x0: number, y0: number, x1: number, y1: number, d: Dk, dark: boolean, R: () => number): Shape[] { const out: Shape[] = []; const n = 3; const w = (x1 - x0 - 8) / n; for (let i = 0; i < n; i++) { const a = x0 + 4 + i * w, b = a + w - 4, h = 16 + R() * 10; out.push(...box(a, y0 + 6, b, y1 - 8, 1, h, ['#e7d2b4', '#c69d7a', '#a9795a'], false, d, dark, R), ...gable(a, y0 + 6, b, y1 - 8, h, d)); } return out; }

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
  cells.sort((a, b) => a[0] + a[1] - b[0] - b[1] || a[0] - b[0]);

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

    if (inner) {
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

interface CarSpec { axis: 0 | 1; dir: 1 | -1; lane: number; start: number; delay: number; kind: 'car' | 'bus'; color: string }
interface PedSpec { axis: 0 | 1; line: number; lo: number; hi: number; speed: number; off: number; shirt: string; skin: string }
const CAR_COL = ['#eceff4', '#2b3140', '#c0463d', '#3d6db5', '#8a93a3', YELLOW, '#2f8f6b', '#f2f2f2', '#6c4a9e'];
const BUS_COL = ['#d9433f', '#2d7bd6', YELLOW, '#1f9a63'];
const SHIRT = ['#e5484d', '#3d6db5', YELLOW, '#2f8f6b', '#8a5cc2', '#ff8a3d', '#ffffff', '#2b3140'];
const SKIN = ['#f1c9a5', '#e0ac82', '#c68a5e', '#8d5a3b', '#f5d7b8'];

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
const LAMP_COL = ['#ff4a4a', '#ffb800', '#38d46f'];
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

function offsetPath(p: Pt[], off: number): Pt[] {
  return p.map((a, i) => {
    const b = p[Math.max(0, i - 1)], c = p[Math.min(p.length - 1, i + 1)], dx = c[0] - b[0], dy = c[1] - b[1], l = Math.hypot(dx, dy) || 1;
    return [a[0] - (dy / l) * off, a[1] + (dx / l) * off] as Pt;
  });
}
function fadeSet(blocks: Block[], x: number, y: number) {
  const fade: Record<string, boolean> = {}, [px, py] = P(x, y);
  for (const b of blocks) {
    if (!b.hh || b.x0 + b.y0 + LOT <= x + y) continue;
    if (px > (b.x0 - b.y0 - LOT) * 0.866 - 12 && px < (b.x0 + LOT - b.y0) * 0.866 + 12 && py > (b.x0 + b.y0) * 0.5 - b.hh - 12 && py < (b.x0 + b.y0 + 2 * LOT) * 0.5 + 4) fade[b.id] = true;
  }
  return fade;
}

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
    const midY = (TOP_SAFE + vh.value - ch.value) / 2;
    const pn = clampPan(panX.value, panY.value, s, bx, by);
    return {tx: vw.value / 2 - s * bx + pn[0], ty: midY - s * by + pn[1], s, bx, by};
  });
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

const LIVE_OSM = Platform.OS !== 'ios';
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';

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
const lerpAngle = (a: number, b: number, k: number) => (a + ((((b - a) % 360) + 540) % 360 - 180) * k + 360) % 360;
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
const headingAt = (p: Poly, d: number) => {
  const a = atDist(p, d), b = atDist(p, d + 14);
  return meters(a.ll, b.ll) > 3 ? bearing(a.ll, b.ll) : a.h;
};

function useBrief(ms = 700, dep: unknown = 0) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(true); const id = setTimeout(() => setOn(false), ms); return () => clearTimeout(id); }, [ms, dep]);
  return on;
}

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

  useEffect(() => {
    let alive = true;
    probeTiles().then(ok => { if (alive) { setReady(ok); onReady(ok); } });
    return () => { alive = false; };
  }, []);

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

  useEffect(() => {
    if (!ready || tracking) return;
    const m = ref.current; if (!m) return;
    if (!trip) m.animateCamera({center: offsetLL(center, -(cardH / 2) * 5.3, 0), zoom: 14.8}, {duration: 700});
    else if (searching) m.animateCamera({center: trip.fromLL, zoom: 15.4}, {duration: 700});
    else m.fitToCoordinates(route.length ? route : [trip.fromLL, trip.toLL], {edgePadding: {top: TOP_SAFE + 40, bottom: cardH + 50, left: 50, right: 50}, animated: true});
  }, [ready, route, searching, !!tracking, cardH, !!trip, center.latitude, center.longitude]);

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

  useEffect(() => {
    if (!tracking) { trkRoute.current = null; setTrk(null); return; }
    let alive = true;
    const start = tracking.kind === 'pickup' && cur.current[tracking.driverId] ? cur.current[tracking.driverId] : tracking.fromLL;
    trkRoute.current = null;
    routeLL(start, tracking.toLL).then(r => { if (alive) trkRoute.current = mkPoly(r.length > 1 ? r : [start, tracking.toLL]); });
    return () => { alive = false; };
  }, [tracking]);

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

const UPCOMING: WoulibUpcomingRide[] = [
  {id: 'u1', to: 'Airport', from: 'Business District', when: 'Today · 6:30 PM', driver: 'Sofia Alvarez', status: 'Confirmed'},
  {id: 'u2', to: 'Downtown', from: 'Current location', when: 'Tomorrow · 8:15 AM', driver: 'Daniel Okafor', status: 'Confirmed'},
  {id: 'u3', to: 'Shopping District', from: 'City Center', when: 'Sat · 2:00 PM', driver: 'Priya Nair', status: 'Pending'},
];

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

const FRAC: Record<Exclude<RideStatus, 'idle'>, number> = {searching: 0.44, offer: 0.5, declined: 0.42, confirmed: 0.4, onway: 0.4, arrived: 0.4, riding: 0.36, complete: 0.54};

function FlowInner({onHome}: {onHome: () => void}) {
  const ride = useRide();
  const {t, dark, toggle} = useWoulibTheme();
  const {height} = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(false); }, [ride.status, !!ride.trip]);

  const frac = ride.status === 'idle' ? (ride.trip ? 0.64 : 0.5) : FRAC[ride.status];
  const cardH = collapsed ? 150 : Math.round(clamp(height * frac, 280, height * 0.72));
  const focus = useFocus(ride.trip, cardH);
  const trip = ride.trip, st = ride.status;

  const mapDrivers: MapDriver[] = useMemo(() => ride.drivers.map(d => ({
    id: d.id, initial: d.initial, color: d.color, eta: d.eta, pos: d.pos, ll: d.ll,
    vis: (!!ride.shown[d.id] && (st === 'searching' || st === 'offer' || st === 'declined')) || (ride.accepted?.id === d.id && st === 'confirmed'),
    hl: ride.highlight === d.id, dim: !!ride.declined[d.id],
  })), [ride.drivers, ride.shown, ride.highlight, ride.declined, ride.accepted, st]);

  let body: React.ReactNode = null;
  if (st === 'idle' && !trip) body = <WoulibRouteScreen />;
  else if (st === 'idle' && trip) body = <WoulibCarScreen />;
  else if (st === 'searching') body = <WoulibSearchingScreen />;
  else if ((st === 'offer' || st === 'declined') && ride.drivers[ride.offerIdx]) body = <WoulibOfferDriverScreen />;
  else if (st === 'confirmed' && ride.accepted) body = <WoulibConfirmedScreen />;
  else if (st === 'onway' && ride.accepted) body = <WoulibOnWayScreen />;
  else if (st === 'arrived' && ride.accepted) body = <WoulibArrivedScreen />;
  else if (st === 'riding' && trip) body = <WoulibRidingScreen />;
  else if (st === 'complete' && trip) body = <WoulibCompleteScreen />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1, backgroundColor: t.bg}}>
      <WoulibMapView
        dark={dark} trip={trip} focus={focus} cardH={cardH}
        showRoute={!!trip && !ride.tracking} pins={{pickup: !!trip, dest: !!trip}}
        drivers={mapDrivers} searching={st === 'searching' || st === 'offer' || st === 'declined'} tracking={ride.tracking}
      />
      <View style={[styles.topBar, {top: MAP_TOP}]}>
        <Pressable onPress={toggle} style={[styles.circle, {backgroundColor: t.card, marginRight: 8}]}><Ionicons name={dark ? 'sunny' : 'moon'} size={18} color={t.ink} /></Pressable>
        {st === 'idle' && <Pressable onPress={trip ? ride.clearTrip : onHome} style={[styles.circle, {backgroundColor: t.card}]}><Ionicons name="arrow-back" size={19} color={t.ink} /></Pressable>}
      </View>
      {!!ride.toast && <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.toast, {top: MAP_TOP + 52}]}><Text style={{color: '#fff', fontWeight: '600'}}>{ride.toast}</Text></Animated.View>}
      <Card height={cardH} onToggle={() => setCollapsed(c => !c)}>{body}</Card>
    </KeyboardAvoidingView>
  );
}

function WoulibRoot({onOfferRide, onPublishRide, onExit}: {onOfferRide?: () => void; onPublishRide?: (r: WoulibOfferedRide) => void; onExit?: () => void}) {
  const ride = useRide();
  const {dark} = useWoulibTheme();
  const [screen, setScreen] = useState<'home' | 'find' | 'offer'>('home');
  const [findLoading, setFindLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<WoulibUpcomingRide[]>(UPCOMING);

  const goHome = useCallback(() => { ride.finish(); setScreen('home'); }, [ride]);

  useEffect(() => {
    if (screen !== 'home') return;
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
  }, [dark, screen]);

  if (findLoading) return <View style={{flex: 1, backgroundColor: '#FBFAF7', alignItems: 'center', justifyContent: 'center'}}><Text style={{fontSize: 28, fontWeight: '900', color: '#111'}}>Woulib</Text><Ionicons name='location-sharp' size={34} color={YELLOW} style={{marginTop: 4}} /><Text style={{marginTop: 18, fontSize: 14, fontWeight: '600', color: '#6D6A62'}}>Loading Find a Ride…</Text></View>;
  if (screen === 'find') return <FlowInner onHome={goHome} />;
  if (screen === 'offer') {
    return (
      <WoulibOfferScreen
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
    <WoulibHomeScreen
      upcoming={upcoming}
      onExit={onExit}
      onOffer={() => { onOfferRide?.(); setScreen('offer'); }}
      onFind={dest => { ride.setMode('ride'); if (dest) ride.setDest(dest); setScreen('find'); }}
    />
  );
}

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