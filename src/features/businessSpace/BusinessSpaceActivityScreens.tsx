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

import { FX, C, FEATURES, FM, FUI, LIGHT, useTheme, useS, money, short, parseISO, fmtDay, dayHead, errText, rpc, useQ, useApp, Btn, Chips, Empty, ErrBox, Loading, FIcon, Row, Divided, Pg, RangeBar, ActionRow, ActivityRow } from "./BusinessSpaceShared";

function ActionsPage() {
  const app = useApp(), s = useS();
  const a = useQ(() => rpc<any[]>('action_required', { p_business: app.biz.id }), [app.biz.id, app.tick]);
  return (
    <Pg title="Action required" onBack={app.back} refreshing={a.l && !!a.d} onRefresh={app.bump}>
      {a.e ? <ErrBox e={a.e} retry={a.reload} /> : a.l && !a.d ? <Loading /> : (a.d ?? []).length ? <View style={[s.cardFlat, { borderWidth: 2, borderStyle: 'dotted', borderColor: LIGHT.blue }]}><Divided>{(a.d ?? []).map((x: any, i: number) => <ActionRow key={i} a={x} />)}</Divided></View> : <View style={s.card}><Empty icon="check-circle-outline" title="You're all caught up" hint="Nothing needs your attention right now." /></View>}
    </Pg>
  );
}
function ActivityPage() {
  const app = useApp(), s = useS();
  const [kind, setKind] = useState('All'), [rows, setRows] = useState<any[]>([]), [more, setMore] = useState(false), [load, setLoad] = useState(true), [err, setErr] = useState<string | null>(null);
  const kinds: Record<string, string | null> = { All: null, Earnings: 'earn', Refunds: 'refund', Orders: 'order', Payouts: 'payout' };
  const fetchPage = useCallback(async (reset: boolean, cur: any[]) => {
    setLoad(true); setErr(null);
    try {
      const r = await rpc<any[]>('activity_feed', { p_business: app.biz.id, p_days: 120, p_before: reset || !cur.length ? null : cur[cur.length - 1].at, p_limit: 30, p_kind: kinds[kind] });
      setRows(reset ? r : [...cur, ...r]); setMore(r.length === 30);
    } catch (e) { setErr(errText(e)); } finally { setLoad(false); }
  }, [app.biz.id, kind, app.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchPage(true, []); }, [fetchPage]);
  let lastDay = '';
  return (
    <Pg title="Recent activity" onBack={app.back} refreshing={load && rows.length > 0} onRefresh={app.bump}>
      <Text style={s.mut}>Last 120 days</Text>
      <Chips items={Object.keys(kinds)} value={kind} onChange={setKind} />
      {err ? <ErrBox e={err} retry={() => fetchPage(true, [])} /> : load && !rows.length ? <Loading /> : rows.length ? (
        <View style={s.cardFlat}>{rows.map((a, i) => { const d = dayHead(a.at), head = d !== lastDay; lastDay = d; return <View key={a.id}>{head ? <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: LIGHT.mute, paddingTop: 14, paddingBottom: 2, textTransform: 'uppercase' }}>{d}</Text> : i ? <View style={s.div} /> : null}<ActivityRow a={a} /></View>; })}</View>
      ) : <View style={s.card}><Empty icon="history" title="No activity yet" hint="Orders, refunds and payouts appear here." /></View>}
      {more ? <Btn kind="soft" label="Load more" busy={load} onPress={() => fetchPage(false, rows)} /> : null}
    </Pg>
  );
}
function ExplorePage() {
  const app = useApp(), s = useS(), t = useTheme(), on = new Set(app.meta.feats.map(f => f.feature));
  return (
    <Pg title="Explore more ways to sell" onBack={app.back}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {FX.FEATURES.map(f => (
          <Pressable key={f.key} onPress={() => app.go('feature', { k: f.key })} style={{ width: '31.5%', minHeight: 112, borderRadius: 16, padding: 11, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
            <FIcon k={f.key} size={38} /><Text style={[s.rt, { fontSize: 11, marginTop: 8 }]} numberOfLines={1}>{f.name}</Text>
            <Text style={{ fontSize: 10, color: on.has(f.key) ? t.good : t.mute, fontWeight: on.has(f.key) ? '700' : '400', marginTop: 3 }}>{on.has(f.key) ? '● Active' : f.approval ? 'Needs approval' : 'Not activated'}</Text>
          </Pressable>
        ))}
      </View>
    </Pg>
  );
}

/* ---------- charts ---------- */
function ChartsPage() {
  const app = useApp(), s = useS(), t = useTheme(), { range } = app;
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: app.biz.id, p_from: range.from, p_to: range.to, p_feature: null }), [app.biz.id, range.from, range.to, app.tick]);
  const [ci, setCi] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const d = sum.d, cur: { d: string; v: number }[] = d?.series ?? [], pv: { d: string; v: number }[] = d?.prev_series ?? [];
  const feats: any[] = [...(d?.features ?? [])].sort((a, b) => Number(b.amount) - Number(a.amount));
  const total = feats.reduce((a, x) => a + Number(x.amount), 0) || 1;
  const rev = Number(d?.revenue ?? 0), prev = Number(d?.prev_revenue ?? 0), growth = prev ? ((rev - prev) / Math.abs(prev)) * 100 : null;
  const W = width - 32 - 32, H = 170, L = 44, B_ = 26, T_ = 10, R_ = 8, pw = W - L - R_, ph = H - T_ - B_, n = cur.length;
  const mx = Math.max(1, ...cur.map(x => x.v), ...pv.map(x => x.v)) * 1.1, X = (i: number) => L + (n > 1 ? (i * pw) / (n - 1) : pw / 2), Y = (v: number) => T_ + ph - (v / mx) * ph;
  const pts = (a: { v: number }[]) => a.map((x, i) => `${X(i)},${Y(x.v)}`).join(' ');
  const hasData = cur.some(x => x.v !== 0) || pv.some(x => x.v !== 0);
  const r = 38, C = 2 * Math.PI * r; let off = 0;
  const slices = feats.filter(x => Number(x.amount) > 0);
  return (
    <Pg title="Sales by feature" onBack={app.back} refreshing={sum.l && !!d} onRefresh={app.bump}>
      <RangeBar />
      {sum.e && !d ? <ErrBox e={sum.e} retry={sum.reload} /> : sum.l && !d ? <Loading n={3} h={160} /> : (
        <>
          <View style={s.card}>
            <View style={s.row}><View style={s.g}><Text style={s.mut}>Net revenue · {range.label}</Text><Text style={[s.big, { fontSize: 26 }]}>{money(rev)}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '800', fontSize: 13, color: growth !== null && growth < 0 ? t.bad : t.good }}>{growth === null ? '—' : `${growth >= 0 ? '↑' : '↓'} ${Math.abs(growth).toFixed(1)}%`}</Text><Text style={s.mut}>vs previous period</Text></View></View>
            {hasData ? (
              <>
                <Svg width={W} height={H} style={{ marginTop: 10 }}>
                  {[0, 0.5, 1].map(f => <G key={f}><Line x1={L} x2={W - R_} y1={Y(mx * f)} y2={Y(mx * f)} stroke={t.line} /><SvgText x={L - 6} y={Y(mx * f) + 3} fontSize="9" fill={t.mute} textAnchor="end">{short(mx * f)}</SvgText></G>)}
                  {[0, Math.floor((n - 1) / 2), n - 1].map((i, k) => cur[i] ? <SvgText key={k} x={X(i)} y={H - 8} fontSize="9" fill={t.mute} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{fmtDay(parseISO(cur[i].d))}</SvgText> : null)}
                  <Polyline points={pts(pv)} fill="none" stroke={t.mute} strokeWidth="1.6" strokeDasharray="4 3" />
                  <Polyline points={pts(cur)} fill="none" stroke={t.blue} strokeWidth="2.6" strokeLinejoin="round" />
                  {ci !== null && cur[ci] ? <G><Line x1={X(ci)} x2={X(ci)} y1={T_} y2={T_ + ph} stroke={t.blue} strokeOpacity="0.35" /><Circle cx={X(ci)} cy={Y(cur[ci].v)} r="4" fill={t.blue} />{pv[ci] ? <Circle cx={X(ci)} cy={Y(pv[ci].v)} r="3.5" fill={t.card} stroke={t.mute} /> : null}</G> : null}
                  {cur.map((_, i) => <Rect key={i} x={X(i) - pw / Math.max(n, 1) / 2} y={T_} width={pw / Math.max(n, 1)} height={ph} fill="transparent" onPress={() => setCi(i)} />)}
                </Svg>
                <View style={{ backgroundColor: t.soft, borderRadius: 12, padding: 10, minHeight: 38, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: t.blue }}>{ci !== null && cur[ci] ? `${fmtDay(parseISO(cur[ci].d))} · This period ${money(cur[ci].v)}${pv[ci] ? ` · Previous ${money(pv[ci].v)}` : ''}` : 'Tap the chart for a day'}</Text>
                </View>
                <View style={[s.row, { marginTop: 8, gap: 16 }]}><View style={s.row}><View style={{ width: 14, height: 3, backgroundColor: t.blue }} /><Text style={s.mut}>This period</Text></View><View style={s.row}><View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: t.mute }} /><Text style={s.mut}>Previous ({money(prev)})</Text></View></View>
              </>
            ) : <Empty icon="chart-line" title="No sales in this period" hint="Try a longer range." />}
          </View>
          <View style={s.card}>
            <Text style={[s.title, { marginBottom: 8 }]}>Share of gross sales</Text>
            {slices.length ? (
              <View style={s.row}>
                <Svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle cx="60" cy="60" r={r} fill="none" stroke={t.chip} strokeWidth="16" />
                  {slices.map(x => { const l = (Number(x.amount) / total) * C, e = <Circle key={x.feature} cx="60" cy="60" r={r} fill="none" stroke={FX.FUI[x.feature]?.color ?? t.blue} strokeWidth="16" strokeDasharray={`${Math.max(0, l - 1.5)} ${C - l + 1.5}`} strokeDashoffset={-off} />; off += l; return e; })}
                </Svg>
                <View style={s.g}>{slices.map(x => <View key={x.feature} style={[s.row, { paddingVertical: 4, gap: 8 }]}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: FX.FUI[x.feature]?.color }} /><Text style={[s.rt, { flex: 1 }]}>{FX.FM[x.feature]?.name}</Text><Text style={s.rt}>{Math.round((Number(x.amount) / total) * 100)}%</Text></View>)}</View>
              </View>
            ) : <Empty icon="chart-donut" title="No sales yet" />}
          </View>
          <View style={s.card}>
            <Text style={s.title}>By feature</Text>
            <View style={{ maxHeight: 5 * 66, marginTop: 6 }}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                <Divided>{feats.map(x => { const on = app.meta.feats.some(f => f.feature === x.feature), a = Number(x.amount); return <Row key={x.feature} left={<FIcon k={x.feature} />} title={FX.FM[x.feature]?.name} sub={on ? (a > 0 ? `${x.orders} orders · fees ${money(Math.abs(Number(x.fees)))}` : 'No sales in this period') : 'Not activated'} right={<View style={{ alignItems: 'flex-end' }}><Text style={s.rt}>{money(a)}</Text><Text style={s.sub}>{Math.round((a / total) * 100)}%</Text></View>} />; })}</Divided>
              </ScrollView>
            </View>
          </View>
        </>
      )}
    </Pg>
  );
}

/* ---------- order / listing rows ---------- */