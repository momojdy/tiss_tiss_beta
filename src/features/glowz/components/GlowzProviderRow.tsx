import React from 'react';
import { Pressable, View } from 'react-native';
import { PROMOS } from '../data/promos';
import { useGlowzState } from '../hooks/GlowzStore';
import { useFavorites } from '../hooks/useFavorites';
import { useGlowzCommands } from '../hooks/useGlowzCommands';
import { useGlowzTheme } from '../styles/ThemeContext';
import type { Provider } from '../types/provider';
import { categoryName, minPrice, providerIcon } from '../utils/catalog';
import { peso } from '../utils/format';
import { nextSlotLabel } from '../utils/slotLabel';
import { GlowzArt } from './GlowzArt';
import { GlowzBadge } from './GlowzBadge';
import { GlowzHeartButton } from './GlowzHeartButton';
import { GlowzRating } from './GlowzStars';
import { GlowzText } from './GlowzText';

/** List-style provider row (Explore list, Favorites, section lists, map selection). */
export function GlowzProviderRow({ provider: p }: { provider: Provider }) {
  const { c } = useGlowzTheme();
  const { bookings } = useGlowzState();
  const { openProvider } = useGlowzCommands();
  const fav = useFavorites();
  const saved = fav.isProviderSaved(p.id);
  return (
    <View>
      <Pressable onPress={() => openProvider(p.id)} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} style={{ flexDirection: 'row', gap: 12 }}>
        <GlowzArt h={p.h} icon={providerIcon(p)} style={{ width: 76, height: 76, borderRadius: 12 }} />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <GlowzText weight={600} numberOfLines={1} style={{ paddingRight: 34 }}>{p.name}</GlowzText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <GlowzRating rating={p.rating} />
            <GlowzText kind="small" muted numberOfLines={1} style={{ flexShrink: 1 }}>({p.rv}) · {p.type === 'home' ? 'At home' : `${p.area} · ${p.km} km`}</GlowzText>
          </View>
          <GlowzText size={12} muted numberOfLines={1}>{p.cats.map(categoryName).join(' · ')} · from {peso(minPrice(p))}</GlowzText>
          <View style={{ flexDirection: 'row', gap: 6, overflow: 'hidden' }}>
            {p.v ? <GlowzBadge label="Verified" tone="ok" small /> : null}
            {p.sponsored ? <GlowzBadge label="Sponsored" tone="mute" small /> : null}
            {p.promo ? <GlowzBadge label={PROMOS[p.promo].label} small /> : null}
          </View>
          <GlowzText size={12} weight={600} color={c.ok} numberOfLines={1}>Next: {nextSlotLabel(p, bookings)}</GlowzText>
        </View>
      </Pressable>
      <GlowzHeartButton
        saved={saved}
        onPress={() => fav.toggleFavorite('p', p.id)}
        label={saved ? `Remove ${p.name} from favorites` : `Save ${p.name} to favorites`}
        size={34}
        background={c.tint}
        style={{ position: 'absolute', top: 0, right: 0 }}
      />
    </View>
  );
}