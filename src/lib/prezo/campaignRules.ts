import type {
  Campaign,
  CampaignStatus,
  FulfilmentMethod,
  GroupMetricKind,
  WaitlistEntry,
} from '../../types/prezo';

export type ChipTone = 'plain' | 'red' | 'green' | 'outline';

export interface StatusChip {
  label: string;
  tone: ChipTone;
}

export const fulfilmentLabels: Record<FulfilmentMethod, string> = {
  delivery: 'Delivery',
  pickup: 'Pickup',
  digital: 'Digital',
  service: 'Service',
};

export const metricNouns: Record<GroupMetricKind, string> = {
  buyers: 'buyers',
  units: 'units',
  revenue: 'raised',
};

export const getStatusChip = (campaign: Campaign): StatusChip => {
  const status: CampaignStatus = campaign.status;
  switch (status) {
    case 'live':
      return campaign.mode === 'preorder'
        ? { label: 'Pre-order open', tone: 'red' }
        : { label: 'Live', tone: 'red' };
    case 'upcoming':
      return { label: 'Upcoming', tone: 'outline' };
    case 'successful':
      return { label: 'Successful', tone: 'green' };
    case 'failed':
      return { label: 'Target missed', tone: 'plain' };
    case 'paused':
      return { label: 'Paused', tone: 'outline' };
    case 'soldout':
      return { label: 'Sold out', tone: 'outline' };
    case 'ended':
      return { label: 'Ended', tone: 'outline' };
    case 'withdrawn':
      return { label: 'Withdrawn', tone: 'outline' };
    default:
      return { label: 'Not in your area', tone: 'outline' };
  }
};

export const getStatusExplanation = (campaign: Campaign): string | null => {
  switch (campaign.status) {
    case 'live':
      return null;
    case 'upcoming':
      return campaign.mode === 'preorder'
        ? 'Pre-orders for this campaign haven’t opened yet.'
        : 'This campaign hasn’t opened yet.';
    case 'paused':
      return 'The seller paused this campaign.';
    case 'soldout':
      return campaign.mode === 'preorder'
        ? 'The pre-order quantity is fully claimed.'
        : 'All places are taken.';
    case 'successful':
      return 'This campaign reached its target and closed.';
    case 'failed':
      return 'This campaign missed its target. Existing buyers have a fallback decision.';
    case 'ended':
      return campaign.mode === 'preorder'
        ? 'Pre-orders for this campaign have closed.'
        : 'This campaign has ended.';
    case 'withdrawn':
      return 'The seller withdrew this campaign.';
    default:
      return 'This campaign isn’t available in your region.';
  }
};

export const getProgressPercent = (campaign: Campaign): number | null => {
  if (campaign.mode === 'group') {
    if (campaign.metric.target <= 0) return 0;
    return Math.min(100, Math.round((campaign.metric.progress / campaign.metric.target) * 100));
  }
  if (campaign.stock && campaign.stock.total > 0) {
    return Math.min(100, Math.round((campaign.stock.claimed / campaign.stock.total) * 100));
  }
  return null;
};

export const getPopularityScore = (campaign: Campaign): number => getProgressPercent(campaign) ?? 0;

export const hasOpenWaitlistOffer = (
  campaign: Campaign,
  entry: WaitlistEntry | null,
  now: number,
): boolean =>
  !!entry &&
  entry.campaignId === campaign.id &&
  entry.status === 'offer' &&
  entry.offerExpiresAt !== null &&
  entry.offerExpiresAt > now &&
  (campaign.status === 'paused' || campaign.status === 'soldout' || campaign.status === 'upcoming');

export const canJoinCampaign = (
  campaign: Campaign,
  entry: WaitlistEntry | null,
  now: number,
): boolean => campaign.status === 'live' || hasOpenWaitlistOffer(campaign, entry, now);

export const findActiveWaitlistEntry = (
  campaignId: string,
  entries: WaitlistEntry[],
): WaitlistEntry | null =>
  entries.find(
    (entry) =>
      entry.campaignId === campaignId &&
      (entry.status === 'active' || entry.status === 'offer' || entry.status === 'joined'),
  ) ?? null;

export const getDeliveryFee = (campaign: Campaign, fulfilment: FulfilmentMethod): number =>
  fulfilment === 'delivery' ? campaign.deliveryFee : 0;

export const isEndingSoon = (campaign: Campaign, now: number, windowMs: number): boolean =>
  campaign.status === 'live' && campaign.closesAt !== null && campaign.closesAt < now + windowMs;

export const getCampaignVariant = (campaign: Campaign): 'f' | 's' | 'p' | 'l' => {
  if (campaign.featured) return 'f';
  let hash = 0;
  for (let i = 0; i < campaign.id.length; i += 1) {
    hash = (hash + campaign.id.charCodeAt(i)) % 3;
  }
  return (['s', 'p', 'l'] as const)[hash];
};

export const getGradientIndexForId = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) % 4;
  }
  return hash;
};

export const getArtGradientIndex = (campaign: Campaign): number =>
  getGradientIndexForId(campaign.id);

