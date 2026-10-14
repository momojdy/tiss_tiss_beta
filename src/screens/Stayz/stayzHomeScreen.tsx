import React, { useCallback, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { StayzPropertyCard } from './stayzPropertyCard';
import { StayzStateView, StayzErrorView, StayzCardSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { StayzSearchPanel } from './stayzSearchPanel';
import { THEMES, DESTINATIONS } from './stayzPlaces';
import { useStayzAsync } from './stayzUseAsync';
import { distanceFrom } from './stayzListings';
import { RootStackParamList, TabParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzTheme } from './stayzThemeContext';
import { addDays } from './stayzDates';
import { StayzWhereSheet } from './stayzWhereSheet';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const destinationPhotos: Record<string, string> = {
  'Port-au-Prince': 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=640&q=85',
  'Pétion-Ville': 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=640&q=85',
  Jacmel: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=640&q=85',
  'Cap-Haïtien': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=640&q=85',
  Montrouis: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=640&q=85',
  Kenscoff: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=640&q=85',
  Milot: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=640&q=85',
  'Les Cayes': 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=640&q=85',
};
const tileTones = ['#FFF0E9', '#E4F7F3', '#F3EAFE', '#FFF4D9'];
const tileAccents = ['#E85B49', '#129A8D', '#8862C7', '#B77A19'];
const quickActions: { label: string; detail: string; icon: keyof typeof Ionicons.glyphMap; route: keyof TabParamList; tone: string; accent: string }[] = [
  { label: 'Saved stays', detail: 'Your wish list', icon: 'heart-outline', route: 'Saved', tone: '#FFF0E9', accent: '#E85B49' },
  { label: 'My bookings', detail: 'Trips & details', icon: 'calendar-outline', route: 'Stays', tone: '#E4F7F3', accent: '#129A8D' },
  { label: 'Messages', detail: 'Talk to your host', icon: 'chatbubble-ellipses-outline', route: 'Messages', tone: '#F3EAFE', accent: '#8862C7' },
];

export const StayzHomeScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { search, setSearch } = useStayzSearch();
  const [where, setWhere] = useState(false);
  const [unread, setUnread] = useState(false);

  const nearby = useStayzAsync(
    () =>
      api.searchListings({ mode: search.mode, start: search.date, end: search.mode === 'overnight' || search.mode === 'extended' ? search.endDate : addDays(search.date, 1) }),
    [api, search.mode, search.date, search.endDate],
  );

  useFocusEffect(
    useCallback(() => {
      api
        .listNotices()
        .then(n => setUnread(n.some(x => !x.read)))
        .catch(() => setUnread(false));
    }, [api]),
  );

  const sorted = (nearby.data ?? []).slice().sort((a, b) => (distanceFrom(a, search.place) ?? 0) - (distanceFrom(b, search.place) ?? 0));

  return (
    <StayzScreen back={false} contentStyle={styles.content}>
      <LinearGradient colors={['#FF8A6E', '#FF6B5A', '#F0503D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandMark}><Ionicons name="bed" size={19} color="#F4513F" /></View>
            <View>
              <StayzTxt v="h2" color="#FFFFFF" style={styles.brandName}>stayz</StayzTxt>
              <StayzTxt v="caption" color="rgba(255,255,255,0.78)" style={styles.brandTag}>STAYS, MADE SIMPLE</StayzTxt>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={21} color="#FFFFFF" />
            {unread ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setWhere(true)} style={styles.location}>
          <Ionicons name="location-outline" size={16} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <StayzTxt v="caption" color="rgba(255,255,255,0.78)">YOUR DESTINATION</StayzTxt>
            <StayzTxt v="h3" color="#FFFFFF" numberOfLines={1}>{search.place ? (search.place.current ? search.place.sub ?? 'Current location' : search.place.label) : 'Explore Haiti'}</StayzTxt>
          </View>
          <Ionicons name="chevron-down" size={17} color="#FFFFFF" />
        </Pressable>
        <View style={styles.heroCopy}>
          <StayzTxt v="hero" color="#FFFFFF" style={styles.heroTitle}>Find a stay{'\n'}that feels right.</StayzTxt>
          <StayzTxt color="rgba(255,255,255,0.88)" style={styles.heroSubtitle}>Thoughtful places for every kind of getaway.</StayzTxt>
        </View>
        <View pointerEvents="none" style={styles.heroOrb} />
      </LinearGradient>
      <View style={styles.searchOverlap}><StayzSearchPanel onSubmit={() => nav.navigate('Results')} /></View>
      <View style={styles.sections}>
        <StayzSection title="Explore Haiti differently">
          <View style={styles.grid}>
            {THEMES.map((t, index) => (
              <Pressable key={t.key} accessibilityRole="button" onPress={() => { setSearch({ place: t.place }); nav.navigate('Results'); }} style={[styles.theme, { backgroundColor: tileTones[index % tileTones.length], borderColor: tileTones[index % tileTones.length] }]}>
                <View style={[styles.themeIcon, { backgroundColor: '#FFFFFF', shadowColor: tileAccents[index % tileAccents.length] }]}><Ionicons name={t.icon} size={22} color={tileAccents[index % tileAccents.length]} /></View>
                <StayzTxt v="h3" style={styles.themeTitle}>{t.title}</StayzTxt>
                <StayzTxt v="small" color="#646B75">{t.sub}</StayzTxt>
                <View style={[styles.themeArrow, { backgroundColor: tileAccents[index % tileAccents.length] }]}><Ionicons name="arrow-up-right" size={14} color="#FFFFFF" /></View>
              </Pressable>
            ))}
          </View>
        </StayzSection>
        <View style={styles.quickSection}>
          <StayzTxt v="h2">Your stay, made easier</StayzTxt>
          <View style={styles.quickRow}>
            {quickActions.map(item => (
              <Pressable key={item.label} accessibilityRole="button" onPress={() => nav.navigate('Tabs', { screen: item.route })} style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
                <View style={[styles.quickIcon, { backgroundColor: item.tone }]}><Ionicons name={item.icon} size={21} color={item.accent} /></View>
                <StayzTxt v="small" bold numberOfLines={1}>{item.label}</StayzTxt>
                <StayzTxt v="caption" sub numberOfLines={1}>{item.detail}</StayzTxt>
              </Pressable>
            ))}
          </View>
        </View>
        <StayzSection title="Places worth discovering">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>
            {DESTINATIONS.slice(0, 7).map(place => (
              <Pressable key={place.label} accessibilityRole="button" onPress={() => { setSearch({ place }); nav.navigate('Results'); }} style={styles.destinationCard}>
                <ImageBackground source={{ uri: destinationPhotos[place.label] }} style={styles.destinationImage} imageStyle={styles.destinationImageRadius}>
                  <LinearGradient colors={['transparent', 'rgba(12,18,25,0.78)']} style={styles.destinationShade}>
                    <StayzTxt v="h3" color="#FFFFFF" numberOfLines={1}>{place.label}</StayzTxt>
                    <StayzTxt v="caption" color="rgba(255,255,255,0.84)" numberOfLines={1}>{place.sub ?? 'Discover Haiti'}</StayzTxt>
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ))}
          </ScrollView>
        </StayzSection>
        <StayzSection title="Stays near you" action={<Pressable onPress={() => nav.navigate('Results')} accessibilityRole="button"><StayzTxt v="small" bold color={colors.brand}>See all</StayzTxt></Pressable>}>
          {nearby.loading ? <StayzCardSkeleton /> : nearby.error ? <StayzErrorView message={nearby.error} onRetry={nearby.reload} /> : sorted.length === 0 ? (
            <StayzStateView icon="bed-outline" title="No stays available" body="Try another date or stay type." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyRow}>
              {sorted.slice(0, 8).map(l => <StayzPropertyCard key={l.id} listing={l} search={search} compact onPress={() => nav.navigate('Property', { id: l.id })} />)}
            </ScrollView>
          )}
        </StayzSection>
      </View>
      <StayzWhereSheet visible={where} onClose={() => setWhere(false)} />
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 0, paddingBottom: 34, gap: 0 },
  hero: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 54, overflow: 'hidden', minHeight: 258 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 22, lineHeight: 24, letterSpacing: -0.8 },
  brandTag: { fontSize: 8, letterSpacing: 1.2, marginTop: 1 },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#F4513F' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, alignSelf: 'flex-start', maxWidth: '100%' },
  heroCopy: { marginTop: 17, maxWidth: 330, zIndex: 1 },
  heroTitle: { fontSize: 31, lineHeight: 35, letterSpacing: -0.8 },
  heroSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 19 },
  heroOrb: { position: 'absolute', width: 210, height: 210, borderRadius: 105, right: -96, bottom: -108, backgroundColor: 'rgba(255,255,255,0.08)' },
  searchOverlap: { marginTop: -34, marginHorizontal: 16, marginBottom: 24, zIndex: 2, elevation: 5 },
  sections: { paddingHorizontal: 16, gap: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  theme: { width: '48%', flexGrow: 1, minHeight: 154, borderRadius: 20, borderWidth: 1, padding: 14, gap: 5, overflow: 'hidden' },
  themeIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 5, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  themeTitle: { maxWidth: '92%' },
  themeArrow: { position: 'absolute', right: 12, top: 12, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickSection: { gap: 10 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 17, padding: 10, gap: 5 },
  quickIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  destinationRow: { gap: 12, paddingRight: 16 },
  destinationCard: { width: 166, borderRadius: 18, backgroundColor: '#E7E7E7', overflow: 'hidden' },
  destinationImage: { height: 146, justifyContent: 'flex-end' },
  destinationImageRadius: { borderRadius: 18 },
  destinationShade: { paddingHorizontal: 12, paddingVertical: 12, gap: 2 },
  propertyRow: { gap: 14, paddingRight: 16 },
});
