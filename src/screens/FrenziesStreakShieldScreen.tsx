import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({ fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false });

export default function FrenziesStreakShieldScreen({ onBack }: { onBack?: () => void }) {
  return (
    <View style={styles.safe}>
      <FrenziesHeader title="Streak Shield" onBack={onBack} showPoints={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}><MaterialCommunityIcons name="shield-check-outline" size={38} color={colors.textPrimary} /></View>
          <Text style={tx(24, fonts.bold)}>Protect your streak</Text>
          <Text style={[tx(14, fonts.regular, colors.textSecondary), styles.heroText]}>A Streak Shield protects your current win streak when you lose a match.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.smallIcon}><MaterialCommunityIcons name="shield-check" size={22} color={colors.textPrimary} /></View>
            <View style={styles.copy}>
              <Text style={tx(16, fonts.bold)}>Streak Shield</Text>
              <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 4 }]}>Use it anytime to protect your wins.</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {['Your current streak is protected from one loss.','The shield is consumed when it saves your streak.','You can keep playing normally after using it.'].map((item) => (
            <View key={item} style={styles.point}>
              <MaterialCommunityIcons name="check-circle-outline" size={19} color={colors.streak.flameBadgeBg} />
              <Text style={[tx(13, fonts.regular), { marginLeft: 9, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={styles.info}>
          <Text style={tx(15, fonts.bold)}>How it works</Text>
          <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 7 }]}>Activate your shield before a match. If you lose, the shield protects your current streak instead of resetting it.</Text>
        </View>
        <Pressable style={styles.cta}><Text style={tx(15, fonts.bold)}>Get Streak Shield</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 22 },
  iconWrap: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroText: { textAlign: 'center', marginTop: 8, maxWidth: 320, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.rankings.cardBorder, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  smallIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 12 },
  divider: { height: 1, backgroundColor: colors.rankings.rowBorder, marginVertical: 16 },
  point: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  info: { paddingHorizontal: 2, paddingTop: 22, paddingBottom: 18 },
  cta: { height: 48, borderRadius: 14, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
});