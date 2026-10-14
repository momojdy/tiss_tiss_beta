import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzBadge } from './stayzBadge';
import { StayzCard } from './stayzCard';
import { StayzChip } from './stayzChip';
import { StayzPhotoSlot } from './stayzPhotoSlot';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzListSkeleton, StayzStateView } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { bucketOf } from './stayzBooking';
import { fmtDateTime } from './stayzDates';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSettings } from './stayzSettingsContext';
import { Booking, BookingStatus } from './stayzTypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TABS = ['Upcoming', 'In stay', 'Past', 'Cancelled'] as const;

export const statusTone = (s: BookingStatus) =>
  s === 'Cancelled' || s === 'No-show' ? 'danger' : s === 'Completed' ? 'neutral' : s === 'Requested' ? 'warn' : 'teal';

export const StayzBookingCard = ({ b, onPress }: { b: Booking; onPress: () => void }) => {
  const { money } = useStayzSettings();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <StayzCard style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
        <StayzPhotoSlot uri={b.photo} icon="bed-outline" style={{ width: 84, height: 84, borderRadius: 16 }} />
        <View style={{ flex: 1, gap: 3 }}>
          <StayzTxt v="h3" numberOfLines={1}>
            {b.title}
          </StayzTxt>
          <StayzTxt v="small" sub numberOfLines={1}>
            {b.city} · {fmtDateTime(b.start)}
          </StayzTxt>
          <StayzTxt v="small">{money(b.total)}</StayzTxt>
          <StayzBadge label={b.status} tone={statusTone(b.status)} />
        </View>
      </StayzCard>
    </Pressable>
  );
};

export const StayzMyStaysScreen = () => {
  const nav = useNavigation<Nav>();
  const api = useStayzApi();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Upcoming');
  const { data, loading, error, reload } = useStayzAsync(() => api.listBookings(), [api]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, []),
  );

  const list = (data ?? []).filter(b => bucketOf(b) === tab);

  return (
    <StayzScreen title="My stays">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map(t => (
          <StayzChip key={t} label={t} on={tab === t} onPress={() => setTab(t)} />
        ))}
      </ScrollView>
      {loading && !data ? (
        <StayzListSkeleton count={2} />
      ) : error ? (
        <StayzErrorView message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <StayzStateView
          icon="calendar-outline"
          title={tab === 'Upcoming' ? 'No upcoming stays' : tab === 'In stay' ? 'You are not checked in anywhere' : tab === 'Past' ? 'No past stays yet' : 'No cancelled stays'}
          body={tab === 'Upcoming' ? 'Find a place to stay and it will show up here.' : undefined}
          action={tab === 'Upcoming' ? 'Find a stay' : undefined}
          onAction={() => nav.navigate('Tabs', { screen: 'Home' })}
        />
      ) : (
        list.map(b => <StayzBookingCard key={b.id} b={b} onPress={() => nav.navigate('BookingDetail', { id: b.id })} />)
      )}
    </StayzScreen>
  );
};
