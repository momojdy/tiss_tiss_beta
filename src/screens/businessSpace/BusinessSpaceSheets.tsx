import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

import { Feature, FX, FM, LIGHT, useTheme, useS, money, iso, parseISO, addDays, initials, errText, uuid, PayRule, STATUS_UI, MAX_BUSINESSES, LANGUAGES, customRange, rpc, useQ, useApp, ArgCtx, useArg, useAct, Icon, Btn, Chips, Toggle, Field, Skel, ErrBox, Avatar, Row, Divided, SheetShell, DateField, Wrap, q } from "./BusinessSpaceShared";

export function ProfileSheet() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz;
  const open = (page: string) => app.go(page);
  const R = (title: string, sub: string | undefined, on: () => void) => <Row title={title} sub={sub} onPress={on} right={<Icon name="chevron-right" size={18} color={t.mute} />} />;
  return (
    <SheetShell title="Profile" onClose={app.closeSheet} tall>
      <View style={[s.row, { paddingBottom: 10 }]}><Avatar text={initials(app.name || app.email)} size={52} radius={17} /><View style={s.g}><Text style={[s.rt, { fontSize: 16 }]}>{app.name || 'Your account'}</Text><Text style={s.mut}>{app.email}</Text></View></View>
      <View style={[s.card, s.row, { padding: 12, marginBottom: 6 }]}><Avatar text={initials(b.name)} size={34} logo={b.logo_url} radius={10} /><View style={s.g}><Text style={s.rt}>{b.name}</Text><Text style={s.mut}>{b.role === 'owner' ? 'Owner' : b.role} · {STATUS_UI[b.verification].label}</Text></View><Btn small kind="soft" label="Switch" onPress={() => app.sheet('switch')} /></View>
      <Divided>
        {R('Business information', 'Name, logo, contact, hours', () => open('businessInfo'))}
        {R('Business registration', 'Optional · earns the Verified badge', () => open('registration'))}
        {R('Manage features', 'Activate, deactivate, add listings', () => app.panel('features', true))}
        {R('Promotions', 'Vouchers and offers', () => open('promotions'))}
        {R('Activity log', 'Every change, recorded', () => open('audit'))}
        {R('Security and privacy', 'Password, 2-step, devices, your data', () => open('security'))}
        {R('Language', app.lang, () => app.sheet('language'))}
        {R('Help and support', undefined, () => open('help'))}
        <Row title="Push notifications" right={<Toggle value={app.pref.push} onValueChange={(v: boolean) => app.setPref({ ...app.pref, push: v })} />} />
        <Row title="Email notifications" sub="Separate from push" right={<Toggle value={app.pref.email} onValueChange={(v: boolean) => app.setPref({ ...app.pref, email: v })} />} />
        <Row title="Dark mode" right={<Toggle value={app.dark} onValueChange={app.setDark} />} />
      </Divided>
      <View style={[s.row, { marginTop: 14 }]}><Btn style={{ flex: 1 }} label="Switch to Buyer" onPress={app.onBuyer} /><Btn style={{ flex: 1 }} kind="soft" label="Sign out" onPress={app.onSignOut} /></View>
    </SheetShell>
  );
}
export function SwitchSheet() {
  const app = useApp(), s = useS(), t = useTheme(), full = app.bizList.length >= MAX_BUSINESSES;
  return (
    <SheetShell title="Switch business" onClose={app.closeSheet}>
      <Divided>
        {app.bizList.map(x => <Row key={x.id} onPress={() => app.selectBiz(x.id)} left={<Avatar text={initials(x.name)} size={36} logo={x.logo_url} radius={10} />} title={x.name} sub={STATUS_UI[x.verification].label} right={x.id === app.biz.id ? <Icon name="check" size={20} color={t.blue} /> : null} />)}
        <Row onPress={() => (full ? app.toast(`You can have up to ${MAX_BUSINESSES} businesses`) : app.sheet('addBusiness'))} left={<View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', opacity: full ? 0.5 : 1 }}><Icon name="plus" size={22} color={t.blue} /></View>} title="Add business" sub={`${app.bizList.length} of ${MAX_BUSINESSES} used`} />
      </Divided>
    </SheetShell>
  );
}
export function AddBusinessSheet() {
  const app = useApp(), a = useAct(), [name, setName] = useState('');
  const create = async () => {
    if (app.bizList.length >= MAX_BUSINESSES) { app.toast(`You can have up to ${MAX_BUSINESSES} businesses`); return; }
    const ok = await a.run(async () => { const id = await rpc<string>('create_business', { p_name: name.trim() }); app.reloadBiz(); app.selectBiz(id); }, `${name.trim()} added`);
    if (ok) app.closeSheet();
  };
  return <SheetShell title="Add business" onClose={app.closeSheet}><Field label="Business name" value={name} onChangeText={setName} placeholder="e.g. Marie's Kitchen" autoFocus /><Btn style={{ marginTop: 16 }} label="Create business" disabled={name.trim().length < 2} busy={a.busy} onPress={create} /></SheetShell>;
}
export function DeleteBusinessSheet() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), b = app.biz, last = app.bizList.length === 1;
  const chk = useQ(() => rpc<{ blockers: string[] }>('delete_business_check', { p_business: b.id }), [b.id]);
  const [txt, setTxt] = useState('');
  const blockers = chk.d?.blockers ?? [];
  const del = async () => {
    const ok = await a.run(async () => { await rpc('delete_business', { p_business: b.id, p_confirm: txt.trim() }); }, 'Business deleted');
    if (ok) { app.closeSheet(); app.reloadBiz(); if (last) app.onBuyer(); }
  };
  return (
    <SheetShell title="Delete business" onClose={app.closeSheet}>
      {chk.e ? <ErrBox e={chk.e} retry={chk.reload} /> : chk.l && !chk.d ? <Skel h={80} /> : blockers.length ? (
        <View style={{ gap: 8 }}><Text style={s.rt}>Resolve these first</Text>{blockers.map(x => <View key={x} style={[s.row, { alignItems: 'flex-start' }]}><Icon name="alert-circle-outline" size={18} color={t.bad} /><Text style={[s.mut, { flex: 1 }]}>{x}</Text></View>)}</View>
      ) : (
        <View>
          <Text style={s.mut}>{b.name} will be removed, its listings taken down, and its owner access ended. Financial records are kept as the law requires.{last ? ' This is your only business, so you will return to the buyer experience.' : ''}</Text>
          <Field label={`Type "${b.name}" to confirm`} value={txt} onChangeText={setTxt} autoCapitalize="none" />
          <Btn style={{ marginTop: 14 }} kind="danger" label="Delete business" disabled={txt.trim() !== b.name} busy={a.busy} onPress={del} />
        </View>
      )}
    </SheetShell>
  );
}
export function LanguageSheet() {
  const app = useApp(), t = useTheme();
  return <SheetShell title="Language" onClose={() => app.sheet('profile')}><Divided>{LANGUAGES.map(l => <Row key={l} onPress={() => { app.setLang(l); app.sheet('profile'); app.toast(`Language set to ${l}`); }} title={l} right={app.lang === l ? <Icon name="check" size={20} color={t.blue} /> : null} />)}</Divided></SheetShell>;
}
export function CustomRangeSheet() {
  const app = useApp(), s = useS();
  const [from, setFrom] = useState(app.range.key === 'custom' ? app.range.from : iso(addDays(new Date(), -13))), [to, setTo] = useState(app.range.key === 'custom' ? app.range.to : iso(new Date()));
  const preset = (k: string) => { const t0 = new Date(); if (k === 'm') { setFrom(iso(new Date(t0.getFullYear(), t0.getMonth(), 1))); setTo(iso(t0)); } else if (k === 'lm') { setFrom(iso(new Date(t0.getFullYear(), t0.getMonth() - 1, 1))); setTo(iso(new Date(t0.getFullYear(), t0.getMonth(), 0))); } else if (k === 'y') { setFrom(iso(new Date(t0.getFullYear(), 0, 1))); setTo(iso(t0)); } else { setFrom(iso(addDays(t0, -13))); setTo(iso(t0)); } };
  const apply = () => {
    if (from > to) { app.toast('The start date must be before the end date'); return; }
    if (to > iso(new Date())) { app.toast('The end date cannot be in the future'); return; }
    if ((parseISO(to).getTime() - parseISO(from).getTime()) / 864e5 > 730) { app.toast('Ranges are limited to 2 years'); return; }
    app.setRange(customRange(from, to)); app.closeSheet();
  };
  return (
    <SheetShell title="Custom range" onClose={app.closeSheet}>
      <Chips items={[{ k: 'm', l: 'This month' }, { k: 'lm', l: 'Last month' }, { k: 'y', l: 'Year to date' }, { k: '14', l: 'Last 14 days' }]} value="" onChange={preset} />
      <View style={[s.row, { marginTop: 8, alignItems: 'flex-start' }]}><View style={s.g}><Text style={s.label}>From</Text><DateField type="date" value={from} onChange={setFrom} /></View><View style={s.g}><Text style={s.label}>To</Text><DateField type="date" value={to} onChange={setTo} /></View></View>
      <Btn style={{ marginTop: 16 }} label="Apply range" onPress={apply} />
    </SheetShell>
  );
}
export function StockSheet() {
  const app = useApp(), s = useS(), a = useAct(), l = useArg() as any;
  const vars = useQ(() => q<any[]>(supabase.from('listing_variants').select('id,name,value,stock').eq('listing_id', l.id)), [l.id]);
  const [target, setTarget] = useState(''), [delta, setDelta] = useState(''), [reason, setReason] = useState('Restock');
  const cur = target ? vars.d?.find(v => v.id === target)?.stock : l.stock, d = parseInt(delta, 10);
  return (
    <SheetShell title="Adjust stock" onClose={app.closeSheet}>
      <Text style={s.rt}>{l.title}</Text>
      {(vars.d ?? []).length ? <View style={{ marginTop: 10 }}><Wrap items={[{ id: '', n: 'Whole item' }, ...(vars.d ?? []).map(v => ({ id: v.id, n: `${v.name}: ${v.value}` }))].map(x => x.n)} value={target ? (vars.d ?? []).filter(v => v.id === target).map(v => `${v.name}: ${v.value}`)[0] : 'Whole item'} onChange={(n: string) => { const v = (vars.d ?? []).find(x => `${x.name}: ${x.value}` === n); setTarget(v ? v.id : ''); }} /></View> : null}
      <Text style={[s.mut, { marginTop: 10 }]}>{cur == null ? 'Stock is not tracked for this item.' : `In stock now: ${cur}`}</Text>
      <Field label="Change (use a minus to remove)" keyboardType="numbers-and-punctuation" value={delta} onChangeText={setDelta} />
      <Text style={s.label}>Reason</Text><Wrap items={['Restock', 'Count correction', 'Damaged or lost', 'Returned to stock', 'Sold elsewhere']} value={reason} onChange={setReason} />
      <Btn style={{ marginTop: 16 }} label="Save adjustment" busy={a.busy} disabled={cur == null || !d || cur + d < 0} onPress={async () => { if (await a.run(() => rpc('adjust_stock', { p_listing: l.id, p_variant: target || null, p_delta: d, p_reason: reason }), 'Stock updated')) app.closeSheet(); }} />
    </SheetShell>
  );
}
export function RefundSheet() {
  const app = useApp(), s = useS(), a = useAct(), o = useArg() as any, max = Number(o.amount) - Number(o.refunded), key = useRef(uuid()), [amt, setAmt] = useState(max.toFixed(2));
  const v = parseFloat(amt);
  return (
    <SheetShell title={`Refund ${o.customer_name ?? 'order'}`} onClose={app.closeSheet}>
      <Text style={s.mut}>Up to {money(max)}. The platform fee is returned in proportion.</Text>
      <Field keyboardType="decimal-pad" value={amt} onChangeText={setAmt} />
      <Btn style={{ marginTop: 16 }} label="Confirm refund" busy={a.busy} disabled={!(v > 0) || v > max} onPress={async () => { if (await a.run(() => rpc('refund_order', { p_order: o.id, p_amount: v, p_key: key.current }), 'Refund issued')) app.closeSheet(); }} />
    </SheetShell>
  );
}
export function PromoSheet() {
  const app = useApp(), s = useS(), a = useAct(), fk = app.meta.feats.map(f => f.feature), [title, setTitle] = useState(''), [feat, setFeat] = useState(fk[0] ?? ''), [d, setD] = useState('10');
  return (
    <SheetShell title="Create promotion" onClose={app.closeSheet}>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Text style={s.label}>Feature</Text><Wrap items={fk.map(k => FX.FM[k]?.name)} value={FX.FM[feat]?.name} onChange={(n: string) => setFeat(fk.find(k => FX.FM[k]?.name === n) ?? feat)} />
      <Field label="Discount %" keyboardType="number-pad" value={d} onChangeText={setD} />
      <Btn style={{ marginTop: 16 }} label="Submit for review" busy={a.busy} disabled={title.trim().length < 3 || !feat || !(+d > 0 && +d <= 90)} onPress={async () => { if (await a.run(async () => { await q(supabase.from('promotions').insert({ business_id: app.biz.id, funded_by: 'vendor', status: 'in_review', feature: feat, title: title.trim(), discount_text: `${d}% off` })); }, 'Submitted for review')) app.closeSheet(); }} />
    </SheetShell>
  );
}
export function PayoutSetupSheet() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), p = app.meta.payout;
  const start = () => a.run(async () => {
    const { data, error } = await supabase.functions.invoke('payout-onboarding', { body: { business_id: app.biz.id, return_url: `${APP_URL}/business/payouts` } });
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error ?? 'Could not start payout setup');
    await WebBrowser.openBrowserAsync(data.url);
    app.bump();
  });
  return (
    <SheetShell title="Set up payouts" onClose={app.closeSheet}>
      {app.biz.verification === 'restricted' ? <Text style={s.mut}>Payouts are paused while your business is restricted.</Text>
        : p?.status === 'verified' ? <View style={{ gap: 12 }}><View style={s.card}><Text style={s.rt}>Bank account ending {p.last4}</Text><Text style={s.mut}>Verified by our payment partner</Text></View><Btn kind="soft" label="Change payout method" busy={a.busy} onPress={start} /></View>
          : p ? <View style={{ gap: 12 }}><View style={{ backgroundColor: t.soft, borderRadius: 12, padding: 12 }}><Text style={{ color: t.blue, fontWeight: '600' }}>Our payment partner is verifying your details.</Text></View><Btn kind="soft" label="Continue setup" busy={a.busy} onPress={start} /></View>
            : <View style={{ gap: 12 }}><Text style={s.mut}>You finish on our payment partner's secure page. Wantiss never sees or stores your bank details.</Text><Btn label="Continue to secure setup" busy={a.busy} onPress={start} /></View>}
    </SheetShell>
  );
}
export function PayoutRequestSheet() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz, rules = app.meta.rules, payOK = app.meta.payout?.status === 'verified', min = app.meta.minWithdrawal;
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: b.id, p_from: app.range.from, p_to: app.range.to, p_feature: null }), [b.id]);
  const usage = useQ(() => rpc<Record<string, number>>('payout_usage', { p_business: b.id }), [b.id]);
  const avail = Number(sum.d?.available ?? 0);
  const [m, setM] = useState(payOK ? 'std' : 'wal'), [amt, setAmt] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), key = useRef(uuid());
  useEffect(() => { if (sum.d && !amt) setAmt(Number(sum.d.available ?? 0).toFixed(2)); }, [sum.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const rule = rules.find(r => r.method === m) ?? rules[0], used = Number(usage.d?.[m] ?? 0), left = rule.cap ? rule.cap - used : Infinity, v = parseFloat(amt), fee = rule.fee && v > 0 ? Math.round(v * rule.fee * 100) / 100 : 0;
  const err = rule.needs_bank && !payOK ? 'Set up a payout method first' : !(v >= min) ? `Minimum withdrawal is ${money(min)}` : v > avail ? 'Above your available balance' : v > left ? `Above your limit. You can withdraw ${money(Math.max(0, left))} more` : '';
  const info = (r: PayRule) => [r.cap ? `Up to ${money(r.cap).replace('.00', '')}${r.window_days === 7 ? ' every 7 days' : ' per day'} · ${money(Math.max(0, r.cap - Number(usage.d?.[r.method] ?? 0))).replace('.00', '')} left` : 'No limit', r.eta, r.fee ? `${(r.fee * 100).toFixed(1).replace('.0', '')}% fee` : ''].filter(Boolean).join(' · ');
  const send = async () => {
    if (err || busy) { if (err) app.toast(err); return; }
    setBusy(true); setNote('');
    try { await rpc('request_payout', { b: b.id, amt: v, key: key.current, method: m }); app.closeSheet(); app.toast(m === 'wal' ? 'Sent to your Wantiss wallet' : 'Payout requested'); app.bump(); }
    catch (e) { const x = errText(e); setNote(/fetch|network|timeout/i.test(x) ? 'The request may not have finished. Check payout history. Retrying is safe and will not pay twice.' : x); setBusy(false); }
  };
  return (
    <SheetShell title="Request payout" onClose={app.closeSheet} tall>
      <Text style={s.mut}>Available {money(avail)}. Pending funds cannot be withdrawn.</Text>
      <Text style={s.label}>Send to</Text>
      <Divided>{rules.map(r => { const dis = r.needs_bank && !payOK; return <Row key={r.method} onPress={() => (dis ? app.toast('Set up a payout method first') : setM(r.method))} title={r.name} sub={info(r)} right={<View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: m === r.method ? t.blue : t.line, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.4 : 1 }}>{m === r.method ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.blue }} /> : null}</View>} />; })}</Divided>
      <Field label="Amount" keyboardType="decimal-pad" value={amt} onChangeText={setAmt} />
      <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '600', color: err ? t.badFg : t.mute }}>{err || (v > 0 ? `You receive ${money(v - fee)}${fee ? ` after a ${money(fee)} fee` : ''}${rule.eta ? ` · ${rule.eta}` : ''}` : '')}</Text>
      {note ? <Text style={{ color: t.badFg, fontSize: 12, marginTop: 6 }}>{note}</Text> : null}
      <Btn style={{ marginTop: 14 }} label={`Confirm payout${v > 0 ? ` of ${money(v)}` : ''}`} busy={busy} disabled={!!err} onPress={send} />
    </SheetShell>
  );
}
export function PasswordSheet() {
  const app = useApp(), a = useAct(), [pw, setPw] = useState(''), [pw2, setPw2] = useState('');
  const bad = pw.length < 8 ? 'Use at least 8 characters' : pw !== pw2 ? 'Passwords do not match' : '';
  return (
    <SheetShell title="Change password" onClose={() => app.closeSheet()}>
      <Field label="New password" secureTextEntry value={pw} onChangeText={setPw} autoCapitalize="none" /><Field label="Confirm new password" secureTextEntry value={pw2} onChangeText={setPw2} autoCapitalize="none" />
      {pw && bad ? <Text style={{ color: LIGHT.badFg, fontSize: 12, marginTop: 6 }}>{bad}</Text> : null}
      <Btn style={{ marginTop: 16 }} label="Update password" busy={a.busy} disabled={!!bad} onPress={async () => { if (await a.run(async () => { const { error } = await supabase.auth.updateUser({ password: pw }); if (error) throw error; }, 'Password updated')) app.closeSheet(); }} />
    </SheetShell>
  );
}
export function MfaSheet() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct();
  const [f, setF] = useState<any>(null), [code, setCode] = useState(''), [err, setErr] = useState('');
  useEffect(() => { (async () => { const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' }); if (error) setErr(error.message); else setF(data); })(); }, []);
  const xml = f?.totp?.qr_code ? (String(f.totp.qr_code).startsWith('data:') ? decodeURIComponent(String(f.totp.qr_code).split(',')[1]) : f.totp.qr_code) : null;
  const verify = () => a.run(async () => {
    const ch = await supabase.auth.mfa.challenge({ factorId: f.id }); if (ch.error) throw ch.error;
    const v = await supabase.auth.mfa.verify({ factorId: f.id, challengeId: ch.data.id, code }); if (v.error) throw v.error;
  }, 'Two-step verification on').then(ok => { if (ok) app.closeSheet(); });
  return (
    <SheetShell title="Two-step verification" onClose={app.closeSheet}>
      {err ? <Text style={{ color: t.badFg }}>{err}</Text> : !f ? <Skel h={160} /> : (
        <View style={{ gap: 10, alignItems: 'center' }}>
          <Text style={[s.mut, { alignSelf: 'flex-start' }]}>Scan with an authenticator app, or enter the key.</Text>
          {xml ? <SvgXml xml={xml} width={170} height={170} /> : null}
          <Text selectable style={{ color: t.ink, fontWeight: '700', letterSpacing: 1 }}>{f.totp.secret}</Text>
          <Field style={{ width: 200, textAlign: 'center', letterSpacing: 4 }} keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} placeholder="6-digit code" />
          <Btn style={{ alignSelf: 'stretch' }} label="Turn on" busy={a.busy} disabled={code.length !== 6} onPress={verify} />
        </View>
      )}
    </SheetShell>
  );
}
export function SheetHost({ sheet }: { sheet: { name: string; arg?: any } | null }) {
  if (!sheet) return null;
  const map: Record<string, React.ReactNode> = { profile: <ProfileSheet />, switch: <SwitchSheet />, addBusiness: <AddBusinessSheet />, delete: <DeleteBusinessSheet />, language: <LanguageSheet />, custom: <CustomRangeSheet />, stock: <StockSheet />, refund: <RefundSheet />, promo: <PromoSheet />, payout: <PayoutSetupSheet />, request: <PayoutRequestSheet />, password: <PasswordSheet />, mfa: <MfaSheet /> };
  return <ArgCtx.Provider value={sheet.arg}>{map[sheet.name] ?? null}</ArgCtx.Provider>;
}