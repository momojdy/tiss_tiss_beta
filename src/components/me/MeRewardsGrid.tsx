import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onWantissFarmPress?: () => void;
  onEarnPointsPress?: () => void;
  onCheckInPress?: () => void;
  onPlayWinPress?: () => void;
  onSubscriptionPress?: () => void;
};

const ITEMS = [
  { title: 'Wantiss Farm', image: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeWantissFarm.PNG', key: 'farm' },
  { title: 'Earn Points', image: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeEarnPoints.PNG', key: 'points' },
  { title: 'Check in Rewards', image: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeCheckInRewards.PNG', key: 'checkin' },
  { title: 'Play & Win', image: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMePlay-win.PNG', key: 'play' },
  { title: 'Subscription', image: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeSubs.PNG', key: 'subscription' },
] as const;

export default function MeRewardsGrid({ onWantissFarmPress, onEarnPointsPress, onCheckInPress, onPlayWinPress, onSubscriptionPress }: Props) {
  const handlers = { farm: onWantissFarmPress, points: onEarnPointsPress, checkin: onCheckInPress, play: onPlayWinPress, subscription: onSubscriptionPress };
  return <View style={styles.container}>{ITEMS.map(item => <Pressable key={item.key} style={styles.row} onPress={handlers[item.key]}><Image source={{ uri: item.image }} style={styles.asset} resizeMode="contain"/><Text style={styles.title} numberOfLines={1}>{item.title}</Text><Text style={styles.chevron}>›</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  container: { marginTop: 10, marginHorizontal: 13, backgroundColor: '#FFFFFF' },
  row: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEEEEE' },
  asset: { width: 42, height: 42, marginRight: 12 },
  title: { flex: 1, color: '#1E1B3A', fontSize: 13, fontWeight: '600' },
  chevron: { color: '#9A9A9A', fontSize: 22, lineHeight: 24, marginLeft: 8 },
});