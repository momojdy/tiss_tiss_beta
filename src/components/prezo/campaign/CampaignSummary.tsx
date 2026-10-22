import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { getProgressPercent, getStatusChip } from '../../../lib/prezo/campaignRules';
import { buildCampaignFacts } from '../../../lib/prezo/campaignFacts';
import { getDetailProgressLine } from '../../../lib/prezo/campaignText';
import type { Campaign } from '../../../types/prezo';
import { Chip } from '../shared/Chip';
import { KeyValueGrid } from '../shared/KeyValueGrid';
import { PageTitle } from '../shared/PageHeading';
import { ProgressBar } from '../shared/ProgressBar';
import { PzText } from '../shared/PzText';

export const CampaignSummary = ({ campaign }: { campaign: Campaign }) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const seller = data.getSeller(campaign.sellerId);
  const chip = getStatusChip(campaign);
  const percent = getProgressPercent(campaign);
  const progressLine = getDetailProgressLine(campaign, fmt);
  const isGroup = campaign.mode === 'group';

  return (
    <View>
      <View style={styles.chips}>
        <Chip label={chip.label} tone={chip.tone} />
        <Chip label={campaign.category} tone="outline" />
        <Chip label={isGroup ? 'Group order' : 'Pre-order'} tone="outline" />
      </View>
      <PageTitle>{campaign.title}</PageTitle>
      {seller ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => navigation.navigate({ name: 'seller', id: seller.id })}
        >
          <PzText tone="mu" underline>
            {seller.name}
          </PzText>
        </Pressable>
      ) : null}
      <View style={styles.priceRow}>
        <PzText display={700} size={32}>
          {fmt.money(campaign.price)}
        </PzText>
        <PzText size={13} tone="mu" style={styles.priceNote}>
          {campaign.mode === 'group'
            ? `primary price. ${fmt.money(campaign.fallbackPrice)} if the target is missed.`
            : 'pre-order price.'}
        </PzText>
      </View>
      <PzText tone="mu" style={styles.description}>
        {campaign.description}
      </PzText>
      {percent !== null ? <ProgressBar percent={percent} /> : null}
      {progressLine ? (
        <PzText size={13} tone="mu" style={{ marginTop: 6 }}>
          {progressLine}
        </PzText>
      ) : null}
      <KeyValueGrid items={buildCampaignFacts(campaign, fmt)} />
    </View>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  priceNote: {
    flexShrink: 1,
  },
  description: {
    marginVertical: 14,
  },
});

