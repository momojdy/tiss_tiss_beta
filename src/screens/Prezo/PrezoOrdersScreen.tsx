import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { CampaignGrid } from '../../components/prezo/campaign/CampaignGrid';
import { MyPrezoTabs } from '../../components/prezo/orders/MyPrezoTabs';
import { OrderRow } from '../../components/prezo/orders/OrderRow';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { EmptyState } from '../../components/prezo/shared/EmptyState';
import { KeyValueGrid } from '../../components/prezo/shared/KeyValueGrid';
import { PageTitle, SectionHeader } from '../../components/prezo/shared/PageHeading';
import { ProgressBar } from '../../components/prezo/shared/ProgressBar';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { LoadFailureState } from '../../components/prezo/shared/StateViews';
import { getCardProgressLine } from '../../lib/prezo/campaignText';
import { getProgressPercent } from '../../lib/prezo/campaignRules';
import { needsDecision } from '../../lib/prezo/orderRules';
import type { MyPrezoTab, Order } from '../../types/prezo';

const browse = (navigate: () => void) => <Button label="Explore campaigns" onPress={navigate} />;

export const PrezoOrdersScreen = ({ tab }: { tab: MyPrezoTab }) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const orders = data.orders.data;
  const explore = () => navigation.navigate({ name: 'explore', category: null });
  const byOutcome = (outcome: Order['outcome']) => orders.filter((order) => order.outcome === outcome);

  const activeProgress = (order: Order) => {
    const campaign = data.getCampaign(order.campaignId);
    if (!campaign) return null;
    const percent = getProgressPercent(campaign);
    return (
      <View style={styles.progress}>
        {percent !== null ? <ProgressBar percent={percent} /> : null}
        <PzText size={13} tone="mu" style={{ marginTop: 6 }}>
          {getCardProgressLine(campaign, fmt)}
        </PzText>
      </View>
    );
  };

  let body: React.ReactNode;
  if (data.orders.status === 'error' && tab !== 'saved') {
    body = (
      <LoadFailureState
        title="Couldn’t load your orders"
        message={data.orders.message}
        onRetry={() => data.reload(['orders'])}
      />
    );
  } else if (tab === 'overview') {
    const decisions = orders.filter((order) => needsDecision(order, fmt.now));
    body = (
      <>
        <KeyValueGrid
          items={[
            { label: 'Active', value: String(byOutcome('active').length) },
            { label: 'Successful', value: String(byOutcome('success').length) },
            { label: 'Need a decision', value: String(decisions.length) },
            { label: 'Unread alerts', value: String(data.unreadAlertCount) },
          ]}
        />
        {decisions.map((order) => (
          <Button
            key={order.id}
            label={`Decide: ${order.campaignTitle}`}
            block
            style={{ marginBottom: 10 }}
            onPress={() => navigation.navigate({ name: 'fallback', orderId: order.id })}
          />
        ))}
        <SectionHeader title="Recent activity" />
        {data.alerts.data.length ? (
          data.alerts.data.slice(0, 3).map((alert) => (
            <Box
              key={alert.id}
              style={styles.activity}
              onPress={() => navigation.navigate({ name: 'alert', id: alert.id })}
            >
              <PzText weight={600}>{alert.title}</PzText>
              <PzText size={13} tone="mu">
                {alert.message}
              </PzText>
            </Box>
          ))
        ) : (
          <EmptyState message="No recent activity." />
        )}
      </>
    );
  } else if (tab === 'active') {
    const list = byOutcome('active');
    body = list.length ? (
      list.map((order) => (
        <View key={order.id}>
          <OrderRow order={order} />
          {activeProgress(order)}
        </View>
      ))
    ) : (
      <EmptyState message="No active campaigns.">{browse(explore)}</EmptyState>
    );
  } else if (tab === 'success') {
    const list = byOutcome('success');
    body = list.length ? (
      list.map((order) => <OrderRow key={order.id} order={order} />)
    ) : (
      <EmptyState message="No successful campaigns yet." />
    );
  } else if (tab === 'failed') {
    const list = byOutcome('failed');
    body = list.length ? (
      list.map((order) => <OrderRow key={order.id} order={order} />)
    ) : (
      <EmptyState message="Nothing needs your attention." />
    );
  } else if (tab === 'orders') {
    body = orders.length ? (
      orders.map((order) => <OrderRow key={order.id} order={order} />)
    ) : (
      <EmptyState title="No orders yet" message="Orders you place will appear here.">
        {browse(explore)}
      </EmptyState>
    );
  } else {
    const savedCampaigns = data.saved.data
      .map((id) => data.getCampaign(id))
      .filter((campaign): campaign is NonNullable<typeof campaign> => !!campaign);
    body = (
      <CampaignGrid
        campaigns={savedCampaigns}
        empty={
          <EmptyState
            title="No saved campaigns yet"
            message="Bookmarks aren’t purchases and don’t reserve anything."
          >
            {browse(explore)}
          </EmptyState>
        }
      />
    );
  }

  return (
    <ScreenScaffold>
      <PageTitle>{tab === 'orders' ? 'Orders' : 'My Prezo'}</PageTitle>
      <MyPrezoTabs active={tab} />
      {body}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  progress: {
    marginTop: -6,
    marginBottom: 12,
  },
  activity: {
    marginBottom: 8,
  },
});

