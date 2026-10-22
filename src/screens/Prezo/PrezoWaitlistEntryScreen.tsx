import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { usePrezoToast } from '../../features/prezo/PrezoToastContext';
import { CampaignThumb } from '../../components/prezo/orders/CampaignThumb';
import { waitlistStatusChips } from '../../components/prezo/orders/WaitlistRow';
import { Box } from '../../components/prezo/shared/Box';
import { Button } from '../../components/prezo/shared/Button';
import { Chip } from '../../components/prezo/shared/Chip';
import { DetailRow } from '../../components/prezo/shared/DetailRow';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { OptionPill, OptionRow } from '../../components/prezo/shared/Selectors';
import { Sheet, SheetActions } from '../../components/prezo/shared/Sheet';
import { NotFoundState } from '../../components/prezo/shared/StateViews';
import type { NotificationChannel, WaitlistStatus } from '../../types/prezo';

const channels: NotificationChannel[] = ['Email', 'Push', 'None'];

export const PrezoWaitlistEntryScreen = ({ id }: { id: string }) => {
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const navigation = usePrezoNavigation();
  const toast = usePrezoToast();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const entry = data.getWaitlistEntry(id);

  if (!entry) {
    return (
      <ScreenScaffold>
        <NotFoundState
          title="Waitlist entry not found"
          message="This waitlist reference isn’t available any more."
        />
      </ScreenScaffold>
    );
  }

  const campaign = data.getCampaign(entry.campaignId);
  const seller = data.getSeller(entry.sellerId);
  const status: WaitlistStatus =
    entry.status === 'offer' && entry.offerExpiresAt !== null && entry.offerExpiresAt <= fmt.now
      ? 'expired'
      : entry.status;
  const chip = waitlistStatusChips[status];

  const changeChannel = async (channel: NotificationChannel) => {
    try {
      await data.updateWaitlistChannel(entry.id, channel);
      toast.show(`Notifications for this campaign: ${channel}`);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t change notifications.');
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await data.leaveWaitlist(entry.id);
      setLeaveOpen(false);
      toast.show('You left the waitlist');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Couldn’t leave the waitlist.');
    } finally {
      setBusy(false);
    }
  };

  const note = (text: string) => (
    <Box style={{ marginTop: 12 }}>
      <PzText size={13} tone="mu">
        {text}
      </PzText>
    </Box>
  );

  return (
    <ScreenScaffold>
      <View style={styles.header}>
        <CampaignThumb
          campaignId={entry.campaignId}
          category={entry.category}
          imageUrl={entry.imageUrl}
          size={64}
        />
        <View style={styles.headerText}>
          <PageTitle>{entry.campaignTitle}</PageTitle>
          {seller ? <PzText tone="mu">{seller.name}</PzText> : null}
        </View>
      </View>
      <Box>
        <DetailRow label="Entry" value={entry.id} />
        <DetailRow
          label="Status"
          valueNode={<Chip label={chip.label} tone={chip.tone} />}
        />
        <DetailRow label="Joined" value={fmt.dateTime(entry.joinedAt)} />
      </Box>
      <PzText size={13} tone="mu" style={{ marginTop: 12, marginBottom: 6 }}>
        Notify me by (this campaign only)
      </PzText>
      <OptionRow>
        {channels.map((channel) => (
          <OptionPill
            key={channel}
            label={channel}
            selected={entry.channel === channel}
            onPress={() => changeChannel(channel)}
          />
        ))}
      </OptionRow>
      {status === 'offer' && campaign && entry.offerExpiresAt !== null ? (
        <Box style={{ marginTop: 12 }}>
          <PzText weight={600}>Offer available</PzText>
          <PzText size={13} tone="mu" style={{ marginBottom: 8 }}>
            {fmt.money(campaign.price)} per unit, {campaign.maxPerOrder} max. Expires{' '}
            {fmt.dateTime(entry.offerExpiresAt)} ({fmt.timeLeft(entry.offerExpiresAt)}). This is an
            offer, not a purchase. You’re only charged if you check out.
          </PzText>
          <Button
            label="Take the offer"
            onPress={() =>
              navigation.navigate({
                name: 'checkout',
                campaignId: campaign.id,
                waitlistEntryId: entry.id,
              })
            }
          />
        </Box>
      ) : null}
      {status === 'expired'
        ? note('This offer or registration expired. You can join again if the campaign allows.')
        : null}
      {status === 'unavailable' ? note('This campaign can no longer be fulfilled.') : null}
      {status === 'joined'
        ? note('You joined the campaign. See your order in My Prezo.')
        : null}
      {status === 'active' || status === 'offer' ? (
        <Button
          label="Leave waitlist"
          variant="ghost"
          style={{ marginTop: 14 }}
          onPress={() => setLeaveOpen(true)}
        />
      ) : null}
      <Sheet visible={leaveOpen} onClose={() => setLeaveOpen(false)} title="Leave the waitlist?">
        <PzText tone="mu">
          You’ll stop receiving updates and lose any open offer. Completed orders aren’t affected.
        </PzText>
        <SheetActions>
          <Button label="Leave waitlist" onPress={leave} loading={busy} />
          <Button label="Stay" variant="ghost" onPress={() => setLeaveOpen(false)} />
        </SheetActions>
      </Sheet>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 14,
  },
  headerText: {
    flex: 1,
  },
});

