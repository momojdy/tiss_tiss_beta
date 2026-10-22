import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { Avatar } from '../../components/prezo/shared/Avatar';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { DetailRow } from '../../components/prezo/shared/DetailRow';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { NotFoundState } from '../../components/prezo/shared/StateViews';

export const PrezoOrderConfirmationScreen = ({ orderId }: { orderId: string }) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const order = data.getOrder(orderId);

  if (!order) {
    return (
      <ScreenScaffold>
        <NotFoundState
          title="Order not found"
          message="We couldn’t find this order reference. Check your orders for the latest status."
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      <View style={styles.wrap}>
        <Avatar check size={80} />
        <View style={styles.title}>
          <PageTitle>{order.mode === 'group' ? 'You’re in' : 'Pre-order placed'}</PageTitle>
        </View>
        <PzText tone="mu" align="center" style={styles.summary}>
          {order.campaignTitle}
          {'\n'}Reference {order.id}
        </PzText>
        <View style={styles.details}>
          <Box>
            <DetailRow label="Paid" value={fmt.money(order.amountPaid)} />
            <DetailRow label="Status" value={order.fulfilmentStatus} />
            <DetailRow label="Fulfilment" value={order.fulfilment} />
            {order.mode === 'preorder' && order.scheduledFor !== null ? (
              <DetailRow label="Scheduled for" value={fmt.dateTime(order.scheduledFor)} />
            ) : null}
          </Box>
        </View>
        <View style={styles.actions}>
          <Button label="View order" onPress={() => navigation.navigate({ name: 'order', id: order.id })} />
          <Button
            label="Keep exploring"
            variant="ghost"
            onPress={() => navigation.navigate({ name: 'explore', category: null })}
          />
        </View>
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 36,
  },
  title: {
    marginTop: 18,
  },
  summary: {
    marginTop: 10,
    marginBottom: 18,
  },
  details: {
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 18,
  },
});

