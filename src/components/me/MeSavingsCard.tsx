import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PIGGY_ASSET = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMePiggybank.PNG';
const MEMBER_CENTER_ASSET = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeMemberCenter.PNG';
const REDEEM_CARD_ASSET = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeReedemCard.PNG';

type Props = { totalSavings?: number; onPressSavings?: () => void; onPressMemberCenter?: () => void; onPressRedeemCard?: () => void };

export default function MeSavingsCard({ totalSavings = 0, onPressSavings, onPressMemberCenter, onPressRedeemCard }: Props) {
  return (
    <LinearGradient colors={['#FFDDEC', '#FCE8F2', '#FFF3F9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <Pressable style={styles.left} onPress={onPressSavings}>
        <Image source={{ uri: PIGGY_ASSET }} style={styles.piggy} resizeMode="contain" />
        <View style={styles.leftText}><Text style={styles.label}>Total Savings</Text><View style={styles.amountRow}><Text style={styles.amount}>${totalSavings.toFixed(2)}</Text><Ionicons name="chevron-forward" size={13} color="#222" style={styles.amountChevron} /></View></View>
      </Pressable>
      <View style={styles.divider} />
      <Pressable style={styles.mid} onPress={onPressMemberCenter}>
        <Image source={{ uri: MEMBER_CENTER_ASSET }} style={styles.memberAsset} resizeMode="contain" />
        <View style={styles.textOverlay}><Text style={styles.title}>Member Center</Text><View style={styles.subRow}><Text style={styles.sub} numberOfLines={1}>Exclusive Benefits & Rewards</Text><Ionicons name="chevron-forward" size={9} color="#555" /></View></View>
      </Pressable>
      <View style={styles.divider} />
      <Pressable style={styles.right} onPress={onPressRedeemCard}>
        <Image source={{ uri: REDEEM_CARD_ASSET }} style={styles.redeemAsset} resizeMode="contain" />
        <View style={styles.textOverlay}><Text style={styles.title}>Redeem Card</Text><View style={styles.subRow}><Text style={styles.sub} numberOfLines={1}>Get Your Rewards</Text><Ionicons name="chevron-forward" size={9} color="#555" style={styles.rightChevron} /></View></View>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', height: 74, marginHorizontal: 12, paddingTop: 10, borderRadius: 14, overflow: 'hidden', shadowColor: '#E91E8C', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  left: { width: 150, flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  piggy: { width: 52, height: 50, flexShrink: 0 },
  leftText: { marginLeft: 10 },
  label: { fontSize: 11, fontWeight: '600', color: '#2A2A2A' },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  amount: { fontSize: 18, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  amountChevron: { marginTop: 6 },
  divider: { width: 1, marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.95)' },
  mid: { width: 110, position: 'relative', paddingLeft: 12, paddingTop: 10 },
  right: { width: 110, position: 'relative', paddingLeft: 12, paddingRight: 10, paddingTop: 10 },
  textOverlay: { position: 'relative', zIndex: 2 },
  title: { fontSize: 10, fontWeight: '700', color: '#1C1C1C' },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  sub: { fontSize: 8, color: '#2F2930', flexShrink: 1 },
  memberAsset: { position: 'absolute', width: 48, height: 48, bottom: -2, left: 40, zIndex: 1 },
  redeemAsset: { position: 'absolute', width: 48, height: 48, bottom: -2, left: 32, zIndex: 1 },
  rightChevron: { marginLeft: 'auto' },
});
