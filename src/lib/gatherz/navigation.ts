export type RouteName = 'home' | 'favorites' | 'moments' | 'tickets' | 'circles' | 'explore' | 'event' | 'ticket';
export interface RouteDef { title: string; root: boolean }
/** Single source of truth: only root routes show the bottom navigation. */
export const ROUTES: Record<RouteName, RouteDef> = {
  home: { title: 'Home', root: true }, favorites: { title: 'Favorites', root: true }, moments: { title: 'Moments', root: true }, tickets: { title: 'My Tickets', root: true }, circles: { title: 'Circles', root: true },
  explore: { title: 'Explore', root: false }, event: { title: 'Event', root: false }, ticket: { title: 'Ticket Details', root: false },
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