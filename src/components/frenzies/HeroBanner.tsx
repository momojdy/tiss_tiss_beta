import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import GradientBox from './GradientBox';
import { assets } from '../../theme/frenziesAssets';
import { colors, sizes } from '../../theme/frenziesTheme';
import { fonts } from '../../theme/frenziesFonts';

export default function HeroBanner() {
  return (
    <View style={styles.outer}>
      <GradientBox gradient={colors.hero.gradient} style={styles.card}>
        <View style={styles.copy}>
          <Text style={styles.title}>Fast PvP. Big fun.</Text>
          <Text style={styles.subtitle}>
            Challenge players. Build your streak.{'
'}Earn Frenzies Points.
          </Text>
        </View>
        <Image source={assets.trophy} style={styles.trophy} resizeMode="contain" />
      </GradientBox>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: sizes.pagePadding,
    paddingTop: 18,
  },
  card: {
    height: sizes.heroHeight,
    borderRadius: sizes.heroRadius,
    position: 'relative',
  },
  copy: {
    position: 'absolute',
    left: 10,
    top: 19,
    right: 112,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 23,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.hero.subtext,
    includeFontPadding: false,
  },
  trophy: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 115,
    height: 100,
  },
});
