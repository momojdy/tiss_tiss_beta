import React from 'react';
import { GlowzBookingDetailScreen } from '../screens/GlowzBookingDetailScreen';
import { GlowzBookingFlowScreen } from '../screens/GlowzBookingFlowScreen';
import { GlowzBookingsScreen } from '../screens/GlowzBookingsScreen';
import { GlowzChatListScreen } from '../screens/GlowzChatListScreen';
import { GlowzChatScreen } from '../screens/GlowzChatScreen';
import { GlowzExploreScreen } from '../screens/GlowzExploreScreen';
import { GlowzFavoritesScreen } from '../screens/GlowzFavoritesScreen';
import { GlowzHomeScreen } from '../screens/GlowzHomeScreen';
import { GlowzNotificationsScreen } from '../screens/GlowzNotificationsScreen';
import { GlowzProfileScreen } from '../screens/GlowzProfileScreen';
import { GlowzProviderScreen } from '../screens/GlowzProviderScreen';
import { GlowzRecentScreen } from '../screens/GlowzRecentScreen';
import { GlowzSectionListScreen } from '../screens/GlowzSectionListScreen';
import type { GlowzRoute, RootTab } from './GlowzNavigationTypes';

export function RootTabView({ tab }: { tab: RootTab }) {
  switch (tab) {
    case 'home': return <GlowzHomeScreen />;
    case 'explore': return <GlowzExploreScreen />;
    case 'bookings': return <GlowzBookingsScreen />;
    case 'favs': return <GlowzFavoritesScreen />;
    case 'me': return <GlowzProfileScreen />;
    default: return null;
  }
}

/** The one place that maps a typed route to its screen. */
export function RouteView({ route }: { route: GlowzRoute }) {
  switch (route.name) {
    case 'Provider': return <GlowzProviderScreen id={route.id} tab={route.tab} />;
    case 'Booking': return <GlowzBookingFlowScreen />;
    case 'BookingDetail': return <GlowzBookingDetailScreen bookingRef={route.ref} />;
    case 'Notifications': return <GlowzNotificationsScreen />;
    case 'ChatList': return <GlowzChatListScreen />;
    case 'Chat': return <GlowzChatScreen providerId={route.id} />;
    case 'SectionList': return <GlowzSectionListScreen id={route.id} title={route.title} />;
    case 'Recent': return <GlowzRecentScreen />;
    default: return null;
  }
}
