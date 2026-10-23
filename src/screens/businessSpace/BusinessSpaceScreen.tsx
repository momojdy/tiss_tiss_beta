import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Polyline, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';

import { FX, FM, LIGHT, DARK, ThemeCtx, useTheme, useS, errText, Biz, Meta, Range, DEFAULT_RULES, presetRange, rpc, q, useQ, App, AppCtx, ArgCtx, useAct, Btn, Field, Skel, ErrBox, PanelSheet, ListingWizard } from "./BusinessSpaceShared";
import { Home } from "./BusinessSpaceHomeScreen";
import { ActionsPage, ActivityPage, ExplorePage, ChartsPage } from "./BusinessSpaceActivityScreens";
import { FeaturePage, FeaturesPanel, OrdersPanel, ListingsPanel, PayoutsPanel } from "./BusinessSpaceMarketplaceScreens";
import { MessagesPage, ConversationPage, NotificationsPage, SearchPage, SearchHandle } from "./BusinessSpaceCommunicationScreens";
import { PromotionsPage, RegistrationPage, AuditPage, HelpPage, SecurityPage, BusinessInfoPage } from "./BusinessSpaceAccountScreens";
import { SheetHost } from "./BusinessSpaceSheets";

/* ---------- notifications handler (foreground) ---------- */
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false } as any) });

const BUSINESS_REQUEST_TIMEOUT_MS = 15000;

function withBusinessRequestTimeout<T>(request: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out. Please check your connection and try again.`)), BUSINESS_REQUEST_TIMEOUT_MS);
    Promise.resolve(request).then(
      value => { clearTimeout(timeout); resolve(value); },
      error => { clearTimeout(timeout); reject(error); },
    );
  });
}

const BIZ_COLS = 'id,name,vendor_id,verification,payout_ready,is_live,created_at,description,phone,phone_country,email,website,address,city,country,delivery_modes,hours,logo_url,accept_scheduled_orders,scheduled_order_start_minutes,goodies_store_id';
const PAGES: Record<string, () => React.ReactElement> = {
  feature: FeaturePage, explore: ExplorePage, charts: ChartsPage, actions: ActionsPage, activity: ActivityPage, messages: MessagesPage, conversation: ConversationPage,
  notifications: NotificationsPage, search: SearchPage, promotions: PromotionsPage, registration: RegistrationPage, audit: AuditPage, help: HelpPage, security: SecurityPage, businessInfo: BusinessInfoPage,
};
const TABS: [string, string, string | null][] = [['Overview', 'view-dashboard-outline', null], ['Features', 'apps', 'features'], ['Orders', 'clipboard-list-outline', 'orders'], ['Listings', 'format-list-bulleted', 'listings'], ['Payouts', 'bank-transfer-out', 'payouts']];

export default function BusinessSpaceScreen({ onSignOut, onSwitchToBuyer }: { onSignOut: () => void; onSwitchToBuyer: () => void }) {
  const scheme = useColorScheme();
  const [dark, setDarkS] = useState(scheme === 'dark');
  useEffect(() => { AsyncStorage.getItem('bs.dark').then(v => { if (v != null) setDarkS(v === '1'); }).catch(() => undefined); }, []);
  const setDark = (d: boolean) => { setDarkS(d); AsyncStorage.setItem('bs.dark', d ? '1' : '0').catch(() => undefined); };
  return (
    <SafeAreaProvider>
      <ThemeCtx.Provider value={dark ? DARK : LIGHT}>
        <Gate dark={dark} setDark={setDark} onSignOut={onSignOut} onBuyer={onSwitchToBuyer} />
      </ThemeCtx.Provider>
    </SafeAreaProvider>
  );
}

/** Loads the signed-in user and their businesses, then hands over to the workspace. */
function Gate({ dark, setDark, onSignOut, onBuyer }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets();
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null), [uerr, setUerr] = useState<string | null>(null), [tick, setTick] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await withBusinessRequestTimeout(supabase.auth.getUser(), 'Loading your Business Space session');
        if (error || !data.user) throw error ?? new Error('Your session has expired. Please sign in again.');
        const p = await withBusinessRequestTimeout(supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle(), 'Loading your profile');
        setUser({ id: data.user.id, email: data.user.email ?? '', name: p.data?.full_name ?? (data.user.user_metadata as any)?.full_name ?? (data.user.email ?? '').split('@')[0] });
      } catch (e) { setUerr(errText(e)); }
    })();
  }, []);
  const mem = useQ(async () => {
    if (!user) return [] as Biz[];
    const rows = await withBusinessRequestTimeout(q<any[]>(supabase.from('business_members').select(`role,businesses(${BIZ_COLS})`).eq('user_id', user.id)), 'Loading your businesses');
    return rows.filter(r => r.businesses).map(r => ({ ...r.businesses, logo_url: null, description: null, phone: null, phone_country: null, email: null, address: null, city: null, country: null, website: null, hours: null, delivery_modes: null, role: r.role })) as Biz[];
  }, [user?.id, tick]);
  const reloadBiz = useCallback(() => setTick(x => x + 1), []);
  if (uerr) return <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: ins.top + 40 }}><ErrBox e={uerr} retry={onSignOut} /></View>;
  if (!user || (mem.l && !mem.d)) return <View style={{ flex: 1, backgroundColor: t.bg, padding: 16, paddingTop: ins.top + 20, gap: 12 }}><Skel h={56} /><Skel h={90} /><Skel h={300} /></View>;
  if (mem.e) return <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: ins.top + 40 }}><ErrBox e={mem.e} retry={mem.reload} /></View>;
  const list = mem.d ?? [];
  if (!list.length) return <FirstBusiness user={user} onCreated={reloadBiz} onBuyer={onBuyer} />;
  return <Workspace user={user} bizList={list} reloadBiz={reloadBiz} dark={dark} setDark={setDark} onSignOut={onSignOut} onBuyer={onBuyer} />;
}
function FirstBusiness({ user, onCreated }: any) {
  const t = useTheme(), ins = useSafeAreaInsets();
  const [error, setError] = useState<unknown>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const name = String(user.name ?? '').trim() || String(user.email ?? '').split('@')[0] || 'My Business';
        await withBusinessRequestTimeout(rpc('create_business', { p_name: name }), 'Creating your business workspace');
        if (active) onCreated();
      } catch (e) {
        if (active) setError(e);
      }
    })();
    return () => { active = false; };
  }, [user.id, attempt, onCreated]);
  if (error) {
    return <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: ins.top + 40 }}>
      <ErrBox e={error} retry={() => { setError(null); setAttempt(x => x + 1); }} />
    </View>;
  }
  return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
    <ActivityIndicator size="large" color={t.blue} />
    <Text style={{ color: t.mute, fontSize: 14 }}>Opening Business Space…</Text>
  </View>;
}

/** Everything that needs an active business. */
function Workspace({ user, bizList, reloadBiz, dark, setDark, onSignOut, onBuyer }: any) {
  const t = useTheme(), ins = useSafeAreaInsets(), s = useS();
  const [bizId, setBizId] = useState<string>(''), [tick, setTick] = useState(0), [range, setRange] = useState<Range>(presetRange('30D'));
  const [stack, setStack] = useState<{ page: string; arg?: any; fromProfile?: boolean }[]>([]);
  const [panel, setPanel] = useState<{ name: string; fromProfile?: boolean } | null>(null), [sheet, setSheet] = useState<{ name: string; arg?: any } | null>(null), [wiz, setWiz] = useState<{ feature: string; id?: string | null } | null>(null);
  const [toastT, setToastT] = useState<string | null>(null), [regDismissed, setRegDismissed] = useState(false), [pref, setPrefS] = useState({ push: true, email: false }), [lang, setLangS] = useState('English');
  const toastTimer = useRef<any>(null), bgAt = useRef(0);
  useEffect(() => { AsyncStorage.getItem('bs.biz').then(v => { if (v) setBizId(v); }).catch(() => undefined); AsyncStorage.getItem('bs.lang').then(v => { if (v) setLangS(v); }).catch(() => undefined); }, []);
  const biz: Biz = bizList.find((b: Biz) => b.id === bizId) ?? bizList[0];
  const bump = useCallback(() => setTick(x => x + 1), []);
  const toast = useCallback((m: string) => { setToastT(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastT(null), 2600); }, []);

  /* the registration reminder returns whenever the app is opened again */
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st === 'background' || st === 'inactive') bgAt.current = bgAt.current || Date.now(); else if (st === 'active') { if (bgAt.current && Date.now() - bgAt.current > 20000) setRegDismissed(false); bgAt.current = 0; } });
    return () => sub.remove();
  }, []);

  const meta = useQ<Meta>(async () => {
    const [feats, lc, un, cv, pm, rules] = await Promise.all([
      q<any[]>(supabase.from('business_features').select('feature,status').eq('business_id', biz.id)),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('business_id', biz.id).neq('status', 'archived'),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('business_id', biz.id).is('read_at', null),
      q<any[]>(supabase.from('conversations').select('unread_business').eq('business_id', biz.id)),
      supabase.from('payout_methods').select('status,last4').eq('business_id', biz.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('payout_rules').select('*').order('sort'),
    ]);
    const rr: any[] = rules.data ?? [];
    return {
      feats: feats.filter(f => FX.FM[f.feature]), listings: lc.count ?? 0, unreadN: un.count ?? 0, unreadM: cv.reduce((a, c) => a + (c.unread_business ?? 0), 0),
      payout: pm.data ? { status: pm.data.status, last4: pm.data.last4 } : null,
      rules: rr.length ? rr.map(r => ({ method: r.method, name: r.name, cap: Number(r.cap), window_days: r.window_days, fee: Number(r.fee), eta: r.eta ?? '', needs_bank: r.needs_bank })) : DEFAULT_RULES,
      minWithdrawal: rr.length ? Number(rr[0].min_withdrawal ?? 5) : 5,
    };
  }, [biz.id, tick]);
  const m: Meta = meta.d ?? { feats: [], listings: 0, unreadN: 0, unreadM: 0, payout: null, rules: DEFAULT_RULES, minWithdrawal: 5 };

  /* realtime: any change to this business refreshes the screen */
  useEffect(() => {
    let h: any;
    const ch = supabase.channel(`bs-${biz.id}`), kick = () => { clearTimeout(h); h = setTimeout(bump, 400); };
    ['wallet_ledger', 'feature_orders', 'notifications', 'business_activity', 'listings', 'conversations', 'payout_methods'].forEach(tb => ch.on('postgres_changes' as any, { event: '*', schema: 'public', table: tb, filter: `business_id=eq.${biz.id}` }, kick));
    ch.on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, kick);
    ch.subscribe();
    return () => { clearTimeout(h); supabase.removeChannel(ch); };
  }, [biz.id, bump]);

  /* preferences, push token, deep links */
  useEffect(() => { supabase.from('notification_prefs').select('push,email').eq('user_id', user.id).maybeSingle().then(r => { if (r.data) setPrefS(r.data as any); }); }, [user.id]);
  const nav = { go: (page: string, arg?: any) => { setStack(st => [...st, { page, arg, fromProfile: sheet?.name === 'profile' }]); setPanel(null); setSheet(null); } };
  useEffect(() => {
    if (!pref.push || Platform.OS === 'web') return;
    (async () => {
      try {
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
        if (status !== 'granted') return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
      } catch { /* push is optional */ }
    })();
  }, [pref.push]);
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      const d: any = r.notification.request.content.data ?? {};
      if (d.feature) nav.go('feature', { k: d.feature, focus: d.order }); else if (d.page) nav.go(d.page);
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handle = (url: string | null) => { if (url && url.includes('/business/payouts')) { WebBrowser.dismissBrowser(); bump(); setPanel({ name: 'payouts' }); } };
    Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener('url', e => handle(e.url));
    return () => sub.remove();
  }, [bump]);

  const back = useCallback(() => {
    setStack(st => { const x = st[st.length - 1]; if (x?.fromProfile) setSheet({ name: 'profile' }); return st.slice(0, -1); });
  }, []);
  const closePanel = useCallback(() => { setPanel(p => { if (p?.fromProfile) setSheet({ name: 'profile' }); return null; }); }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (wiz) return false;
      if (sheet) { setSheet(null); return true; }
      if (panel) { closePanel(); return true; }
      if (stack.length) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [wiz, sheet, panel, stack.length, back, closePanel]);

  const app: App = {
    biz, bizList, meta: m, userId: user.id, email: user.email, name: user.name, tick, bump, toast,
    go: nav.go, back, tab: p => { setStack([]); setSheet(null); setPanel(p ? { name: p } : null); },
    sheet: (name, arg) => setSheet({ name, arg }), closeSheet: () => setSheet(null),
    panel: (p, fromProfile) => { setSheet(null); setPanel(p ? { name: p, fromProfile } : null); },
    wizard: (feature, id) => { setWiz({ feature, id }); },
    range, setRange: r => setRange(r),
    selectBiz: id => { setBizId(id); AsyncStorage.setItem('bs.biz', id).catch(() => undefined); setStack([]); setPanel(null); setSheet(null); bump(); },
    reloadBiz, onBuyer, onSignOut, dark, setDark, lang, setLang: l => { setLangS(l); AsyncStorage.setItem('bs.lang', l).catch(() => undefined); supabase.from('profiles').upsert({ id: user.id, language: l }).then(() => undefined); },
    pref, setPref: p => { setPrefS(p); supabase.from('notification_prefs').upsert({ user_id: user.id, ...p }).then(r => { if (r.error) toast(r.error.message); }); },
    regDismissed, dismissReg: () => setRegDismissed(true),
  };

  const top = stack[stack.length - 1], Page = top ? PAGES[top.page] : null;
  const overlay = !!(top || panel || sheet || wiz);
  const panelTitle = panel ? panel.name[0].toUpperCase() + panel.name.slice(1) : '';
  return (
    <AppCtx.Provider value={app}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Home />
        <View style={{ position: 'absolute', bottom: ins.bottom + 12, left: 12, right: 12, minHeight: 66, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, elevation: 6, shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, zIndex: 10 }}>
          {TABS.map(([label, icon, key]) => { const on = (panel?.name ?? null) === key && !top; return (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => app.tab(key)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 }}>
              <MaterialCommunityIcons name={icon as any} size={22} color={on ? t.blue : t.mute} /><Text style={{ fontSize: 10, fontWeight: '700', color: on ? t.blue : t.mute }}>{label}</Text>
            </Pressable>); })}
        </View>
        {!overlay ? <SearchHandle onOpen={() => app.go('search')} /> : null}
        {Page ? <ArgCtx.Provider key={`${top!.page}:${stack.length}`} value={top!.arg}><Page /></ArgCtx.Provider> : null}
        {panel ? (
          <PanelSheet title={panelTitle} onClose={closePanel}>
            {panel.name === 'features' ? <FeaturesPanel /> : panel.name === 'orders' ? <OrdersPanel /> : panel.name === 'listings' ? <ListingsPanel /> : <PayoutsPanel />}
          </PanelSheet>
        ) : null}
        <SheetHost sheet={sheet} />
        {wiz ? <ListingWizard biz={biz} feature={wiz.feature} listingId={wiz.id} onToast={toast} onClose={() => { setWiz(null); bump(); }} onDone={(msg: string) => { setWiz(null); toast(msg); bump(); }} /> : null}
        {toastT ? <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: ins.bottom + 96, backgroundColor: t.ink, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, zIndex: 60 }}><Text style={{ color: t.bg, fontWeight: '600' }}>{toastT}</Text></View> : null}
      </View>
    </AppCtx.Provider>
  );
}