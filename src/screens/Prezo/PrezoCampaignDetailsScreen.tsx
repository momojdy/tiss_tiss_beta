import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { CampaignActionRow } from '../../components/prezo/campaign/CampaignActionRow';
import { CampaignGallery } from '../../components/prezo/campaign/CampaignGallery';
import { CampaignNotices } from '../../components/prezo/campaign/CampaignNotices';
import { CampaignPrimaryAction } from '../../components/prezo/campaign/CampaignPrimaryAction';
import { CampaignStrip } from '../../components/prezo/campaign/CampaignStrip';
import { CampaignSummary } from '../../components/prezo/campaign/CampaignSummary';
import { WaitlistJoinSheet } from '../../components/prezo/campaign/WaitlistJoinSheet';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { LoadFailureState, NotFoundState } from '../../components/prezo/shared/StateViews';
import { findActiveWaitlistEntry } from '../../lib/prezo/campaignRules';
import { useLayoutMode } from '../../lib/prezo/useLayoutMode';

export const PrezoCampaignDetailsScreen = ({ id }: { id: string }) => {
  const data = usePrezoData();
  const { isWide } = useLayoutMode();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const campaign = data.getCampaign(id);

  const related = useMemo(
    () =>
      campaign
        ? data.campaigns.data
            .filter(
              (other) =>
                other.id !== campaign.id &&
                (other.category === campaign.category || other.sellerId === campaign.sellerId),
            )
            .slice(0, 3)
        : [],
    [campaign, data.campaigns.data],
  );

  if (data.campaigns.status === 'error' && !campaign) {
    return (
      <ScreenScaffold>
        <LoadFailureState
          title="Couldn’t load this campaign"
          message={data.campaigns.message}
          onRetry={() => data.reload(['campaigns', 'sellers'])}
        />
      </ScreenScaffold>
    );
  }

  if (!campaign) {
    return (
      <ScreenScaffold>
        {data.campaigns.status === 'loading' ? null : (
          <NotFoundState
            title="Campaign unavailable"
            message="We couldn’t find this campaign. It may have been removed or the link may be wrong."
          />
        )}
      </ScreenScaffold>
    );
  }

  const primaryAction = (
    <CampaignPrimaryAction
      campaign={campaign}
      waitlistEntry={findActiveWaitlistEntry(campaign.id, data.waitlist.data)}
      onJoinWaitlist={() => setWaitlistOpen(true)}
    />
  );

  return (
    <ScreenScaffold footer={isWide ? undefined : primaryAction}>
      <View style={[styles.layout, isWide ? styles.layoutWide : null]}>
        <View style={isWide ? styles.galleryWide : null}>
          <CampaignGallery campaign={campaign} />
        </View>
        <View style={isWide ? styles.column : null}>
          <CampaignSummary campaign={campaign} />
          <CampaignNotices campaign={campaign} />
          <CampaignActionRow campaign={campaign} />
          {isWide ? <View style={styles.inlineAction}>{primaryAction}</View> : null}
        </View>
      </View>
      <CampaignStrip title="Related" campaigns={related} />
      <WaitlistJoinSheet
        campaign={campaign}
        visible={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  layout: {
    gap: 20,
    marginVertical: 14,
  },
  layoutWide: {
    flexDirection: 'row',
    gap: 28,
    marginVertical: 22,
    alignItems: 'flex-start',
  },
  galleryWide: {
    flex: 1.1,
  },
  column: {
    flex: 1,
  },
  inlineAction: {
    marginTop: 18,
    flexDirection: 'row',
  },
});

