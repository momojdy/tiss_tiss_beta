import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { artGradients, fonts, radius, useGatherzTheme } from '../../theme/gatherzTheme';
import { TABS, ROUTES, type RouteName } from '../../lib/gatherz/navigation';
import { formatWhen } from '../../lib/gatherz/rules';
import { useGatherz } from '../../features/gatherz/GatherzContext';
import type { Admission, GatherzEvent } from '../../types/gatherz';
export const NAV_HEIGHT = 96;

/** Header scrolls with the page (it is not sticky). Secondary pages get a back arrow and their own title. */
export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  const t = useGatherzTheme();
  return (
    <View style={s.header}>
      {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={[s.iconBtn, { borderColor: t.line, backgroundColor: t.card }]}><MaterialCommunityIcons name="arrow-left" size={22} color={t.text} /></Pressable> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: onBack ? 18 : 28, color: t.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: t.mute, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
export function IconButton({ name, label, onPress }: { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; onPress: () => void }) {
  const t = useGatherzTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={[s.iconBtn, { borderColor: t.line, backgroundColor: t.card }]}><MaterialCommunityIcons name={name} size={22} color={t.text} /></Pressable>;
}
export function Page({ children }: { children: React.ReactNode }) {
  const t = useGatherzTheme(); const ins = useSafeAreaInsets(); const { root } = useGatherz();
  return <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: ins.top + 8, paddingBottom: (root ? NAV_HEIGHT + ins.bottom : ins.bottom) + 24 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}
export function Art({ index, style, children }: { index: number; style?: object; children?: React.ReactNode }) {
  const g = artGradients[index % artGradients.length];
  return <LinearGradient colors={[g[0], g[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ overflow: 'hidden' }, style]}>{children}</LinearGradient>;
}
export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useGatherzTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[s.chip, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: on ? t.onAccent : t.text }}>{label}</Text></Pressable>;
}
export function SectionTitle({ title }: { title: string }) { const t = useGatherzTheme(); return <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: t.text, marginTop: 24, marginBottom: 10, paddingHorizontal: 20 }}>{title}</Text>; }
export function Notice({ title, body, action, onAction, loading }: { title?: string; body?: string; action?: string; onAction?: () => void; loading?: boolean }) {
  const t = useGatherzTheme();
  return <View style={[s.notice, { backgroundColor: t.card, borderColor: t.line }]}>
    {loading ? <ActivityIndicator color={t.accent} /> : null}
    {title ? <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: t.text }}>{title}</Text> : null}
    {body ? <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: t.mute, marginTop: 4 }}>{body}</Text> : null}
    {action ? <Pressable accessibilityRole="button" onPress={onAction} style={[s.btn, { backgroundColor: t.accent, marginTop: 12 }]}><Text style={{ fontFamily: fonts.semibold, color: t.onAccent }}>{action}</Text></Pressable> : null}
  </View>;
}
export function EventCard({ event, onPress, wide }: { event: GatherzEvent; onPress: () => void; wide?: boolean }) {
  const t = useGatherzTheme(); const { now } = useGatherz();
  const from = event.tiers.length ? Math.min(...event.tiers.map(x => x.price)) : 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}, ${formatWhen(event, now)}`} onPress={onPress} style={[s.card, { backgroundColor: t.card, borderColor: t.line }, wide ? { width: 270 } : null]}>
      <Art index={event.art} style={{ height: wide ? 146 : 92, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }} />
      <View style={{ padding: 14 }}>
        <Text numberOfLines={2} style={{ fontFamily: fonts.bold, fontSize: 16, color: t.text }}>{event.title}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: t.mute, marginTop: 4 }}>{formatWhen(event, now)} · {event.venue}</Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: t.accent, marginTop: 6 }}>{event.remaining <= 0 ? 'Sold out' : from === 0 ? 'Free' : `From $${from}`}</Text>
      </View>
    </Pressable>
  );
}
/** Static ticket front used in lists. The full hanging pass opens from the ticket detail. */
const TIER_GRADIENT = { general: ['#6B47AB', '#1A1233'], vip: ['#1B1724', '#050309'], backstage: ['#2B2635', '#050309'] } as const;
const TIER_LABEL = { general: 'General', vip: 'VIP', backstage: 'Backstage' } as const;
export function TicketFront({ admission, event, width, onPress }: { admission: Admission; event: GatherzEvent; width?: number | `${number}%`; onPress: () => void }) {
  const { now } = useGatherz(); const g = TIER_GRADIENT[admission.tier];
  const badge = admission.status === 'checked_in' ? 'Checked in' : admission.status === 'pending_transfer' ? 'Transfer pending' : admission.status === 'refunded' ? 'Refunded' : admission.status === 'canceled' ? 'Canceled' : admission.status === 'expired' ? 'Expired' : admission.tier === 'vip' ? 'Exclusive' : admission.tier === 'backstage' ? 'Artist access' : 'Standard';
  const accent = admission.tier === 'general' ? '#C9C2E3' : '#8B7CC7';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${TIER_LABEL[admission.tier]} ticket for ${event.title}. ${badge}`} onPress={onPress} style={{ width: width, borderRadius: radius.card, overflow: 'hidden', borderWidth: 0.5, borderColor: admission.tier === 'general' ? '#8B7CC7' : '#8B7CC766' }}>
      <LinearGradient colors={[g[0], g[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, minHeight: 186, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: '#fff' }}>gatherz<Text style={{ color: accent }}>.</Text></Text>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: accent }}>{badge.toUpperCase()}</Text>
        </View>
        <View>
          <Text numberOfLines={1} style={{ fontFamily: fonts.regular, fontSize: 12, color: accent }}>{event.title}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 30, color: '#fff', marginTop: 2 }}>{TIER_LABEL[admission.tier]}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: accent, marginTop: 4 }}>{formatWhen(event, now)} · {admission.credentialCode}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
const ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = { home: 'home-outline', favorites: 'heart-outline', moments: 'image-multiple-outline', tickets: 'ticket-confirmation-outline', circles: 'account-group-outline' };
const NAV_LABEL: Record<string, string> = { home: 'Home', favorites: 'Favorites', moments: 'Moments', tickets: 'Tickets', circles: 'Circles' };
export function BottomNav({ active, onTab }: { active: RouteName; onTab: (r: RouteName) => void }) {
  const t = useGatherzTheme(); const ins = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[s.nav, { bottom: ins.bottom + 12, backgroundColor: t.card, borderColor: t.line }]}>
      {TABS.map(r => { const on = r === active; return (
        <Pressable key={r} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={ROUTES[r].title} onPress={() => onTab(r)} style={[s.tab, on ? { backgroundColor: t.accent } : null]}>
          <MaterialCommunityIcons name={ICONS[r]} size={22} color={on ? t.onAccent : t.mute} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 10, color: on ? t.onAccent : t.mute }}>{NAV_LABEL[r]}</Text>
        </Pressable>); })}
    </View>
  );
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.card, borderWidth: 0.5, overflow: 'hidden' },
  btn: { height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  notice: { marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: radius.card, borderWidth: 0.5 },
  nav: { position: 'absolute', left: 12, right: 12, minHeight: 66, borderRadius: 26, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6, elevation: 6 },
  tab: { flex: 1, minHeight: 52, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 2, marginHorizontal: 2 },
});
export const styles = s;