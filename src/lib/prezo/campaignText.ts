import type { Campaign, GroupCampaign } from '../../types/prezo';
import type { PrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { getProgressPercent, getStatusChip, metricNouns } from './campaignRules';

export const formatMetricValue = (campaign: GroupCampaign, value: number, fmt: PrezoFormat): string =>
  campaign.metric.kind === 'revenue' ? fmt.money(value) : String(value);

export const getCardProgressLine = (campaign: Campaign, fmt: PrezoFormat): string => {
  const percent = getProgressPercent(campaign);
  const live = campaign.status === 'live';
  if (campaign.mode === 'group') {
    const noun = metricNouns[campaign.metric.kind];
    const target = formatMetricValue(campaign, campaign.metric.target, fmt);
    const left = live ? ` · ${fmt.timeLeft(campaign.closesAt)}` : '';
    return `${percent}% of ${target} ${noun}${left}`;
  }
  if (campaign.stock && percent !== null) {
    const left = live && campaign.closesAt !== null ? ` · ${fmt.timeLeft(campaign.closesAt)}` : '';
    return `${percent}% of ${campaign.stock.total} claimed${left}`;
  }
  return `Fulfilment ${fmt.dateShort(campaign.fulfilmentAt)}`;
};

export const getCardPriceNote = (campaign: Campaign, fmt: PrezoFormat): string =>
  campaign.mode === 'group'
    ? `${fmt.money(campaign.fallbackPrice)} if missed`
    : `Pre-order · ${fmt.dateShort(campaign.fulfilmentAt)}`;

export const getDetailProgressLine = (campaign: Campaign, fmt: PrezoFormat): string | null => {
  const live = campaign.status === 'live';
  const tail = live
    ? campaign.closesAt !== null
      ? fmt.timeLeft(campaign.closesAt)
      : getStatusChip(campaign).label
    : getStatusChip(campaign).label;
  if (campaign.mode === 'group') {
    const noun = metricNouns[campaign.metric.kind];
    const progress = formatMetricValue(campaign, campaign.metric.progress, fmt);
    const target = formatMetricValue(campaign, campaign.metric.target, fmt);
    return `${progress} of ${target} ${noun} · ${tail}`;
  }
  if (campaign.stock) {
    return `${campaign.stock.claimed} of ${campaign.stock.total} claimed · ${tail}`;
  }
  return null;
};

