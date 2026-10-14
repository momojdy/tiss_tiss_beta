import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzButton } from './stayzButton';
import { StayzScreen } from './stayzScreen';
import { StayzStateView } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { buildInput } from './stayzStay';
import { RootProps, RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzDraft } from './stayzDraftContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzTheme } from './stayzThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Fail = 'declined' | 'unavailable' | 'auth' | 'network';

const COPY: Record<Fail, { title: string; body: string }> = {
  declined: { title: 'Payment was declined', body: 'Your payment method did not go through. Try another method.' },
  unavailable: { title: 'No longer available', body: 'Someone just booked these dates. Choose different dates or another property.' },
  auth: { title: 'Sign in required', body: 'Sign in to your Wantiss account to book this stay.' },
  network: { title: 'Connection problem', body: 'We could not reach Stayz. You have not been charged. Please try again.' },
};

export const StayzProcessingScreen = ({ route }: RootProps<'Processing'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { search } = useStayzSearch();
  const { draft } = useStayzDraft();
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
      <StayzScreen title="Payment" scroll={false}>
        <StayzStateView icon="alert-circle-outline" tone="danger" title={COPY[fail].title} body={COPY[fail].body} />
        <View style={{ padding: 16, gap: 10 }}>
          {fail === 'network' ? <StayzButton title="Try again" onPress={run} /> : null}
          {fail === 'declined' ? <StayzButton title="Choose another method" onPress={() => nav.replace('PaymentMethods')} /> : null}
          <StayzButton title="Back to stay" kind="secondary" onPress={() => nav.goBack()} />
        </View>
      </StayzScreen>
    );

  return (
    <StayzScreen scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color={colors.brand} />
      <StayzTxt v="h2">Processing your payment</StayzTxt>
      <StayzTxt sub center>
        Please do not close the app.
      </StayzTxt>
    </StayzScreen>
  );
};
