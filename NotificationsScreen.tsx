import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ErrorView, ListSkeleton, StateView } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { fmtDateTime } from '../lib/dates';
import { RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const NotificationsScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { data, loading, error, reload } = useAsync(() => api.listNotices(), [api]);

  useEffect(() => {
    if (data && data.some(n => !n.read)) api.markNoticesRead().catch(() => undefined);
  }, [api, data]);

  return (
    <Screen title="Notifications">
      {loading && !data ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <StateView icon="notifications-outline" title="You are all caught up" body="Updates about your stays will appear here." />
      ) : (
        (data ?? []).map(n => (
          <Pressable key={n.id} accessibilityRole="button" disabled={!n.bookingId} onPress={() => n.bookingId && nav.navigate('BookingDetail', { id: n.bookingId })}>
            <Card style={{ gap: 4, borderColor: n.read ? colors.line : colors.brand }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt v="h3" style={{ flex: 1 }}>
                  {n.title}
                </Txt>
                {!n.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand, marginTop: 6 }} /> : null}
              </View>
              <Txt sub>{n.body}</Txt>
              <Txt v="small" sub>
                {fmtDateTime(n.createdAt)}
              </Txt>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
};
