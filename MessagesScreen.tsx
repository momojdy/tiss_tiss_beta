import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ErrorView, ListSkeleton, StateView } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { fmtDate } from '../lib/dates';
import { RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const MessagesScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { data, loading, error, reload } = useAsync(() => api.listThreads(), [api]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, []),
  );

  return (
    <Screen title="Messages" back={false}>
      {loading && !data ? (
        <ListSkeleton count={3} />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <StateView icon="chatbubbles-outline" title="No messages yet" body="Message a property from its page or from your booking." />
      ) : (
        (data ?? []).map(t => (
          <Pressable key={t.id} accessibilityRole="button" onPress={() => nav.navigate('Chat', { id: t.id, title: t.title })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3">{t.title}</Txt>
                <Txt v="small" sub numberOfLines={1}>
                  {t.last || 'Say hello'}
                </Txt>
              </View>
              <Txt v="small" sub>
                {fmtDate(t.updatedAt.slice(0, 10))}
              </Txt>
              {t.unread ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
};
