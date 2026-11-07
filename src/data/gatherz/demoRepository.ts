import type { Admission, GatherzEvent, GatherzRepository, GatherzTier, GatherzOrder } from '../../types/gatherz';
const DAY = 864e5, HOUR = 36e5;
const tiers = (base: number, backstage = false): GatherzTier[] => base === 0 ? [{ key: 'general', name: 'General', price: 0, admissions: 1 }] : [
  { key: 'general', name: 'General', price: base, admissions: 1 }, { key: 'vip', name: 'VIP', price: Math.round(base * 2.4), admissions: 1 },
  ...(backstage ? [{ key: 'backstage' as const, name: 'Backstage', price: base * 5, admissions: 1 }] : []),
  { key: 'general', name: 'Group of 5', price: base * 4, admissions: 5 },
];
/** Dates are relative to "now" so the demo never goes stale. */
export function createDemoRepository(now = Date.now()): GatherzRepository {
  const at = (d: number, h: number, len = 3) => ({ startsAt: new Date(now + d * DAY + h * HOUR).toISOString(), endsAt: new Date(now + d * DAY + (h + len) * HOUR).toISOString() });
  const base = { timezone: 'Asia/Manila' };
  const events: GatherzEvent[] = [
    { id: 'e1', title: 'Rooftop Jazz Night', tagline: 'Live music above the city lights', category: 'Music', venue: 'Skyline Terrace', area: 'Makati', ...at(8, 2, 4), ...base, remaining: 120, organizerName: 'Skyline Collective', art: 0, tiers: tiers(25, true) },
    { id: 'e2', title: 'After Dark: Warehouse Set', tagline: 'Techno until sunrise', category: 'Nightlife', venue: 'The Vault', area: 'Makati', ...at(15, 3, 5), ...base, remaining: 60, organizerName: 'Skyline Collective', art: 3, tiers: tiers(30, true), policy: { admission: 'id', age: '21+' } },
    { id: 'e3', title: 'Harbor Street Food Fest', tagline: 'Forty stalls, one waterfront', category: 'Food', venue: 'Harbor Green', area: 'Pasig', ...at(3, -8, 8), ...base, remaining: 400, organizerName: 'Riverside Events', art: 1, tiers: tiers(0) },
    { id: 'e4', title: 'Sip & Sketch Social', tagline: 'Wine, paper and new friends', category: 'Culture', venue: 'Maison Atelier', area: 'BGC', ...at(5, 1, 3), ...base, remaining: 28, organizerName: 'Maison Arts', art: 4, tiers: tiers(25), policy: { admission: 'named' } },
    { id: 'e5', title: 'Block Party Reunion', tagline: 'The one you missed', category: 'Nightlife', venue: 'The Loft', area: 'Pasig', ...at(-14, 2, 4), ...base, remaining: 0, organizerName: 'Skyline Collective', art: 2, tiers: tiers(20) },
  ];
  const adm = (id: string, eventId: string, tier: Admission['tier'], status: Admission['status'] = 'valid'): Admission => ({ id, eventId, tier, orderId: 'ord-' + eventId, ownerId: 'me', status, credentialCode: `GZ-${tier.slice(0, 3).toUpperCase()}-${id.toUpperCase()}` });
  const mine: Admission[] = [adm('a1', 'e1', 'vip'), adm('a2', 'e1', 'general'), adm('a3', 'e3', 'general'), adm('a4', 'e4', 'backstage'), adm('a5', 'e5', 'general', 'checked_in')];
  const orders: GatherzOrder[] = [];
  const reserved: Record<string, number> = {};
  return {
    mode: 'demo',
    listEvents: async () => events.filter(e => Date.parse(e.endsAt) > now).map(e => ({ ...e, remaining: Math.max(0, e.remaining - (reserved[e.id] ?? 0)) })),
    getEvent: async id => { const e = events.find(e => e.id === id); return e ? { ...e, remaining: Math.max(0, e.remaining - (reserved[id] ?? 0)) } : null; },
    listMyAdmissions: async () => [...mine],
    listOrders: async () => [...orders],
    placeDemoOrder: async (eventId, tierName, quantity) => {
      const e = events.find(x => x.id === eventId), tier = e?.tiers.find(x => x.name === tierName);
      if (!e || !tier || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error('Invalid ticket selection');
      if (Date.parse(e.startsAt) <= Date.now()) throw new Error('Ticket sales have closed');
      const count = quantity * tier.admissions;
      if (count > e.remaining - (reserved[eventId] ?? 0)) throw new Error('Not enough tickets available');
      const order: GatherzOrder = { id: 'demo-order-' + (orders.length + 1), eventId, tierName, quantity, admissions: count, subtotal: quantity * tier.price, total: quantity * tier.price, createdAt: new Date().toISOString(), status: 'demo_paid' };
      orders.unshift(order); reserved[eventId] = (reserved[eventId] ?? 0) + count;
      for (let i = 0; i < count; i++) mine.unshift({ id: order.id + '-a' + (i + 1), eventId, tier: tier.key, orderId: order.id, ownerId: 'me', status: 'valid', credentialCode: 'GZ-DEMO-' + order.id + '-' + (i + 1) });
      return order;
    },
  };
}