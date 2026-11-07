import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useFrameCallback, useSharedValue, withTiming, runOnJS, useReducedMotion } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { formatWhen, qrPayload } from '../../lib/gatherz/rules';
import { build, step, frame, N, DT, HO } from './pass/physics';
import type { Admission, GatherzEvent } from '../../types/gatherz';
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TIER = {
  general: { label: 'GENERAL', subtitle: 'Standard Experience', perk: 'Standard Entry · Main Floor', colors: ['#6B47AB','#3A2670','#1A1233'] as const, accent: '#C9C2E3' },
  vip: { label: 'VIP', subtitle: 'Exclusive Experience', perk: 'Priority Entry · Exclusive Lounge', colors: ['#1B1724','#0C0A14','#050309'] as const, accent: '#8B7CC7' },
  backstage: { label: 'BACKSTAGE', subtitle: 'Artist Access', perk: 'All Access · Artist Meet & Greet', colors: ['#2B2635','#0E0C16','#050309'] as const, accent: '#D8D0F2' },
};
export default function GatherzPassV2({ admission, event }: { admission: Admission; event: GatherzEvent }) {
  const t = useGatherzTheme(); const { width, height } = useWindowDimensions(); const tier = TIER[admission.tier];
  const reducedMotion = useReducedMotion();

  const [flipped, setFlipped] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const stageHeight = Math.max(510, height - 235);
  const strapLength = Math.max(78, Math.min(130, height * .15));
  const cardHeight = Math.max(300, Math.min(stageHeight - strapLength - 34, Math.min(300, width * .74) * 1.5 - 4));
  const cardWidth = cardHeight / 1.5;
  const segment = strapLength / (N + 1);
  const restRingY = 9 + strapLength;
  const anchorX = width / 2, anchorY = 9;
  const rig = useSharedValue(build(anchorX, anchorY, cardHeight, segment));
  const dragX = useSharedValue(0), dragY = useSharedValue(0), dragging = useSharedValue(false);
  const flip = useSharedValue(0), angle = useSharedValue(0), ringX = useSharedValue(anchorX), ringY = useSharedValue(restRingY);
  const tilt = useSharedValue(0), elapsed = useSharedValue(0), nudgePending = useSharedValue(true);
  const toggle = () => { flip.value = withTiming(flipped ? 0 : 180, { duration: reducedMotion ? 0 : 650 }); setFlipped(!flipped); };
  const onGestureTap = () => { setHintVisible(false); toggle(); };
  const onGestureDrag = () => setHintVisible(false);
  useEffect(() => { rig.value = build(anchorX, anchorY, cardHeight, segment); }, [anchorX, cardHeight, segment]);
  useFrameCallback(({ timeSincePreviousFrame }) => {
    'worklet';
    const dt = Math.min(.05, (timeSincePreviousFrame ?? 16.67) / 1000);
    if (reducedMotion) return;
    elapsed.value += dt;
    const next = { ...rig.value, points: rig.value.points.map(p => ({ ...p })) };
    if (nudgePending.value && elapsed.value > .3) { next.points[N + 2].px -= 2.5; nudgePending.value = false; }
    const steps = Math.min(16, Math.max(1, Math.ceil(dt / DT)));
    for (let i = 0; i < steps; i++) step(next, dragging.value ? dragX.value : undefined, dragging.value ? dragY.value : undefined);
    const f = frame(next);
    tilt.value = Math.max(-11, Math.min(11, (f.angle - angle.value) * 85));
    angle.value = f.angle;
    ringX.value = f.x; ringY.value = f.y;
    rig.value = next;
  });
  const rope = useAnimatedProps(() => {
    const points = rig.value.points;
    return { d: points.slice(0, N + 2).map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' ') };
  });
  const stitch = useAnimatedProps(() => {
    const points = rig.value.points;
    return { d: points.slice(0, N + 1).map((p, i) => (i ? 'L' : 'M') + (p.x + 3).toFixed(2) + ' ' + p.y.toFixed(2)).join(' ') };
  });
  const ring = useAnimatedProps(() => ({ cx: ringX.value, cy: ringY.value }));
  const hanging = useAnimatedStyle(() => ({
    transform: [{ translateX: ringX.value - anchorX }, { translateY: ringY.value - restRingY }, { translateY: cardHeight / 2 - HO }, { rotate: (-angle.value) + 'rad' }, { translateY: HO - cardHeight / 2 }],
  }));
  const frontStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: (flip.value + tilt.value) + 'deg' }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: (flip.value + 180 + tilt.value) + 'deg' }] }));
  const startX = useSharedValue(0), startY = useSharedValue(0);
  const pan = Gesture.Pan().minDistance(10).onBegin(() => { runOnJS(onGestureDrag)(); dragging.value = true; startX.value = rig.value.points[N + 2].x; startY.value = rig.value.points[N + 2].y; dragX.value = startX.value; dragY.value = startY.value; }).onUpdate(e => {
    dragX.value = startX.value + e.translationX;
    dragY.value = startY.value + e.translationY;
  }).onEnd(() => { dragging.value = false; }).onFinalize(() => { dragging.value = false; });
  const tap = Gesture.Tap().onEnd(() => { runOnJS(onGestureTap)(); });
  const gesture = Gesture.Race(pan, tap);
  const nudge = () => { const next = { ...rig.value, points: rig.value.points.map(p => ({ ...p })) }; next.points[N + 2].px -= 3.2; rig.value = next; setHintVisible(false); };
  const face = { position: 'absolute' as const, width: cardWidth, height: cardHeight, borderRadius: 24, borderWidth: 0.5, borderColor: '#C9C2E355', backfaceVisibility: 'hidden' as const, overflow: 'hidden' as const };
  return <View style={{ minHeight: stageHeight + 95, alignItems: 'center' }}>
    <LinearGradient colors={t.name === 'dark' ? ['#241A45', '#150F2C', '#0E0B1D'] : ['#FFFFFF', '#EFEBF9', '#DCD5F0']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: stageHeight + 95 }} />
    <View style={{ width, height: stageHeight }}>
      <Svg width={width} height={stageHeight} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs><SvgGradient id="metal" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#EDE9FA" /><Stop offset=".5" stopColor="#8B7CC7" /><Stop offset="1" stopColor="#C9C2E3" /></SvgGradient></Defs>
        <Line x1={0} x2={width} y1={4} y2={4} stroke="#5A3B8C" strokeWidth={5} />
        <Circle cx={anchorX} cy={anchorY} r={9} fill="url(#metal)" stroke="#5A3B8C" strokeWidth={1} />
        <AnimatedPath animatedProps={rope} fill="none" stroke="url(#metal)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <AnimatedPath animatedProps={stitch} fill="none" stroke="#5A3B8C" strokeWidth={.8} strokeDasharray="3 5" />
        <AnimatedCircle animatedProps={ring} r={13} fill="none" stroke="#C9C2E3" strokeWidth={5} />
      </Svg>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ position: 'absolute', top: restRingY - HO, left: (width - cardWidth) / 2, width: cardWidth, height: cardHeight }, hanging]}>
          <View style={{ position: 'absolute', left: 3, top: 5, width: cardWidth, height: cardHeight, backgroundColor: '#1B1530', borderColor: '#8B7CC7', borderWidth: 1, borderRadius: 24, opacity: .55 }} />
          <Animated.View style={[face, frontStyle]}>
            <LinearGradient colors={tier.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 22, justifyContent: 'space-between' }}>
              <View><View style={{ alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: '#050309', borderWidth: 0.5, borderColor: '#C9C2E3' }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 24, fontFamily: fonts.bold }}>gatherz<Text style={{ color: tier.accent }}>.</Text></Text><Text style={{ color: tier.accent, fontSize: 8, letterSpacing: 1 }}>{tier.subtitle.toUpperCase()}</Text></View>
              </View>
              <View><Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 21, textTransform: 'uppercase' }}>{event.title}</Text><Text style={{ color: '#C9C2E3', marginTop: 7, fontSize: 11 }}>{formatWhen(event)}</Text>
                <View style={{ height: 0.5, backgroundColor: tier.accent, marginVertical: 18 }} />
                <Text style={{ color: tier.accent, fontSize: 10, letterSpacing: 2 }}>ADMISSION CLASS</Text><Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: admission.tier === 'backstage' ? 38 : 52, marginTop: 5 }}>{tier.label}</Text><Text style={{ color: '#C9C2E3', fontSize: 11 }}>{tier.perk}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: tier.accent, fontSize: 9 }}>GATHERZ BY WANTISS</Text><Text style={{ color: tier.accent, fontSize: 9 }}>{admission.id.toUpperCase()}</Text></View>
            </LinearGradient>
          </Animated.View>
          <Animated.View style={[face, backStyle]}>
            <LinearGradient colors={tier.colors} style={{ flex: 1, padding: 22, alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 24 }}>gatherz<Text style={{ color: tier.accent }}>.</Text></Text>
              <View style={{ padding: 12, borderRadius: 16, backgroundColor: '#C9C2E3' }}><QRCode value={qrPayload(admission)} size={Math.min(cardWidth * .55, 160)} backgroundColor="#C9C2E3" color="#0E0B1D" /></View>
              <Text style={{ color: '#F2A4B7', fontFamily: fonts.bold, fontSize: 10 }}>DEMO · NOT VALID FOR ENTRY</Text>
              <View style={{ alignSelf: 'stretch', gap: 8 }}>
                <Text style={{ color: tier.accent, fontSize: 11 }}>HOLDER  <Text style={{ color: '#fff' }}>{admission.holderName || 'Demo attendee'}</Text></Text>
                <Text style={{ color: tier.accent, fontSize: 11 }}>TICKET  <Text style={{ color: '#fff' }}>{admission.credentialCode}</Text></Text>
                <Text style={{ color: tier.accent, fontSize: 11 }}>GATE  <Text style={{ color: '#fff' }}>B · Level 2</Text></Text>
                <Text style={{ color: tier.accent, fontSize: 11 }}>ADMIT  <Text style={{ color: '#fff' }}>1 person</Text></Text>
              </View>
              <View style={{ height: 22, alignSelf: 'stretch', flexDirection: 'row', overflow: 'hidden', justifyContent: 'space-between' }}>{Array.from({ length: 46 }, (_, i) => <View key={i} style={{ width: i % 5 === 0 ? 3 : 1, height: 22, backgroundColor: '#C9C2E3', opacity: .7 }} />)}</View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
    {hintVisible ? <Text style={{ color: t.mute, fontSize: 11, marginTop: 8 }}>Drag the card to toss · tap to flip</Text> : null}
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
      <Pressable accessibilityRole="button" onPress={toggle} style={{ borderRadius: 99, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, paddingHorizontal: 22, paddingVertical: 13 }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>{flipped ? 'Front' : 'Flip'}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={nudge} style={{ borderRadius: 99, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, paddingHorizontal: 22, paddingVertical: 13 }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>Sway</Text></Pressable>
    </View>
  </View>;
}
