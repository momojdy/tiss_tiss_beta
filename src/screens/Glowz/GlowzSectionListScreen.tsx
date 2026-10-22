import React from 'react';
import { View } from 'react-native';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzEmptyState } from '../../components/glowz/GlowzEmptyState';
import { GlowzProviderRow } from '../../components/glowz/GlowzProviderRow';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzTopBar } from '../../components/glowz/GlowzTopBar';
import { sectionProviders } from '../../util/Glowz/filtering';

/** "See all" for a Home section. */
export function GlowzSectionListScreen({ id, title }: { id: string; title: string }) {
  const g = useGutter();
  const nav = useGlowzNav();
  const { bookings } = useGlowzState();
  const { goSearch } = useGlowzCommands();
  const list = sectionProviders(id, bookings);
  return (
    <GlowzScreen header={<GlowzTopBar title={title} onBack={nav.back} />}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 14 }}>
        {list.length ? list.map((p) => <GlowzProviderRow key={p.id} provider={p} />) : (
          <GlowzEmptyState title="Nothing here right now" subtitle="Check back soon or explore all professionals." action={<GlowzButton small label="Explore" onPress={goSearch} />} />
        )}
      </View>
    </GlowzScreen>
  );
}
