import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { onPressExpress?: () => void; onPressFavorites?: () => void; onPressFollowedShops?: () => void; onPressBrowsingHistory?: () => void };

export default function MeQuickLinksRow({ onPressExpress, onPressFavorites, onPressFollowedShops, onPressBrowsingHistory }: Props) {
  const items = [
    { icon: 'cube-outline' as const, label: 'Express', onPress: onPressExpress },
    { icon: 'star-outline' as const, label: 'Favorites', onPress: onPressFavorites },
    { icon: 'storefront-outline' as const, label: 'Followed Shops', onPress: onPressFollowedShops },
    { icon: 'time-outline' as const, label: 'Browsing History', onPress: onPressBrowsingHistory },
  ];
  return <View style={styles.container}>{items.map(item => <Pressable key={item.label} style={styles.item} onPress={item.onPress} hitSlop={6}><Ionicons name={item.icon} size={24} color="#1C1C1C" /><Text style={styles.label} numberOfLines={1}>{item.label}</Text></Pressable>)}</View>;
}
const styles = StyleSheet.create({ container: { flexDirection: 'row', marginTop: 13, paddingHorizontal: 8 }, item: { flex: 1, alignItems: 'center', justifyContent: 'center' }, label: { marginTop: 6, fontSize: 10.5, lineHeight: 13, color: '#1C1C1C', fontWeight: '500', textAlign: 'center' } });