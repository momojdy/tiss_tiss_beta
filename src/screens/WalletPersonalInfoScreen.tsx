import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const LINE = '#D3DECB';
const TINT = '#DCE8D2';

type Props = { onBack?: () => void };

export default function WalletPersonalInfoScreen({ onBack }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [initialName, setInitialName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user || !active) return;
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
        const name = profile?.full_name ?? user.user_metadata?.full_name ?? '';
        const userEmail = profile?.email ?? user.email ?? '';
        if (active) {
          setFullName(name);
          setInitialName(name);
          setEmail(userEmail);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const save = async () => {
    const name = fullName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
      if (error) throw error;
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (authError) throw authError;
      setInitialName(name);
      Alert.alert('Saved', 'Your personal information has been updated.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = fullName.trim() !== initialName.trim();

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton} accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Personal info</Text>
      </View>
      <View style={styles.strip} />

      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName.trim() ? fullName.trim().slice(0, 2).toUpperCase() : '••'}</Text>
        </View>
        <Text style={styles.heading}>Your personal information</Text>
        <Text style={styles.subheading}>Keep your account details up to date.</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={MUTED}
            style={styles.input}
            editable={!loading && !saving}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText} numberOfLines={1}>{email || 'Email not available'}</Text>
            <MaterialIcons name="lock-outline" size={19} color={MUTED} />
          </View>
          <Text style={styles.helper}>Your email is managed by your Wantiss account.</Text>
        </View>

        <Pressable onPress={save} disabled={!dirty || saving || loading} style={[styles.saveButton, (!dirty || saving || loading) && styles.saveButtonDisabled]}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 100, paddingHorizontal: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: BACKGROUND },
  headerButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { marginLeft: 12, paddingBottom: 1, color: TEXT, fontSize: 19, lineHeight: 23, fontFamily: 'Manrope_800ExtraBold' },
  strip: { height: 20, backgroundColor: '#E6EDE1' },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 20 },
  avatarText: { color: TEXT, fontSize: 23, fontFamily: 'Manrope_800ExtraBold' },
  heading: { color: TEXT, fontSize: 18, fontFamily: 'Manrope_800ExtraBold', marginBottom: 5 },
  subheading: { color: MUTED, fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular', marginBottom: 24 },
  fieldGroup: { marginBottom: 20 },
  label: { color: MUTED, fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 7 },
  input: { height: 50, borderWidth: 1, borderColor: LINE, borderRadius: 13, paddingHorizontal: 14, color: TEXT, backgroundColor: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_400Regular' },
  readOnlyInput: { height: 50, borderWidth: 1, borderColor: LINE, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6EDE1' },
  readOnlyText: { flex: 1, color: TEXT, fontSize: 15, fontFamily: 'Inter_400Regular' },
  helper: { color: MUTED, fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular', marginTop: 7 },
  saveButton: { height: 50, borderRadius: 999, backgroundColor: TEXT, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveButtonDisabled: { opacity: 0.45 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});