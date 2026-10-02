import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const TINT = '#DCE8D2';

type Props = { onBack?: () => void; onAddCardPress?: () => void };

function Header({ onBack }: { onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8}>
        <MaterialIcons name="arrow-back" size={20} color={TEXT} />
      </Pressable>
      <Text style={styles.headerTitle}>Bank cards</Text>
    </View>
  );
}

export default function WalletBankCardsScreen({ onBack, onAddCardPress }: Props) {
  return (
    <View style={styles.page}>
      <Header onBack={onBack} />
      <View style={styles.content}>
        <View style={styles.emptyIcon}>
          <MaterialIcons name="credit-card" size={34} color={TEXT} />
        </View>
        <Text style={styles.emptyTitle}>No bank cards yet</Text>
        <Text style={styles.emptyBody}>
          Add a debit or credit card to make payments faster and easier.
        </Text>
        <Pressable
          onPress={onAddCardPress}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <MaterialIcons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add bank card</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 100, paddingHorizontal: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: BACKGROUND },
  headerButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { marginLeft: 12, paddingBottom: 1, color: TEXT, fontSize: 19, lineHeight: 23, fontFamily: 'Inter_600SemiBold' },
  content: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 64 },
  emptyIcon: { width: 92, height: 92, borderRadius: 46, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: TEXT, fontSize: 20, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  emptyBody: { color: MUTED, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', textAlign: 'center', maxWidth: 330, marginBottom: 22 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 22, backgroundColor: TEXT },
  addButtonPressed: { opacity: 0.72 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_500Medium' },
});
