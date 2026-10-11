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

import { FX, FM, useTheme, useS, ago, errText, rpc, useQ, useApp, useArg, Icon, Btn, Chips, Empty, Skel, ErrBox, Loading, Avatar, FIcon, Row, Divided, Pg } from "./BusinessSpaceShared";

export function MessagesPage() {
  const app = useApp(), s = useS(), t = useTheme(), [f, setF] = useState('All');
  const c = useQ(() => q<any[]>(supabase.from('conversations').select('*').eq('business_id', app.biz.id).order('id', { ascending: false }).limit(100)), [app.biz.id, app.tick]);
  const rows = (c.d ?? []).filter(x => f === 'All' || x.feature === f);
  return (
    <Pg title="Messages" onBack={app.back} refreshing={c.l && !!c.d} onRefresh={app.bump}>
      <Chips items={['All', ...app.meta.feats.map(x => x.feature)].map(k => ({ k, l: k === 'All' ? 'All' : FX.FM[k]?.name }))} value={f} onChange={setF} />
      {c.e ? <ErrBox e={c.e} retry={c.reload} /> : c.l && !c.d ? <Loading /> : rows.length ? (
        <View style={s.cardFlat}><Divided>{rows.map(x => <Row key={x.id} onPress={() => app.go('conversation', { id: x.id })} left={<Avatar text={(x.customer_name ?? '?')[0]} size={40} radius={20} bg={t.soft} />} title={x.customer_name ?? 'Customer'} sub={x.last_body ?? 'No messages yet'} sub2={`${x.feature ? FX.FM[x.feature]?.name : ''}${x.ref_label ? ` · ${x.ref_label}` : ''}`} right={x.unread_business > 0 ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{x.unread_business}</Text></View> : null} />)}</Divided></View>
      ) : <View style={s.card}><Empty icon="chat-outline" title="No conversations yet" hint="Customer messages about your listings and orders appear here." /></View>}
    </Pg>
  );
}
export function ConversationPage() {
  const app = useApp(), s = useS(), t = useTheme(), { id } = useArg() as { id: string };
  const [text, setText] = useState(''), [sending, setSending] = useState(false), ref = useRef<ScrollView>(null);
  const conv = useQ(() => q<any>(supabase.from('conversations').select('*').eq('id', id).single()), [id]);
  const ms = useQ(() => q<any[]>(supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')), [id, app.tick]);
  useEffect(() => { rpc('mark_conversation_read', { p_conv: id }).then(app.bump).catch(() => undefined); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    const body = text.trim(); if (!body || sending) return;
    setSending(true);
    try { await q(supabase.from('messages').insert({ conversation_id: id, sender_id: app.userId, body })); setText(''); ms.reload(); } catch (e) { app.toast(errText(e)); } finally { setSending(false); }
  };
  const c = conv.d;
  return (
    <Pg title={c?.customer_name ?? 'Conversation'} onBack={app.back} scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {c ? <Pressable onPress={() => c.feature && app.go('feature', { k: c.feature, focus: c.ref_id })} style={[s.card, { padding: 12, marginBottom: 10 }]}><Text style={s.mut}>About</Text><Text style={s.rt}>{c.ref_label ?? 'Conversation'}{c.feature ? ` · ${FX.FM[c.feature]?.name} ›` : ''}</Text></Pressable> : null}
        <ScrollView ref={ref} style={{ flex: 1 }} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {ms.e ? <ErrBox e={ms.e} retry={ms.reload} /> : ms.l && !ms.d ? <Loading n={3} h={44} /> : (ms.d ?? []).length ? (ms.d ?? []).map(m => { const mine = m.sender_id === app.userId; return <View key={m.id} style={{ maxWidth: '78%', alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? t.blue : t.chip, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 }}><Text style={{ color: mine ? '#fff' : t.ink, fontSize: 13 }}>{m.body}</Text></View>; }) : <Empty icon="message-text-outline" title="No messages yet" />}
        </ScrollView>
        <View style={[s.row, { paddingTop: 8 }]}><TextInput style={[s.fld, { flex: 1 }]} value={text} onChangeText={setText} placeholder="Write a reply" placeholderTextColor={t.mute} onSubmitEditing={send} returnKeyType="send" /><Btn label="Send" small busy={sending} disabled={!text.trim()} onPress={send} style={{ minHeight: 46 }} /></View>
      </KeyboardAvoidingView>
    </Pg>
  );
}

/* ---------- notifications ---------- */
function NotificationsPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const n = useQ(() => q<any[]>(supabase.from('notifications').select('*').eq('business_id', app.biz.id).order('created_at', { ascending: false }).limit(80)), [app.biz.id, app.tick]);
  const open = async (x: any) => {
    if (!x.read_at) { try { await rpc('mark_notification_read', { p_id: x.id }); app.bump(); } catch { /* read state is not critical */ } }
    const l = x.link ?? {};
    if (l.view === 'feat' && l.arg) app.go('feature', { k: l.arg }); else if (l.view === 'wallet') app.panel('payouts'); else if (l.view === 'onboard') app.go('registration'); else if (l.view === 'promo') app.go('promotions');
  };
  return (
    <Pg title="Notifications" onBack={app.back} refreshing={n.l && !!n.d} onRefresh={app.bump} right={app.meta.unreadN > 0 ? <Pressable onPress={async () => { try { await rpc('mark_notifications_read', { p_business: app.biz.id }); app.bump(); } catch (e) { app.toast(errText(e)); } }}><Text style={s.link}>Mark all as read</Text></Pressable> : null}>
      {n.e ? <ErrBox e={n.e} retry={n.reload} /> : n.l && !n.d ? <Loading /> : (n.d ?? []).length ? <View style={s.cardFlat}><Divided>{(n.d ?? []).map(x => <Row key={x.id} onPress={() => open(x)} left={x.feature ? <FIcon k={x.feature} /> : <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell-outline" size={18} color={t.blue} /></View>} title={x.title} sub={ago(x.created_at)} right={!x.read_at ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.blue }} /> : null} />)}</Divided></View>
        : <View style={s.card}><Empty icon="bell-outline" title="No notifications yet" /></View>}
    </Pg>
  );
}

/* ---------- search ---------- */
function SearchPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const [qs, setQs] = useState(''), [sc, setSc] = useState('All'), [res, setRes] = useState<any[]>([]), [st, setSt] = useState<'idle' | 'load' | 'err'>('idle'), seq = useRef(0);
  useEffect(() => {
    if (qs.trim().length < 2) { setRes([]); setSt('idle'); return; }
    const n = ++seq.current; setSt('load');
    const h = setTimeout(async () => { try { const r = await rpc<any[]>('search_business', { p_business: app.biz.id, p_q: qs.trim() }); if (n === seq.current) { setRes(r); setSt('idle'); } } catch { if (n === seq.current) setSt('err'); } }, 250);
    return () => clearTimeout(h);
  }, [qs, app.biz.id]);
  const go = (r: any) => { if (r.target === 'wallet') app.panel('payouts'); else if (r.target === 'promo') app.go('promotions'); else app.go('feature', { k: r.feature, focus: r.rec_id }); };
  const L = res.filter(x => sc === 'All' || x.scope === sc);
  return (
    <Pg title="Search" onBack={app.back}>
      <TextInput autoFocus style={s.fld} value={qs} onChangeText={setQs} placeholder="Listings, orders, customers, payouts" placeholderTextColor={t.mute} returnKeyType="search" />
      <Chips items={['All', 'Listings', 'Orders', 'Customers', 'Promotions', 'Money']} value={sc} onChange={setSc} />
      <View style={s.cardFlat}>
        {st === 'err' ? <Empty icon="wifi-off" title="Search failed" hint="Check your connection and try again." /> : st === 'load' ? <View style={{ padding: 12 }}><Skel h={90} /></View> : qs.trim().length < 2 ? <Empty icon="magnify" title="Search this business" hint="Type at least two letters." /> : L.length ? <Divided>{L.map((r, i) => <Row key={i} onPress={() => go(r)} left={<FIcon k={r.feature} />} title={r.title} sub={r.sub} right={<Icon name="chevron-right" size={18} color={t.mute} />} />)}</Divided> : <Empty icon="magnify-close" title="No matches" hint="Try another word or filter." />}
      </View>
    </Pg>
  );
}
/** Edge handle: arrow tab, tap to reveal the search icon, tap again to open search. Drag it; it rests only on the left or right edge. */
function SearchHandle({ onOpen }: { onOpen: () => void }) {
  const t = useTheme(), ins = useSafeAreaInsets(), { width: W, height: H } = useWindowDimensions();
  const [side, setSide] = useState<'l' | 'r'>('r'), [open, setOpen] = useState(false), [drag, setDrag] = useState(false);
  const pos = useRef(new Animated.ValueXY({ x: 0, y: H * 0.45 })).current, timer = useRef<any>(null), sideRef = useRef<'l' | 'r'>('r'), openRef = useRef(false), y0 = useRef(H * 0.45), x0 = useRef(0);
  const reveal = () => { openRef.current = true; setOpen(true); clearTimeout(timer.current); timer.current = setTimeout(() => { openRef.current = false; setOpen(false); }, 2800); };
  const SZ = 50, TAB = 22;
  const xFor = (sd: 'l' | 'r', o: boolean) => (sd === 'r' ? W - (o ? SZ + 10 : TAB) : o ? 10 : 0);
  useEffect(() => { pos.setValue({ x: xFor(side, open), y: y0.current }); }, [side, open, W]); // eslint-disable-line react-hooks/exhaustive-deps
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pos.stopAnimation((v: any) => { x0.current = v.x; y0.current = v.y; }); setDrag(false); },
    onPanResponderMove: (_: any, g: any) => {
      if (!drag && Math.hypot(g.dx, g.dy) < 6) return;
      setDrag(true); clearTimeout(timer.current);
      const nx = Math.max(0, Math.min(W - SZ, x0.current + g.dx)), ny = Math.max(ins.top + 80, Math.min(H - ins.bottom - 150, y0.current + g.dy));
      pos.setValue({ x: nx, y: ny });
    },
    onPanResponderRelease: (_: any, g: any) => {
      if (Math.hypot(g.dx, g.dy) < 6) { if (!openRef.current) reveal(); else { openRef.current = false; setOpen(false); onOpen(); } return; }
      const cx = Math.max(0, Math.min(W - SZ, x0.current + g.dx)) + SZ / 2, sd: 'l' | 'r' = cx < W / 2 ? 'l' : 'r';
      y0.current = Math.max(ins.top + 80, Math.min(H - ins.bottom - 150, y0.current + g.dy));
      sideRef.current = sd; setSide(sd); setDrag(false); reveal();
      Animated.spring(pos, { toValue: { x: xFor(sd, true), y: y0.current }, useNativeDriver: false, bounciness: 6 }).start();
    },
  })).current;
  const round = open || drag;
  return (
    <Animated.View {...pan.panHandlers} accessibilityLabel="Search" style={{ position: 'absolute', zIndex: 15, width: round ? SZ : TAB, height: round ? SZ : 58, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', borderRadius: round ? SZ / 2 : 14, borderTopRightRadius: round ? SZ / 2 : side === 'l' ? 14 : 0, borderBottomRightRadius: round ? SZ / 2 : side === 'l' ? 14 : 0, borderTopLeftRadius: round ? SZ / 2 : side === 'r' ? 14 : 0, borderBottomLeftRadius: round ? SZ / 2 : side === 'r' ? 14 : 0, transform: pos.getTranslateTransform(), shadowColor: t.blue, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
      <MaterialCommunityIcons name={round ? 'magnify' : side === 'r' ? 'chevron-left' : 'chevron-right'} size={round ? 24 : 20} color="#fff" />
    </Animated.View>
  );
}

/* ---------- promotions ---------- */