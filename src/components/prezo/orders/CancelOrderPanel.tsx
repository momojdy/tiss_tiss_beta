import React, { useState } from 'react';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoToast } from '../../../features/prezo/PrezoToastContext';
import { canCancelOrder } from '../../../lib/prezo/orderRules';
import type { Order } from '../../../types/prezo';
import { Box } from '../shared/Box';
import { Button } from '../shared/Button';
import { PzText } from '../shared/PzText';
import { Sheet, SheetActions } from '../shared/Sheet';

interface CancelOrderPanelProps {
  order: Order;
}

export const CancelOrderPanel = ({ order }: CancelOrderPanelProps) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const toast = usePrezoToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (order.outcome !== 'active') return null;

  const campaign = data.getCampaign(order.campaignId);
  const allowed = canCancelOrder(order, campaign, fmt.now);

  if (!allowed) {
    return (
      <Box style={{ marginTop: 12 }}>
        <PzText size={13} tone="mu">
          Cancellation isn’t available now. Contact support for help.
        </PzText>
      </Box>
    );
  }

  const confirm = async () => {
    if (!canCancelOrder(order, data.getCampaign(order.campaignId), Date.now())) {
      setOpen(false);
      toast.show('This order can’t be cancelled now.');
      return;
    }
    setBusy(true);
    try {
      await data.cancelOrder(order.id);
      setOpen(false);
      toast.show('Order cancelled. Refund requested');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t cancel the order.');
    } finally {
      setBusy(false);
    }
  };

  const description =
    order.mode === 'group'
      ? 'You can cancel while the campaign is live. A refund is requested, not instant, and the campaign’s progress drops.'
      : campaign?.cancellableUntil
        ? `You can cancel until ${fmt.dateTime(campaign.cancellableUntil)}. A refund is requested, not instant.`
        : 'A refund is requested, not instant.';

  return (
    <Box style={{ marginTop: 12 }}>
      <PzText weight={600}>Cancel this order</PzText>
      <PzText size={13} tone="mu" style={{ marginBottom: 8 }}>
        {description}
      </PzText>
      <Button label="Cancel order" variant="ghost" height={40} onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="Cancel order?">
        <PzText tone="mu">
          This requests a refund of {fmt.money(order.amountPaid)}. It isn’t complete until your
          provider confirms it.
        </PzText>
        <SheetActions>
          <Button label="Cancel order" onPress={confirm} loading={busy} />
          <Button label="Keep order" variant="ghost" onPress={() => setOpen(false)} />
        </SheetActions>
      </Sheet>
    </Box>
  );
};

