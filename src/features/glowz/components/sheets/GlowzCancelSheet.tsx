import React from 'react';
import { useGlowzState } from '../../hooks/GlowzStore';
import { useBookings } from '../../hooks/useBookings';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { hoursUntil } from '../../utils/availability';
import { fmtD, fmtT, peso } from '../../utils/format';
import { GlowzButton } from '../GlowzButton';
import { GlowzCard } from '../GlowzCard';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzSummaryRow } from '../GlowzSummaryRow';
import { GlowzText } from '../GlowzText';

export function GlowzCancelSheet({ bookingRef }: { bookingRef: string }) {
  const { closeSheet } = useGlowzSheet();
  const { bookings } = useGlowzState();
  const { confirmCancel } = useBookings();
  const b = bookings.find((x) => x.ref === bookingRef);
  if (!b) return null;
  const free = hoursUntil(b) >= 24;
  const fee = free ? 0 : Math.round(b.total * 0.5);
  return (
    <GlowzSheet title="Cancel this visit?" onClose={closeSheet}>
      <GlowzCard gap={6}>
        <GlowzText weight={600}>{b.items.map((i) => i.n).join(', ')}</GlowzText>
        <GlowzText kind="small" muted>{fmtD(b.date)} · {fmtT(b.time)}</GlowzText>
        <GlowzSummaryRow label="Cancellation fee" value={fee ? peso(fee) : 'None'} />
        <GlowzSummaryRow label="Refund" value={peso(b.total - fee)} />
      </GlowzCard>
      <GlowzText kind="small" muted>
        {free ? 'You are more than 24 hours ahead, so this is free.' : 'This is inside 24 hours, so the 50% late fee applies.'} Refunds show as pending until the payment provider confirms them.
      </GlowzText>
      <GlowzButton variant="danger" label="Yes, cancel" onPress={() => confirmCancel(bookingRef)} />
      <GlowzButton variant="ghost" label="Keep appointment" onPress={closeSheet} />
    </GlowzSheet>
  );
}