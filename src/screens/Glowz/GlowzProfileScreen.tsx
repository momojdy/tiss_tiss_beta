import React from 'react';
import { Image, View } from 'react-native';
import { useGlowzSheet } from '../hooks/GlowzSheetContext';
import { useGlowzState } from '../hooks/GlowzStore';
import { useNotifications } from '../hooks/useNotifications';
import { REFERRAL_CODE, useProfileSettings } from '../hooks/useProfileSettings';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { useGutter, useInsets } from '../styles/LayoutContext';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzArt } from '../components/GlowzArt';
import { GlowzBadge } from '../components/GlowzBadge';
import { GlowzButton } from '../components/GlowzButton';
import { GlowzCard } from '../components/GlowzCard';
import { GlowzIcon } from '../components/GlowzIcon';
import { GlowzIconButton } from '../components/GlowzIconButton';
import { GlowzScreen } from '../components/GlowzScreen';
import { GlowzSegmented } from '../components/GlowzSegmented';
import { GlowzText } from '../components/GlowzText';
import { GlowzToggleRow } from '../components/GlowzToggleRow';
import { Pressable } from 'react-native';
import type { PictureChoice, ThemeMode } from '../types/state';

const THEMES: { id: ThemeMode; label: string }[] = [{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }];

/** Cover or avatar: picked image, built-in illustration, or the default illustration. */
function Picture({ pic, fallbackH, fallbackIcon }: { pic: PictureChoice; fallbackH: number; fallbackIcon: string }) {
  if (pic && pic.kind === 'uri') return <Image source={{ uri: pic.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />;
  return <GlowzArt h={fallbackH} icon={fallbackIcon} toneIndex={pic && pic.kind === 'tone' ? pic.index : undefined} style={{ width: '100%', height: '100%' }} />;
}

function Row({ title, subtitle, onPress, right, icon }: { title: string; subtitle?: string; onPress: () => void; right?: React.ReactNode; icon?: string }) {
  const { c } = useGlowzTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <GlowzCard row>
        {icon ? <GlowzIcon name={icon} size={22} color={c.ink} /> : null}
        <View style={{ flex: 1 }}>
          <GlowzText weight={600}>{title}</GlowzText>
          {subtitle ? <GlowzText kind="small" muted>{subtitle}</GlowzText> : null}
        </View>
        {right}
        <GlowzText muted>›</GlowzText>
      </GlowzCard>
    </Pressable>
  );
}

export function GlowzProfileScreen() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const insets = useInsets();
  const nav = useGlowzNav();
  const state = useGlowzState();
  const { openSheet } = useGlowzSheet();
  const { unreadCount } = useNotifications();
  const s = useProfileSettings();

  return (
    <GlowzScreen bottom="root" edgeToEdge>
      <View>
        <View style={{ height: 132 + Math.max(0, insets.top - 12), backgroundColor: c.tint }}>
          <Picture pic={state.cover} fallbackH={350} fallbackIcon="lotus" />
        </View>
        <GlowzIconButton icon="camera" label="Change cover photo" onPress={() => void s.changePicture('cover')} style={{ position: 'absolute', right: Math.max(16, insets.right), top: Math.max(14, insets.top) }} />
      </View>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, marginTop: 14, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View style={{ marginTop: -50 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: c.bg, overflow: 'hidden', backgroundColor: c.sageSoft }}>
              <Picture pic={state.avatar} fallbackH={335} fallbackIcon="user" />
            </View>
            <GlowzIconButton icon="camera" label="Change profile photo" size={32} iconSize={16} onPress={() => void s.changePicture('avatar')} style={{ position: 'absolute', right: -2, bottom: 2 }} />
          </View>
          <View style={{ flex: 1, paddingTop: 6, minWidth: 0 }}>
            <GlowzText kind="display" size={32} numberOfLines={1} accessibilityRole="header">{s.profile.name}</GlowzText>
            <GlowzText kind="small" muted numberOfLines={1}>Demo profile · {state.area}</GlowzText>
          </View>
          <GlowzButton small variant="ghost" label="Edit" onPress={() => openSheet({ kind: 'editProfile' })} style={{ marginBottom: 6 }} />
        </View>
        <GlowzText kind="small" muted>Sign-in and account security are handled by Wantiss and are not part of this prototype.</GlowzText>

        <GlowzCard gap={12}>
          <View>
            <GlowzText weight={600}>Appearance</GlowzText>
            <GlowzText kind="small" muted>Glowz opens in light by default</GlowzText>
          </View>
          <GlowzSegmented options={THEMES} value={s.theme} onChange={s.setTheme} />
        </GlowzCard>

        <GlowzCard tone="sage" row>
          <GlowzIcon name="gift" size={26} color={c.sageInk} />
          <View style={{ flex: 1 }}>
            <GlowzText weight={600}>Invite a friend</GlowzText>
            <GlowzText kind="small">Code <GlowzText kind="small" weight={600}>{REFERRAL_CODE}</GlowzText> · you both get ₱150 after their first visit</GlowzText>
          </View>
          <GlowzButton small variant="sage" label="Copy" onPress={s.copyReferral} style={{ backgroundColor: c.surface }} />
        </GlowzCard>

        <GlowzCard gap={16}>
          <GlowzText weight={600}>Notifications</GlowzText>
          <GlowzToggleRow title="Booking and payment" subtitle="Always on. Confirmations, changes, receipts and refunds." value locked />
          <GlowzToggleRow title="Appointment reminders" subtitle="24 hours and 2 hours before" value={s.prefs.reminders} onToggle={() => s.togglePref('reminders')} />
          <GlowzToggleRow title="Updates from professionals you follow" value={s.prefs.follow} onToggle={() => s.togglePref('follow')} />
          <GlowzToggleRow title="Offers and promotions" subtitle="Separate from booking alerts" value={s.prefs.promo} onToggle={() => s.togglePref('promo')} />
          <GlowzText kind="small" muted>Demo settings. This prototype never sends real notifications.</GlowzText>
        </GlowzCard>

        <GlowzCard gap={16}>
          <GlowzText weight={600}>Privacy</GlowzText>
          <GlowzToggleRow title="Personalised recommendations" subtitle="Shows Book again and Recently viewed on Home" value={s.prefs.private} onToggle={() => s.togglePref('private')} />
          <Pressable onPress={() => nav.push({ name: 'Recent' })} accessibilityRole="button" accessibilityLabel="Recently viewed" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <GlowzText weight={600}>Recently viewed</GlowzText>
              <GlowzText kind="small" muted>{state.recent.length} on this device</GlowzText>
            </View>
            <GlowzText muted>›</GlowzText>
          </Pressable>
        </GlowzCard>

        <Row icon="bell" title="Notifications" onPress={() => nav.push({ name: 'Notifications' })} right={unreadCount ? <GlowzBadge label={`${unreadCount} new`} /> : null} />
        <Row icon="chat" title="Messages" onPress={() => nav.push({ name: 'ChatList' })} />

        <View style={{ alignItems: 'center', gap: 8, paddingBottom: 12 }}>
          <Pressable onPress={() => void s.resetDemo()} accessibilityRole="button" style={{ padding: 6 }}>
            <GlowzText kind="small" muted style={{ textDecorationLine: 'underline' }}>Reset demo data</GlowzText>
          </Pressable>
          <GlowzText kind="small" muted center>Glowz prototype · sample data saved on this device only</GlowzText>
        </View>
      </View>
    </GlowzScreen>
  );
}
