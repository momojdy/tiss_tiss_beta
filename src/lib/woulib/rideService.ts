import { WoulibRideStatus } from './rideState';

export type WoulibRideService = {
  requestRide: (onStatus: (status: WoulibRideStatus) => void) => () => void;
  cancelRide: () => void;
};

/**
 * Demo adapter for the Woulib UI.
 *
 * The screen talks to this interface instead of owning the simulated timers.
 * Replace this adapter with a Supabase Realtime implementation when the real
 * driver/matching backend is ready; the Woulib UI does not need to change.
 */
export function createDemoWoulibRideService(): WoulibRideService {
  let timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  return {
    requestRide: (onStatus) => {
      cancelled = false;
      clear();
      onStatus('DRIVER_SEARCHING');
      timers = [
        setTimeout(() => !cancelled && onStatus('DRIVER_OFFERED'), 900),
        setTimeout(() => !cancelled && onStatus('DRIVER_ACCEPTED'), 1800),
      ];
      return clear;
    },
    cancelRide: () => {
      cancelled = true;
      clear();
    },
  };
}
