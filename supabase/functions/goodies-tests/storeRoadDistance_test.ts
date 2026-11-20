import {roadDistanceKm} from '../../../src/features/Goodies/deliveryDistance.ts';

function equal(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
}

Deno.test('Goodies store distance uses route metres, not GPS straight-line distance', () => {
  // Geoapify's road route may be much longer than the direct line between coordinates.
  equal(roadDistanceKm(12540), 12.54);
  equal(roadDistanceKm('1840'), 1.84);
  equal(roadDistanceKm(999), 0.999);
  equal(roadDistanceKm(0), 0);
});

Deno.test('Goodies store distance never invents kilometres from missing route results', () => {
  for (const value of [null, undefined, '', ' ', -1, -0.001, Number.NaN, Infinity, -Infinity, 'unavailable', {}, []]) {
    equal(roadDistanceKm(value), null);
  }
});
