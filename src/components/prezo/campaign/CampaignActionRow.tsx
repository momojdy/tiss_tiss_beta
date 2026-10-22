import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoCampaignActions } from '../../../features/prezo/PrezoCampaignActions';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import type { Campaign } from '../../../types/prezo';
import { Button } from '../shared/Button';

export const CampaignActionRow = ({ campaign }: { campaign: Campaign }) => {
  const data = usePrezoData();
  const actions = usePrezoCampaignActions();
  const navigation = usePrezoNavigation();
  const saved = data.saved.data.includes(campaign.id);

  return (
    <View style={styles.row}>
      <Button
        label={saved ? 'Saved' : 'Save'}
        variant="ghost"
        small
        onPress={() => actions.toggleSaved(campaign)}
      />
      <Button label="Share" variant="ghost" small onPress={() => actions.share(campaign)} />
      <Button
        label="Campaign terms"
        variant="text"
        small
        onPress={() => navigation.navigate({ name: 'policy', topic: 'terms' })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
});

