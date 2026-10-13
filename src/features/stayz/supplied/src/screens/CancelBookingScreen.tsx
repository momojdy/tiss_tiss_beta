import React, { useState } from 'react';
import { View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ErrorView, Skeleton } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { policyText, refundFor } from '../lib/cancellation';
import { RootProps } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';

export const CancelBookingScreen = ({ route }: RootProps<'CancelBooking'>) => {
  const nav = useNavigation();
  const { colors } = useTheme();
  const api = useApi();
  const { money } = useSettings();
  const { data: b, loading, error, reload } = useAsync(() => api.getBooking(route.params.id), [api, route.params.id]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState<{ amount: number } | null>(null);

  if (loading) return <Screen title="Cancel booking"><Skeleton height={160} radius={18} /></Screen>;
  if (error || !b) return <Screen title="Cancel booking"><ErrorView message={error ?? undefined} onRetry={reload} /></Screen>;

  const r = refundFor(b);

  const confirm = async () => {
    setBusy(true);
    setFailed('');
    try {
      const out = await api.cancelBooking(b.id);
      setDone({ amount: out.refund?.amount ?? 0 });
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'The booking could not be cancelled');
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Screen
        back={false}
        title="Booking cancelled"
        footer={<Button title="Done" onPress={() => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }))} />}>
        <Card style={{ gap: 8, backgroundColor: done.amount > 0 ? colors.tealSoft : colors.card }}>
          <Txt v="h2">{done.amount > 0 ? `Refund of ${money(done.amount)}` : 'No refund'}</Txt>
          <Txt sub>{done.amount > 0 ? `Refunds are paid to ${b.paymentLabel} within 14 business days.` : 'This booking was cancelled outside the free cancellation window.'}</Txt>
        </Card>
      </Screen>
    );

  return (
    <Screen
      title="Cancel booking"
      footer={
        <View style={{ gap: 10 }}>
          {failed ? <Txt color={colors.danger}>{failed}</Txt> : null}
          <Button title="Cancel this booking" kind="danger" onPress={confirm} loading={busy} />
          <Button title="Keep booking" kind="secondary" onPress={() => nav.goBack()} />
        </View>
      }>
      <Card style={{ gap: 6 }}>
        <Txt v="h2">{b.title}</Txt>
        <Txt sub>{policyText(b)}</Txt>
      </Card>
      <Card style={{ gap: 6, backgroundColor: r.amount > 0 ? colors.tealSoft : colors.dangerSoft }}>
        <Txt v="h3">{r.amount > 0 ? `You will be refunded ${money(r.amount)}${r.pct < 100 ? ` (${r.pct}%)` : ''}` : 'You will not be refunded'}</Txt>
        <Txt sub>Refunds arrive within 14 business days.</Txt>
      </Card>
      <Txt v="small" sub>
        No-shows are not refunded. Leaving early is up to the property and is not refundable.
      </Txt>
    </Screen>
  );
};
