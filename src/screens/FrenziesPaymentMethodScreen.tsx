import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family,
  fontSize: size,
  lineHeight: size * 1.21,
  color,
  includeFontPadding: false,
});

type Props = {
  onBack?: () => void;
  onBankCardPress?: () => void;
  onDigitalWalletPress?: () => void;
};

function Option({
  icon,
  title,
  body,
  onPress,
}: {
  icon: 'credit-card' | 'account-balance-wallet';
  title: string;
  body: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
      <View style={styles.optionIcon}>
        <MaterialIcons name={icon} size={22} color={colors.textPrimary} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={tx(16, fonts.semibold)}>{title}</Text>
        <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 4 }]}>{body}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={23} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function FrenziesPaymentMethodScreen({
  onBack,
  onBankCardPress,
  onDigitalWalletPress,
}: Props) {
  return (
    <View style={styles.safe}>
      <FrenziesHeader title="Payment method" onBack={onBack} showPoints={false} />
      <View style={styles.content}>
        <Text style={tx(14, fonts.regular, colors.textSecondary)}>
          Choose how you want to pay for your Streak Shield package.
        </Text>

        <View style={styles.options}>
          <Option
            icon="credit-card"
            title="Bank card"
            body="Add and manage your debit or credit cards."
            onPress={onBankCardPress}
          />
          <Option
            icon="account-balance-wallet"
            title="Digital wallet"
            body="Manage your connected digital wallets."
            onPress={onDigitalWalletPress}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 18, paddingTop: 20 },
  options: { marginTop: 16, backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.rankings.cardBorder },
  option: { minHeight: 82, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  optionPressed: { opacity: 0.7 },
  optionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionCopy: { flex: 1 },
});