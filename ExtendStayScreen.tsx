import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PaymentIcon } from '../components/PaymentIcon';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { ErrorView, Skeleton } from '../components/States';
import { Stepper } from '../components/Stepper';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { extensionUnit } from '../lib/pricing';
import { RootProps, RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useDraft } from '../store/DraftContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ExtendStayScreen = ({ route }: RootProps<'ExtendStay'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { money } = useSettings();
  const { draft } = useDraft();
  const booking = useAsync(() => api.getBooking(route.params.id), [api, route.params.id]);
  const methods = useAsync(() => api.listPaymentMethods(), [api]);
  const wallet = useAsync(() => api.walletBalance(), [api]);
  const [units, setUnits] = useState(1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const b = booking.data;

  if (booking.loading || methods.loading) return <Screen title="Extend your stay"><Skeleton height={220} radius={18} /></Screen>;
  if (booking.error || !b) return <Screen title="Extend your stay"><ErrorView message={booking.error ?? undefined} onRetry={booking.reload} /></Screen>;

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
    <Screen
      title="Extend your stay"
      footer={
        <View style={{ gap: 8 }}>
          {failed ? <Txt color={colors.danger}>{failed}</Txt> : null}
          {low ? <Txt color={colors.danger} v="small">Your Wallet balance ({money(wallet.data ?? 0)}) is lower than the extension price.</Txt> : null}
          <Button title={`Request and pay ${money(price)}`} onPress={low ? () => nav.navigate('PaymentMethods') : send} loading={busy} />
        </View>
      }>
      <Card style={{ gap: 12 }}>
        <Txt v="h2">{b.title}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Txt v="h3">Extra {unit}s</Txt>
            <Txt v="small" sub>
              {money(b.extPrice ?? 0)} per {unit}, tax included
            </Txt>
          </View>
          <Stepper value={units} min={1} max={max} onChange={setUnits} />
        </View>
      </Card>
      <Card>
        {method ? <Row label={method.detail ? `${method.label} ${method.detail}` : method.label} sub={method.kind === 'wallet' ? `Balance ${money(wallet.data ?? 0)}` : undefined} onPress={() => nav.navigate('PaymentMethods')} right={<PaymentIcon method={method} />} /> : null}
      </Card>
      <Txt v="small" sub>
        This is a request. The property confirms it if the room is available. If it is declined you are refunded within 14 business days. Payment is made online.
      </Txt>
    </Screen>
  );
};
