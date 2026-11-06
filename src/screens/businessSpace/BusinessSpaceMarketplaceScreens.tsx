import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Polyline, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';

import { Feature, FX, FM, LIGHT, useTheme, useS, money, ago, rpc, useQ, useApp, useArg, useAct, Icon, Btn, Pill, Chips, Seg, Section, Empty, Skel, ErrBox, Loading, FIcon, Row, Divided, Pg, OrderRow, ListingRow, RequirementsCard, q } from "./BusinessSpaceShared";
import { GoodiesToolsCard } from "./BusinessSpaceGoodies";

export function FeaturePage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), { k, focus } = useArg() as { k: string; focus?: string };
  const fe = FX.FM[k] as Feature | undefined, on = app.meta.feats.some(f => f.feature === k);
  const [of, setOf] = useState('All'), [lf, setLf] = useState('All');
  const orders = useQ<any[]>(() => k === 'goodies' ? Promise.resolve([]) : q<any[]>(supabase.from('feature_orders').select('*').eq('business_id', app.biz.id).eq('feature', k).order('created_at', { ascending: false }).limit(60)), [app.biz.id, k, app.tick]);
  const lst = useQ<any[]>(() => k === 'goodies' ? Promise.resolve([]) : q<any[]>(supabase.from('listings').select('id,title,status,price,stock,photos,feature,updated_at').eq('business_id', app.biz.id).eq('feature', k).neq('status', 'archived').order('updated_at', { ascending: false })), [app.biz.id, k, app.tick]);
  if (!fe) return <Pg title="Feature" onBack={app.back}><Empty title="Feature not found" /></Pg>;
  if (k === 'goodies') return <Pg title={fe.name} onBack={app.back}><View style={s.card}><View style={s.row}><FIcon k="goodies" size={40} /><View style={s.g}><Text style={[s.rt, { fontSize: 15 }]}>{fe.name}</Text><Text style={s.mut}>{on ? 'Active' : 'Not activated'}</Text></View>{on ? <Pill tone="good">Active</Pill> : null}</View><Text style={[s.mut, { marginTop: 10 }]}>Activate Goodies to unlock your store, products, orders and ingredient tools. No additional Goodies paperwork or review is required.</Text><View style={{ marginTop: 12 }}><Btn label={on ? 'Deactivate' : 'Activate Goodies'} kind={on ? 'soft' : 'primary'} disabled={!on && app.biz.verification === 'restricted'} busy={a.busy} onPress={() => a.run(() => rpc(on ? 'deactivate_feature' : 'activate_feature', { p_business: app.biz.id, p_feature: 'goodies' }), on ? 'Goodies deactivated' : 'Goodies activated')} /></View></View>{on ? <><Section title="Goodies tools" /><GoodiesToolsCard /></> : null}</Pg>;
  const os = orders.d ?? [], ls = lst.d ?? [];
  const fo = os.filter(o => of === 'All' || (of === 'Cancelled' ? o.status === 'Cancelled' : o.status === of));
  const fl = ls.filter(l => lf === 'All' || l.status === lf);
  const openN = os.filter(o => o.status !== 'Cancelled' && o.status !== fe.flow[fe.flow.length - 1]).length;
  const restricted = app.biz.verification === 'restricted';
  return (
    <Pg title={fe.name} onBack={app.back} refreshing={(orders.l || lst.l) && !!orders.d} onRefresh={app.bump}>
      <View style={s.card}>
        <View style={s.row}><FIcon k={k} size={40} /><View style={s.g}><Text style={[s.rt, { fontSize: 15 }]}>{fe.name}</Text><Text style={s.mut}>{on ? `${ls.length} listings · ${openN} open` : 'Not activated'}</Text></View>{on ? <Pill tone="good">Active</Pill> : null}</View>
        <Text style={[s.mut, { marginTop: 10 }]}>{fe.flow.join(' → ')}</Text>
        <View style={[s.row, { marginTop: 12 }]}>
          {on ? <Btn style={{ flex: 1 }} small label={`+ ${fe.add}`} onPress={() => app.wizard(k)} /> : <Btn style={{ flex: 1 }} small label={`Activate ${fe.name}`} disabled={restricted} busy={a.busy} onPress={() => a.run(() => rpc('activate_feature', { p_business: app.biz.id, p_feature: k }), `${fe.name} activated`)} />}
          <Btn style={{ flex: 1 }} small kind="soft" label="Messages" onPress={() => app.go('messages')} />
        </View>
      </View>
      <RequirementsCard feature={k} />
      {k === "goodies" && on ? (<><Section title="Goodies tools" /><GoodiesToolsCard /></>) : null}
      <Section title="Orders and requests" right={String(os.length)} />
      <Chips items={['All', ...fe.flow, 'Cancelled']} value={of} onChange={setOf} />
      {orders.e ? <ErrBox e={orders.e} retry={orders.reload} /> : (
        <View style={s.cardFlat}>
          {orders.l && !orders.d ? <View style={{ padding: 12 }}><Skel h={90} /></View> : fo.length ? <Divided>{fo.map(o => <OrderRow key={o.id} o={o} hl={o.id === focus} />)}</Divided> : <Empty icon="clipboard-text-outline" title={os.length ? 'No orders with this status' : on ? 'No orders yet' : `Activate ${fe.name} to receive orders`} hint={on && !os.length ? 'They appear here when customers buy or book.' : undefined} />}
        </View>
      )}
      <Section title="Listings" right={String(ls.length)} />
      <Chips items={['All', 'draft', 'published', 'paused', 'in_review']} value={lf} onChange={setLf} />
      {lst.e ? <ErrBox e={lst.e} retry={lst.reload} /> : (
        <View style={s.cardFlat}>
          {lst.l && !lst.d ? <View style={{ padding: 12 }}><Skel h={90} /></View> : fl.length ? <Divided>{fl.map(l => <ListingRow key={l.id} l={l} />)}</Divided> : <Empty icon="format-list-bulleted" title={ls.length ? 'No listings with this status' : on ? 'No listings yet' : `Activate ${fe.name} to add listings`} cta={on && !ls.length ? fe.add : undefined} onCta={() => app.wizard(k)} />}
        </View>
      )}
    </Pg>
  );
}

/* ---------- tab panels ---------- */
export function FeaturesPanel() {
  const app = useApp(), s = useS(), a = useAct(), on = new Set(app.meta.feats.map(f => f.feature)), restricted = app.biz.verification === 'restricted';
  return (
    <View>
      <Divided>
        {FX.FEATURES.map(f => (
          <Row key={f.key} left={<FIcon k={f.key} size={38} />} title={f.name} sub={f.key === 'goodies' ? 'Self-service restaurant setup' : on.has(f.key) ? 'Active' : f.approval ? 'Needs approval' : 'Not activated'}
            onPress={f.key === 'goodies' ? () => app.go(on.has(f.key) ? 'goodiesTools' : 'feature', on.has(f.key) ? undefined : { k: f.key }) : undefined}
            right={<View style={[s.row, { gap: 8 }]}>
              {on.has(f.key) ? <Pressable accessibilityLabel={`Add to ${f.name}`} onPress={() => f.key === 'goodies' ? app.go('goodiesProducts', { add: true }) : app.wizard(f.key)} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: app.dark ? '#202B4F' : '#EEF1FF', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} color={LIGHT.blue} /></Pressable> : null}
              <Btn small kind={on.has(f.key) ? 'soft' : 'primary'} label={on.has(f.key) ? 'Deactivate' : 'Activate'} disabled={!on.has(f.key) && restricted} busy={a.busy} onPress={() => a.run(() => rpc(on.has(f.key) ? 'deactivate_feature' : 'activate_feature', { p_business: app.biz.id, p_feature: f.key }), on.has(f.key) ? `${f.name} deactivated` : `${f.name} activated`)} />
            </View>} />
        ))}
      </Divided>
    </View>
  );
}
export function OrdersPanel() {
  const app = useApp(), [f, setF] = useState('Open');
  const [page, setPage] = useState(0), [busyId, setBusyId] = useState('');
  const o = useQ(() => q<any[]>(supabase.from('feature_orders').select('*').eq('business_id', app.biz.id).order('created_at', { ascending: false }).order('id', {ascending:false}).range(page*80,page*80+79)), [app.biz.id, app.tick, page]);
  const goodies = useQ(() => q<any[]>(supabase.from('goodies_orders').select('*').eq('business_id', app.biz.id).order('created_at', { ascending: false }).order('id', {ascending:false}).range(page*80,page*80+79)), [app.biz.id, app.tick, page]);
  const rows = (o.d ?? []).filter(x => f === 'All' || (f === 'Open' ? x.status !== 'Cancelled' && !FX.FM[x.feature]?.flow.slice(-1).includes(x.status) : f === 'Cancelled' ? x.status === 'Cancelled' : FX.FM[x.feature]?.flow.slice(-1).includes(x.status)));
  const grows = (goodies.d ?? []).filter(x => f === 'All' || (f === 'Open' ? !['completed','cancelled','declined','expired'].includes(String(x.status).toLowerCase()) : f === 'Cancelled' ? String(x.status).toLowerCase() === 'cancelled' : String(x.status).toLowerCase() === 'completed'));
  const nextGoodiesStatus: Record<string,string> = {accepted:'preparing',preparing:'ready',ready:'completed'};
  const advanceGoodies = async (x: any) => {
    const due = !x.scheduled_for || new Date(x.scheduled_for).getTime() <= Date.now();
    if (!due) {app.toast('This order is scheduled for ' + new Date(x.scheduled_for).toLocaleString()); return;}
    const next = nextGoodiesStatus[String(x.status).toLowerCase()];
    if (!next) return;
    if (busyId) return;setBusyId(x.id);
    try {
      const {error} = await supabase.rpc('set_goodies_order_status', {p_order_id: x.id, p_status: next});
      if (error) throw error;
      app.bump(); app.toast('Goodies order updated');
    } catch (e: any) {app.toast('Could not update order. Please try again.');} finally {setBusyId('');}
  };
  return (
    <View style={{ gap: 10 }}>
      <Chips items={['Open', 'Closed', 'Cancelled', 'All']} value={f} onChange={setF} />
      <Section title="Goodies orders" right={String(grows.length)} />
      <Btn label="Open 15-minute response queue" kind="soft" onPress={() => app.go('goodiesOrders')} />
      {goodies.e ? <ErrBox e={goodies.e} retry={goodies.reload} /> : goodies.l && !goodies.d ? <Loading /> : grows.length ? <View style={{gap:8}}>{grows.map(x => {
        const due = !x.scheduled_for || new Date(x.scheduled_for).getTime() <= Date.now();
        const next = nextGoodiesStatus[String(x.status).toLowerCase()];
        const items = Array.isArray(x.items) ? x.items.map((i: any) => (i.q ?? i.quantity ?? 1) + '× ' + (i.n ?? i.name ?? 'Item')).join(', ') : 'Order items';
        return <View key={x.id} style={{padding:13,borderRadius:14,borderWidth:1,borderColor:LIGHT.line,gap:7}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'800',color:LIGHT.ink}}>Order {x.order_code}</Text><Text style={{fontSize:12,color:LIGHT.mute,marginTop:3}}>{items}</Text></View><Pill tone={String(x.status).toLowerCase()==='completed'?'good':String(x.status).toLowerCase()==='cancelled'?'bad':'warn'}>{String(x.status).replace('_',' ')}</Pill></View>
          <Text style={{fontSize:12,color:LIGHT.mute}}>{x.scheduled_for ? (due ? 'Scheduled time reached · ' : 'Scheduled for · ') + new Date(x.scheduled_for).toLocaleString() : 'Order received'} · {money(Number(x.total))}</Text>
          <Text style={{fontSize:11,color:LIGHT.mute}}>Payment: {x.payment_status === 'demo' ? 'Demo payment (not charged)' : x.payment_status}</Text>
          {next && due && !(next==='completed' && x.order_type==='delivery') ? <View style={{alignSelf:'flex-end'}}><Btn small busy={busyId===x.id} disabled={!!busyId} label={next === 'accepted' ? 'Accept order' : next === 'preparing' ? 'Start preparing' : next === 'ready' ? 'Mark ready' : 'Complete order'} onPress={() => advanceGoodies(x)} /></View> : null}
        </View>;
      })}</View> : <Empty icon="clipboard-text-outline" title="No Goodies orders yet" hint="Scheduled orders from mapped Goodies stores appear here." />}
      <View style={{flexDirection:'row',gap:8}}><Btn label="Previous page" kind="soft" disabled={page===0 || goodies.l} onPress={() => setPage(p=>p-1)} /><Btn label="Next page" kind="soft" disabled={goodies.l || (goodies.d || []).length<80} onPress={() => setPage(p=>p+1)} /></View>
      <Section title="Other orders" right={String(rows.length)} />
      {o.e ? <ErrBox e={o.e} retry={o.reload} /> : o.l && !o.d ? <Loading /> : rows.length ? <Divided>{rows.map(x => <OrderRow key={x.id} o={x} />)}</Divided> : <Empty icon="clipboard-text-outline" title={(o.d ?? []).length ? 'No orders here' : 'No orders yet'} hint="Other feature orders appear here when customers buy or book." />}
    </View>
  );
}
export function ListingsPanel() {
  const app = useApp(), [f, setF] = useState('All');
  const l = useQ(() => q<any[]>(supabase.from('listings').select('id,title,status,price,stock,photos,feature').eq('business_id', app.biz.id).neq('status', 'archived').order('updated_at', { ascending: false }).limit(100)), [app.biz.id, app.tick]);
  const rows = (l.d ?? []).filter(x => f === 'All' || x.status === f);
  return (
    <View style={{ gap: 10 }}>
      <Chips items={['All', 'draft', 'published', 'paused', 'in_review']} value={f} onChange={setF} />
      {l.e ? <ErrBox e={l.e} retry={l.reload} /> : l.l && !l.d ? <Loading /> : rows.length ? <Divided>{rows.map(x => <ListingRow key={x.id} l={x} />)}</Divided> : <Empty icon="format-list-bulleted" title={(l.d ?? []).length ? 'No listings with this status' : 'No listings yet'} hint={app.meta.feats.length ? 'Tap + on an active feature to add one.' : 'Activate a feature first.'} cta={app.meta.feats.length ? undefined : 'Explore features'} onCta={() => app.go('explore')} />}
    </View>
  );
}
export function PayoutsPanel() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz;
  const [tab, setTab] = useState('Ledger'), [f, setF] = useState('All'), [pg_, setPg] = useState(1);
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: b.id, p_from: app.range.from, p_to: app.range.to, p_feature: null }), [b.id, app.tick]);
  const typeMap: Record<string, string | null> = { All: null, Sales: 'sale', Fees: 'fee', Refunds: 'refund', Payouts: 'payout' };
  const led = useQ(() => q<any[]>((() => { let r = supabase.from('wallet_ledger').select('*').eq('business_id', b.id).order('created_at', { ascending: false }).range(0, pg_ * 15 - 1); const ty = tab === 'Payout history' ? 'payout' : typeMap[f]; if (ty) r = r.eq('type', ty); return r; })()), [b.id, tab, f, pg_, app.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const validAmount = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && !!v.trim())) && Number.isFinite(Number(v));
  const summaryReady = !sum.e && validAmount(sum.d?.available) && validAmount(sum.d?.pending);
  const av = Number(sum.d?.available), pe = Number(sum.d?.pending), payOK = app.meta.payout?.status === 'verified';
  const tone = (st: string) => st === 'completed' || st === 'posted' ? 'good' : st === 'failed' || st === 'reversed' ? 'bad' : 'warn';
  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: 22, backgroundColor: LIGHT.blue, padding: 16 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: '#DDE5FF' }}>AVAILABLE</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 6 }}>{sum.l ? 'Loading…' : !summaryReady ? 'Unavailable' : money(av)}</Text>
        <Text style={{ color: '#DDE5FF', marginTop: 6, fontSize: 12 }}>Pending {sum.l ? 'Loading…' : !summaryReady ? 'Unavailable' : money(pe)} · Payout method {payOK ? `•••• ${app.meta.payout?.last4 ?? ''}` : 'not set'}</Text>
      </View>
      {!sum.l && !summaryReady ? <ErrBox e="Payout summary unavailable." retry={sum.reload} /> : null}
      <Btn label={payOK ? 'Request payout' : 'Set up payouts'} disabled={b.verification === 'restricted' || (payOK && (sum.l || !summaryReady || av <= 0))} onPress={() => app.sheet(payOK ? 'request' : 'payout')} />
      <Seg items={['Ledger', 'Payout history']} value={tab} onChange={(x: string) => { setTab(x); setPg(1); }} />
      {tab === 'Ledger' ? <Chips items={Object.keys(typeMap)} value={f} onChange={(x: string) => { setF(x); setPg(1); }} /> : null}
      {led.e ? <ErrBox e={led.e} retry={led.reload} /> : led.l && !led.d ? <Loading /> : (led.d ?? []).length ? (
        <Divided>{(led.d ?? []).map(r => tab === 'Ledger'
          ? <Row key={r.id} title={r.label ?? r.type} sub={`${r.feature ? FX.FM[r.feature]?.name ?? '' : 'Wallet'} · ${ago(r.created_at)} · ${r.status}`} right={<Text style={{ fontWeight: '800', color: Number(r.amount) > 0 ? t.good : t.ink }}>{Number(r.amount) > 0 ? '+' : ''}{money(r.amount)}</Text>} />
          : <Row key={r.id} left={<View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="bank-transfer-out" size={18} color={t.blue} /></View>} title={`${money(Math.abs(Number(r.amount)))} · ${r.method ? (app.meta.rules.find(x => x.method === r.method)?.name ?? r.method) : 'Payout'}`} sub={`${r.id.slice(0, 8)} · ${ago(r.created_at)}`} right={<Pill tone={tone(r.status)}>{r.status}</Pill>} />)}</Divided>
      ) : <Empty icon="bank-transfer" title={tab === 'Ledger' ? 'No transactions yet' : 'No payouts yet'} hint={tab === 'Ledger' ? 'Sales, fees, refunds and payouts appear here.' : 'Requested payouts appear here with their status.'} />}
      {(led.d ?? []).length >= pg_ * 15 ? <Btn kind="soft" label="Load more" onPress={() => setPg(pg_ + 1)} /> : null}
    </View>
  );
}

/* ---------- messages ---------- */