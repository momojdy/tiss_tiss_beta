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
import { THEMES } from './stayzPlaces';
import { useStayzAsync } from './stayzUseAsync';
import { distanceFrom } from './stayzListings';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzTheme } from './stayzThemeContext';
import { addDays } from './stayzDates';
import { StayzWhereSheet } from './stayzWhereSheet';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
    <StayzScreen back={false} contentStyle={{ gap: 22 }}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={() => setWhere(true)} style={styles.loc}>
          <Ionicons name="location" size={18} color={colors.brand} />
          <View style={{ flexShrink: 1 }}>
            <StayzTxt v="caption" sub>
              Searching near
            </StayzTxt>
            <StayzTxt v="h3" numberOfLines={1}>
              {search.place ? (search.place.current ? search.place.sub ?? 'Current location' : search.place.label) : 'Choose a place'}
            </StayzTxt>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.sub} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} style={[styles.bell, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {unread ? <View style={[styles.dot, { backgroundColor: colors.brand, borderColor: colors.card }]} /> : null}
        </Pressable>
      </View>

      <View style={{ gap: 4 }}>
        <StayzTxt v="hero">Where to next?</StayzTxt>
        <StayzTxt sub>Hourly, day use, overnight and extended stays.</StayzTxt>
      </View>

      <StayzSearchPanel onSubmit={() => nav.navigate('Results')} />

      <StayzSection title="Explore Haiti differently">
        <View style={styles.grid}>
          {THEMES.map(t => (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              onPress={() => {
                setSearch({ place: t.place });
                nav.navigate('Results');
              }}
              style={[styles.theme, { backgroundColor: colors.card, borderColor: colors.line }]}>
              <View style={[styles.themeIcon, { backgroundColor: colors.brandSoft }]}>
                <Ionicons name={t.icon} size={22} color={colors.brand} />
              </View>
              <StayzTxt v="h3">{t.title}</StayzTxt>
              <StayzTxt v="small" sub>
                {t.sub}
              </StayzTxt>
            </Pressable>
          ))}
        </View>
      </StayzSection>

      <StayzSection
        title="Stays near you"
        action={
          <Pressable onPress={() => nav.navigate('Results')} accessibilityRole="button">
            <StayzTxt v="small" bold color={colors.brand}>
              See all
            </StayzTxt>
          </Pressable>
        }>
        {nearby.loading ? (
          <StayzCardSkeleton />
        ) : nearby.error ? (
          <StayzErrorView message={nearby.error} onRetry={nearby.reload} />
        ) : sorted.length === 0 ? (
          <StayzStateView icon="bed-outline" title="No stays available" body="Try another date or stay type." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {sorted.slice(0, 8).map(l => (
              <StayzPropertyCard key={l.id} listing={l} search={search} compact onPress={() => nav.navigate('Property', { id: l.id })} />
            ))}
          </ScrollView>
        )}
      </StayzSection>
      <StayzWhereSheet visible={where} onClose={() => setWhere(false)} />
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  bell: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  theme: { width: '48%', flexGrow: 1, borderRadius: 20, borderWidth: 1, padding: 14, gap: 4 },
  themeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
