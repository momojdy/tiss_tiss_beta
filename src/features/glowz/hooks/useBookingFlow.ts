import { useCallback, useEffect, useRef } from 'react';
import { PRICE } from '../data/prices';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import type { Booking, BookingDraft } from '../types/booking';
import { addDays, today } from '../utils/clock';
import { getProvider, getServiceOf } from '../utils/catalog';
import { HOLD_MS, newDraft, resolveStaff, stepsFor } from '../utils/bookingDraft';
import { addOnPrice, bookingTotals, checkPromo } from '../utils/pricing';
import { savedNote } from '../utils/storageStatus';
import { peso } from '../utils/format';
import { useGlowzSheet } from './GlowzSheetContext';
import { useGlowzStore } from './GlowzStore';
import { useToast } from './GlowzToast';
import { useGlowzCommands } from './useGlowzCommands';

const POLICY = 'Free cancellation until 24 hours before. Late cancellation: 50% fee. No-show: full price.';

/** All booking-flow behaviour. The draft lives in the store so every step keeps its choices. */
export function useBookingFlow() {
  const { state, update } = useGlowzStore();
  const nav = useGlowzNav();
  const toast = useToast();
  const { openSheet, closeSheet } = useGlowzSheet();
  const { touchRecent } = useGlowzCommands();
  const draft = state.bk;
  const stateRef = useRef(state);
  stateRef.current = state;
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const patch = useCallback(
    (fn: (d: BookingDraft) => BookingDraft) => update((s) => (s.bk ? { ...s, bk: fn(s.bk) } : s)),
    [update],
  );

  const start = useCallback(
    (pid: string, serviceId: string | null) => {
      const p = getProvider(pid);
      if (!p) return;
      touchRecent(pid);
      update((s) => ({ ...s, bk: newDraft(p, serviceId || null) }));
      nav.push({ name: 'Booking' });
    },
    [nav, touchRecent, update],
  );

  const toggleService = useCallback(
    (id: string) =>
      patch((d) => {
        const has = d.items.some((i) => i.id === id);
        return { ...d, items: has ? d.items.filter((i) => i.id !== id) : [...d.items, { id, add: [] }], time: null };
      }),
    [patch],
  );
  const toggleAddon = useCallback(
    (id: string, name: string) =>
      patch((d) => ({
        ...d,
        items: d.items.map((i) => (i.id === id ? { ...i, add: i.add.includes(name) ? i.add.filter((a) => a !== name) : [...i.add, name] } : i)),
      })),
    [patch],
  );
  const setStaff = useCallback((n: string) => patch((d) => ({ ...d, staff: n, time: null })), [patch]);
  const setDate = useCallback((date: Date) => patch((d) => ({ ...d, date, time: null })), [patch]);
  const setTime = useCallback((time: number) => patch((d) => ({ ...d, time })), [patch]);
  const setLocation = useCallback((loc: 'salon' | 'home') => patch((d) => ({ ...d, loc })), [patch]);
  const setAddress = useCallback((addr: string) => patch((d) => ({ ...d, addr })), [patch]);
  const setPromoText = useCallback((promo: string) => patch((d) => ({ ...d, promo })), [patch]);
  const setPayment = useCallback((pay: string) => patch((d) => ({ ...d, pay, dep: pay.startsWith('Pay at') ? false : d.dep })), [patch]);
  const toggleDeposit = useCallback(() => patch((d) => ({ ...d, dep: !d.dep })), [patch]);

  const applyPromo = useCallback(() => {
    const d = stateRef.current.bk;
    if (!d) return;
    const p = getProvider(d.pid);
    if (!p) return;
    const code = d.promo.trim().toUpperCase();
    if (!code) {
      patch((x) => ({ ...x, promo: '', applied: null, promoMsg: '' }));
      return;
    }
    const r = checkPromo(code, bookingTotals(d, p).sub, p);
    patch((x) => ({ ...x, promo: code, applied: r.ok ? code : null, promoMsg: r.msg }));
  }, [patch]);

  const toggleWaitlist = useCallback(() => {
    const d = stateRef.current.bk;
    if (!d || !d.date) return;
    const k = d.pid + '|' + d.date.getTime();
    const had = stateRef.current.wl.includes(k);
    update((s) => ({ ...s, wl: had ? s.wl.filter((x) => x !== k) : [...s.wl, k] }));
    toast(had ? 'Removed from the waitlist' : 'You are on the waitlist (sample)');
  }, [toast, update]);

  const finishReschedule = useCallback(
    (d: BookingDraft, p: NonNullable<ReturnType<typeof getProvider>>) => {
      const staffMap = resolveStaff(d, p, stateRef.current.bookings);
      update((s) => ({
        ...s,
        bk: null,
        bookings: s.bookings.map((b) =>
          b.ref === d.resched && d.date && d.time !== null ? { ...b, date: d.date, time: d.time, staff: staffMap[d.time] ?? b.staff } : b,
        ),
      }));
      toast('Appointment moved. ' + savedNote());
      nav.pop();
    },
    [nav, toast, update],
  );

  const confirm = useCallback(() => {
    const d = stateRef.current.bk;
    if (!d || d.processing || d.time === null || !d.date) return;
    const p = getProvider(d.pid);
    if (!p) return;
    const others = stateRef.current.bookings;
    const map = resolveStaff(d, p, others);
    if (map[d.time] === undefined) {
      toast('That time was just taken. Pick another.');
      patch((x) => ({ ...x, step: 2, time: null }));
      return;
    }
    const c = bookingTotals(d, p);
    if (d.applied) {
      const r = checkPromo(d.applied, c.sub, p);
      if (!r.ok) {
        patch((x) => ({ ...x, applied: null, promoMsg: 'Your code expired during checkout: ' + r.msg }));
        toast('Promo no longer valid');
        return;
      }
    }
    patch((x) => ({ ...x, processing: true }));
    setTimeout(() => {
      const draftNow = stateRef.current.bk;
      if (!draftNow || draftNow.ref !== d.ref) return;
      const totals = bookingTotals(draftNow, p);
      const instant = p.type === 'salon';
      const booking: Booking = {
        ref: d.ref,
        p: p.id,
        items: draftNow.items.map((it) => {
          const s = getServiceOf(p, it.id);
          return { id: it.id, n: s ? s.n : it.id, price: PRICE[it.id] + it.add.reduce((a, n) => a + addOnPrice(p, it.id, n), 0), dur: s ? s.d : 0 };
        }),
        staff: map[d.time as number],
        date: draftNow.date as Date,
        time: draftNow.time as number,
        loc: draftNow.loc,
        addr: draftNow.addr,
        status: instant ? 'confirmed' : 'pending',
        total: totals.total,
        paid: totals.venue ? `${draftNow.pay} · nothing charged (demo)` : draftNow.dep ? `Demo deposit ${peso(totals.now)} · nothing charged` : 'Demo payment · nothing charged',
        policy: POLICY,
      };
      update((s) => {
        const dup = s.bookings.some((x) => x.ref === booking.ref);
        const next = s.bk ? { ...s.bk, processing: false, step: 'done' as const } : s.bk;
        if (dup) return { ...s, bk: next };
        return {
          ...s,
          bk: next,
          bookings: [booking, ...s.bookings],
          notes: [
            { t: instant ? 'Booking confirmed' : 'Booking request sent', s: `${p.name} · ${booking.items.length} service${booking.items.length > 1 ? 's' : ''} (sample)`, a: 'bdetail', id: booking.ref, u: 1 },
            ...s.notes,
          ],
        };
      });
    }, 900);
  }, [patch, toast, update]);

  const next = useCallback(() => {
    const d = stateRef.current.bk;
    if (!d || typeof d.step !== 'number') return;
    const p = getProvider(d.pid);
    if (!p) return;
    if (d.step === 2) {
      if (d.resched) return finishReschedule(d, p);
      const resolved = d.time !== null ? resolveStaff(d, p, stateRef.current.bookings)[d.time] : undefined;
      if (resolved === undefined) return;
      patch((x) => ({ ...x, resolved, step: 3, loc: p.type === 'home' ? 'home' : x.loc }));
      return;
    }
    if (d.step === 3) {
      if (d.loc === 'home' && d.addr.trim().length < 8) {
        const msg = d.addr.trim() ? 'Add the street, barangay and city so the professional can find you.' : 'Enter the address where the service will happen.';
        patch((x) => ({ ...x, addrErr: msg }));
        return;
      }
      patch((x) => ({ ...x, addrErr: '', step: 4, hold: Date.now() + HOLD_MS }));
      return;
    }
    if (d.step === 4) return confirm();
    const stepTo = (d.step + 1) as 1 | 2 | 3;
    patch((x) => ({ ...x, step: stepTo, date: stepTo === 2 && !x.date ? today() : x.date }));
  }, [confirm, finishReschedule, patch]);

  const prev = useCallback((): boolean => {
    const d = stateRef.current.bk;
    if (!d) {
      nav.pop();
      return true;
    }
    if (d.step === 'done') {
      update((s) => ({ ...s, bk: null }));
      nav.goRoot('home');
      return true;
    }
    const steps = stepsFor(d);
    const i = steps.indexOf(d.step);
    if (i <= 0) {
      update((s) => ({ ...s, bk: null }));
      nav.pop();
    } else {
      patch((x) => ({ ...x, step: steps[i - 1] as 0 | 1 | 2 | 3 | 4 }));
    }
    return true;
  }, [nav, patch, update]);

  const quit = useCallback(() => {
    const d = stateRef.current.bk;
    if (d && !d.resched && typeof d.step === 'number' && d.step > 0) {
      openSheet({ kind: 'discard' });
      return;
    }
    update((s) => ({ ...s, bk: null }));
    nav.pop();
    toast('Booking not saved');
  }, [nav, openSheet, toast, update]);

  const discard = useCallback(() => {
    closeSheet();
    update((s) => ({ ...s, bk: null }));
    nav.pop();
    toast('Booking discarded');
  }, [closeSheet, nav, toast, update]);

  const expireHold = useCallback(() => {
    toast('Your held slot expired. Pick a time again.');
    patch((x) => ({ ...x, step: 2, time: null }));
  }, [patch, toast]);

  const viewBooking = useCallback(
    (ref: string) => {
      update((s) => ({ ...s, bk: null }));
      nav.replaceStack('bookings', [{ name: 'BookingDetail', ref }]);
    },
    [nav, update],
  );

  const days = useCallback(() => Array.from({ length: 14 }, (_, i) => addDays(today(), i)), []);

  return {
    draft, start, toggleService, toggleAddon, setStaff, setDate, setTime, setLocation, setAddress, setPromoText, setPayment,
    toggleDeposit, applyPromo, toggleWaitlist, next, prev, quit, discard, expireHold, viewBooking, days,
  };
}

export type BookingFlow = ReturnType<typeof useBookingFlow>;