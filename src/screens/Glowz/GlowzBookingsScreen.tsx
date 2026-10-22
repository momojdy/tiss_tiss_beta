import React from 'react';
import { View } from 'react-native';
import { useGlowzStore } from '../../hooks/Glowz/GlowzStore';
import { useBookings } from '../../hooks/Glowz/useBookings';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { GlowzArt } from '../../components/glowz/GlowzArt';
import { GlowzBookingCard } from '../../components/glowz/GlowzBookingCard';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzCard } from '../../components/glowz/GlowzCard';
import { GlowzEmptyState } from '../../components/glowz/GlowzEmptyState';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzTabs } from '../../components/glowz/GlowzTabs';
import { GlowzText } from '../../components/glowz/GlowzText';
import type { BookingStatus } from '../../types/glowz/booking';
import type { BookingsTab } from '../../types/glowz/state';
import { getProvider, providerIcon } from '../../util/Glowz/catalog';
import { fmtD } from '../../util/Glowz/format';

const TABS: { id: BookingsTab; label: string }[] = [
  { id: 'up', label: 'Upcoming' }, { id: 'pend', label: 'Pending' }, { id: 'done', label: 'Completed' }, { id: 'canc', label: 'Cancelled' },
];
const STATUS: Record<BookingsTab, BookingStatus> = { up: 'confirmed', pend: 'pending', done: 'completed', canc: 'cancelled' };

export function GlowzBookingsScreen() {
  const g = useGutter();
  const { state, update } = useGlowzStore();
  const { leaveWaitlist } = useBookings();
  const { goSearch } = useGlowzCommands();
  const t = state.btab;
  const asc = t === 'up' || t === 'pend';
  const list = state.bookings
    .filter((b) => b.status === STATUS[t])
    .sort((a, b) => (asc ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()));
  const waitlist = t === 'pend' ? state.wl : [];

  return (
    <GlowzScreen header={<View style={{ paddingLeft: g.left, paddingRight: g.right }}><GlowzText kind="display" size={34} accessibilityRole="header">Bookings</GlowzText></View>} bottom="root">
      <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 14 }}>
        <GlowzTabs tabs={TABS} value={t} onChange={(id) => update((s) => ({ ...s, btab: id }))} />
        {waitlist.map((k) => {
          const [pid, ts] = k.split('|');
          const p = getProvider(pid);
          if (!p) return null;
          return (
            <GlowzCard key={k} row>
              <GlowzArt h={p.h} icon={providerIcon(p)} style={{ width: 48, height: 48, borderRadius: 12 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <GlowzText weight={600} numberOfLines={1}>{p.name}</GlowzText>
                <GlowzText kind="small" muted>Waitlist · {fmtD(new Date(+ts))}</GlowzText>
              </View>
              <GlowzButton small variant="ghost" label="Leave" onPress={() => leaveWaitlist(k)} />
            </GlowzCard>
          );
        })}
        {list.map((b) => <GlowzBookingCard key={b.ref} booking={b} />)}
        {!list.length && !waitlist.length ? (
          <GlowzEmptyState title="Nothing here yet" subtitle="When you book, your appointments show up here." action={<GlowzButton small label="Find a service" onPress={goSearch} />} />
        ) : null}
      </View>
    </GlowzScreen>
  );
}
