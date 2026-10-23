import React from 'react';
import { View } from 'react-native';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { getStatusExplanation } from '../../../lib/prezo/campaignRules';
import type { Campaign } from '../../../types/prezo';
import { Box } from '../shared/Box';
import { PzText } from '../shared/PzText';

export const CampaignNotices = ({ campaign }: { campaign: Campaign }) => {
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const why = getStatusExplanation(campaign);
  const live = campaign.status === 'live';
  const fallbackDays = campaign.mode === 'group' ? campaign.fallbackWindowDays : null;

  return (
    <View>
      {why ? (
        <Box style={{ marginBottom: 12 }}>
          <PzText size={13} tone="mu">
            {why}
            {!live ? ' ' : ''}
            {!live ? (
              <PzText
                size={13}
                tone="mu"
                underline
                onPress={() => navigation.navigate({ name: 'explore', category: null })}
              >
                See live campaigns
              </PzText>
            ) : null}
          </PzText>
        </Box>
      ) : null}
      {campaign.mode === 'group' ? (
        <Box>
          <PzText size={13} weight={600}>
            If the target is missed
          </PzText>
          <PzText size={13} tone="mu">
            {fallbackDays ? `You get ${fallbackDays} days` : 'You get a limited time'} to accept{' '}
            {fmt.money(campaign.fallbackPrice)} (you pay only the difference) or decline for a
            refund. Nothing is charged without your approval.
          </PzText>
        </Box>
      ) : (
        <Box>
          <PzText size={13} weight={600}>
            How this pre-order works
          </PzText>
          <PzText size={13} tone="mu">
            The seller fulfils this pre-order on {fmt.dateTime(campaign.fulfilmentAt)}. There is no
            group target to reach and no fallback price.
          </PzText>
        </Box>
      )}
    </View>
  );
};

