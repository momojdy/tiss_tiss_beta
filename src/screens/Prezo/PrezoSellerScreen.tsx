import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { CampaignStrip } from '../../components/prezo/campaign/CampaignStrip';
import { Avatar } from '../../components/prezo/shared/Avatar';
import { Button } from '../../components/prezo/shared/Button';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { NotFoundState } from '../../components/prezo/shared/StateViews';

export const PrezoSellerScreen = ({ id }: { id: string }) => {
  const data = usePrezoData();
  const navigation = usePrezoNavigation();
  const seller = data.getSeller(id);

  if (!seller) {
    return (
      <ScreenScaffold>
        {data.sellers.status === 'loading' ? null : (
          <NotFoundState title="Seller not found" message="This seller page isn’t available." />
        )}
      </ScreenScaffold>
    );
  }

  const live = data.campaigns.data.filter(
    (campaign) => campaign.sellerId === id && campaign.status === 'live',
  );

  return (
    <ScreenScaffold>
      <View style={styles.header}>
        <Avatar text={seller.name.charAt(0)} />
        <View style={styles.text}>
          <PageTitle>{seller.name}</PageTitle>
          <PzText tone="mu">{seller.description}</PzText>
        </View>
      </View>
      <CampaignStrip title="Active campaigns" campaigns={live} />
      <View style={{ marginTop: 8 }}>
        <Button
          label="Contact support about this seller"
          variant="ghost"
          onPress={() => navigation.navigate({ name: 'support' })}
        />
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  text: {
    flex: 1,
  },
});

