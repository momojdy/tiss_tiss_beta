/* Pure-logic tests. Run with: npx tsx --test src/test/Glowz/logic.test.ts  (or node --test after transpiling). */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialState } from '../../data/glowz/seeds';
import { initialNav, navigationReducer } from '../../navigation/glowz/navigationReducer';
import { hoursUntil, nextSlot, slotsFor } from '../../util/Glowz/availability';
import { newDraft, resolveStaff, stepHint, stepsFor, rescheduleDraft } from '../../util/Glowz/bookingDraft';
import { addDays, today } from '../../util/Glowz/clock';
import { DEFAULT_FILTERS, filterPosts, filterProviders, sectionProviders } from '../../util/Glowz/filtering';
import { fmtCountdown, fmtD, fmtT, peso } from '../../util/Glowz/format';
import { createSnapshot, restoreSnapshot } from '../../util/Glowz/persistence';
import { bookingTotals, checkPromo } from '../../util/Glowz/pricing';
import { getProvider, minPrice } from '../../util/Glowz/catalog';
import { validateProfile } from '../../util/Glowz/profileValidation';

const p1 = getProvider('p1')!;
const p3 = getProvider('p3')!;
const p6 = getProvider('p6')!;

test('formatting', () => {
  assert.equal(peso(1234567), '₱1,234,567');
  assert.equal(peso(850), '₱850');
  assert.equal(fmtT(630), '10:30 AM');
  assert.equal(fmtT(720), '12:00 PM');
  assert.equal(fmtT(1140), '7:00 PM');
  assert.equal(fmtD(new Date(2026, 9, 21), true), 'Wednesday, October 21');
  assert.equal(fmtD(new Date(2026, 9, 21)), 'Wed, Oct 21');
  assert.equal(fmtCountdown(300), '5:00');
  assert.equal(fmtCountdown(65), '1:05');
});

test('totals: promo, 3% fee, deposit, travel, venue payment', () => {
  const d = newDraft(p1, 'm2'); // Balayage 4500
  assert.equal(bookingTotals(d, p1).sub, 4500);
  d.applied = 'GLOW10';
  let t = bookingTotals(d, p1);
  assert.equal(t.disc, 450);
  assert.equal(t.fee, Math.round(4050 * 0.03));
  assert.equal(t.total, 4050 + t.fee);
  d.pay = 'Card';
  d.dep = true;
  t = bookingTotals(d, p1);
  assert.equal(t.now, Math.round(t.total * 0.3));
  d.pay = 'Pay at venue';
  assert.equal(bookingTotals(d, p1).now, 0);
  const h = newDraft(p6, 'h2');
  assert.equal(h.loc, 'home');
  assert.equal(bookingTotals(h, p6).trav, 150);
  const addOn = newDraft(p1, 'm1');
  addOn.items[0].add = ['Deep conditioning'];
  assert.equal(bookingTotals(addOn, p1).sub, 850 + 250);
});

test('promo rules', () => {
  assert.equal(checkPromo('NOPE', 1000, p1).ok, false);
  assert.equal(checkPromo('GLOW10', 1000, p3).ok, false); // provider without GLOW10
  assert.equal(checkPromo('FIRST200', 500, p1).ok, false); // below minimum
  const r = checkPromo('FIRST200', 900, p1);
  assert.ok(r.ok && r.amount === 200);
});

test('availability is deterministic and respects the customer own bookings', () => {
  const d = addDays(today(), 3);
  const a = slotsFor(p1, 'Bea Santos', d, 45, []);
  assert.deepEqual(a, slotsFor(p1, 'Bea Santos', d, 45, []));
  assert.ok(a.length > 0);
  const blocked = a[0];
  const bk = { ...createInitialState().bookings[0], p: 'p1', staff: 'Bea Santos', date: d, time: blocked, status: 'confirmed' as const };
  assert.ok(!slotsFor(p1, 'Bea Santos', d, 45, [bk]).includes(blocked));
  // cancelled bookings free the slot again
  assert.ok(slotsFor(p1, 'Bea Santos', d, 45, [{ ...bk, status: 'cancelled' }]).includes(blocked));
  // closed Sundays for p3
  let sun = today();
  while (sun.getDay() !== 0) sun = addDays(sun, 1);
  assert.deepEqual(slotsFor(p3, 'Joy Mendoza', sun, 30, []), []);
  // today never offers slots before 11:00 (demo clock 10:00 + 60)
  assert.ok(slotsFor(p1, 'Bea Santos', today(), 45, []).every((m) => m >= 660));
  assert.ok(nextSlot(p1, [])!.d >= 0);
});

test('hoursUntil uses the demo clock', () => {
  const b = { ...createInitialState().bookings[0], date: addDays(today(), 1), time: 600 };
  assert.equal(hoursUntil(b), 24);
});

test('draft: staff resolution, steps and hints', () => {
  const s = createInitialState();
  const d = newDraft(p1, 'm1');
  d.date = addDays(today(), 2);
  const map = resolveStaff(d, p1, s.bookings);
  assert.ok(Object.keys(map).length > 0);
  assert.ok(Object.values(map).every((n) => p1.staff.some((x) => x.n === n)));
  d.staff = 'Migs Ortega';
  assert.ok(Object.values(resolveStaff(d, p1, s.bookings)).every((n) => n === 'Migs Ortega'));
  assert.deepEqual(stepsFor(d), [0, 1, 2, 3, 4]);
  const rs = rescheduleDraft(s.bookings[0]);
  assert.deepEqual(stepsFor(rs), [2]);
  assert.equal(rs.step, 2);
  assert.ok(rs.date);
  assert.equal(stepHint({ ...d, step: 0 }, false), 'Select at least one service to continue.');
  assert.equal(stepHint({ ...d, step: 2 }, false), 'Choose an available time to continue.');
  assert.equal(stepHint({ ...d, step: 4 }, false), 'Choose a payment method to continue.');
  assert.equal(stepHint({ ...d, step: 4, processing: true }, false), '');
  assert.equal(stepHint({ ...d, step: 0 }, true), '');
});

test('search, filters and sort', () => {
  const s = createInitialState();
  const ids = (q: string, f = DEFAULT_FILTERS, sort: 'relevance' | 'price' | 'distance' | 'rating' = 'relevance', cat: string | null = null) =>
    filterProviders(q, cat, f, sort, s.bookings).map((p) => p.id);
  assert.deepEqual(ids('manicure').sort(), ['p2', 'p6']); // salon plus Hanna's home gel manicure
  assert.deepEqual(ids('zzzz'), []);
  assert.ok(ids('', DEFAULT_FILTERS, 'relevance', 'nails').every((id) => id === 'p2' || id === 'p6'));
  assert.ok(ids('', { ...DEFAULT_FILTERS, loc: 'home' }).every((id) => id === 'p6'));
  assert.ok(!ids('', { ...DEFAULT_FILTERS, verified: true }).includes('p5'));
  assert.ok(ids('', { ...DEFAULT_FILTERS, promo: true }).every((id) => id === 'p1' || id === 'p4'));
  const byPrice = filterProviders('', null, DEFAULT_FILTERS, 'price', s.bookings);
  const mins = byPrice.map((p) => minPrice(p));
  assert.deepEqual(mins, [...mins].sort((a, b) => a - b));
  const byDist = ids('', DEFAULT_FILTERS, 'distance');
  assert.equal(byDist[0], 'p1');
  assert.ok(filterPosts('balayage', null).length >= 1);
  assert.equal(filterPosts('zzz', null).length, 0);
  assert.ok(sectionProviders('home', s.bookings).every((p) => p.home));
  assert.ok(sectionProviders('new', s.bookings).every((p) => p.isNew));
});

test('persistence round trip, corrupt data and invalid fields', () => {
  const s = createInitialState();
  s.favP = ['p1', 'p4'];
  s.profile = { name: 'Lia Cruz', phone: '+63 917 123 4567' };
  s.prefs.promo = false;
  s.theme = 'dark';
  s.cover = { kind: 'tone', index: 2 };
  const nav = { tab: 'bookings' as const, stack: [{ name: 'Provider' as const, id: 'p2', tab: 'port' as const }, { name: 'Booking' as const }] };
  const json = createSnapshot(s, nav);
  const r = restoreSnapshot(json, createInitialState());
  assert.deepEqual(r.state.favP, ['p1', 'p4']);
  assert.equal(r.state.profile.name, 'Lia Cruz');
  assert.equal(r.state.prefs.promo, false);
  assert.equal(r.state.theme, 'dark');
  assert.deepEqual(r.state.cover, { kind: 'tone', index: 2 });
  assert.equal(r.state.bookings.length, 5);
  assert.ok(r.state.bookings[0].date instanceof Date);
  assert.equal(r.nav.tab, 'bookings');
  assert.equal(r.nav.stack.length, 1); // Booking draft is never restored
  assert.equal(r.nav.stack[0].name, 'Provider');

  const base = createInitialState();
  assert.equal(restoreSnapshot('{bad json', base).state, base);
  assert.equal(restoreSnapshot(null, base).state, base);
  assert.equal(restoreSnapshot(JSON.stringify({ v: 1 }), base).state, base);

  const bad = JSON.stringify({
    v: 2,
    nav: { tab: 'x', stack: [{ name: 'Provider', id: 'zzz' }, { name: 'BookingDetail', ref: 'NOPE' }, { name: 'Chat', id: 'p1' }] },
    state: { favP: ['nope', 'p1', 5], bookings: [{ ref: 1 }], profile: { name: '   ' }, cover: { kind: 'uri', uri: 'x'.repeat(500000) }, theme: 'purple', prefs: { promo: 'yes' } },
  });
  const rb = restoreSnapshot(bad, createInitialState());
  assert.deepEqual(rb.state.favP, ['p1']);
  assert.equal(rb.state.bookings.length, 5);
  assert.equal(rb.state.profile.name, 'Maya Reyes');
  assert.equal(rb.state.cover, null);
  assert.equal(rb.state.theme, 'light');
  assert.equal(rb.state.prefs.promo, true);
  assert.equal(rb.nav.tab, 'home');
  assert.deepEqual(rb.nav.stack.map((e) => e.name), ['Chat']);
});

test('profile validation', () => {
  assert.deepEqual(validateProfile('Lia', ''), {});
  assert.equal(validateProfile('  ', '').name, 'Enter a name.');
  assert.equal(validateProfile('x'.repeat(41), '').name, 'Use 40 characters or fewer.');
  assert.ok(validateProfile('Lia', 'abc').phone);
  assert.deepEqual(validateProfile('Lia', '+63 917 123 4567'), {});
});

test('navigation reducer', () => {
  let s = initialNav;
  s = navigationReducer(s, { type: 'push', route: { name: 'Provider', id: 'p1', tab: 'svc' } });
  s = navigationReducer(s, { type: 'push', route: { name: 'Booking' } });
  assert.equal(s.stack.length, 2);
  s = navigationReducer(s, { type: 'pop' });
  assert.equal(s.stack[0].name, 'Provider');
  s = navigationReducer(s, { type: 'setProviderTab', tab: 'rev' });
  assert.equal((s.stack[0] as { tab?: string }).tab, 'rev');
  s = navigationReducer(s, { type: 'setTab', tab: 'favs' });
  assert.deepEqual(s, { tab: 'favs', stack: [] });
  assert.equal(navigationReducer(s, { type: 'pop' }), s);
  s = navigationReducer(s, { type: 'replaceStack', tab: 'bookings', stack: [{ name: 'BookingDetail', ref: 'GLZ-1' }] });
  assert.equal(s.tab, 'bookings');
  assert.equal(s.stack.length, 1);
  s = navigationReducer(s, { type: 'reset', tab: 'home' });
  assert.deepEqual(s, { tab: 'home', stack: [] });
});
