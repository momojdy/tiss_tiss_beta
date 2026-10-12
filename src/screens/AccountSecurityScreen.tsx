import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { COUNTRIES } from './WalletSettingsScreen';

type Props = { onBack: () => void };
type Action = 'password' | 'email' | 'phone' | 'verification' | 'devices' | 'linked' | 'account' | 'delete' | null;

const INK = '#1E1B3A';
const MUTED = '#8D8997';
const PINK = '#FCE4F1';
const DIAL_CODES: Record<string, string> = {
AF:'+93', AX:'+358', AL:'+355', DZ:'+213', AS:'+1684', AD:'+376', AO:'+244', AI:'+1264', AQ:'+672', AG:'+1268', AR:'+54', AM:'+374', AW:'+297', AU:'+61', AT:'+43', AZ:'+994', BS:'+1242', BH:'+973', BD:'+880', BB:'+1246', BY:'+375', BE:'+32', BZ:'+501', BJ:'+229', BM:'+1441', BT:'+975', BO:'+591', BA:'+387', BW:'+267', BV:'+47', BR:'+55', IO:'+246', VG:'+1284', BN:'+673', BG:'+359', BF:'+226', BI:'+257', KH:'+855', CM:'+237', CA:'+1', CV:'+238', BQ:'+599', KY:'+1345', CF:'+236', TD:'+235', CL:'+56', CN:'+86', CX:'+61', CC:'+61', CO:'+57', KM:'+269', CK:'+682', CR:'+506', CI:'+225', HR:'+385', CU:'+53', CW:'+599', CY:'+357', CZ:'+420', DK:'+45', DJ:'+253', DM:'+1767', DO:'+1809', CD:'+243', EC:'+593', EG:'+20', SV:'+503', GQ:'+240', ER:'+291', EE:'+372', SZ:'+268', ET:'+251', FK:'+500', FO:'+298', FJ:'+679', FI:'+358', FR:'+33', GF:'+594', PF:'+689', TF:'+262', GA:'+241', GM:'+220', GE:'+995', DE:'+49', GH:'+233', GI:'+350', GR:'+30', GL:'+299', GD:'+1473', GP:'+590', GU:'+1671', GT:'+502', GG:'+44', GN:'+224', GW:'+245', GY:'+592', HT:'+509', HM:'+672', HN:'+504', HK:'+852', HU:'+36', IS:'+354', IN:'+91', ID:'+62', IR:'+98', IQ:'+964', IE:'+353', IM:'+44', IL:'+972', IT:'+39', JM:'+1876', JP:'+81', JE:'+44', JO:'+962', KZ:'+7', KE:'+254', KI:'+686', KW:'+965', KG:'+996', LA:'+856', LV:'+371', LB:'+961', LS:'+266', LR:'+231', LY:'+218', LI:'+423', LT:'+370', LU:'+352', MO:'+853', MG:'+261', MW:'+265', MY:'+60', MV:'+960', ML:'+223', MT:'+356', MH:'+692', MQ:'+596', MR:'+222', MU:'+230', YT:'+262', MX:'+52', FM:'+691', MD:'+373', MC:'+377', MN:'+976', ME:'+382', MS:'+1664', MA:'+212', MZ:'+258', MM:'+95', NA:'+264', NR:'+674', NP:'+977', NL:'+31', NC:'+687', NZ:'+64', NI:'+505', NE:'+227', NG:'+234', NU:'+683', NF:'+672', KP:'+850', MK:'+389', MP:'+1670', NO:'+47', OM:'+968', PK:'+92', PW:'+680', PS:'+970', PA:'+507', PG:'+675', PY:'+595', PE:'+51', PH:'+63', PN:'+64', PL:'+48', PT:'+351', PR:'+1787', QA:'+974', CG:'+242', RE:'+262', RO:'+40', RU:'+7', RW:'+250', BL:'+590', SH:'+290', KN:'+1869', LC:'+1758', MF:'+590', PM:'+508', VC:'+1784', WS:'+685', SM:'+378', ST:'+239', SA:'+966', SN:'+221', RS:'+381', SC:'+248', SL:'+232', SG:'+65', SX:'+1721', SK:'+421', SI:'+386', SB:'+677', SO:'+252', ZA:'+27', GS:'+500', KR:'+82', SS:'+211', ES:'+34', LK:'+94', SD:'+249', SR:'+597', SJ:'+47', SE:'+46', CH:'+41', SY:'+963', TW:'+886', TJ:'+992', TZ:'+255', TH:'+66', TL:'+670', TG:'+228', TK:'+690', TO:'+676', TT:'+1868', TN:'+216', TR:'+90', TM:'+993', TC:'+1649', TV:'+688', UM:'+1', VI:'+1340', UG:'+256', UA:'+380', AE:'+971', GB:'+44', US:'+1', UY:'+598', UZ:'+998', VU:'+678', VA:'+379', VE:'+58', VN:'+84', WF:'+681', EH:'+212', YE:'+967', ZM:'+260', ZW:'+263'
};
const dialCode = (iso: string) => DIAL_CODES[iso] ?? '';


const SECTIONS = [
  { title: 'ACCOUNT INFORMATION', rows: [{ label: 'Account ID', action: 'account' as Action }, { label: 'Phone Number', action: 'phone' as Action }, { label: 'Email Address', action: 'email' as Action }] },
  { title: 'LOGIN & SECURITY', rows: [{ label: 'Login Password', action: 'password' as Action }, { label: 'Account Verification', action: 'verification' as Action }, { label: 'Login Devices', action: 'devices' as Action }] },
  { title: 'CONNECTED ACCOUNTS', rows: [{ label: 'Linked Accounts', action: 'linked' as Action }] },
  { title: 'ACCOUNT MANAGEMENT', rows: [{ label: 'Deactivate or Delete Account', action: 'delete' as Action }] },
];

export default function AccountSecurityScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [action, setAction] = useState<Action>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [identities, setIdentities] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [phoneCountryIso, setPhoneCountryIso] = useState('HT');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneTarget, setPhoneTarget] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpRequested, setPhoneOtpRequested] = useState(false);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error('Please sign in again to manage account security.');
      const { data: profile } = await supabase.from('profiles')
        .select('email, phone_number')
        .eq('id', user.id)
        .maybeSingle();
      setUserId(user.id);
      setEmail(user.email ?? profile?.email ?? '');
      setPhone(profile?.phone_number ?? user.phone ?? user.user_metadata?.phone_number ?? '');
      setPhoneCountryIso(String(user.user_metadata?.phone_country_iso ?? 'HT'));
      setEmailVerified(Boolean(user.email_confirmed_at));
      setPhoneVerified(Boolean(user.phone_confirmed_at));
      setIdentities((user.identities ?? []).map(identity => identity.provider).filter(Boolean));
    } catch (error) {
      Alert.alert('Unable to load account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccount(); }, [loadAccount]);

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setAction(null);
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
    setNewPhone('');
    setPhoneTarget('');
    setCountryPickerOpen(false);
    setCountrySearch('');
    setPhoneOtp('');
    setPhoneOtpRequested(false);
  };

  const savePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters for your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same new password in both fields.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Password updated', 'Your login password has been changed.');
      closeModal(true);
    } catch (error) {
      Alert.alert('Could not update password', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveEmail = async () => {
    const value = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    setSaving(true);
    try {
      const { data: quota, error: quotaError } = await supabase.rpc('request_account_security_action', { p_request_type: 'email_verification' });
      if (quotaError) throw quotaError;
      if (quota?.allowed !== true) throw new Error('You have reached the limit of 5 email verification requests in 24 hours. Please try again later.');
      const { error } = await supabase.auth.updateUser({ email: value });
      if (error) throw error;
      Alert.alert('Check your inbox', 'Supabase has been asked to send a confirmation link. Your account email changes after you confirm it.');
      closeModal(true);
    } catch (error) {
      Alert.alert('Could not update email', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const requestPhoneChange = async () => {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) { Alert.alert('Check your phone number', 'Enter a valid phone number with at least 7 digits.'); return; }
    const value = dialCode(phoneCountryIso) + digits;
    setSaving(true);
    try {
      const { data: quota, error: quotaError } = await supabase.rpc('request_account_security_action', { p_request_type: 'phone_change' });
      if (quotaError) throw quotaError;
      if (quota?.allowed !== true) throw new Error('You have reached the limit of 3 phone verification requests in 24 hours. Please try again later.');
      const { error } = await supabase.auth.updateUser({ phone: value }); if (error) throw error;
      setPhoneTarget(value); setPhoneOtpRequested(true);
      Alert.alert('Verification code sent', 'Enter the SMS code to verify your new phone number.');
    } catch (error) { Alert.alert('Could not send code', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setSaving(false); }
  };

  const verifyPhoneChange = async () => {
    if (!/^\d{6}$/.test(phoneOtp.trim())) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from the SMS.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: phoneTarget, token: phoneOtp.trim(), type: 'phone_change' });
      if (error) throw error;
      const { data: current } = await supabase.auth.getUser();
      if (current.user) { const { error: profileError } = await supabase.from('profiles').update({ phone_number: phoneTarget }).eq('id', current.user.id); if (profileError) throw profileError; }
      await loadAccount();
      Alert.alert('Phone verified', 'Your phone number has been updated.');
      closeModal(true);
    } catch (error) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openRow = (next: Action) => { setAction(next); };

  const signOutOtherDevices = async () => {
    Alert.alert('Sign out other devices?', 'This will end your other active sessions. This device will stay signed in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out other devices', style: 'destructive', onPress: () => {
        void (async () => {
          setSaving(true);
          try {
            const { error } = await supabase.auth.signOut({ scope: 'others' });
            if (error) throw error;
            Alert.alert('Done', 'Other sessions have been signed out where supported by your authentication provider.');
          } catch (error) {
            Alert.alert('Could not sign out other devices', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setSaving(false);
          }
        })();
      } },
    ]);
  };

  const rowValue = (label: string) => {
    if (loading) return 'Loading…';
    if (label === 'Account ID') return userId ? userId.slice(0, 8) + '…' : 'Unavailable';
    if (label === 'Phone Number') return phone || 'Add phone number';
    if (label === 'Email Address') return email || 'Add email address';
    if (label === 'Login Password') return 'Change password';
    if (label === 'Account Verification') return emailVerified ? 'Email verified' : 'Verification needed';
    if (label === 'Login Devices') return 'Manage sessions';
    if (label === 'Linked Accounts') return identities.length ? identities.join(', ') : 'No linked accounts';
    return '';
  };

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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.rows.map((row, rowIndex) => (
                <Pressable key={row.label} onPress={() => row.label === 'Login Devices' ? signOutOtherDevices() : openRow(row.action)} style={[styles.row, rowIndex < section.rows.length - 1 && styles.rowDivider]} accessibilityRole="button">
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    {row.label !== 'Deactivate or Delete Account' && <Text style={styles.rowValue} numberOfLines={1}>{rowValue(row.label)}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#B8B4BD" />
                </Pressable>
              ))}
            </View>
          </React.Fragment>
        ))}
        <Text style={styles.note}>Never share your password or verification codes with anyone.</Text>
      </ScrollView>

      <Modal visible={action !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetPosition}>
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{action === 'password' ? 'Change password' : action === 'email' ? 'Email address' : action === 'phone' ? 'Phone number' : action === 'verification' ? 'Account verification' : action === 'devices' ? 'Login devices' : action === 'linked' ? 'Linked accounts' : action === 'delete' ? 'Account deletion' : 'Account details'}</Text>
                <Pressable onPress={closeModal} hitSlop={10}><Ionicons name="close" size={22} color={MUTED} /></Pressable>
              </View>

              {action === 'password' && <>
                <Text style={styles.helper}>Use at least 8 characters. A strong, unique password helps protect your account.</Text>
                <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New password" placeholderTextColor="#A6A1AB" secureTextEntry autoCapitalize="none" style={styles.input} />
                <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor="#A6A1AB" secureTextEntry autoCapitalize="none" style={styles.input} />
                <Pressable disabled={saving} onPress={savePassword} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Updating…' : 'Update password'}</Text></Pressable>
              </>}

              {action === 'email' && <>
                <Text style={styles.helper}>Current email: {email || 'Not set'}{emailVerified ? ' · verified' : ' · not verified'}</Text>
                <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="New email address" placeholderTextColor="#A6A1AB" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.input} />
                <Pressable disabled={saving} onPress={saveEmail} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Sending…' : 'Send confirmation link'}</Text></Pressable>
              </>}

              {action === 'phone' && <>
                <Text style={styles.helper}>Current phone: {phone || 'Not set'}{phoneVerified ? ' · verified' : ' · not verified'}. Choose your country and enter your number.</Text>
                <View style={styles.phoneRow}><Pressable disabled={phoneOtpRequested} onPress={() => setCountryPickerOpen(true)} style={styles.countryCodeButton}><Text style={styles.countryCodeText}>{COUNTRIES.find(c => c.code === phoneCountryIso)?.flag ?? '🌐'} {dialCode(phoneCountryIso)} ▾</Text></Pressable><TextInput value={newPhone} onChangeText={setNewPhone} placeholder="Phone number" placeholderTextColor="#A6A1AB" keyboardType="phone-pad" style={[styles.input, styles.phoneInput]} editable={!phoneOtpRequested} /></View>
                {phoneOtpRequested && <TextInput value={phoneOtp} onChangeText={setPhoneOtp} placeholder="6-digit SMS code" placeholderTextColor="#A6A1AB" keyboardType="number-pad" maxLength={6} style={styles.input} />}
                <Pressable disabled={saving} onPress={phoneOtpRequested ? verifyPhoneChange : requestPhoneChange} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Please wait…' : phoneOtpRequested ? 'Verify phone number' : 'Send verification code'}</Text></Pressable>
              </>}

              {action === 'verification' && <>
                <View style={styles.verificationInfo}><View style={styles.verificationRow}><Text style={styles.verificationLabel}>Email address</Text><Text style={styles.verificationValue}>{email || 'Not set'}</Text><Text style={[styles.statusPill, emailVerified ? styles.verified : styles.unverified]}>{emailVerified ? 'Verified' : 'Not verified'}</Text></View><View style={styles.verificationRow}><Text style={styles.verificationLabel}>Phone number</Text><Text style={styles.verificationValue}>{phone || 'Not set'}</Text><Text style={[styles.statusPill, phoneVerified ? styles.verified : styles.unverified]}>{phoneVerified ? 'Verified' : 'Not verified'}</Text></View></View>
                {!emailVerified && email.length > 0 && <Pressable disabled={saving} onPress={async () => { setSaving(true); try { const { data: quota, error: quotaError } = await supabase.rpc('request_account_security_action', { p_request_type: 'email_verification' }); if (quotaError) throw quotaError; if (quota?.allowed !== true) throw new Error('You have reached the limit of 5 email verification requests in 24 hours. Please try again later.'); const { error } = await supabase.auth.resend({ type: 'signup', email }); if (error) throw error; Alert.alert('Verification email sent', 'Check your inbox and spam folder.'); } catch (error) { Alert.alert('Could not send email', error instanceof Error ? error.message : 'Please try again.'); } finally { setSaving(false); } }} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Sending…' : 'Resend verification email'}</Text></Pressable>}
                {!phoneVerified && <Pressable onPress={() => setAction('phone')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Verify phone number</Text></Pressable>}
              </>}

              {action === 'devices' && <>
                <Text style={styles.helper}>For security, this action signs out your other active sessions where supported. Your current device remains signed in.</Text>
                <Pressable onPress={signOutOtherDevices} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Sign out other devices</Text></Pressable>
              </>}

              {action === 'linked' && <>
                <Text style={styles.helper}>{identities.length ? 'Authentication providers currently associated with this account:' : 'No linked sign-in providers were returned for this account.'}</Text>
                {identities.map(identity => <View key={identity} style={styles.identityRow}><Text style={styles.rowLabel}>{identity}</Text><Text style={styles.rowValue}>Connected</Text></View>)}
                <Text style={styles.smallNote}>Only sign-in providers currently connected to this Wantiss account are listed here. Available providers depend on your account setup.</Text>
              </>}

              {action === 'account' && <>
                <Text style={styles.helper}>Account ID</Text>
                <Text selectable style={styles.accountId}>{userId || 'Unavailable'}</Text>
              </>}

              {action === 'delete' && <>
                <Text style={styles.helper}>You can submit a request to permanently delete your Wantiss account. Our team reviews deletion requests to protect your account and handle records that may need to be retained by law.</Text>
                <Pressable disabled={saving} onPress={() => Alert.alert('Request account deletion?', 'We will submit a secure deletion request for review. Some payment or legal records may need to be retained where required. Your account will remain active until the request is processed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Submit request', style: 'destructive', onPress: () => { void (async () => { setSaving(true); try { const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError) throw userError; if (!user) throw new Error('Please sign in again.'); const { data: existing, error: checkError } = await supabase.from('account_deletion_requests').select('id').eq('user_id', user.id).in('status', ['requested','under_review']).maybeSingle(); if (checkError) throw checkError; if (existing) { Alert.alert('Request already submitted', 'Your account deletion request is already awaiting review.'); setAction(null); return; } const { error } = await supabase.from('account_deletion_requests').insert({ user_id: user.id, email: user.email ?? '' }); if (error) throw error; Alert.alert('Request submitted', 'Your account deletion request has been recorded. Our team will review it and contact you at your account email if further verification is needed.'); setAction(null); } catch (error) { Alert.alert('Could not submit request', error instanceof Error ? error.message : 'Please try again.'); } finally { setSaving(false); } })(); } }])} style={[styles.primaryButton, styles.dangerButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Submitting…' : 'Request account deletion'}</Text></Pressable>
              </>}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <Modal visible={countryPickerOpen} transparent animationType="slide" onRequestClose={() => setCountryPickerOpen(false)}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setCountryPickerOpen(false)} /><View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18), maxHeight: '72%' }]}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Choose country code</Text><Pressable onPress={() => setCountryPickerOpen(false)}><Ionicons name="close" size={22} color={MUTED} /></Pressable></View><TextInput value={countrySearch} onChangeText={setCountrySearch} placeholder="Search country" placeholderTextColor="#A6A1AB" style={styles.input} /><ScrollView keyboardShouldPersistTaps="handled">{COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.trim().toLowerCase())).map(c => <Pressable key={c.code} onPress={() => { setPhoneCountryIso(c.code); setCountryPickerOpen(false); setCountrySearch(''); }} style={styles.countryOption}><Text style={styles.countryOptionName}>{c.flag}  {c.name}</Text><Text style={styles.countryOptionCode}>{dialCode(c.code)}</Text></Pressable>)}</ScrollView></View></View></Modal>
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
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCopy: { flex: 1, paddingRight: 12, gap: 3 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F0F2' },
  rowLabel: { color: '#262626', fontSize: 15, lineHeight: 21, fontWeight: '400' },
  rowValue: { color: MUTED, fontSize: 12, lineHeight: 17, fontWeight: '400' },
  sectionStripe: { height: 10, width: '100%', backgroundColor: PINK },
  note: { marginHorizontal: 18, marginTop: 12, color: MUTED, fontSize: 12, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(30,27,58,0.28)', justifyContent: 'flex-end' },
  sheetPosition: { width: '100%' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E1E7', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: INK, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  helper: { color: MUTED, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#EAE5EB', borderRadius: 10, paddingHorizontal: 13, color: INK, fontSize: 15, marginBottom: 10, backgroundColor: '#FFFFFF' },
  primaryButton: { minHeight: 48, borderRadius: 10, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  disabledButton: { opacity: 0.55 },
  secondaryButton: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: PINK, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryButtonText: { color: INK, fontSize: 14, fontWeight: '600' },
  smallNote: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 14 },
  accountId: { color: INK, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  identityRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F0F2' },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' }, countryCodeButton: { minHeight: 48, paddingHorizontal: 10, borderWidth: 1, borderColor: '#EAE5EB', borderRadius: 10, justifyContent: 'center' }, countryCodeText: { fontSize: 13, color: INK, fontWeight: '600' }, phoneInput: { flex: 1 }, countryOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F0F2' }, countryOptionName: { fontSize: 14, color: INK }, countryOptionCode: { fontSize: 13, color: MUTED }, dangerButton: { backgroundColor: '#B3261E' },
});
