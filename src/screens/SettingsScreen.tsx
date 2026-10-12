import React from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onBack: () => void;
  onOpen: (screen: 'accountSecurity' | 'personalInformation' | 'addresses' | 'language' | 'regionCurrency' | 'notifications' | 'privacy' | 'help' | 'about') => void;
  onSwitchAccount: (destination: 'vendor' | 'buyer') => void;
  onLogOut: () => void;
};

const INK = '#1E1B3A';
const MUTED = '#8D8997';
const PINK = '#FCE4F1';
const SECTIONS = [
  { title: 'ACCOUNT', rows: [{ label: 'Account & Security', screen: 'accountSecurity' }, { label: 'Personal Information', screen: 'personalInformation' }, { label: 'Addresses', screen: 'addresses' }] },
  { title: 'PREFERENCES', rows: [{ label: 'Language', screen: 'language' }, { label: 'Region & Currency', screen: 'regionCurrency' }, { label: 'Notifications', screen: 'notifications' }] },
  { title: 'PRIVACY & SUPPORT', rows: [{ label: 'Privacy & Permissions', screen: 'privacy' }, { label: 'Help Center', screen: 'help' }, { label: 'About Wantiss', screen: 'about' }] },
] as const;

export default function SettingsScreen({ onBack, onOpen, onSwitchAccount, onLogOut }: Props) {
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.rows.map((row, rowIndex) => (
                <Pressable key={row.label} onPress={() => onOpen(row.screen)} style={[styles.row, rowIndex < section.rows.length - 1 && styles.rowDivider]} accessibilityRole="button">
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
                </Pressable>
              ))}
            </View>
          </React.Fragment>
        ))}
        <View style={styles.sectionStripe} />
        <View style={styles.accountActions}>
          <Pressable onPress={() => Alert.alert('Switch account', 'Choose where you want to go.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Business Space', onPress: () => onSwitchAccount('vendor') }, { text: 'Switch to another buyer account', onPress: () => onSwitchAccount('buyer') }])} style={[styles.actionRow, styles.rowDivider]} accessibilityRole="button">
            <Text style={styles.rowLabel}>Switch Account</Text>
            <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
          </Pressable>
          <Pressable onPress={() => Alert.alert('Log out', 'Are you sure you want to log out of Wantiss?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: onLogOut }])} style={styles.actionRow} accessibilityRole="button">
            <Text style={styles.logoutLabel}>Log Out</Text>
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
  content: { paddingBottom: 28 },
  section: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  sectionTitle: { color: MUTED, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.45, marginBottom: 4 },
  row: { minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F0F2' },
  rowLabel: { color: '#262626', fontSize: 15, lineHeight: 21, fontWeight: '400' },
  logoutLabel: { color: '#B3261E', fontSize: 15, lineHeight: 21, fontWeight: '400' },
  sectionStripe: { height: 10, width: '100%', backgroundColor: PINK },
  accountActions: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  actionRow: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
