import React, { useCallback } from 'react';
import { Linking, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { ErrorView, Skeleton } from '../components/States';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { canChange, canExtend, canReview, doorCodeVisible } from '../lib/booking';
import { canCancel, policyText } from '../lib/cancellation';
import { fmtDateTime } from '../lib/dates';
import { RootProps, RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';
import { statusTone } from './MyStaysScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const BookingDetailScreen = ({ route }: RootProps<'BookingDetail'>) => {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { money } = useSettings();
  const { data: b, loading, error, reload } = useAsync(() => api.getBooking(route.params.id), [api, route.params.id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, []),
  );

  if (loading && !b)
    return (
      <Screen title="Booking">
        <Skeleton height={160} radius={18} />
        <Skeleton height={200} radius={18} />
      </Screen>
    );
  if (error || !b) return <Screen title="Booking"><ErrorView message={error ?? undefined} onRetry={reload} /></Screen>;

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
    <Screen title="Booking">
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt v="h2" style={{ flex: 1 }}>
            {b.title}
          </Txt>
          <Badge label={b.status} tone={statusTone(b.status)} />
        </View>
        <Txt sub>{b.city}</Txt>
        <Row icon="log-in-outline" label="Check-in" sub={fmtDateTime(b.start)} chevron={false} />
        <Row icon="log-out-outline" label="Check-out" sub={fmtDateTime(b.end)} chevron={false} />
        <Row icon="people-outline" label={`${b.guests} guest${b.guests > 1 ? 's' : ''}`} sub={b.roomName} chevron={false} />
      </Card>

      {b.status === 'Upcoming' || b.status === 'Checked in' ? (
        <Card style={{ gap: 6, backgroundColor: code ? colors.tealSoft : colors.card }}>
          <Txt v="h3">Door code</Txt>
          {code && b.doorCode ? (
            <Txt v="hero" color={colors.teal} style={{ letterSpacing: 6 }}>
              {b.doorCode}
            </Txt>
          ) : (
            <Txt sub>Your door code appears 2 hours before check-in.</Txt>
          )}
        </Card>
      ) : null}

      {b.extension ? (
        <Card style={{ gap: 4, backgroundColor: colors.warnSoft }}>
          <Txt v="h3">Extension {b.extension.status === 'pending' ? 'requested' : b.extension.status}</Txt>
          <Txt sub>
            +{b.extension.units} {b.extension.unit}
            {b.extension.units > 1 ? 's' : ''} · {money(b.extension.price)}
            {b.extension.status === 'pending' ? ' · waiting for the property to confirm' : ''}
          </Txt>
        </Card>
      ) : null}

      {b.change ? (
        <Card style={{ gap: 4, backgroundColor: colors.warnSoft }}>
          <Txt v="h3">Change {b.change.status === 'pending' ? 'requested' : b.change.status}</Txt>
          <Txt sub>
            {fmtDateTime(b.change.start)} → {fmtDateTime(b.change.end)} · {b.change.diff >= 0 ? '+' : '-'}
            {money(Math.abs(b.change.diff))}
          </Txt>
        </Card>
      ) : null}

      <Section title="Payment">
        <Card style={{ gap: 6 }}>
          {b.breakfastAmount > 0 ? <Line label="Breakfast" value={money(b.breakfastAmount)} /> : null}
          {b.cleaning > 0 ? <Line label="Cleaning fee" value={money(b.cleaning)} /> : null}
          {b.discount > 0 ? <Line label="Discount" value={`-${money(b.discount)}`} /> : null}
          <Line label="Total paid (tax included)" value={money(b.total)} bold />
          <Line label="Paid with" value={b.paymentLabel} />
          {b.deposit > 0 ? <Line label="Deposit at property" value={money(b.deposit)} /> : null}
        </Card>
        {b.refund ? (
          <Card style={{ backgroundColor: colors.tealSoft }}>
            <Txt v="h3">Refund {b.refund.status === 'paid' ? 'paid' : 'on its way'}</Txt>
            <Txt sub>
              {money(b.refund.amount)} to {b.paymentLabel} within 14 business days.
            </Txt>
          </Card>
        ) : null}
      </Section>

      {b.special ? (
        <Section title="Your request">
          <Txt sub>{b.special}</Txt>
          <Txt v="small" sub>
            The property will do its best but cannot guarantee special requests.
          </Txt>
        </Section>
      ) : null}

      <Section title="Cancellation policy">
        <Txt sub>{policyText(b)}</Txt>
      </Section>

      <View style={{ gap: 10 }}>
        {canExtend(b) ? <Button title="Request an extension" icon="add-circle-outline" onPress={() => nav.navigate('ExtendStay', { id: b.id })} /> : null}
        {canReview(b) ? <Button title="Write a review" icon="star-outline" onPress={() => nav.navigate('WriteReview', { id: b.id })} /> : null}
        <Button title="Message the property" kind="secondary" icon="chatbubble-ellipses-outline" onPress={message} />
        <Button title="Get directions" kind="secondary" icon="navigate-outline" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.title} ${b.city}`)}`)} />
        {canChange(b) ? <Button title="Request a change" kind="secondary" icon="swap-horizontal-outline" onPress={() => nav.navigate('ChangeRequest', { id: b.id })} /> : null}
        {canCancel(b) ? <Button title="Cancel booking" kind="danger" onPress={() => nav.navigate('CancelBooking', { id: b.id })} /> : null}
      </View>
    </Screen>
  );
};

const Line = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
    <Txt sub={!bold} bold={bold}>
      {label}
    </Txt>
    <Txt bold={bold}>{value}</Txt>
  </View>
);
