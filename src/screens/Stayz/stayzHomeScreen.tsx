import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { StayzPropertyCard } from './stayzPropertyCard';
import { StayzStateView, StayzErrorView, StayzCardSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { StayzSearchPanel } from './stayzSearchPanel';
import { DESTINATIONS } from './stayzPlaces';
import { useStayzAsync } from './stayzUseAsync';
import { distanceFrom } from './stayzListings';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzTheme } from './stayzThemeContext';
import { addDays } from './stayzDates';
import { StayzPhotoSlot } from './stayzPhotoSlot';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const destinationPhotos: Record<string, string> = {
  'Port-au-Prince': 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=720&q=85',
  'Pétion-Ville': 'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=720&q=85',
  Jacmel: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=720&q=85',
  'Cap-Haïtien': 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=720&q=85',
  Montrouis: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=720&q=85',
  Kenscoff: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=720&q=85',
  Milot: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=720&q=85',
  'Les Cayes': 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=720&q=85',
};

const stayCategories = [
  { key: 'resorts', filterType: 'Resort', title: 'Resorts', subtitle: 'Pools, beaches & escapes', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=720&q=85', icon: 'sunny-outline' as const },
  { key: 'hotels', filterType: 'Hotel', title: 'Hotels', subtitle: 'Comfort for every trip', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=720&q=85', icon: 'bed-outline' as const },
  { key: 'apartments', filterType: 'Apartment', title: 'Apartments', subtitle: 'Space to feel at home', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=85', icon: 'business-outline' as const },
  { key: 'guesthouses', filterType: 'Guesthouse', title: 'Guest houses', subtitle: 'Warm local hospitality', image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=720&q=85', icon: 'cafe-outline' as const },
  { key: 'villas', filterType: 'Villa', title: 'Villas', subtitle: 'Privacy and room to unwind', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=720&q=85', icon: 'home-outline' as const },
];

const discoveryCards = [
  { title: 'Things to do in Haïti', subtitle: 'Local experiences, culture and coastlines', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=720&q=85', icon: 'compass-outline' as const, action: 'activities' },
  { title: 'Airport pick-up', subtitle: 'Make arrivals easier', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=720&q=85', icon: 'airplane-outline' as const, action: 'airport' },
  { title: 'Car rental', subtitle: 'Explore at your own pace', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=720&q=85', icon: 'car-sport-outline' as const, action: 'cars' },
  { title: 'Day passes', subtitle: 'Enjoy a resort for the day', image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=720&q=85', icon: 'sunny-outline' as const, action: 'daypasses' },
];

const specialOffers = [
  { title: 'A little more day, for less', detail: 'Discover stays with daytime booking options.', tag: 'DAY USE', tone: '#FCEBEC', accent: '#C92532', mode: 'dayuse' as const },
  { title: 'Make room for a longer escape', detail: 'Explore weekly and extended stays.', tag: 'LONG STAYS', tone: '#E3F5F1', accent: '#128F82', mode: 'extended' as const },
];

export const StayzHomeScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { search, setSearch, setMode, filters, setFilters } = useStayzSearch();
  const [unread, setUnread] = useState(false);
  const [recentPlaces, setRecentPlaces] = useState<(typeof DESTINATIONS)[number][]>([]);

  const nearby = useStayzAsync(
    () =>
      api.searchListings({ mode: search.mode, start: search.date, end: search.mode === 'overnight' || search.mode === 'extended' ? search.endDate : addDays(search.date, 1) }),
    [api, search.mode, search.date, search.endDate],
  );
  const hourly = useStayzAsync(
    () => api.searchListings({ mode: 'hourly', start: search.date, end: addDays(search.date, 1) }),
    [api, search.date],
  );

  useFocusEffect(
    useCallback(() => {
      api.listNotices().then(n => setUnread(n.some(x => !x.read))).catch(() => setUnread(false));
    }, [api]),
  );

  const sorted = (nearby.data ?? []).slice().sort((a, b) => (distanceFrom(a, search.place) ?? 0) - (distanceFrom(b, search.place) ?? 0));
  const hourlySorted = (hourly.data ?? []).slice().sort((a, b) => (distanceFrom(a, search.place) ?? 0) - (distanceFrom(b, search.place) ?? 0));
  const recent = [...recentPlaces, ...(search.place ? [search.place] : [])].filter((place, index, all) => all.findIndex(p => p.label === place.label) === index).slice(0, 4);

  const openPlace = (place: (typeof DESTINATIONS)[number]) => {
    setRecentPlaces(previous => [place, ...previous.filter(p => p.label !== place.label)].slice(0, 4));
    setSearch({ place });
    nav.navigate('Results');
  };

  const openDiscovery = (action: string) => {
    if (action === 'daypasses') setMode('dayuse');
    nav.navigate('Results');
  };

  return (
    <StayzScreen back={false} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}><Ionicons name="bed" size={20} color="#D92D36" /></View>
          <View>
            <StayzTxt v="h2" style={styles.brandName}>stayz</StayzTxt>
            <StayzTxt v="caption" sub style={styles.brandTag}>STAYS IN HAÏTI</StayzTxt>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} style={[styles.bell, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>

      <View style={styles.intro}>
        <StayzTxt v="hero" style={styles.pageTitle}>Where would you like to stay?</StayzTxt>
        <StayzTxt sub style={styles.pageSubtitle}>Find the right place for your next trip.</StayzTxt>
      </View>

      <View style={styles.searchWrap}>
        <StayzSearchPanel onSubmit={() => nav.navigate('Results')} />
      </View>

      <View style={styles.sections}>
        <StayzSection title="Find your kind of stay">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {stayCategories.map(category => (
              <Pressable key={category.key} accessibilityRole="button" onPress={() => { setFilters({ ...filters, types: [category.filterType as any] }); nav.navigate('Results'); }} style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
                <View style={styles.categoryPhotoWrap}>
                  <StayzPhotoSlot uri={category.image} style={styles.categoryPhoto} icon={category.icon} />
                  <View style={styles.categoryPhotoShade} />
                  <View style={styles.categoryIcon}><Ionicons name={category.icon} size={17} color="#FFFFFF" /></View>
                </View>
                <View style={styles.categoryInfo}>
                  <StayzTxt v="h3" numberOfLines={1}>{category.title}</StayzTxt>
                  <StayzTxt v="caption" sub numberOfLines={2}>{category.subtitle}</StayzTxt>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </StayzSection>

        <StayzSection title="Available by the hour" action={<Pressable accessibilityRole="button" onPress={() => { setMode('hourly'); nav.navigate('Results'); }}><StayzTxt v="small" bold color={colors.brand}>See all</StayzTxt></Pressable>}>
          {hourly.loading ? <View style={styles.propertyRow}><StayzCardSkeleton /><StayzCardSkeleton /></View> : hourly.error ? <StayzErrorView message={hourly.error} onRetry={hourly.reload} /> : hourlySorted.length === 0 ? (
            <StayzStateView icon="time-outline" title="Flexible hourly stays" body="Find a room for a few hours, with availability and times shown before you book." action="Explore hourly stays" onAction={() => { setMode('hourly'); nav.navigate('Results'); }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyRow}>
              {hourlySorted.slice(0, 8).map(l => <StayzPropertyCard key={l.id} listing={l} search={{ ...search, mode: 'hourly' }} compact onPress={() => nav.navigate('Property', { id: l.id })} />)}
            </ScrollView>
          )}
        </StayzSection>

        <StayzSection title="Popular destinations" action={<Pressable accessibilityRole="button" onPress={() => openPlace(DESTINATIONS[0])}><StayzTxt v="small" bold color={colors.brand}>Explore all</StayzTxt></Pressable>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>
            {DESTINATIONS.map(place => (
              <Pressable key={place.label} accessibilityRole="button" onPress={() => openPlace(place)} style={styles.destinationCard}>
                <StayzPhotoSlot uri={destinationPhotos[place.label]} style={styles.destinationImage} icon="location-outline" />
                <View style={styles.destinationShade}>
                  <StayzTxt v="h3" color="#FFFFFF" numberOfLines={1}>{place.label}</StayzTxt>
                  <StayzTxt v="caption" color="rgba(255,255,255,0.9)" numberOfLines={1}>{place.sub}</StayzTxt>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </StayzSection>

        <StayzSection title="Things to do in Haïti">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRow}>
            {discoveryCards.slice(0, 1).map(item => (
              <Pressable key={item.action} accessibilityRole="button" onPress={() => openDiscovery(item.action)} style={[styles.experienceCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
                <StayzPhotoSlot uri={item.image} style={styles.experiencePhoto} icon={item.icon} />
                <View style={styles.experienceBody}>
                  <View style={[styles.experienceIcon, { backgroundColor: colors.brandSoft }]}><Ionicons name={item.icon} size={18} color={colors.brand} /></View>
                  <StayzTxt v="h3">{item.title}</StayzTxt>
                  <StayzTxt v="small" sub>{item.subtitle}</StayzTxt>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </StayzSection>

        <View style={styles.discoveryGrid}>
          {discoveryCards.slice(1).map(item => (
            <Pressable key={item.action} accessibilityRole="button" onPress={() => openDiscovery(item.action)} style={[styles.discoveryTile, { backgroundColor: colors.card, borderColor: colors.line }]}>
              <StayzPhotoSlot uri={item.image} style={styles.discoveryPhoto} icon={item.icon} />
              <View style={styles.discoveryTileBody}>
                <View style={[styles.discoveryIcon, { backgroundColor: colors.brandSoft }]}><Ionicons name={item.icon} size={17} color={colors.brand} /></View>
                <StayzTxt v="h3" numberOfLines={1}>{item.title}</StayzTxt>
                <StayzTxt v="caption" sub numberOfLines={2}>{item.subtitle}</StayzTxt>
              </View>
            </Pressable>
          ))}
        </View>

        <StayzSection title="Special offers" action={<Pressable accessibilityRole="button" onPress={() => { setMode('dayuse'); nav.navigate('Results'); }}><StayzTxt v="small" bold color={colors.brand}>View stays</StayzTxt></Pressable>}>
          <View style={styles.offerStack}>
            {specialOffers.map(offer => (
              <Pressable key={offer.tag} accessibilityRole="button" onPress={() => { setMode(offer.mode); nav.navigate('Results'); }} style={[styles.offerCard, { backgroundColor: offer.tone }]}>
                <View style={styles.offerCopy}>
                  <StayzTxt v="caption" color={offer.accent} style={styles.offerTag}>{offer.tag}</StayzTxt>
                  <StayzTxt v="h3" style={{ color: '#1B2430' }}>{offer.title}</StayzTxt>
                  <StayzTxt v="small" color="#5F6874">{offer.detail}</StayzTxt>
                </View>
                <View style={[styles.offerArrow, { backgroundColor: offer.accent }]}><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></View>
              </Pressable>
            ))}
          </View>
        </StayzSection>

        <StayzSection title="Recent searches">
          {recent.length ? (
            <View style={styles.recentStack}>
              {recent.map(place => (
                <Pressable key={place.label} accessibilityRole="button" onPress={() => openPlace(place)} style={[styles.recentRow, { backgroundColor: colors.card, borderColor: colors.line }]}>
                  <View style={[styles.recentIcon, { backgroundColor: '#FCEBEC' }]}><Ionicons name="time-outline" size={19} color="#D92D36" /></View>
                  <View style={styles.recentCopy}>
                    <StayzTxt v="h3">{place.label}</StayzTxt>
                    <StayzTxt v="caption" sub>{place.sub} · {search.mode === 'hourly' ? 'Hourly stay' : search.mode === 'dayuse' ? 'Day use' : search.mode === 'extended' ? 'Extended stay' : 'Accommodation'}</StayzTxt>
                  </View>
                  <Ionicons name="arrow-up-right" size={18} color={colors.sub} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyRecent, { backgroundColor: colors.card, borderColor: colors.line }]}>
              <Ionicons name="time-outline" size={22} color={colors.sub} />
              <View style={styles.recentCopy}>
                <StayzTxt v="h3">Your searches will appear here</StayzTxt>
                <StayzTxt v="small" sub>Choose a destination above to keep it handy for your next visit.</StayzTxt>
              </View>
            </View>
          )}
        </StayzSection>

        <StayzSection title="Stays near you" action={<Pressable onPress={() => nav.navigate('Results')} accessibilityRole="button"><StayzTxt v="small" bold color={colors.brand}>See all</StayzTxt></Pressable>}>
          {nearby.loading ? <View style={styles.propertyRow}><StayzCardSkeleton /><StayzCardSkeleton /></View> : nearby.error ? <StayzErrorView message={nearby.error} onRetry={nearby.reload} /> : sorted.length === 0 ? (
            <StayzStateView icon="bed-outline" title="No stays available" body="Try another date or stay type." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyRow}>
              {sorted.slice(0, 8).map(l => <StayzPropertyCard key={l.id} listing={l} search={search} compact onPress={() => nav.navigate('Property', { id: l.id })} />)}
            </ScrollView>
          )}
        </StayzSection>

        <View style={[styles.confidenceCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <View style={styles.confidenceHeading}>
            <View style={styles.confidenceMark}><Ionicons name="shield-checkmark-outline" size={23} color="#D92D36" /></View>
            <View style={styles.confidenceCopy}>
              <StayzTxt v="h2">Book with confidence</StayzTxt>
              <StayzTxt v="small" sub>Clear details before you confirm.</StayzTxt>
            </View>
          </View>
          <View style={styles.confidenceDivider} />
          <View style={styles.confidencePoint}><Ionicons name="checkmark-circle" size={18} color="#128F82" /><StayzTxt v="small">Availability checked before booking</StayzTxt></View>
          <View style={styles.confidencePoint}><Ionicons name="checkmark-circle" size={18} color="#128F82" /><StayzTxt v="small">Upfront prices and booking details</StayzTxt></View>
          <View style={styles.confidencePoint}><Ionicons name="checkmark-circle" size={18} color="#128F82" /><StayzTxt v="small">Your reservation details in one place</StayzTxt></View>
        </View>
      </View>
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 0, paddingBottom: 38, gap: 0, backgroundColor: '#FFFEFD' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: '#FFFFFF' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#FCEBEC', alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#202630', fontSize: 23, lineHeight: 26, letterSpacing: -0.8 },
  brandTag: { fontSize: 9, letterSpacing: 1.05, marginTop: 1 },
  bell: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 7, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: '#D92D36', borderWidth: 2, borderColor: '#FFFFFF' },
  intro: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, backgroundColor: '#FFFFFF' },
  pageTitle: { color: '#202630', fontSize: 27, lineHeight: 32, letterSpacing: -0.65 },
  pageSubtitle: { marginTop: 5, fontSize: 13, lineHeight: 19 },
  searchWrap: { marginHorizontal: 16, marginTop: 2, marginBottom: 28 },
  sections: { paddingHorizontal: 16, gap: 28 },
  categoryRow: { gap: 12, paddingRight: 16 },
  categoryCard: { width: 154, borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  categoryPhotoWrap: { height: 104, position: 'relative', backgroundColor: '#F3E8E5' },
  categoryPhoto: { width: '100%', height: '100%' },
  categoryPhotoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,21,29,0.12)' },
  categoryIcon: { position: 'absolute', right: 9, top: 9, width: 31, height: 31, borderRadius: 10, backgroundColor: 'rgba(22,27,34,0.64)', alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { paddingHorizontal: 11, paddingVertical: 11, gap: 4 },
  propertyRow: { flexDirection: 'row', gap: 14, paddingRight: 16 },
  destinationRow: { gap: 12, paddingRight: 16 },
  destinationCard: { width: 194, height: 150, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E8E8E8' },
  destinationImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  destinationShade: { flex: 1, justifyContent: 'flex-end', padding: 12, backgroundColor: 'rgba(13,19,27,0.36)' },
  discoveryRow: { gap: 12, paddingRight: 16 },
  experienceCard: { width: 276, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  experiencePhoto: { height: 144, width: '100%' },
  experienceBody: { padding: 13, gap: 5 },
  experienceIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  discoveryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  discoveryTile: { width: '47.5%', flexGrow: 1, borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  discoveryPhoto: { height: 105, width: '100%' },
  discoveryTileBody: { padding: 10, gap: 5 },
  discoveryIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  offerStack: { gap: 11 },
  offerCard: { borderRadius: 17, padding: 15, minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerCopy: { flex: 1, gap: 5 },
  offerTag: { fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  offerArrow: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentStack: { gap: 9 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 15, padding: 12 },
  recentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentCopy: { flex: 1, gap: 3 },
  emptyRecent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 15, borderWidth: 1 },
  confidenceCard: { borderWidth: 1, borderRadius: 19, padding: 16, gap: 12 },
  confidenceHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  confidenceMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#FCEBEC', alignItems: 'center', justifyContent: 'center' },
  confidenceCopy: { flex: 1, gap: 3 },
  confidenceDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#EAE2DE', marginVertical: 1 },
  confidencePoint: { flexDirection: 'row', alignItems: 'center', gap: 9 },
});
