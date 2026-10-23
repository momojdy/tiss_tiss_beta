import React from 'react';
import { StyleSheet } from 'react-native';
import { getGradientIndexForId } from '../../../lib/prezo/campaignRules';
import { CampaignArt } from '../campaign/CampaignArt';

interface CampaignThumbProps {
  campaignId: string;
  category: string;
  imageUrl: string | null;
  size?: number;
}

export const CampaignThumb = ({ campaignId, category, imageUrl, size = 64 }: CampaignThumbProps) => (
  <CampaignArt
    category={category}
    gradientIndex={getGradientIndexForId(campaignId)}
    imageUrl={imageUrl}
    glyphWidth="50%"
    radius={size >= 84 ? 14 : 10}
    style={[styles.thumb, { width: size, height: size }]}
  />
);

const styles = StyleSheet.create({
  thumb: {
    flexShrink: 0,
  },
});

