import type { Campaign } from '../../types/prezo';
import type { PrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { formatMetricValue } from './campaignText';

export interface CampaignFact {
  label: string;
  value: string;
}

export const buildCampaignFacts = (campaign: Campaign, fmt: PrezoFormat): CampaignFact[] => {
  const items: CampaignFact[] = [];
  if (campaign.mode === 'group') {
    items.push({ label: 'Deadline', value: fmt.dateTime(campaign.closesAt) });
    items.push({
      label: campaign.metric.kind === 'buyers' ? 'Buyers' : 'Progress',
      value: `${formatMetricValue(campaign, campaign.metric.progress, fmt)} of ${formatMetricValue(campaign, campaign.metric.target, fmt)}`,
    });
    if (campaign.status === 'upcoming' && campaign.opensAt !== null) {
      items.push({ label: 'Opens', value: fmt.dateTime(campaign.opensAt) });
    }
    if (campaign.fulfilmentAt !== null) {
      items.push({ label: 'Expected fulfilment', value: fmt.dateTime(campaign.fulfilmentAt) });
    }
  } else {
    items.push({ label: 'Fulfilment date', value: fmt.dateTime(campaign.fulfilmentAt) });
    items.push({
      label: 'Order by',
      value: campaign.closesAt !== null ? fmt.dateTime(campaign.closesAt) : 'No deadline',
    });
    if (campaign.status === 'upcoming' && campaign.opensAt !== null) {
      items.push({ label: 'Opens', value: fmt.dateTime(campaign.opensAt) });
    }
    if (campaign.stock) {
      items.push({
        label: 'Available',
        value: `${Math.max(0, campaign.stock.total - campaign.stock.claimed)} of ${campaign.stock.total}`,
      });
    }
  }
  items.push({ label: 'Fulfilment', value: campaign.fulfilmentMethods.join(', ') });
  items.push({ label: 'Limit', value: `${campaign.maxPerOrder} per order` });
  return items;
};

