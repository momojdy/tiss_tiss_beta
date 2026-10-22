import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzState } from '../hooks/GlowzStore';
import { useProfileSettings } from '../hooks/useProfileSettings';
import { useGlowzCommands } from '../hooks/useGlowzCommands';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { useGutter } from '../styles/LayoutContext';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzButton } from '../components/GlowzButton';
import { GlowzEmptyState } from '../components/GlowzEmptyState';
import { GlowzProviderRow } from '../components/GlowzProviderRow';
import { GlowzScreen } from '../components/GlowzScreen';
import { GlowzText } from '../components/GlowzText';
import { GlowzTopBar } from '../components/GlowzTopBar';
import { getProvider } from '../utils/catalog';

export function GlowzRecentScreen() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const nav = useGlowzNav();
  const { recent } = useGlowzState();
  const { clearRecent } = useProfileSettings();
  const { goSearch } = useGlowzCommands();
  const right = recent.length ? (
    <Pressable onPress={clearRecent} accessibilityRole="button" accessibilityLabel="Clear recently viewed" hitSlop={8}>
      <GlowzText kind="small" weight={600} color={c.roseInk}>Clear</GlowzText>
    </Pressable>
  ) : null;
  return (
    <GlowzScreen header={<GlowzTopBar title="Recently viewed" onBack={nav.back} right={right} />}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 14 }}>
        {recent.length ? recent.map((id) => { const p = getProvider(id); return p ? <GlowzProviderRow key={id} provider={p} /> : null; }) : (
          <GlowzEmptyState title="Nothing viewed yet" subtitle="Salons and professionals you open will appear here." action={<GlowzButton small label="Explore Glowz" onPress={goSearch} />} />
        )}
      </View>
    </GlowzScreen>
  );
}