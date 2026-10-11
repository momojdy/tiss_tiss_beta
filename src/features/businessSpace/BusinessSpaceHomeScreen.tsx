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

import { Feature, FM, FUI, useTheme, useS, money, rpc, useQ, useApp, Icon, Section, Empty, Skel, ErrBox, FIcon, Divided, RangeBar, Header, Banner, WalletCard, Checklist, ActionCard, ActivityRow } from "./BusinessSpaceShared";

export function Home() {
  const app = useApp(), s = useS(), t = useTheme(), ins = useSafeAreaInsets(), { biz, meta, range } = app;
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: biz.id, p_from: range.from, p_to: range.to, p_feature: null }), [biz.id, range.from, range.to, app.tick]);
  const act = useQ(() => rpc<any[]>('action_required', { p_business: biz.id }), [biz.id, app.tick]);
  const feed = useQ(() => rpc<any[]>('activity_feed', { p_business: biz.id, p_days: 120, p_before: null, p_limit: 5, p_kind: null }), [biz.id, app.tick]);
  const cnt = useQ(async () => ({ l: await q<any[]>(supabase.from('listings').select('feature,status').eq('business_id', biz.id)), o: await q<any[]>(supabase.from('feature_orders').select('feature,status').eq('business_id', biz.id)) }), [biz.id, app.tick]);
  const d = sum.d, refreshing = !!d && (sum.l || act.l);
  const payOK = meta.payout?.status === 'verified', hasF = meta.feats.length > 0;
  const top = (d?.features ?? []).filter((x: any) => Number(x.amount) > 0).sort((a: any, b: any) => b.amount - a.amount);
  const total = top.reduce((a: number, x: any) => a + Number(x.amount), 0) || 1;
  const rev = Number(d?.revenue ?? 0), prev = Number(d?.prev_revenue ?? 0), growth = prev ? ((rev - prev) / Math.abs(prev)) * 100 : null;
  const ser: { d: string; v: number }[] = d?.series ?? [], mx = Math.max(1, ...ser.map(x => Math.abs(x.v))), hasSales = ser.some(x => x.v !== 0);
  const actions: any[] = act.d ?? [];
  const open = (k: string) => (cnt.d?.o ?? []).filter((o: any) => o.feature === k && !FX.FM[k].flow.slice(-1).includes(o.status) && o.status !== 'Cancelled').length;
  const lcount = (k: string) => (cnt.d?.l ?? []).filter((l: any) => l.feature === k && l.status !== 'archived').length;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: ins.top + 12, paddingBottom: 130, gap: 14 }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={app.bump} tintColor={t.blue} />}>
      <Header />
      {['setup', 'action'].includes(biz.verification) && !app.regDismissed ? <Banner icon="check-decagram-outline" text={biz.verification === 'action' ? 'Update your registration documents' : 'Register your business to earn the Verified badge'} cta="Register" onPress={() => app.go('registration')} onClose={app.dismissReg} /> : null}
      {biz.verification === 'pending' ? <Banner icon="clock-outline" text="Registration is in review" onPress={() => app.go('registration')} /> : null}
      {biz.verification === 'restricted' ? <Banner tone="bad" icon="alert-circle-outline" text="Your business is restricted. View details" onPress={() => app.go('registration')} /> : null}
      {!payOK && biz.verification !== 'restricted' ? <Banner text={meta.payout ? 'Payout setup is in review' : 'Add a payout method to receive earnings'} onPress={() => app.sheet('payout')} /> : null}
      {sum.e && !d ? <ErrBox e={sum.e} retry={() => { sum.reload(); app.bump(); }} /> : <WalletCard available={d?.available ?? 0} pending={d?.pending ?? 0} />}
      {!hasF ? (
        <>
          <Checklist />
          <View style={s.card}><Empty icon="chart-line" title="No revenue yet" hint="Sales appear here after your first completed order." /></View>
          {actions.length ? <ActionCard actions={actions} /> : null}
          <View style={s.card}><Empty icon="storefront-outline" title="No features yet" hint="Activate a feature to start selling." cta="Explore features" onCta={() => app.go('explore')} /></View>
        </>
      ) : (
        <>
          <RangeBar />
          <View style={s.card}>
            {sum.l && !d ? <Skel h={190} /> : (
              <>
                <View style={[s.row, { alignItems: 'flex-start' }]}>
                  <View style={s.g}><Text style={s.title}>Earnings</Text><Text style={s.mut}>{range.label}</Text></View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.big}>{money(rev)}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: growth !== null && growth < 0 ? t.bad : t.good }}>{growth === null ? 'No previous period' : `${growth >= 0 ? '↑' : '↓'} ${Math.abs(growth).toFixed(1)}% vs previous period`}</Text>
                    {prev ? <Text style={s.mut}>Previous {money(prev)}</Text> : null}
                  </View>
                </View>
                {hasSales ? (
                  <View style={{ height: 124, flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingTop: 14 }}>
                    {ser.map((x, i) => <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}><View style={{ width: '68%', minHeight: 4, height: Math.max(4, Math.round((Math.abs(x.v) / mx) * 88)), backgroundColor: t.blue, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} /><Text style={{ fontSize: 9, color: t.mute }}>{i + 1}</Text></View>)}
                  </View>
                ) : <Empty icon="chart-bar" title="No sales in this period" hint="Try a longer range." />}
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.line, paddingTop: 13, marginTop: 8, gap: 8 }}>
                  {[['Gross sales', d?.gross], ['Fees', Math.abs(Number(d?.fees ?? 0))], ['Refunds', Math.abs(Number(d?.refunds ?? 0))]].map(([l, v]: any) => <View key={l} style={{ flex: 1 }}><Text style={{ fontSize: 10, color: t.mute }}>{l}</Text><Text style={{ fontSize: 13, fontWeight: '800', color: t.ink, marginTop: 4 }}>{money(v ?? 0)}</Text></View>)}
                </View>
              </>
            )}
          </View>
          <View style={s.card}>
            <Text style={s.title}>Sales by Feature</Text><Text style={s.mut}>Share of gross sales · {range.label}</Text>
            {top.length ? <View style={{ marginTop: 4 }}>{top.slice(0, 5).map((x: any, i: number) => { const pc = Math.round((Number(x.amount) / total) * 100); return (
              <View key={x.feature} style={[s.row, { paddingVertical: 10, gap: 12 }, i ? s.div : null]}>
                <FIcon k={x.feature} size={30} /><Text style={[s.rt, { width: 70 }]} numberOfLines={1}>{FX.FM[x.feature]?.name}</Text>
                <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: t.chip, overflow: 'hidden' }}><View style={{ width: `${pc}%`, height: 7, borderRadius: 4, backgroundColor: FX.FUI[x.feature]?.color ?? t.blue }} /></View>
                <Text style={{ width: 38, textAlign: 'right', fontSize: 12, fontWeight: '700', color: t.mute }}>{pc}%</Text>
              </View>); })}</View>
              : <Empty icon="chart-donut" title="No sales in this period" />}
            {top.length ? <Pressable onPress={() => app.go('charts')} style={{ marginTop: 6 }}><Text style={s.link}>View charts →</Text></Pressable> : null}
          </View>
          {actions.length ? <ActionCard actions={actions} /> : null}
          <Section title="Your business tools" right={`${meta.feats.length} enabled`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {meta.feats.slice(0, 5).map(f => (
              <Pressable key={f.feature} onPress={() => app.go('feature', { k: f.feature })} style={{ width: '31.5%', minHeight: 112, borderRadius: 16, padding: 11, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
                <FIcon k={f.feature} size={38} /><Text style={[s.rt, { fontSize: 11, marginTop: 8 }]}>{FX.FM[f.feature]?.name}</Text>
                <Text style={{ fontSize: 10, color: t.mute, marginTop: 3 }}>{lcount(f.feature)} listings · {open(f.feature)} open</Text>
                <Text style={{ fontSize: 10, color: t.good, fontWeight: '700', marginTop: 3 }}>● Active</Text>
              </Pressable>))}
            <Pressable onPress={() => app.go('explore')} style={{ width: '31.5%', minHeight: 112, borderRadius: 16, padding: 11, backgroundColor: t.soft, justifyContent: 'space-between' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={18} color="#fff" /></View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: t.blue }}>Explore more ways to sell</Text>
            </Pressable>
          </View>
          <Section title="Recent activity" right="Latest updates" onRight={() => app.go('activity')} />
          <View style={s.cardFlat}>
            {feed.l && !feed.d ? <View style={{ padding: 12 }}><Skel h={150} /></View> : (feed.d ?? []).length ? <Divided>{(feed.d ?? []).map((a: any) => <ActivityRow key={a.id} a={a} />)}</Divided> : <Empty icon="history" title="No activity yet" hint="Orders, refunds and payouts appear here." />}
          </View>
        </>
      )}
    </ScrollView>
  );
}