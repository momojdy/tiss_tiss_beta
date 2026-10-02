import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#F5F8F3';
const WHITE = '#FFFFFF';
const OLIVE = '#1A2517';
const SAGE = '#ACC8A2';
const SAGE_TINT = '#DCE8D2';
const MUTED = '#6E786B';
const DANGER = '#B42318';
const DANGER_TINT = '#FCE8E7';
const BORDER = 'rgba(26,37,23,0.08)';

type Props = {
  onBack?: () => void;
  onHomePress?: () => void;
  onNotificationsPress?: () => void;
  onHelpPress?: () => void;
  onPersonalInfoPress?: () => void;
  onPaymentMethodsPress?: () => void;
  onNotificationsSettingsPress?: () => void;
  onHistoryPress?: () => void;
  onSecurityPress?: () => void;
  onHelpCenterPress?: () => void;
  onPrivacyPress?: () => void;
  onDataRightsPress?: () => void;
  onCreateWalletPress?: () => void;
};

type Profile = {
  full_name: string | null;
  email: string | null;
};

type Wallet = {
  id: string;
  balance: number;
};

type Country = { code: string; name: string; flag: string };

const COUNTRIES: Country[] = [
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
];

function WalletNavLabel({ children }: { children: string }) {
  return <Text style={styles.walletNavLabel}>{children}</Text>;
}

function WalletBottomNav({ onHomePress, onSettingsPress }: { onHomePress?: () => void; onSettingsPress?: () => void }) {
  return (
    <View style={styles.navOuter}>
      <View style={styles.walletNav}>
        <Pressable onPress={onHomePress} style={styles.walletNavItem}>
          <MaterialCommunityIcons name="home-outline" size={29} color={OLIVE} />
          <WalletNavLabel>Home</WalletNavLabel>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="account-group-outline" size={29} color={OLIVE} />
          <WalletNavLabel>Contacts</WalletNavLabel>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="qrcode-scan" size={48} color="#81C56C" />
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialIcons name="query-stats" size={29} color={OLIVE} />
          <WalletNavLabel>Insights</WalletNavLabel>
        </Pressable>
        <Pressable onPress={onSettingsPress} style={styles.walletNavItem}>
          <MaterialCommunityIcons name="cog-outline" size={29} color={OLIVE} />
          <WalletNavLabel>Settings</WalletNavLabel>
        </Pressable>
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
  right,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress && !right} style={styles.row}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <MaterialCommunityIcons name={icon} size={20} color={danger ? DANGER : OLIVE} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right ?? <MaterialCommunityIcons name="chevron-right" size={22} color="#9AA595" />}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function WalletSettingsScreen({
  onBack,
  onHomePress,
  onNotificationsPress,
  onHelpPress,
  onPersonalInfoPress,
  onPaymentMethodsPress,
  onNotificationsSettingsPress,
  onHistoryPress,
  onSecurityPress,
  onHelpCenterPress,
  onPrivacyPress,
  onDataRightsPress,
  onCreateWalletPress,
}: Props) {
  const [profile, setProfile] = useState<Profile>({ full_name: null, email: null });
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find(country => country.code === countryCode) ?? null,
    [countryCode],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const [{ data: profileRow }, { data: walletRow }] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
        supabase.from('wallets').select('id, balance').eq('user_id', user.id).maybeSingle(),
      ]);

      setProfile({
        full_name: profileRow?.full_name ?? user.user_metadata?.full_name ?? null,
        email: profileRow?.email ?? user.email ?? null,
      });
      setWallet(
        walletRow
          ? { id: String(walletRow.id), balance: Number(walletRow.balance ?? 0) }
          : null,
      );

      const metadataCountry =
        user.user_metadata?.country_code ??
        user.user_metadata?.nationality_country_code ??
        user.user_metadata?.country ??
        null;
      setCountryCode(typeof metadataCountry === 'string' ? metadataCountry.toUpperCase() : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCountryChange = async (country: Country) => {
    setCountryCode(country.code);
    setCountryPickerOpen(false);

    const { error } = await supabase.auth.updateUser({
      data: { country_code: country.code },
    });

    if (error) {
      Alert.alert('Country not updated', 'We could not save your country selection. Please try again.');
      await loadData();
    }
  };

  const handleDeleteWallet = () => {
    if (!wallet) return;

    if (wallet.balance !== 0) {
      Alert.alert(
        'Wallet cannot be deleted',
        'Move your remaining wallet balance before deleting this wallet.',
      );
      return;
    }

    Alert.alert(
      'Delete wallet?',
      'This removes this wallet only. Your Wantiss account and profile will remain available, and you can create another wallet later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete wallet',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase.from('wallets').delete().eq('id', wallet.id);
            setDeleting(false);

            if (error) {
              Alert.alert('Could not delete wallet', error.message);
              return;
            }

            setWallet(null);
          },
        },
      ],
    );
  };

  const initials = (profile.full_name ?? profile.email ?? 'W').trim().slice(0, 1).toUpperCase();

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={onBack} style={styles.headerIcon} accessibilityLabel="Back">
            <MaterialCommunityIcons name="arrow-left" size={20} color={OLIVE} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={onNotificationsPress ?? (() => {})} style={styles.headerIcon}>
            <MaterialCommunityIcons name="bell-outline" size={20} color={OLIVE} />
          </Pressable>
          <Pressable onPress={onHelpPress ?? (() => {})} style={styles.headerIcon}>
            <MaterialCommunityIcons name="help-circle-outline" size={20} color={OLIVE} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>
              {loading ? 'Loading…' : profile.full_name || 'Your name'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {profile.email || 'Email not available'}
            </Text>
          </View>
          <View style={styles.countryWrap}>
            <Pressable onPress={() => setCountryPickerOpen(true)} style={styles.flagButton}>
              <Text style={styles.flag}>{selectedCountry?.flag ?? '🌐'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={OLIVE} />
            </Pressable>
            <Text style={styles.countryLabel}>{selectedCountry?.name ?? 'Country'}</Text>
          </View>
        </View>

        {wallet ? (
          <View style={styles.walletCard}>
            <View style={styles.walletCardTop}>
              <View>
                <Text style={styles.walletEyebrow}>CURRENT WALLET</Text>
                <Text style={styles.walletId}>Wallet ID</Text>
                <Text style={styles.walletIdValue}>{wallet.id}</Text>
              </View>
              <View style={styles.qrBox}>
                <MaterialCommunityIcons name="qrcode" size={46} color={OLIVE} />
              </View>
            </View>
            <Text style={styles.walletNote}>This identifier belongs to this wallet. A future wallet gets a different ID.</Text>
          </View>
        ) : (
          <View style={styles.noWalletCard}>
            <View style={styles.noWalletIcon}>
              <MaterialCommunityIcons name="wallet-outline" size={26} color={OLIVE} />
            </View>
            <View style={styles.noWalletCopy}>
              <Text style={styles.noWalletTitle}>No wallet yet</Text>
              <Text style={styles.noWalletText}>Your Wantiss account is still active. Create a wallet whenever you’re ready.</Text>
            </View>
            <Pressable onPress={onCreateWalletPress} style={styles.createButton}>
              <Text style={styles.createButtonText}>Create</Text>
            </Pressable>
          </View>
        )}

        <Section title="General">
          <SettingsRow icon="account-outline" title="Personal info" subtitle="Name, email and country" onPress={onPersonalInfoPress} />
          <SettingsRow icon="credit-card-outline" title="Payment methods" subtitle="Manage your saved cards" onPress={onPaymentMethodsPress} />
          <SettingsRow icon="bell-outline" title="Notifications" onPress={onNotificationsSettingsPress} />
          <SettingsRow icon="history" title="History" subtitle="Wallet activity and transactions" onPress={onHistoryPress} />
          <SettingsRow icon="shield-lock-outline" title="Security" subtitle="Password and account security" onPress={onSecurityPress} />
          <SettingsRow
            icon="weather-night"
            title="Dark mode"
            subtitle="Use the app theme"
            right={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: '#D7DDD3', true: SAGE }} thumbColor={WHITE} />}
          />
        </Section>

        <Section title="About">
          <SettingsRow icon="help-circle-outline" title="Help center" onPress={onHelpCenterPress} />
          <SettingsRow icon="file-document-outline" title="Privacy policy" onPress={onPrivacyPress} />
          <SettingsRow icon="database-cog-outline" title="Data rights & control" onPress={onDataRightsPress} />
        </Section>

        {wallet && (
          <Section title="Wallet">
            <SettingsRow
              icon="delete-outline"
              title={deleting ? 'Deleting wallet…' : 'Delete wallet'}
              subtitle="Deletes this wallet only"
              danger
              onPress={deleting ? undefined : handleDeleteWallet}
            />
          </Section>
        )}

        <Text style={styles.footer}>Wantiss Wallet</Text>
      </ScrollView>

      <Modal visible={countryPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}>
          <View style={styles.countryModal}>
            <Text style={styles.modalTitle}>Country</Text>
            {COUNTRIES.map(country => (
              <Pressable key={country.code} onPress={() => handleCountryChange(country)} style={styles.countryOption}>
                <Text style={styles.optionFlag}>{country.flag}</Text>
                <Text style={styles.optionName}>{country.name}</Text>
                {country.code === countryCode && <MaterialCommunityIcons name="check" size={20} color={OLIVE} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <WalletBottomNav onHomePress={onHomePress} onSettingsPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: { width: '100%', height: 100, backgroundColor: BACKGROUND, paddingHorizontal: 10, paddingBottom: 4, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', paddingTop: 0 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: SAGE_TINT, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { marginLeft: 12, fontFamily: 'Manrope_800ExtraBold', fontWeight: '800', fontSize: 19, lineHeight: 19, color: OLIVE, transform: [{ translateY: 1 }] },
  content: { paddingHorizontal: 15, paddingTop: 13, paddingBottom: 120 },
  profileCard: { backgroundColor: WHITE, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: SAGE_TINT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 21 },
  profileCopy: { flex: 1, minWidth: 0, marginLeft: 12 },
  profileName: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 16, lineHeight: 21 },
  profileEmail: { marginTop: 3, color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  countryWrap: { alignItems: 'center', marginLeft: 10 },
  flagButton: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, backgroundColor: SAGE_TINT },
  flag: { fontSize: 22 },
  countryLabel: { marginTop: 3, color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 9 },
  walletCard: { marginTop: 12, backgroundColor: OLIVE, borderRadius: 20, padding: 18 },
  walletCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletEyebrow: { color: SAGE, fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 },
  walletId: { color: WHITE, fontFamily: 'Manrope_800ExtraBold', fontSize: 15, marginTop: 5 },
  walletIdValue: { color: SAGE, fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 5, maxWidth: 230 },
  walletNote: { color: '#D7E3D2', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14, marginTop: 14 },
  qrBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  noWalletCard: { marginTop: 12, backgroundColor: SAGE_TINT, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center' },
  noWalletIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
  noWalletCopy: { flex: 1, marginLeft: 12, minWidth: 0 },
  noWalletTitle: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 },
  noWalletText: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  createButton: { backgroundColor: OLIVE, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8, marginLeft: 8 },
  createButtonText: { color: WHITE, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  section: { marginTop: 20 },
  sectionTitle: { marginLeft: 4, marginBottom: 8, color: MUTED, fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  card: { backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  row: { minHeight: 66, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: SAGE_TINT, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: DANGER_TINT },
  rowCopy: { flex: 1, minWidth: 0, marginLeft: 12 },
  rowTitle: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 13.5 },
  rowSubtitle: { color: MUTED, fontFamily: 'Inter_400Regular', fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  dangerText: { color: DANGER },
  footer: { textAlign: 'center', color: '#9AA595', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 25 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'flex-end' },
  countryModal: { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  modalTitle: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 17, marginBottom: 8 },
  countryOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  optionFlag: { fontSize: 23, width: 40 },
  optionName: { flex: 1, color: OLIVE, fontFamily: 'Inter_500Medium', fontSize: 13 },
  navOuter: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 2 },
  walletNav: { height: 70, borderRadius: 18, backgroundColor: WHITE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', elevation: 5, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  walletNavItem: { width: 70, height: 50, alignItems: 'center', justifyContent: 'center' },
  walletNavLabel: { paddingTop: 4, fontSize: 10.5, lineHeight: 13, fontFamily: 'Inter_500Medium', color: OLIVE, textAlign: 'center' },
});
