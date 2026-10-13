import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { StateView } from '../components/States';
import { Txt } from '../components/Txt';
import { buildInput } from '../lib/stay';
import { RootProps, RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useDraft } from '../store/DraftContext';
import { useSearch } from '../store/SearchContext';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Fail = 'declined' | 'unavailable' | 'auth' | 'network';

const COPY: Record<Fail, { title: string; body: string }> = {
  declined: { title: 'Payment was declined', body: 'Your payment method did not go through. Try another method.' },
  unavailable: { title: 'No longer available', body: 'Someone just booked these dates. Choose different dates or another property.' },
  auth: { title: 'Sign in required', body: 'Sign in to your Wantiss account to book this stay.' },
  network: { title: 'Connection problem', body: 'We could not reach Stayz. You have not been charged. Please try again.' },
};

export const ProcessingScreen = ({ route }: RootProps<'Processing'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { search } = useSearch();
  const { draft } = useDraft();
  const [fail, setFail] = useState<Fail | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setFail(null);
    try {
      const l = await api.getListing(route.params.id);
      const input = buildInput(l, search, draft);
      const r = await api.createBooking(input);
      if (r.ok) {
        nav.replace('Confirmation', { id: r.booking.id });
        return;
      }
      if (r.reason === 'insufficient_balance') {
        nav.replace('Insufficient', { needed: input.quote.total, listingId: l.id });
        return;
      }
      setFail(r.reason);
    } catch {
      setFail('network');
    }
  }, [api, draft, nav, route.params.id, search]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  if (fail)
    return (
      <Screen title="Payment" back={false} scroll={false}>
        <StateView icon="alert-circle-outline" tone="danger" title={COPY[fail].title} body={COPY[fail].body} />
        <View style={{ padding: 16, gap: 10 }}>
          {fail === 'network' ? <Button title="Try again" onPress={run} /> : null}
          {fail === 'declined' ? <Button title="Choose another method" onPress={() => nav.replace('PaymentMethods')} /> : null}
          <Button title="Back to stay" kind="secondary" onPress={() => nav.goBack()} />
        </View>
      </Screen>
    );

  return (
    <Screen back={false} scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Txt v="h2">Processing your payment</Txt>
      <Txt sub center>
        Please do not close the app.
      </Txt>
    </Screen>
  );
};
