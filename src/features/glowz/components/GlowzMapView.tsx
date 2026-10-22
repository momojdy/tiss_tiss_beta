import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import type { Provider } from '../types/provider';
import { minPrice } from '../utils/catalog';
import { peso } from '../utils/format';
import { hash } from '../utils/hash';
import { GlowzText } from './GlowzText';

const CELL = 90;

function Pin({ provider: p, selected, onPress, left, top }: { provider: Provider; selected: boolean; onPress: () => void; left: string; top: string }) {
  const { c } = useGlowzTheme();
  const [sz, setSz] = useState({ w: 0, h: 0 });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, from ${peso(minPrice(p))}`}
      accessibilityState={{ selected }}
      onLayout={(e: LayoutChangeEvent) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{
        position: 'absolute', left: left as `${number}%`, top: top as `${number}%`, zIndex: selected ? 2 : 1,
        transform: [{ translateX: -sz.w / 2 }, { translateY: -sz.h }],
        backgroundColor: selected ? c.ink : c.accent, paddingHorizontal: 10, paddingVertical: 5,
        borderTopLeftRadius: 99, borderTopRightRadius: 99, borderBottomRightRadius: 99, borderBottomLeftRadius: 4,
        shadowColor: c.shadow, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
      }}
    >
      <GlowzText size={12} weight={600} color={selected ? c.bg : c.accentInk} style={{ fontVariant: ['tabular-nums'] }}>{peso(minPrice(p))}</GlowzText>
    </Pressable>
  );
}

/** Stylised sample map: price pins placed deterministically. Not a real map. */
export function GlowzMapView({ providers, selectedId, onSelect }: { providers: Provider[]; selectedId: string; onSelect: (id: string) => void }) {
  const { c } = useGlowzTheme();
  const [box, setBox] = useState({ w: 0, h: 360 });
  const vLines = Math.ceil(box.w / CELL);
  const hLines = Math.ceil(box.h / CELL);
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ height: 360, borderRadius: 18, overflow: 'hidden', backgroundColor: c.sageSoft, borderWidth: 1, borderColor: c.line }}
    >
      {Array.from({ length: vLines }, (_, i) => <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: i * CELL + CELL / 2 - 0.9, width: 1.8, backgroundColor: c.line }} />)}
      {Array.from({ length: hLines }, (_, i) => <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * CELL + CELL / 2 - 0.9, height: 1.8, backgroundColor: c.line }} />)}
      {providers.map((p) => (
        <Pin key={p.id} provider={p} selected={p.id === selectedId} onPress={() => onSelect(p.id)} left={`${12 + (hash(p.id) % 72)}%`} top={`${22 + (hash(p.id + 'y') % 60)}%`} />
      ))}
      <GlowzText kind="small" muted style={{ position: 'absolute', left: 10, bottom: 8, right: 10 }}>Sample map. Home-service pros show a service area, not an address.</GlowzText>
    </View>
  );
}