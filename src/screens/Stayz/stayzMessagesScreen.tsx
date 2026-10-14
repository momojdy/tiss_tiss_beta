import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzCard } from './stayzCard';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzListSkeleton, StayzStateView } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { fmtDate } from './stayzDates';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzTheme } from './stayzThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzMessagesScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { data, loading, error, reload } = useStayzAsync(() => api.listThreads(), [api]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, []),
  );

  return (
    <StayzScreen title="Messages" back={false}>
      {loading && !data ? (
        <StayzListSkeleton count={3} />
      ) : error ? (
        <StayzErrorView message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <StayzStateView icon="chatbubbles-outline" title="No messages yet" body="Message a property from its page or from your booking." />
      ) : (
        (data ?? []).map(t => (
          <Pressable key={t.id} accessibilityRole="button" onPress={() => nav.navigate('Chat', { id: t.id, title: t.title })}>
            <StayzCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <StayzTxt v="h3">{t.title}</StayzTxt>
                <StayzTxt v="small" sub numberOfLines={1}>
                  {t.last || 'Say hello'}
                </StayzTxt>
              </View>
              <StayzTxt v="small" sub>
                {fmtDate(t.updatedAt.slice(0, 10))}
              </StayzTxt>
              {t.unread ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
            </StayzCard>
          </Pressable>
        ))
      )}
    </StayzScreen>
  );
};
