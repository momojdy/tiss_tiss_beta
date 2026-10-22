import { PRICE } from '../../data/glowz/prices';
import { PROVIDERS } from '../../data/glowz/providers';
import { POSTS } from '../../data/glowz/posts';
import type { Booking } from '../../types/glowz/booking';
import type { Provider, Post } from '../../types/glowz/provider';
import type { Filters, SortKey } from '../../types/glowz/state';
import { categoryName, getProvider, minPrice } from './catalog';
import { hasSlotsToday, nextSlot } from './availability';

export const DEFAULT_FILTERS: Filters = { price: 'any', rating: 0, verified: false, loc: 'any', promo: false, today: false };

export function filterProviders(q: string, cat: string | null, f: Filters, sort: SortKey, bookings: Booking[]): Provider[] {
  const query = q.trim().toLowerCase();
  const r = PROVIDERS.filter((p) => {
    if (cat && !p.cats.includes(cat)) return false;
    if (query) {
      const hay = [p.name, p.area, p.bio, ...p.cats.map(categoryName), ...p.svc.map((s) => s.n), ...p.staff.map((s) => s.n)]
        .join(' ')
        .toLowerCase();
      if (!query.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    const mp = minPrice(p);
    if (f.price === 'lt1000' && mp >= 1000) return false;
    if (f.price === '1to3' && (mp < 1000 || mp > 3000)) return false;
    if (f.price === 'gt3' && mp <= 3000) return false;
    if (p.rating < f.rating) return false;
    if (f.verified && !p.v) return false;
    if (f.loc === 'salon' && p.type === 'home') return false;
    if (f.loc === 'home' && !p.home) return false;
    if (f.promo && !p.promo) return false;
    if (f.today && !hasSlotsToday(p, bookings)) return false;
    return true;
  });
  if (sort === 'distance') r.sort((a, b) => a.km - b.km);
  else if (sort === 'rating') r.sort((a, b) => b.rating - a.rating);
  else if (sort === 'price') r.sort((a, b) => minPrice(a) - minPrice(b));
  else if (sort === 'soon') {
    const t = (p: Provider): number => {
      const n = nextSlot(p, bookings);
      return n ? n.date.getTime() + n.time * 60000 : 9e15;
    };
    r.sort((a, b) => t(a) - t(b));
  } else {
    r.sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || b.rating * Math.log(b.rv) - a.rating * Math.log(a.rv));
  }
  return r;
}

export function filterPosts(q: string, cat: string | null): Post[] {
  const query = q.toLowerCase();
  return POSTS.filter((x) => {
    const p = getProvider(x.p);
    if (!p) return false;
    if (cat && !p.cats.includes(cat)) return false;
    return !q || (x.cap + p.name).toLowerCase().includes(query);
  });
}

export const activeFilterCount = (f: Filters): number =>
  Number(f.price !== 'any') + Number(f.rating > 0) + Number(f.verified) + Number(f.loc !== 'any') + Number(f.promo) + Number(f.today);

/** Provider lists behind the Home sections and their "See all" screens. */
export function sectionProviders(id: string, bookings: Booking[]): Provider[] {
  if (id === 'avail') return PROVIDERS.filter((p) => hasSlotsToday(p, bookings));
  if (id === 'pop') return [...PROVIDERS].sort((a, b) => b.rv - a.rv);
  if (id === 'top') return PROVIDERS.filter((p) => p.rating >= 4.7 && p.rv >= 50).sort((a, b) => b.rating - a.rating);
  if (id === 'deals') return PROVIDERS.filter((p) => p.promo);
  if (id === 'home') return PROVIDERS.filter((p) => p.home);
  return PROVIDERS.filter((p) => p.isNew);
}

export const priceOf = (serviceId: string): number => PRICE[serviceId];
