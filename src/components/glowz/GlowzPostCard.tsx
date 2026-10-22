import React from 'react';
import { Pressable, View } from 'react-native';
import { PRICE } from '../data/prices';
import { useFavorites } from '../hooks/useFavorites';
import { useGlowzCommands } from '../hooks/useGlowzCommands';
import { useBookingFlow } from '../hooks/useBookingFlow';
import { useGlowzTheme } from '../styles/ThemeContext';
import type { Post } from '../types/provider';
import { getProvider, getServiceOf, providerIcon } from '../utils/catalog';
import { peso } from '../utils/format';
import { GlowzArt } from './GlowzArt';
import { GlowzChip } from './GlowzChip';
import { GlowzHeartButton } from './GlowzHeartButton';
import { GlowzIconButton } from './GlowzIconButton';
import { GlowzText } from './GlowzText';

/** Inspiration tile: look, caption, who made it, quick book and save. */
export function GlowzPostCard({ post: x, width }: { post: Post; width: number }) {
  const { c } = useGlowzTheme();
  const fav = useFavorites();
  const { openPost, openProvider } = useGlowzCommands();
  const flow = useBookingFlow();
  const p = getProvider(x.p);
  const sv = p ? getServiceOf(p, x.svc) : undefined;
  if (!p || !sv) return null;
  const liked = fav.isLiked(x.id);
  const saved = fav.isLookSaved(x.id);
  return (
    <View style={{ width, gap: 6 }}>
      <View>
        <Pressable onPress={() => openPost(x.id)} accessibilityRole="button" accessibilityLabel={`Open ${p.name} portfolio`}>
          <GlowzArt h={x.h} icon={providerIcon(p)} style={{ width: '100%', aspectRatio: 1 / 1.1, borderRadius: 14 }} />
        </Pressable>
        <GlowzHeartButton saved={liked} onPress={() => fav.toggleLike(x.id)} label={liked ? 'Unlike' : 'Like'} size={30} iconSize={16} style={{ position: 'absolute', top: 8, right: 8 }} />
      </View>
      <GlowzText size={12.5} numberOfLines={2}>{x.cap}</GlowzText>
      <Pressable onPress={() => openProvider(p.id)} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`}>
        <GlowzText size={12} muted numberOfLines={1}>{p.name}</GlowzText>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <GlowzChip label={`Book · ${peso(PRICE[sv.id])}`} height={30} fontSize={12} style={{ flex: 1 }} onPress={() => flow.start(p.id, sv.id)} />
        <GlowzIconButton
          icon="star"
          size={30}
          iconSize={15}
          borderless
          color={saved ? c.roseInk : c.muted}
          label={saved ? 'Remove saved look' : 'Save look'}
          onPress={() => fav.toggleFavorite('x', x.id)}
          background="transparent"
          style={{ opacity: saved ? 1 : 0.6 }}
        />
      </View>
    </View>
  );
}
