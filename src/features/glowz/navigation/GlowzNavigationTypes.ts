export type RootTab = 'home' | 'explore' | 'bookings' | 'favs' | 'me';
export const ROOT_TABS: RootTab[] = ['home', 'explore', 'bookings', 'favs', 'me'];

export type ProviderTab = 'svc' | 'port' | 'rev' | 'about';

/** Every secondary destination, with its typed parameters. */
export type GlowzRoute =
  | { name: 'Provider'; id: string; tab?: ProviderTab }
  | { name: 'Booking' }
  | { name: 'BookingDetail'; ref: string }
  | { name: 'Notifications' }
  | { name: 'ChatList' }
  | { name: 'Chat'; id: string }
  | { name: 'SectionList'; id: string; title: string }
  | { name: 'Recent' };

export type GlowzRouteName = GlowzRoute['name'];

/** Routes that may be restored from saved state after a restart. */
export const RESTORABLE_ROUTES: GlowzRouteName[] = ['Provider', 'BookingDetail', 'Notifications', 'Chat', 'ChatList', 'SectionList', 'Recent'];

export interface GlowzNavState {
  tab: RootTab;
  stack: GlowzRoute[];
}