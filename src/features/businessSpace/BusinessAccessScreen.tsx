import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type Access = { approved: boolean; application_status: 'not_applied' | 'pending' | 'approved' | 'rejected' | 'restricted'; business_name?: string | null };

function message(error: unknown) {
  return error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error ?? 'Something went wrong.');
}

export default function BusinessAccessScreen({ onSwitchToBuyer, onSignOut, onApproved }: {
  onSwitchToBuyer: () => void;
  onSignOut: () => void;
  onApproved: () => void;
}) {
  const [businessName, setBusinessName] = useState('');
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setProblem('');
    try {
      const [{ data: result, error }, { data: userResult, error: userError }] = await Promise.all([
        supabase.rpc('get_my_business_access'),
        supabase.auth.getUser(),
      ]);
      if (error) throw error;
      if (userError) throw userError;
      const current = result as Access;
      setAccess(current);
      if (current?.business_name) setBusinessName(current.business_name);
      else if (userResult.user?.user_metadata?.business_name) setBusinessName(String(userResult.user.user_metadata.business_name));
      if (current?.approved) onApproved();
    } catch (error) {
      setProblem(message(error));
    } finally {
      setLoading(false);
    }
  }, [onApproved]);

  useEffect(() => { void refresh(); }, [refresh]);

  const submit = async () => {
    const name = businessName.trim();
    if (name.length < 2) {
      setProblem('Enter a business name with at least 2 characters.');
      return;
    }
    setSubmitting(true);
    setProblem('');
    setNotice('');
    try {
      const { error } = await supabase.rpc('submit_business_application', { p_business_name: name });
      if (error) throw error;
      setNotice('Your business application has been submitted. We’ll show its review status here.');
      await refresh();
    } catch (error) {
      setProblem(message(error));
    } finally {
      setSubmitting(false);
    }
  };

  const status = access?.application_status ?? 'not_applied';
  const statusCopy: Record<string, string> = {
    not_applied: 'Use your existing Wantiss account to apply for Business Space. You do not need a second account.',
    pending: 'Your application is waiting for review. You can keep using Buyer mode while you wait.',
    rejected: 'Your previous application was not approved. You can update the business details and submit again.',
    restricted: 'Business access is currently restricted. Contact Wantiss support if you believe this is a mistake.',
    approved: 'Your business access is approved.',
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.brand}><MaterialCommunityIcons name="storefront-outline" size={24} color={BLUE} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>WANTISS BUSINESS SPACE</Text>
          <Text style={styles.title}>Business access</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Switch to Buyer" onPress={onSwitchToBuyer} style={styles.iconButton}>
          <MaterialCommunityIcons name="swap-horizontal" size={22} color={BLUE} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={styles.iconButton}>
          <MaterialCommunityIcons name="logout" size={21} color={INK} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroIcon}><MaterialCommunityIcons name="store-check-outline" size={34} color={BLUE} /></View>
        <Text style={styles.heroTitle}>{status === 'pending' ? 'Application under review' : status === 'restricted' ? 'Access restricted' : status === 'rejected' ? 'Update your application' : 'Bring your business to Wantiss'}</Text>
        <Text style={styles.copy}>{statusCopy[status] ?? statusCopy.not_applied}</Text>
        {loading ? <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 24 }} /> : null}
        {!loading && status !== 'approved' && status !== 'restricted' ? <>
          <Text style={styles.label}>Business name</Text>
          <TextInput value={businessName} onChangeText={setBusinessName} placeholder="Enter your business name" placeholderTextColor={MUTED} autoCapitalize="words" returnKeyType="done" style={styles.input} accessibilityLabel="Business name" />
          <Pressable disabled={submitting} style={[styles.primaryButton, submitting && { opacity: 0.65 }]} onPress={submit}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{status === 'pending' ? 'Update application' : 'Submit business application'}</Text>}
          </Pressable>
        </> : null}
        {status === 'pending' ? <View style={styles.statusBox}><MaterialCommunityIcons name="clock-outline" size={20} color="#96650B" /><Text style={styles.statusText}>Pending review</Text></View> : null}
        {!!notice && <Text accessibilityRole="text" style={styles.notice}>{notice}</Text>}
        {!!problem && <Text accessibilityRole="alert" style={styles.error}>{problem}</Text>}
        <Pressable onPress={() => { setLoading(true); void refresh(); }} style={styles.secondaryButton}><Text style={styles.secondaryText}>Refresh status</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const BLUE = '#2D5BFF';
const INK = '#182033';
const MUTED = '#6F7890';
const LINE = '#E8ECF5';
const BG = '#F5F7FC';
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  header: { paddingTop: 12, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: LINE },
  brand: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF1FF', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', color: BLUE },
  title: { marginTop: 3, color: INK, fontSize: 18, fontWeight: '800' },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F3F5FA', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingBottom: 60, alignItems: 'stretch' },
  heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#E9EDFF', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 20, marginBottom: 18 },
  heroTitle: { fontSize: 25, fontWeight: '800', textAlign: 'center', color: INK },
  copy: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: MUTED, marginTop: 10, marginBottom: 26 },
  label: { fontSize: 13, fontWeight: '700', color: INK, marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: LINE, borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 15, color: INK, fontSize: 15 },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14, marginTop: 12, borderRadius: 14, backgroundColor: '#FFF2D7' },
  statusText: { color: '#96650B', fontSize: 13, fontWeight: '800' },
  notice: { marginTop: 12, color: '#16794B', fontSize: 13, lineHeight: 19 },
  error: { marginTop: 12, color: '#B42318', fontSize: 13, lineHeight: 19 },
  secondaryButton: { minHeight: 46, borderWidth: 1, borderColor: LINE, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secondaryText: { color: INK, fontSize: 13, fontWeight: '700' },
});
