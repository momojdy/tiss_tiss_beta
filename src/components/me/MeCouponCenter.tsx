import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { onPress?: () => void };

export default function MeCouponCenter({ onPress }: Props) {
  return (
    <Pressable style={styles.container} onPress={onPress} hitSlop={4}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Ionicons name="ticket-outline" size={25} color="#C31382" />
        </View>
        <Text style={styles.title}>Coupon Center</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.offer}>
        <Text style={styles.amount}>$10</Text>
        <View style={styles.offerCopy}>
          <Text style={styles.offerTitle}>Extra Coupon</Text>
          <Text style={styles.offerSub}>For Digital Products</Text>
        </View>
      </View>

      <View style={styles.claimButton}>
        <Text style={styles.claimText}>Claim Now</Text>
        <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 28,
    marginTop: 15,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#FFF0F8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    color: '#201A38',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: '#E8CADC',
    marginHorizontal: 14,
  },
  offer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  amount: {
    color: '#C31382',
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '700',
    marginRight: 10,
  },
  offerCopy: {
    minWidth: 0,
  },
  offerTitle: {
    color: '#302A42',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  offerSub: {
    color: '#777184',
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1,
  },
  claimButton: {
    height: 40,
    minWidth: 122,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#C31382',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  claimText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 5,
  },
});
