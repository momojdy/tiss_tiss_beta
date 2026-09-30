import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = { onPressViewAll?: () => void; onPressToPay?: () => void; onPressToShip?: () => void; onPressToReceive?: () => void; onPressToReview?: () => void; onPressRefund?: () => void };

export default function MeOrdersCard({ onPressViewAll, onPressToPay, onPressToShip, onPressToReceive, onPressToReview, onPressRefund }: Props) {
  const items = [
    { icon: 'wallet-outline' as const, label: 'To Pay', onPress: onPressToPay },
    { icon: 'package-variant-closed' as const, label: 'To Ship', onPress: onPressToShip },
    { icon: 'truck-delivery-outline' as const, label: 'To Receive', onPress: onPressToReceive },
    { icon: 'message-text-outline' as const, label: 'To Review', onPress: onPressToReview },
    { icon: 'cash-refund' as const, label: 'Refund / Support', onPress: onPressRefund },
  ];
  return <View style={styles.card}><View style={styles.header}><Text style={styles.title}>My Orders</Text><Pressable style={styles.viewAll} onPress={onPressViewAll} hitSlop={6}><Text style={styles.viewAllText}>View All</Text><MaterialCommunityIcons name="chevron-right" size={11} color="#8A8A8A" /></Pressable></View><View style={styles.itemsRow}>{items.map(item => <Pressable key={item.label} style={styles.item} onPress={item.onPress} hitSlop={5}><MaterialCommunityIcons name={item.icon} size={24} color="#1C1C1C" /><Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text></Pressable>)}</View></View>;
}
const styles = StyleSheet.create({ card: { marginHorizontal: 12, marginTop: 13, height: 91, borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingTop: 10, shadowColor: '#E91E8C', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }, title: { fontSize: 15, lineHeight: 18, fontWeight: '700', color: '#1C1C1C' }, viewAll: { flexDirection: 'row', alignItems: 'center' }, viewAllText: { fontSize: 11, lineHeight: 13, color: '#8A8A8A', marginRight: 2 }, itemsRow: { flexDirection: 'row', marginTop: 10 }, item: { flex: 1, alignItems: 'center', justifyContent: 'center' }, itemLabel: { marginTop: 6, fontSize: 10, lineHeight: 12, color: '#1C1C1C', fontWeight: '500', textAlign: 'center' } });