import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { runOnJS, useAnimatedProps, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { formatWhen, qrPayload } from '../../lib/gatherz/rules';
import { angleOf, build, DT, glyphLayout, HO, LINK, N, step, strapGeometry } from './pass/physics';
import type { Admission, GatherzEvent } from '../../types/gatherz';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const STRAP_TEXT = 'GATHERZ · BY WANTISS · GATHERZ · BY WANTISS';
const GW = 10, GH = 8;
// Character-specific widths keep the I and S in WANTISS visually joined.
const WID: Record<string, number> = { G: 0.72, A: 0.70, T: 0.60, H: 0.74, E: 0.60, R: 0.66, Z: 0.62, B: 0.66, Y: 0.64, W: 0.95, N: 0.74, I: 0.30, S: 0.60, '·': 0.28, ' ': 0.26 };
const STRAP_FS = 6.5, STRAP_LS = 1.6;
function buildOffs(L: number): number[] {
  const chars = Array.from(STRAP_TEXT);
  let o = 0;
  const raw = chars.map(ch => { const at = o; o += (WID[ch] ?? 0.62) * STRAP_FS + STRAP_LS; return at; });
  // Fit the first two letters of the repeated phrase before the bottom clip.
  const start = 11, repeatGA = 24;
  const endGA = raw[repeatGA] + (WID.A ?? 0.70) * STRAP_FS;
  const scale = Math.max(0.8, Math.min(1.25, (L - 11 - start) / endGA));
  return raw.map(v => start + v * scale);
}
const BLUR_OK = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 31);
function Glyph({ i, ch, glyphs, color, family }: { i: number; ch: string; glyphs: Animated.SharedValue<number[]>; color: string; family: string }) {
  const st = useAnimatedStyle(() => {
    const g = glyphs.value, x = g[i * 4], y = g[i * 4 + 1], a = g[i * 4 + 2], vis = g[i * 4 + 3];
    const vx = -GW / 2, vy = 6.3 - GH / 2, c = Math.cos(a), sn = Math.sin(a);
    return { opacity: vis, transform: [{ translateX: x - GW / 2 - (vx * c - vy * sn) }, { translateY: y - GH / 2 - (vx * sn + vy * c) }, { rotate: a + 'rad' }] };
  });
  return <Animated.Text style={[{ position: 'absolute', left: 0, top: 0, width: GW, height: GH, fontSize: STRAP_FS, lineHeight: GH, fontFamily: family, color, includeFontPadding: false }, st]} numberOfLines={1} allowFontScaling={false}>{ch}</Animated.Text>;
}

const FONT = { reg: fonts.regular, med: fonts.semibold, bold: fonts.bold };

const TIER = {
  general:   { label: 'General',   cap: 'Standard Experience',  perk: 'Standard Entry · Main Floor',        f: ['#6B47AB', '#3A2670', '#1A1233'], acc: '#C9C2E3', glow: '201,194,227', ga: 0.38, border: 'rgba(201,194,227,.22)', brushed: false },
  vip:       { label: 'VIP',       cap: 'Exclusive Experience', perk: 'Priority Entry · Exclusive Lounge',  f: ['#1B1724', '#0C0A14', '#050309'], acc: '#8B7CC7', glow: '139,124,199', ga: 0.34, border: 'rgba(201,194,227,.22)', brushed: false },
  backstage: { label: 'Backstage', cap: 'Artist Access',        perk: 'All Access · Artist Meet & Greet',   f: ['#2B2635', '#0E0C16', '#050309'], acc: '#D8D0F2', glow: '216,208,242', ga: 0.30, border: 'rgba(216,208,242,.5)',  brushed: true },
} as const;

function cssLine(angle: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  return { x1: w / 2 - (dx * len) / 2, y1: h / 2 - (dy * len) / 2, x2: w / 2 + (dx * len) / 2, y2: h / 2 + (dy * len) / 2 };
}
const clamp = (v: number, a: number, b: number) => { 'worklet'; return Math.max(a, Math.min(b, v)); };

function Edge({ z0, w, h, flipA, ty }: { z0: number; w: number; h: number; flipA: Animated.SharedValue<number>; ty: Animated.SharedValue<number> }) {
  const s = useAnimatedStyle(() => {
    const th = flipA.value + ty.value;
    return { transform: [{ perspective: 1200 }, { translateX: -z0 * Math.sin((th * Math.PI) / 180) }, { rotateY: th + 'deg' }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: 24, backgroundColor: '#1B1530', borderWidth: 1, borderColor: '#8B7CC7' }, s]} />;
}

function StrapQuad({ i, geo }: { i: number; geo: Animated.SharedValue<any> }) {
  const p = useAnimatedProps(() => ({ d: geo.value.quads[i], fill: geo.value.fills[i], stroke: geo.value.fills[i] }) as any);
  return <AnimatedPath animatedProps={p} strokeWidth={0.9} strokeLinejoin="round" />;
}

function Hole() {
  return (
    <View style={{ position: 'absolute', left: '50%', top: 17, width: 18, height: 18, marginLeft: -9, borderRadius: 9, backgroundColor: 'rgba(201,194,227,.25)', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#050309' }} />
    </View>
  );
}

export default function GatherzPassV2({ admission, event, viewportHeight }: { admission: Admission; event: GatherzEvent; viewportHeight?: number }) {
  const t = useGatherzTheme();
  const dark = t.name === 'dark';
  const { width: vw, height: winH } = useWindowDimensions();
  const vh = viewportHeight ?? winH;
  const tier = TIER[admission.tier as keyof typeof TIER];

  const Lr = Math.max(80, Math.min(vh * 0.15, 130));
  let H = Math.min(vh - Lr - LINK - 175, Math.min(300, vw * 0.74) * 1.5);
  H = Math.max(H, 300);
  const W = H / 1.5;
  const AX = vw / 2, AY = 34;
  // The ribbon is fixed inside the mount; the metal housing occludes the concealed segment.
  const inner = W - 44;

  const th = dark
    ? { rail: '#3A3A52', se: '#5A3B8C', sg: '#C9C2E3', st: '#8B7CC7', sh: '#000000', dockbg: '#2A1E4Dcc', dtx: '#C9C2E3' }
    : { rail: '#C9C2E3', se: '#3A3A52', sg: '#8B7CC7', st: '#C9C2E3', sh: '#2A1E4D', dockbg: '#FFFFFFcc', dtx: '#2A1E4D' };

  const rig = useSharedValue(build(AX, AY, Lr, H));
  const flipA = useSharedValue(0), flipT = useSharedValue(0), ty = useSharedValue(0), pth = useSharedValue(0);
  const acc = useSharedValue(0), elapsed = useSharedValue(0), nudged = useSharedValue(false), swayReq = useSharedValue(0);
  const dragOn = useSharedValue(false), dragX = useSharedValue(0), dragY = useSharedValue(0), dragT = useSharedValue(1), moved = useSharedValue(0);
  const mx = useSharedValue(50), my = useSharedValue(45);
  const hintOp = useSharedValue(0.6);

  useEffect(() => { rig.value = build(AX, AY, Lr, H); }, [AX, Lr, H]);

  const flippedRef = useRef(false);
  const doFlip = () => { flippedRef.current = !flippedRef.current; flipT.value = flippedRef.current ? 180 : 0; };
  const doSway = () => { swayReq.value = (Math.random() < 0.5 ? -1 : 1) * 3.2; hintOp.value = withTiming(0, { duration: 600 }); };

  useFrameCallback(({ timeSincePreviousFrame }) => {
    'worklet';
    const dt = Math.min(0.05, (timeSincePreviousFrame ?? 16.67) / 1000);
    elapsed.value += dt;
    const r = rig.value;
    if (!nudged.value && elapsed.value > 0.3) { r.points[N + 2].px -= 2.5; nudged.value = true; }
    if (swayReq.value !== 0) { r.points[N + 2].px -= swayReq.value; swayReq.value = 0; }
    let a = acc.value + dt, n = 0;
    while (a >= DT && n < 16) { step(r, dragOn.value, dragX.value, dragY.value, dragT.value); a -= DT; n++; }
    acc.value = a;
    flipA.value += (flipT.value - flipA.value) * (1 - Math.exp(-dt * 5));
    if (Math.abs(flipT.value - flipA.value) < 0.05) flipA.value = flipT.value;
    const thN = angleOf(r);
    const om = dt > 0 ? (thN - pth.value) / dt : 0;
    pth.value = thN;
    ty.value += (clamp(-om * 4, -11, 11) - ty.value) * 0.08;
    rig.value = { points: r.points.map(p => ({ ...p })), links: r.links };
  });

  const geo = useDerivedValue(() => strapGeometry(rig.value.points, flipA.value + ty.value * 2, dark));

  const elProps = useAnimatedProps(() => ({ d: geo.value.el }) as any);
  const erProps = useAnimatedProps(() => ({ d: geo.value.er }) as any);
  const slProps = useAnimatedProps(() => ({ d: geo.value.sl }) as any);
  const srProps = useAnimatedProps(() => ({ d: geo.value.sr }) as any);
  const glyphOffs = useMemo(() => buildOffs(Lr), [Lr]);
  const glyphs = useDerivedValue(() => glyphLayout(rig.value.points, glyphOffs, geo.value.textOpacity));
  const ringProps = useAnimatedProps(() => { const R = rig.value.points[N + 1]; return { cx: R.x, cy: R.y } as any; });

  const cardStyle = useAnimatedStyle(() => {
    const R = rig.value.points[N + 1];
    return { transform: [{ translateX: R.x - W / 2 }, { translateY: R.y - H / 2 }, { rotate: -angleOf(rig.value) + 'rad' }, { translateY: H / 2 - HO }] };
  });
  const shadowStyle = useAnimatedStyle(() => {
    const R = rig.value.points[N + 1];
    return { transform: [{ translateX: R.x + 12 + (R.x - AX) * 0.05 - W / 2 }, { translateY: R.y + 38 - H / 2 }, { rotate: -angleOf(rig.value) + 'rad' }, { translateY: H / 2 - HO }] };
  });
  const frontStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: flipA.value + ty.value + 'deg' }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: flipA.value + 180 + ty.value + 'deg' }] }));

  const glowR = Math.round(0.5 * Math.hypot(W * 0.5, H * 0.55));
  const glowFront = useAnimatedStyle(() => ({ transform: [{ translateX: (mx.value / 100) * W - glowR }, { translateY: (my.value / 100) * H - glowR }] }));
  const glowBack = useAnimatedStyle(() => ({ transform: [{ translateX: ((100 - mx.value) / 100) * W - glowR }, { translateY: (my.value / 100) * H - glowR }] }));
  const sheenFront = useAnimatedStyle(() => { const sx = 50 + ((angleOf(rig.value) * 180) / Math.PI) * 3; return { transform: [{ translateX: -1.8 * W * (sx / 100) }] }; });
  const sheenBack = useAnimatedStyle(() => { const sx = 100 - (50 + ((angleOf(rig.value) * 180) / Math.PI) * 3); return { transform: [{ translateX: -1.8 * W * (sx / 100) }] }; });

  const clipStyle = useAnimatedStyle(() => {
    const p = rig.value.points, S = p[N], R = p[N + 1];
    const cN = Math.cos(((flipA.value + ty.value * 2) * Math.PI) / 180);
    const ca = (Math.atan2(-(R.x - S.x), R.y - S.y) * 180) / Math.PI;
    return { transform: [{ translateX: (S.x + R.x) / 2 }, { translateY: (S.y + R.y) / 2 }, { rotate: ca + 'deg' }, { scaleX: Math.max(0.3, Math.abs(cN)) }] };
  });
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOp.value }));

  const pan = Gesture.Pan().minDistance(0)
    .onBegin(e => {
      'worklet';
      hintOp.value = withTiming(0, { duration: 600 });
      const p = rig.value.points, R = p[N + 1], B = p[N + 2], th0 = angleOf(rig.value);
      const lx = e.x - W / 2, ly = e.y - HO, c = Math.cos(th0), s = Math.sin(th0);
      const vx = lx * c + ly * s, vy = -lx * s + ly * c;
      const ux = B.x - R.x, uy = B.y - R.y;
      dragT.value = clamp((vx * ux + vy * uy) / (ux * ux + uy * uy), 0.45, 1);
      dragX.value = R.x + vx; dragY.value = R.y + vy;
      moved.value = 0; dragOn.value = true;
      mx.value = clamp((e.x / W) * 100, 0, 100); my.value = clamp((e.y / H) * 100, 0, 100);
    })
    .onUpdate(e => {
      'worklet';
      const p = rig.value.points, R = p[N + 1], th0 = angleOf(rig.value);
      const lx = e.x - W / 2, ly = e.y - HO, c = Math.cos(th0), s = Math.sin(th0);
      dragX.value = R.x + lx * c + ly * s; dragY.value = R.y - lx * s + ly * c;
      moved.value = Math.max(moved.value, Math.abs(e.translationX) + Math.abs(e.translationY));
      mx.value = clamp((e.x / W) * 100, 0, 100); my.value = clamp((e.y / H) * 100, 0, 100);
    })
    .onFinalize(() => {
      'worklet';
      if (!dragOn.value) return;
      dragOn.value = false;
      if (moved.value < 10) runOnJS(doFlip)();
    });

  const lineFace = cssLine(155, W, H);
  const sheenBox = cssLine(112, W * 2.8, H);
  const brushed = useMemo(() => {
    if (!tier.brushed) return '';
    const a = (100 * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), l = cssLine(100, W, H);
    const len = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a)), px = -dy, py = dx, big = Math.hypot(W, H);
    let d = '';
    for (let k = 0; k < len; k += 3) {
      const cx = l.x1 + dx * (k + 0.5), cy = l.y1 + dy * (k + 0.5);
      d += 'M' + (cx - px * big).toFixed(1) + ' ' + (cy - py * big).toFixed(1) + 'L' + (cx + px * big).toFixed(1) + ' ' + (cy + py * big).toFixed(1);
    }
    return d;
  }, [W, H, tier.brushed]);
  const bars = useMemo(() => { const r: number[][] = []; for (let x = 0; x < inner; x += 13) { r.push([x, 2], [x + 4, 1], [x + 8, 3]); } return r; }, [inner]);
  const qrBox = inner * 0.62;
  // Keep QR SVG stable across flip/gesture renders instead of rebuilding its path tree.
  const qrValue = useMemo(() => qrPayload(admission), [admission]);
  const qrGraphic = useMemo(() => (
    <QRCode value={qrValue} size={qrBox - 24} backgroundColor="#C9C2E3" color="#0E0B1D" />
  ), [qrValue, qrBox]);
  const gradText = cssLine(100, inner, 52);

  const cap = { fontFamily: FONT.reg, fontSize: 9, letterSpacing: 2.16, textTransform: 'uppercase' as const, color: tier.acc, includeFontPadding: false };
  const faceBase = { position: 'absolute' as const, left: 0, top: 0, width: W, height: H, borderRadius: 24, borderWidth: 1, borderColor: tier.border, backfaceVisibility: 'hidden' as const, overflow: 'hidden' as const };

  const Face = ({ side, children }: { side: 'front' | 'back'; children: React.ReactNode }) => (
    <Animated.View style={[faceBase, side === 'front' ? frontStyle : backStyle]}>
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <SvgLinearGradient id={'fbg' + side} gradientUnits="userSpaceOnUse" x1={lineFace.x1} y1={lineFace.y1} x2={lineFace.x2} y2={lineFace.y2}>
            <Stop offset="0" stopColor={tier.f[0]} /><Stop offset=".52" stopColor={tier.f[1]} /><Stop offset="1" stopColor={tier.f[2]} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill={'url(#fbg' + side + ')'} />
        {tier.brushed ? <Path d={brushed} stroke="rgba(255,255,255,.035)" strokeWidth={1} /> : null}
      </Svg>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: glowR * 2, height: glowR * 2 }, side === 'front' ? glowFront : glowBack]}>
        <Svg width={glowR * 2} height={glowR * 2}>
          <Defs><RadialGradient id={'gl' + side} cx={glowR} cy={glowR} r={glowR} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={'rgb(' + tier.glow + ')'} stopOpacity={tier.ga} /><Stop offset="1" stopColor={'rgb(' + tier.glow + ')'} stopOpacity={0} />
          </RadialGradient></Defs>
          <Rect x={0} y={0} width={glowR * 2} height={glowR * 2} fill={'url(#gl' + side + ')'} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: W * 2.8, height: H }, side === 'front' ? sheenFront : sheenBack]}>
        <Svg width={W * 2.8} height={H}>
          <Defs><SvgLinearGradient id={'sh' + side} gradientUnits="userSpaceOnUse" x1={sheenBox.x1} y1={sheenBox.y1} x2={sheenBox.x2} y2={sheenBox.y2}>
            <Stop offset=".36" stopColor="#fff" stopOpacity={0} /><Stop offset=".5" stopColor="#fff" stopOpacity={0.12} /><Stop offset=".64" stopColor="#fff" stopOpacity={0} />
          </SvgLinearGradient></Defs>
          <Rect x={0} y={0} width={W * 2.8} height={H} fill={'url(#sh' + side + ')'} />
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: 'rgba(255,255,255,.16)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: 'rgba(139,124,199,.2)' }} />
      <View style={{ flex: 1, paddingTop: 26, paddingBottom: 20, paddingHorizontal: 22 }}>
        <Hole />
        {children}
      </View>


    </Animated.View>
  );

  const Logo = () => <Text style={{ fontFamily: FONT.bold, fontSize: 24, color: '#fff', letterSpacing: -0.72, includeFontPadding: false }}>gatherz<Text style={{ color: tier.acc }}>.</Text></Text>;
  const kv = (k: string, v: string) => (
    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text style={{ fontFamily: FONT.reg, fontSize: 11, color: tier.acc, includeFontPadding: false }}>{k}</Text>
      <Text style={{ fontFamily: FONT.med, fontSize: 11, color: '#fff', textAlign: 'right', marginLeft: 12, includeFontPadding: false }}>{v}</Text>
    </View>
  );

  return (
    <View style={{ width: vw, height: vh, overflow: 'hidden' }}>
      <Svg width={vw} height={vh} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <RadialGradient id="bgfx" cx={vw / 2} cy={vh * 0.38} rx={(vw / 2) * Math.SQRT2} ry={vh * 0.62 * Math.SQRT2} gradientUnits="userSpaceOnUse">
            {dark
              ? [<Stop key="a" offset="0" stopColor="#241A45" />, <Stop key="b" offset=".45" stopColor="#150F2C" />, <Stop key="c" offset=".8" stopColor="#0E0B1D" />]
              : [<Stop key="a" offset="0" stopColor="#FFFFFF" />, <Stop key="b" offset=".5" stopColor="#EFEBF9" />, <Stop key="c" offset="1" stopColor="#DCD5F0" />]}
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={vw} height={vh} fill="url(#bgfx)" />
      </Svg>

      {/* Full-width brushed-metal hanging rail, with a recessed underside and center mount. */}
      <Svg width={vw} height={42} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          <SvgLinearGradient id="hangingRail" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F0EAFB" /><Stop offset=".22" stopColor="#B8AED0" />
            <Stop offset=".55" stopColor="#65597B" /><Stop offset=".83" stopColor="#30283E" />
            <Stop offset="1" stopColor="#8F81AB" />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={24} width={vw} height={9} rx={1.5} fill="url(#hangingRail)" />
        <Rect x={0} y={24} width={vw} height={1} fill="#FFFFFF" opacity={0.65} />
        <Rect x={0} y={32} width={vw} height={2} fill="#161122" opacity={0.75} />
      </Svg>

      <Svg width={vw} height={vh} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <G>{Array.from({ length: N }, (_, i) => <StrapQuad key={i} i={i} geo={geo} />)}</G>
        <AnimatedPath animatedProps={elProps} fill="none" stroke={th.se} strokeWidth={1.8} strokeLinejoin="round" />
        <AnimatedPath animatedProps={erProps} fill="none" stroke={th.se} strokeWidth={1.8} strokeLinejoin="round" />
        <AnimatedPath animatedProps={slProps} fill="none" stroke={th.sg} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        <AnimatedPath animatedProps={srProps} fill="none" stroke={th.sg} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh }}>
        {Array.from(STRAP_TEXT).map((ch, i) => ch === ' ' ? null : <Glyph key={i} i={i} ch={ch} glyphs={glyphs} color={th.st} family={FONT.bold} />)}
      </View>


      {/* Draw the top mount last so the strap and its lettering enter behind the metal hardware. */}
      <Svg width={vw} height={vh} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          {/* Brushed purple steel: brighter bevel, deep metallic core, and lavender reflection. */}
          <SvgLinearGradient id="metalB" x1="0" y1="0" x2="0.18" y2="1">
            <Stop offset="0" stopColor="#F0EAFB" />
            <Stop offset=".16" stopColor="#C8B8E8" />
            <Stop offset=".39" stopColor="#8B7CC7" />
            <Stop offset=".65" stopColor="#554477" />
            <Stop offset=".84" stopColor="#352A4B" />
            <Stop offset="1" stopColor="#A796D2" />
          </SvgLinearGradient>
        </Defs>
        {/* Solid upper housing; the ribbon enters a recessed socket at its lower edge. */}
        <Rect x={AX - 16} y={AY - 12} width={32} height={20} rx={4} fill="url(#metalB)" stroke="#5A3B8C" />
        <Rect x={AX - 14} y={AY - 10} width={28} height={1.2} rx={0.6} fill="#FFFFFF" opacity={0.65} />
        <Rect x={AX - 15} y={AY - 7} width={1.2} height={9} rx={0.6} fill="#D8C9F5" opacity={0.5} />
        <Rect x={AX + 13.5} y={AY - 8} width={1} height={10} rx={0.5} fill="#241A36" opacity={0.65} />
        {/* Dark opening gives the attachment visible depth instead of a flat overlap. */}
        <Rect x={AX - 12.5} y={AY + 2} width={25} height={8} rx={3} fill="#20152F" stroke="#4A327C" strokeWidth={1} />
        {/* The ribbon remains visible in the socket, behind the front retaining lip. */}
        <Rect x={AX - 10} y={AY + 5} width={20} height={5} rx={1.5} fill="#181329" />
        <Rect x={AX - 15} y={AY + 7} width={30} height={4} rx={2} fill="url(#metalB)" stroke="#5A3B8C" strokeWidth={0.7} />
        <Rect x={AX - 11} y={AY + 8} width={22} height={1} rx={0.5} fill="#D4C5F7" opacity={0.65} />
      </Svg>

      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, shadowStyle]}>
        <Svg width={W + 144} height={H + 144} style={{ position: 'absolute', left: -72, top: -72 }}>
          {BLUR_OK ? <>
            <Defs><Filter id="shb" x="-50%" y="-50%" width="200%" height="200%"><FeGaussianBlur stdDeviation={24} /></Filter></Defs>
            <Rect x={72} y={72} width={W} height={H} rx={24} fill={th.sh} opacity={0.5} filter="url(#shb)" />
          </> : <Rect x={72} y={72} width={W} height={H} rx={24} fill={th.sh} opacity={0.16} />}
        </Svg>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, cardStyle]}>
          {[1, 2, 3, 4, 5, 6].map(k => <Edge key={k} z0={k * 0.5} w={W} h={H} flipA={flipA} ty={ty} />)}
          <Face side="front">
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View style={{ marginTop: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Logo /><Text style={cap}>{tier.cap}</Text>
              </View>
              <View>
                <Text style={{ fontFamily: FONT.bold, fontSize: 19, lineHeight: 21.85, color: '#fff', letterSpacing: 0.38, textTransform: 'uppercase', includeFontPadding: false }}>{event.title}</Text>
                <Text style={{ fontFamily: FONT.reg, marginTop: 6, fontSize: 11, letterSpacing: 1.32, color: '#C9C2E3', textTransform: 'uppercase', includeFontPadding: false }}>{formatWhen(event)}</Text>
                <LinearGradient colors={[tier.acc, tier.acc + '00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 1, opacity: 0.5, marginTop: 16, marginBottom: 14 }} />
                <Text style={cap}>Admission class</Text>
                {tier.brushed ? (
                  <Svg width={inner} height={52} style={{ marginTop: 8 }}>
                    <Defs><SvgLinearGradient id="tierTxt" gradientUnits="userSpaceOnUse" x1={gradText.x1} y1={gradText.y1} x2={gradText.x2} y2={gradText.y2}>
                      <Stop offset="0" stopColor="#8B7CC7" /><Stop offset=".45" stopColor="#F2EEFF" /><Stop offset=".7" stopColor="#8B7CC7" /><Stop offset="1" stopColor="#C9C2E3" />
                    </SvgLinearGradient></Defs>
                    <SvgText x={0} y={42} fontFamily={FONT.bold} fontSize={52} letterSpacing={-2.08} fill="url(#tierTxt)">{tier.label}</SvgText>
                  </Svg>
                ) : (
                  <Text style={{ fontFamily: FONT.bold, fontSize: 52, lineHeight: 52, letterSpacing: -2.08, color: '#fff', marginTop: 8, includeFontPadding: false }}>{tier.label}</Text>
                )}
                <Text style={{ fontFamily: FONT.reg, fontSize: 11, letterSpacing: 0.44, color: '#C9C2E3', marginTop: 8, includeFontPadding: false }}>{tier.perk}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 22 }}>
                  <Text style={cap}>Gatherz by Wantiss</Text><Text style={cap}>{admission.id}</Text>
                </View>
              </View>
            </View>
          </Face>
          <Face side="back">
            <View style={{ flex: 1 }}>
              <View style={{ marginTop: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Logo /><Text style={cap}>Entry credential</Text>
              </View>
              <View style={{ width: qrBox, aspectRatio: 1, alignSelf: 'center', marginTop: 20, padding: 12, borderRadius: 16, backgroundColor: '#C9C2E3' }}>
                {qrGraphic}
              </View>
              <Text style={[cap, { textAlign: 'center', marginTop: 12, fontSize: 8, letterSpacing: 1.92 }]}>Scan at the entrance</Text>
              <View style={{ marginTop: 18, gap: 8 }}>
                {kv('Holder', admission.holderName || 'Demo attendee')}
                {kv('Ticket', admission.credentialCode)}
                {kv('Gate', 'B · Level 2')}
                {kv('Admit', '1 person')}
              </View>
              <View style={{ flex: 1 }} />
              <Svg width={inner} height={30} style={{ opacity: 0.85, borderRadius: 2, overflow: 'hidden' }}>
                {bars.map(([x, w], i) => <Rect key={i} x={x} y={0} width={w} height={30} fill="#C9C2E3" />)}
              </Svg>
            </View>
          </Face>
        </Animated.View>
      </GestureDetector>

      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh }}>
        <Svg width={vw} height={vh} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs><SvgLinearGradient id="metalF" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#EDE9FA" /><Stop offset=".45" stopColor="#8B7CC7" /><Stop offset="1" stopColor="#C9C2E3" /></SvgLinearGradient></Defs>
          <AnimatedCircle animatedProps={ringProps} r={9.5} fill="none" stroke="url(#metalF)" strokeWidth={2.6} />
        </Svg>
        <Animated.View style={[{ position: 'absolute', left: -12, top: -22, width: 24, height: 44 }, clipStyle]}>
          <Svg width={24} height={44} viewBox="-12 -22 24 44">
            <Defs><SvgLinearGradient id="metalC" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#EDE9FA" /><Stop offset=".45" stopColor="#8B7CC7" /><Stop offset="1" stopColor="#C9C2E3" /></SvgLinearGradient></Defs>
            <Rect x={-8} y={-15} width={16} height={11} rx={2.5} fill="url(#metalC)" stroke="#5A3B8C" />
            <Rect x={-4} y={-5} width={8} height={24} rx={4} fill="none" stroke="url(#metalC)" strokeWidth={2.6} />
          </Svg>
        </Animated.View>
      </View>

      <Animated.Text pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 70, textAlign: 'center', fontSize: 11, color: th.dtx, fontFamily: FONT.reg }, hintStyle]}>
        Drag the card to toss · tap to flip
      </Animated.Text>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 14, flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 12, flexWrap: 'wrap' }}>
        {([['Flip', doFlip], ['Sway', doSway]] as const).map(([label, fn]) => (
          <Pressable key={label} accessibilityRole="button" onPress={fn}
            style={{ minHeight: 44, paddingHorizontal: 15, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(139,124,199,.4)', backgroundColor: th.dockbg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.med, fontSize: 12, color: th.dtx }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
