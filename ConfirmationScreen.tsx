import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ErrorView, Skeleton } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { fmtDateTime } from '../lib/dates';
import { RootProps } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';

export const ConfirmationScreen = ({ route }: RootProps<'Confirmation'>) => {
  const nav = useNavigation();
  const { colors } = useTheme();
  const api = useApi();
  const { money } = useSettings();
  const { data: b, loading, error, reload } = useAsync(() => api.getBooking(route.params.id), [api, route.params.id]);

  const toStays = () => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 2, routes: [{ name: 'Home' }, { name: 'Saved' }, { name: 'Stays' }, { name: 'Messages' }, { name: 'Profile' }] } }] }));
  const toDetail = () => nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'BookingDetail', params: { id: route.params.id } }] }));

  if (loading) return <Screen back={false}><Skeleton height={200} radius={20} /></Screen>;
  if (error || !b) return <Screen back={false}><ErrorView message={error ?? undefined} onRetry={reload} /></Screen>;

  const requested = b.status === 'Requested';
  return (
    <Screen
      back={false}
      footer={
        <View style={{ gap: 10 }}>
          <Button title="View booking" onPress={toDetail} />
          <Button title="Go to my stays" kind="secondary" onPress={toStays} />
        </View>
      }>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={requested ? 'hourglass-outline' : 'checkmark'} size={44} color={colors.teal} />
        </View>
        <Txt v="title" center>
          {requested ? 'Request sent' : 'Booking confirmed'}
        </Txt>
        <Txt sub center>
          {requested ? 'The property will confirm your request. You have been charged and will be refunded if it is declined.' : 'Your stay is booked. A confirmation is in your notifications.'}
        </Txt>
      </View>
      <Card style={{ gap: 6 }}>
        <Txt v="h2">{b.title}</Txt>
        <Txt sub>{b.city}</Txt>
        <Txt>
          {fmtDateTime(b.start)} → {fmtDateTime(b.end)}
        </Txt>
        <Txt sub>Paid {money(b.total)} with {b.paymentLabel}</Txt>
        {b.deposit > 0 ? <Txt v="small" sub>Deposit of {money(b.deposit)} is collected by the property at check-in.</Txt> : null}
        <Txt v="small" sub>Your door code appears 2 hours before check-in.</Txt>
      </Card>
    </Screen>
  );
};
