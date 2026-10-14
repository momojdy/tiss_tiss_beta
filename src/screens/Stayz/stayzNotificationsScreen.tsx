import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzCard } from './stayzCard';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzListSkeleton, StayzStateView } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { fmtDateTime } from './stayzDates';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzTheme } from './stayzThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzNotificationsScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { data, loading, error, reload } = useStayzAsync(() => api.listNotices(), [api]);

  useEffect(() => {
    if (data && data.some(n => !n.read)) api.markNoticesRead().catch(() => undefined);
  }, [api, data]);

  return (
    <StayzScreen title="Notifications">
      {loading && !data ? (
        <StayzListSkeleton count={3} />
      ) : error ? (
        <StayzErrorView message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <StayzStateView icon="notifications-outline" title="You are all caught up" body="Updates about your stays will appear here." />
      ) : (
        (data ?? []).map(n => (
          <Pressable key={n.id} accessibilityRole="button" disabled={!n.bookingId} onPress={() => n.bookingId && nav.navigate('BookingDetail', { id: n.bookingId })}>
            <StayzCard style={{ gap: 4, borderColor: n.read ? colors.line : colors.brand }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <StayzTxt v="h3" style={{ flex: 1 }}>
                  {n.title}
                </StayzTxt>
                {!n.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand, marginTop: 6 }} /> : null}
              </View>
              <StayzTxt sub>{n.body}</StayzTxt>
              <StayzTxt v="small" sub>
                {fmtDateTime(n.createdAt)}
              </StayzTxt>
            </StayzCard>
          </Pressable>
        ))
      )}
    </StayzScreen>
  );
};
