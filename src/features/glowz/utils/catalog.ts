import { CATEGORIES } from '../data/categories';
import { PRICE } from '../data/prices';
import { PROVIDERS } from '../data/providers';
import type { Provider, Service } from '../types/provider';

export const getProvider = (id: string): Provider | undefined => PROVIDERS.find((p) => p.id === id);

export function getServiceById(id: string): { p: Provider; s: Service } | null {
  for (const p of PROVIDERS) {
    const s = p.svc.find((x) => x.id === id);
    if (s) return { p, s };
  }
  return null;
}

export const getServiceOf = (p: Provider, id: string): Service | undefined => p.svc.find((x) => x.id === id);

export const categoryName = (id: string): string => CATEGORIES.find((c) => c.id === id)?.name ?? id;

export const minPrice = (p: Provider): number => Math.min(...p.svc.map((s) => PRICE[s.id]));

export const providerIcon = (p: Provider): string => CATEGORIES.find((c) => c.id === p.cats[0])?.icon ?? 'spark';

export const categoryIcon = (id: string | undefined): string => CATEGORIES.find((c) => c.id === id)?.icon ?? 'spark';