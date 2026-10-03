import React, { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COUNTRIES } from './WalletSettingsScreen';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const TINT = '#DCE8D2';
const SOFT = '#E6EDE1';

const DIAL_CODES: Record<string, string> = {
AF:'+93', AX:'+358', AL:'+355', DZ:'+213', AS:'+1684', AD:'+376', AO:'+244', AI:'+1264', AQ:'+672', AG:'+1268', AR:'+54', AM:'+374', AW:'+297', AU:'+61', AT:'+43', AZ:'+994', BS:'+1242', BH:'+973', BD:'+880', BB:'+1246', BY:'+375', BE:'+32', BZ:'+501', BJ:'+229', BM:'+1441', BT:'+975', BO:'+591', BA:'+387', BW:'+267', BV:'+47', BR:'+55', IO:'+246', VG:'+1284', BN:'+673', BG:'+359', BF:'+226', BI:'+257', KH:'+855', CM:'+237', CA:'+1', CV:'+238', BQ:'+599', KY:'+1345', CF:'+236', TD:'+235', CL:'+56', CN:'+86', CX:'+61', CC:'+61', CO:'+57', KM:'+269', CK:'+682', CR:'+506', CI:'+225', HR:'+385', CU:'+53', CW:'+599', CY:'+357', CZ:'+420', DK:'+45', DJ:'+253', DM:'+1767', DO:'+1809', CD:'+243', EC:'+593', EG:'+20', SV:'+503', GQ:'+240', ER:'+291', EE:'+372', SZ:'+268', ET:'+251', FK:'+500', FO:'+298', FJ:'+679', FI:'+358', FR:'+33', GF:'+594', PF:'+689', TF:'+262', GA:'+241', GM:'+220', GE:'+995', DE:'+49', GH:'+233', GI:'+350', GR:'+30', GL:'+299', GD:'+1473', GP:'+590', GU:'+1671', GT:'+502', GG:'+44', GN:'+224', GW:'+245', GY:'+592', HT:'+509', HM:'+672', HN:'+504', HK:'+852', HU:'+36', IS:'+354', IN:'+91', ID:'+62', IR:'+98', IQ:'+964', IE:'+353', IM:'+44', IL:'+972', IT:'+39', JM:'+1876', JP:'+81', JE:'+44', JO:'+962', KZ:'+7', KE:'+254', KI:'+686', KW:'+965', KG:'+996', LA:'+856', LV:'+371', LB:'+961', LS:'+266', LR:'+231', LY:'+218', LI:'+423', LT:'+370', LU:'+352', MO:'+853', MG:'+261', MW:'+265', MY:'+60', MV:'+960', ML:'+223', MT:'+356', MH:'+692', MQ:'+596', MR:'+222', MU:'+230', YT:'+262', MX:'+52', FM:'+691', MD:'+373', MC:'+377', MN:'+976', ME:'+382', MS:'+1664', MA:'+212', MZ:'+258', MM:'+95', NA:'+264', NR:'+674', NP:'+977', NL:'+31', NC:'+687', NZ:'+64', NI:'+505', NE:'+227', NG:'+234', NU:'+683', NF:'+672', KP:'+850', MK:'+389', MP:'+1670', NO:'+47', OM:'+968', PK:'+92', PW:'+680', PS:'+970', PA:'+507', PG:'+675', PY:'+595', PE:'+51', PH:'+63', PN:'+64', PL:'+48', PT:'+351', PR:'+1787', QA:'+974', CG:'+242', RE:'+262', RO:'+40', RU:'+7', RW:'+250', BL:'+590', SH:'+290', KN:'+1869', LC:'+1758', MF:'+590', PM:'+508', VC:'+1784', WS:'+685', SM:'+378', ST:'+239', SA:'+966', SN:'+221', RS:'+381', SC:'+248', SL:'+232', SG:'+65', SX:'+1721', SK:'+421', SI:'+386', SB:'+677', SO:'+252', ZA:'+27', GS:'+500', KR:'+82', SS:'+211', ES:'+34', LK:'+94', SD:'+249', SR:'+597', SJ:'+47', SE:'+46', CH:'+41', SY:'+963', TW:'+886', TJ:'+992', TZ:'+255', TH:'+66', TL:'+670', TG:'+228', TK:'+690', TO:'+676', TT:'+1868', TN:'+216', TR:'+90', TM:'+993', TC:'+1649', TV:'+688', UM:'+1', VI:'+1340', UG:'+256', UA:'+380', AE:'+971', GB:'+44', US:'+1', UY:'+598', UZ:'+998', VU:'+678', VA:'+379', VE:'+58', VN:'+84', WF:'+681', EH:'+212', YE:'+967', ZM:'+260', ZW:'+263'
};
const getDialCode = (iso: string) => DIAL_CODES[iso] ?? '';



type Props = { onBack?: () => void };

export default function WalletPersonalInfoScreen({ onBack }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryIso, setCountryIso] = useState('PH');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialName, setInitialName] = useState('');
  const [initialPhone, setInitialPhone] = useState('');
  const [initialCountryIso, setInitialCountryIso] = useState('PH');
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
        const storedIso = user.user_metadata?.phone_country_iso ?? 'PH';
        const avatar = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;
        const userEmail = profile?.email ?? user.email ?? '';
        if (active) {
          setFullName(name); setInitialName(name);
          setPhoneNumber(phone); setInitialPhone(phone);
          setCountryIso(storedIso); setInitialCountryIso(storedIso);
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
      const dialCode = getDialCode(countryIso);
      const { error } = await supabase.from('profiles').update({ full_name: name, phone_number: phone ? dialCode + ' ' + phone : '' }).eq('id', user.id);
      if (error) throw error;
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name, phone_number: phone ? dialCode + ' ' + phone : '', phone_country_code: dialCode, phone_country_iso: countryIso } });
      if (authError) throw authError;
      setInitialName(name); setInitialPhone(phone); setInitialCountryIso(countryIso);
      Alert.alert('Saved', 'Your personal information has been updated.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = fullName.trim() !== initialName.trim() || phoneNumber.trim() !== initialPhone.trim() || countryIso !== initialCountryIso || avatarUrl !== initialAvatar;
  const selectedCountry = COUNTRIES.find(country => country.code === countryIso) ?? COUNTRIES.find(country => country.code === 'PH')!;
  const selectedDialCode = getDialCode(countryIso);

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

      <View style={styles.content} onTouchStart={() => Keyboard.dismiss()}>
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
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text><Text style={styles.countryCode}>{selectedDialCode}</Text><MaterialCommunityIcons name="chevron-down" size={18} color={MUTED} />
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
        <Pressable style={styles.countryScrim} onPress={() => { Keyboard.dismiss(); setCountryPickerOpen(false); }}>
          <Pressable style={styles.countrySheet} onPress={() => {}}>
            <View style={styles.countrySearchBox}>
              <MaterialIcons name="search" size={22} color={MUTED} />
              <TextInput value={countrySearch} onChangeText={setCountrySearch} placeholder="Search country" placeholderTextColor={MUTED} style={styles.countrySearchInput} autoCapitalize="none" autoCorrect={false} />
              {countrySearch.length > 0 && <Pressable onPress={() => setCountrySearch('')} hitSlop={8}><MaterialIcons name="close" size={20} color={MUTED} /></Pressable>}
            </View>
            <ScrollView style={styles.countryList} contentContainerStyle={styles.countryListContent} showsVerticalScrollIndicator nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {COUNTRIES.filter(country => country.name.toLowerCase().includes(countrySearch.trim().toLowerCase())).map(country => (
                <Pressable key={country.code} style={styles.countryOption} onPress={() => { setCountryIso(country.code); setCountryPickerOpen(false); setCountrySearch(''); }}>
                  <Text style={styles.optionFlag}>{country.flag}</Text><Text style={styles.countryName}>{country.name}</Text><Text style={styles.countryCode}>{getDialCode(country.code)}</Text>
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
  strip: { height: 20, backgroundColor: '#E6EDE1' },
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
  countryScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  countrySheet: { height: '78%', backgroundColor: BACKGROUND, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  countryTitle: { color: TEXT, fontSize: 18, fontFamily: 'Manrope_800ExtraBold', marginBottom: 12 },
  countryList: { flex: 1 },
  countryListContent: { paddingBottom: 16 },
  countrySearchBox: { height: 46, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10, borderRadius: 12, backgroundColor: TINT },
  countrySearchInput: { flex: 1, marginLeft: 8, paddingVertical: 0, color: TEXT, fontSize: 15, fontFamily: 'Inter_400Regular' },
  countryOption: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  optionFlag: { fontSize: 28, width: 44 },
  countryName: { flex: 1, color: TEXT, fontSize: 15, fontFamily: 'Inter_500Medium' },
  readOnlyInput: { height: 50, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: SOFT },
  readOnlyText: { flex: 1, color: TEXT, fontSize: 16, fontFamily: 'Inter_400Regular' },
  saveButton: { height: 50, borderRadius: 999, backgroundColor: TEXT, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.45 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});