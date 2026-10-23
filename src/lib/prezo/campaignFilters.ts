import type { Campaign } from '../../types/prezo';
import { DAY_MS } from './format';
import { getPopularityScore } from './campaignRules';

export type StatusFilter = 'all' | 'live' | 'upcoming' | 'successful' | 'failed' | 'other';
export type ModeFilter = 'all' | 'group' | 'preorder';
export type SortKey = 'rel' | 'pop' | 'end' | 'new' | 'price';
export type QuickFilter = '' | 'feat' | 'live' | 'end';

export interface ExploreFilters {
  query: string;
  status: StatusFilter;
  mode: ModeFilter;
  category: string | null;
  maxPrice: number | null;
  sort: SortKey;
  quick: QuickFilter;
}

export const defaultExploreFilters: ExploreFilters = {
  query: '',
  status: 'all',
  mode: 'all',
  category: null,
  maxPrice: null,
  sort: 'rel',
  quick: '',
};

export const statusFilterOptions: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'successful', label: 'Successful' },
  { key: 'failed', label: 'Missed target' },
  { key: 'other', label: 'Paused or sold out' },
];

export const modeFilterOptions: { key: ModeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'group', label: 'Group orders' },
  { key: 'preorder', label: 'Pre-orders' },
];

export const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'rel', label: 'Relevance' },
  { key: 'pop', label: 'Popularity' },
  { key: 'end', label: 'Deadline' },
  { key: 'new', label: 'Recently added' },
  { key: 'price', label: 'Price' },
];

export const quickFilterOptions: { key: Exclude<QuickFilter, ''>; label: string }[] = [
  { key: 'feat', label: 'Featured' },
  { key: 'live', label: 'Live now' },
  { key: 'end', label: 'Ending soon' },
];

const otherStatuses = ['paused', 'soldout', 'ended', 'withdrawn', 'unavailable'];

const matchesStatus = (campaign: Campaign, status: StatusFilter): boolean => {
  if (status === 'all') return true;
  if (status === 'other') return otherStatuses.includes(campaign.status);
  return campaign.status === status;
};

const matchesQuick = (campaign: Campaign, quick: QuickFilter, now: number): boolean => {
  if (!quick) return true;
  if (quick === 'feat') return campaign.featured;
  if (quick === 'end') {
    return (
      campaign.status === 'live' &&
      campaign.closesAt !== null &&
      campaign.closesAt < now + 7 * DAY_MS
    );
  }
  return campaign.status === 'live';
};

const liveFirst = (a: Campaign, b: Campaign) =>
  Number(b.status === 'live') - Number(a.status === 'live');

const deadlineOf = (campaign: Campaign) => campaign.closesAt ?? Number.MAX_SAFE_INTEGER;

export const filterCampaigns = (
  campaigns: Campaign[],
  filters: ExploreFilters,
  now: number,
  sellerName: (sellerId: string) => string,
): Campaign[] => {
  const needle = filters.query.trim().toLowerCase();
  const result = campaigns.filter(
    (campaign) =>
      matchesStatus(campaign, filters.status) &&
      (filters.mode === 'all' || campaign.mode === filters.mode) &&
      (!filters.category || campaign.category === filters.category) &&
      (filters.maxPrice === null || campaign.price <= filters.maxPrice) &&
      matchesQuick(campaign, filters.quick, now) &&
      `${campaign.title}${sellerName(campaign.sellerId)}${campaign.category}`
        .toLowerCase()
        .includes(needle),
  );
  return [...result].sort((a, b) => {
    switch (filters.sort) {
      case 'price':
        return a.price - b.price;
      case 'end':
        return liveFirst(a, b) || deadlineOf(a) - deadlineOf(b);
      case 'new':
        return b.addedAt - a.addedAt;
      case 'pop':
        return getPopularityScore(b) - getPopularityScore(a);
      default:
        return liveFirst(a, b);
    }
  });
};

export const getPriceBounds = (campaigns: Campaign[]): { min: number; max: number } | null => {
  if (!campaigns.length) return null;
  const prices = campaigns.map((c) => c.price);
  const min = Math.floor(Math.min(...prices));
  const max = Math.ceil(Math.max(...prices));
  return max > min ? { min, max } : null;
};

export const countActiveFilters = (filters: ExploreFilters): number =>
  Number(filters.status !== 'all') +
  Number(filters.mode !== 'all') +
  Number(filters.maxPrice !== null) +
  Number(filters.sort !== 'rel');

