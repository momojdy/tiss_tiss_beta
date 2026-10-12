import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { onBack: () => void };

const INK = '#1E1B3A';
const MUTED = '#8D8997';
const PINK = '#FCE4F1';

const SECTIONS = [
  { title: 'ACCOUNT', rows: ['Account & Security', 'Personal Information', 'Addresses'] },
  { title: 'PREFERENCES', rows: ['Language', 'Region & Currency', 'Notifications'] },
  { title: 'PRIVACY & SUPPORT', rows: ['Privacy & Permissions', 'Help Center', 'About Wantiss'] },
];

function SettingSection({ title, rows }: { title: string; rows: string[] }) {
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

export default function SettingsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={INK} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerBalance} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {SECTIONS.map((section, index) => (
          <React.Fragment key={section.title}>
            {index > 0 && <View style={styles.sectionStripe} />}
            <SettingSection title={section.title} rows={section.rows} />
          </React.Fragment>
        ))}
        <View style={styles.sectionStripe} />
        <View style={styles.accountActions}>
          <Pressable onPress={() => {}} style={[styles.actionRow, styles.rowDivider]} accessibilityRole="button">
            <Text style={styles.rowLabel}>Switch Account</Text>
            <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
          </Pressable>
          <Pressable onPress={() => {}} style={styles.actionRow} accessibilityRole="button">
            <Text style={styles.rowLabel}>Log Out</Text>
            <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 58, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0EDF0', backgroundColor: '#FFFFFF' },
  backButton: { width: 36, height: 34, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: INK, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.25 },
  headerBalance: { width: 36 },
  content: { paddingBottom: Math.max(24, 24) },
  section: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  sectionTitle: { color: MUTED, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.45, marginBottom: 4 },
  row: { minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0, borderBottomColor: '#F2F0F2' },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { color: '#262626', fontSize: 15, lineHeight: 21, fontWeight: '400' },
  sectionStripe: { height: 10, width: '100%', backgroundColor: PINK },
  accountActions: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  actionRow: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0, borderBottomColor: '#F2F0F2' },
});
