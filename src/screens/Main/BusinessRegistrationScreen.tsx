import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

type Props = { onBack: () => void; onComplete: () => void };

export default function BusinessRegistrationScreen({ onBack, onComplete }: Props) {
  const [fullName, setFullName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [samePassword, setSamePassword] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sign in to your Buyer account first.');
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        const name = String(data?.full_name ?? user.user_metadata?.full_name ?? '').trim();
        if (active) { setFullName(name); setNeedsName(!name); }
      } catch (error) {
        if (active) Alert.alert('Unable to load account', error instanceof Error ? error.message : 'Try again.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const register = async () => {
    if (needsName && !fullName.trim()) { Alert.alert('Full name required', 'Enter your full name.'); return; }
    if (!samePassword && !password) { Alert.alert('Password required', 'Enter your Wantiss account password.'); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Your Buyer session has expired.');
      // Wantiss uses one identity: a different password cannot be created for the business mode.
      if (!samePassword) {
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (error) throw new Error('The password must match your existing Wantiss account.');
      }
      if (needsName) {
        const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
        if (error) throw error;
      }
      const { error: modeError } = await supabase.rpc('register_my_account_mode', { p_mode: 'business' });
      if (modeError) throw modeError;
      if (businessName.trim()) {
        const { error } = await supabase.rpc('submit_business_application', { p_business_name: businessName.trim() });
        if (error) { Alert.alert('Business registered', 'Business name could not be saved yet. You can complete it in Business Space.'); onComplete(); return; }
      }
      onComplete();
    } catch (error) { Alert.alert('Registration unsuccessful', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const field = { backgroundColor: '#FBE8EF', borderRadius: 13, minHeight: 54, paddingHorizontal: 16, color: '#392450', fontSize: 15 } as const;
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: '#FFF' }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 58, paddingBottom: 48 }}>
    <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Buyer" style={{ alignSelf: 'flex-start', paddingVertical: 12, paddingRight: 20 }}><Text style={{ fontSize: 25, color: '#BF008E', fontWeight: '300' }}>‹</Text></Pressable>
    <Text style={{ fontSize: 25, fontWeight: '400', color: '#29212D', marginTop: 24, marginBottom: 30 }}>Register B&P 2P</Text>
    {loading ? <ActivityIndicator color="#BF008E" /> : <>
      {needsName ? <View style={{ marginBottom: 18 }}><Text style={{ color: '#62566A', marginBottom: 8, fontSize: 13 }}>Full name</Text><TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" autoCapitalize="words" style={field} /></View> : null}
      <View style={{ marginBottom: 18 }}><Text style={{ color: '#62566A', marginBottom: 8, fontSize: 13 }}>Business name (optional)</Text><TextInput value={businessName} onChangeText={setBusinessName} placeholder="Business name" autoCapitalize="words" style={field} /></View>
      <Pressable onPress={() => setSamePassword(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: samePassword }} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, marginBottom: 12 }}>
        <View style={{ width: 21, height: 21, borderRadius: 5, borderWidth: 1.3, borderColor: samePassword ? '#BF008E' : '#A99BAA', alignItems: 'center', justifyContent: 'center', backgroundColor: samePassword ? '#BF008E' : 'transparent' }}>{samePassword ? <Text style={{ color: '#FFF', fontSize: 14 }}>✓</Text> : null}</View>
        <Text style={{ fontSize: 14, color: '#392450' }}>Use same password as Buyer account</Text>
      </Pressable>
      {!samePassword ? <View style={{ marginBottom: 20 }}><Text style={{ color: '#62566A', marginBottom: 8, fontSize: 13 }}>Confirm Wantiss password</Text><View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBE8EF', borderRadius: 13 }}><TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!showPassword} autoCapitalize="none" style={{ ...field, flex: 1 }} /><Pressable onPress={() => setShowPassword(v => !v)} style={{ padding: 12 }}><Text style={{ color: '#9D315B' }}>{showPassword ? 'Hide' : 'Show'}</Text></Pressable></View></View> : null}
      <Pressable disabled={busy} onPress={() => { void register(); }} style={{ backgroundColor: '#BF008E', paddingVertical: 17, borderRadius: 14, alignItems: 'center', marginTop: 24, opacity: busy ? 0.6 : 1 }}><Text style={{ color: '#FFF', fontSize: 15, fontWeight: '500' }}>{busy ? 'Registering…' : 'Register'}</Text></Pressable>
    </>}
  </ScrollView>;
}
