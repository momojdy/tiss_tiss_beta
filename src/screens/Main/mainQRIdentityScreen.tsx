import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Camera, CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLinking from 'expo-linking';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type QRKind = 'buyer_identity' | 'wallet_receive' | 'vendor_shop';
type Props = {
  kind: QRKind;
  onBack: () => void;
  businessId?: string;
  onOpenShop?: (vendorId: string, shopName: string) => void;
  onOpenWallet?: (token: string, recipient: any) => void;
  onOpenBuyer?: (recipient?: any) => void;
  onPrivacyPress?: () => void;
  initialToken?: string | null;
  displayToken?: string | null;
};
const THEMES = {
  buyer_identity: { title: 'My Wantiss ID', subtitle: 'Your buyer identity', color: '#E8A0C5', pale: '#FFF0F7' },
  wallet_receive: { title: 'Add me', subtitle: '', color: '#438C53', pale: '#EFF8EF' },
  vendor_shop: { title: 'Your shop QR', subtitle: 'Let customers open your public shop', color: '#397BC6', pale: '#EEF5FF' },
};
export default function QRIdentityScreen({ kind, onBack, businessId, onOpenShop, onOpenWallet, onOpenBuyer, onPrivacyPress, initialToken, displayToken }: Props) {
  const theme = THEMES[kind];
  const insets = useSafeAreaInsets();
  const [record, setRecord] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [wantissNumber, setWantissNumber] = useState('');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [resolved, setResolved] = useState<any>(null);
  const [selfScan, setSelfScan] = useState(false);
  const [amount, setAmount] = useState('');
  const [resolving, setResolving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const resolveLock = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const issue = useCallback(async () => {
    setBusy(true);
    setRecord(null);
    try {
      let result: any;
      if (kind === 'wallet_receive') {
        const { data: summary, error: summaryError } = await supabase.rpc('get_my_wallet_summary');
        if (summaryError) throw summaryError;
        const id = summary?.wallet_id as string | undefined;
        if (!id) throw new Error('Your wallet is not ready yet.');
        setWalletId(id);
        const { data, error } = await supabase.rpc('issue_wallet_receive_qr', { p_wallet_id: id });
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.rpc('issue_qr_identity', {
          p_qr_type: kind,
          p_business_id: kind === 'vendor_shop' ? businessId : null,
        });
        if (error) throw error;
        result = data;
      }
      setRecord(result);
      if (kind === 'buyer_identity') {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const { data: privacy } = await supabase.from('user_profile_visibility')
            .select('membership_visibility_confirmed').eq('user_id', auth.user.id).maybeSingle();
          if (!privacy?.membership_visibility_confirmed) {
            Alert.alert('Choose your membership privacy', 'Would you like people who scan your Wantiss QR to see your membership tier? Your tier stays private unless you choose public.', [
              { text: 'Keep private', style: 'cancel', onPress: () => { void supabase.from('user_profile_visibility').upsert({ user_id: auth.user!.id, membership_visibility: 'private', membership_visibility_confirmed: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).then(({ error }) => { if (error) Alert.alert('Privacy not saved', error.message); }); } },
              { text: 'Make public', onPress: () => { void supabase.from('user_profile_visibility').upsert({ user_id: auth.user!.id, membership_visibility: 'public', membership_visibility_confirmed: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).then(({ error }) => { if (error) Alert.alert('Privacy not saved', error.message); }); } },
            ]);
          }
        }
      }
    } catch (error) {
      const details = typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : error instanceof Error ? error.message : String(error ?? 'Unknown error');
      console.error('[QRIdentityScreen] QR issuance failed', { kind, details, error });
      Alert.alert('Could not create QR', details || 'Please try again.');
    } finally { setBusy(false); }
  }, [kind, businessId]);

  useEffect(() => { if (initialToken) { setBusy(false); return; } if (displayToken) { setRecord({ token: displayToken }); setBusy(false); return; } void issue(); }, [issue, initialToken, displayToken]);
  useEffect(() => {
    if (kind !== 'buyer_identity') return;
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from('profiles').select('wantiss_number').eq('id', auth.user.id).maybeSingle();
      if (active) setWantissNumber(data?.wantiss_number ?? '');
    })().catch(() => undefined);
    return () => { active = false; };
  }, [kind]);

  const chooseQRFromLibrary = async () => {
    let scanStage = 'starting';
    try {
      scanStage = 'requesting photo permission';
      if (typeof ImagePicker.requestMediaLibraryPermissionsAsync !== 'function') throw new Error('Photo permission API is unavailable in this app runtime.');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo library permission', 'Allow Wantiss to access your photos so you can choose a QR code image.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => { void Linking.openSettings(); } }]);
        return;
      }
      scanStage = 'opening photo library';
      if (typeof ImagePicker.launchImageLibraryAsync !== 'function') throw new Error('Photo library API is unavailable in this app runtime.');
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (picked.canceled || !picked.assets?.[0]?.uri) return;
      setLibraryBusy(true);
      scanStage = 'decoding QR from selected image';
      if (typeof scanFromURLAsync !== 'function') throw new Error('This Expo Camera runtime does not provide QR scanning from saved images. Use the live scanner, or update the app build with an image QR decoder.');
      const results = await scanFromURLAsync(picked.assets[0].uri, ['qr']);
      scanStage = 'reading QR result';
      const scanned = Array.isArray(results) ? results.find((item: any) => typeof item?.data === 'string' && item.data.length > 0) : null;
      if (!scanned) { Alert.alert('No QR code found', 'Choose an image that clearly shows a Wantiss QR code.'); return; }
      await resolve(scanned.data);
    } catch (error) {
      const details = error instanceof Error ? error.message : error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : String(error ?? 'Unknown error');
      console.error('[QRIdentityScreen] Could not read QR image', { stage: scanStage, details, error });
      Alert.alert('Could not read QR image', `${scanStage}: ${details || 'Unknown error'}`);
    } finally { setLibraryBusy(false); }
  };

  const revoke = () => {
    if (!record?.id) return;
    Alert.alert('Deactivate this QR?', 'Anyone using this QR link will no longer be able to open its destination.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => { void (async () => {
        try {
          const { error } = await supabase.rpc('revoke_qr_identity', { p_record_id: record.id });
          if (error) throw error;
          setRecord(null);
          Alert.alert('QR deactivated', 'Create a new QR whenever you are ready.');
        } catch (error) { Alert.alert('Could not revoke QR', error instanceof Error ? error.message : 'Please try again.'); }
      })(); } },
    ]);
  };

  const resolve = async (scannedValue?: string) => {
    if (resolveLock.current || resolving) return;
    resolveLock.current = true;
    const raw = (scannedValue ?? tokenInput).trim();
    let token = raw;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
      const parsed = ExpoLinking.parse(raw);
      const scheme = (parsed.scheme ?? '').toLowerCase();
      const host = (parsed.hostname ?? '').toLowerCase();
      const path = (parsed.path ?? '').split('/').filter(Boolean).join('/').toLowerCase();
      if (scheme !== 'wantiss' || host !== 'qr' || path !== '') {
        resolveLock.current = false;
        Alert.alert('Wantiss link only', 'For your safety, Wantiss can only open QR links created by Wantiss. Scan a Wantiss QR code or paste its token.');
        return;
      }
      token = typeof parsed.queryParams?.token === 'string' ? parsed.queryParams.token : '';
    } else if (raw.includes('?') || raw.includes('/') || raw.includes('\\')) {
      resolveLock.current = false;
      Alert.alert('Paste a Wantiss token', 'Use a Wantiss QR link or paste the QR token itself. Other links are not accepted.');
      return;
    }
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) { resolveLock.current = false; Alert.alert('Wantiss QR not recognized', 'This Wantiss QR token is incomplete or invalid.'); return; }
    setCameraOpen(false);
    setResolving(true);
    try {
      const { data, error } = await supabase.rpc('resolve_qr_identity', { p_token: token });
      if (error) throw error;
      if (!data?.valid) throw new Error('This QR is invalid, expired, or revoked.');
      const destination = { ...data, token };
      setResolved(destination);
      setRequestId(makeRequestId());
      setTokenInput(raw);
      if (data.is_self === true) {
        setSelfScan(true);
        Alert.alert('This is your own Wantiss QR', data.qr_type === 'wallet_receive' ? 'This QR belongs to your wallet. You can share it, but you cannot send money to yourself.' : 'This is your profile QR. Other people who scan it will see your public profile.');
        return;
      }
      setSelfScan(false);
      if (data.destination === 'vendor-shop') onOpenShop?.(data.vendor_id, data.shop_name);
      if (data.destination === 'wallet-receive' || data.qr_type === 'wallet_receive') { if (onOpenWallet) onOpenWallet(token, { ...data, destination: 'wallet-receive' }); else Alert.alert('Wallet destination unavailable', 'Return to your Wantiss wallet and scan the QR again.'); }
      if (data.destination === 'buyer-profile') onOpenBuyer?.(data);
    } catch (error) { Alert.alert('QR not recognized', error instanceof Error ? error.message : 'Please try another QR.'); }
    finally { setResolving(false); resolveLock.current = false; }
  };

  useEffect(() => {
    if (initialToken && !resolved) void resolve(initialToken);
  }, [initialToken]);

  const pay = () => {
    const value = Number(amount);
    if (!resolved?.token || resolved.qr_type !== 'wallet_receive') return;
    if (!Number.isFinite(value) || value <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      Alert.alert('Check amount', 'Enter an amount greater than zero with up to two decimal places.'); return;
    }
    Alert.alert('Confirm transfer', `Send $${value.toFixed(2)} to ${resolved.display_name} (Wantiss ID ${resolved.wantiss_number})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm & send', onPress: () => { void (async () => {
        setPaying(true);
        try {
          const { data, error } = await supabase.rpc('transfer_wallet_by_qr', {
            p_recipient_token: resolved.token, p_amount: value, p_request_id: requestId ?? makeRequestId(),
          });
          if (error) throw error;
          Alert.alert(data?.duplicate ? 'Already processed' : 'Transfer complete', data?.duplicate ? 'This transfer request was already processed.' : 'Your wallet transfer was recorded successfully.');
          setResolved(null); setTokenInput(''); setAmount(''); setRequestId(null);
        } catch (error) { Alert.alert('Transfer not completed', error instanceof Error ? error.message : 'Please try again.'); }
        finally { setPaying(false); }
      })(); } },
    ]);
  };

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
    <View style={[styles.header, { paddingTop: insets.top, height: 100 }]}>
      <Pressable onPress={onBack} style={[styles.back, kind === 'buyer_identity' ? styles.buyerBack : styles.walletBack]}>{kind === 'wallet_receive' ? <MaterialCommunityIcons name="arrow-left" size={20} color="#1A2517" /> : <Ionicons name="chevron-back" size={23} color="#c2007A" />}</Pressable>
      {kind === 'wallet_receive' ? <Text style={styles.headerTitle}>Pay / add me</Text> : null}
    </View>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={[styles.hero, { backgroundColor: theme.pale, borderColor: theme.color }]}>
        {!initialToken && kind !== 'buyer_identity' ? <Text style={[styles.eyebrow, { color: theme.color }]}>{kind === 'wallet_receive' ? 'WALLET RECEIVING QR' : 'PUBLIC SHOP'}</Text> : null}
        {kind !== 'wallet_receive' ? <Text style={styles.title}>{theme.title}</Text> : null}
        {!initialToken && theme.subtitle ? <Text style={styles.subtitle}>{theme.subtitle}</Text> : null}
        <View style={styles.qrFrame}>
          {busy || (Boolean(initialToken) && resolving && !resolved) ? <View style={styles.qrLoading}><ActivityIndicator size="large" color={theme.color} /><Text style={[styles.qrLoadingText, { color: theme.color }]}>{initialToken ? 'Opening secure Wantiss QR…' : 'Preparing your secure Wantiss QR…'}</Text></View> : initialToken ? <Text style={styles.recipientName}>{resolved?.display_name ?? resolved?.shop_name ?? 'Opening Wantiss…'}</Text> : (record?.token ?? displayToken) ? <QRCode value={`wantiss://qr?token=${record?.token ?? displayToken}`} size={210} color={theme.color} backgroundColor="#FFFFFF" /> : <View style={styles.qrLoading}><MaterialCommunityIcons name="qrcode-remove" size={38} color={theme.color} /><Text style={styles.qrLoadingText}>Your QR is not available yet. Try refreshing.</Text></View>}
        </View>
        {kind === 'buyer_identity' ? (initialToken ? null : <>
          <Pressable style={[styles.primary, { backgroundColor: theme.color }]} onPress={() => { const token = record?.token ?? displayToken; if (!token) return; void Share.share({ title: 'My Wantiss ID', message: `Connect with me on Wantiss: wantiss://qr?token=${token}` }); }}><Ionicons name="share-social-outline" size={18} color="#FFF" /><Text style={styles.primaryText}>Share my Wantiss ID</Text></Pressable>
          <Pressable style={[styles.outline, { borderColor: theme.color, marginTop: 10 }]} onPress={() => Alert.alert('Refresh buyer QR?', 'The previous token will be revoked. Your Wantiss number will stay the same.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Refresh', onPress: () => { void issue(); } }])}><Ionicons name="refresh" size={18} color={theme.color} /><Text style={[styles.outlineText, { color: theme.color }]}>Refresh buyer QR</Text></Pressable>
          {onPrivacyPress ? <Pressable style={[styles.outline, { borderColor: theme.color, marginTop: 10 }]} onPress={onPrivacyPress}><Ionicons name="shield-checkmark-outline" size={18} color={theme.color} /><Text style={[styles.outlineText, { color: theme.color }]}>Membership privacy</Text></Pressable> : null}
          <Text style={styles.idLabel}>PERMANENT WANTISS NUMBER</Text>
          <Text selectable style={styles.idValue}>{wantissNumber || 'Loading your Wantiss number…'}</Text>
        </>) : kind === 'wallet_receive' ? <>
          <Pressable style={[styles.primary, { backgroundColor: theme.color }]} onPress={() => { const token = record?.token ?? displayToken ?? initialToken; if (!token) { Alert.alert('QR not ready', 'Wait for your wallet QR to load, then try again.'); return; } void Share.share({ title: 'Add me', message: `Add me on Wantiss: wantiss://qr?token=${token}` }); }}><Ionicons name="share-social-outline" size={18} color="#FFF" /><Text style={styles.primaryText}>Share Add me link</Text></Pressable>
          <Pressable style={[styles.outline, { borderColor: theme.color, marginTop: 10 }]} onPress={() => Alert.alert('Refresh wallet QR?', 'The old QR will be revoked immediately.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Refresh', onPress: () => { void issue(); } }])}><Ionicons name="refresh" size={18} color={theme.color} /><Text style={[styles.outlineText, { color: theme.color }]}>Refresh wallet QR</Text></Pressable>
        </> : <Text style={styles.caption}>Customers scan this blue QR to find your public shop.</Text>}
        {record?.id && !initialToken ? <Pressable style={styles.revokeButton} onPress={revoke}><Text style={styles.revokeText}>Deactivate QR</Text></Pressable> : null}
      </View>

      {kind !== 'vendor_shop' ? <View style={styles.scannerCard}>
        {selfScan ? <View style={[styles.scanState, { backgroundColor: theme.pale, borderColor: theme.color }]}><Ionicons name="shield-checkmark" size={22} color={theme.color} /><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: theme.color }]}>You scanned your own QR</Text><Text style={styles.muted}>{kind === 'wallet_receive' ? 'Your wallet QR is ready to share. Sending money to yourself is disabled.' : 'Your profile QR is ready to share. Other people who scan it will see your public profile.'}</Text></View></View> : null}
         <Text style={styles.sectionTitle}>Scan a Wantiss QR</Text>
        <Text style={styles.muted}>Scan a Wantiss QR or paste its link to open a profile, wallet, or shop.</Text>
        <Pressable style={[styles.outline, { borderColor: theme.color }]} onPress={() => { void chooseQRFromLibrary(); }} disabled={libraryBusy}>{libraryBusy ? <ActivityIndicator color={theme.color} /> : <Ionicons name="images-outline" size={19} color={theme.color} />}<Text style={[styles.outlineText, { color: theme.color }]}>{libraryBusy ? 'Reading QR image…' : 'Choose QR from photo library'}</Text></Pressable>
        {cameraOpen ? <View style={styles.cameraWrap}>
          {cameraPermission?.granted ? <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { void resolve(data); }} /> : <View style={styles.permissionBox}><Text style={styles.muted}>Camera permission is required to scan QR codes.</Text><Pressable style={[styles.primary, { backgroundColor: theme.color }]} onPress={() => { void requestCameraPermission(); }}><Text style={styles.primaryText}>Allow camera</Text></Pressable></View>}
          <Pressable style={styles.outline} onPress={() => setCameraOpen(false)}><Text style={styles.outlineText}>Close scanner</Text></Pressable>
        </View> : <Pressable style={[styles.outline, { borderColor: theme.color }]} onPress={() => { if (cameraPermission?.granted) setCameraOpen(true); else void requestCameraPermission().then(p => { if (p.granted) setCameraOpen(true); }); }}><Ionicons name="scan-outline" size={19} color={theme.color} /><Text style={[styles.outlineText, { color: theme.color }]}>Open camera scanner</Text></Pressable>}
        <TextInput value={tokenInput} onChangeText={setTokenInput} placeholder="Paste QR token or link" autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => { void resolve(); }} onFocus={() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250); }} style={styles.input} />
        <Pressable style={[styles.outline, { borderColor: theme.color }]} onPress={() => { void resolve(); }} disabled={resolving}>{resolving ? <ActivityIndicator color={theme.color} /> : <Ionicons name="search-outline" size={18} color={theme.color} />}<Text style={[styles.outlineText, { color: theme.color }]}>Open QR</Text></Pressable>
        {resolved ? <View style={styles.recipient}>
          <Text style={styles.sectionTitle}>{resolved.destination === 'vendor-shop' ? 'Shop found' : resolved.destination === 'wallet-receive' ? 'Send money' : 'Wantiss profile found'}</Text>
          {resolved.destination === 'wallet-receive' ? <View style={styles.recipientIdentity}>{resolved.avatar_url ? <Image source={{ uri: resolved.avatar_url }} style={styles.recipientAvatar} /> : <View style={styles.recipientAvatarFallback}><Ionicons name="person" size={24} color={theme.color} /></View>}<View style={{ flex: 1 }}><Text style={styles.recipientName}>{resolved.display_name ?? 'Wantiss buyer'}</Text><Text style={styles.muted}>Confirm this is the right person</Text></View></View> : <Text style={styles.recipientName}>{resolved.display_name ?? resolved.shop_name ?? 'Wantiss account'}</Text>}
          {resolved.vendor_id ? <Text style={styles.muted}>Vendor ID: {resolved.vendor_id}</Text> : null}
          {resolved.wantiss_number ? <Text style={styles.muted}>Wantiss ID: {resolved.wantiss_number}</Text> : null}
          {resolved.qr_type === 'wallet_receive' ? <>
            <Text style={styles.muted}>Send from your existing Wantiss wallet. This does not fund a wallet from a bank or card.</Text>
            <TextInput value={amount} onChangeText={setAmount} placeholder="Amount (USD)" keyboardType="decimal-pad" style={styles.input} />
            <Pressable disabled={paying} style={[styles.primary, { backgroundColor: theme.color, opacity: paying ? 0.6 : 1 }]} onPress={pay}>{paying ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={17} color="#FFF" />}<Text style={styles.primaryText}>{paying ? 'Processing…' : 'Review and send money'}</Text></Pressable>
          </> : null}
        </View> : null}
      </View> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}
function makeRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F7F8FA' }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#ECEEF2', backgroundColor: '#FFF' }, back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, flexShrink: 0 }, buyerBack: { backgroundColor: 'transparent' }, walletBack: { backgroundColor: '#DCE8D2' }, headerTitle: { fontSize: 19, fontWeight: '600', color: '#1A2517', marginLeft: 12, lineHeight: 19, transform: [{ translateY: 1 }] }, content: { padding: 16, paddingBottom: 38, gap: 14 }, hero: { borderRadius: 22, borderWidth: 1, padding: 18, alignItems: 'center' }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, alignSelf: 'flex-start' }, title: { fontSize: 24, fontWeight: '800', color: '#202735', marginTop: 8 }, subtitle: { fontSize: 13, color: '#707887', textAlign: 'center', marginTop: 5, lineHeight: 19 }, qrFrame: { backgroundColor: '#FFF', padding: 14, borderRadius: 18, marginTop: 20, minHeight: 236, minWidth: 236, alignItems: 'center', justifyContent: 'center' }, qrLoading: { minHeight: 208, width: 208, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 10 }, qrLoadingText: { fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' }, scanState: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 4 }, caption: { fontSize: 12, color: '#6D7582', textAlign: 'center', marginTop: 14, lineHeight: 18 }, primary: { minHeight: 46, borderRadius: 13, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18, width: '100%' }, primaryText: { fontSize: 14, fontWeight: '700', color: '#FFF' }, idLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#8C7790', marginTop: 15 }, idValue: { fontSize: 17, fontWeight: '800', color: '#35253A', marginTop: 5 }, muted: { fontSize: 12, color: '#747C8B', lineHeight: 18 }, scannerCard: { padding: 16, borderRadius: 18, backgroundColor: '#FFF', gap: 10 }, sectionTitle: { fontSize: 16, fontWeight: '800', color: '#202735' }, input: { minHeight: 46, borderWidth: 1, borderColor: '#E1E5EB', borderRadius: 12, paddingHorizontal: 13, fontSize: 14, color: '#202735', backgroundColor: '#FFF' }, outline: { minHeight: 44, borderWidth: 1.3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, outlineText: { fontSize: 13, fontWeight: '700' }, recipientIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 }, recipientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF' }, recipientAvatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, recipient: { borderTopWidth: 1, borderTopColor: '#ECEEF2', paddingTop: 14, marginTop: 4, gap: 8 }, recipientName: { fontSize: 18, fontWeight: '800', color: '#202735' }, cameraWrap: { gap: 10 }, camera: { height: 300, borderRadius: 14, overflow: 'hidden' }, permissionBox: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 8 }, revokeButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: '#E1A6B2' }, revokeText: { color: '#B4455B', fontWeight: '800', fontSize: 12 }
});