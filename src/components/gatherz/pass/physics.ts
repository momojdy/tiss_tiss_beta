/** Gatherz hanging pass: Verlet solver + twisting strap geometry. Ported 1:1 from the HTML reference. */
export const N = 16;
export const LINK = 22;
export const HO = 26;
export const G = 2200;
export const DT = 1 / 240;
export const DAMP = Math.pow(0.18, DT);
export const VMAX = 3.4;
export const PULL = 0.055;
export const CLAMP = 16;

export type Point = { x: number; y: number; px: number; py: number; im: number; fixed: boolean };
export type Link = { a: number; b: number; len: number; k: number };
export type Rig = { points: Point[]; links: Link[] };
export type Geo = { tp: string; quads: string[]; fills: string[]; el: string; er: string; sl: string; sr: string; textOpacity: number };

function mk(x: number, y: number, im: number, fixed: boolean): Point {
  'worklet';
  return { x, y, px: x, py: y, im, fixed };
}

export function build(ax: number, ay: number, L: number, H: number): Rig {
  'worklet';
  const seg = L / N;
  const points: Point[] = [];
  const links: Link[] = [];
  for (let i = 0; i <= N; i++) points.push(mk(ax, ay + i * seg, i === 0 ? 0 : 1, i === 0));
  const sy = points[N].y;
  points.push(mk(ax, sy + LINK, 0.25, false));
  points.push(mk(ax + 26, sy + LINK + H - HO, 0.07, false));
  for (let i = 0; i < N; i++) links.push({ a: i, b: i + 1, len: seg, k: 1 });
  links.push({ a: N, b: N + 1, len: LINK, k: 1 });
  links.push({ a: N + 1, b: N + 2, len: H - HO, k: 1 });
  for (let i = 0; i < N - 1; i++) links.push({ a: i, b: i + 2, len: seg * 1.985, k: 0.2 });
  return { points, links };
}

function solveLink(p: Point[], l: Link) {
  'worklet';
  const a = p[l.a], b = p[l.b];
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
  const diff = ((d - l.len) / d) * l.k;
  const w = a.im + b.im;
  if (!w) return;
  const ca = a.im / w, cb = b.im / w;
  a.x += dx * diff * ca; a.y += dy * diff * ca;
  b.x -= dx * diff * cb; b.y -= dy * diff * cb;
}

export function step(rig: Rig, drag: boolean, tx: number, ty: number, t: number): void {
  'worklet';
  const p = rig.points;
  for (let i = 0; i < p.length; i++) {
    const q = p[i];
    if (q.fixed) continue;
    let vx = (q.x - q.px) * DAMP, vy = (q.y - q.py) * DAMP;
    const vm = Math.sqrt(vx * vx + vy * vy);
    if (vm > VMAX) { vx *= VMAX / vm; vy *= VMAX / vm; }
    q.px = q.x; q.py = q.y;
    q.x += vx; q.y += vy + G * DT * DT;
  }
  if (drag) {
    const R = p[N + 1], B = p[N + 2];
    const gx = R.x + (B.x - R.x) * t, gy = R.y + (B.y - R.y) * t;
    let dx = tx - gx, dy = ty - gy;
    const l = Math.sqrt(dx * dx + dy * dy);
    if (l > CLAMP) { dx *= CLAMP / l; dy *= CLAMP / l; }
    R.x += dx * (1 - t) * PULL; R.y += dy * (1 - t) * PULL;
    B.x += dx * t * PULL; B.y += dy * t * PULL;
  }
  for (let k = 0; k < 10; k++) for (let i = 0; i < rig.links.length; i++) solveLink(p, rig.links[i]);
}

export function angleOf(rig: Rig): number {
  'worklet';
  const R = rig.points[N + 1], B = rig.points[N + 2];
  return Math.atan2(B.x - R.x, B.y - R.y);
}

type Pt = { x: number; y: number };
function smoothPath(a: Pt[]): string {
  'worklet';
  const n = a.length - 1;
  let d = 'M' + a[0].x.toFixed(1) + ' ' + a[0].y.toFixed(1);
  for (let i = 1; i < n; i++) {
    const p = a[i], q = a[i + 1];
    d += ' Q' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ' + ((p.x + q.x) / 2).toFixed(1) + ' ' + ((p.y + q.y) / 2).toFixed(1);
  }
  return d + ' L' + a[n].x.toFixed(1) + ' ' + a[n].y.toFixed(1);
}
function normal(pts: Point[], i: number): [number, number] {
  'worklet';
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
  const tx = b.x - a.x, y = b.y - a.y;
  const l = Math.sqrt(tx * tx + y * y) || 1;
  return [-y / l, tx / l];
}
function sideOf(pts: Point[], ws: number[], k: number, sg: number): Pt[] {
  'worklet';
  const out: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const n = normal(pts, i);
    out.push({ x: pts[i].x + n[0] * ws[i] * k * sg, y: pts[i].y + n[1] * ws[i] * k * sg });
  }
  return out;
}
function mix(a: number[], b: number[], t: number): string {
  'worklet';
  return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
}

export function strapGeometry(pts: Point[], phi: number, dark: boolean): Geo {
  'worklet';
  const F = dark ? [20, 16, 42] : [14, 11, 29];
  const Bk = dark ? [40, 32, 74] : [40, 36, 62];
  const cs: number[] = [], ws: number[] = [];
  for (let i = 0; i <= N; i++) {
    const f = (phi * (i / N) * Math.PI) / 180;
    cs[i] = Math.cos(f);
    ws[i] = Math.max(1.4, 11.5 * Math.abs(cs[i]));
  }
  const Lp = sideOf(pts, ws, 1, 1), Rp = sideOf(pts, ws, 1, -1);
  const quads: string[] = [], fills: string[] = [];
  for (let i = 0; i < N; i++) {
    const c = (cs[i] + cs[i + 1]) / 2;
    fills.push(mix(c >= 0 ? F : Bk, [139, 124, 199], (1 - Math.abs(c)) * 0.55));
    quads.push('M' + Lp[i].x.toFixed(1) + ' ' + Lp[i].y.toFixed(1) + 'L' + Lp[i + 1].x.toFixed(1) + ' ' + Lp[i + 1].y.toFixed(1) +
      'L' + Rp[i + 1].x.toFixed(1) + ' ' + Rp[i + 1].y.toFixed(1) + 'L' + Rp[i].x.toFixed(1) + ' ' + Rp[i].y.toFixed(1) + 'Z');
  }
  return {
    tp: smoothPath(pts.slice(0, N + 1)),
    quads, fills,
    el: smoothPath(Lp), er: smoothPath(Rp),
    sl: smoothPath(sideOf(pts, ws, 0.72, 1)), sr: smoothPath(sideOf(pts, ws, 0.72, -1)),
    textOpacity: Math.max(0, cs[Math.round(N * 0.5)] - 0.25) * 1.2,
  };
}
