import type { PrezoRoute } from '../../types/prezo';

export const routeKey = (route: PrezoRoute): string => {
  switch (route.name) {
    case 'explore':
      return `explore/${route.category ?? ''}`;
    case 'me':
      return `me/${route.tab}`;
    case 'campaign':
    case 'seller':
    case 'order':
    case 'waitlistEntry':
    case 'alert':
      return `${route.name}/${route.id}`;
    case 'checkout':
      return `checkout/${route.campaignId}/${route.waitlistEntryId ?? ''}`;
    case 'confirmation':
    case 'fallback':
      return `${route.name}/${route.orderId}`;
    case 'faq':
    case 'policy':
      return `${route.name}/${route.topic}`;
    case 'report':
      return `report/${route.relatedId ?? ''}`;
    default:
      return route.name;
  }
};

export const isRootRoute = (route: PrezoRoute): boolean =>
  route.name === 'home' ||
  route.name === 'explore' ||
  route.name === 'me' ||
  route.name === 'profile';

export const showsTabBar = (route: PrezoRoute): boolean => isRootRoute(route);

export type PrimaryTab = 'home' | 'explore' | 'waitlist' | 'orders' | 'profile';

export const getActiveTab = (route: PrezoRoute): PrimaryTab | null => {
  switch (route.name) {
    case 'home':
      return 'home';
    case 'explore':
      return 'explore';
    case 'me':
      return route.tab === 'wl' ? 'waitlist' : 'orders';
    case 'profile':
      return 'profile';
    default:
      return null;
  }
};

export const primaryTabs: { key: PrimaryTab; label: string; route: PrezoRoute }[] = [
  { key: 'home', label: 'Home', route: { name: 'home' } },
  { key: 'explore', label: 'Explore', route: { name: 'explore', category: null } },
  { key: 'waitlist', label: 'Waitlist', route: { name: 'me', tab: 'wl' } },
  { key: 'orders', label: 'Orders', route: { name: 'me', tab: 'orders' } },
  { key: 'profile', label: 'Profile', route: { name: 'profile' } },
];

export const getParentRoute = (route: PrezoRoute): PrezoRoute => {
  switch (route.name) {
    case 'campaign':
    case 'seller':
      return { name: 'explore', category: null };
    case 'checkout':
      return { name: 'campaign', id: route.campaignId };
    case 'confirmation':
    case 'order':
      return { name: 'me', tab: 'orders' };
    case 'fallback':
      return { name: 'order', id: route.orderId };
    case 'waitlistEntry':
      return { name: 'me', tab: 'wl' };
    case 'alert':
      return { name: 'alerts' };
    case 'help':
      return { name: 'profile' };
    case 'faq':
    case 'report':
    case 'support':
    case 'policy':
      return { name: 'help' };
    default:
      return { name: 'home' };
  }
};

export const getRouteTitle = (route: PrezoRoute): string => {
  switch (route.name) {
    case 'home':
      return 'Prezo';
    case 'explore':
      return 'Explore';
    case 'me':
      return route.tab === 'wl' ? 'Waitlist' : 'Orders';
    case 'profile':
      return 'Profile';
    case 'campaign':
      return 'Campaign';
    case 'seller':
      return 'Seller';
    case 'checkout':
      return 'Checkout';
    case 'confirmation':
      return 'Order placed';
    case 'order':
      return 'Order';
    case 'fallback':
      return 'Fallback decision';
    case 'waitlistEntry':
      return 'Waitlist entry';
    case 'alerts':
      return 'Alerts';
    case 'alert':
      return 'Alert';
    case 'help':
    case 'faq':
      return 'Help';
    case 'report':
      return 'Report a problem';
    case 'support':
      return 'Contact support';
    case 'policy':
      return 'Policies';
    default:
      return '';
  }
};

export interface NavigationState {
  stack: PrezoRoute[];
  restoreScroll: boolean;
}

export const initialNavigationState: NavigationState = {
  stack: [{ name: 'home' }],
  restoreScroll: false,
};

const MAX_STACK = 40;

export const pushRoute = (state: NavigationState, route: PrezoRoute): NavigationState => {
  if (isRootRoute(route)) return { stack: [route], restoreScroll: false };
  const base =
    route.name === 'confirmation'
      ? state.stack.filter((entry) => entry.name !== 'checkout')
      : state.stack;
  const last = base[base.length - 1];
  const next = last && routeKey(last) === routeKey(route) ? base : [...base, route];
  return { stack: next.length > MAX_STACK ? next.slice(1) : next, restoreScroll: false };
};

export const replaceRoute = (state: NavigationState, route: PrezoRoute): NavigationState => {
  if (isRootRoute(route)) return { stack: [route], restoreScroll: false };
  const next = state.stack.slice(0, -1);
  return { stack: [...next, route], restoreScroll: false };
};

export const popRoute = (state: NavigationState): NavigationState => {
  const current = state.stack[state.stack.length - 1];
  const remaining = state.stack.slice(0, -1);
  let target = remaining[remaining.length - 1] ?? getParentRoute(current);
  if (routeKey(target) === routeKey(current)) target = getParentRoute(current);
  if (routeKey(target) === routeKey(current)) target = { name: 'home' };
  return {
    stack: remaining.length ? [...remaining.slice(0, -1), target] : [target],
    restoreScroll: true,
  };
};

