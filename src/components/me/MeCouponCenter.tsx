import React from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPressCouponCenter?: () => void;
  onPressClaim?: () => void;
};

export default function MeCouponCenterBanner({
  onPressCouponCenter,
  onPressClaim,
}: Props) {
  return (
    <LinearGradient
      colors={['#FCE8F2', '#FDF0F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.banner}
    >
      <Pressable style={styles.left} onPress={onPressCouponCenter}>
        <View style={styles.iconCircle}>
          <Ionicons name="ticket-outline" size={15} color="#E0358F" />
        </View>
        <Text style={styles.title} numberOfLines={1}>Coupon Center</Text>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.offer}>
        <Text style={styles.amount}>$10</Text>
        <View style={styles.offerText}>
          <Text style={styles.offerTitle} numberOfLines={1}>Extra Coupon</Text>
          <Text style={styles.offerSub} numberOfLines={1}>For Digital Products</Text>
        </View>
      </View>

      <Pressable style={styles.button} onPress={onPressClaim}>
        <Text style={styles.buttonText}>Claim Now</Text>
        <Ionicons name="chevron-forward" size={9} color="#FFFFFF" />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
    marginHorizontal: 13,
    marginTop: 14,
    paddingLeft: 9,
    paddingRight: 10,
    borderRadius: 12,
  },
  left: {
    width: 106,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#FBD3E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  divider: {
    width: 1,
    height: 15,
    backgroundColor: '#F2C2DA',
  },
  offer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
  },
  amount: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#C2007A',
  },
  offerText: { marginLeft: 9, flexShrink: 1 },
  offerTitle: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    color: '#1C1C1C',
  },
  offerSub: {
    fontSize: 8,
    lineHeight: 10,
    color: '#8A6F7D',
    marginTop: 1,
  },
  button: {
    width: 69,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C2007A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 2,
  },
});
