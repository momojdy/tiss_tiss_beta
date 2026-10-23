import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import type { ChipTone } from '../../../lib/prezo/campaignRules';
import { getFallbackState } from '../../../lib/prezo/orderRules';
import type { Order } from '../../../types/prezo';
import { Box } from '../shared/Box';
import { Chip } from '../shared/Chip';
import { PzText } from '../shared/PzText';
import { CampaignThumb } from './CampaignThumb';

const getChip = (order: Order, now: number, dateShort: (t: number) => string): { label: string; tone: ChipTone } => {
  const state = order.fallback ? getFallbackState(order, now) : null;
  if (state === 'open' && order.fallback) {
    return { label: `Decide by ${dateShort(order.fallback.decideBy)}`, tone: 'red' };
  }
  if (order.outcome === 'cancelled') return { label: 'Cancelled', tone: 'plain' };
  if (order.outcome === 'failed') return { label: 'Target missed', tone: 'plain' };
  if (order.outcome === 'success') {
    return { label: order.mode === 'preorder' ? 'Fulfilled' : 'Successful', tone: 'plain' };
  }
  return { label: order.mode === 'preorder' ? 'Scheduled' : 'Active', tone: 'plain' };
};

interface OrderRowProps {
  order: Order;
}

export const OrderRow = ({ order }: OrderRowProps) => {
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const chip = getChip(order, fmt.now, fmt.dateShort);

  return (
    <Box
      onPress={() => navigation.navigate({ name: 'order', id: order.id })}
      accessibilityLabel={order.campaignTitle}
      style={styles.box}
    >
      <View style={styles.row}>
        <CampaignThumb
          campaignId={order.campaignId}
          category={order.category}
          imageUrl={order.imageUrl}
        />
        <View style={styles.body}>
          <PzText size={13} tone="mu" lineHeight={19.5}>
            {order.id} · {fmt.dateShort(order.placedAt)}
          </PzText>
          <PzText weight={600} numberOfLines={2}>
            {order.campaignTitle}
          </PzText>
          <PzText size={13} tone="mu" lineHeight={19.5}>
            {fmt.money(order.amountPaid)} paid · {order.fulfilmentStatus}
          </PzText>
        </View>
        <Chip label={chip.label} tone={chip.tone} />
      </View>
    </Box>
  );
};

const styles = StyleSheet.create({
  box: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
});

