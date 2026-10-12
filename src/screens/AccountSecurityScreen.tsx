import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

type Props = { onBack: () => void };
type Action = 'password' | 'email' | 'phone' | 'verification' | 'devices' | 'linked' | 'account' | 'delete' | null;

const INK = '#1E1B3A';
const MUTED = '#8D8997';
const PINK = '#FCE4F1';

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

  const closeModal = () => {
    if (saving) return;
    setAction(null);
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
    setNewPhone('');
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
      closeModal();
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
      const { error } = await supabase.auth.updateUser({ email: value });
      if (error) throw error;
      Alert.alert('Check your inbox', 'Supabase has been asked to send a confirmation link. Your account email changes after you confirm it.');
      closeModal();
    } catch (error) {
      Alert.alert('Could not update email', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const requestPhoneChange = async () => {
    const value = newPhone.trim();
    if (value.replace(/\D/g, '').length < 7) {
      Alert.alert('Check your phone number', 'Enter a complete phone number with its country code, for example +509XXXXXXXX.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: value });
      if (error) throw error;
      setPhoneOtpRequested(true);
      Alert.alert('Verification code sent', 'Enter the SMS code to verify your new phone number.');
    } catch (error) {
      Alert.alert('Could not send code', error instanceof Error ? error.message : 'Check that phone authentication is enabled.');
    } finally {
      setSaving(false);
    }
  };

  const verifyPhoneChange = async () => {
    if (!/^\d{6}$/.test(phoneOtp.trim())) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from the SMS.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: newPhone.trim(), token: phoneOtp.trim(), type: 'phone_change' });
      if (error) throw error;
      await loadAccount();
      Alert.alert('Phone verified', 'Your phone number has been updated.');
      closeModal();
    } catch (error) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openRow = (next: Action) => {
    if (next === 'account') {
      if (userId && !loading) {
        Alert.alert('Account details', 'Your account ID is shown below.', [
          { text: 'OK' },
        ]);
      } else {
        setAction(next);
      }
      return;
    }
    setAction(next);
  };

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
                <Text style={styles.helper}>Current phone: {phone || 'Not set'}{phoneVerified ? ' · verified' : ' · not verified'}. Include your country code.</Text>
                <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="+509…" placeholderTextColor="#A6A1AB" keyboardType="phone-pad" style={styles.input} editable={!phoneOtpRequested} />
                {phoneOtpRequested && <TextInput value={phoneOtp} onChangeText={setPhoneOtp} placeholder="6-digit SMS code" placeholderTextColor="#A6A1AB" keyboardType="number-pad" maxLength={6} style={styles.input} />}
                <Pressable disabled={saving} onPress={phoneOtpRequested ? verifyPhoneChange : requestPhoneChange} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Please wait…' : phoneOtpRequested ? 'Verify phone number' : 'Send verification code'}</Text></Pressable>
              </>}

              {action === 'verification' && <>
                <Text style={styles.helper}>Email: {email || 'Not set'}\nStatus: {emailVerified ? 'Verified' : 'Not verified'}\nPhone: {phone || 'Not set'}\nStatus: {phoneVerified ? 'Verified' : 'Not verified'}</Text>
                {!emailVerified && email.length > 0 && <Pressable disabled={saving} onPress={async () => { setSaving(true); try { const { error } = await supabase.auth.resend({ type: 'signup', email }); if (error) throw error; Alert.alert('Verification email sent', 'Check your inbox and spam folder.'); } catch (error) { Alert.alert('Could not send email', error instanceof Error ? error.message : 'Please try again.'); } finally { setSaving(false); } }} style={[styles.primaryButton, saving && styles.disabledButton]}><Text style={styles.primaryButtonText}>{saving ? 'Sending…' : 'Resend verification email'}</Text></Pressable>}
                {!phoneVerified && <Pressable onPress={() => setAction('phone')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Verify phone number</Text></Pressable>}
              </>}

              {action === 'devices' && <>
                <Text style={styles.helper}>For security, this action signs out your other active sessions where supported. Your current device remains signed in.</Text>
                <Pressable onPress={signOutOtherDevices} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Sign out other devices</Text></Pressable>
              </>}

              {action === 'linked' && <>
                <Text style={styles.helper}>{identities.length ? 'Authentication providers currently associated with this account:' : 'No linked sign-in providers were returned for this account.'}</Text>
                {identities.map(identity => <View key={identity} style={styles.identityRow}><Text style={styles.rowLabel}>{identity}</Text><Text style={styles.rowValue}>Connected</Text></View>)}
                <Text style={styles.smallNote}>Linking or unlinking providers is not enabled here yet. We do not show unconfigured social sign-in options.</Text>
              </>}

              {action === 'account' && <>
                <Text style={styles.helper}>Account ID</Text>
                <Text selectable style={styles.accountId}>{userId || 'Unavailable'}</Text>
              </>}

              {action === 'delete' && <>
                <Text style={styles.helper}>Account deactivation and deletion need a secure server-side process to remove or disable your account safely.</Text>
                <Text style={styles.smallNote}>This action is not enabled yet. Your account and data have not been changed.</Text>
              </>}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
});
