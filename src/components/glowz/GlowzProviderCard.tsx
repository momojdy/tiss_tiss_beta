import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useFavorites } from '../../hooks/Glowz/useFavorites';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import type { Provider } from '../../types/glowz/provider';
import { minPrice, providerIcon } from '../../util/Glowz/catalog';
import { peso } from '../../util/Glowz/format';
import { nextSlotLabel } from '../../util/Glowz/slotLabel';
import { GlowzArt } from './GlowzArt';
import { GlowzHeartButton } from './GlowzHeartButton';
import { GlowzRating, GlowzVerified } from './GlowzStars';
import { GlowzText } from './GlowzText';


/** Compact 150px card for rails and grids. The heart is a sibling of the card button, not inside it. */
export function GlowzProviderCard({ provider: p }: { provider: Provider }) {
  const { c } = useGlowzTheme();
  const { bookings } = useGlowzState();
  const { openProvider } = useGlowzCommands();
  const fav = useFavorites();
  const saved = fav.isProviderSaved(p.id);
  const tag = p.sponsored ? 'Sponsored' : p.isNew ? 'New' : null;
  return (
    <View style={{ width: 150 }}>
      <Pressable onPress={() => openProvider(p.id)} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} style={{ gap: 6 }}>
        <View>
          <GlowzArt h={p.h} icon={providerIcon(p)} style={{ height: 104, borderRadius: 14, width: '100%' }} />
          {tag ? (
            <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: c.surface, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
              <GlowzText size={10} weight={600}>{tag}</GlowzText>
            </View>
          ) : null}
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <GlowzText size={14} weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</GlowzText>
            {p.v ? <GlowzVerified size={14} /> : null}
          </View>
          <GlowzText size={12} muted numberOfLines={1}>{p.type === 'home' ? 'Comes to you' : `${p.area} · ${p.km} km`}</GlowzText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <GlowzRating rating={p.rating} size={12} />
            <GlowzText size={12} muted numberOfLines={1} style={{ flexShrink: 1 }}>({p.rv}) · {peso(minPrice(p))}+</GlowzText>
          </View>
          <GlowzText size={12} weight={600} color={c.ok} numberOfLines={1}>{nextSlotLabel(p, bookings)}</GlowzText>
        </View>
      </Pressable>
      <GlowzHeartButton
        saved={saved}
        onPress={() => fav.toggleFavorite('p', p.id)}
        label={saved ? `Remove ${p.name} from favorites` : `Save ${p.name} to favorites`}
        size={32}
        style={{ position: 'absolute', top: 6, right: 6 }}
      />
    </View>
  );
}
