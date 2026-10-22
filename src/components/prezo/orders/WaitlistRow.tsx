import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import type { ChipTone } from '../../../lib/prezo/campaignRules';
import type { WaitlistEntry, WaitlistStatus } from '../../../types/prezo';
import { Box } from '../shared/Box';
import { Chip } from '../shared/Chip';
import { PzText } from '../shared/PzText';
import { CampaignThumb } from './CampaignThumb';

export const waitlistStatusChips: Record<WaitlistStatus, { label: string; tone: ChipTone }> = {
  active: { label: 'Active', tone: 'plain' },
  offer: { label: 'Offer available', tone: 'red' },
  joined: { label: 'Joined campaign', tone: 'green' },
  expired: { label: 'Expired', tone: 'outline' },
  cancelled: { label: 'Cancelled', tone: 'outline' },
  unavailable: { label: 'Unavailable', tone: 'outline' },
  error: { label: 'Error', tone: 'red' },
};

export const WaitlistRow = ({ entry }: { entry: WaitlistEntry }) => {
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const chip = waitlistStatusChips[entry.status];
  return (
    <Box
      onPress={() => navigation.navigate({ name: 'waitlistEntry', id: entry.id })}
      accessibilityLabel={entry.campaignTitle}
      style={styles.box}
    >
      <View style={styles.row}>
        <CampaignThumb
          campaignId={entry.campaignId}
          category={entry.category}
          imageUrl={entry.imageUrl}
        />
        <View style={styles.body}>
          <PzText weight={600} numberOfLines={2}>
            {entry.campaignTitle}
          </PzText>
          <PzText size={13} tone="mu">
            Joined {fmt.dateShort(entry.joinedAt)}
          </PzText>
        </View>
        <Chip label={chip.label} tone={chip.tone} />
      </View>
    </Box>
  );
};

const styles = StyleSheet.create({
  box: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, minWidth: 0 },
});

