import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const BLUE = '#2D5BFF';
const INK = '#182033';
const MUTED = '#6F7890';
const LINE = '#E8ECF5';
const BG = '#F5F7FC';

type Tab = 'Overview' | 'Features' | 'Orders' | 'Listings' | 'Payouts';
type Business = { id: string; name: string; verification: string; payout_ready: boolean; is_live: boolean; role: string };
type Summary = { available?: number; pending?: number; revenue?: number; prev?: number; current?: number; previous?: number; series?: (number | string | { date?: string; amount?: number })[]; mix?: { feature?: string; amount?: number }[]; [key: string]: unknown };
type Activity = { id: string | number; title: string; kind?: string; at?: string; feature?: string };
type Row = { id: string; title?: string; name?: string; feature?: string; status?: string; amount?: number; price?: number; created_at?: string; stock?: number };

const FEATURES = [
  ['goodies', 'Goodies', 'shopping-outline', '#2D5BFF'],
  ['stayz', 'Stayz', 'bed-outline', '#7357E8'],
  ['woulib', 'Woulib', 'car-outline', '#16A085'],
  ['rideza', 'Rideza', 'car-key', '#E58A28'],
  ['konsoliss', 'Konsoliss', 'package-variant-closed', '#D45C9F'],
  ['flyz', 'Flyz', 'airplane', '#2388D9'],
  ['habita', 'Habita', 'home-city-outline', '#8B6BD6'],
  ['services', 'Services', 'briefcase-outline', '#3B9B7A'],
  ['glowz', 'Glowz', 'spa-outline', '#D56BA8'],
  ['gatherz', 'Gatherz', 'ticket-confirmation-outline', '#E58A28'],
  ['arts', 'Arts', 'palette-outline', '#7C64C7'],
  ['streamz', 'Streamz', 'play-circle-outline', '#D54F65'],
  ['dealz', 'Dealz', 'tag-outline', '#168C9A'],
  ['prezo', 'Prezo', 'gift-outline', '#BA7C28'],
  ['globiz', 'Globiz', 'earth', '#3A77B8'],
  ['lutz', 'Lutz', 'ticket-outline', '#7B62D6'],
  ['raffles', 'Raffles', 'trophy-outline', '#CB8A27'],
  ['bidz', 'Bidz', 'gavel', '#4F6C9E'],
  ['frenzies', 'Frenzies', 'gamepad-variant-outline', '#E05B72'],
] as const;

function money(value: unknown, currency = 'USD') {
  const amount = Number(value ?? 0);
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return '$' + (Number.isFinite(amount) ? amount : 0).toFixed(2); }
}
function errorText(error: unknown) { return error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error ?? 'Something went wrong'); }
function asObject(value: unknown): Record<string, any> { if (Array.isArray(value)) return value[0] ?? {}; return value && typeof value === 'object' ? value as Record<string, any> : {}; }

export default function BusinessSpaceScreen({ onSignOut, onSwitchToBuyer }: { onSignOut: () => void; onSwitchToBuyer: () => void }) {
  const [tab, setTab] = useState<Tab>('Overview');
  const [business, setBusiness] = useState<Business | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [earnings, setEarnings] = useState<Record<string, any>>({});
  const [activity, setActivity] = useState<Activity[]>([]);
  const [features, setFeatures] = useState<{ feature: string; status: string }[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [listings, setListings] = useState<Row[]>([]);
  const [payouts, setPayouts] = useState<Row[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [problem, setProblem] = useState('');
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    setProblem('');
    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userResult.user;
      if (!user) throw new Error('Your session has expired. Please sign in again.');

      const { data: memberships, error: memberError } = await supabase
        .from('business_members').select('business_id, role').eq('user_id', user.id);
      if (memberError) throw memberError;
      const memberRows = memberships ?? [];
      if (!memberRows.length) {
        setBusiness(null);
        setSummary(null);
        setActivity([]);
        setFeatures([]);
        setOrders([]);
        setListings([]);
        setPayouts([]);
        setBusinessName(String(user.user_metadata?.business_name ?? ''));
        return;
      }

      const ids = memberRows.map(row => row.business_id);
      const { data: businesses, error: businessError } = await supabase
        .from('businesses').select('id,name,verification,payout_ready,is_live,created_at')
        .in('id', ids).order('created_at', { ascending: true });
      if (businessError) throw businessError;
      const picked = businesses?.[0];
      if (!picked) throw new Error('Your business membership exists, but the business profile could not be loaded.');
      const membership = memberRows.find(row => row.business_id === picked.id);
      const activeBusiness: Business = { ...picked, role: membership?.role ?? 'staff' };
      setBusiness(activeBusiness);
      setBusinessName(activeBusiness.name);

      const [summaryRes, earningsRes, activityRes, featureRes, orderRes, listingRes, payoutRes] = await Promise.all([
        supabase.rpc('dashboard_summary', { p_business: picked.id, p_days: period, p_feature: null }),
        supabase.rpc('earnings_breakdown', { p_business: picked.id, p_days: period }),
        supabase.from('business_activity').select('id,title,kind,at,feature').eq('business_id', picked.id).order('at', { ascending: false }).limit(8),
        supabase.from('business_features').select('feature,status').eq('business_id', picked.id).order('feature'),
        supabase.from('feature_orders').select('id,title,feature,status,amount,created_at').eq('business_id', picked.id).order('created_at', { ascending: false }).limit(12),
        supabase.from('listings').select('id,title,feature,status,price,stock,created_at').eq('business_id', picked.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('wallet_ledger').select('id,label,type,status,amount,created_at').eq('business_id', picked.id).eq('type', 'payout').order('created_at', { ascending: false }).limit(10),
      ]);
      // Membership and business identity are the access gate. Dashboard widgets are optional;
      // missing feature schemas must not prevent an approved owner from entering Business Space.
      setSummary(summaryRes.error ? null : asObject(summaryRes.data) as Summary);
      setEarnings(earningsRes.error ? {} : asObject(earningsRes.data));
      setActivity((activityRes.error ? [] : activityRes.data ?? []) as Activity[]);
      setFeatures((featureRes.error ? [] : featureRes.data ?? []) as { feature: string; status: string }[]);
      setOrders((orderRes.error ? [] : orderRes.data ?? []) as Row[]);
      setListings((listingRes.error ? [] : listingRes.data ?? []) as Row[]);
      setPayouts((payoutRes.error ? [] : payoutRes.data ?? []) as Row[]);
    } catch (error) {
      setProblem(errorText(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const createBusiness = async () => {
    const name = businessName.trim();
    if (!name) { setProblem('Enter a business name before continuing.'); return; }
    setCreating(true);
    setProblem('');
    try {
      const { data, error } = await supabase.rpc('create_business', { p_name: name });
      if (error) throw error;
      if (!data) throw new Error('Supabase did not return the new business ID.');
      await load();
    } catch (error) {
      setProblem(errorText(error));
    } finally { setCreating(false); }
  };

  const featureMap = useMemo(() => new Map(features.map(item => [item.feature, item.status])), [features]);
  const available = Number(summary?.available ?? asObject(summary?.balance).available ?? 0);
  const pending = Number(summary?.pending ?? asObject(summary?.balance).pending ?? 0);
  const gross = Number(earnings.gross ?? 0);
  const fee = Math.abs(Number(earnings.fees ?? 0));
  const refunds = Math.abs(Number(earnings.refunds ?? 0));
  const series = Array.isArray(summary?.series) ? summary!.series! : [];
  const maxSeries = Math.max(1, ...series.map(point => Math.abs(typeof point === 'object' && point !== null ? Number(point.amount ?? 0) : Number(point ?? 0))));
  const periodLabel = period === 7 ? '7 days' : period === 30 ? '30 days' : period === 90 ? '90 days' : '1 year';

  const header = (
    <View style={styles.header}>
      <View style={styles.brandMark}><MaterialCommunityIcons name="storefront-outline" size={23} color={BLUE} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>WANTISS BUSINESS SPACE</Text>
        <Text style={styles.headerTitle} numberOfLines={1}>{business?.name ?? 'Your business'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Switch to Buyer" onPress={onSwitchToBuyer} style={styles.iconButton}>
        <MaterialCommunityIcons name="swap-horizontal" size={21} color={BLUE} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={styles.iconButton}>
        <MaterialCommunityIcons name="logout" size={21} color={INK} />
      </Pressable>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={BLUE} /><Text style={styles.muted}>Loading your business space…</Text></View>;

  if (!business) return (
    <View style={styles.page}>
      {header}
      <ScrollView contentContainerStyle={styles.onboardingContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}><MaterialCommunityIcons name="store-plus-outline" size={34} color={BLUE} /></View>
          <Text style={styles.heroTitle}>Bring your business to Wantiss</Text>
          <Text style={styles.heroCopy}>Create your business profile to manage your features, listings, orders, messages and payouts in one place.</Text>
        </View>
        <Text style={styles.label}>Business name</Text>
        <View style={styles.nameField}><TextInput value={businessName} onChangeText={setBusinessName} placeholder="Enter your business name" placeholderTextColor={MUTED} autoCapitalize="words" returnKeyType="done" style={styles.nameValue} accessibilityLabel="Business name" /></View>
        <Pressable style={[styles.primaryButton, creating && { opacity: 0.65 }]} disabled={creating} onPress={createBusiness}>
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create business profile</Text>}
        </Pressable>
        {!!problem && <Notice text={problem} />}
        <Text style={styles.smallNote}>Your profile and membership permissions are enforced by Supabase. If setup is unavailable, the dashboard will show the database error rather than creating mock data.</Text>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.page}>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={BLUE} />}
      >
        {!!problem && <Notice text={problem} />}
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>Business overview</Text>
            <Text style={styles.muted}>Your operations, at a glance.</Text>
          </View>
          <View style={[styles.statusPill, business.verification === 'verified' ? styles.statusGood : styles.statusWait]}>
            <View style={styles.statusDot} />
            <Text style={[styles.statusText, business.verification === 'verified' && { color: '#16794B' }]}>{business.verification === 'verified' ? 'Verified' : business.verification === 'pending' ? 'In review' : business.verification === 'restricted' ? 'Restricted' : 'Setup needed'}</Text>
          </View>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletTop}><Text style={styles.walletCaption}>AVAILABLE BALANCE</Text><MaterialCommunityIcons name="shield-check-outline" size={20} color="#DDE5FF" /></View>
          <Text style={styles.walletAmount}>{money(available)}</Text>
          <View style={styles.walletFooter}><View><Text style={styles.walletSubLabel}>Pending</Text><Text style={styles.walletSubAmount}>{money(pending)}</Text></View><View style={styles.walletDivider} /><View><Text style={styles.walletSubLabel}>Payout setup</Text><Text style={styles.walletSubAmount}>{business.payout_ready ? 'Ready' : 'Not ready'}</Text></View></View>
        </View>
        <Text style={styles.smallNote}>Financial figures are provisional reporting data only. They are not connected to your customer wallet balance or a payout provider. Withdrawals and refunds are not enabled here.</Text>

        <View style={styles.periodRow}>{[[7,'7D'],[30,'30D'],[90,'90D'],[365,'1Y']].map(([days,label]) => <Pressable key={days} onPress={() => setPeriod(Number(days))} style={[styles.periodButton, period === days && styles.periodActive]}><Text style={[styles.periodText, period === days && styles.periodTextActive]}>{label}</Text></Pressable>)}</View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}><View><Text style={styles.cardTitle}>Earnings</Text><Text style={styles.muted}>Last {periodLabel}</Text></View><Text style={styles.bigMetric}>{money(gross)}</Text></View>
          <View style={styles.chart}>
            {series.length ? series.map((point, index) => { const value = typeof point === 'object' && point !== null ? Number(point.amount ?? 0) : Number(point ?? 0); const label = typeof point === 'object' && point !== null ? String(point.date ?? index + 1) : String(index + 1); return <View key={label + '-' + index} style={styles.chartColumn}><View style={[styles.chartBar, { height: Math.max(4, Math.round((Math.abs(value) / maxSeries) * 88)) }]} /><Text style={styles.chartLabel}>{label.slice(-2)}</Text></View>; }) : <View style={styles.chartEmpty}><Text style={styles.muted}>Earnings history will appear here when ledger data is available.</Text></View>}
          </View>
          <View style={styles.metricGrid}><Metric label="Gross sales" value={money(gross)} /><Metric label="Fees" value={money(fee)} /><Metric label="Refunds" value={money(refunds)} /></View>
        </View>

        <View style={styles.sectionHeadingStandalone}><Text style={styles.sectionTitle}>Your business tools</Text><Text style={styles.muted}>{features.length} enabled</Text></View>
        <View style={styles.featureGrid}>{FEATURES.slice(0, 8).map(([key, name, icon, color]) => {
          const status = featureMap.get(key) ?? 'setup';
          return <Pressable key={key} style={styles.featureCard} onPress={() => setTab('Features')}><View style={[styles.featureIcon, { backgroundColor: color + '18' }]}><MaterialCommunityIcons name={icon as any} size={22} color={color} /></View><Text style={styles.featureName}>{name}</Text><Text style={styles.featureStatus}>{status === 'active' ? 'Active' : status === 'restricted' ? 'Restricted' : 'Setup'}</Text></Pressable>;
        })}</View>

        <View style={styles.sectionHeadingStandalone}><Text style={styles.sectionTitle}>Recent activity</Text><Text style={styles.muted}>Latest updates</Text></View>
        <View style={styles.sectionCard}>
          {activity.length ? activity.slice(0, 6).map((item, index) => <View key={String(item.id)} style={[styles.activityRow, index > 0 && styles.withDivider]}><View style={styles.activityDot}><MaterialCommunityIcons name="history" size={17} color={BLUE} /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowSub}>{item.feature ?? item.kind ?? 'Business activity'}{item.at ? ' · ' + new Date(item.at).toLocaleDateString() : ''}</Text></View></View>) : <Empty text="Your business activity will show here." />}
        </View>
      </ScrollView>
      <View style={styles.tabBar}>{(['Overview','Features','Orders','Listings','Payouts'] as Tab[]).map((item) => <Pressable key={item} style={styles.tabItem} onPress={() => setTab(item)}><MaterialCommunityIcons name={({ Overview: 'view-dashboard-outline', Features: 'apps', Orders: 'clipboard-list-outline', Listings: 'format-list-bulleted', Payouts: 'bank-transfer-out' } as const)[item]} size={21} color={tab === item ? BLUE : MUTED} /><Text style={[styles.tabLabel, tab === item && styles.tabLabelActive]}>{item}</Text></Pressable>)}</View>
      {tab !== 'Overview' && <View style={styles.sheetOverlay}><View style={styles.sheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{tab}</Text><Pressable onPress={() => setTab('Overview')}><MaterialCommunityIcons name="close" size={24} color={INK} /></Pressable></View>{tab === 'Features' ? <ScrollView>{FEATURES.map(([key,name,icon,color]) => <View key={key} style={styles.listRow}><View style={[styles.featureIcon,{backgroundColor:color+'18'}]}><MaterialCommunityIcons name={icon as any} size={21} color={color}/></View><View style={{flex:1}}><Text style={styles.rowTitle}>{name}</Text><Text style={styles.rowSub}>{featureMap.get(key) ?? 'Not configured'}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={MUTED}/></View>)}</ScrollView> : tab === 'Orders' ? <DataRows rows={orders} empty="No business orders yet." kind="order" /> : tab === 'Listings' ? <DataRows rows={listings} empty="No listings yet. Listing creation will be enabled after the feature schema and upload policies are installed." kind="listing" /> : <View style={{ flex: 1 }}><Text style={styles.smallNote}>Ledger entries only — no payout is initiated or confirmed from this screen.</Text><DataRows rows={payouts} empty="No payout ledger entries yet." kind="payout" /></View>}</View></View>}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
function Notice({ text }: { text: string }) { return <View style={styles.notice}><MaterialCommunityIcons name="alert-circle-outline" size={18} color="#A94442"/><Text style={styles.noticeText}>{text}</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={styles.empty}><MaterialCommunityIcons name="text-box-search-outline" size={23} color={MUTED}/><Text style={styles.muted}>{text}</Text></View>; }
function DataRows({ rows, empty, kind }: { rows: Row[]; empty: string; kind: string }) {
  if (!rows.length) return <Empty text={empty}/>;
  return <ScrollView>{rows.map(row => <View key={row.id} style={styles.listRow}><View style={styles.rowMain}><Text style={styles.rowTitle}>{row.title ?? row.name ?? (kind === 'payout' ? 'Payout request' : 'Untitled')}</Text><Text style={styles.rowSub}>{row.feature ?? row.status ?? kind}{row.status ? ' · ' + row.status : ''}</Text></View><Text style={styles.rowAmount}>{row.amount != null ? money(row.amount) : row.price != null ? money(row.price) : row.stock != null ? 'Stock ' + row.stock : ''}</Text></View>)}</ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },
  center: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header: { paddingTop: 12, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: LINE },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF1FF', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.1, fontWeight: '800', color: BLUE },
  headerTitle: { marginTop: 3, color: INK, fontSize: 18, fontWeight: '800' },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F3F5FA', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 116, gap: 14 },
  onboardingContent: { padding: 20, paddingBottom: 60 },
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 10 },
  heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#E9EDFF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heroTitle: { fontSize: 25, fontWeight: '800', textAlign: 'center', color: INK },
  heroCopy: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: MUTED, marginTop: 9 },
  label: { fontSize: 13, fontWeight: '700', color: INK, marginBottom: 8 },
  nameField: { minHeight: 50, borderWidth: 1, borderColor: LINE, borderRadius: 14, backgroundColor: '#FFFFFF', padding: 15, justifyContent: 'center' },
  nameValue: { color: INK, fontSize: 14, padding: 0 },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  smallNote: { fontSize: 12, lineHeight: 18, color: MUTED, marginTop: 18 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  welcomeTitle: { color: INK, fontSize: 22, fontWeight: '800' },
  muted: { color: MUTED, fontSize: 12, lineHeight: 18 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  statusGood: { backgroundColor: '#E3F7EC' },
  statusWait: { backgroundColor: '#FFF2D7' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E1A026' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#96650B' },
  walletCard: { borderRadius: 22, backgroundColor: BLUE, padding: 20, shadowColor: BLUE, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletCaption: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: '#DDE5FF' },
  walletAmount: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginTop: 10 },
  walletFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 18 },
  walletSubLabel: { fontSize: 11, color: '#DDE5FF' },
  walletSubAmount: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 3 },
  walletDivider: { height: 34, width: 1, backgroundColor: 'rgba(255,255,255,.3)' },
  periodRow: { flexDirection: 'row', gap: 7 },
  periodButton: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: LINE },
  periodActive: { backgroundColor: '#E9EDFF', borderColor: '#CBD4FF' },
  periodText: { color: MUTED, fontWeight: '700', fontSize: 12 },
  periodTextActive: { color: BLUE },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: LINE },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: INK, fontSize: 16, fontWeight: '800' },
  bigMetric: { color: INK, fontSize: 20, fontWeight: '800' },
  chart: { height: 124, flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingTop: 14 },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  chartBar: { width: '68%', minHeight: 4, backgroundColor: BLUE, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  chartLabel: { fontSize: 9, color: MUTED },
  chartEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  metricGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: LINE, paddingTop: 13, marginTop: 8, gap: 8 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10, color: MUTED },
  metricValue: { fontSize: 13, fontWeight: '800', color: INK, marginTop: 4 },
  sectionHeadingStandalone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: INK },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  featureCard: { width: '31.5%', minHeight: 112, borderRadius: 16, padding: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: LINE },
  featureIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featureName: { fontSize: 11, fontWeight: '800', color: INK },
  featureStatus: { marginTop: 3, fontSize: 10, color: MUTED },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
  withDivider: { borderTopWidth: 1, borderTopColor: LINE },
  activityDot: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#EEF1FF', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '700', color: INK },
  rowSub: { fontSize: 11, color: MUTED, marginTop: 3 },
  rowAmount: { fontSize: 12, fontWeight: '800', color: INK, marginLeft: 8 },
  empty: { paddingVertical: 26, alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabBar: { position: 'absolute', bottom: 12, left: 12, right: 12, minHeight: 66, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: LINE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, elevation: 6, shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  tabLabel: { fontSize: 10, color: MUTED, fontWeight: '700' },
  tabLabelActive: { color: BLUE },
  sheetOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '78%', minHeight: '48%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: INK },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE, gap: 12 },
  rowMain: { flex: 1 },
  notice: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F7CDCD' },
  noticeText: { flex: 1, fontSize: 12, color: '#A94442', lineHeight: 18 },
});
