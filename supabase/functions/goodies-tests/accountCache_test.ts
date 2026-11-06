import {ownedCache, cacheEnvelope} from '../../../src/features/Goodies/accountCache.ts';
function check(condition: boolean) {if (!condition) throw new Error('Cache ownership boundary failed');}
Deno.test('private caches hydrate only for their original account', () => {
  const data = {pf: {n: 'Synthetic customer A'}, addr: [{t: 'Synthetic address'}], orders: [{id: 'synthetic'}]};
  const stored = JSON.parse(JSON.stringify(cacheEnvelope('customer-a', data)));
  check(ownedCache(stored, 'customer-a')?.pf.n === 'Synthetic customer A');
  check(ownedCache(stored, 'customer-b') === null);
  check(ownedCache(stored, null) === null);
});
Deno.test('legacy caches with unknown owners and malformed envelopes never hydrate', () => {
  for (const raw of [null, {}, {pf: {n: 'Unknown customer'}}, {ownerId: 'a'}, {ownerId: 'a', data: []}]) check(ownedCache(raw, 'a') === null);
});
Deno.test('guest cart caches cannot restore into signed-in accounts', () => {
  const stored = cacheEnvelope(null, {cart: {lines: []}});
  check(ownedCache(stored, null) !== null);
  check(ownedCache(stored, 'customer-a') === null);
});
