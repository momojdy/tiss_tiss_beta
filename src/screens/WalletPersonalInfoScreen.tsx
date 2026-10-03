import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const TINT = '#DCE8D2';
const SOFT = '#E6EDE1';

const COUNTRY_CODES = [
  ['🇵🇭', 'Philippines', '+63'], ['🇺🇸', 'United States', '+1'], ['🇨🇦', 'Canada', '+1'], ['🇬🇧', 'United Kingdom', '+44'],
  ['🇦🇺', 'Australia', '+61'], ['🇳🇿', 'New Zealand', '+64'], ['🇸🇬', 'Singapore', '+65'], ['🇯🇵', 'Japan', '+81'],
  ['🇰🇷', 'South Korea', '+82'], ['🇨🇳', 'China', '+86'], ['🇭🇰', 'Hong Kong', '+852'], ['🇮🇳', 'India', '+91'],
  ['🇩🇪', 'Germany', '+49'], ['🇫🇷', 'France', '+33'], ['🇮🇹', 'Italy', '+39'], ['🇪🇸', 'Spain', '+34'],
  ['🇦🇪', 'United Arab Emirates', '+971'], ['🇸🇦', 'Saudi Arabia', '+966'], ['🇹🇭', 'Thailand', '+66'], ['🇲🇾', 'Malaysia', '+60'],
  ['🇮🇩', 'Indonesia', '+62'], ['🇻🇳', 'Vietnam', '+84'], ['🇧🇷', 'Brazil', '+55'], ['🇲🇽', 'Mexico', '+52'],
  ['🇿🇦', 'South Africa', '+27'], ['🇳🇬', 'Nigeria', '+234'], ['🇪🇬', 'Egypt', '+20'], ['🇹🇷', 'Türkiye', '+90'],
  ['🇳🇱', 'Netherlands', '+31'], ['🇸🇪', 'Sweden', '+46'], ['🇨🇭', 'Switzerland', '+41'], ['🇵🇱', 'Poland', '+48'],
] as const;

type Props = { onBack?: () => void };

export default function WalletPersonalInfoScreen({ onBack }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+63');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialName, setInitialName] = useState('');
  const [initialPhone, setInitialPhone] = useState('');
  const [initialCountryCode, setInitialCountryCode] = useState('+63');
  const [initialAvatar, setInitialAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user || !active) return;
        const { data: profile } = await supabase.from('profiles')
          .select('full_name, email, phone_number, avatar_url')
          .eq('id', user.id).maybeSingle();
        const name = profile?.full_name ?? user.user_metadata?.full_name ?? '';
        const phone = profile?.phone_number ?? user.user_metadata?.phone_number ?? '';
        const storedCode = user.user_metadata?.phone_country_code ?? '+63';
        const avatar = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;
        const userEmail = profile?.email ?? user.email ?? '';
        if (active) {
          setFullName(name); setInitialName(name);
          setPhoneNumber(phone); setInitialPhone(phone);
          setCountryCode(storedCode); setInitialCountryCode(storedCode);
          setAvatarUrl(avatar); setInitialAvatar(avatar);
          setEmail(userEmail);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.mimeType?.split('/')[1] || 'jpg';
      const path = user.id + '/avatar.' + ext;
      const { error: uploadError } = await supabase.storage.from('wallet-avatars')
        .upload(path, blob, { contentType: asset.mimeType || 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('wallet-avatars').getPublicUrl(path);
      const url = publicData.publicUrl + '?v=' + Date.now();
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (error) throw error;
      const { error: authError } = await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (authError) throw authError;
      setAvatarUrl(url); setInitialAvatar(url);
    } catch (error) {
      Alert.alert('Could not update photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    const name = fullName.trim();
    const phone = phoneNumber.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ full_name: name, phone_number: phone ? countryCode + ' ' + phone : '' }).eq('id', user.id);
      if (error) throw error;
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name, phone_number: phone ? countryCode + ' ' + phone : '', phone_country_code: countryCode } });
      if (authError) throw authError;
      setInitialName(name); setInitialPhone(phone); setInitialCountryCode(countryCode);
      Alert.alert('Saved', 'Your personal information has been updated.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = fullName.trim() !== initialName.trim() || phoneNumber.trim() !== initialPhone.trim() || countryCode !== initialCountryCode || avatarUrl !== initialAvatar;
  const selectedCountry = COUNTRY_CODES.find(([, , code]) => code === countryCode) ?? COUNTRY_CODES[0];

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton} accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Personal info</Text>
      </View>

      <View style={styles.content}>
        <Pressable onPress={choosePhoto} disabled={loading || saving} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel="Change profile photo">
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={38} color={TEXT} />
            </View>
          )}
          <View style={styles.camera}>
            <MaterialCommunityIcons name="camera-outline" size={16} color={TEXT} />
          </View>
        </Pressable>
        <Text style={styles.photoAction}>{avatarUrl ? 'Change profile photo' : 'Add profile photo'}</Text>
        <Text style={styles.pageIntro}>Personal details</Text>
        <Text style={styles.pageHint}>Keep your information up to date for your Wantiss wallet.</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor={MUTED} style={styles.input} editable={!loading && !saving} autoCapitalize="words" autoCorrect={false} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone number</Text>
          <View style={styles.phoneRow}>
            <Pressable onPress={() => setCountryPickerOpen(true)} disabled={loading || saving} style={styles.countryCodeButton}>
              <Text style={styles.countryFlag}>{selectedCountry[0]}</Text><Text style={styles.countryCode}>{countryCode}</Text><MaterialCommunityIcons name="chevron-down" size={18} color={MUTED} />
            </Pressable>
            <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Phone number" placeholderTextColor={MUTED} style={styles.phoneInput} editable={!loading && !saving} keyboardType="phone-pad" />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText} numberOfLines={1}>{email || 'Email not available'}</Text>
            <MaterialIcons name="lock-outline" size={18} color={MUTED} />
          </View>
        </View>

        <Pressable onPress={save} disabled={!dirty || saving || loading} style={[styles.saveButton, (!dirty || saving || loading) && styles.saveButtonDisabled]}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </View>
      <Modal visible={countryPickerOpen} transparent animationType="slide" onRequestClose={() => setCountryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}>
          <Pressable style={styles.countrySheet} onPress={() => {}}>
            <Text style={styles.countryTitle}>Country code</Text>
            <ScrollView style={styles.countryList} nestedScrollEnabled>
              {COUNTRY_CODES.map(([flag, name, code]) => (
                <Pressable key={name} style={styles.countryRow} onPress={() => { setCountryCode(code); setCountryPickerOpen(false); }}>
                  <Text style={styles.countryFlag}>{flag}</Text><Text style={styles.countryName}>{name}</Text><Text style={styles.countryCode}>{code}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: { height: 100, paddingHorizontal: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: BACKGROUND },
  headerButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { marginLeft: 12, paddingBottom: 1, color: TEXT, fontSize: 19, lineHeight: 23, fontFamily: 'Manrope_800ExtraBold' },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  avatarWrap: { width: 92, height: 92, marginBottom: 7 },
  avatarImage: { width: 92, height: 92, borderRadius: 46 },
  avatarPlaceholder: { width: 92, height: 92, borderRadius: 46, backgroundColor: SOFT, alignItems: 'center', justifyContent: 'center' },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  photoAction: { color: TEXT, fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 22 },
  pageIntro: { color: TEXT, fontSize: 18, fontFamily: 'Manrope_800ExtraBold', marginBottom: 4 },
  pageHint: { color: MUTED, fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginBottom: 22 },
  fieldGroup: { marginBottom: 16 },
  label: { color: MUTED, fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 5 },
  input: { height: 50, paddingHorizontal: 14, borderRadius: 14, color: TEXT, backgroundColor: TINT, fontSize: 15, fontFamily: 'Inter_400Regular' },
  phoneRow: { height: 50, flexDirection: 'row', gap: 6 },
  countryCodeButton: { width: 104, height: 50, paddingHorizontal: 10, borderRadius: 14, backgroundColor: TINT, flexDirection: 'row', alignItems: 'center', gap: 5 },
  phoneInput: { flex: 1, height: 50, paddingHorizontal: 14, borderRadius: 14, color: TEXT, backgroundColor: TINT, fontSize: 15, fontFamily: 'Inter_400Regular' },
  countryFlag: { fontSize: 20 },
  countryCode: { color: TEXT, fontSize: 14, fontFamily: 'Inter_500Medium' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.22)' },
  countrySheet: { maxHeight: '72%', backgroundColor: BACKGROUND, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 16, paddingBottom: 28 },
  countryTitle: { color: TEXT, fontSize: 18, fontFamily: 'Manrope_800ExtraBold', marginBottom: 12 },
  countryList: { backgroundColor: TINT, borderRadius: 16 },
  countryRow: { minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryName: { flex: 1, color: TEXT, fontSize: 15, fontFamily: 'Inter_400Regular' },
  readOnlyInput: { height: 50, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: SOFT },
  readOnlyText: { flex: 1, color: TEXT, fontSize: 16, fontFamily: 'Inter_400Regular' },
  saveButton: { height: 50, borderRadius: 999, backgroundColor: TEXT, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.45 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});