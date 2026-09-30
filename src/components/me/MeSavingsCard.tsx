import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PINK = '#D4117F';

const PIGGY_ASSET =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMePiggybank.PNG';

const MEMBER_CENTER_ASSET =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeMemberCenter.PNG';

const REDEEM_CARD_ASSET =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainMeReedemCard.PNG';

type Props = {
  totalSavings?: number;
  onPressSavings?: () => void;
  onPressMemberCenter?: () => void;
  onPressRedeemCard?: () => void;
};

export default function MeSavingsCard({
  totalSavings = 0,
  onPressSavings,
  onPressMemberCenter,
  onPressRedeemCard,
}: Props) {
  return (
    <LinearGradient
      colors={['#FFDDEC', '#FCE8F2', '#FFF3F9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Pressable style={styles.left} onPress={onPressSavings}>
        <Image source={{ uri: PIGGY_ASSET }} style={styles.piggy} resizeMode="contain" />
        <View style={styles.leftText}>
          <Text style={styles.label}>Total Savings</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>${totalSavings.toFixed(2)}</Text>
            <Ionicons name="chevron-forward" size={13} color="#222" style={styles.amountChevron} />
          </View>
        </View>
      </Pressable>

      <View style={styles.divider} />

      <Pressable style={styles.mid} onPress={onPressMemberCenter}>
        <Text style={styles.title}>Member Center</Text>
        <View style={styles.subRow}>
          <Text style={styles.sub} numberOfLines={1}>Exclusive Benefits & Rewards</Text>
          <Ionicons name="chevron-forward" size={9} color="#555" />
        </View>
        <Image source={{ uri: MEMBER_CENTER_ASSET }} style={styles.memberAsset} resizeMode="contain" />
      </Pressable>

      <View style={styles.divider} />

      <Pressable style={styles.right} onPress={onPressRedeemCard}>
        <Text style={styles.title}>Redeem Card</Text>
        <View style={styles.subRow}>
          <Text style={styles.sub} numberOfLines={1}>Get Your Rewards</Text>
          <Ionicons name="chevron-forward" size={9} color="#555" style={styles.rightChevron} />
        </View>
        <Image source={{ uri: REDEEM_CARD_ASSET }} style={styles.redeemAsset} resizeMode="contain" />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    height: 68,
    marginHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    shadowColor: '#E91E8C',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  left: {
    width: 155,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
  },
  piggy: {
    width: 52,
    height: 50,
    flexShrink: 0,
  },
  leftText: {
    marginLeft: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  amount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.5,
  },
  amountChevron: {
    marginTop: 6,
  },
  divider: {
    width: 1,
    marginVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  mid: {
    width: 115,
    paddingLeft: 12,
    paddingTop: 10,
  },
  right: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 10,
    paddingTop: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sub: {
    fontSize: 9,
    color: '#8A6F7D',
    flexShrink: 1,
  },
  memberAsset: {
    position: 'absolute',
    width: 42,
    height: 42,
    bottom: -1,
    left: 48,
  },
  redeemAsset: {
    position: 'absolute',
    width: 42,
    height: 42,
    bottom: -1,
    left: 37,
  },
  rightChevron: {
    marginLeft: 'auto',
  },
});
