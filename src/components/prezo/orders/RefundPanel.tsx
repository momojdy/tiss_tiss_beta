import React, { useState } from 'react';
import { View } from 'react-native';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoToast } from '../../../features/prezo/PrezoToastContext';
import { refundStatusExplanations, refundStatusLabels } from '../../../lib/prezo/orderRules';
import type { Order } from '../../../types/prezo';
import { Box } from '../shared/Box';
import { Button } from '../shared/Button';
import { Chip } from '../shared/Chip';
import { DetailRow } from '../shared/DetailRow';
import { PzText } from '../shared/PzText';

interface RefundPanelProps {
  order: Order;
}

export const RefundPanel = ({ order }: RefundPanelProps) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const toast = usePrezoToast();
  const [busy, setBusy] = useState(false);
  const refund = order.refund;
  if (!refund) return null;

  const retry = async () => {
    setBusy(true);
    try {
      await data.retryRefund(order.id);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t retry the refund.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PzText weight={600}>Refund {refund.reference}</PzText>
        <Chip
          label={refundStatusLabels[refund.status]}
          tone={refund.status === 'completed' ? 'green' : refund.status === 'failed' ? 'red' : 'plain'}
        />
      </View>
      <DetailRow label="Amount" value={fmt.money(refund.amount)} />
      <DetailRow label="Original payment" value={order.paymentReference} />
      <PzText size={13} tone="mu">
        {refund.updates.map((at, index) => `Update ${index + 1}: ${fmt.dateTime(at)}`).join('\n')}
      </PzText>
      <PzText size={13} style={{ marginVertical: 8 }}>
        {refundStatusExplanations[refund.status]}
      </PzText>
      {refund.status === 'failed' ? (
        <Button label="Retry refund" variant="ghost" height={38} loading={busy} onPress={retry} />
      ) : null}
    </Box>
  );
};

