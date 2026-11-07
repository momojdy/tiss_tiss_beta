import { createContext, useContext } from 'react';
import type { GatherzRepository } from '../../types/gatherz';
import type { RouteName } from '../../lib/gatherz/navigation';
export interface GatherzCtx {
  repo: GatherzRepository; now: number; root: boolean;
  nav: { push: (route: RouteName, id?: string) => void; back: () => void; tab: (route: RouteName) => void };
  toggleTheme: () => void;
}
export const GatherzContext = createContext<GatherzCtx | null>(null);
export const useGatherz = () => { const c = useContext(GatherzContext); if (!c) throw new Error('Gatherz context missing'); return c; };