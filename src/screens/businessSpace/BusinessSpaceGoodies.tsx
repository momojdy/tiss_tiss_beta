/* Goodies tools for the Vendor Dashboard (Business Space).
   Moves the seller-side screens out of the Goodies customer app (v24 `seller` and `sellerEdit`) and adds store setup and ingredient requests.
   Store setup, products, builder configurations and publishing go through Supabase. Existing builder drafts are imported from AsyncStorage once; ingredient requests, their photos and the photo rules go through Supabase. */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput, Alert, Image } from 'react-native';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useApp, useArg, useS, useTheme, useQ, rpc, q, errText, Pg, Section, Field, Btn, Chips, Seg, Toggle, Pill, Row, Divided, Icon, SheetShell, Empty, ErrBox, Skel } from './BusinessSpaceShared';
import { TEMPLATES, TplBuilder, TplGroup, TplItem } from './goodiesTemplates';
import { fetchPublishedWantissContent } from '../../lib/wantissCms';

/* ---------- types (PROPOSED contracts) ---------- */
export type GStore = { demoStoreId: string; coverUrl: string | null; address: string; city: string; country: string; category: string; kind: string; minOrder: string; fee: string; pricingMode: 'fixed' | 'distance'; baseFee: string; perKmFee: string; minFee: string; maxFee: string; maxDistanceKm: string; etaMin: string; etaMax: string; acceptScheduledOrders: boolean; scheduledOrderStartMinutes: string; promo: string; delivery: boolean; pickup: boolean; names: Record<string, string> };
export type GProduct = { id: string; name: string; description: string; price: number; emoji: string; stock: number; available: boolean; restriction: 'none' | 'otc' | 'alcohol'; photoUrl: string | null; reviewStatus: 'pending' | 'approved' | 'rejected'; reviewNote: string | null };
export type GItem = TplItem & { id: string; avail: boolean };
export type GGroup = Omit<TplGroup, 'items'> & { id: string; items: GItem[] };
export type GBuilder = { id: string; type: 'pizza' | 'burger' | 'custom'; name: string; desc: string; emoji: string; base: string; enabled: boolean; available: boolean; sizes: { id: string; name: string; add: string; avail: boolean }[]; groups: GGroup[]; notes: boolean };
export type GRequest = { id: string; name: string; builder: 'pizza' | 'burger' | 'custom'; role: string; note: string; status: 'submitted' | 'approved' | 'denied' | 'needs_info'; reviewNote: string; photo: boolean; at: number };

/* admin-owned presets. The backend only accepts these category ids. */
export const CATEGORY_PRESETS: { id: string; name: string }[] = [
  { id: 'restaurants', name: 'Restaurant' }, { id: 'produce', name: 'Fresh produce' }, { id: 'beverages', name: 'Beverages' }, { id: 'bakery', name: 'Bakery & desserts' }, { id: 'meat', name: 'Meat & seafood' },
  { id: 'groceries', name: 'Groceries' }, { id: 'haitian', name: 'Haitian products' }, { id: 'care', name: 'Personal care' }, { id: 'drugstore', name: 'Drugstore' },
];
const ALC = /alcohol|alcool|liquor|licor|\brum\b|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\bbeer|bi[èe]re|cerveza|\bwine|\bvin\b|vino|champagne|cocktail|\bspirits\b|啤酒|白酒|葡萄酒|红酒|烈酒|威士忌|伏特加|朗姆|鸡尾酒/i;
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- data access ---------- */
const k = (b: string, n: string) => `bs.goodies.${n}.${b}`;
const rd = async <T,>(key: string, d: T): Promise<T> => { try { const v = await AsyncStorage.getItem(key); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
export const goodiesApi = {
  /* Store setup lives on the backend: the business is the store (store id = business id). */
  getStore: async (biz: string): Promise<GStore> => {
    const d: GStore = { demoStoreId: '', coverUrl: null, address: '', city: '', country: '', category: '', kind: '', minOrder: '5', fee: '2', pricingMode: 'fixed', baseFee: '2', perKmFee: '0.5', minFee: '0', maxFee: '', maxDistanceKm: '', etaMin: '20', etaMax: '35', acceptScheduledOrders: false, scheduledOrderStartMinutes: '60', promo: '', delivery: true, pickup: true, names: {} };
    const [r, business] = await Promise.all([
      q<any>(supabase.from('goodies_store_schedules').select('category,kind,min_order,delivery_fee,delivery_pricing_mode,delivery_base_fee,delivery_per_km_fee,delivery_min_fee,delivery_max_fee,delivery_max_distance_km,eta_min,eta_max,promo,names,delivery_modes,cover_url,address,city,country,accept_scheduled_orders,scheduled_order_start_minutes').eq('business_id', biz).maybeSingle()),
      q<any>(supabase.from('businesses').select('address,city,country').eq('id', biz).maybeSingle()),
    ]);
    if (!r) return { ...d, address: business?.address || '', city: business?.city || '', country: business?.country || '' };
    const modes: string[] = Array.isArray(r.delivery_modes) ? r.delivery_modes.map((x: string) => String(x).toLowerCase()) : [];
    return {
      demoStoreId: '', coverUrl: r.cover_url || null, address: r.address || business?.address || '', city: r.city || business?.city || '', country: r.country || business?.country || '', category: r.category || '', kind: r.kind || '', minOrder: String(r.min_order ?? 5), fee: String(r.delivery_fee ?? 2), pricingMode: r.delivery_pricing_mode === 'distance' ? 'distance' : 'fixed', baseFee: String(r.delivery_base_fee ?? r.delivery_fee ?? 2), perKmFee: String(r.delivery_per_km_fee ?? 0.5), minFee: String(r.delivery_min_fee ?? 0), maxFee: r.delivery_max_fee == null ? '' : String(r.delivery_max_fee), maxDistanceKm: r.delivery_max_distance_km == null ? '' : String(r.delivery_max_distance_km), etaMin: String(r.eta_min ?? 20), etaMax: String(r.eta_max ?? 35), acceptScheduledOrders: !!r.accept_scheduled_orders, scheduledOrderStartMinutes: String(r.scheduled_order_start_minutes ?? 60), promo: r.promo || '',
      delivery: modes.length ? modes.includes('delivery') : true, pickup: modes.length ? modes.includes('pickup') : true, names: r.names && typeof r.names === 'object' ? r.names : {},
    };
  },
  saveStoreCover: (biz: string, coverUrl: string | null) => rpc('goodies_save_store_cover', { p_business: biz, p_cover_url: coverUrl }),
  saveStore: async (biz: string, st: GStore) => {
    const names = Object.fromEntries(Object.entries(st.names).filter(([, v]) => String(v || '').trim()).map(([k2, v]) => [k2, String(v).trim().slice(0, 160)]));
    await rpc('goodies_save_store_setup', {
      p_business: biz, p_category: st.category, p_kind: st.kind.trim() || null, p_min_order: parseFloat(st.minOrder) || 0, p_delivery_fee: parseFloat(st.fee) || 0,
      p_eta_min: parseInt(st.etaMin, 10) || 20, p_eta_max: parseInt(st.etaMax, 10) || 35, p_promo: st.promo.trim() || null, p_names: names, p_delivery: st.delivery, p_pickup: st.pickup,
      p_delivery_pricing_mode: st.pricingMode, p_delivery_base_fee: parseFloat(st.baseFee) || 0, p_delivery_per_km_fee: parseFloat(st.perKmFee) || 0, p_delivery_min_fee: parseFloat(st.minFee) || 0, p_delivery_max_fee: st.maxFee.trim() ? parseFloat(st.maxFee) : null, p_delivery_max_distance_km: st.maxDistanceKm.trim() ? parseFloat(st.maxDistanceKm) : null, p_address: st.address.trim(), p_city: st.city.trim(), p_country: st.country.trim(), p_accept_scheduled_orders: st.acceptScheduledOrders, p_scheduled_order_start_minutes: parseInt(st.scheduledOrderStartMinutes, 10) || 60,
    });
  },
  /* Store publication is self-service for Business Space members. */
  getLive: async (biz: string) => {
    const r = await q<any>(supabase.from('goodies_store_schedules').select('is_live').eq('business_id', biz).maybeSingle());
    return { live: !!r?.is_live, hasSetup: !!r };
  },
  setLive: (biz: string, live: boolean) => rpc<boolean>('goodies_set_store_live', { p_business: biz, p_live: live }),
  /* Products (stock is set by the vendor). Row security allows owners and admins only. */
  listProducts: async (biz: string): Promise<GProduct[]> => {
    const rows = await q<any[]>(supabase.from('goodies_products').select('id,name,description,price,emoji,stock,is_available,restriction,photo_url,review_status,review_note').eq('business_id', biz).order('sort_order', { ascending: true }).order('created_at', { ascending: true }));
    return (rows || []).map(r => ({ id: r.id, name: r.name, description: r.description || '', price: Number(r.price), emoji: r.emoji || '🛍️', stock: Number(r.stock), available: !!r.is_available, restriction: r.restriction || 'none', photoUrl: r.photo_url || null, reviewStatus: r.review_status || 'approved', reviewNote: r.review_note || null }));
  },
  saveProduct: async (biz: string, p: Partial<GProduct> & { id?: string }) => {
    const f: Record<string, unknown> = {};
    if (p.name !== undefined) f.name = p.name.trim();
    if (p.description !== undefined) f.description = p.description.trim() || null;
    if (p.price !== undefined) f.price = p.price;
    if (p.emoji !== undefined) f.emoji = p.emoji.trim() || '🛍️';
    if (p.stock !== undefined) f.stock = p.stock;
    if (p.available !== undefined) f.is_available = p.available;
    if (!p.id) { f.review_status = 'approved'; f.review_note = null; }
    if (p.restriction !== undefined) f.restriction = p.restriction;
    if ('photoUrl' in p) f.photo_url = p.photoUrl || null;
    const res = p.id ? await supabase.from('goodies_products').update({ ...f, updated_at: new Date().toISOString() }).eq('id', p.id).select('id') : await supabase.from('goodies_products').insert({ ...f, business_id: biz }).select('id');
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) throw new Error('Not allowed. Only the owner or an admin can change products.');
  },
  deleteProduct: async (id: string) => {
    const res = await supabase.from('goodies_products').delete().eq('id', id).select('id');
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) throw new Error('Not allowed. Only the owner or an admin can delete products.');
  },
  listBuilders: async (biz: string): Promise<GBuilder[]> => {
    const remote = await q<any[]>(supabase.from('goodies_builder_configs').select('config,enabled').eq('business_id', biz).order('created_at', { ascending: true }));
    // Vendors must be able to open and finish unpublished drafts created in the admin.
    // Keep the server publication flag separate from the editable config payload.
    if (remote?.length) return remote.filter(row => row.config).map(row => {
      const config = row.config as GBuilder;
      // The table's enabled flag combines "offered" and "available". Keep the
      // vendor's separate offered setting from the config so both toggles work.
      return { ...config, enabled: typeof config.enabled === 'boolean' ? config.enabled : !!row.enabled };
    });
    // One-time compatibility import: existing vendor drafts are pushed to the server when opened.
    const local = await rd<GBuilder[]>(k(biz, 'builders'), []);
    if (local.length) { await goodiesApi.saveBuilders(biz, local); return local; }
    return [];
  },
  saveBuilders: async (biz: string, l: GBuilder[]) => {
    await rpc('goodies_save_builder_configs', { p_business: biz, p_configs: l });
    await AsyncStorage.setItem(k(biz, 'builders'), JSON.stringify(l));
    try {
      const st = await goodiesApi.getStore(biz), sid = st.demoStoreId || biz, raw = JSON.parse((await AsyncStorage.getItem('goodies-byo-v4')) || 'null') || { cfg: {}, store: {}, drafts: {} };
      raw.cfg = raw.cfg || {}; raw.cfg[sid] = l; await AsyncStorage.setItem('goodies-byo-v4', JSON.stringify(raw));
    } catch { /* local compatibility cache only */ }
  },
  listRequests: async (biz: string): Promise<GRequest[]> => {
    const rows = await rpc<any[]>('goodies_list_ingredient_requests', { p_business: biz });
    return (rows || []).map(r => ({ id: r.id, name: r.name, builder: r.builder, role: r.role || '', note: r.note || '', status: r.status, reviewNote: r.review_note || '', photo: !!r.image_path, at: Date.parse(r.created_at) }));
  },
  rules: async (): Promise<string> => String((await rpc<string>('goodies_get_ingredient_rules', {})) || ''),
  uploadRequestPhoto: async (biz: string, uri: string): Promise<string> => {
    const m = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
    const b64 = await FileSystem.readAsStringAsync(m.uri, { encoding: FileSystem.EncodingType.Base64 });
    const path = `${biz}/${uid()}${uid()}.jpg`;
    const { error } = await supabase.storage.from('goodies-ingredient-requests').upload(path, decode(b64), { contentType: 'image/jpeg' });
    if (error) throw error;
    return path;
  },
  submitRequest: (biz: string, f: { name: string; builder: string; role: string; note: string }, imagePath: string | null) =>
    rpc('goodies_submit_ingredient_request', { p_business: biz, p_name: f.name, p_builder: f.builder, p_role: f.role || null, p_note: f.note || null, p_image_path: imagePath }),
  library: async () => {
    try {
      const remote = await fetchPublishedWantissContent('en');
      const record = remote.content.find(x => x.content_key === 'goodies.library' || x.content_key === 'goodies.vendor.library');
      const payload = record?.payload as { items?: { id: string; b: 'burger' | 'pizza'; n: string; hasArt?: boolean }[] } | undefined;
      const base = Array.isArray(payload?.items) ? payload.items : [];
      const added = await rpc<any[]>('goodies_list_library_ingredients', {}).catch(() => [] as any[]);
      const seen = new Set(base.map(x => x.id));
      const extra = (added || []).filter(x => (x.builder === 'pizza' || x.builder === 'burger') && !seen.has(x.id)).map(x => ({ id: x.id as string, b: x.builder as 'burger' | 'pizza', n: x.name as string, hasArt: !!x.asset_key }));
      return [...base, ...extra];
    } catch {
      return [];
    }
  },
};

export function newBuilder(type: 'pizza' | 'burger' | 'custom'): GBuilder {
  const t: TplBuilder = TEMPLATES[type];
  return {
    id: uid(), type, name: t.name, desc: t.desc, emoji: t.emoji, base: String(t.base), enabled: true, available: true, notes: true,
    sizes: t.sizes.map(s => ({ id: uid(), name: s.name, add: String(s.add), avail: true })),
    groups: t.groups.map(g => ({ ...g, id: uid(), items: g.items.map(i => ({ ...i, id: uid(), avail: true })) })),
  };
}

/* validation. Rules ported from the v24 builder rules (min/max/included/max-same); exact v24 save-time messages still need a side-by-side check. */
export function validateBuilder(b: GBuilder): string[] {
  const e: string[] = [];
  if (!b.name.trim()) e.push('Give this custom product a name');
  if (!(parseFloat(b.base) >= 0)) e.push('Base price must be 0 or more');
  if (b.type === 'pizza' && !b.sizes.length) e.push('Add at least one size');
  b.sizes.forEach(s => { if (!s.name.trim()) e.push('Every size needs a name'); if (!(parseFloat(s.add) >= 0)) e.push(`Size "${s.name || '?'}" needs a price of 0 or more`); });
  if (!b.groups.length) e.push('Add at least one group');
  b.groups.forEach(g => {
    const n = g.name.trim() || 'A group';
    if (!g.name.trim()) e.push('Every group needs a name');
    if (!g.items.length) e.push(`${n} needs at least one ingredient`);
    if (g.kind === 'many') {
      if (g.min < 0 || g.min > g.max) e.push(`${n}: minimum cannot be above maximum`);
      if (g.max > g.items.length) e.push(`${n}: maximum is more than the number of ingredients`);
      if (g.inc > g.max) e.push(`${n}: included picks cannot be above the maximum`);
      if (g.me < 1) e.push(`${n}: "same ingredient" limit must be at least 1`);
    }
    if (g.req && !g.items.some(i => i.avail)) e.push(`${n} is required but has no available ingredient`);
    g.items.forEach(i => {
      if (!i.name.trim()) e.push(`${n}: every ingredient needs a name`);
      if (!i.free && !(i.price >= 0)) e.push(`${n}: "${i.name || '?'}" needs a price of 0 or more`);
      if (i.max != null && (i.max < 1 || (g.kind === 'many' && i.max > g.max))) e.push(`${n}: "${i.name}" limit must be between 1 and the group maximum`);
    });
  });
  return Array.from(new Set(e));
}

/* ---------- entry card shown on the Goodies feature page ---------- */
export function GoodiesToolsCard() {
  const app = useApp(), s = useS(), t = useTheme();
  const R = (title: string, sub: string, page: string) => <Row title={title} sub={sub} onPress={() => app.go(page)} right={<Icon name="chevron-right" size={18} color={t.mute} />} />;
  if (!app.meta.feats.some(f => f.feature === 'goodies')) return null;
  return (
    <View style={s.cardFlat}><Divided>
      {R('Orders', 'Review new orders and accept or decline within 15 minutes', 'goodiesOrders')}
      {R('Store setup', 'Category, minimum order, delivery fee, time and publishing', 'goodiesStore')}
      {R('Products', 'Items, prices and stock customers can buy', 'goodiesProducts')}
      {R('Ingredient requests', 'Ask the platform to add a new ingredient', 'goodiesRequests')}
    </Divided></View>
  );
}

/* ---------- store setup ---------- */
const LANGS: [string, string][] = [['fr', 'Français'], ['ht', 'Kreyòl ayisyen'], ['es', 'Español'], ['zh-Hans', '简体中文']];
const COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const COUNTRY_OPTIONS = COUNTRY_CODES.map(code => {
  let name = code;
  try { name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch {}
  const flag = String.fromCodePoint(...code.split('').map(ch => 127397 + ch.charCodeAt(0)));
  return { code, name, flag };
}).sort((a, b) => a.name.localeCompare(b.name));
const countryOption = (value: string) => COUNTRY_OPTIONS.find(x => x.code === value || x.name.toLowerCase() === value.toLowerCase());

export function GoodiesToolsPage() {
  const app = useApp();
  return <Pg title="Goodies tools" onBack={app.back}><GoodiesToolsCard /></Pg>;
}

export function GoodiesStorePage() {
  const app = useApp(), s = useS(), t = useTheme();
  const [f, setF] = useState<GStore | null>(null), [busy, setBusy] = useState(false), [coverBusy, setCoverBusy] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [customProducts, setCustomProducts] = useState(false), [customTypes, setCustomTypes] = useState<GBuilder[]>([]);
  const [countryOpen, setCountryOpen] = useState(false), [countryQuery, setCountryQuery] = useState('');
  const load = () => {
    setLoadErr('');
    goodiesApi.getStore(app.biz.id).then(setF).catch(e => setLoadErr(errText(e)));
    goodiesApi.listBuilders(app.biz.id).then(rows => {
      setCustomTypes(rows.filter(x => x.type === 'pizza' || x.type === 'burger'));
      setCustomProducts(rows.some(x => (x.type === 'pizza' || x.type === 'burger') && x.enabled));
    }).catch(e => setLoadErr(errText(e)));
  };
  useEffect(load, [app.biz.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (loadErr) return <Pg title="Store setup" onBack={app.back}><ErrBox e={loadErr} retry={load} /></Pg>;
  if (!f) return <Pg title="Store setup" onBack={app.back}><Skel h={90} /><Skel h={200} /></Pg>;
  const set = (p: Partial<GStore>) => setF({ ...f, ...p });
  const err = (): string => {
    if (!f.category) return 'Choose a store category';
    if (!f.address.trim() || !f.city.trim() || !f.country.trim()) return 'Enter the full store address, city and country';
    if (!(parseFloat(f.minOrder) >= 0)) return 'Minimum order must be 0 or more';
    if (f.pricingMode === 'fixed' && !(parseFloat(f.fee) >= 0)) return 'Delivery fee must be 0 or more (use 0 for free delivery)';
    if (f.pricingMode === 'distance' && (!(parseFloat(f.baseFee) >= 0) || !(parseFloat(f.perKmFee) >= 0) || !(parseFloat(f.minFee) >= 0) || (f.maxFee.trim() && !(parseFloat(f.maxFee) >= parseFloat(f.minFee))) || (f.maxDistanceKm.trim() && !(parseFloat(f.maxDistanceKm) > 0)))) return 'Enter valid distance delivery pricing values';
    if (!(parseInt(f.etaMin, 10) > 0) || !(parseInt(f.etaMax, 10) >= parseInt(f.etaMin, 10))) return 'Enter a valid delivery time range';
    if (f.acceptScheduledOrders && (!(parseInt(f.scheduledOrderStartMinutes, 10) >= 15) || !(parseInt(f.scheduledOrderStartMinutes, 10) <= 10080))) return 'Set scheduled orders at least 15 minutes ahead';
    if (!f.delivery && !f.pickup) return 'Keep delivery or pickup on';
    if (ALC.test(f.promo)) return 'Alcohol ads and promotions are prohibited on Wantiss';
    return '';
  };
  const save = async () => {
    const e = err(); if (e) return app.toast(e);
    setBusy(true);
    try {
      await goodiesApi.saveStore(app.biz.id, f);
      const rows = await goodiesApi.listBuilders(app.biz.id);
      const next = rows.filter(x => x.type !== 'pizza' && x.type !== 'burger');
      next.push(...customTypes.map(x => ({ ...x, enabled: customProducts && x.enabled })));
      await goodiesApi.saveBuilders(app.biz.id, next);
      app.toast('Store saved'); app.bump();
    } catch (x) { app.toast(errText(x)); } finally { setBusy(false); }
  };
  const chooseCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return app.toast('Allow photo access to choose a store cover');
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.9 });
    if (picked.canceled || !picked.assets?.[0]) return;
    setCoverBusy(true);
    let uploadedPath = '';
    try {
      const resized = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 1600 } }], { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG });
      const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: FileSystem.EncodingType.Base64 });
      uploadedPath = `${app.biz.id}/goodies/store-cover/${uid()}${uid()}.jpg`;
      const { error } = await supabase.storage.from('listing-photos').upload(uploadedPath, decode(base64), { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error) throw error;
      const url = supabase.storage.from('listing-photos').getPublicUrl(uploadedPath).data.publicUrl;
      await goodiesApi.saveStoreCover(app.biz.id, url);
      setF(current => current ? { ...current, coverUrl: url } : current);
      app.toast('Store cover updated');
    } catch (e) {
      if (uploadedPath) await supabase.storage.from('listing-photos').remove([uploadedPath]).catch(() => undefined);
      app.toast(errText(e));
    } finally { setCoverBusy(false); }
  };
  return (
    <Pg title="Store setup" onBack={app.back}>
      <GoLiveCard />
      <Section title="Store cover photo" />
      {f.coverUrl ? <Image source={{ uri: f.coverUrl }} style={{ width: '100%', height: 150, borderRadius: 14, marginBottom: 8 }} /> : <View style={{ height: 130, borderRadius: 14, backgroundColor: s.card.backgroundColor, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Text style={s.mut}>No store cover photo yet</Text></View>}
      <Btn kind="soft" label={f.coverUrl ? 'Change cover photo' : 'Add cover photo'} onPress={chooseCover} busy={coverBusy} />
      <Section title="Store category" />
      <Chips items={CATEGORY_PRESETS.map(c => ({ k: c.id, l: c.name }))} value={f.category} onChange={(v: string) => set({ category: v })} />
      {f.category === 'drugstore' ? <View style={s.card}><Text style={s.title}>Pharmacy licence required</Text><Text style={s.mut}>Drugstore stores must upload a pharmacy licence during registration. Only over-the-counter products are allowed.</Text></View> : null}
      <Field label="Store type" value={f.kind} onChangeText={(v: string) => set({ kind: v })} />
      <Section title="Store address" />
      <Field label="Street address" value={f.address} onChangeText={(v: string) => set({ address: v })} placeholder="Street, building and number" />
      <View style={s.row}><View style={s.g}><Field label="City" value={f.city} onChangeText={(v: string) => set({ city: v })} /></View><View style={s.g}><Text style={s.label}>Country</Text><Pressable onPress={() => { setCountryQuery(''); setCountryOpen(true); }} style={[s.fld, { minHeight: 48, justifyContent: 'center' }]}><Text style={{ color: t.ink, fontSize: 14 }}>{countryOption(f.country) ? countryOption(f.country)!.flag + '  ' + countryOption(f.country)!.name + ' (' + countryOption(f.country)!.code + ')' : 'Choose country'}</Text></Pressable></View></View>
      <Modal visible={countryOpen} transparent animationType="slide" onRequestClose={() => setCountryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, maxHeight: '82%' }}>
            <View style={[s.row, { marginBottom: 12 }]}><Text style={[s.h1, s.g]}>Choose country</Text><Pressable onPress={() => setCountryOpen(false)}><Icon name="close" size={22} /></Pressable></View>
            <TextInput value={countryQuery} onChangeText={setCountryQuery} placeholder="Search countries" placeholderTextColor={t.mute} style={[s.fld, { marginBottom: 8 }]} />
            <ScrollView keyboardShouldPersistTaps="handled">
              {COUNTRY_OPTIONS.filter(x => (x.name + ' ' + x.code).toLowerCase().includes(countryQuery.trim().toLowerCase())).map(x => <Pressable key={x.code} onPress={() => { set({ country: x.name }); setCountryOpen(false); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 22 }}>{x.flag}</Text><Text style={{ color: t.ink, flex: 1 }}>{x.name}</Text><Text style={{ color: t.mute, fontWeight: '700' }}>{x.code}</Text></Pressable>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Section title="Custom products" />
      <View style={[s.row, { marginTop: 4 }]}>
        <Text style={[s.title, s.g]}>Allow custom products</Text>
        <Toggle value={customProducts} onValueChange={setCustomProducts} />
      </View>
      {customProducts ? <View>
        {(['pizza', 'burger'] as const).map(type => {
          const current = customTypes.find(x => x.type === type && x.enabled);
          return <View key={type} style={[s.row, { marginTop: 10 }]}>
            <View style={s.g}><Text style={s.title}>{type === 'pizza' ? 'Pizza' : 'Burger'}</Text></View>
            <Toggle value={!!current} onValueChange={v => setCustomTypes(prev => {
              const found = prev.some(x => x.type === type);
              if (found) return prev.map(x => x.type === type ? { ...x, enabled: v } : x);
              return [...prev, { ...newBuilder(type), enabled: v }];
            })} />
          </View>;
        })}
      </View> : null}
      <Section title="Orders" />
      <Field label="Minimum order ($)" keyboardType="decimal-pad" value={f.minOrder} onChangeText={(v: string) => set({ minOrder: v })} />
      <View style={[s.row, { marginTop: 8 }]}><Text style={[s.title, s.g]}>Accept orders for later</Text><Toggle value={f.acceptScheduledOrders} onValueChange={(v: boolean) => set({ acceptScheduledOrders: v })} /></View>
      {f.acceptScheduledOrders ? <Field label="Minimum notice for first delivery (minutes)" keyboardType="number-pad" value={f.scheduledOrderStartMinutes} onChangeText={(v: string) => set({ scheduledOrderStartMinutes: v.replace(/\D/g, '') })} /> : null}
      <Section title="Delivery pricing" />
      <Seg value={f.pricingMode === 'distance' ? 'By distance' : 'Fixed fee'} onChange={(v: string) => set({ pricingMode: v === 'By distance' ? 'distance' : 'fixed' })} items={['Fixed fee', 'By distance']} />
      {f.pricingMode === 'fixed' ? <Field label="Delivery fee ($, 0 = free)" keyboardType="decimal-pad" value={f.fee} onChangeText={(v: string) => set({ fee: v })} /> : <View><Field label="Base delivery fee ($)" keyboardType="decimal-pad" value={f.baseFee} onChangeText={(v: string) => set({ baseFee: v })} /><Field label="Price per kilometre ($)" keyboardType="decimal-pad" value={f.perKmFee} onChangeText={(v: string) => set({ perKmFee: v })} /><Field label="Minimum delivery fee ($)" keyboardType="decimal-pad" value={f.minFee} onChangeText={(v: string) => set({ minFee: v })} /><Field label="Maximum delivery fee ($, optional)" keyboardType="decimal-pad" value={f.maxFee} onChangeText={(v: string) => set({ maxFee: v })} /><Field label="Maximum delivery distance in km (optional)" keyboardType="decimal-pad" value={f.maxDistanceKm} onChangeText={(v: string) => set({ maxDistanceKm: v })} /></View>}
      <View style={s.row}><View style={s.g}><Field label="Fastest (min)" keyboardType="number-pad" value={f.etaMin} onChangeText={(v: string) => set({ etaMin: v })} /></View><View style={s.g}><Field label="Slowest (min)" keyboardType="number-pad" value={f.etaMax} onChangeText={(v: string) => set({ etaMax: v })} /></View></View>
      <View style={[s.row, { marginTop: 12 }]}><Text style={[s.title, s.g]}>Delivery</Text><Toggle value={f.delivery} onValueChange={(v: boolean) => set({ delivery: v })} /></View>
      <View style={[s.row, { marginTop: 8 }]}><Text style={[s.title, s.g]}>Pickup</Text><Toggle value={f.pickup} onValueChange={(v: boolean) => set({ pickup: v })} /></View>
      <Field label="Promotion line on your card (optional)" value={f.promo} onChangeText={(v: string) => set({ promo: v })} />
      <Section title="Store name in other languages (optional)" />
      {LANGS.map(([c, n]) => <Field key={c} label={n} value={f.names[c] || ''} onChangeText={(v: string) => set({ names: { ...f.names, [c]: v } })} />)}
      <View style={{ height: 14 }} /><Btn label="Save store" onPress={save} busy={busy} />
    </Pg>
  );
}

/* ---------- publish / unpublish ---------- */
function GoLiveCard() {
  const app = useApp(), s = useS();
  const st = useQ(() => goodiesApi.getLive(app.biz.id), [app.biz.id, app.tick]);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const live = !!st.d?.live;
  const toggle = async () => {
    setBusy(true); setErr('');
    try { const now = await goodiesApi.setLive(app.biz.id, !live); app.toast(now ? 'Your store is live' : 'Your store is unpublished'); st.reload(); }
    catch (e) { const m = errText(e); setErr(m); app.toast(m); }
    finally { setBusy(false); }
  };
  if (st.e && !st.d) return <ErrBox e={st.e} retry={st.reload} />;
  return (
    <View style={[s.row, { paddingVertical: 4 }]}>
      <View style={s.g}><Text style={s.title}>Store status</Text>{st.d ? <Pill tone={live ? 'good' : 'mute'}>{live ? 'Live' : 'Not live'}</Pill> : null}</View>
      <Btn small label={live ? 'Unpublish' : 'Go live'} kind={live ? 'soft' : 'primary'} busy={busy} disabled={!st.d} onPress={toggle} />
      {err ? <Text style={[s.mut, { marginTop: 8 }]}>{err}</Text> : null}
    </View>
  );
}

/* ---------- products ---------- */
const RESTRICTIONS: { k: GProduct['restriction']; l: string }[] = [{ k: 'none', l: 'No restriction' }, { k: 'otc', l: 'Over the counter' }, { k: 'alcohol', l: 'Alcohol' }];
const BLANK: GProduct = { id: '', name: '', description: '', price: 0, emoji: '🛍️', stock: 0, available: true, restriction: 'none', photoUrl: null, reviewStatus: 'approved', reviewNote: null };
const dollars = (n: number) => '$' + n.toFixed(2);
function ProductSheet({ product, onClose, onSaved }: { product: GProduct; onClose: () => void; onSaved: () => void }) {
  const app = useApp(), s = useS();
  const [f, setF] = useState({ name: product.name, description: product.description, price: product.id ? String(product.price) : '', stock: String(product.stock), emoji: product.emoji, restriction: product.restriction, photoUrl: product.photoUrl || '', photoUri: '', removePhoto: false });
  const [busy, setBusy] = useState(false);
  const [customTypes, setCustomTypes] = useState<GBuilder[]>([]);
  const [productMode, setProductMode] = useState<'regular' | 'custom'>('regular');
  useEffect(() => { if (!product.id) goodiesApi.listBuilders(app.biz.id).then(rows => setCustomTypes(rows.filter(x => (x.type === 'pizza' || x.type === 'burger') && x.enabled))).catch(() => setCustomTypes([])); }, [product.id, app.biz.id]);
  const openCustom = (type: 'pizza' | 'burger') => {
    onClose();
    app.go('goodiesBuilder', { type, create: true });
  };
  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { app.toast('Allow photo access to choose a product photo'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!picked.canceled && picked.assets[0]) setF(prev => ({ ...prev, photoUri: picked.assets[0].uri, removePhoto: false }));
  };
  const check = (): string => {
    const name = f.name.trim(), price = parseFloat(f.price), stock = Number(f.stock);
    if (name.length < 1 || name.length > 120) return 'Enter a product name (up to 120 characters)';
    if (!(price >= 0) || price > 100000) return 'Enter a price between 0 and 100,000';
    if (Math.round(price * 100) / 100 !== price) return 'Use at most two decimals in the price';
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return 'Stock must be a whole number from 0 to 100,000';
    if (f.description.length > 500) return 'Description is up to 500 characters';
    if (ALC.test(name + ' ' + f.description) && f.restriction !== 'alcohol') return 'This looks like alcohol. Set the restriction to Alcohol.';
    return '';
  };
  const save = async () => {
    const e = check(); if (e) return app.toast(e);
    setBusy(true);
    let uploadedPath = '';
    try {
      let photoUrl: string | null = f.removePhoto ? null : f.photoUrl || null;
      if (f.photoUri) {
        const resized = await ImageManipulator.manipulateAsync(f.photoUri, [{ resize: { width: 1200 } }], { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG });
        const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: FileSystem.EncodingType.Base64 });
        uploadedPath = `${app.biz.id}/goodies/products/${uid()}${uid()}.jpg`;
        const { error } = await supabase.storage.from('listing-photos').upload(uploadedPath, decode(base64), { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (error) throw error;
        photoUrl = supabase.storage.from('listing-photos').getPublicUrl(uploadedPath).data.publicUrl;
      }
      await goodiesApi.saveProduct(app.biz.id, { id: product.id || undefined, name: f.name, description: f.description, price: parseFloat(f.price), stock: Number(f.stock), emoji: f.emoji, restriction: f.restriction, photoUrl });
      if (product.photoUrl && (product.photoUrl !== photoUrl || f.removePhoto)) {
        const marker = '/storage/v1/object/public/listing-photos/';
        const oldPath = product.photoUrl.includes(marker) ? decodeURIComponent(product.photoUrl.split(marker).pop() || '') : '';
        if (oldPath) await supabase.storage.from('listing-photos').remove([oldPath]);
      }
      app.toast(product.id ? 'Product saved and updated in your store.' : 'Product added to your store.'); onSaved();
    }
    catch (x) {
      if (uploadedPath) await supabase.storage.from('listing-photos').remove([uploadedPath]).catch(() => undefined);
      app.toast(errText(x));
    }
    finally { setBusy(false); }
  };
  const del = () => Alert.alert('Delete this product?', 'Customers will no longer see it. Past orders are not affected.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { setBusy(true); try { await goodiesApi.deleteProduct(product.id); app.toast('Product deleted'); onSaved(); } catch (x) { app.toast(errText(x)); } finally { setBusy(false); } } },
  ]);
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
        <SheetShell title={product.id ? 'Edit product' : 'Add product'} onClose={onClose} tall>
          {!product.id && customTypes.length > 0 ? <View style={{ marginBottom: 12 }}>
            <Text style={s.label}>Product type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Btn small kind={productMode === 'regular' ? 'primary' : 'soft'} label="Regular product" onPress={() => setProductMode('regular')} /></View>
              <View style={{ flex: 1 }}><Btn small kind={productMode === 'custom' ? 'primary' : 'soft'} label="Custom product" onPress={() => setProductMode('custom')} /></View>
            </View>
            {productMode === 'custom' ? <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(['pizza', 'burger'] as const).filter(type => customTypes.some(x => x.type === type)).map(type => <View key={type} style={{ flex: 1 }}><Btn small kind="soft" label={type === 'pizza' ? 'Pizza' : 'Burger'} onPress={() => openCustom(type)} /></View>)}
              </View>
            </View> : null}
          </View> : null}
          <Text style={s.label}>Product photo</Text>
          {f.photoUri || f.photoUrl ? <Image source={{ uri: f.photoUri || f.photoUrl }} style={{ width: 132, height: 132, borderRadius: 12, marginBottom: 8 }} /> : <View style={{ width: 132, height: 132, borderRadius: 12, marginBottom: 8, backgroundColor: '#F1F3EF' }} />}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}><Btn small kind="soft" label={f.photoUri || f.photoUrl ? 'Change photo' : 'Add photo'} onPress={choosePhoto} /><Btn small kind="soft" label="Remove" disabled={!f.photoUri && !f.photoUrl} onPress={() => setF({ ...f, photoUri: '', photoUrl: '', removePhoto: true })} /></View>
          <Field label="Name" value={f.name} onChangeText={(v: string) => setF({ ...f, name: v })} />
          <View style={s.row}><View style={s.g}><Field label="Price ($)" keyboardType="decimal-pad" value={f.price} onChangeText={(v: string) => setF({ ...f, price: v })} /></View><View style={s.g}><Field label="In stock" keyboardType="number-pad" value={f.stock} onChangeText={(v: string) => setF({ ...f, stock: v.replace(/\D/g, '') })} /></View></View>
          {Number.isFinite(parseFloat(f.price)) && parseFloat(f.price) >= 0 ? <View style={[s.card, { marginTop: 4 }]}><Text style={s.title}>Your earnings per unit</Text><View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>Selling price</Text><Text style={s.rt}>{dollars(parseFloat(f.price))}</Text></View><View style={s.row}><Text style={[s.mut, s.g]}>Service fee (10%)</Text><Text style={s.rt}>−{dollars(Math.round(parseFloat(f.price) * 10) / 100)}</Text></View><View style={s.row}><Text style={[s.title, s.g]}>You receive</Text><Text style={s.title}>{dollars(Math.round(parseFloat(f.price) * 90) / 100)}</Text></View></View> : null}
          <Field label="Description (optional)" value={f.description} onChangeText={(v: string) => setF({ ...f, description: v })} multiline />
          <Text style={s.label}>Restriction</Text>
          <Chips items={RESTRICTIONS} value={f.restriction} onChange={(v: GProduct['restriction']) => setF({ ...f, restriction: v })} />
          <Text style={[s.mut, { marginTop: 6 }]}>Alcohol cannot be ordered online yet. Mark it so it stays blocked.</Text>
          <View style={{ height: 12 }} /><Btn label={product.id ? 'Save product' : 'Add product'} onPress={save} busy={busy} />
          {product.id ? <><View style={{ height: 8 }} /><Btn kind="soft" label="Delete product" onPress={del} disabled={busy} /></> : null}
        </SheetShell>
      </View>
    </Modal>
  );
}

export function GoodiesProductsPage() {
  const app = useApp(), s = useS(), t = useTheme(), route = useArg() as { add?: boolean } | undefined;
  const add = route?.add;
  const lst = useQ(() => goodiesApi.listProducts(app.biz.id), [app.biz.id, app.tick]);
  const [edit, setEdit] = useState<GProduct | null>(null);
  useEffect(() => { if (add) setEdit(BLANK); }, [add]);
  const items = lst.d ?? [];
  const toggle = async (p: GProduct, v: boolean) => { try { await goodiesApi.saveProduct(app.biz.id, { id: p.id, available: v }); lst.reload(); } catch (e) { app.toast(errText(e)); } };
  return (
    <Pg title="Products" onBack={app.back} refreshing={lst.l && !!lst.d} onRefresh={lst.reload}>
      <Text style={s.mut}>Set the price and how many you have. Stock goes down when customers order and back up if an order is cancelled. Customers only see available products while your store is live.</Text>
      <Btn label="+ Add product" onPress={() => setEdit(BLANK)} />
      <View style={{ height: 8 }} />

      {lst.e && !lst.d ? <ErrBox e={lst.e} retry={lst.reload} /> : lst.l && !lst.d ? <Skel h={120} /> : items.length ? (
        <View style={s.cardFlat}><Divided>{items.map(p => (
          <Row key={p.id} left={p.photoUrl ? <Image source={{ uri: p.photoUrl }} style={{ width: 48, height: 48, borderRadius: 10, marginRight: 6 }} /> : <Text style={{ fontSize: 26, marginRight: 4 }}>{p.emoji}</Text>} title={p.name} sub={`${dollars(p.price)} · ${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}${p.restriction !== 'none' ? ' · ' + (p.restriction === 'alcohol' ? 'Alcohol' : 'Over the counter') : ''}`}
            onPress={() => setEdit(p)} right={<Toggle value={p.available} disabled={p.stock <= 0} onValueChange={(v: boolean) => toggle(p, v)} />} />
        ))}</Divided></View>
      ) : <View style={s.cardFlat}><Empty icon="package-variant-closed" title="No products yet" hint="Add your first product. You need at least one in stock to go live." cta="Add product" onCta={() => setEdit(BLANK)} /></View>}
      <GoLiveCard />
      {edit ? <ProductSheet product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); lst.reload(); }} /> : null}
    </Pg>
  );
}

/* ---------- builder editor ---------- */
function LibraryPicker({ type, onPick, onClose }: { type: 'pizza' | 'burger'; onPick: (id: string, name: string) => void; onClose: () => void }) {
  const s = useS(), t = useTheme();
  const [q, setQ] = useState('');
  const [library, setLibrary] = useState<{ id: string; b: 'burger' | 'pizza'; n: string; hasArt?: boolean }[]>([]);
  useEffect(() => { let active = true; goodiesApi.library().then(rows => { if (active) setLibrary(rows); }).catch(() => { if (active) setLibrary([]); }); return () => { active = false; }; }, []);
  const list = useMemo(() => library.filter(l => l.b === type && l.n.toLowerCase().includes(q.toLowerCase())), [library, type, q]);
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
        <SheetShell title="Ingredient library" onClose={onClose} tall>
          <Field label="Search" value={q} onChangeText={setQ} />
          <ScrollView style={{ maxHeight: 380 }}>
            {list.map(l => <Row key={l.id} title={l.n} sub={l.id} onPress={() => onPick(l.id, l.n)} right={<Icon name="plus" size={18} color={t.mute} />} />)}
            {!list.length ? <Text style={s.mut}>Nothing matches. You can request a missing ingredient.</Text> : null}
          </ScrollView>
        </SheetShell>
      </View>
    </Modal>
  );
}

export function GoodiesBuilderEditPage() {
  const app = useApp(), s = useS(), t = useTheme(), route = useArg() as { id?: string; type?: 'pizza' | 'burger'; create?: boolean } | undefined, id = route?.id, createType = route?.create ? route.type : undefined;
  const [all, setAll] = useState<GBuilder[]>([]), [b, setB] = useState<GBuilder | null>(null), [pick, setPick] = useState<{ gi: number; ii: number } | null>(null), [errs, setErrs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(''); setB(null);
    goodiesApi.listBuilders(app.biz.id).then(l => {
      if (!active) return;
      setAll(l);
      setB(createType ? newBuilder(createType) : id ? l.find(x => x.id === id) || null : null);
    }).catch(e => {
      if (active) setLoadError(errText(e));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [app.biz.id, id, createType]);
  if (loading) return <Pg title="Custom product" onBack={app.back}><Skel h={180} /><Skel h={220} /></Pg>;
  if (loadError) return <Pg title="Custom product" onBack={app.back}><ErrBox e={loadError} retry={() => { setLoading(true); goodiesApi.listBuilders(app.biz.id).then(l => { setAll(l); setB(createType ? newBuilder(createType) : id ? l.find(x => x.id === id) || null : null); }).catch(e => setLoadError(errText(e))).finally(() => setLoading(false)); }} /></Pg>;
  if ((!id && !createType) || !b) return <Pg title="Custom product" onBack={app.back}><Empty icon="tune-variant" title="Custom product unavailable" hint="This custom product could not be found for this store. Return to Products and add a custom product there." cta="Back to Products" onCta={() => app.go('goodiesProducts')} /></Pg>;
  const up = (p: Partial<GBuilder>) => setB({ ...b, ...p });
  const upG = (gi: number, p: Partial<GGroup>) => up({ groups: b.groups.map((g, i) => (i === gi ? { ...g, ...p } : g)) });
  const upI = (gi: number, ii: number, p: Partial<GItem>) => upG(gi, { items: b.groups[gi].items.map((x, i) => (i === ii ? { ...x, ...p } : x)) });
  const move = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const c = a.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; };
  const save = async () => {
    const e = validateBuilder(b); setErrs(e);
    if (e.length) return app.toast(e[0]);
    await goodiesApi.saveBuilders(app.biz.id, all.some(x => x.id === b.id) ? all.map(x => (x.id === b.id ? { ...b, enabled: true, available: true } : x)) : [...all, { ...b, enabled: true, available: true }]);
    app.toast('Custom product added'); app.bump(); app.back();
  };
  const num = (v: string) => parseInt(v.replace(/\D/g, '') || '0', 10);
  return (
    <Pg title={id ? (b.name || 'Custom product') : 'Add custom product'} onBack={app.back}>
      <Section title="Product details" />
      <Field label="Name" value={b.name} onChangeText={(v: string) => up({ name: v })} />
      <Field label="Description" value={b.desc} onChangeText={(v: string) => up({ desc: v })} multiline />
      <Field label="Base price ($)" keyboardType="decimal-pad" value={b.base} onChangeText={(v: string) => up({ base: v })} />
      <View style={[s.row, { marginTop: 10 }]}><Text style={[s.title, s.g]}>Allow special instructions</Text><Toggle value={b.notes} onValueChange={(v: boolean) => up({ notes: v })} /></View>

      <Section title="Sizes" right="Add" onRight={() => up({ sizes: [...b.sizes, { id: uid(), name: '', add: '0', avail: true }] })} />
      {b.sizes.map((z, i) => (
        <View key={z.id} style={s.card}>
          <Field label="Size name" value={z.name} onChangeText={(v: string) => up({ sizes: b.sizes.map((x, j) => (j === i ? { ...x, name: v } : x)) })} />
          <Field label="Extra price ($)" keyboardType="decimal-pad" value={z.add} onChangeText={(v: string) => up({ sizes: b.sizes.map((x, j) => (j === i ? { ...x, add: v } : x)) })} />
          <View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>Available</Text><Toggle value={z.avail} onValueChange={(v: boolean) => up({ sizes: b.sizes.map((x, j) => (j === i ? { ...x, avail: v } : x)) })} /></View>
          <View style={{ height: 8 }} /><Btn small kind="soft" label="Remove size" onPress={() => up({ sizes: b.sizes.filter((_, j) => j !== i) })} />
        </View>
      ))}

      <Section title="Ingredients and customer choices" right="Add group" onRight={() => up({ groups: [...b.groups, { id: uid(), name: '', kind: 'many', req: false, min: 0, max: 1, inc: 0, me: 1, items: [] }] })} />
      <Text style={s.mut}>Set the limit on the whole group, on individual ingredients, or both.</Text>
      {b.groups.map((g, gi) => (
        <View key={g.id} style={s.card}>
          <Field label="Group name (for example Crust, Toppings)" value={g.name} onChangeText={(v: string) => upG(gi, { name: v })} />
          <View style={{ height: 8 }} /><Seg items={['Pick one', 'Pick several']} value={g.kind === 'one' ? 'Pick one' : 'Pick several'} onChange={(v: string) => upG(gi, v === 'Pick one' ? { kind: 'one', min: g.req ? 1 : 0, max: 1, inc: 0, me: 1 } : { kind: 'many' })} />
          <View style={[s.row, { marginTop: 10 }]}><Text style={[s.title, s.g]}>Required</Text><Toggle value={g.req} onValueChange={(v: boolean) => upG(gi, { req: v, min: g.kind === 'one' ? (v ? 1 : 0) : g.min })} /></View>
          {g.kind === 'many' ? (<>
            <View style={s.row}><View style={s.g}><Field label="Minimum choices in this group" keyboardType="number-pad" value={String(g.min)} onChangeText={(v: string) => upG(gi, { min: num(v) })} /></View><View style={s.g}><Field label="Maximum choices in this group" keyboardType="number-pad" value={String(g.max)} onChangeText={(v: string) => upG(gi, { max: num(v) })} /></View></View>
            <View style={s.row}><View style={s.g}><Field label="Included free in this group" keyboardType="number-pad" value={String(g.inc)} onChangeText={(v: string) => upG(gi, { inc: num(v) })} /></View><View style={s.g}><Field label="Max of same ingredient" keyboardType="number-pad" value={String(g.me)} onChangeText={(v: string) => upG(gi, { me: num(v) })} /></View></View>
          </>) : null}
          <Text style={[s.title, { marginTop: 12 }]}>Ingredients</Text>
          {g.items.map((it, ii) => (
            <View key={it.id} style={[s.card, { backgroundColor: t.bg }]}>
              <Field label="Name" value={it.name} onChangeText={(v: string) => upI(gi, ii, { name: v })} />
              <View style={s.row}><View style={s.g}><Field label="Price ($)" keyboardType="decimal-pad" editable={!it.free} value={it.free ? '0' : String(it.price)} onChangeText={(v: string) => upI(gi, ii, { price: parseFloat(v) || 0 })} /></View>
                <View style={s.g}><Field label="Max per product (optional)" keyboardType="number-pad" value={it.max ? String(it.max) : ''} onChangeText={(v: string) => upI(gi, ii, { max: v ? num(v) : undefined })} /></View></View>
              <View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>Free</Text><Toggle value={it.free} onValueChange={(v: boolean) => upI(gi, ii, { free: v, price: v ? 0 : it.price })} /></View>
              <View style={[s.row, { marginTop: 6 }]}><Text style={[s.mut, s.g]}>Available</Text><Toggle value={it.avail} onValueChange={(v: boolean) => upI(gi, ii, { avail: v })} /></View>
              {b.type !== 'custom' ? <View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]} numberOfLines={1}>{it.assetId ? 'Library: ' + it.assetId : 'No library ingredient chosen'}</Text><Btn small kind="soft" label={it.assetId ? 'Change' : 'Choose'} onPress={() => setPick({ gi, ii })} /></View> : <Field label="Colour (hex, optional)" value={it.col || ''} onChangeText={(v: string) => upI(gi, ii, { col: v })} />}
              <View style={[s.row, { marginTop: 8 }]}><View style={s.g}><Btn small kind="soft" label="↑" onPress={() => upG(gi, { items: move(g.items, ii, -1) })} /></View><View style={s.g}><Btn small kind="soft" label="↓" onPress={() => upG(gi, { items: move(g.items, ii, 1) })} /></View><View style={s.g}><Btn small kind="soft" label="Remove" onPress={() => upG(gi, { items: g.items.filter((_, j) => j !== ii) })} /></View></View>
            </View>
          ))}
          <View style={s.row}><View style={s.g}><Btn small kind="soft" label="+ Ingredient" onPress={() => upG(gi, { items: [...g.items, { id: uid(), name: '', price: 0, free: true, avail: true, assetId: null, col: null }] })} /></View><View style={s.g}><Btn small kind="soft" label="Remove group" onPress={() => up({ groups: b.groups.filter((_, j) => j !== gi) })} /></View></View>
          <View style={[s.row, { marginTop: 8 }]}><View style={s.g}><Btn small kind="soft" label="Move up" onPress={() => up({ groups: move(b.groups, gi, -1) })} /></View><View style={s.g}><Btn small kind="soft" label="Move down" onPress={() => up({ groups: move(b.groups, gi, 1) })} /></View></View>
        </View>
      ))}
      {errs.length ? <View style={s.card}><Text style={s.title}>Fix these first</Text>{errs.map(e => <Text key={e} style={s.mut}>• {e}</Text>)}</View> : null}
      <Btn kind="soft" label="Request a missing ingredient" onPress={() => app.go('goodiesRequests', { open: true, builder: b.type })} />
      <View style={{ height: 14 }} /><Btn label={id ? 'Save changes' : 'Add custom product'} onPress={save} />
      {pick && b.type !== 'custom' ? <LibraryPicker type={b.type} onClose={() => setPick(null)} onPick={(aid, nm) => { const it = b.groups[pick.gi].items[pick.ii]; upI(pick.gi, pick.ii, { assetId: aid, name: it.name || nm }); setPick(null); }} /> : null}
    </Pg>
  );
}

/* ---------- ingredient requests ---------- */
export function GoodiesRequestsPage() {
  const app = useApp(), s = useS(), t = useTheme(), route = useArg() as { open?: boolean; builder?: GRequest['builder'] } | undefined;
  const [list, setList] = useState<GRequest[]>([]), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(''), [ack, setAck] = useState(false), [photo, setPhoto] = useState('');
  const blank = { name: '', builder: route?.builder || 'burger' as GRequest['builder'], role: '', note: '' };
  const [f, setF] = useState(blank);
  useEffect(() => { if (route?.open) setOpen(true); if (route?.builder) setF(current => ({ ...current, builder: route.builder! })); }, [route?.open, route?.builder]);
  const load = () => goodiesApi.listRequests(app.biz.id).then(setList).catch(e => app.toast(errText(e)));
  useEffect(() => { void load(); goodiesApi.rules().then(setRules).catch(() => setRules('')); }, [app.biz.id]);
  const choose = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return app.toast('Allow photo access to add a picture');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
  };
  const send = async () => {
    if (f.name.trim().length < 2) return app.toast('Enter the ingredient name');
    if (!ack) return app.toast('Read the photo rules first');
    setBusy(true);
    try {
      const path = photo ? await goodiesApi.uploadRequestPhoto(app.biz.id, photo) : null;
      await goodiesApi.submitRequest(app.biz.id, { ...f, name: f.name.trim(), role: f.role.trim(), note: f.note.trim() }, path);
      setOpen(false); setF(blank); setPhoto(''); setAck(false); app.toast('Request sent to Wantiss'); await load();
    } catch (e) { app.toast(errText(e)); } finally { setBusy(false); }
  };
  const tone = (st: string): any => (st === 'approved' ? 'good' : st === 'denied' ? 'bad' : 'warn');
  const label: Record<string, string> = { submitted: 'Waiting', approved: 'Approved', denied: 'Not approved', needs_info: 'Needs info' };
  return (
    <Pg title="Ingredient requests" onBack={app.back} right={undefined}>
      <Text style={s.mut}>Send a request with a photo and our team will review it. If approved, the ingredient appears in the library for your selected product type. You can then choose whether to offer it, set its price and define customer limits.</Text>
      <View style={{ height: 10 }} /><Btn label="Request an ingredient" onPress={() => setOpen(true)} />
      <Section title="Your requests" />
      {list.length === 0 ? <Text style={s.mut}>No requests yet.</Text> : <View style={s.cardFlat}><Divided>{list.map(r => <Row key={r.id} title={r.name} sub={`${r.builder}${r.role ? ' · ' + r.role : ''}${r.photo ? ' · photo sent' : ''}${r.reviewNote ? '\n' + r.reviewNote : ''}`} right={<Pill tone={tone(r.status)}>{label[r.status]}</Pill>} />)}</Divided></View>}
      {open ? (
        <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
            <SheetShell title="Request an ingredient" onClose={() => setOpen(false)} tall>
              <ScrollView style={{ maxHeight: 520 }}>
                <Field label="Ingredient name" value={f.name} onChangeText={(v: string) => setF({ ...f, name: v })} />
                <Text style={s.label}>For which custom product</Text>
                <Chips items={[{ k: 'burger', l: 'Burger' }, { k: 'pizza', l: 'Pizza' }, { k: 'custom', l: 'Custom' }]} value={f.builder} onChange={(v: any) => setF({ ...f, builder: v })} />
                <Field label="What is it (topping, sauce, bun, patty…)" value={f.role} onChangeText={(v: string) => setF({ ...f, role: v })} />
                <Field label="Notes for the team" value={f.note} onChangeText={(v: string) => setF({ ...f, note: v })} multiline />
                <Text style={s.label}>Photo rules</Text>
                <View style={s.cardFlat}><Text style={s.mut}>{rules || 'Use a clear, square, top-down photo of only the ingredient on a plain background.'}</Text></View>
                <Text style={s.label}>Photo</Text>
                {photo ? <Image source={{ uri: photo }} style={{ width: 120, height: 120, borderRadius: 10, marginBottom: 8 }} /> : null}
                <Btn small kind="soft" label={photo ? 'Change photo' : 'Choose photo'} onPress={choose} />
                <View style={{ height: 10 }} />
                <Btn small kind="soft" label={ack ? '✓ I have read the photo rules' : 'I have read the photo rules'} onPress={() => setAck(!ack)} />
                <View style={{ height: 12 }} /><Btn label="Send request" onPress={send} busy={busy} disabled={busy} />
              </ScrollView>
            </SheetShell>
          </View>
        </Modal>
      ) : null}
    </Pg>
  );
}
