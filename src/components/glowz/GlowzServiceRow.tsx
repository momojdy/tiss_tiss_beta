import React from 'react';
import { Pressable, View } from 'react-native';
import { PRICE, STARTING } from '../../data/glowz/prices';
import { useFavorites } from '../../hooks/Glowz/useFavorites';
import { useBookingFlow } from '../../hooks/Glowz/useBookingFlow';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import type { Provider, Service } from '../../types/glowz/provider';
import { peso } from '../../util/Glowz/format';
import { GlowzBadge } from './GlowzBadge';
import { GlowzCard } from './GlowzCard';
import { GlowzIconButton } from './GlowzIconButton';
import { GlowzText } from './GlowzText';

/** Service line on a provider profile: tap to book, heart to save. */
export function GlowzServiceRow({ provider: p, service: s }: { provider: Provider; service: Service }) {
  const { c } = useGlowzTheme();
  const fav = useFavorites();
  const flow = useBookingFlow();
  const saved = fav.isServiceSaved(s.id);
  return (
    <GlowzCard row gap={8}>
      <Pressable onPress={() => flow.start(p.id, s.id)} accessibilityRole="button" accessibilityLabel={`Book ${s.n}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
        <View style={{ flex: 1 }}>
          <GlowzText weight={600}>{s.n}</GlowzText>
          <GlowzText kind="small" muted>{s.d} min · {s.desc}</GlowzText>
          {s.add.length ? <GlowzText kind="small" color={c.tintInk} style={{ marginTop: 3 }}>+ {s.add.length} add-on{s.add.length > 1 ? 's' : ''}</GlowzText> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <GlowzText price>{STARTING[s.id] ? <GlowzText kind="small" muted>from </GlowzText> : null}{peso(PRICE[s.id])}</GlowzText>
          <GlowzBadge label="Book" />
        </View>
      </Pressable>
      <GlowzIconButton
        icon="heart"
        size={36}
        iconSize={17}
        borderless
        background="transparent"
        filled={saved}
        color={saved ? c.roseInk : c.muted}
        label={saved ? `Remove ${s.n} from favorites` : `Save ${s.n} to favorites`}
        onPress={() => fav.toggleFavorite('s', s.id)}
      />
    </GlowzCard>
  );
}
