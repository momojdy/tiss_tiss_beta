export type WoulibRideStatus =
  | 'REQUESTING'
  | 'ROUTE_CONFIRMED'
  | 'RIDE_OPTION_SELECTED'
  | 'DRIVER_SEARCHING'
  | 'DRIVER_OFFERED'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'PAYMENT'
  | 'RATING'
  | 'RECEIPT';

export const WoulibRideFlow: WoulibRideStatus[] = [
  'REQUESTING', 'ROUTE_CONFIRMED', 'RIDE_OPTION_SELECTED',
  'DRIVER_SEARCHING', 'DRIVER_OFFERED', 'DRIVER_ACCEPTED',
  'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED',
  'TRIP_COMPLETED', 'PAYMENT', 'RATING', 'RECEIPT',
];

export function nextWoulibStatus(status: WoulibRideStatus): WoulibRideStatus | null {
  const index = WoulibRideFlow.indexOf(status);
  return index >= 0 && index < WoulibRideFlow.length - 1 ? WoulibRideFlow[index + 1] : null;
}
