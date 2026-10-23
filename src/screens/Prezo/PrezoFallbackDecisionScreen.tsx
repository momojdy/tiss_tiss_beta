import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { usePrezoToast } from '../../features/prezo/PrezoToastContext';
import { AdditionalPaymentSheet } from '../../components/prezo/orders/AdditionalPaymentSheet';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { DetailRow } from '../../components/prezo/shared/DetailRow';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { Checkbox } from '../../components/prezo/shared/Selectors';
import { Sheet, SheetActions } from '../../components/prezo/shared/Sheet';
import { NotFoundState } from '../../components/prezo/shared/StateViews';
import { metricNouns } from '../../lib/prezo/campaignRules';
import {
  canAcceptFallback,
  getFallbackAdditionalAmount,
  getFallbackState,
  getFallbackTotal,
} from '../../lib/prezo/orderRules';

export const PrezoFallbackDecisionScreen = ({ orderId }: { orderId: string }) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const toast = usePrezoToast();
  const [agreed, setAgreed] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const order = data.getOrder(orderId);

  if (!order || !order.fallback) {
    return (
      <ScreenScaffold>
        <NotFoundState
          title="Fallback decision not found"
          message="This order has no fallback decision to show."
        />
      </ScreenScaffold>
    );
  }

  const terms = order.fallback;
  const state = getFallbackState(order, fmt.now);
  const additional = getFallbackAdditionalAmount(order);
  const total = getFallbackTotal(order);
  const noun = metricNouns[terms.metricKind];
  const reached = terms.metricKind === 'revenue' ? fmt.money(terms.reached) : String(terms.reached);
  const target = terms.metricKind === 'revenue' ? fmt.money(terms.target) : String(terms.target);

  const decline = async () => {
    if (!canAcceptFallback(data.getOrder(order.id), Date.now())) {
      setDeclineOpen(false);
      toast.show('This offer can no longer be declined here.');
      return;
    }
    setBusy(true);
    try {
      await data.declineFallback(order.id);
      setDeclineOpen(false);
      toast.show('Declined. Refund requested');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t decline the offer.');
    } finally {
      setBusy(false);
    }
  };

  const requestRefund = async () => {
    setBusy(true);
    try {
      await data.requestRefund(order.id);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t request the refund.');
    } finally {
      setBusy(false);
    }
  };

  const inactiveLabels = {
    expired: 'Offer expired',
    accepted: 'Already accepted',
    declined: 'Declined',
    honored: 'Not needed',
  } as const;

  return (
    <ScreenScaffold>
      <PageTitle>
        {state === 'honored'
          ? 'Seller will fulfil at the original price'
          : 'This campaign missed its target'}
      </PageTitle>
      <PzText tone="mu">
        {order.campaignTitle} reached {reached} of {target} {noun}. Failed {fmt.dateTime(terms.failedAt)}.
      </PzText>
      <View style={styles.panel}>
        <Box panel>
          <DetailRow label="Already paid" value={fmt.money(order.amountPaid)} />
          <DetailRow label="Original price" value={fmt.money(terms.originalUnitPrice * order.quantity)} />
          <DetailRow label="Fallback total" value={fmt.money(total)} />
          <DetailRow label="Additional amount" value={fmt.money(additional)} total />
          <DetailRow label="Decide by" value={fmt.dateTime(terms.decideBy)} />
          <DetailRow
            label="Time left"
            value={state === 'expired' ? 'Expired' : fmt.timeLeft(terms.decideBy)}
          />
        </Box>
      </View>
      {state === 'honored' ? (
        <Box>
          <PzText weight={600}>Seller commitment confirmed</PzText>
          <PzText size={13} tone="mu" style={{ marginBottom: 8 }}>
            {data.getSeller(order.sellerId)?.name ?? 'The seller'} will fulfil at the original price.
            Status: {order.fulfilmentStatus}. No further payment needed.
          </PzText>
          <Button label="View order" onPress={() => navigation.navigate({ name: 'order', id: order.id })} />
        </Box>
      ) : state === 'open' ? (
        <View>
          <Checkbox checked={agreed} onChange={setAgreed}>
            <PzText size={13}>
              I agree to the higher price of {fmt.money(total)}. I understand this needs a separate
              payment of {fmt.money(additional)} that I authorise next.
            </PzText>
          </Checkbox>
          <Button
            label="Accept and continue to payment"
            block
            onPress={() => {
              if (!agreed) {
                toast.show('Tick the box to accept the higher price.');
                return;
              }
              if (!canAcceptFallback(data.getOrder(order.id), Date.now())) {
                toast.show('This offer can no longer be accepted.');
                return;
              }
              setPayOpen(true);
            }}
          />
          <Button
            label="Decline"
            variant="ghost"
            block
            style={{ marginTop: 8 }}
            onPress={() => setDeclineOpen(true)}
          />
        </View>
      ) : state ? (
        <Button label={inactiveLabels[state]} block disabled />
      ) : null}
      {state === 'declined' || state === 'expired' ? (
        <View style={{ marginTop: 12 }}>
          <PzText size={13} tone="mu" style={{ marginBottom: 8 }}>
            {state === 'declined' ? 'You declined the higher price.' : 'The decision window closed.'}{' '}
            {order.refund
              ? `Refund ${order.refund.reference} is ${order.refund.status}.`
              : 'No refund has been requested yet.'}
          </PzText>
          <View style={styles.actions}>
            {order.refund ? (
              <Button
                label="Refund details"
                variant="ghost"
                onPress={() => navigation.navigate({ name: 'order', id: order.id })}
              />
            ) : (
              <Button label="Request refund" loading={busy} onPress={requestRefund} />
            )}
            <Button
              label="Contact support"
              variant="ghost"
              onPress={() => navigation.navigate({ name: 'support' })}
            />
          </View>
        </View>
      ) : null}
      <AdditionalPaymentSheet order={order} visible={payOpen} onClose={() => setPayOpen(false)} />
      <Sheet visible={declineOpen} onClose={() => setDeclineOpen(false)} title="Decline the higher price?">
        <PzText tone="mu">
          You’ll be refunded {fmt.money(order.amountPaid)}. A refund starts as requested and isn’t
          complete until your provider confirms it.
        </PzText>
        <SheetActions>
          <Button label="Decline and request refund" onPress={decline} loading={busy} />
          <Button label="Keep deciding" variant="ghost" onPress={() => setDeclineOpen(false)} />
        </SheetActions>
      </Sheet>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  panel: {
    marginVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

