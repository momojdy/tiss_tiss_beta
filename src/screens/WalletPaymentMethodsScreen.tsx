import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const LINE = '#D3DECB';
const TINT = '#DCE8D2';

type Props = {
  onBack?: () => void;
  onBankCardPress?: () => void;
  onDigitalWalletPress?: () => void;
};

function Header({ onBack }: { onBack?: () => void }) {
  return (
    <>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment methods</Text>
      </View>
      <View style={styles.strip} />
    </>
  );
}

function Option({
  icon,
  title,
  body,
  onPress,
}: {
  title: string;
  body: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionBody}>{body}</Text>
      </View>
      <MaterialIcons name="keyboard-arrow-right" size={26} color={MUTED} />
    </Pressable>
  );
}

export default function WalletPaymentMethodsScreen({ onBack, onBankCardPress, onDigitalWalletPress }: Props) {
  return (
    <View style={styles.page}>
      <Header onBack={onBack} />
      <View style={styles.content}>
        <Text style={styles.intro}>Choose a payment method to manage.</Text>
        <Option
          title="Bank card"
          body="Add and manage your debit or credit cards."
          onPress={onBankCardPress}
        />
        <Option
          title="Digital wallet"
          body="Manage your connected digital wallets."
          onPress={onDigitalWalletPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 100, paddingHorizontal: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: BACKGROUND },
  headerButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { marginLeft: 12, paddingBottom: 1, color: TEXT, fontSize: 19, lineHeight: 23, fontFamily: 'Inter_600SemiBold', transform: [{ translateY: -4.5 }] },
  strip: { height: 20, backgroundColor: '#E6EDE1' },
  content: { paddingHorizontal: 16, paddingTop: 28 },
  intro: { color: MUTED, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', marginBottom: 14 },
  option: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  optionPressed: { opacity: 0.7 },
  optionCopy: { flex: 1 },
  optionTitle: { color: TEXT, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  optionBody: { color: MUTED, fontSize: 13, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 4 },
});
