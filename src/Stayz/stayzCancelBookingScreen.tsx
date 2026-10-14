import React, { useState } from 'react';
import { View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StayzButton } from './stayzButton';
import { StayzCard } from './stayzCard';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { policyText, refundFor } from './stayzCancellation';
import { RootProps } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';

export const StayzCancelBookingScreen = ({ route }: RootProps<'CancelBooking'>) => {
  const nav = useNavigation();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { money } = useStayzSettings();
  const { data: b, loading, error, reload } = useStayzAsync(() => api.getBooking(route.params.id), [api, route.params.id]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const [done, setDone] = useState<{ amount: number } | null>(null);

  if (loading) return <StayzScreen title="Cancel booking"><StayzSkeleton height={160} radius={18} /></StayzScreen>;
  if (error || !b) return <StayzScreen title="Cancel booking"><StayzErrorView message={error ?? undefined} onRetry={reload} /></StayzScreen>;

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
      <StayzScreen
        back={false}
        title="Booking cancelled"
        footer={<StayzButton title="Done" onPress={() => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }))} />}>
        <StayzCard style={{ gap: 8, backgroundColor: done.amount > 0 ? colors.tealSoft : colors.card }}>
          <StayzTxt v="h2">{done.amount > 0 ? `Refund of ${money(done.amount)}` : 'No refund'}</StayzTxt>
          <StayzTxt sub>{done.amount > 0 ? `Refunds are paid to ${b.paymentLabel} within 14 business days.` : 'This booking was cancelled outside the free cancellation window.'}</StayzTxt>
        </StayzCard>
      </StayzScreen>
    );

  return (
    <StayzScreen
      title="Cancel booking"
      footer={
        <View style={{ gap: 10 }}>
          {failed ? <StayzTxt color={colors.danger}>{failed}</StayzTxt> : null}
          <StayzButton title="Cancel this booking" kind="danger" onPress={confirm} loading={busy} />
          <StayzButton title="Keep booking" kind="secondary" onPress={() => nav.goBack()} />
        </View>
      }>
      <StayzCard style={{ gap: 6 }}>
        <StayzTxt v="h2">{b.title}</StayzTxt>
        <StayzTxt sub>{policyText(b)}</StayzTxt>
      </StayzCard>
      <StayzCard style={{ gap: 6, backgroundColor: r.amount > 0 ? colors.tealSoft : colors.dangerSoft }}>
        <StayzTxt v="h3">{r.amount > 0 ? `You will be refunded ${money(r.amount)}${r.pct < 100 ? ` (${r.pct}%)` : ''}` : 'You will not be refunded'}</StayzTxt>
        <StayzTxt sub>Refunds arrive within 14 business days.</StayzTxt>
      </StayzCard>
      <StayzTxt v="small" sub>
        No-shows are not refunded. Leaving early is up to the property and is not refundable.
      </StayzTxt>
    </StayzScreen>
  );
};
