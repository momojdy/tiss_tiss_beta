import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { onBack: () => void };

const INK = '#1E1B3A';
const MUTED = '#8D8997';
const PINK = '#FCE4F1';

const SECTIONS = [
  { title: 'ACCOUNT INFORMATION', rows: ['Account ID', 'Phone Number', 'Email Address'] },
  { title: 'LOGIN & SECURITY', rows: ['Login Password', 'Account Verification', 'Login Devices'] },
  { title: 'CONNECTED ACCOUNTS', rows: ['Linked Accounts'] },
  { title: 'ACCOUNT MANAGEMENT', rows: ['Deactivate or Delete Account'] },
];

function SecuritySection({ title, rows }: { title: string; rows: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((label, index) => (
        <Pressable key={label} onPress={() => {}} style={[styles.row, index < rows.length - 1 && styles.rowDivider]} accessibilityRole="button">
          <Text style={styles.rowLabel}>{label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
        </Pressable>
      ))}
    </View>
  );
}

export default function AccountSecurityScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to Settings">
          <Ionicons name="chevron-back" size={24} color={INK} />
        </Pressable>
        <Text style={styles.title}>Account & Security</Text>
        <View style={styles.headerBalance} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {SECTIONS.map((section, index) => (
          <React.Fragment key={section.title}>
            {index > 0 && <View style={styles.sectionStripe} />}
            <SecuritySection title={section.title} rows={section.rows} />
          </React.Fragment>
        ))}
        <Text style={styles.note}>Keep your account information up to date to help protect your Wantiss account.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 58, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0EDF0', backgroundColor: '#FFFFFF' },
  backButton: { width: 36, height: 34, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: INK, fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.25 },
  headerBalance: { width: 36 },
  content: { paddingBottom: 28 },
  section: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  sectionTitle: { color: MUTED, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.45, marginBottom: 4 },
  row: { minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F0F2' },
  rowLabel: { color: '#262626', fontSize: 15, lineHeight: 21, fontWeight: '400' },
  sectionStripe: { height: 10, width: '100%', backgroundColor: PINK },
  note: { marginHorizontal: 18, marginTop: 12, color: MUTED, fontSize: 12, lineHeight: 18 },
});
