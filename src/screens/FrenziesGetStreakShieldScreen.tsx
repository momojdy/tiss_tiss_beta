import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({ fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false });

export default function FrenziesGetStreakShieldScreen({ onBack }: { onBack?: () => void }) {
  return (
    <View style={styles.safe}>
      <FrenziesHeader title="Get Streak Shield" onBack={onBack} showPoints={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}><MaterialCommunityIcons name="shield-check-outline" size={40} color={colors.textPrimary} /></View>
          <Text style={tx(24, fonts.bold)}>Keep your streak safe</Text>
          <Text style={[tx(14, fonts.regular, colors.textSecondary), styles.heroText]}>Get a Streak Shield and protect your current win streak from one loss.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.smallIcon}><MaterialCommunityIcons name="shield-check" size={23} color={colors.textPrimary} /></View>
            <View style={styles.copy}>
              <Text style={tx(17, fonts.bold)}>1 Streak Shield</Text>
              <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 4 }]}>Ready to activate before a match.</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {['Protects one current win streak loss.','Consumed only when it saves your streak.','Your streak continues after the shield is used.'].map((item) => (
            <View key={item} style={styles.point}>
              <MaterialCommunityIcons name="check-circle-outline" size={19} color={colors.streak.flameBadgeBg} />
              <Text style={[tx(13, fonts.regular), { marginLeft: 9, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceCard}>
          <Text style={tx(13, fonts.regular, colors.textSecondary)}>Streak Shield</Text>
          <Text style={tx(22, fonts.bold)}>1 shield</Text>
          <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 4 }]}>Available to use on your next match.</Text>
        </View>

        <Pressable style={styles.cta}>
          <Text style={tx(15, fonts.bold)}>Get Streak Shield</Text>
        </Pressable>
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
  priceCard: { marginTop: 14, backgroundColor: colors.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.rankings.cardBorder },
  cta: { height: 50, marginTop: 18, borderRadius: 14, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
});
