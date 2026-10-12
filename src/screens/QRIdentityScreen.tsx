import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
};
const THEMES = {
  buyer_identity: { title: 'My Wantiss ID', subtitle: 'Your buyer identity', color: '#E8A0C5', pale: '#FFF0F7', icon: 'person-circle-outline' as const },
  wallet_receive: { title: 'Receive money', subtitle: 'A QR for this wallet only', color: '#438C53', pale: '#EFF8EF', icon: 'wallet-outline' as const },
  vendor_shop: { title: 'Your shop QR', subtitle: 'Let customers open your public shop', color: '#397BC6', pale: '#EEF5FF', icon: 'storefront-outline' as const },
};
export default function QRIdentityScreen({ kind, onBack, businessId, onOpenShop, onOpenWallet }: Props) {
  const theme = THEMES[kind];
  const [record, setRecord] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [resolved, setResolved] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [resolving, setResolving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [wantissNumber, setWantissNumber] = useState('');
  const [wantissNumber, setWantissNumber] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const issue = useCallback(async () => {
    setBusy(true);
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

  useEffect(() => { void issue(); }, [issue]);
  useEffect(() => {
    if (kind !== 'buyer_identity') return;
    let active = true;
    void (async () => {
      const { data: userResult } = await supabase.auth.getUser();
      if (!userResult.user) return;
      const { data } = await supabase.from('profiles').select('wantiss_number').eq('id', userResult.user.id).maybeSingle();
      if (active) setWantissNumber(data?.wantiss_number ?? '');
    })();
    return () => { active = false; };
  }, [kind]);
  useEffect(() => { if (kind !== 'buyer_identity') return; void (async () => { const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return; const { data } = await supabase.from('profiles').select('wantiss_number').eq('id', auth.user.id).maybeSingle(); setWantissNumber(data?.wantiss_number ?? null); })().catch(() => undefined); }, [kind]);

  const revoke = async () => {
    if (!record?.id) return;
    Alert.alert('Revoke this QR?', 'Anyone using the old QR will no longer be able to resolve it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke QR', style: 'destructive', onPress: () => { void (async () => {
        try {
          const { error } = await supabase.rpc('revoke_qr_identity', { p_record_id: record.id });
          if (error) throw error;
          setRecord(null);
          Alert.alert('QR revoked', 'This QR is no longer active. Create a new one when you are ready.');
        } catch (error) { Alert.alert('Could not revoke QR', error instanceof Error ? error.message : 'Please try again.'); }
      })(); } },
    ]);
  };

  const resolve = async (scannedValue?: string) => {
    const raw = (scannedValue ?? tokenInput).trim().replace(/^wantiss:\/\//i, '');
    const tokenMatch = raw.match(/[?&]token=([^&]+)/i);
    const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : raw;
    if (!token) { Alert.alert('Scan a QR', 'Enter the QR token to look up its destination.'); return; }
    setResolving(true);
    try {
      const { data, error } = await supabase.rpc('resolve_qr_identity', { p_token: token });
      if (error) throw error;
      if (!data?.valid) throw new Error('This QR is invalid, expired, or revoked.');
      setResolved({ ...data, token });
      if (data.destination === 'vendor-shop') onOpenShop?.(data.vendor_id, data.shop_name);
      if (data.destination === 'wallet-receive') onOpenWallet?.(token, data);
    } catch (error) { Alert.alert('QR not recognized', error instanceof Error ? error.message : 'Please try another QR.'); }
    finally { setResolving(false); }
  };

  const pay = async () => {
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
            p_recipient_token: resolved.token, p_amount: value, p_request_id: makeRequestId(),
          });
          if (error) throw error;
          Alert.alert(data?.duplicate ? 'Already processed' : 'Transfer complete', data?.duplicate ? 'This transfer request was already processed.' : 'Your wallet transfer was recorded successfully.');
          setResolved(null); setTokenInput(''); setAmount('');
        } catch (error) { Alert.alert('Transfer not completed', error instanceof Error ? error.message : 'Please try again.'); }
        finally { setPaying(false); }
      })(); } },
    ]);
  };

  if (kind !== 'wallet_receive') {
    return <View style={styles.page}><View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Ionicons name="chevron-back" size={23} color="#1D2430" /></Pressable><Text style={styles.headerTitle}>{theme.title}</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero,{backgroundColor:theme.pale,borderColor:theme.color}]}>
          <Text style={[styles.eyebrow,{color:theme.color}]}>{kind === 'buyer_identity' ? 'BUYER IDENTITY' : 'PUBLIC SHOP'}</Text>
          <Text style={styles.title}>{theme.title}</Text><Text style={styles.subtitle}>{theme.subtitle}</Text>
          <View style={styles.qrFrame}>{busy ? <ActivityIndicator color={theme.color}/> : record?.token ? <QRCode value={`wantiss://qr?token=${record.token}`} size={218} color={theme.color} backgroundColor="#FFFFFF" /> : <Text style={styles.muted}>QR unavailable</Text>}</View>
          <Text style={styles.caption}>{kind === 'buyer_identity' ? 'Share this to identify your Wantiss account.' : 'Customers scan this to open your public shop.'}</Text>
          {kind === 'buyer_identity' && wantissNumber ? <Text selectable style={{ color: theme.color, fontSize: 15, fontWeight: '800', marginTop: 8 }}>Wantiss ID · {wantissNumber}</Text> : null}
        </View>
        {kind === 'buyer_identity' ? <View style={styles.infoCard}><Text style={styles.infoTitle}>Your Wantiss number</Text><Text selectable style={{ color: '#BF008E', fontSize: 18, fontWeight: '800', marginTop: 5 }}>{wantissNumber ?? 'Loading your ID…'}</Text><Text style={styles.infoBody}>Your account number stays the same when this QR is refreshed. QR tokens can be revoked independently.</Text></View> : null}
        <Pressable style={[styles.primary,{backgroundColor:theme.color}]} onPress={() => Alert.alert('Refresh QR?', 'The current QR will stop working immediately.', [{text:'Cancel',style:'cancel'},{text:'Refresh',onPress:()=>void issue()}])}><Ionicons name="refresh" size={18} color="#FFF"/><Text style={styles.primaryText}>Refresh QR</Text></Pressable>
        <Pressable style={[styles.outline,{borderColor:'#C94858'}]} onPress={revoke} disabled={!record?.id}><Ionicons name="close-circle-outline" size={18} color="#C94858"/><Text style={[styles.outlineText,{color:'#C94858'}]}>Revoke QR</Text></Pressable><Text style={styles.security}>Refreshing revokes the previous QR token. Keep screenshots private if the QR can receive money.</Text>
      </ScrollView></View>;
  }

  return <View style={styles.page}><View style={styles.header}><Pressable onPress={onBack} style={styles.back}><Ionicons name="chevron-back" size={23} color="#1D2430" /></Pressable><Text style={styles.headerTitle}>Wallet QR & Scanner</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.hero,{backgroundColor:theme.pale,borderColor:theme.color}]}>
        <Text style={[styles.eyebrow,{color:theme.color}]}>WALLET RECEIVING QR</Text><Text style={styles.title}>Add me</Text><Text style={styles.subtitle}>Let someone open your wallet receiving details.</Text>
        <View style={styles.qrFrame}>{busy ? <ActivityIndicator color={theme.color}/> : record?.token ? <QRCode value={`wantiss://qr?token=${record.token}`} size={208} color={theme.color} backgroundColor="#FFFFFF" /> : <Text style={styles.muted}>QR unavailable</Text>}</View>
        <Text style={styles.caption}>This QR belongs to wallet {walletId ? walletId.slice(0,8).toUpperCase() : '…'}, not just your account.</Text>
        <Pressable style={[styles.primary,{backgroundColor:theme.color}]} onPress={() => Alert.alert('Refresh wallet QR?', 'The previous receiving QR will be revoked.', [{text:'Cancel',style:'cancel'},{text:'Refresh',onPress:()=>void issue()}])}><Ionicons name="refresh" size={18} color="#FFF"/><Text style={styles.primaryText}>Refresh wallet QR</Text></Pressable>
        <Pressable style={[styles.outline,{borderColor:'#C94858',marginTop:10}]} onPress={revoke} disabled={!record?.id}><Ionicons name="close-circle-outline" size={18} color="#C94858"/><Text style={[styles.outlineText,{color:'#C94858'}]}>Revoke wallet QR</Text></Pressable>
      </View>
      <View style={styles.scannerCard}><Text style={styles.sectionTitle}>Pay me / Scan a QR</Text><Text style={styles.muted}>Scan a Wantiss QR with your camera, or paste a token/link to resolve its destination securely on the server.</Text>
        {cameraOpen ? <View style={{ height: 290, overflow: 'hidden', borderRadius: 14, backgroundColor: '#101820' }}>
          <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { if (cameraOpen) { setCameraOpen(false); setTokenInput(data); void resolve(data); } }} />
          <Pressable onPress={() => setCameraOpen(false)} style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 8 }}><Ionicons name="close" size={20} color="#202735" /></Pressable>
        </View> : <Pressable style={[styles.outline,{borderColor:theme.color}]} onPress={async () => { if (!cameraPermission?.granted) { const result = await requestCameraPermission(); if (!result.granted) { Alert.alert('Camera permission needed', 'Allow camera access to scan Wantiss QR codes. You can still paste a QR token below.'); return; } } setCameraOpen(true); }}><Ionicons name="camera-outline" size={18} color={theme.color}/><Text style={[styles.outlineText,{color:theme.color}]}>Open camera scanner</Text></Pressable>}
        <TextInput value={tokenInput} onChangeText={setTokenInput} placeholder="Paste QR token or link" autoCapitalize="none" autoCorrect={false} style={styles.input}/><Pressable style={[styles.outline,{borderColor:theme.color}]} onPress={resolve} disabled={resolving}>{resolving ? <ActivityIndicator color={theme.color}/> : <Ionicons name="scan-outline" size={18} color={theme.color}/>}<Text style={[styles.outlineText,{color:theme.color}]}>Resolve QR</Text></Pressable>
        {resolved ? <View style={styles.recipient}><Text style={styles.sectionTitle}>{resolved.destination==='vendor-shop'?'Shop found':resolved.destination==='wallet-receive'?'Recipient confirmed':'Wantiss profile found'}</Text><Text style={styles.recipientName}>{resolved.display_name ?? resolved.shop_name ?? 'Wantiss account'}</Text>{resolved.wantiss_number ? <Text style={styles.muted}>Wantiss ID: {resolved.wantiss_number}</Text>:null}{resolved.vendor_id ? <Text style={styles.muted}>Vendor ID: {resolved.vendor_id}</Text>:null}
          {resolved.qr_type==='wallet_receive' ? <><TextInput value={amount} onChangeText={setAmount} placeholder="Amount (USD)" keyboardType="decimal-pad" style={styles.input}/><Pressable disabled={paying} style={[styles.primary,{backgroundColor:theme.color,opacity: paying ? 0.6 : 1}]} onPress={pay}>{paying?<ActivityIndicator color="#FFF"/>:<Ionicons name="send" size={17} color="#FFF"/>}<Text style={styles.primaryText}>{paying?'Processing…':'Pay me'}</Text></Pressable></>:null}
        </View>:null}
      </View>
    </ScrollView></View>;
}
function makeRequestId() {
  // Per-confirmation idempotency key; server rejects replays and checks balance atomically.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:'#F7F8FA'},header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:14,borderBottomWidth:1,borderBottomColor:'#ECEEF2',backgroundColor:'#FFF'},back:{width:38,height:38,alignItems:'center',justifyContent:'center'},headerTitle:{fontSize:17,fontWeight:'700',color:'#202735',marginLeft:6},content:{padding:16,paddingBottom:38,gap:14},hero:{borderRadius:22,borderWidth:1,padding:18,alignItems:'center'},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.3,alignSelf:'flex-start'},title:{fontSize:24,fontWeight:'800',color:'#202735',marginTop:8},subtitle:{fontSize:13,color:'#707887',textAlign:'center',marginTop:5,lineHeight:19},qrFrame:{backgroundColor:'#FFF',padding:14,borderRadius:18,marginTop:20,minHeight:236,minWidth:236,alignItems:'center',justifyContent:'center'},caption:{fontSize:12,color:'#6D7582',textAlign:'center',marginTop:14,lineHeight:18},primary:{minHeight:46,borderRadius:13,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,marginTop:18,width:'100%'},primaryText:{fontSize:14,fontWeight:'700',color:'#FFF'},security:{fontSize:11,color:'#858B96',textAlign:'center',lineHeight:17,paddingHorizontal:12},infoCard:{padding:16,borderRadius:16,backgroundColor:'#FFF'},infoTitle:{fontSize:14,fontWeight:'700',color:'#222B39'},readableId:{fontSize:20,fontWeight:'800',color:'#BF008E',letterSpacing:1.2,marginTop:7},infoBody:{fontSize:12,color:'#707887',lineHeight:18,marginTop:5},scannerCard:{padding:16,borderRadius:18,backgroundColor:'#FFF',gap:10},sectionTitle:{fontSize:16,fontWeight:'800',color:'#202735'},muted:{fontSize:12,color:'#747C8B',lineHeight:18},input:{minHeight:46,borderWidth:1,borderColor:'#E1E5EB',borderRadius:12,paddingHorizontal:13,fontSize:14,color:'#202735',backgroundColor:'#FFF'},outline:{minHeight:44,borderWidth:1.3,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},outlineText:{fontSize:13,fontWeight:'700'},recipient:{borderTopWidth:1,borderTopColor:'#ECEEF2',paddingTop:14,marginTop:4,gap:8},recipientName:{fontSize:18,fontWeight:'800',color:'#202735'}
});