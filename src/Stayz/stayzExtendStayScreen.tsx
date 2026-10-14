import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzButton } from './stayzButton';
import { StayzCard } from './stayzCard';
import { StayzPaymentIcon } from './stayzPaymentIcon';
import { StayzRow } from './stayzRow';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzStepper } from './stayzStepper';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { extensionUnit } from './stayzPricing';
import { RootProps, RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzDraft } from './stayzDraftContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzExtendStayScreen = ({ route }: RootProps<'ExtendStay'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { money } = useStayzSettings();
  const { draft } = useStayzDraft();
  const booking = useStayzAsync(() => api.getBooking(route.params.id), [api, route.params.id]);
  const methods = useStayzAsync(() => api.listPaymentMethods(), [api]);
  const wallet = useStayzAsync(() => api.walletBalance(), [api]);
  const [units, setUnits] = useState(1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const b = booking.data;

  if (booking.loading || methods.loading) return <StayzScreen title="Extend your stay"><StayzSkeleton height={220} radius={18} /></StayzScreen>;
  if (booking.error || !b) return <StayzScreen title="Extend your stay"><StayzErrorView message={booking.error ?? undefined} onRetry={booking.reload} /></StayzScreen>;

  const unit = extensionUnit(b.mode);
  const price = Math.round((b.extPrice ?? 0) * units * 100) / 100;
  const method = (methods.data ?? []).find(m => m.id === draft.methodId) ?? (methods.data ?? [])[0];
  const low = method?.kind === 'wallet' && (wallet.data ?? 0) < price;
  const max = unit === 'hour' ? 8 : 30;

  const send = async () => {
    if (!method) return;
    setBusy(true);
    setFailed('');
    try {
      await api.requestExtension(b.id, units, price, method.id);
      nav.goBack();
    } catch (e) {
      setFailed(e instanceof Error && e.message === 'insufficient_balance' ? 'Your Wallet balance is too low.' : 'The request could not be sent. You have not been charged.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StayzScreen
      title="Extend your stay"
      footer={
        <View style={{ gap: 8 }}>
          {failed ? <StayzTxt color={colors.danger}>{failed}</StayzTxt> : null}
          {low ? <StayzTxt color={colors.danger} v="small">Your Wallet balance ({money(wallet.data ?? 0)}) is lower than the extension price.</StayzTxt> : null}
          <StayzButton title={`Request and pay ${money(price)}`} onPress={low ? () => nav.navigate('PaymentMethods') : send} loading={busy} />
        </View>
      }>
      <StayzCard style={{ gap: 12 }}>
        <StayzTxt v="h2">{b.title}</StayzTxt>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <StayzTxt v="h3">Extra {unit}s</StayzTxt>
            <StayzTxt v="small" sub>
              {money(b.extPrice ?? 0)} per {unit}, tax included
            </StayzTxt>
          </View>
          <StayzStepper value={units} min={1} max={max} onChange={setUnits} />
        </View>
      </StayzCard>
      <StayzCard>
        {method ? <StayzRow label={method.detail ? `${method.label} ${method.detail}` : method.label} sub={method.kind === 'wallet' ? `Balance ${money(wallet.data ?? 0)}` : undefined} onPress={() => nav.navigate('PaymentMethods')} right={<StayzPaymentIcon method={method} />} /> : null}
      </StayzCard>
      <StayzTxt v="small" sub>
        This is a request. The property confirms it if the room is available. If it is declined you are refunded within 14 business days. Payment is made online.
      </StayzTxt>
    </StayzScreen>
  );
};
