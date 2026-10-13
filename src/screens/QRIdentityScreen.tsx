import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type QRKind = 'buyer_identity' | 'wallet_receive' | 'vendor_shop';
type Props = {
  kind: QRKind;
  onBack: () => void;
  businessId?: string;
  onOpenShop?: (vendorId: string, shopName: string) => void;
  onOpenWallet?: (token: string, recipient: any) => void;
  onOpenBuyer?: () => void;
  initialToken?: string | null;
};
const THEMES = {
  buyer_identity: { title: 'My Wantiss ID', subtitle: 'Your buyer identity', color: '#E8A0C5', pale: '#FFF0F7' },
  wallet_receive: { title: 'Add me', subtitle: '', color: '#438C53', pale: '#EFF8EF' },
  vendor_shop: { title: 'Your shop QR', subtitle: 'Let customers open your public shop', color: '#397BC6', pale: '#EEF5FF' },
};
export default function QRIdentityScreen({ kind, onBack, businessId, onOpenShop, onOpenWallet, onOpenBuyer, initialToken }: Props) {
  const theme = THEMES[kind];
  const insets = useSafeAreaInsets();
  const [record, setRecord] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [wantissNumber, setWantissNumber] = useState('');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [resolved, setResolved] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [resolving, setResolving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const resolveLock = useRef(false);

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
    } catch (error) {
      Alert.alert('Could not create QR', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  }, [kind, businessId]);

  useEffect(() => { if (initialToken && kind === 'wallet_receive') { setBusy(false); return; } void issue(); }, [issue, initialToken, kind]);
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

  const revoke = () => {
    if (!record?.id) return;
    Alert.alert('Deactivate this QR?', 'Anyone using this QR link will no longer be able to open its destination.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => { void (async () => {
        try {
          const { error } = await supabase.rpc('revoke_qr_identity', { p_record_id: record.id });
          if (error) throw error;
          setRecord(null);
          Alert.alert('QR revoked', 'Create a new QR when you are ready.');
        } catch (error) { Alert.alert('Could not revoke QR', error instanceof Error ? error.message : 'Please try again.'); }
      })(); } },
    ]);
  };

  const resolve = async (scannedValue?: string) => {
    if (resolveLock.current || resolving) return;
    resolveLock.current = true;
    const raw = (scannedValue ?? tokenInput).trim();
    const match = raw.match(/[?&]token=([^&]+)/i);
    const token = match ? decodeURIComponent(match[1]) : raw.replace(/^wantiss:\/\//i, '');
    if (!token) { resolveLock.current = false; Alert.alert('Scan a QR', 'Scan a Wantiss QR or paste its token.'); return; }
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
      if (data.destination === 'vendor-shop') onOpenShop?.(data.vendor_id, data.shop_name);
      if (data.destination === 'wallet-receive') onOpenWallet?.(token, data);
      if (data.destination === 'buyer-profile') onOpenBuyer?.();
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

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    <View style={[styles.header, { paddingTop: insets.top, height: 100 }]}>
      <Pressable onPress={onBack} style={styles.back}><Ionicons name="chevron-back" size={23} color="#1D2430" /></Pressable>
      <Text style={styles.headerTitle}>{theme.title}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={[styles.hero, { backgroundColor: theme.pale, borderColor: theme.color }]}>
        <Text style={[styles.eyebrow, { color: theme.color }]}>{kind === 'buyer_identity' ? 'BUYER IDENTITY' : kind === 'wallet_receive' ? 'WALLET RECEIVING QR' : 'PUBLIC SHOP'}</Text>
        <Text style={styles.title}>{theme.title}</Text>
        <Text style={styles.subtitle}>{theme.subtitle}</Text>
        <View style={styles.qrFrame}>
          {busy ? <ActivityIndicator color={theme.color} /> : (record?.token || initialToken) ? <QRCode value={`wantiss://qr?token=${record?.token ?? initialToken}`} size={210} color={theme.color} backgroundColor="#FFFFFF" /> : <Text style={styles.muted}>QR unavailable</Text>}
        </View>
        {kind === 'buyer_identity' ? <>
          <Pressable style={[styles.primary, { backgroundColor: theme.color }]} onPress={() => { if (!record?.token) return; void Share.share({ title: 'My Wantiss ID', message: `Connect with me on Wantiss: wantiss://qr?token=${record.token}` }); }}><Ionicons name="share-social-outline" size={18} color="#FFF" /><Text style={styles.primaryText}>Share my Wantiss ID</Text></Pressable>
          <Pressable style={[styles.outline, { borderColor: theme.color, marginTop: 10 }]} onPress={() => Alert.alert('Refresh buyer QR?', 'The previous token will be revoked. Your Wantiss number will stay the same.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Refresh', onPress: () => { void issue(); } }])}><Ionicons name="refresh" size={18} color={theme.color} /><Text style={[styles.outlineText, { color: theme.color }]}>Refresh buyer QR</Text></Pressable>
          <Text style={styles.idLabel}>PERMANENT WANTISS NUMBER</Text>
          <Text selectable style={styles.idValue}>{wantissNumber || 'Loading your Wantiss number…'}</Text>
        </> : kind === 'wallet_receive' ? <>
          <Pressable style={[styles.primary, { backgroundColor: theme.color }]} onPress={() => { void Share.share({ title: 'My Wantiss wallet', message: `Add me on Wantiss: wantiss://qr?token=${record.token}` }); }}><Ionicons name="share-social-outline" size={18} color="#FFF" /><Text style={styles.primaryText}>Share Add me link</Text></Pressable>
          <Pressable style={[styles.outline, { borderColor: theme.color, marginTop: 10 }]} onPress={() => Alert.alert('Refresh wallet QR?', 'The old QR will be revoked immediately.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Refresh', onPress: () => { void issue(); } }])}><Ionicons name="refresh" size={18} color={theme.color} /><Text style={[styles.outlineText, { color: theme.color }]}>Refresh wallet QR</Text></Pressable>
        </> : <Text style={styles.caption}>Customers scan this blue QR to find your public shop.</Text>}
        {record?.id && !initialToken ? <Pressable style={styles.revokeButton} onPress={revoke}><Text style={styles.revokeText}>Deactivate QR</Text></Pressable> : null}
      </View>

      {kind !== 'vendor_shop' ? <View style={styles.scannerCard}>
        <Text style={styles.sectionTitle}>Pay or add by QR scan</Text>
        <Text style={styles.muted}>Scan a Wantiss QR or paste its link to open a profile, wallet, or shop.</Text>
        {cameraOpen ? <View style={styles.cameraWrap}>
          {cameraPermission?.granted ? <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { void resolve(data); }} /> : <View style={styles.permissionBox}><Text style={styles.muted}>Camera permission is required to scan QR codes.</Text><Pressable style={[styles.primary, { backgroundColor: theme.color }]} onPress={() => { void requestCameraPermission(); }}><Text style={styles.primaryText}>Allow camera</Text></Pressable></View>}
          <Pressable style={styles.outline} onPress={() => setCameraOpen(false)}><Text style={styles.outlineText}>Close scanner</Text></Pressable>
        </View> : <Pressable style={[styles.outline, { borderColor: theme.color }]} onPress={() => { if (cameraPermission?.granted) setCameraOpen(true); else void requestCameraPermission().then(p => { if (p.granted) setCameraOpen(true); }); }}><Ionicons name="scan-outline" size={19} color={theme.color} /><Text style={[styles.outlineText, { color: theme.color }]}>Open camera scanner</Text></Pressable>}
        <TextInput value={tokenInput} onChangeText={setTokenInput} placeholder="Paste QR token or link" autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => { void resolve(); }} style={styles.input} />
        <Pressable style={[styles.outline, { borderColor: theme.color }]} onPress={() => { void resolve(); }} disabled={resolving}>{resolving ? <ActivityIndicator color={theme.color} /> : <Ionicons name="search-outline" size={18} color={theme.color} />}<Text style={[styles.outlineText, { color: theme.color }]}>Open QR</Text></Pressable>
        {resolved ? <View style={styles.recipient}>
          <Text style={styles.sectionTitle}>{resolved.destination === 'vendor-shop' ? 'Shop found' : resolved.destination === 'wallet-receive' ? 'Recipient confirmed' : 'Wantiss profile found'}</Text>
          <Text style={styles.recipientName}>{resolved.display_name ?? resolved.shop_name ?? 'Wantiss account'}</Text>
          {resolved.vendor_id ? <Text style={styles.muted}>Vendor ID: {resolved.vendor_id}</Text> : null}
          {resolved.wantiss_number ? <Text style={styles.muted}>Wantiss ID: {resolved.wantiss_number}</Text> : null}
          {resolved.qr_type === 'wallet_receive' ? <>
            <TextInput value={amount} onChangeText={setAmount} placeholder="Amount (USD)" keyboardType="decimal-pad" style={styles.input} />
            <Pressable disabled={paying} style={[styles.primary, { backgroundColor: theme.color, opacity: paying ? 0.6 : 1 }]} onPress={pay}>{paying ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={17} color="#FFF" />}<Text style={styles.primaryText}>{paying ? 'Processing…' : 'Confirm & Pay me'}</Text></Pressable>
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
  page: { flex: 1, backgroundColor: '#F7F8FA' }, header: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#ECEEF2', backgroundColor: '#FFF' }, back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 17, fontWeight: '700', color: '#202735', marginLeft: 6 }, content: { padding: 16, paddingBottom: 38, gap: 14 }, hero: { borderRadius: 22, borderWidth: 1, padding: 18, alignItems: 'center' }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, alignSelf: 'flex-start' }, title: { fontSize: 24, fontWeight: '800', color: '#202735', marginTop: 8 }, subtitle: { fontSize: 13, color: '#707887', textAlign: 'center', marginTop: 5, lineHeight: 19 }, qrFrame: { backgroundColor: '#FFF', padding: 14, borderRadius: 18, marginTop: 20, minHeight: 236, minWidth: 236, alignItems: 'center', justifyContent: 'center' }, caption: { fontSize: 12, color: '#6D7582', textAlign: 'center', marginTop: 14, lineHeight: 18 }, primary: { minHeight: 46, borderRadius: 13, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18, width: '100%' }, primaryText: { fontSize: 14, fontWeight: '700', color: '#FFF' }, idLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#8C7790', marginTop: 15 }, idValue: { fontSize: 17, fontWeight: '800', color: '#35253A', marginTop: 5 }, muted: { fontSize: 12, color: '#747C8B', lineHeight: 18 }, scannerCard: { padding: 16, borderRadius: 18, backgroundColor: '#FFF', gap: 10 }, sectionTitle: { fontSize: 16, fontWeight: '800', color: '#202735' }, input: { minHeight: 46, borderWidth: 1, borderColor: '#E1E5EB', borderRadius: 12, paddingHorizontal: 13, fontSize: 14, color: '#202735', backgroundColor: '#FFF' }, outline: { minHeight: 44, borderWidth: 1.3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, outlineText: { fontSize: 13, fontWeight: '700' }, recipient: { borderTopWidth: 1, borderTopColor: '#ECEEF2', paddingTop: 14, marginTop: 4, gap: 8 }, recipientName: { fontSize: 18, fontWeight: '800', color: '#202735' }, cameraWrap: { gap: 10 }, camera: { height: 300, borderRadius: 14, overflow: 'hidden' }, permissionBox: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 8 }, revokeButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: '#E1A6B2' }, revokeText: { color: '#B4455B', fontWeight: '800', fontSize: 12 }
});