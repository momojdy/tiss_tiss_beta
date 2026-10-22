import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { getArtGradientIndex } from '../../../lib/prezo/campaignRules';
import type { Campaign, NotificationChannel, WaitlistEntry } from '../../../types/prezo';
import { Button } from '../shared/Button';
import { FieldError } from '../shared/TextField';
import { PzText } from '../shared/PzText';
import { OptionPill, OptionRow } from '../shared/Selectors';
import { Sheet, SheetActions } from '../shared/Sheet';
import { CampaignArt } from './CampaignArt';

const channels: NotificationChannel[] = ['Email', 'Push', 'None'];

const getReason = (campaign: Campaign): string => {
  if (campaign.status === 'soldout') {
    return campaign.mode === 'preorder'
      ? 'The pre-order quantity is fully claimed.'
      : 'All places are taken.';
  }
  if (campaign.status === 'paused') return 'The campaign is paused.';
  return campaign.mode === 'preorder'
    ? 'Pre-orders haven’t opened.'
    : 'The campaign hasn’t opened.';
};

interface WaitlistJoinSheetProps {
  campaign: Campaign;
  visible: boolean;
  onClose: () => void;
}

export const WaitlistJoinSheet = ({ campaign, visible, onClose }: WaitlistJoinSheetProps) => {
  const data = usePrezoData();
  const navigation = usePrezoNavigation();
  const fmt = usePrezoFormat();
  const [channel, setChannel] = useState<NotificationChannel>('Email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<WaitlistEntry | null>(null);
  const seller = data.getSeller(campaign.sellerId);
  const email = data.profile.data?.email ?? null;

  useEffect(() => {
    if (visible) {
      setChannel('Email');
      setBusy(false);
      setError(null);
      setCreated(null);
    }
  }, [visible]);

  const join = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const entry = await data.joinWaitlist(campaign.id, channel);
      setCreated(entry);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Couldn’t join the waitlist.');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Sheet visible={visible} onClose={onClose} title="You’re on the waitlist">
        <PzText size={14} tone="mu" style={styles.gapTop}>
          Registration {created.id} for {campaign.title} at {fmt.dateTime(created.joinedAt)}. Status:
          active. Notifications: {created.channel}. No charge, no reservation.
        </PzText>
        <SheetActions>
          <Button
            label="View entry"
            onPress={() => {
              onClose();
              navigation.navigate({ name: 'waitlistEntry', id: created.id });
            }}
          />
          <Button
            label="Back to campaign"
            variant="ghost"
            onPress={() => {
              onClose();
              navigation.navigate({ name: 'campaign', id: campaign.id });
            }}
          />
        </SheetActions>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Join the waitlist">
      <View style={styles.summary}>
        <CampaignArt
          category={campaign.category}
          gradientIndex={getArtGradientIndex(campaign)}
          imageUrl={campaign.images[0] ?? null}
          glyphWidth="50%"
          radius={10}
          style={styles.art}
        />
        <View style={styles.summaryText}>
          <PzText weight={600}>{campaign.title}</PzText>
          <PzText size={13} tone="mu">
            {seller ? `${seller.name} · ` : ''}
            {fmt.money(campaign.price)}
          </PzText>
        </View>
      </View>
      <PzText size={13} tone="mu">
        {getReason(campaign)} Joining doesn’t charge you, reserve a place or promise a purchase.
      </PzText>
      <PzText size={13} tone="mu" style={styles.label}>
        Notify me by
      </PzText>
      <OptionRow>
        {channels.map((option) => (
          <OptionPill
            key={option}
            label={option}
            selected={channel === option}
            onPress={() => setChannel(option)}
          />
        ))}
      </OptionRow>
      {email ? (
        <PzText size={13} tone="mu">
          Contact from your Wantiss profile: {email}
        </PzText>
      ) : null}
      <FieldError message={error} />
      <SheetActions>
        <Button label="Join waitlist" onPress={join} loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </SheetActions>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  gapTop: {
    marginTop: 8,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 12,
  },
  art: {
    width: 64,
    height: 64,
  },
  summaryText: {
    flex: 1,
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
  },
});

