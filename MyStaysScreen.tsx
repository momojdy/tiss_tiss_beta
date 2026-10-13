import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { PhotoSlot } from '../components/PhotoSlot';
import { Screen } from '../components/Screen';
import { ErrorView, ListSkeleton, StateView } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { bucketOf } from '../lib/booking';
import { fmtDateTime } from '../lib/dates';
import { RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useSettings } from '../store/SettingsContext';
import { Booking, BookingStatus } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const TABS = ['Upcoming', 'In stay', 'Past', 'Cancelled'] as const;

export const statusTone = (s: BookingStatus) =>
  s === 'Cancelled' || s === 'No-show' ? 'danger' : s === 'Completed' ? 'neutral' : s === 'Requested' ? 'warn' : 'teal';

export const BookingCard = ({ b, onPress }: { b: Booking; onPress: () => void }) => {
  const { money } = useSettings();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
        <PhotoSlot uri={b.photo} icon="bed-outline" style={{ width: 84, height: 84, borderRadius: 16 }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt v="h3" numberOfLines={1}>
            {b.title}
          </Txt>
          <Txt v="small" sub numberOfLines={1}>
            {b.city} · {fmtDateTime(b.start)}
          </Txt>
          <Txt v="small">{money(b.total)}</Txt>
          <Badge label={b.status} tone={statusTone(b.status)} />
        </View>
      </Card>
    </Pressable>
  );
};

export const MyStaysScreen = () => {
  const nav = useNavigation<Nav>();
  const api = useApi();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Upcoming');
  const { data, loading, error, reload } = useAsync(() => api.listBookings(), [api]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, []),
  );

  const list = (data ?? []).filter(b => bucketOf(b) === tab);

  return (
    <Screen title="My stays" back={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TABS.map(t => (
          <Chip key={t} label={t} on={tab === t} onPress={() => setTab(t)} />
        ))}
      </ScrollView>
      {loading && !data ? (
        <ListSkeleton count={2} />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <StateView
          icon="calendar-outline"
          title={tab === 'Upcoming' ? 'No upcoming stays' : tab === 'In stay' ? 'You are not checked in anywhere' : tab === 'Past' ? 'No past stays yet' : 'No cancelled stays'}
          body={tab === 'Upcoming' ? 'Find a place to stay and it will show up here.' : undefined}
          action={tab === 'Upcoming' ? 'Find a stay' : undefined}
          onAction={() => nav.navigate('Tabs', { screen: 'Home' })}
        />
      ) : (
        list.map(b => <BookingCard key={b.id} b={b} onPress={() => nav.navigate('BookingDetail', { id: b.id })} />)
      )}
    </Screen>
  );
};
