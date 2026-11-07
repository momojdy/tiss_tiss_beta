export const SECONDARY_ROUTES = {
  explore: 'Explore', event: 'Event', buy: 'Tickets', tk: 'Ticket Details',
  help: 'Help Center', notif: 'Notifications', all: 'See All',
  send: 'Transfer Ticket', msgs: 'Messages', bs: 'Scanner',
  mp: 'Upload Moment', claim: 'Ticket Invitation', grp: 'Group Tickets',
  rv: 'Checkout', pm: 'Payment', pf: 'Payment', ok: 'Confirmation',
  rc: 'Receipt', ords: 'Purchase History', rf: 'Request Refund',
  dl: 'Download Ticket', sh: 'Share', rp: 'Report', org: 'Organizer',
  ci: 'Circle', inv: 'Invitations', mv: 'Photo', ha: 'Help Article',
  cs: 'Contact Support', sc: 'Support Case', dc: 'Demo Controls',
  prefs: 'Preferences', pst: 'Post', mem: 'Member',
} as const;
export type SecondaryRoute = keyof typeof SECONDARY_ROUTES;
export type RouteName = 'home' | 'favorites' | 'moments' | 'tickets' | 'circles' | 'ticket' | SecondaryRoute;
export interface RouteDef { title: string; root: boolean }
export const ROUTES: Record<RouteName, RouteDef> = {
  home: { title: 'Home', root: true },
  favorites: { title: 'Favorites', root: true },
  moments: { title: 'Moments', root: true },
  tickets: { title: 'My Tickets', root: true },
  ticket: { title: 'Ticket Details', root: false },
  circles: { title: 'Circles', root: true },
  ...Object.fromEntries(Object.entries(SECONDARY_ROUTES).map(([key, title]) => [key, { title, root: false }])) as Record<SecondaryRoute, RouteDef>,
};
export const TABS: RouteName[] = ['home', 'favorites', 'moments', 'tickets', 'circles'];
export interface NavEntry { route: RouteName; params?: { id?: string } }
export type NavAction = { type: 'push'; entry: NavEntry } | { type: 'back' } | { type: 'tab'; route: RouteName };
export function navReducer(stack: NavEntry[], a: NavAction): NavEntry[] {
  switch (a.type) {
    case 'push': { const t = stack[stack.length - 1]; return t.route === a.entry.route && t.params?.id === a.entry.params?.id ? stack : [...stack, a.entry]; }
    case 'back': return stack.length > 1 ? stack.slice(0, -1) : stack;
    case 'tab': return [{ route: a.route }];
  }
}
export const isRoot = (e: NavEntry) => ROUTES[e.route].root;
