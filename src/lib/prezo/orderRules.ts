import type {
  Campaign,
  FallbackState,
  Order,
  RefundStatus,
} from '../../types/prezo';

export const getFallbackState = (order: Order, now: number): FallbackState | null => {
  if (!order.fallback) return null;
  if (order.fallbackDecision === 'accepted') return 'accepted';
  if (order.fallbackDecision === 'declined') return 'declined';
  if (order.fallback.decideBy <= now) return 'expired';
  const commitment = order.fallback.sellerCommitment;
  if (commitment && commitment.valid && commitment.available) return 'honored';
  return 'open';
};

export const canAcceptFallback = (order: Order | null | undefined, now: number): boolean =>
  !!order && order.outcome === 'failed' && getFallbackState(order, now) === 'open';

export const canCancelOrder = (order: Order, campaign: Campaign | null, now: number): boolean => {
  if (order.outcome !== 'active' || order.refund) return false;
  if (order.mode === 'group') return !!campaign && campaign.status === 'live';
  return !!campaign && campaign.cancellableUntil !== null && campaign.cancellableUntil > now;
};

export const getFallbackAdditionalAmount = (order: Order): number => {
  if (!order.fallback) return 0;
  return (order.fallback.fallbackUnitPrice - order.fallback.originalUnitPrice) * order.quantity;
};

export const getFallbackTotal = (order: Order): number => {
  if (!order.fallback) return 0;
  return order.fallback.fallbackUnitPrice * order.quantity;
};

export const needsDecision = (order: Order, now: number): boolean =>
  !!order.fallback && getFallbackState(order, now) === 'open';

export const getOrderTimelineSteps = (order: Order): string[] =>
  order.mode === 'group'
    ? ['Paid', 'Campaign running', 'Outcome', 'Fulfilment', 'Done']
    : ['Paid', 'Scheduled', 'Fulfilment', 'Done'];

export const getOrderTimelineIndex = (order: Order, now: number): number => {
  if (order.mode === 'group') {
    if (order.outcome === 'active') return 1;
    if (order.outcome === 'cancelled') return 2;
    if (order.outcome === 'failed') {
      const state = getFallbackState(order, now);
      return state === 'accepted' || state === 'honored' ? 3 : 2;
    }
    return 3;
  }
  if (order.outcome === 'active') return 1;
  if (order.outcome === 'cancelled') return 1;
  return 2;
};

export const getOrderOutcomeLabel = (order: Order): string => {
  if (order.outcome === 'cancelled') return 'Cancelled';
  if (order.outcome === 'failed') return 'Target missed';
  if (order.outcome === 'success') return order.mode === 'preorder' ? 'Fulfilled' : 'Successful';
  return order.mode === 'preorder' ? 'Scheduled' : 'Awaiting outcome';
};

export const refundStatusLabels: Record<RefundStatus, string> = {
  requested: 'Requested',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

export const refundStatusExplanations: Record<RefundStatus, string> = {
  requested: 'Initiated. Money has not been returned yet.',
  processing: 'With your payment provider. Timing isn’t guaranteed.',
  completed: 'The refund has been completed.',
  failed: 'The refund failed. Retry it or contact support.',
};

export const fallbackStateTitles: Record<FallbackState, string> = {
  open: 'Decision needed',
  accepted: 'Accepted',
  honored: 'Seller honors original price',
  declined: 'Declined',
  expired: 'Offer expired',
};

