import React from 'react';
import { Pressable, View } from 'react-native';
import { BANNERS } from '../../data/glowz/banners';
import { CATEGORIES } from '../../data/glowz/categories';
import { HOME_SECTIONS } from '../../data/glowz/sections';
import { POSTS } from '../../data/glowz/posts';
import { PROVIDERS } from '../../data/glowz/providers';
import { useGlowzSheet } from '../../hooks/Glowz/GlowzSheetContext';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useNotifications } from '../../hooks/Glowz/useNotifications';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { useContentWidth, useGutter } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzArt } from '../../components/glowz/GlowzArt';
import { GlowzBadge } from '../../components/glowz/GlowzBadge';
import { GlowzCard } from '../../components/glowz/GlowzCard';
import { GlowzHorizontalRail } from '../../components/glowz/GlowzHorizontalRail';
import { GlowzIcon } from '../../components/glowz/GlowzIcon';
import { GlowzIconButton } from '../../components/glowz/GlowzIconButton';
import { GlowzProviderCard } from '../../components/glowz/GlowzProviderCard';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzSearchButton } from '../../components/glowz/GlowzSearchBar';
import { GlowzSectionHeader } from '../../components/glowz/GlowzSectionHeader';
import { GlowzText } from '../../components/glowz/GlowzText';
import { getProvider, providerIcon } from '../../util/Glowz/catalog';
import { fmtD, fmtT } from '../../util/Glowz/format';
import { sectionProviders } from '../../util/Glowz/filtering';

function HomeHeader() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const state = useGlowzState();
  const nav = useGlowzNav();
  const { openSheet } = useGlowzSheet();
  const { unreadCount } = useNotifications();
  return (
    <View style={{ paddingLeft: g.left, paddingRight: g.right, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <GlowzIconButton icon="back" label="Back to Wantiss Home" onPress={() => nav.back()} size={38} iconSize={20} />
      <GlowzText kind="display" weight={700} size={32} accessibilityRole="header" style={{ letterSpacing: -0.3 }}>
        glowz<GlowzText kind="display" weight={700} size={32} color={c.accent}>.</GlowzText>
      </GlowzText>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => openSheet({ kind: 'area' })}
        accessibilityRole="button"
        accessibilityLabel={`Area: ${state.area}. Change area`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}
      >
        <GlowzIcon name="pin" size={15} color={c.ink} />
        <GlowzText kind="small" weight={500}>{state.area}</GlowzText>
        <GlowzText kind="small" style={{ opacity: 0.6 }}>▾</GlowzText>
      </Pressable>
      <GlowzIconButton icon="bell" label={unreadCount ? `Notifications, ${unreadCount} new` : 'Notifications'} dot={unreadCount > 0} onPress={() => nav.push({ name: 'Notifications' })} />
    </View>
  );
}

export function GlowzHomeScreen() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const w = useContentWidth();
  const state = useGlowzState();
  const cmd = useGlowzCommands();
  const cats = CATEGORIES.filter((x) => x.on);
  const up = state.bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const upProvider = up ? getProvider(up.p) : undefined;
  const done = state.bookings.filter((b) => b.status === 'completed');
  const promoWidth = Math.round(w * 0.76);

  return (
    <GlowzScreen header={<HomeHeader />} bottom="root" showStripe={false}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, marginTop: 4 }}>
        <GlowzSearchButton placeholder="What beauty service do you need?" onPress={cmd.goSearch} />
      </View>

      <View style={{ marginTop: 16 }}>
        <GlowzHorizontalRail gap={12}>
          {BANNERS.map((b, i) => (
            <Pressable
              key={b.id}
              onPress={() => cmd.openBanner(b.id)}
              accessibilityRole="button"
              accessibilityLabel={`${b.title}. ${b.sub}`}
              style={{ width: promoWidth, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: i % 2 ? c.sageSoft : c.tint }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                <GlowzIcon name={i % 2 ? 'leaf' : 'gift'} size={18} color={i % 2 ? c.sageInk : c.roseInk} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <GlowzText weight={600} numberOfLines={1}>{b.title}</GlowzText>
                <GlowzText kind="small" muted numberOfLines={1}>{b.sub}</GlowzText>
              </View>
            </Pressable>
          ))}
        </GlowzHorizontalRail>
      </View>

      <View style={{ marginTop: 14 }}>
        <GlowzHorizontalRail gap={12}>
          {cats.map((x) => (
            <Pressable key={x.id} onPress={() => cmd.pickCategory(x.id)} accessibilityRole="button" accessibilityLabel={`${x.name} category`} style={{ width: 60, alignItems: 'center', gap: 6 }}>
              <GlowzArt h={x.h} icon={x.icon} style={{ width: 54, height: 54, borderRadius: 27 }} />
              <GlowzText size={12} weight={500} numberOfLines={1}>{x.name}</GlowzText>
            </Pressable>
          ))}
        </GlowzHorizontalRail>
      </View>

      {up && upProvider ? (
        <View style={{ paddingLeft: g.left, paddingRight: g.right, marginTop: 14 }}>
          <Pressable onPress={() => cmd.openBooking(up.ref)} accessibilityRole="button" accessibilityLabel="Your next visit">
            <GlowzCard tone="tint" row>
              <GlowzArt h={upProvider.h} icon={providerIcon(upProvider)} style={{ width: 40, height: 40, borderRadius: 10 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <GlowzText kind="tiny" color={c.tintInk}>Your next visit</GlowzText>
                <GlowzText weight={600} numberOfLines={1}>{up.items[0].n} · {upProvider.name}</GlowzText>
                <GlowzText kind="small">{fmtD(up.date)}, {fmtT(up.time)}</GlowzText>
              </View>
              <GlowzBadge label={up.status === 'confirmed' ? 'Confirmed' : 'Pending'} tone={up.status === 'confirmed' ? 'ok' : 'warn'} />
            </GlowzCard>
          </Pressable>
        </View>
      ) : null}

      {HOME_SECTIONS.filter((s) => s.on).map((s) => {
        const list = sectionProviders(s.id, state.bookings);
        if (!list.length) return null;
        return (
          <View key={s.id}>
            <GlowzSectionHeader title={s.title} subtitle={s.sub} onSeeAll={() => cmd.openSection(s.id)} />
            <GlowzHorizontalRail>{list.map((p) => <GlowzProviderCard key={p.id} provider={p} />)}</GlowzHorizontalRail>
          </View>
        );
      })}

      {done.length && state.prefs.private ? (
        <View>
          <GlowzSectionHeader title="Book again" subtitle="Because you booked before" />
          <GlowzHorizontalRail>
            {done.map((b) => {
              const p = getProvider(b.p);
              return p ? <GlowzProviderCard key={b.ref} provider={p} /> : null;
            })}
          </GlowzHorizontalRail>
        </View>
      ) : null}

      <GlowzSectionHeader title="Trending looks" subtitle="Tap a look to see who made it" onSeeAll={cmd.goInspire} />
      <GlowzHorizontalRail>
        {POSTS.slice(0, 5).map((x) => {
          const p = getProvider(x.p);
          if (!p) return null;
          return (
            <Pressable key={x.id} onPress={() => cmd.openPost(x.id)} accessibilityRole="button" accessibilityLabel={`${x.cap}, by ${p.name}`} style={{ width: 104 }}>
              <GlowzArt h={x.h} icon={providerIcon(p)} style={{ width: 104, height: 132, borderRadius: 14 }} />
              <GlowzText size={12} weight={500} numberOfLines={1} style={{ marginTop: 4 }}>{p.name}</GlowzText>
            </Pressable>
          );
        })}
      </GlowzHorizontalRail>

      {state.prefs.private && state.recent.length ? (
        <View>
          <GlowzSectionHeader title="Recently viewed" />
          <GlowzHorizontalRail>
            {state.recent.map((id) => {
              const p = PROVIDERS.find((x) => x.id === id);
              return p ? <GlowzProviderCard key={id} provider={p} /> : null;
            })}
          </GlowzHorizontalRail>
        </View>
      ) : null}
      <View style={{ height: 24 }} />
    </GlowzScreen>
  );
}
