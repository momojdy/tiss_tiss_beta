import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import {
  getArtGradientIndex,
  getCampaignVariant,
  getProgressPercent,
  getStatusChip,
} from '../../../lib/prezo/campaignRules';
import { getCardPriceNote, getCardProgressLine } from '../../../lib/prezo/campaignText';
import { prezoLayout, prezoRadii } from '../../../theme/prezoTheme';
import type { Campaign } from '../../../types/prezo';
import { ProgressBar } from '../shared/ProgressBar';
import { PzText } from '../shared/PzText';
import { CampaignArt } from './CampaignArt';
import { CardSaveButton, CardShareButton } from './SaveShareButtons';

const aspectRatios = { s: 1, p: 3 / 4, l: 4 / 3, f: 16 / 9 } as const;

interface CampaignCardProps {
  campaign: Campaign;
  onToggleSaved: (campaign: Campaign) => void;
  onShare: (campaign: Campaign) => void;
}

export const CampaignCard = ({ campaign, onToggleSaved, onShare }: CampaignCardProps) => {
  const { colors } = usePrezoTheme();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const data = usePrezoData();
  const variant = getCampaignVariant(campaign);
  const featured = variant === 'f';
  const percent = getProgressPercent(campaign);
  const saved = data.saved.data.includes(campaign.id);
  const seller = data.getSeller(campaign.sellerId);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.s1, borderColor: colors.ln },
      ]}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={campaign.title}
        onPress={() => navigation.navigate({ name: 'campaign', id: campaign.id })}
      >
        <CampaignArt
          category={campaign.category}
          gradientIndex={getArtGradientIndex(campaign)}
          imageUrl={campaign.images[0] ?? null}
          chip={getStatusChip(campaign)}
          glyphWidth="34%"
          chipOffset={8}
          compactChip
          style={{ aspectRatio: aspectRatios[variant], width: '100%' }}
        />
        <View style={styles.body}>
          <PzText
            display={700}
            size={featured ? 20 : 14}
            lineHeight={featured ? 25 : 17.5}
            numberOfLines={2}
            style={styles.title}
          >
            {campaign.title}
          </PzText>
          <View style={styles.priceRow}>
            <PzText display={700} size={16}>
              {fmt.money(campaign.price)}
            </PzText>
            <PzText size={12} tone="mu" numberOfLines={1} style={styles.note}>
              {getCardPriceNote(campaign, fmt)}
            </PzText>
          </View>
          {seller ? (
            <PzText size={12} tone="mu" numberOfLines={1} style={styles.seller}>
              {seller.name}
            </PzText>
          ) : null}
          {percent !== null ? <ProgressBar percent={percent} height={4} marginTop={8} /> : null}
          <PzText size={11} tone="mu" numberOfLines={1} lineHeight={16.5} style={styles.progress}>
            {getCardProgressLine(campaign, fmt)}
          </PzText>
        </View>
      </Pressable>
      <CardShareButton title={campaign.title} onPress={() => onShare(campaign)} />
      <CardSaveButton title={campaign.title} saved={saved} onPress={() => onToggleSaved(campaign)} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: prezoLayout.hairline,
    borderRadius: prezoRadii.r2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  body: {
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  title: {
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  note: {
    flexShrink: 1,
  },
  seller: {
    marginTop: 2,
  },
  progress: {
    marginTop: 5,
  },
});

