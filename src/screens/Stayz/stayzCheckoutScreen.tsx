import React from 'react';
import { Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzButton } from './stayzButton';
import { StayzCard } from './stayzCard';
import { StayzPaymentIcon } from './stayzPaymentIcon';
import { StayzPriceBreakdown } from './stayzPriceBreakdown';
import { StayzRow } from './stayzRow';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzTextField } from './stayzTextField';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { policyText } from './stayzCancellation';
import { fmtDate, fmtDateTime } from './stayzDates';
import { buildQuote, stayWindow } from './stayzStay';
import { RootProps, RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzDraft } from './stayzDraftContext';
import { useStayzHost } from './stayzHostContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzCheckoutScreen = ({ route }: RootProps<'Checkout'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const host = useStayzHost();
  const { money } = useStayzSettings();
  const { search } = useStayzSearch();
  const { draft, setDraft } = useStayzDraft();
  const listing = useStayzAsync(() => api.getListing(route.params.id), [api, route.params.id]);
  const methods = useStayzAsync(() => api.listPaymentMethods(), [api]);
  const wallet = useStayzAsync(() => api.walletBalance(), [api]);
  const l = listing.data;

  if (listing.loading || methods.loading)
    return (
      <StayzScreen title="Review and pay">
        <StayzSkeleton height={110} radius={18} />
        <StayzSkeleton height={160} radius={18} />
      </StayzScreen>
    );
  if (listing.error || !l) return <StayzScreen title="Review and pay"><StayzErrorView message={listing.error ?? undefined} onRetry={listing.reload} /></StayzScreen>;

  const quote = buildQuote(l, search, draft);
  const method = (methods.data ?? []).find(m => m.id === draft.methodId) ?? (methods.data ?? [])[0];
  const w = stayWindow(l, search);
  const range = search.mode === 'overnight' || search.mode === 'extended';
  const low = method?.kind === 'wallet' && wallet.data !== null && wallet.data < quote.total;
  const room = l.rooms.find(r => r.id === draft.roomId);

  return (
    <StayzScreen
      title="Review and pay"
      footer={
        <View style={{ gap: 8 }}>
          {low ? (
            <StayzTxt v="small" color={colors.danger}>
              Your Wallet balance ({money(wallet.data ?? 0)}) is lower than the total.
            </StayzTxt>
          ) : null}
          <StayzButton
            title={low ? 'Top up or choose another method' : `${l.instant ? 'Pay' : 'Send request and pay'} ${money(quote.total)}`}
            onPress={() => (low ? nav.navigate('Insufficient', { needed: quote.total - (wallet.data ?? 0), listingId: l.id }) : nav.navigate('Processing', { id: l.id }))}
            disabled={!method}
          />
        </View>
      }>
      <StayzCard style={{ gap: 4 }}>
        <StayzTxt v="h2">{l.title}</StayzTxt>
        <StayzTxt sub>
          {l.type} · {l.city}
        </StayzTxt>
        <View style={{ height: 8 }} />
        <StayzRow icon="calendar-outline" label={range ? `${fmtDate(search.date)} → ${fmtDate(search.endDate)}` : fmtDate(search.date)} sub={`${fmtDateTime(w.start.toISOString())} – ${fmtDateTime(w.end.toISOString())}`} chevron={false} />
        <StayzRow icon="people-outline" label={`${search.adults + search.children} guest${search.adults + search.children > 1 ? 's' : ''}`} sub={room?.name} chevron={false} />
      </StayzCard>

      {range && l.breakfast ? (
        <StayzCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <StayzTxt v="h3">Breakfast</StayzTxt>
            <StayzTxt v="small" sub>
              {draft.breakfast ? 'Included for every guest' : 'Without breakfast'} · +{money(l.breakfast)} per guest, per night
            </StayzTxt>
          </View>
          <Switch value={draft.breakfast} onValueChange={v => setDraft({ breakfast: v })} trackColor={{ true: colors.brand, false: colors.line }} />
        </StayzCard>
      ) : null}

      <StayzSection title="Special request (optional)">
        <StayzTextField value={draft.special} onChangeText={t => setDraft({ special: t })} multiline placeholder="Late arrival, extra bed, quiet room…" maxLength={300} />
        <StayzTxt v="small" sub>
          The property will do its best but cannot guarantee special requests.
        </StayzTxt>
      </StayzSection>

      <StayzSection title="Price details">
        <StayzCard>
          <StayzPriceBreakdown quote={quote} />
          {quote.deposit > 0 ? (
            <StayzTxt v="small" sub style={{ marginTop: 8 }}>
              A deposit of {money(quote.deposit)} is collected by the property at check-in. It is not part of the total above.
            </StayzTxt>
          ) : null}
        </StayzCard>
      </StayzSection>

      <StayzSection title="Payment method">
        <StayzCard>
          {method ? (
            <StayzRow
              label={method.detail ? `${method.label} ${method.detail}` : method.label}
              sub={method.kind === 'wallet' ? `Balance ${money(wallet.data ?? 0)}` : undefined}
              onPress={() => nav.navigate('PaymentMethods')}
              right={<StayzPaymentIcon method={method} />}
            />
          ) : null}
        </StayzCard>
        {low ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StayzButton title="Top up Wallet" kind="secondary" small style={{ flex: 1 }} onPress={host.onOpenWallet} />
            <StayzButton title="Other method" kind="secondary" small style={{ flex: 1 }} onPress={() => nav.navigate('PaymentMethods')} />
          </View>
        ) : null}
      </StayzSection>

      <StayzSection title="Cancellation">
        <StayzTxt sub>{policyText(l)}</StayzTxt>
        <StayzTxt v="small" sub>
          No-shows are not refunded. Leaving early is not refundable. Approved refunds arrive within 14 business days.
        </StayzTxt>
      </StayzSection>
    </StayzScreen>
  );
};
