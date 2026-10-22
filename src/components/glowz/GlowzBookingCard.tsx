import React from 'react';
import { Pressable, View } from 'react-native';
import { useBookings } from '../hooks/useBookings';
import { useChat } from '../hooks/useChat';
import { useGlowzCommands } from '../hooks/useGlowzCommands';
import { useGlowzSheet } from '../hooks/GlowzSheetContext';
import type { Booking, BookingStatus } from '../types/booking';
import { getProvider, providerIcon } from '../utils/catalog';
import { fmtD, fmtT, peso } from '../utils/format';
import { GlowzArt } from './GlowzArt';
import { GlowzBadge, BadgeTone } from './GlowzBadge';
import { GlowzButton } from './GlowzButton';
import { GlowzCard } from './GlowzCard';
import { GlowzText } from './GlowzText';

export const BOOKING_STATUS: Record<BookingStatus, [string, BadgeTone]> = {
  confirmed: ['Confirmed', 'ok'],
  pending: ['Pending', 'warn'],
  completed: ['Completed', 'mute'],
  cancelled: ['Cancelled', 'bad'],
};

const grow = { flex: 1, alignSelf: 'stretch' } as const;

/** Booking in the Bookings list with its status-specific actions. */
export function GlowzBookingCard({ booking: b }: { booking: Booking }) {
  const p = getProvider(b.p);
  const { openBooking } = useGlowzCommands();
  const { reschedule, bookAgain } = useBookings();
  const { openChat } = useChat();
  const { openSheet } = useGlowzSheet();
  if (!p) return null;
  const [label, tone] = BOOKING_STATUS[b.status];
  const live = b.status === 'confirmed' || b.status === 'pending';
  return (
    <GlowzCard gap={10}>
      <Pressable onPress={() => openBooking(b.ref)} accessibilityRole="button" accessibilityLabel={`Booking ${b.ref}, ${label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <GlowzArt h={p.h} icon={providerIcon(p)} style={{ width: 48, height: 48, borderRadius: 12 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <GlowzText weight={600} numberOfLines={1}>{b.items.map((i) => i.n).join(', ')}</GlowzText>
          <GlowzText kind="small" muted numberOfLines={1}>{p.name}</GlowzText>
          <GlowzText kind="small">{fmtD(b.date)} · {fmtT(b.time)}</GlowzText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <GlowzBadge label={label} tone={tone} />
          <GlowzText kind="small" price>{peso(b.total)}</GlowzText>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {live ? (
          <>
            <GlowzButton small variant="ghost" label="Reschedule" onPress={() => reschedule(b.ref)} style={grow} />
            <GlowzButton small variant="ghost" label="Message" onPress={() => openChat(p.id)} style={grow} />
          </>
        ) : null}
        {b.status === 'completed' ? (
          <>
            {!b.reviewed ? <GlowzButton small label="Leave a review" onPress={() => openSheet({ kind: 'review', ref: b.ref })} style={grow} /> : null}
            <GlowzButton small variant="ghost" label="Book again" onPress={() => bookAgain(b.ref)} style={grow} />
          </>
        ) : null}
        {b.status === 'cancelled' ? <GlowzButton small variant="ghost" label="Book again" onPress={() => bookAgain(b.ref)} style={grow} /> : null}
      </View>
    </GlowzCard>
  );
}
