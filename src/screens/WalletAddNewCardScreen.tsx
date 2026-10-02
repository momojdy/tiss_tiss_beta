import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const TINT = '#DCE8D2';

type Props = { onBack?: () => void };

function Header({ onBack }: { onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8}>
        <MaterialIcons name="arrow-back" size={20} color={TEXT} />
      </Pressable>
      <Text style={styles.headerTitle}>Add New Card</Text>
    </View>
  );
}

export default function WalletAddNewCardScreen({ onBack }: Props) {
  return (
    <View style={styles.page}>
      <Header onBack={onBack} />
      <View style={styles.content} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    height: 100,
    paddingHorizontal: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: BACKGROUND,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 12,
    paddingBottom: 1,
    color: TEXT,
    fontSize: 19,
    lineHeight: 23,
    fontFamily: 'Manrope_800ExtraBold',
  },
  content: { flex: 1 },
});
