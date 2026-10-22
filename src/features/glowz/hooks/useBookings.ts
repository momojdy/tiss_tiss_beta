import { useCallback } from 'react';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { hoursUntil } from '../utils/availability';
import { rescheduleDraft } from '../utils/bookingDraft';
import { peso } from '../utils/format';
import { savedNote } from '../utils/storageStatus';
import { useGlowzSheet } from './GlowzSheetContext';
import { useGlowzStore } from './GlowzStore';
import { useToast } from './GlowzToast';
import { useBookingFlow } from './useBookingFlow';

const isLive = (status: string): boolean => status === 'confirmed' || status === 'pending';

/** Existing bookings: cancel, reschedule, review, book again, waitlist. */
export function useBookings() {
  const { state, update } = useGlowzStore();
  const nav = useGlowzNav();
  const toast = useToast();
  const { openSheet, closeSheet } = useGlowzSheet();
  const flow = useBookingFlow();

  const reschedule = useCallback(
    (ref: string) => {
      const b = state.bookings.find((x) => x.ref === ref);
      if (!b) return;
      update((s) => ({ ...s, bk: rescheduleDraft(b) }));
      nav.push({ name: 'Booking' });
    },
    [nav, state.bookings, update],
  );

  const bookAgain = useCallback(
    (ref: string) => {
      const b = state.bookings.find((x) => x.ref === ref);
      if (b) flow.start(b.p, b.items[0].id);
    },
    [flow, state.bookings],
  );

  const openCancel = useCallback(
    (ref: string) => {
      const b = state.bookings.find((x) => x.ref === ref);
      if (!b || !isLive(b.status)) {
        toast('This booking can no longer be cancelled');
        return;
      }
      openSheet({ kind: 'cancel', ref });
    },
    [openSheet, state.bookings, toast],
  );

  const confirmCancel = useCallback(
    (ref: string) => {
      const b = state.bookings.find((x) => x.ref === ref);
      if (!b || !isLive(b.status)) {
        closeSheet();
        return;
      }
      const fee = hoursUntil(b) >= 24 ? 0 : Math.round(b.total * 0.5);
      update((s) => ({
        ...s,
        btab: 'canc',
        bookings: s.bookings.map((x) =>
          x.ref === ref ? { ...x, status: 'cancelled', paid: (fee ? `Late fee ${peso(fee)} kept. ` : '') + `Refund of ${peso(b.total - fee)} pending, up to 3 business days (sample)` } : x,
        ),
      }));
      closeSheet();
      toast('Appointment cancelled');
    },
    [closeSheet, state.bookings, toast, update],
  );

  const submitReview = useCallback(
    (ref: string, stars: number, text: string) => {
      if (!stars) {
        toast('Choose a star rating first');
        return;
      }
      update((s) => ({ ...s, bookings: s.bookings.map((b) => (b.ref === ref ? { ...b, reviewed: true, review: { s: stars, t: text.trim() } } : b)) }));
      closeSheet();
      toast('Sample review. ' + savedNote() + ' It was not published.');
    },
    [closeSheet, toast, update],
  );

  const submitReport = useCallback(
    (pid: string, reason: string, text: string) => {
      update((s) => ({ ...s, reports: [...s.reports, { pid, r: reason, t: text.trim(), at: Date.now() }] }));
      closeSheet();
      toast('Sample report. ' + savedNote() + ' Nothing was sent.');
    },
    [closeSheet, toast, update],
  );

  const leaveWaitlist = useCallback(
    (key: string) => {
      update((s) => ({ ...s, wl: s.wl.filter((x) => x !== key) }));
      toast('Removed from the waitlist');
    },
    [toast, update],
  );

  return { isLive, reschedule, bookAgain, openCancel, confirmCancel, submitReview, submitReport, leaveWaitlist };
}