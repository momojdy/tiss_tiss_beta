import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzButton } from './stayzButton';
import { StayzCard } from './stayzCard';
import { StayzPaymentIcon } from './stayzPaymentIcon';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzDraft } from './stayzDraftContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';
import { useFocusEffect } from '@react-navigation/native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const BRANDS = ['Visa', 'Mastercard', 'Discover', 'JCB', 'UnionPay'];

export const StayzPaymentMethodsScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { money } = useStayzSettings();
  const { draft, setDraft } = useStayzDraft();
  const methods = useStayzAsync(() => api.listPaymentMethods(), [api]);
  const wallet = useStayzAsync(() => api.walletBalance(), [api]);

  useFocusEffect(
    React.useCallback(() => {
      methods.reload();
    }, []),
  );

  const remove = (id: string, label: string) =>
    Alert.alert('Remove card', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await api.removeMethod(id);
          if (draft.methodId === id) setDraft({ methodId: 'wallet' });
          methods.reload();
        },
      },
    ]);

  return (
    <StayzScreen title="Payment method" footer={<StayzButton title="Add a card" kind="secondary" icon="add" onPress={() => nav.navigate('AddCard')} />}>
      {methods.loading ? (
        <>
          <StayzSkeleton height={64} radius={16} />
          <StayzSkeleton height={64} radius={16} />
        </>
      ) : methods.error ? (
        <StayzErrorView message={methods.error} onRetry={methods.reload} />
      ) : (
        (methods.data ?? []).map(m => {
          const on = draft.methodId === m.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setDraft({ methodId: m.id });
                nav.goBack();
              }}>
              <StayzCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? colors.brand : colors.line, borderWidth: on ? 2 : 1 }}>
                <StayzPaymentIcon method={m} />
                <View style={{ flex: 1 }}>
                  <StayzTxt v="h3">{m.detail ? `${m.label} ${m.detail}` : m.label}</StayzTxt>
                  {m.kind === 'wallet' ? (
                    <StayzTxt v="small" sub>
                      Balance {money(wallet.data ?? 0)}
                    </StayzTxt>
                  ) : null}
                </View>
                {m.kind === 'card' ? (
                  <Pressable accessibilityLabel="Remove card" onPress={() => remove(m.id, `${m.label} ${m.detail ?? ''}`)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={colors.sub} />
                  </Pressable>
                ) : null}
                {on ? <Ionicons name="checkmark-circle" size={22} color={colors.brand} /> : null}
              </StayzCard>
            </Pressable>
          );
        })
      )}
      <StayzTxt v="small" sub>
        Accepted cards: {BRANDS.join(', ')}.
      </StayzTxt>
    </StayzScreen>
  );
};
