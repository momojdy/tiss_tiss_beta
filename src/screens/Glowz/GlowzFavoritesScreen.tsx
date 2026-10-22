import React from 'react';
import { Pressable, View } from 'react-native';
import { PRICE } from '../../data/glowz/prices';
import { POSTS } from '../../data/glowz/posts';
import { PROVIDERS } from '../../data/glowz/providers';
import { useGlowzStore } from '../../hooks/Glowz/GlowzStore';
import { useBookingFlow } from '../../hooks/Glowz/useBookingFlow';
import { useFavorites } from '../../hooks/Glowz/useFavorites';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { useContentWidth, useGutter } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzCard } from '../../components/glowz/GlowzCard';
import { GlowzEmptyState } from '../../components/glowz/GlowzEmptyState';
import { GlowzIconButton } from '../../components/glowz/GlowzIconButton';
import { GlowzPostCard } from '../../components/glowz/GlowzPostCard';
import { GlowzProviderRow } from '../../components/glowz/GlowzProviderRow';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzTabs } from '../../components/glowz/GlowzTabs';
import { GlowzText } from '../../components/glowz/GlowzText';
import type { FavoritesTab } from '../../types/glowz/state';
import { getServiceById } from '../../util/Glowz/catalog';
import { peso } from '../../util/Glowz/format';

const TABS: { id: FavoritesTab; label: string }[] = [
  { id: 'p', label: 'Professionals' }, { id: 's', label: 'Services' }, { id: 'x', label: 'Inspiration' },
];

export function GlowzFavoritesScreen() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const nav = useGlowzNav();
  const w = useContentWidth();
  const { state, update } = useGlowzStore();
  const fav = useFavorites();
  const flow = useBookingFlow();
  const { goInspire } = useGlowzCommands();
  const cardW = (w - g.left - g.right - 12) / 2;

  let body: React.ReactNode = null;
  if (state.ftab === 'p') {
    const l = PROVIDERS.filter((p) => state.favP.includes(p.id));
    body = l.length ? <View style={{ gap: 18 }}>{l.map((p) => <GlowzProviderRow key={p.id} provider={p} />)}</View> : <GlowzEmptyState title="No saved professionals" subtitle="Tap the heart on a salon or artist to keep them here." />;
  }
  if (state.ftab === 's') {
    const l = state.favS.map(getServiceById).filter((x): x is NonNullable<ReturnType<typeof getServiceById>> => !!x);
    body = l.length ? (
      <View style={{ gap: 10 }}>
        {l.map(({ p, s }) => (
          <GlowzCard key={s.id} row gap={10}>
            <Pressable onPress={() => flow.start(p.id, s.id)} accessibilityRole="button" accessibilityLabel={`Book ${s.n}`} style={{ flex: 1 }}>
              <GlowzText weight={600}>{s.n}</GlowzText>
              <GlowzText kind="small" muted>{p.name} · {s.d} min</GlowzText>
            </Pressable>
            <GlowzText price>{peso(PRICE[s.id])}</GlowzText>
            <GlowzIconButton icon="heart" filled color={c.accent} label={`Remove ${s.n} from favorites`} onPress={() => fav.toggleFavorite('s', s.id)} />
          </GlowzCard>
        ))}
      </View>
    ) : <GlowzEmptyState title="No saved services" subtitle="Save services you want to book later." />;
  }
  if (state.ftab === 'x') {
    const l = POSTS.filter((x) => state.favX.includes(x.id));
    body = l.length ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 14 }}>{l.map((x) => <GlowzPostCard key={x.id} post={x} width={cardW} />)}</View>
    ) : <GlowzEmptyState title="No saved looks" subtitle="Save hairstyles, nails and makeup from the inspiration feed." action={<GlowzButton small label="Browse inspiration" onPress={goInspire} />} />;
  }

  return (
    <GlowzScreen header={<View style={{ paddingLeft: g.left, paddingRight: g.right, flexDirection: "row", alignItems: "center", gap: 10 }}><GlowzIconButton icon="back" label="Back" onPress={() => nav.back()} size={38} iconSize={20} /><GlowzText kind="display" size={34} accessibilityRole="header">Favorites</GlowzText></View>} bottom="root">
      <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 14 }}>
        <GlowzTabs tabs={TABS} value={state.ftab} onChange={(id) => update((s) => ({ ...s, ftab: id }))} />
        {body}
      </View>
    </GlowzScreen>
  );
}
