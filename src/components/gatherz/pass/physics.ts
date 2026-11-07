/** Gatherz hanging pass Verlet solver. Pure functions for Reanimated UI worklets. */
export const N = 16;
export const LINK = 22;
export const HO = 26;
export const G = 2200;
export const DT = 1 / 240;
export const DAMP = Math.pow(0.18, DT);
export const VMAX = 3.4;
export const PULL = 0.055;
export const CLAMP = 16;
export type Point = { x: number; y: number; px: number; py: number; inv: number };
export type Constraint = { a: number; b: number; length: number; stiffness: number };
export type Rig = { points: Point[]; links: Constraint[]; ax: number; ay: number; height: number };
export function P(x: number, y: number, inv = 1): Point {
  'worklet';
  return { x, y, px: x, py: y, inv };
}
export function build(ax: number, ay: number, height: number, segment = LINK): Rig {
  'worklet';
  const points: Point[] = [];
  const links: Constraint[] = [];
  for (let i = 0; i <= N; i++) {
    points.push(P(ax, ay + i * segment, i === 0 ? 0 : 1));
    if (i) links.push({ a: i - 1, b: i, length: segment, stiffness: 1 });
    if (i > 1) links.push({ a: i - 2, b: i, length: 2 * segment * 0.9925, stiffness: 0.2 });
  }
  const y = ay + N * segment;
  points.push(P(ax, y + segment, 0.25));
  points.push(P(ax + HO, y + segment + height - HO, 0.07));
  links.push({ a: N, b: N + 1, length: segment, stiffness: 1 });
  links.push({ a: N + 1, b: N + 2, length: height - HO, stiffness: 1 });
  return { points, links, ax, ay, height };
}
export function solve(rig: Rig): void {
  'worklet';
  const p = rig.points;
  for (let iteration = 0; iteration < 10; iteration++) {
    p[0].x = rig.ax; p[0].y = rig.ay;
    for (const l of rig.links) {
      const a = p[l.a], b = p[l.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(0.00001, Math.sqrt(dx * dx + dy * dy));
      const mass = a.inv + b.inv;
      if (mass <= 0) continue;
      const error = (dist - l.length) / dist * l.stiffness;
      const cx = dx * error / mass, cy = dy * error / mass;
      a.x += cx * a.inv; a.y += cy * a.inv;
      b.x -= cx * b.inv; b.y -= cy * b.inv;
    }
  }
}
export function step(rig: Rig, targetX?: number, targetY?: number, dragT = 1): void {
  'worklet';
  const p = rig.points;
  for (let i = 1; i < p.length; i++) {
    const v = p[i];
    const vx = Math.max(-VMAX, Math.min(VMAX, (v.x - v.px) * DAMP));
    const vy = Math.max(-VMAX, Math.min(VMAX, (v.y - v.py) * DAMP));
    v.px = v.x; v.py = v.y;
    v.x += vx; v.y += vy + G * DT * DT;
  }
  if (targetX !== undefined && targetY !== undefined) {
    const ring = p[N + 1], bottom = p[N + 2];
    const x = ring.x + (bottom.x - ring.x) * dragT;
    const y = ring.y + (bottom.y - ring.y) * dragT;
    bottom.x += Math.max(-CLAMP, Math.min(CLAMP, (targetX - x) * PULL));
    bottom.y += Math.max(-CLAMP, Math.min(CLAMP, (targetY - y) * PULL));
  }
  solve(rig);
}
export function smooth(previous: number, next: number, amount: number): number {
  'worklet';
  return previous + (next - previous) * amount;
}
export function nrm(x: number, y: number): [number, number] {
  'worklet';
  const d = Math.max(0.000001, Math.sqrt(x * x + y * y));
  return [x / d, y / d];
}
export function side(x: number, y: number): [number, number] {
  'worklet';
  const [nx, ny] = nrm(x, y);
  return [-ny, nx];
}
export function frame(rig: Rig): { x: number; y: number; angle: number } {
  'worklet';
  const r = rig.points[N + 1], b = rig.points[N + 2];
  return { x: r.x, y: r.y, angle: Math.atan2(b.x - r.x, b.y - r.y) };
}
export function twistDraw(angle: number, width: number): number {
  'worklet';
  return Math.max(0.6, Math.abs(Math.cos(angle)) * width);
}
