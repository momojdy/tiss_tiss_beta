import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StayzButton } from './stayzButton';
import { StayzCalendar } from './stayzCalendar';
import { StayzCard } from './stayzCard';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { addDays, diffDays, fmtDate, fmtDateTime, pad, toISO } from './stayzDates';
import { quote } from './stayzPricing';
import { RootProps } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';

const at = (date: string, ref: Date) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, ref.getHours(), ref.getMinutes(), 0, 0);
};

export const StayzChangeRequestScreen = ({ route }: RootProps<'ChangeRequest'>) => {
  const nav = useNavigation();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { money } = useStayzSettings();
  const booking = useStayzAsync(() => api.getBooking(route.params.id), [api, route.params.id]);
  const b = booking.data;
  const listing = useStayzAsync(() => (b ? api.getListing(b.listingId) : Promise.resolve(null)), [api, b?.listingId]);
  const blocked = useStayzAsync(() => (b ? api.getUnavailableDates(b.listingId) : Promise.resolve([] as string[])), [api, b?.listingId]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  const range = b ? b.mode === 'overnight' || b.mode === 'extended' : false;

  useEffect(() => {
    if (b && !start) {
      const s = toISO(new Date(b.start));
      setStart(s);
      setEnd(range ? toISO(new Date(b.end)) : '');
    }
  }, [b, range, start]);

  if (booking.loading || (b && !listing.data && !listing.error)) return <StayzScreen title="Request a change"><StayzSkeleton height={300} radius={18} /></StayzScreen>;
  if (booking.error || !b || listing.error || !listing.data) return <StayzScreen title="Request a change"><StayzErrorView message={booking.error ?? listing.error ?? undefined} onRetry={() => { booking.reload(); listing.reload(); }} /></StayzScreen>;

  const l = listing.data;
  const s0 = new Date(b.start);
  const e0 = new Date(b.end);
  const ready = !!start && (!range || (!!end && end > start));
  const nights = range && end ? diffDays(start, end) : 1;
  const newStart = ready ? at(start, s0) : s0;
  const newEnd = !ready ? e0 : range ? at(end, e0) : new Date(newStart.getTime() + (e0.getTime() - s0.getTime()));
  const room = l.rooms.find(r => r.name === b.roomName) ?? null;
  const hours = Math.round((e0.getTime() - s0.getTime()) / 3600000);
  const q = ready ? quote({ listing: l, mode: b.mode, startDate: start, endDate: range ? end : addDays(start, 1), hours, windowIndex: Math.max(0, l.dayUse.findIndex(w => w.from === `${pad(s0.getHours())}:00`)), room, adults: b.guests, breakfast: b.breakfast }) : null;
  const diff = q ? Math.round((q.total - b.total) * 100) / 100 : 0;
  const unchanged = ready && newStart.getTime() === s0.getTime() && newEnd.getTime() === e0.getTime();

  const send = async () => {
    setBusy(true);
    setFailed('');
    try {
      await api.requestChange(b.id, newStart.toISOString(), newEnd.toISOString(), diff);
      nav.goBack();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'The request could not be sent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StayzScreen
      title="Request a change"
      footer={
        <View style={{ gap: 8 }}>
          {failed ? <StayzTxt color={colors.danger}>{failed}</StayzTxt> : null}
          <StayzButton title="Send request" onPress={send} loading={busy} disabled={!ready || unchanged} />
        </View>
      }>
      <StayzTxt sub>The property must approve your change. You will see the price difference before you send it.</StayzTxt>
      <StayzCard>
        <StayzCalendar range={range} start={start} end={range ? end : undefined} blocked={(blocked.data ?? []).filter(d => d < toISO(s0) || d >= toISO(e0))} minNights={l.minNights} maxNights={l.maxNights} onChange={(a, c) => (setStart(a), setEnd(c))} />
      </StayzCard>
      {ready ? (
        <StayzCard style={{ gap: 6 }}>
          <StayzTxt v="h3">New dates</StayzTxt>
          <StayzTxt>
            {fmtDateTime(newStart.toISOString())} → {fmtDateTime(newEnd.toISOString())}
          </StayzTxt>
          {range ? (
            <StayzTxt sub>
              {nights} night{nights > 1 ? 's' : ''} · {fmtDate(start)} → {fmtDate(end)}
            </StayzTxt>
          ) : null}
          <StayzTxt v="h3" color={diff > 0 ? colors.danger : diff < 0 ? colors.teal : undefined}>
            {diff === 0 ? 'No price difference' : `${diff > 0 ? 'You pay' : 'You get back'} ${money(Math.abs(diff))} (tax included)`}
          </StayzTxt>
        </StayzCard>
      ) : null}
    </StayzScreen>
  );
};
