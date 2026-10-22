import React from 'react';
import { StyleSheet } from 'react-native';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import type { Campaign, WaitlistEntry } from '../../../types/prezo';
import { Button } from '../shared/Button';

interface CampaignPrimaryActionProps {
  campaign: Campaign;
  waitlistEntry: WaitlistEntry | null;
  onJoinWaitlist: () => void;
}

export const CampaignPrimaryAction = ({
  campaign,
  waitlistEntry,
  onJoinWaitlist,
}: CampaignPrimaryActionProps) => {
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();

  if (campaign.status === 'live') {
    return (
      <Button
        label={
          campaign.mode === 'group'
            ? `Join at ${fmt.money(campaign.price)}`
            : `Pre-order at ${fmt.money(campaign.price)}`
        }
        style={styles.grow}
        onPress={() =>
          navigation.navigate({ name: 'checkout', campaignId: campaign.id, waitlistEntryId: null })
        }
      />
    );
  }
  if (waitlistEntry) {
    return (
      <Button
        label="View waitlist entry"
        variant="ghost"
        style={styles.grow}
        onPress={() => navigation.navigate({ name: 'waitlistEntry', id: waitlistEntry.id })}
      />
    );
  }
  if (campaign.waitlistEnabled) {
    return <Button label="Join waitlist" style={styles.grow} onPress={onJoinWaitlist} />;
  }
  return (
    <Button
      label={
        campaign.status === 'upcoming' && campaign.opensAt !== null
          ? `Opens ${fmt.dateShort(campaign.opensAt)}`
          : 'Not accepting participation'
      }
      disabled
      style={styles.grow}
    />
  );
};

const styles = StyleSheet.create({
  grow: {
    flex: 1,
  },
});

