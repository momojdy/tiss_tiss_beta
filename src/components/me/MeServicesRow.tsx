import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
const ASSETS = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/';
type Props = { onPressFarm?: () => void; onPressEarnPoints?: () => void; onPressCheckIn?: () => void; onPressPlayWin?: () => void; onPressSubscriptions?: () => void };
export default function MeServicesRow({ onPressFarm, onPressEarnPoints, onPressCheckIn, onPressPlayWin, onPressSubscriptions }: Props) {
  const items = [
    { image: `${ASSETS}MainMeWantissFarm.PNG`, label: 'Wantiss Farm', onPress: onPressFarm },
    { image: `${ASSETS}MainMeEarnPoints.PNG`, label: 'Earn Points', onPress: onPressEarnPoints },
    { image: `${ASSETS}MainMeCheckInRewards.PNG`, label: 'Check-in Rewards', onPress: onPressCheckIn },
    { image: `${ASSETS}MainMePlay-win.PNG`, label: 'Play & Win', onPress: onPressPlayWin },
    { image: `${ASSETS}MainMeSubs.PNG`, label: 'Subscriptions', onPress: onPressSubscriptions },
  ];
  return <View style={styles.container}><Text style={styles.title}>Wantiss Services</Text><View style={styles.row}>{items.map(item => <Pressable key={item.label} style={styles.item} onPress={item.onPress} hitSlop={5}><Image source={{ uri: item.image }} style={styles.asset} resizeMode="contain" /><Text style={styles.label} numberOfLines={2}>{item.label}</Text></Pressable>)}</View></View>;
}
const styles = StyleSheet.create({ container: { marginTop: 14, paddingHorizontal: 12 }, title: { paddingLeft: 8, fontSize: 15, lineHeight: 18, fontWeight: '700', color: '#1C1C1C' }, row: { flexDirection: 'row', marginTop: 5 }, item: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' }, asset: { width: 54, height: 46 }, label: { marginTop: 3, minHeight: 25, fontSize: 10, lineHeight: 12, color: '#3A2A35', fontWeight: '500', textAlign: 'center' } });