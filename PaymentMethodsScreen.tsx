import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PaymentIcon } from '../components/PaymentIcon';
import { Screen } from '../components/Screen';
import { ErrorView, Skeleton } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useDraft } from '../store/DraftContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const BRANDS = ['Visa', 'Mastercard', 'Discover', 'JCB', 'UnionPay'];

export const PaymentMethodsScreen = () => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { money } = useSettings();
  const { draft, setDraft } = useDraft();
  const methods = useAsync(() => api.listPaymentMethods(), [api]);
  const wallet = useAsync(() => api.walletBalance(), [api]);

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
    <Screen title="Payment method" footer={<Button title="Add a card" kind="secondary" icon="add" onPress={() => nav.navigate('AddCard')} />}>
      {methods.loading ? (
        <>
          <Skeleton height={64} radius={16} />
          <Skeleton height={64} radius={16} />
        </>
      ) : methods.error ? (
        <ErrorView message={methods.error} onRetry={methods.reload} />
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
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: on ? colors.brand : colors.line, borderWidth: on ? 2 : 1 }}>
                <PaymentIcon method={m} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3">{m.detail ? `${m.label} ${m.detail}` : m.label}</Txt>
                  {m.kind === 'wallet' ? (
                    <Txt v="small" sub>
                      Balance {money(wallet.data ?? 0)}
                    </Txt>
                  ) : null}
                </View>
                {m.kind === 'card' ? (
                  <Pressable accessibilityLabel="Remove card" onPress={() => remove(m.id, `${m.label} ${m.detail ?? ''}`)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={colors.sub} />
                  </Pressable>
                ) : null}
                {on ? <Ionicons name="checkmark-circle" size={22} color={colors.brand} /> : null}
              </Card>
            </Pressable>
          );
        })
      )}
      <Txt v="small" sub>
        Accepted cards: {BRANDS.join(', ')}.
      </Txt>
    </Screen>
  );
};
