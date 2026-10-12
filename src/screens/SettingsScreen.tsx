import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

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
  const [switchModalVisible, setSwitchModalVisible] = useState(false);
  const [vendorIdSuffix, setVendorIdSuffix] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('business_members')
          .select('businesses(id,vendor_id)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const related = (data as any)?.businesses;
        const business = Array.isArray(related) ? related[0] : related;
        const id = typeof business?.vendor_id === 'string' ? business.vendor_id : '';
        if (active) setVendorIdSuffix(id || null);
      } catch {
        if (active) setVendorIdSuffix(null);
      }
    })();
    return () => { active = false; };
  }, []);

  const chooseSwitchDestination = (destination: 'vendor' | 'buyer') => {
    setSwitchModalVisible(false);
    onSwitchAccount(destination);
  };

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
          <Pressable onPress={() => setSwitchModalVisible(true)} style={[styles.actionRow, styles.rowDivider]} accessibilityRole="button">
            <Text style={styles.rowLabel}>Switch Account</Text>
            <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
          </Pressable>
          <Pressable onPress={() => Alert.alert('Log out', 'Are you sure you want to log out of Wantiss?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: onLogOut }])} style={styles.actionRow} accessibilityRole="button">
            <Text style={styles.logoutLabel}>Log Out</Text>
            <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
          </Pressable>
        </View>
      </ScrollView>
      <Modal
        visible={switchModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSwitchModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSwitchModalVisible(false)}>
          <Pressable style={[styles.switchModal, { marginBottom: Math.max(insets.bottom, 12) }]} onPress={() => undefined}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Account</Text>
              <Pressable onPress={() => setSwitchModalVisible(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close switch account window">
                <Ionicons name="close" size={22} color={INK} />
              </Pressable>
            </View>
            <Pressable onPress={() => chooseSwitchDestination('buyer')} style={styles.switchOption} accessibilityRole="button">
              <View style={styles.switchOptionText}>
                <Text style={styles.switchOptionTitle}>Other buyer account</Text>
                <Text style={styles.switchOptionSubtitle}>Sign in with another buyer account</Text>
              </View>
              <View style={styles.addAccountButton}>
                <Ionicons name="add" size={23} color="#FFFFFF" />
              </View>
            </Pressable>
            <View style={styles.modalDivider} />
            <Pressable onPress={() => chooseSwitchDestination('vendor')} style={styles.switchOption} accessibilityRole="button">
              <View style={styles.switchOptionText}>
                <Text style={styles.switchOptionTitle}>Business Space</Text>
                <Text style={styles.switchOptionSubtitle}>{vendorIdSuffix ? `Vendor ID · ${vendorIdSuffix}` : 'Vendor dashboard for this email'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B8B4BD" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(22, 18, 32, 0.32)', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  switchModal: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, borderRadius: 22, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 5 }, elevation: 12 },
  modalHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#E5E0E7', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  modalTitle: { color: INK, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  switchOption: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 12 },
  switchOptionText: { flex: 1, gap: 4 },
  switchOptionTitle: { color: '#262626', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  switchOptionSubtitle: { color: MUTED, fontSize: 12, lineHeight: 17 },
  addAccountButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#BF008E', alignItems: 'center', justifyContent: 'center' },
  modalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#EEEAF0' },
});
