import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useProfileSettings } from '../../hooks/Glowz/useProfileSettings';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzEmptyState } from '../../components/glowz/GlowzEmptyState';
import { GlowzProviderRow } from '../../components/glowz/GlowzProviderRow';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzText } from '../../components/glowz/GlowzText';
import { GlowzTopBar } from '../../components/glowz/GlowzTopBar';
import { getProvider } from '../../util/Glowz/catalog';

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
