import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { CancelOrderPanel } from '../../components/prezo/orders/CancelOrderPanel';
import { OrderTimeline } from '../../components/prezo/orders/OrderTimeline';
import { RefundPanel } from '../../components/prezo/orders/RefundPanel';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { DetailRow } from '../../components/prezo/shared/DetailRow';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { LoadFailureState, NotFoundState } from '../../components/prezo/shared/StateViews';
import { fulfilmentLabels } from '../../lib/prezo/campaignRules';
import {
  fallbackStateTitles,
  getFallbackState,
  getOrderOutcomeLabel,
  getOrderTimelineIndex,
  getOrderTimelineSteps,
} from '../../lib/prezo/orderRules';

export const PrezoOrderDetailsScreen = ({ id }: { id: string }) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const order = data.getOrder(id);

  if (!order) {
    return (
      <ScreenScaffold>
        {data.orders.status === 'error' ? (
          <LoadFailureState
            title="Couldn’t load this order"
            message={data.orders.message}
            onRetry={() => data.reload(['orders'])}
          />
        ) : data.orders.status === 'loading' ? null : (
          <NotFoundState
            title="Order not found"
            message="We couldn’t find this order reference. Check your orders for your latest list."
          />
        )}
      </ScreenScaffold>
    );
  }

  const seller = data.getSeller(order.sellerId);
  const fallbackState = order.fallback ? getFallbackState(order, fmt.now) : null;

  return (
    <ScreenScaffold>
      <PageTitle>{order.campaignTitle}</PageTitle>
      <View style={styles.meta}>
        <PzText tone="mu">{order.id}</PzText>
        {seller ? (
          <>
            <PzText tone="mu"> · </PzText>
            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate({ name: 'seller', id: seller.id })}
            >
              <PzText tone="mu" underline>
                {seller.name}
              </PzText>
            </Pressable>
          </>
        ) : null}
      </View>
      <OrderTimeline
        steps={getOrderTimelineSteps(order)}
        reached={getOrderTimelineIndex(order, fmt.now)}
      />
      <Box>
        <DetailRow
          label="Item"
          value={order.option ? `${order.quantity} × ${order.option}` : String(order.quantity)}
        />
        <DetailRow label={`Original payment ${order.paymentReference}`} value={fmt.money(order.amountPaid)} />
        {order.additionalPayment ? (
          <DetailRow
            label={`Additional payment ${order.additionalPayment.reference}`}
            value={fmt.money(order.additionalPayment.amount)}
          />
        ) : null}
        <DetailRow label="Outcome" value={getOrderOutcomeLabel(order)} />
        {order.mode === 'preorder' && order.scheduledFor !== null ? (
          <DetailRow label="Scheduled for" value={fmt.dateTime(order.scheduledFor)} />
        ) : null}
        <DetailRow
          label={`Fulfilment (${fulfilmentLabels[order.fulfilment].toLowerCase()})`}
          value={order.fulfilmentStatus}
        />
      </Box>
      {order.fallback && fallbackState ? (
        <Box style={styles.gap}>
          <PzText weight={600}>Fallback: {fallbackStateTitles[fallbackState]}</PzText>
          <PzText size={13} tone="mu">
            {fallbackState === 'open'
              ? `Decide by ${fmt.dateTime(order.fallback.decideBy)} (${fmt.timeLeft(order.fallback.decideBy)})`
              : fallbackState === 'expired'
                ? `Expired ${fmt.dateTime(order.fallback.decideBy)}`
                : ''}
          </PzText>
          {fallbackState === 'open' ? (
            <Button
              label="Review options"
              style={{ marginTop: 10 }}
              onPress={() => navigation.navigate({ name: 'fallback', orderId: order.id })}
            />
          ) : (
            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate({ name: 'fallback', orderId: order.id })}
            >
              <PzText size={13} tone="mu" underline>
                View details
              </PzText>
            </Pressable>
          )}
        </Box>
      ) : null}
      <RefundPanel order={order} />
      <CancelOrderPanel order={order} />
      <View style={styles.actions}>
        <Button label="Contact support" variant="ghost" onPress={() => navigation.navigate({ name: 'support' })} />
        <Button
          label="Report a problem"
          variant="ghost"
          onPress={() => navigation.navigate({ name: 'report', relatedId: order.id })}
        />
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  gap: {
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
});

