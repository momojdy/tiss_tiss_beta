import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, G, Line, Polyline, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import * as Device from 'expo-device';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';

import { useTheme, useS, money, ago, initials, uuid, Status, DAYS, defaultHours, COUNTRIES, flagOf, countryOf, rpc, useQ, publicUrl, useApp, useAct, Icon, Btn, Pill, StatusPill, Toggle, Section, Field, Empty, Skel, ErrBox, Loading, Avatar, FIcon, Row, Divided, Pg, DateField, Wrap, Checklist, q } from "./BusinessSpaceShared";

export function PromotionsPage() {
  const app = useApp(), s = useS(), a = useAct();
  const p = useQ(() => q<any[]>(supabase.from('promotions').select('*').eq('business_id', app.biz.id).order('id', { ascending: false })), [app.biz.id, app.tick]);
  const tone = (st: string) => (st === 'active' ? 'good' : st === 'ended' ? 'mute' : 'warn');
  return (
    <Pg title="Promotions" onBack={app.back} refreshing={p.l && !!p.d} onRefresh={app.bump} right={app.meta.feats.length ? <Btn small label="Create" onPress={() => app.sheet('promo')} /> : null}>
      {p.e ? <ErrBox e={p.e} retry={p.reload} /> : p.l && !p.d ? <Loading /> : (p.d ?? []).length ? <View style={s.cardFlat}><Divided>{(p.d ?? []).map(x => (
        <Row key={x.id} left={<FIcon k={x.feature ?? 'goodies'} />} title={x.title} sub={`${x.funded_by === 'platform' ? 'Platform-funded' : 'Vendor-funded'} · ${x.discount_text ?? ''}`} sub2={`${x.redemptions} redemptions${Number(x.vendor_cost) > 0 ? ` · cost to you ${money(x.vendor_cost)}` : ''}`}
          right={<View style={{ alignItems: 'flex-end', gap: 6 }}><Pill tone={tone(x.status)}>{String(x.status).replace('_', ' ')}</Pill>{x.funded_by === 'vendor' && (x.status === 'active' || x.status === 'paused') ? <Pressable disabled={a.busy} onPress={() => a.run(() => rpc('set_promotion_status', { p_id: x.id, p_status: x.status === 'paused' ? 'active' : 'paused' }))}><Text style={s.link}>{x.status === 'paused' ? 'Resume' : 'Pause'}</Text></Pressable> : null}</View>} />))}</Divided></View>
        : <View style={s.card}><Empty icon="tag-outline" title="No promotions yet" hint={app.meta.feats.length ? 'Create a voucher or offer.' : 'Activate a feature first.'} cta={app.meta.feats.length ? 'Create promotion' : 'Explore features'} onCta={() => (app.meta.feats.length ? app.sheet('promo') : app.go('explore'))} /></View>}
    </Pg>
  );
}

/* ---------- registration (optional business verification) ---------- */
export function RegistrationPage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), b = app.biz;
  const r = useQ(() => rpc<any[]>('feature_requirements_status', { p_business: b.id, p_feature: '_business' }), [b.id, app.tick]);
  const rows = r.d ?? [], can = b.verification === 'setup' || b.verification === 'action';
  const msg: Record<Status, string> = { verified: 'Your business is verified.', pending: 'Your documents are in review. This usually takes 1 to 2 business days.', setup: 'Registration is optional and earns the Verified badge.', action: 'A document needs your attention. Replace it and resubmit.', restricted: 'Some actions are paused on this business.' };
  const upload = async (x: any) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const f: any = res.assets[0];
    if (f.size && f.size > 15 * 1024 * 1024) { app.toast('File must be under 15 MB'); return; }
    await a.run(async () => {
      const b64 = await FileSystem.readAsStringAsync(f.uri, { encoding: FileSystem.EncodingType.Base64 });
      const path = `${b.id}/verification/${x.key}-${uuid()}-${String(f.name).replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('business-docs').upload(path, decode(b64), { contentType: f.mimeType ?? 'application/pdf' });
      if (error) throw error;
      await rpc('submit_requirement', { p_business: b.id, p_requirement: x.id, p_file: path, p_declared: false });
    }, 'Uploaded');
  };
  const pill = (st: string) => st === 'approved' ? <Pill tone="good">Approved</Pill> : st === 'submitted' ? <Pill tone="warn">Uploaded</Pill> : st === 'rejected' ? <Pill tone="bad">Rejected</Pill> : <Pill tone="mute">Missing</Pill>;
  const uploaded = rows.some(x => x.status === 'submitted'), stuck = rows.some(x => x.status === 'rejected');
  return (
    <Pg title="Business registration" onBack={app.back} refreshing={r.l && !!r.d} onRefresh={app.bump}>
      <View style={s.row}><StatusPill s={b.verification} /></View>
      <View style={{ backgroundColor: b.verification === 'restricted' || b.verification === 'action' ? t.badBg : t.soft, borderRadius: 12, padding: 12 }}><Text style={{ color: b.verification === 'restricted' || b.verification === 'action' ? t.badFg : t.blue, fontWeight: '600', lineHeight: 20 }}>{msg[b.verification]}</Text></View>
      <View style={s.cardFlat}>
        <Text style={[s.title, { paddingTop: 14 }]}>Documents</Text>
        {r.e ? <View style={{ paddingVertical: 12 }}><ErrBox e={r.e} retry={r.reload} /></View> : r.l && !r.d ? <View style={{ paddingVertical: 12 }}><Skel h={120} /></View> : rows.length ? (
          <Divided>{rows.map(x => <Row key={x.id} title={x.label} sub={x.file ? String(x.file).split('/').pop() : 'PDF or photo, up to 15 MB'} sub2={x.reason} right={<View style={{ alignItems: 'flex-end', gap: 6 }}>{pill(x.status)}{can && (x.status === 'missing' || x.status === 'rejected' || x.status === 'submitted') ? <Btn small kind="soft" label={x.status === 'missing' ? 'Upload' : 'Replace'} busy={a.busy} onPress={() => upload(x)} /> : null}</View>} />)}</Divided>
        ) : <Empty icon="file-document-outline" title="No documents required" />}
        {can && rows.length ? <View style={{ paddingVertical: 14 }}><Btn label={b.verification === 'action' ? 'Resubmit for review' : 'Submit for review'} disabled={!uploaded || stuck} busy={a.busy} onPress={() => a.run(() => rpc('submit_verification', { p_business: b.id, p_documents: {} }), 'Submitted for review')} /></View> : null}
        {b.verification === 'restricted' ? <View style={{ paddingVertical: 14 }}><Btn label="Contact support" onPress={() => app.go('help')} /></View> : null}
      </View>
      {b.verification === 'verified' || b.verification === 'pending' ? null : <Checklist />}
    </Pg>
  );
}

/* ---------- audit log, help, security ---------- */
export function AuditPage() {
  const app = useApp(), s = useS();
  const l = useQ(() => q<any[]>(supabase.from('audit_log').select('id,action,meta,at').eq('business_id', app.biz.id).order('at', { ascending: false }).limit(80)), [app.biz.id, app.tick]);
  return (
    <Pg title="Activity log" onBack={app.back} refreshing={l.l && !!l.d} onRefresh={app.bump}>
      {l.e ? <ErrBox e={l.e} retry={l.reload} /> : l.l && !l.d ? <Loading /> : (l.d ?? []).length ? <View style={s.cardFlat}><Divided>{(l.d ?? []).map(x => <Row key={x.id} title={x.meta?.title ?? String(x.action).replace(/_/g, ' ')} sub={ago(x.at)} />)}</Divided></View> : <View style={s.card}><Empty icon="history" title="Nothing logged yet" /></View>}
    </Pg>
  );
}
const SUPPORT_EMAIL = (process.env as any).EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@wantiss.com';
export function HelpPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const cats = ['Account and registration', 'Listings and publishing', 'Orders and bookings', 'Payments and payouts', 'Refunds and disputes', 'Promotions and vouchers', 'Technical problems'];
  const mail = (c: string) => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${c} · ${app.biz.name}`)}&body=${encodeURIComponent(`\n\nBusiness reference: ${app.biz.id}`)}`).catch(() => app.toast('No email app found'));
  return <Pg title="Help and support" onBack={app.back}><View style={s.cardFlat}><Divided>{cats.map(c => <Row key={c} title={c} sub="Opens an email with your business reference" onPress={() => mail(c)} right={<Icon name="chevron-right" size={18} color={t.mute} />} />)}</Divided></View></Pg>;
}
export function SecurityPage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct();
  const f = useQ(async () => { const { data, error } = await supabase.auth.mfa.listFactors(); if (error) throw error; return (data?.totp ?? []).filter((x: any) => x.status === 'verified'); }, [app.tick]);
  const factor = (f.d ?? [])[0];
  return (
    <Pg title="Security and privacy" onBack={app.back}>
      <View style={s.cardFlat}><Divided>
        <Row title="Change password" onPress={() => app.sheet('password')} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
        <Row title="Two-step verification" sub={f.l && !f.d ? 'Checking…' : factor ? 'On · authenticator app' : 'Add a second check when you sign in'} right={<Toggle value={!!factor} onValueChange={(v: boolean) => { if (v) app.sheet('mfa'); else if (factor) Alert.alert('Turn off two-step verification?', undefined, [{ text: 'Keep on', style: 'cancel' }, { text: 'Turn off', style: 'destructive', onPress: () => a.run(async () => { const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id }); if (error) throw error; f.reload(); }, 'Two-step verification off') }]); }} />} />
        <Row title="Sign out of other devices" onPress={() => Alert.alert('Sign out everywhere else?', 'Other devices will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => a.run(async () => { const { error } = await supabase.auth.signOut({ scope: 'others' }); if (error) throw error; }, 'Other devices signed out') }])} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
      </Divided></View>
      <Section title="Your data" />
      <View style={s.cardFlat}><Divided>
        <Row title="Download my data" sub="A copy of your account and business data" onPress={() => a.run(() => rpc('request_data_action', { p_kind: 'export' }), 'We will email you a download link')} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
        <Row title={<Text style={{ color: t.badFg, fontWeight: '700' }}>Delete account</Text>} sub="Available once your orders and balances are settled" onPress={() => Alert.alert('Delete your account?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Request deletion', style: 'destructive', onPress: () => a.run(() => rpc('request_data_action', { p_kind: 'delete' }), 'Deletion request received') }])} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
      </Divided></View>
    </Pg>
  );
}

/* ---------- business information ---------- */
export function BusinessInfoPage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), b = app.biz;
  const [f, setF] = useState(() => ({ name: b.name, description: b.description ?? '', phone_country: b.phone_country ?? 'NG', phone: b.phone ?? '', email: b.email ?? '', website: b.website ?? '', address: b.address ?? '', city: b.city ?? '', country: b.country ?? 'NG', delivery_modes: b.delivery_modes ?? [], hours: (b.hours && Object.keys(b.hours).length ? b.hours : defaultHours()) as Record<string, any>, logo_url: b.logo_url, accept_scheduled_orders: !!b.accept_scheduled_orders, scheduled_order_start_minutes: Number(b.scheduled_order_start_minutes ?? 60) }));
  const [picker, setPicker] = useState<null | 'phone' | 'country'>(null), [cq, setCq] = useState('');
  const [vendorQr, setVendorQr] = useState<any>(null);
  useEffect(() => {
    let active = true;
    if (!b.is_live || b.verification === 'restricted') { setVendorQr(null); return () => { active = false; }; }
    void supabase.rpc('issue_qr_identity', { p_qr_type: 'vendor_shop', p_business_id: b.id }).then(({ data, error }) => {
      if (active && !error && data?.token) setVendorQr(data);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [b.id, b.is_live, b.verification]);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const logo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { app.toast('Allow photo access to choose a logo'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (r.canceled) return;
    await a.run(async () => {
      const m = await ImageManipulator.manipulateAsync(r.assets[0].uri, [{ resize: { width: 600 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
      const b64 = await FileSystem.readAsStringAsync(m.uri, { encoding: FileSystem.EncodingType.Base64 });
      const path = `${b.id}/logo/${uuid()}.jpg`;
      const { error } = await supabase.storage.from('listing-photos').upload(path, decode(b64), { contentType: 'image/jpeg' });
      if (error) throw error;
      set('logo_url', publicUrl(path));
    });
  };
  const save = () => {
    if (f.name.trim().length < 2) { app.toast('Enter your business name'); return; }
    if (f.phone && (f.phone.length < 6 || f.phone.length > 14)) { app.toast('Enter a valid phone number'); return; }
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) { app.toast('Enter a valid email'); return; }
    a.run(async () => { await q(supabase.from('businesses').update({ name: f.name.trim(), description: f.description || null, phone: f.phone || null, phone_country: f.phone_country, email: f.email || null, website: f.website || null, address: f.address || null, city: f.city || null, country: f.country, delivery_modes: f.delivery_modes, hours: f.hours, logo_url: f.logo_url, accept_scheduled_orders: !!f.accept_scheduled_orders, scheduled_order_start_minutes: Math.max(0, Number(f.scheduled_order_start_minutes) || 0) }).eq('id', b.id)); app.reloadBiz(); app.back(); }, 'Business information saved');
  };
  const pc = countryOf(f.phone_country), list = COUNTRIES.filter(c => !cq || `${c.name}${c.dial}${c.code}`.toLowerCase().includes(cq.toLowerCase()));
  const tfield = (k: string, label: string, extra: any = {}) => <Field label={label} value={(f as any)[k]} onChangeText={(v: string) => set(k, v)} {...extra} />;
  return (
    <>
      <Pg title="Business information" onBack={app.back}>
        <View style={[s.card, { gap: 12 }]}>
          <Text style={s.title}>Shop QR and Vendor ID</Text>
          <Text style={s.mut}>Keep this permanent ID for your business. Customers can scan the blue QR to open your public shop.</Text>
          <View style={[s.row, { alignItems: 'center', gap: 14 }]}>
            <View style={{ width: 104, height: 104, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7DDFB' }}>
              {vendorQr?.token ? <QRCode value={`wantiss://qr?token=${vendorQr.token}`} size={88} color="#397BC6" backgroundColor="#FFFFFF" /> : <Icon name="qrcode" size={46} color={t.mute} />}
            </View>
            <View style={s.g}>
              <Text style={s.label}>PERMANENT VENDOR ID</Text>
              <Text selectable style={{ color: t.ink, fontSize: 16, fontWeight: '800', letterSpacing: 0.6 }}>{b.vendor_id ?? 'Assigning Vendor ID…'}</Text>
              <Text style={[s.mut, { marginTop: 6 }]}>{vendorQr?.token ? 'Your shop QR is ready.' : b.is_live ? 'Shop QR is loading or unavailable.' : 'Publish your shop to activate its QR.'}</Text>
            </View>
          </View>
        </View>
        <View style={[s.card, s.row]}>
          <Pressable onPress={logo}><View><Avatar text={initials(f.name || 'B')} size={64} radius={18} logo={f.logo_url} /><View style={{ position: 'absolute', right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera-outline" size={14} color="#fff" /></View></View></Pressable>
          <View style={s.g}><Text style={s.rt}>Business logo</Text><Text style={s.mut}>Square image, shown on your listings and profile.</Text>{f.logo_url ? <Pressable onPress={() => set('logo_url', null)}><Text style={[s.link, { color: t.bad, marginTop: 4 }]}>Remove</Text></Pressable> : null}</View>
        </View>
        <View style={s.card}>
          {tfield('name', 'Business name *')}
          <Field label="Description" multiline value={f.description} onChangeText={(v: string) => set('description', v)} style={{ height: 90, paddingTop: 12, textAlignVertical: 'top' }} />
          <Text style={s.label}>Phone number</Text>
          <View style={[s.row, { gap: 8 }]}>
            <Pressable onPress={() => setPicker('phone')} style={[s.fld, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}><Text style={{ fontSize: 20 }}>{flagOf(pc.code)}</Text><Text style={{ color: t.ink, fontWeight: '700' }}>+{pc.dial}</Text><Icon name="chevron-down" size={14} color={t.mute} /></Pressable>
            <TextInput style={[s.fld, { flex: 1 }]} keyboardType="phone-pad" value={f.phone} placeholder="Phone number" placeholderTextColor={t.mute} onChangeText={v => set('phone', v.replace(/[^0-9]/g, ''))} />
          </View>
          {tfield('email', 'Business email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
          {tfield('website', 'Website (optional)', { keyboardType: 'url', autoCapitalize: 'none' })}
        </View>
        <View style={s.card}>
          <Text style={s.title}>Location</Text>
          {tfield('address', 'Street address')}{tfield('city', 'City')}
          <Text style={s.label}>Country</Text>
          <Pressable onPress={() => setPicker('country')} style={[s.fld, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}><Text style={{ fontSize: 20 }}>{flagOf(countryOf(f.country).code)}</Text><Text style={{ color: t.ink, flex: 1 }}>{countryOf(f.country).name}</Text><Icon name="chevron-down" size={14} color={t.mute} /></Pressable>
        </View>
        <View style={s.card}><Text style={s.title}>Fulfilment</Text><View style={{ marginTop: 10 }}><Wrap multi items={['Delivery', 'Pickup']} value={f.delivery_modes} onChange={(v: string[]) => set('delivery_modes', v)} /></View><View style={[s.row, { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.line }]}><View style={{ flex: 1, paddingRight: 12 }}><Text style={s.rt}>Accept scheduled orders while closed</Text><Text style={[s.mut, { marginTop: 4 }]}>Customers can place an order for a future opening-time slot. Orders must not be prepared until the scheduled time.</Text></View><Toggle value={!!f.accept_scheduled_orders} onValueChange={(v: boolean) => set('accept_scheduled_orders', v)} /></View>{f.accept_scheduled_orders ? <View style={{ marginTop: 12 }}><Text style={s.label}>Earliest order after opening (minutes)</Text><Text style={[s.mut, { marginBottom: 8 }]}>Example: open at 9:00 AM + 60 minutes means the first selectable order is 10:00 AM.</Text><TextInput style={s.fld} keyboardType="number-pad" value={String(f.scheduled_order_start_minutes)} onChangeText={(v: string) => set('scheduled_order_start_minutes', v.replace(/[^0-9]/g, ''))} placeholder="60 minutes" placeholderTextColor={t.mute} /></View> : null}</View>
        <View style={s.cardFlat}>
          <View style={[s.row, { paddingTop: 14 }]}><Text style={[s.title, { flex: 1 }]}>Opening hours</Text><Pressable onPress={() => { const m = f.hours.Monday; set('hours', Object.fromEntries(DAYS.map(d => [d, { ...m }]))); }}><Text style={s.link}>Copy Monday to all</Text></Pressable></View>
          <Divided>{DAYS.map(d => { const h = f.hours[d]; const up = (p: any) => set('hours', { ...f.hours, [d]: { ...h, ...p } }); return (
            <View key={d} style={[s.row, { paddingVertical: 9 }]}>
              <Text style={[s.rt, { width: 86 }]}>{d}</Text>
              {h.closed ? <Text style={[s.mut, { flex: 1 }]}>Closed</Text> : <View style={[s.row, { flex: 1, gap: 6 }]}><View style={{ flex: 1 }}><DateField type="time" value={h.open} onChange={(v: string) => up({ open: v })} /></View><Text style={s.mut}>–</Text><View style={{ flex: 1 }}><DateField type="time" value={h.close} onChange={(v: string) => up({ close: v })} /></View></View>}
              <Toggle value={!h.closed} onValueChange={() => up({ closed: !h.closed })} />
            </View>); })}</Divided>
        </View>
        <Btn label="Save changes" busy={a.busy} onPress={save} />
        <Btn kind="danger" label="Delete business" onPress={() => app.sheet('delete')} />
      </Pg>
      {picker ? (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 35, backgroundColor: t.bg, paddingTop: 60 }}>
          <View style={{ paddingHorizontal: 16, gap: 10, flex: 1 }}>
            <View style={s.row}><Text style={[s.h1, { flex: 1, fontSize: 20 }]}>{picker === 'phone' ? 'Country code' : 'Country'}</Text><Pressable onPress={() => { setPicker(null); setCq(''); }}><Icon name="close" size={24} /></Pressable></View>
            <TextInput style={s.fld} value={cq} onChangeText={setCq} placeholder="Search" placeholderTextColor={t.mute} autoFocus />
            <ScrollView keyboardShouldPersistTaps="handled">{list.map(c => <Pressable key={c.code} onPress={() => { set(picker === 'phone' ? 'phone_country' : 'country', c.code); setPicker(null); setCq(''); }} style={[s.ar, s.div]}><Text style={{ fontSize: 22 }}>{flagOf(c.code)}</Text><Text style={[s.rt, { flex: 1 }]}>{c.name}</Text>{picker === 'phone' ? <Text style={s.mut}>+{c.dial}</Text> : null}</Pressable>)}</ScrollView>
          </View>
        </View>
      ) : null}
    </>
  );
}

/* ---------- sheets ---------- */
const APP_URL = (process.env as any).EXPO_PUBLIC_APP_URL ?? 'https://app.wantiss.com';