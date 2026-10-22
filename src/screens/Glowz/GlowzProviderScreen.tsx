import React from 'react';
import { View } from 'react-native';
import { useGlowzHost } from '../../hooks/Glowz/GlowzHostContext';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useToast } from '../../hooks/Glowz/GlowzToast';
import { useBookingFlow } from '../../hooks/Glowz/useBookingFlow';
import { useFavorites } from '../../hooks/Glowz/useFavorites';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import type { ProviderTab } from '../../navigation/glowz/GlowzNavigationTypes';
import { useGutter, useInsets } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzArt } from '../../components/glowz/GlowzArt';
import { GlowzBadge } from '../../components/glowz/GlowzBadge';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzEmptyState } from '../../components/glowz/GlowzEmptyState';
import { GlowzIconButton } from '../../components/glowz/GlowzIconButton';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzRating, GlowzVerified } from '../../components/glowz/GlowzStars';
import { GlowzStickyBar } from '../../components/glowz/GlowzStickyBar';
import { GlowzTabs } from '../../components/glowz/GlowzTabs';
import { GlowzText } from '../../components/glowz/GlowzText';
import { GlowzTopBar } from '../../components/glowz/GlowzTopBar';
import { GlowzProviderAboutTab } from '../../components/glowz/provider/GlowzProviderAboutTab';
import { GlowzProviderPortfolioTab } from '../../components/glowz/provider/GlowzProviderPortfolioTab';
import { GlowzProviderReviewsTab } from '../../components/glowz/provider/GlowzProviderReviewsTab';
import { GlowzProviderServicesTab } from '../../components/glowz/provider/GlowzProviderServicesTab';
import { getProvider, minPrice, providerIcon } from '../../util/Glowz/catalog';
import { peso } from '../../util/Glowz/format';
import { nextSlot } from '../../util/Glowz/availability';
import { nextSlotLabel } from '../../util/Glowz/slotLabel';

const TABS: { id: ProviderTab; label: string }[] = [
  { id: 'svc', label: 'Services' }, { id: 'port', label: 'Portfolio' }, { id: 'rev', label: 'Reviews' }, { id: 'about', label: 'About' },
];

export function GlowzProviderScreen({ id, tab = 'svc' }: { id: string; tab?: ProviderTab }) {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const insets = useInsets();
  const nav = useGlowzNav();
  const toast = useToast();
  const host = useGlowzHost();
  const { bookings } = useGlowzState();
  const fav = useFavorites();
  const flow = useBookingFlow();
  const cmd = useGlowzCommands();
  const p = getProvider(id);

  if (!p) {
    return (
      <GlowzScreen header={<GlowzTopBar title="Not found" onBack={nav.back} />}>
        <GlowzEmptyState title="Professional not found" subtitle="This profile is no longer available." action={<GlowzButton small label="Back to home" onPress={cmd.goHome} />} />
      </GlowzScreen>
    );
  }

  const saved = fav.isProviderSaved(p.id);
  const following = fav.isFollowing(p.id);
  const n = nextSlot(p, bookings);
  const share = () => {
    const url = 'glowz.wantiss.app/' + p.id;
    if (host.shareLink) void Promise.resolve(host.shareLink(url));
    else if (host.copyToClipboard) { void Promise.resolve(host.copyToClipboard(url)); toast('Profile link copied (sample)'); }
    else toast(url);
  };

  const bar = (
    <GlowzStickyBar>
      <View>
        <GlowzText kind="small" muted>From</GlowzText>
        <GlowzText size={18} price>{peso(minPrice(p))}</GlowzText>
      </View>
      <GlowzButton label="Book now" onPress={() => flow.start(p.id, null)} style={{ flex: 1 }} />
    </GlowzStickyBar>
  );

  return (
    <GlowzScreen bar={bar} edgeToEdge>
      <View>
        <GlowzArt h={p.h} icon={providerIcon(p)} style={{ height: 168, width: '100%' }} />
        <View style={{ position: 'absolute', left: Math.max(12, insets.left), right: Math.max(12, insets.right), top: Math.max(12, insets.top), flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <GlowzIconButton icon="back" label="Back" onPress={nav.back} />
          <View style={{ flex: 1 }} />
          <GlowzIconButton icon="share" label="Share" onPress={share} />
          <GlowzIconButton icon="heart" label={saved ? `Remove ${p.name} from favorites` : `Save ${p.name} to favorites`} color={saved ? c.accent : c.ink} filled={saved} onPress={() => fav.toggleFavorite('p', p.id)} />
        </View>
      </View>
      <View accessibilityElementsHidden style={{ height: 20, width: '100%', backgroundColor: c.tint }} />
      <View style={{ paddingLeft: g.left, paddingRight: g.right, marginTop: -54, gap: 10 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: c.bg, overflow: 'hidden', backgroundColor: c.sageSoft }}>
          <GlowzArt h={p.h} icon={providerIcon(p)} style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ gap: 8 }}>
          <GlowzText kind="display" size={28} accessibilityRole="header">{p.name}</GlowzText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {p.v ? <GlowzBadge tone="ok" label="Verified" icon={<GlowzVerified size={14} />} /> : <GlowzBadge tone="mute" label="Not yet verified" />}
            <GlowzBadge label={p.type === 'home' ? 'At-home' : p.type === 'independent' ? 'Independent pro' : 'Salon'} />
            {p.sponsored ? <GlowzBadge tone="mute" label="Sponsored" /> : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <GlowzRating rating={p.rating} />
            <GlowzText kind="small" muted>({p.rv} reviews) · {p.type === 'home' ? p.addr : `${p.area} · ${p.km} km`}</GlowzText>
          </View>
          <GlowzText kind="small">{p.bio}</GlowzText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <GlowzButton small variant={following ? 'ghost' : 'sage'} label={following ? 'Following' : 'Follow'} onPress={() => fav.toggleFollow(p.id)} />
            <GlowzText kind="small" weight={600} color={c.ok} style={{ flex: 1 }}>Next: {n ? nextSlotLabel(p, bookings) : 'none in 14 days'}</GlowzText>
          </View>
        </View>
        <GlowzTabs tabs={TABS} value={tab} onChange={nav.setProviderTab} />
        {tab === 'svc' ? <GlowzProviderServicesTab provider={p} /> : null}
        {tab === 'port' ? <GlowzProviderPortfolioTab provider={p} /> : null}
        {tab === 'rev' ? <GlowzProviderReviewsTab provider={p} /> : null}
        {tab === 'about' ? <GlowzProviderAboutTab provider={p} /> : null}
      </View>
    </GlowzScreen>
  );
}
