import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false,
});

type Method = 'card' | 'wallet' | 'apple' | 'google' | 'paypal';

function MethodRow({ method, title, subtitle, selected, onPress, logo, compact }: {
  method: Method; title: string; subtitle?: string; selected: boolean; onPress: () => void; logo?: React.ReactNode; compact?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.methodRow, selected && styles.methodSelected]}>
      {!compact && <View style={styles.methodLogo}>{logo}</View>}
      <View style={styles.methodCopy}>
        <Text style={tx(14, fonts.semibold)}>{title}</Text>
        {!!subtitle && <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 3 }]}>{subtitle}</Text>}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

export default function FrenziesStreakShieldCheckoutScreen({
  onBack, quantity = 5, total = 1,
}: { onBack?: () => void; quantity?: number; total?: number }) {
  const [selectedMethod, setSelectedMethod] = useState<Method>('wallet');
  const savedCards = ['4242', '1881', '5555', '9012', '7426'];
  const [selectedCard, setSelectedCard] = useState('4242');

  return (
    <View style={styles.safe}>
      <FrenziesHeader title="Checkout" onBack={onBack} showPoints={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={tx(24, fonts.bold)}>Complete your purchase</Text>
        <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 7 }]}>
          You're one step away from protecting your streak.
        </Text>

        <View style={styles.summary}>
          <View style={styles.icon}><MaterialCommunityIcons name="shield-check" size={25} color={colors.textPrimary} /></View>
          <View style={styles.summaryCopy}>
            <Text style={tx(17, fonts.bold)}>{quantity} Streak Shields</Text>
            <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 4 }]}>Virtual item for your Frenzies streak</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={tx(15, fonts.bold)}>Payment method</Text>

          <Text style={[tx(13, fonts.semibold), { marginTop: 12 }]}>Bank card</Text>
          <View style={[styles.methods, { marginTop: 9 }]}>
            {savedCards.map((last4) => (
              <MethodRow
                key={last4}
                method="card"
                title={`•••• ${last4}`}
                subtitle="Saved card"
                selected={selectedMethod === 'card' && selectedCard === last4}
                onPress={() => { setSelectedMethod('card'); setSelectedCard(last4); }}
                compact
              />
            ))}
          </View>

          <Text style={[tx(13, fonts.semibold), { marginTop: 20 }]}>Wantiss Wallet</Text>
          <View style={[styles.methods, { marginTop: 9 }]}>
            <MethodRow
              method="wallet"
              title="Wantiss Wallet"
              subtitle="Use your available Wallet balance"
              selected={selectedMethod === 'wallet'}
              onPress={() => setSelectedMethod('wallet')}
              compact
            />
          </View>

          <Text style={[tx(13, fonts.semibold), { marginTop: 20 }]}>Digital wallets</Text>
          <View style={[styles.methods, { marginTop: 9 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalMethods}>
            <MethodRow
              method="apple"
              title="Apple Pay"
              selected={selectedMethod === 'apple'}
              onPress={() => setSelectedMethod('apple')}
              logo={<Text style={styles.appleLogo}></Text>}
            />
            <MethodRow
              method="google"
              title="Google Pay"
              selected={selectedMethod === 'google'}
              onPress={() => setSelectedMethod('google')}
              logo={<Text style={styles.gPayLogo}>G</Text>}
            />
            <MethodRow
              method="paypal"
              title="PayPal"
              selected={selectedMethod === 'paypal'}
              onPress={() => setSelectedMethod('paypal')}
              logo={<Text style={styles.paypalLogo}>P</Text>}
            />
            </ScrollView>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.row}><Text style={tx(13, fonts.regular, colors.textSecondary)}>Streak Shields</Text><Text style={tx(14, fonts.semibold)}>{quantity}</Text></View>
          <View style={[styles.row, { marginTop: 12 }]}><Text style={tx(13, fonts.regular, colors.textSecondary)}>Total</Text><Text style={tx(21, fonts.bold)}>{'$'}{total.toFixed(2)}</Text></View>
        </View>

        <View style={styles.notice}>
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color={colors.textPrimary} />
          <Text style={[tx(12, fonts.regular, colors.textSecondary), { flex: 1, marginLeft: 9 }]}>
            A shield protects one loss. Shields cannot be used in consecutive matches. Purchases are non-refundable.
          </Text>
        </View>

        <Pressable style={styles.pay}>
          <Text style={tx(15, fonts.bold)}>Pay {'$'}{total.toFixed(2)}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 18, paddingBottom: 40, paddingTop: 16 },
  summary: { marginTop: 22, backgroundColor: colors.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.rankings.cardBorder },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, marginLeft: 12 },
  section: { marginTop: 22 },
  methods: { marginTop: 10, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.rankings.cardBorder, overflow: 'hidden' },
  horizontalMethods: { padding: 6, gap: 8 },
  methodRow: { width: 118, minHeight: 68, paddingHorizontal: 10, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.rankings.rowBorder, borderRadius: 12 },
  methodSelected: { backgroundColor: '#F4F8EF', borderColor: colors.streak.shieldPill },
  methodLogo: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F5F6F3', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  methodCopy: { flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#B8BDB5', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.textPrimary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textPrimary },
  emptyAction: { height: 46, marginTop: 8, borderRadius: 13, backgroundColor: '#F3F7EF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  appleLogo: { fontSize: 25, color: colors.textPrimary, fontWeight: '500' },
  gPayLogo: { fontSize: 22, fontWeight: '700', color: '#4285F4' },
  paypalLogo: { fontSize: 22, fontWeight: '800', color: '#003087' },
  totalCard: { marginTop: 16, backgroundColor: colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.rankings.cardBorder },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notice: { marginTop: 14, padding: 14, borderRadius: 15, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'flex-start' },
  pay: { height: 50, marginTop: 18, borderRadius: 14, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
});
