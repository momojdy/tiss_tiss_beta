import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StayzButton } from './stayzButton';
import { StayzCard } from './stayzCard';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { fmtDateTime } from './stayzDates';
import { RootProps } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';

export const StayzConfirmationScreen = ({ route }: RootProps<'Confirmation'>) => {
  const nav = useNavigation();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { money } = useStayzSettings();
  const { data: b, loading, error, reload } = useStayzAsync(() => api.getBooking(route.params.id), [api, route.params.id]);

  const toStays = () => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs', state: { index: 2, routes: [{ name: 'Home' }, { name: 'Saved' }, { name: 'Stays' }, { name: 'Messages' }, { name: 'Profile' }] } }] }));
  const toDetail = () => nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'BookingDetail', params: { id: route.params.id } }] }));

  if (loading) return <StayzScreen><StayzSkeleton height={200} radius={20} /></StayzScreen>;
  if (error || !b) return <StayzScreen back={false}><StayzErrorView message={error ?? undefined} onRetry={reload} /></StayzScreen>;

  const requested = b.status === 'Requested';
  return (
    <StayzScreen
      back={false}
      footer={
        <View style={{ gap: 10 }}>
          <StayzButton title="View booking" onPress={toDetail} />
          <StayzButton title="Go to my stays" kind="secondary" onPress={toStays} />
        </View>
      }>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={requested ? 'hourglass-outline' : 'checkmark'} size={44} color={colors.teal} />
        </View>
        <StayzTxt v="title" center>
          {requested ? 'Request sent' : 'Booking confirmed'}
        </StayzTxt>
        <StayzTxt sub center>
          {requested ? 'The property will confirm your request. You have been charged and will be refunded if it is declined.' : 'Your stay is booked. A confirmation is in your notifications.'}
        </StayzTxt>
      </View>
      <StayzCard style={{ gap: 6 }}>
        <StayzTxt v="h2">{b.title}</StayzTxt>
        <StayzTxt sub>{b.city}</StayzTxt>
        <StayzTxt>
          {fmtDateTime(b.start)} → {fmtDateTime(b.end)}
        </StayzTxt>
        <StayzTxt sub>Paid {money(b.total)} with {b.paymentLabel}</StayzTxt>
        {b.deposit > 0 ? <StayzTxt v="small" sub>Deposit of {money(b.deposit)} is collected by the property at check-in.</StayzTxt> : null}
        <StayzTxt v="small" sub>Your door code appears 2 hours before check-in.</StayzTxt>
      </StayzCard>
    </StayzScreen>
  );
};
