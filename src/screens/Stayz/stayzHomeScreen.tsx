import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { StayzPropertyCard } from './stayzPropertyCard';
import { StayzStateView, StayzErrorView, StayzCardSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { StayzSearchPanel } from './stayzSearchPanel';
import { DESTINATIONS, THEMES } from './stayzPlaces';
import { useStayzAsync } from './stayzUseAsync';
import { distanceFrom } from './stayzListings';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzTheme } from './stayzThemeContext';
import { addDays } from './stayzDates';
import { StayzPhotoSlot } from './stayzPhotoSlot';
import { StayzWhereSheet } from './stayzWhereSheet';
import { useStayzHost } from './stayzHostContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const destinationPhotos: Record<string, string> = {
  'Port-au-Prince': 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=720&q=85',
  'Cap-Haïtien': 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=720&q=85',
  Jacmel: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=720&q=85',
  'Les Cayes': 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=720&q=85',
  Labadee: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=720&q=85',
};

const popularDestinations = [
  { label: 'Port-au-Prince', sub: 'Capital energy, markets & nightlife', place: DESTINATIONS[0] },
  { label: 'Cap-Haïtien', sub: 'History, harbor & the Citadelle', place: DESTINATIONS[3] },
  { label: 'Jacmel', sub: 'Art, beaches & carnival', place: DESTINATIONS[2] },
  { label: 'Les Cayes', sub: 'Southern coast', place: DESTINATIONS[7] },
  { label: 'Labadee', sub: 'North-coast beaches', place: { label: 'Labadee', sub: 'Nord, Haiti', lat: 19.77, lng: -72.25 } },
];

const stayCategories = [
  { key: 'hotels', filterType: 'Hotel', title: 'Hotels', subtitle: 'Comfort for every trip', tone: '#FCEDEC', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=720&q=85', source: require('../../assets/Stayz/stayzHotels.png'), icon: 'bed-outline' as const },
  { key: 'resorts', filterType: 'Resort', title: 'Resorts', subtitle: 'Pools, beaches & escapes', tone: '#E6F2FF', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=720&q=85', source: require('../../assets/Stayz/stayzResorts.png'), icon: 'sunny-outline' as const },
  { key: 'apartments', filterType: 'Apartment', title: 'Apartments', subtitle: 'Space to feel at home', tone: '#FFF1E6', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=720&q=85', source: require('../../assets/Stayz/apartmentsStayz.png'), icon: 'business-outline' as const },
  { key: 'guesthouses', filterType: 'Guesthouse', title: 'Guest houses', subtitle: 'Warm local hospitality', tone: '#EAF2FF', image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=720&q=85', icon: 'cafe-outline' as const },
  { key: 'villas', filterType: 'Villa', title: 'Villas', subtitle: 'Privacy and room to unwind', tone: '#F4EDFA', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=720&q=85', icon: 'home-outline' as const },
];

const quickStrip = [
  { title: 'Activities', icon: 'compass-outline' as const, tone: '#FCEBEC', accent: '#D92D36', action: 'activities' },
  { title: 'Airport pickup', icon: 'airplane-outline' as const, tone: '#E6F2FF', accent: '#2F80ED', action: 'airport' },
  { title: 'Car rentals', icon: 'car-sport-outline' as const, tone: '#F1ECFA', accent: '#7656A8', action: 'cars' },
  { title: 'Day passes', icon: 'ticket-outline' as const, tone: '#FFF1E6', accent: '#B86A24', action: 'daypasses' },
];

const activityCards = [
  { title: 'Citadelle Laferrière', subtitle: 'Guided hike & fortress visit', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=720&q=85', tag: 'TOURS' },
  { title: 'Jacmel beach day', subtitle: 'Coastline, local food & music', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=720&q=85', tag: 'EXPERIENCES' },
  { title: 'Local art & markets', subtitle: 'Discover Haitian craft and culture', image: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=720&q=85', tag: 'CULTURE' },
];

const specialOffers = [
  { title: 'Explore day-use stays', detail: 'Find a place to unwind during the day.', tag: 'DAY USE', tone: '#FCEBEC', accent: '#C92532', mode: 'dayuse' as const },
  { title: 'Stay a little longer', detail: 'Explore weekly and extended-stay options.', tag: 'LONG STAYS', tone: '#E6F2FF', accent: '#2F80ED', mode: 'extended' as const },
];

export const StayzHomeScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors, isDark } = useStayzTheme();
  const api = useStayzApi();
  const { search, setSearch, setMode, filters, setFilters, locationStatus, locate } = useStayzSearch();
  const { onExitToWantiss } = useStayzHost();
  const [where, setWhere] = useState(false);
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
  const recent = recentPlaces.slice(0, 4);

  const rememberPlace = (place: (typeof DESTINATIONS)[number]) => {
    setRecentPlaces(previous => [place, ...previous.filter(p => p.label !== place.label)].slice(0, 4));
  };

  const openPlace = (place: (typeof DESTINATIONS)[number]) => {
    rememberPlace(place);
    setSearch({ place });
    nav.navigate('Results');
  };

  const openDiscovery = (action: string) => {
    if (action === 'daypasses') {
      setMode('dayuse');
      nav.navigate('Results');
      return;
    }
    Alert.alert('Coming soon', 'This service is not connected in the current app yet.');
  };

  return (
    <StayzScreen back={false} accentStripe={false} contentStyle={styles.content}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => { if (nav.canGoBack()) nav.goBack(); else onExitToWantiss(); }}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </Pressable>
        <View style={styles.brand}>
          <View style={styles.brandMark}><Ionicons name="bed" size={20} color={colors.brand} /></View>
          <View style={styles.brandCopy}>
            <StayzTxt v="h2" style={[styles.brandName, { color: colors.text }]}>stayz</StayzTxt>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh current location" onPress={() => { void locate(); }} style={styles.locationLine}>
              <Ionicons name="location" size={14} color={colors.teal} />
              <StayzTxt v="caption" color={colors.teal} numberOfLines={1}>
                {search.place?.current ? (search.place.sub || 'Current location') : search.place?.label ?? 'Current location'}
              </StayzTxt>
              <Ionicons name="chevron-down" size={12} color={colors.teal} />
            </Pressable>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} style={[styles.bell, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <StayzSearchPanel onSubmit={() => { if (search.place) rememberPlace(search.place as (typeof DESTINATIONS)[number]); nav.navigate('Results'); }} />
      </View>

      <View style={styles.sections}>
        <StayzSection title="Find your kind of stay">
          <View style={styles.categoryGrid}>
            <View style={styles.categoryTopRow}>
              {stayCategories.slice(0, 2).map(category => (
                <Pressable key={category.key} accessibilityRole="button" onPress={() => { setFilters({ ...filters, types: [category.filterType as any] }); nav.navigate('Results'); }} style={[styles.categoryBig, category.key === 'hotels' && styles.categoryHotelsCard, { backgroundColor: isDark ? colors.card : category.tone }]}>
                  <View style={[styles.categoryBigCopy, category.key === 'hotels' && styles.categoryHotelsCopy]}>
                    <StayzTxt v="h2" style={[styles.categoryBigTitle, { color: category.key === 'resorts' ? '#FFFFFF' : colors.text }]}>{category.title}</StayzTxt>
                    <StayzTxt v="caption" color={category.key === 'resorts' ? '#FFFFFF' : category.key === 'hotels' ? '#252525' : '#626D78'} style={category.key === 'hotels' ? styles.categoryHotelsSubtitle : undefined}>{category.subtitle}</StayzTxt>
                  </View>
                  <StayzPhotoSlot uri={category.image} source={category.source} style={[styles.categoryBigPhoto, category.key === 'hotels' && styles.categoryHotelsPhoto, category.key === 'resorts' && styles.categoryResortsPhoto]} icon={category.icon} />
                </Pressable>
              ))}
            </View>
            <View style={styles.categoryBottomRow}>
              {stayCategories.slice(2).map(category => (
                <Pressable key={category.key} accessibilityRole="button" onPress={() => { setFilters({ ...filters, types: [category.filterType as any] }); nav.navigate('Results'); }} style={[styles.categorySmall, { backgroundColor: isDark ? colors.card : category.tone }]}>
                  <StayzPhotoSlot uri={category.image} source={category.source} style={styles.categorySmallPhoto} icon={category.icon} />
                  <StayzTxt v="small" bold numberOfLines={2} style={[styles.categorySmallTitle, { color: colors.text }]}>{category.title}</StayzTxt>
                </Pressable>
              ))}
            </View>
          </View>
        </StayzSection>

        <View style={styles.quickStrip}>
          {quickStrip.map(item => (
            <Pressable key={item.action} accessibilityRole="button" onPress={() => openDiscovery(item.action)} style={styles.quickItem}>
              <View style={[styles.quickIcon, { backgroundColor: isDark ? colors.tealSoft : item.tone }]}><Ionicons name={item.icon} size={21} color={item.accent} /></View>
              <StayzTxt v="caption" bold numberOfLines={2} style={[styles.quickLabel, { color: colors.text }]}>{item.title}</StayzTxt>
            </Pressable>
          ))}
        </View>

        <StayzSection title="Explore Haiti differently">
          <View style={styles.themeList}>
            {THEMES.map((theme, index) => {
              const accents = ['#2F80ED', '#D92D36', '#7656A8', '#B86A24'];
              const tones = [colors.tealSoft, colors.brandSoft, '#F1ECFA', '#FFF1E6'];
              return (
                <Pressable key={theme.key} accessibilityRole="button" onPress={() => openPlace(theme.place)} style={[styles.themeRow, { backgroundColor: colors.card, borderColor: colors.line }]}>
                  <View style={[styles.themeIcon, { backgroundColor: tones[index % tones.length] }]}><Ionicons name={theme.icon} size={21} color={accents[index % accents.length]} /></View>
                  <View style={styles.themeCopy}>
                    <StayzTxt v="h3">{theme.title}</StayzTxt>
                    <StayzTxt v="small" sub>{theme.sub}</StayzTxt>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.sub} />
                </Pressable>
              );
            })}
          </View>
        </StayzSection>

        <StayzSection title="Popular destinations" action={<Pressable accessibilityRole="button" onPress={() => setWhere(true)}><StayzTxt v="small" bold color={colors.brand}>See all</StayzTxt></Pressable>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>
            {popularDestinations.map(place => (
              <Pressable key={place.label} accessibilityRole="button" onPress={() => openPlace(place.place)} style={styles.destinationCard}>
                <StayzPhotoSlot uri={destinationPhotos[place.label]} style={styles.destinationImage} icon="location-outline" />
                <View style={styles.destinationShade}>
                  <StayzTxt v="h3" color="#FFFFFF" numberOfLines={1}>{place.label}</StayzTxt>
                  <StayzTxt v="caption" color="rgba(255,255,255,0.9)" numberOfLines={1}>{place.sub}</StayzTxt>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </StayzSection>

        <StayzSection title="Available by the hour" action={<Pressable accessibilityRole="button" onPress={() => { setMode('hourly'); nav.navigate('Results'); }}><StayzTxt v="small" bold color={colors.brand}>See all</StayzTxt></Pressable>}>
          <StayzTxt v="caption" sub>{search.mode === 'hourly' ? 'Flexible stays for a few hours, with times and prices shown before booking.' : 'Browse hourly options, then choose your preferred time and duration.'}</StayzTxt>
          {hourly.loading ? <View style={styles.propertyRow}><View style={styles.skeletonCard}><StayzCardSkeleton /></View><View style={styles.skeletonCard}><StayzCardSkeleton /></View></View> : hourly.error ? <StayzErrorView message={hourly.error} onRetry={hourly.reload} /> : hourlySorted.length === 0 ? (
            <StayzStateView icon="time-outline" title="Flexible hourly stays" body="Find a room for a few hours, with availability and times shown before you book." action="Explore hourly stays" onAction={() => { setMode('hourly'); nav.navigate('Results'); }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyRow}>
              {hourlySorted.slice(0, 8).map(l => <StayzPropertyCard key={l.id} listing={l} search={{ ...search, mode: 'hourly' }} compact onPress={() => nav.navigate('Property', { id: l.id })} />)}
            </ScrollView>
          )}
        </StayzSection>

        <StayzSection title="Things to do in Haïti" action={<Pressable accessibilityRole="button" onPress={() => openDiscovery('activities')}><StayzTxt v="small" bold color={colors.brand}>See all</StayzTxt></Pressable>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRow}>
            {activityCards.map(item => (
              <Pressable key={item.title} accessibilityRole="button" onPress={() => openDiscovery('activities')} style={[styles.experienceCard, { backgroundColor: colors.card, borderColor: colors.line }]}>
                <StayzPhotoSlot uri={item.image} style={styles.experiencePhoto} icon="compass-outline" />
                <View style={styles.experienceBody}>
                  <StayzTxt v="caption" color="#D92D36" style={styles.offerTag}>{item.tag}</StayzTxt>
                  <StayzTxt v="h3">{item.title}</StayzTxt>
                  <StayzTxt v="small" sub>{item.subtitle}</StayzTxt>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </StayzSection>

        <StayzSection title="Special offers" action={<Pressable accessibilityRole="button" onPress={() => { setMode('dayuse'); nav.navigate('Results'); }}><StayzTxt v="small" bold color={colors.brand}>View stays</StayzTxt></Pressable>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offerRow}>
            {specialOffers.map(offer => (
              <Pressable key={offer.tag} accessibilityRole="button" onPress={() => { setMode(offer.mode); nav.navigate('Results'); }} style={[styles.offerCard, { backgroundColor: isDark ? colors.card : offer.tone, borderColor: colors.line, borderWidth: isDark ? 1 : 0 }]}>
                <View style={styles.offerCopy}>
                  <StayzTxt v="caption" color={offer.accent} style={styles.offerTag}>{offer.tag}</StayzTxt>
                  <StayzTxt v="h3" style={{ color: isDark ? colors.text : '#1B2430' }}>{offer.title}</StayzTxt>
                  <StayzTxt v="small" color={isDark ? colors.sub : '#5F6874'}>{offer.detail}</StayzTxt>
                </View>
                <View style={[styles.offerArrow, { backgroundColor: offer.accent }]}><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></View>
              </Pressable>
            ))}
          </ScrollView>
        </StayzSection>

        <StayzSection title="Recent searches" action={recent.length ? <Pressable accessibilityRole="button" onPress={() => setRecentPlaces([])}><StayzTxt v="small" bold color={colors.brand}>Clear</StayzTxt></Pressable> : undefined}>
          {recent.length ? (
            <View style={styles.recentStack}>
              {recent.map(place => (
                <Pressable key={place.label} accessibilityRole="button" onPress={() => openPlace(place)} style={[styles.recentRow, { backgroundColor: colors.card, borderColor: colors.line }]}>
                  <View style={[styles.recentIcon, { backgroundColor: '#FCEBEC' }]}><Ionicons name="time-outline" size={19} color="#D92D36" /></View>
                  <View style={styles.recentCopy}>
                    <StayzTxt v="h3">{place.label}</StayzTxt>
                    <StayzTxt v="caption" sub>{place.sub} · {search.mode === 'hourly' ? 'Hourly' : search.mode === 'dayuse' ? 'Day use' : search.mode === 'extended' ? 'Extended' : 'Overnight'}</StayzTxt>
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
          {nearby.loading ? <View style={styles.propertyRow}><View style={styles.skeletonCard}><StayzCardSkeleton /></View><View style={styles.skeletonCard}><StayzCardSkeleton /></View></View> : nearby.error ? <StayzErrorView message={nearby.error} onRetry={nearby.reload} /> : sorted.length === 0 ? (
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
      <StayzWhereSheet visible={where} onClose={() => setWhere(false)} />
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  content: { padding: 0, paddingBottom: 120, gap: 0 },
  header: { height: 100, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 4, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 44, height: 44, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandCopy: { flex: 1, minWidth: 0, gap: 3 },
  locationLine: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, maxWidth: '100%' },
  brandMark: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#FCEBEC', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 23, lineHeight: 26, letterSpacing: -0.8 },
  bell: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 7, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: '#D92D36', borderWidth: 2, borderColor: '#FFFFFF' },
  searchWrap: { marginHorizontal: 16, marginTop: 18, marginBottom: 28 },
  sections: { paddingHorizontal: 16, gap: 28 },
  categoryGrid: { gap: 10 },
  categoryTopRow: { flexDirection: 'row', gap: 10 },
  categoryBig: { flex: 1, minHeight: 132, borderRadius: 17, padding: 13, overflow: 'hidden', justifyContent: 'space-between' },
  categoryHotelsCard: { minHeight: 132, borderRadius: 17 },
  categoryBigCopy: { maxWidth: '72%', gap: 5, zIndex: 1 },
  categoryHotelsCopy: { paddingRight: 4 },
  categoryHotelsSubtitle: { color: '#252525' },
  categoryBigTitle: { fontSize: 19, lineHeight: 23 },
  categoryBigPhoto: { position: 'absolute', right: 0, bottom: 0, width: 112, height: 96, borderTopLeftRadius: 24 },
  categoryHotelsPhoto: { width: 157, height: 122, borderTopLeftRadius: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  categoryResortsPhoto: { width: 157, height: 122, borderTopLeftRadius: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  categoryBottomRow: { flexDirection: 'row', gap: 10 },
  categorySmall: { flex: 1, minWidth: 0, minHeight: 114, borderRadius: 15, padding: 8, overflow: 'hidden', justifyContent: 'space-between' },
  categorySmallPhoto: { width: '100%', height: 64, borderRadius: 10 },
  categorySmallTitle: { lineHeight: 16, minHeight: 32 },
  quickStrip: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: -8 },
  quickItem: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 7 },
  quickIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { textAlign: 'center', minHeight: 30 },
  themeList: { gap: 9 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderWidth: 1, borderRadius: 15 },
  themeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  themeCopy: { flex: 1, gap: 3 },
  propertyRow: { flexDirection: 'row', gap: 14, paddingRight: 16 },
  skeletonCard: { width: 250 },
  destinationRow: { gap: 12, paddingRight: 16 },
  destinationCard: { width: 194, height: 150, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E8E8E8' },
  destinationImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  destinationShade: { flex: 1, justifyContent: 'flex-end', padding: 12, backgroundColor: 'rgba(13,19,27,0.44)' },
  discoveryRow: { gap: 12, paddingRight: 16 },
  experienceCard: { width: 276, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  experiencePhoto: { height: 144, width: '100%' },
  experienceBody: { padding: 13, gap: 5 },
  offerRow: { gap: 12, paddingRight: 16 },
  offerCard: { width: 270, borderRadius: 16, padding: 15, minHeight: 126, flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerCopy: { flex: 1, gap: 5 },
  offerTag: { fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  offerArrow: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
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
