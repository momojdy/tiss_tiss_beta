import {coordinate, courierLocation, freshGpsSample, routeSegments, trackingRegion, GPS_MAX_AGE_MS} from '../../../src/features/Goodies/deliveryTracking.ts';

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const now = Date.parse('2026-11-06T12:00:00Z');
const assignment = {status: 'accepted', latitude: 18.5, longitude: -72.3, location_updated_at: new Date(now).toISOString()};
Deno.test('queued old GPS samples cannot be submitted as fresh positions', () => {
  equal(freshGpsSample({timestamp: now, coords: assignment}, now), true);
  for (const timestamp of [now - GPS_MAX_AGE_MS - 1, now + 60_000, NaN, null]) equal(freshGpsSample({timestamp, coords: assignment}, now), false);
  equal(freshGpsSample({timestamp: now, coords: {latitude: 100, longitude: 0}}, now), false);
});

Deno.test('GPS expires without realtime events and accepts the freshness boundary', () => {
  equal(!!courierLocation(assignment, now + GPS_MAX_AGE_MS), true);
  equal(courierLocation(assignment, now + GPS_MAX_AGE_MS + 1), null);
});
Deno.test('only accepted active assignments expose a courier position', () => {
  for (const status of ['offered', 'rejected', 'cancelled', 'delivered', 'completed', '']) equal(courierLocation({...assignment, status}, now), null);
  equal(!!courierLocation({...assignment, status: 'picked_up'}, now), true);
  equal(courierLocation(null, now), null);
});
Deno.test('missing, invalid and implausibly future GPS timestamps are rejected', () => {
  for (const location_updated_at of [null, '', 'invalid', new Date(now + 60_000).toISOString()]) equal(courierLocation({...assignment, location_updated_at}, now), null);
});
Deno.test('coordinates reject missing, non-finite and out-of-range data while retaining zero', () => {
  for (const latitude of [null, undefined, '', NaN, Infinity, 91, -91]) equal(coordinate({latitude, longitude: 0}), null);
  equal(coordinate({latitude: 0, longitude: 181}), null);
  equal(coordinate({latitude: '0', longitude: '0'}), {latitude: 0, longitude: 0});
});
Deno.test('road geometry preserves disconnected segments without fabricating connecting roads', () => {
  const result = routeSegments({type: 'MultiLineString', coordinates: [[[1,2],[3,4]],[[5,6],[7,8]]]});
  equal(result.length, 2);
  equal(result[0], [{latitude: 2, longitude: 1}, {latitude: 4, longitude: 3}]);
  equal(routeSegments({type: 'Polygon', coordinates: [[[1,2],[3,4]]]}), []);
  equal(routeSegments({type: 'LineString', coordinates: [[1,2],null,[3,4]]}), []);
  equal(routeSegments({type: 'LineString', coordinates: [[1,2],[3,100]]}), []);
});
Deno.test('viewport contains distant store, customer, courier and route points', () => {
  const region = trackingRegion([{latitude: 18, longitude: -73}, {latitude: 19, longitude: -72}, null]);
  equal(region, {latitude: 18.5, longitude: -72.5, latitudeDelta: 1.3, longitudeDelta: 1.3});
  equal(trackingRegion([null, {latitude: 100, longitude: 0}]), null);
});
