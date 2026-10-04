import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({ fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false });

export default function FrenziesStreakShieldCheckoutScreen({ onBack, quantity = 5, total = 1 }: { onBack?: () => void; quantity?: number; total?: number }) {
  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.textPrimary} /></Pressable>
        <Text style={tx(17, fonts.bold)}>Checkout</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={tx(24, fonts.bold)}>Complete your purchase</Text>
        <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 7 }]}>Review your Streak Shield package before paying.</Text>

        <View style={styles.summary}>
          <View style={styles.icon}><MaterialCommunityIcons name="shield-check" size={25} color={colors.textPrimary} /></View>
          <View style={styles.summaryCopy}>
            <Text style={tx(17, fonts.bold)}>{quantity} Streak Shields</Text>
            <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 4 }]}>Virtual item for your Frenzies streak</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={tx(15, fonts.bold)}>Payment method</Text>
          <Pressable style={styles.payment}>
            <View style={styles.paymentIcon}><MaterialCommunityIcons name="credit-card-outline" size={22} color={colors.textPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={tx(14, fonts.bold)}>Payment card</Text>
              <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 3 }]}>Choose or add a card at payment</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={21} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.row}><Text style={tx(13, fonts.regular, colors.textSecondary)}>Streak Shields</Text><Text style={tx(14, fonts.semibold)}>{quantity}</Text></View>
          <View style={[styles.row, { marginTop: 12 }]}><Text style={tx(13, fonts.regular, colors.textSecondary)}>Total</Text><Text style={tx(21, fonts.bold)}>{'$'}{total.toFixed(2)}</Text></View>
        </View>

        <View style={styles.notice}>
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color={colors.textPrimary} />
          <Text style={[tx(12, fonts.regular, colors.textSecondary), { flex: 1, marginLeft: 9 }]}>A shield protects one loss. Shields cannot be used in consecutive matches.</Text>
        </View>

        <Pressable style={styles.pay}><Text style={tx(15, fonts.bold)}>Pay {'$'}{total.toFixed(2)}</Text></Pressable>
        <Text style={styles.secure}>Secure payment</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  header: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 40, paddingTop: 16 },
  summary: { marginTop: 22, backgroundColor: colors.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.rankings.cardBorder },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, marginLeft: 12 },
  section: { marginTop: 22 },
  payment: { marginTop: 10, minHeight: 68, backgroundColor: colors.white, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.rankings.cardBorder },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  totalCard: { marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.rankings.cardBorder },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notice: { marginTop: 14, padding: 14, borderRadius: 15, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'flex-start' },
  pay: { height: 50, marginTop: 18, borderRadius: 14, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  secure: { textAlign: 'center', marginTop: 10, fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
});
