import React, { useCallback } from 'react';
import { Linking, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzBadge } from './stayzBadge';
import { StayzButton } from './stayzButton';
import { StayzCard } from './stayzCard';
import { StayzRow } from './stayzRow';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { canChange, canExtend, canReview, doorCodeVisible } from './stayzBooking';
import { canCancel, policyText } from './stayzCancellation';
import { fmtDateTime } from './stayzDates';
import { RootProps, RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';
import { statusTone } from './stayzMyStaysScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const StayzBookingDetailScreen = ({ route }: RootProps<'BookingDetail'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { money } = useStayzSettings();
  const { data: b, loading, error, reload } = useStayzAsync(() => api.getBooking(route.params.id), [api, route.params.id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, []),
  );

  if (loading && !b)
    return (
      <StayzScreen title="Booking">
        <StayzSkeleton height={160} radius={18} />
        <StayzSkeleton height={200} radius={18} />
      </StayzScreen>
    );
  if (error || !b) return <StayzScreen title="Booking"><StayzErrorView message={error ?? undefined} onRetry={reload} /></StayzScreen>;

  const code = doorCodeVisible(b);
  const message = async () => {
    try {
      const id = await api.startThread(b.listingId, b.title);
      nav.navigate('Chat', { id, title: b.title });
    } catch {
      nav.navigate('Tabs', { screen: 'Messages' });
    }
  };

  return (
    <StayzScreen title="Booking">
      <StayzCard style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <StayzTxt v="h2" style={{ flex: 1 }}>
            {b.title}
          </StayzTxt>
          <StayzBadge label={b.status} tone={statusTone(b.status)} />
        </View>
        <StayzTxt sub>{b.city}</StayzTxt>
        <StayzRow icon="log-in-outline" label="Check-in" sub={fmtDateTime(b.start)} chevron={false} />
        <StayzRow icon="log-out-outline" label="Check-out" sub={fmtDateTime(b.end)} chevron={false} />
        <StayzRow icon="people-outline" label={`${b.guests} guest${b.guests > 1 ? 's' : ''}`} sub={b.roomName} chevron={false} />
      </StayzCard>

      {b.status === 'Upcoming' || b.status === 'Checked in' ? (
        <StayzCard style={{ gap: 6, backgroundColor: code ? colors.tealSoft : colors.card }}>
          <StayzTxt v="h3">Door code</StayzTxt>
          {code && b.doorCode ? (
            <StayzTxt v="hero" color={colors.teal} style={{ letterSpacing: 6 }}>
              {b.doorCode}
            </StayzTxt>
          ) : (
            <StayzTxt sub>Your door code appears 2 hours before check-in.</StayzTxt>
          )}
        </StayzCard>
      ) : null}

      {b.extension ? (
        <StayzCard style={{ gap: 4, backgroundColor: colors.warnSoft }}>
          <StayzTxt v="h3">Extension {b.extension.status === 'pending' ? 'requested' : b.extension.status}</StayzTxt>
          <StayzTxt sub>
            +{b.extension.units} {b.extension.unit}
            {b.extension.units > 1 ? 's' : ''} · {money(b.extension.price)}
            {b.extension.status === 'pending' ? ' · waiting for the property to confirm' : ''}
          </StayzTxt>
        </StayzCard>
      ) : null}

      {b.change ? (
        <StayzCard style={{ gap: 4, backgroundColor: colors.warnSoft }}>
          <StayzTxt v="h3">Change {b.change.status === 'pending' ? 'requested' : b.change.status}</StayzTxt>
          <StayzTxt sub>
            {fmtDateTime(b.change.start)} → {fmtDateTime(b.change.end)} · {b.change.diff >= 0 ? '+' : '-'}
            {money(Math.abs(b.change.diff))}
          </StayzTxt>
        </StayzCard>
      ) : null}

      <StayzSection title="Payment">
        <StayzCard style={{ gap: 6 }}>
          {b.breakfastAmount > 0 ? <Line label="Breakfast" value={money(b.breakfastAmount)} /> : null}
          {b.cleaning > 0 ? <Line label="Cleaning fee" value={money(b.cleaning)} /> : null}
          {b.discount > 0 ? <Line label="Discount" value={`-${money(b.discount)}`} /> : null}
          <Line label="Total paid (tax included)" value={money(b.total)} bold />
          <Line label="Paid with" value={b.paymentLabel} />
          {b.deposit > 0 ? <Line label="Deposit at property" value={money(b.deposit)} /> : null}
        </StayzCard>
        {b.refund ? (
          <StayzCard style={{ backgroundColor: colors.tealSoft }}>
            <StayzTxt v="h3">Refund {b.refund.status === 'paid' ? 'paid' : 'on its way'}</StayzTxt>
            <StayzTxt sub>
              {money(b.refund.amount)} to {b.paymentLabel} within 14 business days.
            </StayzTxt>
          </StayzCard>
        ) : null}
      </StayzSection>

      {b.special ? (
        <StayzSection title="Your request">
          <StayzTxt sub>{b.special}</StayzTxt>
          <StayzTxt v="small" sub>
            The property will do its best but cannot guarantee special requests.
          </StayzTxt>
        </StayzSection>
      ) : null}

      <StayzSection title="Cancellation policy">
        <StayzTxt sub>{policyText(b)}</StayzTxt>
      </StayzSection>

      <View style={{ gap: 10 }}>
        {canExtend(b) ? <StayzButton title="Request an extension" icon="add-circle-outline" onPress={() => nav.navigate('ExtendStay', { id: b.id })} /> : null}
        {canReview(b) ? <StayzButton title="Write a review" icon="star-outline" onPress={() => nav.navigate('WriteReview', { id: b.id })} /> : null}
        <StayzButton title="Message the property" kind="secondary" icon="chatbubble-ellipses-outline" onPress={message} />
        <StayzButton title="Get directions" kind="secondary" icon="navigate-outline" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.title} ${b.city}`)}`)} />
        {canChange(b) ? <StayzButton title="Request a change" kind="secondary" icon="swap-horizontal-outline" onPress={() => nav.navigate('ChangeRequest', { id: b.id })} /> : null}
        {canCancel(b) ? <StayzButton title="Cancel booking" kind="danger" onPress={() => nav.navigate('CancelBooking', { id: b.id })} /> : null}
      </View>
    </StayzScreen>
  );
};

const Line = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
    <StayzTxt sub={!bold} bold={bold}>
      {label}
    </StayzTxt>
    <StayzTxt bold={bold}>{value}</StayzTxt>
  </View>
);
