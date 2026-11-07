import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { fonts, useGatherzTheme } from '../../theme/gatherzTheme';
import { formatWhen, qrPayload } from '../../lib/gatherz/rules';
import type { Admission, GatherzEvent } from '../../types/gatherz';

const TIER = {
  general: { label: 'GENERAL', subtitle: 'Standard Experience', perk: 'Standard Entry · Main Floor', colors: ['#6B47AB','#3A2670','#1A1233'] as const, accent: '#C9C2E3' },
  vip: { label: 'VIP', subtitle: 'Exclusive Experience', perk: 'Priority Entry · Exclusive Lounge', colors: ['#1B1724','#0C0A14','#050309'] as const, accent: '#8B7CC7' },
  backstage: { label: 'BACKSTAGE', subtitle: 'Artist Access', perk: 'All Access · Artist Meet & Greet', colors: ['#2B2635','#0E0C16','#050309'] as const, accent: '#D8D0F2' },
};
export default function GatherzPassV2({ admission, event }: { admission: Admission; event: GatherzEvent }) {
  const t = useGatherzTheme(); const { width } = useWindowDimensions(); const tier = TIER[admission.tier];
  const [flipped, setFlipped] = useState(false);
  const [sway, setSway] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const spin = useRef(new Animated.Value(0)).current;
  const displacement = useRef(new Animated.ValueXY()).current;
  const cardWidth = Math.min(width - 96, 290), cardHeight = Math.min(430, cardWidth * 1.5 - 4);
  const toggle = () => setFlipped(f => !f);
  useEffect(() => {
    Animated.spring(spin, { toValue: flipped ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 110 }).start();
  }, [flipped, spin]);
  const reset = () => Animated.spring(displacement, { toValue: { x: 0, y: 0 }, damping: 3, stiffness: 18, mass: 2, useNativeDriver: false }).start();
  const nudge = () => { setHintVisible(false); Animated.sequence([Animated.timing(displacement.x, { toValue: 24, duration: 180, useNativeDriver: false }), Animated.spring(displacement.x, { toValue: 0, damping: 3, stiffness: 18, mass: 2, useNativeDriver: false })]).start(); };
  useEffect(() => { const timer = setTimeout(nudge, 300); return () => clearTimeout(timer); }, []);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
    onPanResponderMove: Animated.event([null, { dx: displacement.x, dy: displacement.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => { setHintVisible(false); if (Math.abs(g.dx) + Math.abs(g.dy) < 10) toggle(); reset(); },
    onPanResponderTerminate: reset,
  })).current;
  const frontRotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg','180deg'] });
  const backRotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg','360deg'] });
  const face = { position: 'absolute' as const, width: cardWidth, height: cardHeight, borderRadius: 24, borderWidth: 0.5, borderColor: '#C9C2E355', backfaceVisibility: 'hidden' as const, overflow: 'hidden' as const };
  return <View style={{ alignItems: 'center', paddingTop: 14 }}>
    <Text style={{ color: t.mute, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>GATHERZ · BY WANTISS</Text>
    <View style={{ width: 34, height: 13, backgroundColor: '#8B7CC7', borderRadius: 5 }} />
    <View style={{ width: 16, height: 24, borderWidth: 2, borderColor: '#8B7CC7', borderRadius: 8 }} />
    <Animated.View {...pan.panHandlers} style={{ width: cardWidth, height: cardHeight, transform: [{ translateX: displacement.x }, { translateY: displacement.y }, { rotate: sway ? displacement.x.interpolate({ inputRange: [-180, 0, 180], outputRange: ['-12deg','0deg','12deg'], extrapolate: 'clamp' }) : '0deg' }] }}>
      <Animated.View style={[face, { transform: [{ perspective: 1200 }, { rotateY: frontRotation }] }]}>
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
      <Animated.View style={[face, { transform: [{ perspective: 1200 }, { rotateY: backRotation }] }]}>
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
    {hintVisible ? <Text style={{ color: t.mute, fontSize: 11, marginTop: 18 }}>Drag the card to toss · tap to flip</Text> : null}
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
      <Pressable accessibilityRole="button" onPress={toggle} style={{ borderRadius: 99, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, paddingHorizontal: 22, paddingVertical: 13 }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>{flipped ? 'Front' : 'Flip'}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={nudge} style={{ borderRadius: 99, borderWidth: 0.5, borderColor: t.line, backgroundColor: t.card, paddingHorizontal: 22, paddingVertical: 13 }}><Text style={{ color: t.text, fontFamily: fonts.semibold }}>Sway</Text></Pressable>
    </View>
  </View>;
}