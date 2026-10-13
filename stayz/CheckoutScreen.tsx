import React from 'react';
import { Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PaymentIcon } from '../components/PaymentIcon';
import { PriceBreakdown } from '../components/PriceBreakdown';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { ErrorView, Skeleton } from '../components/States';
import { TextField } from '../components/TextField';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { policyText } from '../lib/cancellation';
import { fmtDate, fmtDateTime } from '../lib/dates';
import { buildQuote, stayWindow } from '../lib/stay';
import { RootProps, RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useDraft } from '../store/DraftContext';
import { useHost } from '../store/HostContext';
import { useSearch } from '../store/SearchContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const CheckoutScreen = ({ route }: RootProps<'Checkout'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const host = useHost();
  const { money } = useSettings();
  const { search } = useSearch();
  const { draft, setDraft } = useDraft();
  const listing = useAsync(() => api.getListing(route.params.id), [api, route.params.id]);
  const methods = useAsync(() => api.listPaymentMethods(), [api]);
  const wallet = useAsync(() => api.walletBalance(), [api]);
  const l = listing.data;

  if (listing.loading || methods.loading)
    return (
      <Screen title="Review and pay">
        <Skeleton height={110} radius={18} />
        <Skeleton height={160} radius={18} />
      </Screen>
    );
  if (listing.error || !l) return <Screen title="Review and pay"><ErrorView message={listing.error ?? undefined} onRetry={listing.reload} /></Screen>;

  const quote = buildQuote(l, search, draft);
  const method = (methods.data ?? []).find(m => m.id === draft.methodId) ?? (methods.data ?? [])[0];
  const w = stayWindow(l, search);
  const range = search.mode === 'overnight' || search.mode === 'extended';
  const low = method?.kind === 'wallet' && wallet.data !== null && wallet.data < quote.total;
  const room = l.rooms.find(r => r.id === draft.roomId);

  return (
    <Screen
      title="Review and pay"
      footer={
        <View style={{ gap: 8 }}>
          {low ? (
            <Txt v="small" color={colors.danger}>
              Your Wallet balance ({money(wallet.data ?? 0)}) is lower than the total.
            </Txt>
          ) : null}
          <Button
            title={low ? 'Top up or choose another method' : `${l.instant ? 'Pay' : 'Send request and pay'} ${money(quote.total)}`}
            onPress={() => (low ? nav.navigate('Insufficient', { needed: quote.total - (wallet.data ?? 0), listingId: l.id }) : nav.navigate('Processing', { id: l.id }))}
            disabled={!method}
          />
        </View>
      }>
      <Card style={{ gap: 4 }}>
        <Txt v="h2">{l.title}</Txt>
        <Txt sub>
          {l.type} · {l.city}
        </Txt>
        <View style={{ height: 8 }} />
        <Row icon="calendar-outline" label={range ? `${fmtDate(search.date)} → ${fmtDate(search.endDate)}` : fmtDate(search.date)} sub={`${fmtDateTime(w.start.toISOString())} – ${fmtDateTime(w.end.toISOString())}`} chevron={false} />
        <Row icon="people-outline" label={`${search.adults + search.children} guest${search.adults + search.children > 1 ? 's' : ''}`} sub={room?.name} chevron={false} />
      </Card>

      {range && l.breakfast ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Breakfast</Txt>
            <Txt v="small" sub>
              {draft.breakfast ? 'Included for every guest' : 'Without breakfast'} · +{money(l.breakfast)} per guest, per night
            </Txt>
          </View>
          <Switch value={draft.breakfast} onValueChange={v => setDraft({ breakfast: v })} trackColor={{ true: colors.brand, false: colors.line }} />
        </Card>
      ) : null}

      <Section title="Special request (optional)">
        <TextField value={draft.special} onChangeText={t => setDraft({ special: t })} multiline placeholder="Late arrival, extra bed, quiet room…" maxLength={300} />
        <Txt v="small" sub>
          The property will do its best but cannot guarantee special requests.
        </Txt>
      </Section>

      <Section title="Price details">
        <Card>
          <PriceBreakdown quote={quote} />
          {quote.deposit > 0 ? (
            <Txt v="small" sub style={{ marginTop: 8 }}>
              A deposit of {money(quote.deposit)} is collected by the property at check-in. It is not part of the total above.
            </Txt>
          ) : null}
        </Card>
      </Section>

      <Section title="Payment method">
        <Card>
          {method ? (
            <Row
              label={method.detail ? `${method.label} ${method.detail}` : method.label}
              sub={method.kind === 'wallet' ? `Balance ${money(wallet.data ?? 0)}` : undefined}
              onPress={() => nav.navigate('PaymentMethods')}
              right={<PaymentIcon method={method} />}
            />
          ) : null}
        </Card>
        {low ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Top up Wallet" kind="secondary" small style={{ flex: 1 }} onPress={host.onOpenWallet} />
            <Button title="Other method" kind="secondary" small style={{ flex: 1 }} onPress={() => nav.navigate('PaymentMethods')} />
          </View>
        ) : null}
      </Section>

      <Section title="Cancellation">
        <Txt sub>{policyText(l)}</Txt>
        <Txt v="small" sub>
          No-shows are not refunded. Leaving early is not refundable. Approved refunds arrive within 14 business days.
        </Txt>
      </Section>
    </Screen>
  );
};
