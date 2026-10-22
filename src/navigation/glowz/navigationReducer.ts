import type { GlowzNavState, GlowzRoute, ProviderTab, RootTab } from './GlowzNavigationTypes';

export type NavAction =
  | { type: 'push'; route: GlowzRoute }
  | { type: 'pop' }
  | { type: 'setTab'; tab: RootTab }
  /** Clear the stack, optionally switching tab. */
  | { type: 'reset'; tab?: RootTab }
  /** Replace the whole stack (used after booking to land on its detail). */
  | { type: 'replaceStack'; tab: RootTab; stack: GlowzRoute[] }
  | { type: 'setProviderTab'; tab: ProviderTab };

export const initialNav: GlowzNavState = { tab: 'home', stack: [] };

export function navigationReducer(s: GlowzNavState, a: NavAction): GlowzNavState {
  switch (a.type) {
    case 'push':
      return { ...s, stack: [...s.stack, a.route] };
    case 'pop':
      return s.stack.length ? { ...s, stack: s.stack.slice(0, -1) } : s;
    case 'setTab':
      return { tab: a.tab, stack: [] };
    case 'reset':
      return { tab: a.tab ?? s.tab, stack: [] };
    case 'replaceStack':
      return { tab: a.tab, stack: a.stack };
    case 'setProviderTab': {
      const top = s.stack[s.stack.length - 1];
      if (!top || top.name !== 'Provider') return s;
      return { ...s, stack: [...s.stack.slice(0, -1), { ...top, tab: a.tab }] };
    }
    default:
      return s;
  }
}
