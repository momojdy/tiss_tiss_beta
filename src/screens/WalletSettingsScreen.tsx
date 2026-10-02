import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const LINE = '#D3DECB';
const STRIP = '#E6EDE1';
const TINT = '#DCE8D2';
const ART = '#8FAF84';
const DANGER = '#B3261E';
const NAV_DARK = '#14181B';
const NAV_GREEN = '#81C56C';

const COUNTRIES = [
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
];

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

type Profile = { full_name: string | null; email: string | null };
type Wallet = { id: string; balance: number };

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
  right,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  outlineIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  outlineIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        {outlineIcon ? (
          <MaterialCommunityIcons name={outlineIcon} size={26} color={danger ? DANGER : TEXT} />
        ) : (
          <MaterialIcons name={icon} size={26} color={danger ? DANGER : TEXT} />
        )}
      </View>
      <Text style={[styles.rowLabel, danger && styles.dangerLabel]}>{label}</Text>
      {right ?? <MaterialIcons name="keyboard-arrow-right" size={26} color={TEXT} />}
    </Pressable>
  );
}

function PromoBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerTitle}>Invite a friend</Text>
        <Text style={styles.bannerBody}>
          Get 1,000 Wantiss Points for every friend who joins and completes their first transaction.
        </Text>
        <Pressable style={styles.pill}>
          <Text style={styles.pillText}>Invite now</Text>
        </Pressable>
      </View>
      <MaterialIcons name="people" size={76} color={ART} />
    </View>
  );
}

function BottomNav({ onHomePress }: { onHomePress?: () => void }) {
  return (
    <View style={styles.navOuter}>
      <View style={styles.walletNav}>
        <Pressable onPress={onHomePress} style={styles.walletNavItem}>
          <MaterialCommunityIcons name="home-outline" size={29} color={MUTED} />
          <Text style={styles.walletNavLabelMuted}>Home</Text>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="account-group-outline" size={29} color={MUTED} />
          <Text style={styles.walletNavLabelMuted}>Contacts</Text>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="qrcode-scan" size={48} color={NAV_GREEN} />
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialIcons name="query-stats" size={29} color={MUTED} />
          <Text style={styles.walletNavLabelMuted}>Insights</Text>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="cog-outline" size={29} color={TEXT} />
          <Text style={styles.walletNavLabel}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function WalletSettingsScreen({
  onBack,
  onHomePress,
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
  const system = useColorScheme();
  const [isDark, setIsDark] = useState(system === 'dark');
  const [profile, setProfile] = useState<Profile>({ full_name: null, email: null });
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
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

    setWallet(walletRow ? { id: String(walletRow.id), balance: Number(walletRow.balance ?? 0) } : null);

    const metadataCountry =
      user.user_metadata?.country_code ??
      user.user_metadata?.nationality_country_code ??
      user.user_metadata?.country ??
      null;
    setCountryCode(typeof metadataCountry === 'string' ? metadataCountry.toUpperCase() : null);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const countryFlag = COUNTRIES.find(country => country.code === countryCode)?.flag ?? '🌐';

  const changeCountry = async (code: string) => {
    setCountryCode(code);
    setCountryPickerOpen(false);
    const { error } = await supabase.auth.updateUser({ data: { country_code: code } });
    if (error) {
      Alert.alert('Country not updated', 'We could not save your country selection.');
      loadData();
    }
  };

  const deleteWallet = async () => {
    if (!wallet) return;
    if (wallet.balance !== 0) {
      Alert.alert('Wallet cannot be deleted', 'Move your remaining wallet balance before deleting this wallet.');
      return;
    }

    setDeleting(true);
    const { error } = await supabase.from('wallets').delete().eq('id', wallet.id);
    setDeleting(false);

    if (error) {
      Alert.alert('Could not delete wallet', error.message);
      return;
    }
    setWallet(null);
    setConfirmOpen(false);
  };

  return (
    <View style={styles.page}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerIconButton} accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <Pressable onPress={() => setCountryPickerOpen(true)} style={styles.countryHeaderButton} accessibilityLabel="Select country">
          <Text style={styles.flag}>{countryFlag}</Text>
        </Pressable>
      </View>
      <View style={styles.strip} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            {profile.full_name ? <Text style={styles.avatarText}>{profile.full_name.trim().slice(0, 2).toUpperCase()}</Text> : null}
          </View>
          <View style={styles.profileCopy}>
            {profile.full_name ? <Text style={styles.profileName} numberOfLines={1}>{profile.full_name}</Text> : null}
            <Text style={styles.profileEmail} numberOfLines={1}>{profile.email || 'Email not available'}</Text>
          </View>
          <MaterialIcons name="qr-code-2" size={42} color={TEXT} />
        </View>

        {wallet ? (
          <View style={styles.bannerSpacing}>
            <PromoBanner />
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <MaterialIcons name="account-balance-wallet" size={48} color={ART} />
            </View>
            <Text style={styles.emptyTitle}>No wallet yet</Text>
            <Text style={styles.emptyBody}>
              Your Wantiss account is still active. Create a new wallet to top up, pay and earn points again.
            </Text>
            <Pressable onPress={onCreateWalletPress} style={styles.cta}>
              <Text style={styles.ctaText}>Create wallet</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.generalTop} />
        <SectionTitle title="General" />
        <SettingsRow icon="person-outline" label="Personal info" onPress={onPersonalInfoPress} />
        {wallet && <SettingsRow icon="add-card" label="Payment methods" onPress={onPaymentMethodsPress} />}
        <SettingsRow icon="notifications-none" label="Notifications" onPress={onNotificationsSettingsPress} />
        {wallet && <SettingsRow icon="history" label="History" onPress={onHistoryPress} />}
        <SettingsRow icon="lock-reset" label="Security" onPress={onSecurityPress} />
        <SettingsRow
          icon="brightness-3"
          outlineIcon="moon-outline"
          label="Dark mode"
          onPress={() => setIsDark(value => !value)}
          right={
            <Switch
              value={isDark}
              onValueChange={setIsDark}
              trackColor={{ false: '#C9D4C2', true: ART }}
              thumbColor="#FFFFFF"
            />
          }
        />

        <SectionTitle title="About" />
        <SettingsRow icon="help-outline" label="Help center" onPress={onHelpCenterPress} />
        <SettingsRow icon="insert-drive-file" outlineIcon="file-document-outline" label="Privacy policy" onPress={onPrivacyPress} />
        <SettingsRow icon="dns" outlineIcon="database-outline" label="Data rights & control" onPress={onDataRightsPress} />

        {wallet && (
          <>
            <SectionTitle title="Wallet" />
            <SettingsRow
              icon="delete-outline"
              label={deleting ? 'Deleting wallet…' : 'Delete wallet'}
              danger
              onPress={() => !deleting && setConfirmOpen(true)}
            />
          </>
        )}
      </ScrollView>

      <BottomNav onHomePress={onHomePress} />

      <Modal transparent animationType="slide" visible={confirmOpen} onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Delete your wallet?</Text>
            <Text style={styles.sheetBody}>
              Your Wantiss account, profile and settings stay. Only the wallet is removed.
            </Text>
            <View style={styles.note}>
              <Text style={styles.noteText}>
                Balance: {wallet?.balance ?? 0}. A wallet can only be deleted when its balance is empty.
              </Text>
            </View>
            <View style={styles.sheetButtons}>
              <Pressable style={styles.keepButton} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.keepButtonText}>Keep wallet</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={deleteWallet}>
                <Text style={styles.deleteButtonText}>Delete wallet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={countryPickerOpen} onRequestClose={() => setCountryPickerOpen(false)}>
        <Pressable style={styles.countryScrim} onPress={() => setCountryPickerOpen(false)}>
          <View style={styles.countrySheet}>
            {COUNTRIES.map(country => (
              <Pressable key={country.code} style={styles.countryOption} onPress={() => changeCountry(country.code)}>
                <Text style={styles.optionFlag}>{country.flag}</Text>
                <Text style={styles.countryName}>{country.name}</Text>
                {country.code === countryCode && <MaterialIcons name="check" size={22} color={TEXT} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: { width: '100%', height: 100, backgroundColor: BACKGROUND, paddingHorizontal: 10, paddingBottom: 4, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', zIndex: 10, elevation: 10 },
  headerIconButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerTitle: { flex: 1, marginLeft: 12, color: TEXT, fontSize: 19, fontWeight: '800', lineHeight: 23, fontFamily: 'Manrope_800ExtraBold', paddingBottom: 1 },
  countryHeaderButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  flag: { fontSize: 22, lineHeight: 24, textAlign: 'center' },
  strip: { height: 20, backgroundColor: STRIP },
  content: { paddingBottom: 100 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingTop: 15 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: TEXT, fontSize: 24, fontFamily: 'Manrope_700Bold' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: TEXT, fontSize: 16, fontFamily: 'Inter_500Medium' },
  profileEmail: { color: MUTED, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 8 },
  bannerSpacing: { paddingHorizontal: 16, paddingTop: 30 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 100, padding: 14, borderRadius: 16, backgroundColor: TINT },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: TEXT, fontSize: 16, fontFamily: 'Manrope_700Bold', marginBottom: 2 },
  bannerBody: { color: MUTED, fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular', marginBottom: 10 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: TEXT },
  pillText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_500Medium' },
  section: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 6, paddingTop: 2 },
  sectionTitle: { color: MUTED, fontSize: 14, fontFamily: 'Inter_400Regular' },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: LINE },
  generalTop: { height: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginTop: 4, paddingHorizontal: 16 },
  rowIcon: { width: 30, height: 40, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: TEXT, fontSize: 16, fontFamily: 'Inter_500Medium' },
  dangerLabel: { color: DANGER },
  rowIconDanger: { width: 40, borderRadius: 13, backgroundColor: '#FCE8E7' },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 36, paddingBottom: 4 },
  emptyRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { color: TEXT, fontSize: 20, fontFamily: 'Manrope_800ExtraBold', marginBottom: 6 },
  emptyBody: { color: MUTED, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 20 },
  cta: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 26, backgroundColor: TEXT },
  ctaText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  navOuter: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 2 },
  walletNav: { height: 70, borderRadius: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', elevation: 5, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  walletNavItem: { width: 70, height: 50, alignItems: 'center', justifyContent: 'center' },
  walletNavLabel: { paddingTop: 4, fontSize: 10.5, lineHeight: 13, fontFamily: 'Inter_500Medium', color: NAV_DARK, textAlign: 'center' },
  walletNavLabelMuted: { paddingTop: 4, fontSize: 10.5, lineHeight: 13, fontFamily: 'Inter_400Regular', color: MUTED, textAlign: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BACKGROUND, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingTop: 22, paddingBottom: 28 },
  sheetTitle: { color: TEXT, fontSize: 18, fontFamily: 'Manrope_800ExtraBold', marginBottom: 8 },
  sheetBody: { color: MUTED, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  note: { marginTop: 14, marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: TINT },
  noteText: { color: TEXT, fontSize: 13, fontFamily: 'Inter_400Regular' },
  sheetButtons: { flexDirection: 'row', gap: 10 },
  keepButton: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: LINE },
  keepButtonText: { color: TEXT, fontFamily: 'Inter_600SemiBold' },
  deleteButton: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', backgroundColor: DANGER },
  deleteButtonText: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  countryScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  countrySheet: { backgroundColor: BACKGROUND, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28 },
  countryOption: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  optionFlag: { fontSize: 28, width: 44 },
  countryName: { flex: 1, color: TEXT, fontSize: 15, fontFamily: 'Inter_500Medium' },
});
