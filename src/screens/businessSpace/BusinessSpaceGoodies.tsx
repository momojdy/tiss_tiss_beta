import {GoodiesVendorError as ErrBox,GoodiesVendorControl} from './BusinessSpaceGoodiesFeedback';
import {useGoodiesVendorLabels,vendorSegmentProps,type GoodiesVendorLabel} from './BusinessSpaceGoodiesLabels';
/* Goodies vendor tools use the shared Business Space and authoritative Supabase records. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput, Alert, Image, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useApp, useArg, useS, useTheme, useQ, rpc, q, errText, Pg, Section, Field, Btn, Chips, Seg, Toggle, Pill, Row, Divided, Icon, SheetShell, Empty, Skel, Loading } from './BusinessSpaceShared';
import { TEMPLATES, TplBuilder, TplGroup, TplItem } from './goodiesTemplates';
import { fetchPublishedWantissContent } from '../../lib/wantissCms';

/* ---------- Goodies data contracts ---------- */
export type GStore = { storeName: string; coverUrl: string | null; thumbnailUrl: string | null; address: string; city: string; country: string; category: string; kind: string; minOrder: string; fee: string; pricingMode: 'fixed' | 'distance'; baseFee: string; perKmFee: string; minFee: string; maxDistanceKm: string; etaMin: string; etaMax: string; acceptScheduledOrders: boolean; scheduledOrderStartTime: string; scheduledOrderTimezone: string; promo: string; delivery: boolean; pickup: boolean; names: Record<string, string>; storeLatitude: number | null; storeLongitude: number | null };
export type GProduct = { id: string; name: string; description: string; price: number; emoji: string; stock: number; available: boolean; restriction: 'none' | 'otc' | 'alcohol'; photoUrl: string | null; photoUrls: string[]; reviewStatus: 'pending' | 'approved' | 'rejected'; reviewNote: string | null };
export type GItem = TplItem & { id: string; avail: boolean; assetUrl?: string | null };
export type GGroup = Omit<TplGroup, 'items'> & { id: string; items: GItem[] };
export type GBuilder = { id: string; type: 'pizza' | 'burger' | 'custom'; name: string; desc: string; emoji: string; base: string; enabled: boolean; available: boolean; productCreated?: boolean; sizes: { id: string; name: string; add: string; avail: boolean }[]; groups: GGroup[]; notes: boolean };
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
export const goodiesApi = {
  /* Store setup lives on the backend: the business is the store (store id = business id). */
  getStore: async (biz: string): Promise<GStore> => {
    const d: GStore = { storeName: '', coverUrl: null, thumbnailUrl: null, address: '', city: '', country: '', category: '', kind: '', minOrder: '5', fee: '2', pricingMode: 'fixed', baseFee: '2', perKmFee: '0.5', minFee: '0', maxDistanceKm: '', etaMin: '20', etaMax: '35', acceptScheduledOrders: false, scheduledOrderStartTime: '10:00', scheduledOrderTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', promo: '', delivery: true, pickup: true, names: {}, storeLatitude: null, storeLongitude: null };
    const [r, business] = await Promise.all([
      q<any>(supabase.from('goodies_store_schedules').select('category,kind,min_order,delivery_fee,delivery_pricing_mode,delivery_base_fee,delivery_per_km_fee,delivery_min_fee,delivery_max_fee,delivery_max_distance_km,eta_min,eta_max,promo,names,delivery_modes,cover_url,address,city,country,accept_scheduled_orders,scheduled_order_start_time,scheduled_order_timezone,store_name,thumbnail_url,store_latitude,store_longitude').eq('business_id', biz).maybeSingle()),
      q<any>(supabase.from('businesses').select('address,city,country').eq('id', biz).maybeSingle()),
    ]);
    if (!r) return { ...d, address: business?.address || '', city: business?.city || '', country: business?.country || '' };
    const modes: string[] = Array.isArray(r.delivery_modes) ? r.delivery_modes.map((x: string) => String(x).toLowerCase()) : [];
    return {
      storeName: String(r.store_name || ''), coverUrl: r.cover_url || null, thumbnailUrl: r.thumbnail_url || null, address: r.address || business?.address || '', city: r.city || business?.city || '', country: r.country || business?.country || '', category: r.category || '', kind: r.kind || '', minOrder: String(r.min_order ?? 5), fee: String(r.delivery_fee ?? 2), pricingMode: r.delivery_pricing_mode === 'distance' ? 'distance' : 'fixed', baseFee: String(r.delivery_base_fee ?? r.delivery_fee ?? 2), perKmFee: String(r.delivery_per_km_fee ?? 0.5), minFee: String(r.delivery_min_fee ?? 0), maxDistanceKm: r.delivery_max_distance_km == null ? '' : String(r.delivery_max_distance_km), etaMin: String(r.eta_min ?? 20), etaMax: String(r.eta_max ?? 35), acceptScheduledOrders: !!r.accept_scheduled_orders, scheduledOrderStartTime: String(r.scheduled_order_start_time || '10:00').slice(0,5), scheduledOrderTimezone: String(r.scheduled_order_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'), promo: r.promo || '',
      delivery: modes.length ? modes.includes('delivery') : true, pickup: modes.length ? modes.includes('pickup') : true, names: r.names && typeof r.names === 'object' ? r.names : {}, storeLatitude: r.store_latitude == null ? null : Number(r.store_latitude), storeLongitude: r.store_longitude == null ? null : Number(r.store_longitude),
    };
  },
  saveStoreLocation: (biz: string, latitude: number, longitude: number) => rpc<boolean>('goodies_save_store_location', { p_business: biz, p_latitude: latitude, p_longitude: longitude }),
  saveStoreCover: (biz: string, coverUrl: string | null) => rpc('goodies_save_store_cover', { p_business: biz, p_cover_url: coverUrl }),
  saveStoreThumbnail: (biz: string, thumbnailUrl: string | null) => rpc('goodies_save_store_thumbnail', { p_business: biz, p_thumbnail_url: thumbnailUrl }),
  saveStore: async (biz: string, st: GStore) => {
    const names = Object.fromEntries(Object.entries(st.names).filter(([, v]) => String(v || '').trim()).map(([k2, v]) => [k2, String(v).trim().slice(0, 160)]));
    await rpc('goodies_save_store_setup', {
      p_business: biz, p_category: st.category, p_kind: st.kind.trim() || null, p_min_order: parseFloat(st.minOrder) || 0, p_delivery_fee: parseFloat(st.fee) || 0,
      p_eta_min: parseInt(st.etaMin, 10) || 20, p_eta_max: parseInt(st.etaMax, 10) || 35, p_promo: st.promo.trim() || null, p_names: names, p_delivery: st.delivery, p_pickup: st.pickup,
      p_delivery_pricing_mode: st.pricingMode, p_delivery_base_fee: parseFloat(st.baseFee) || 0, p_delivery_per_km_fee: parseFloat(st.perKmFee) || 0, p_delivery_min_fee: parseFloat(st.minFee) || 0, p_delivery_max_fee: null, p_delivery_max_distance_km: st.maxDistanceKm.trim() ? parseFloat(st.maxDistanceKm) : null, p_address: st.address.trim(), p_city: st.city.trim(), p_country: st.country.trim(), p_accept_scheduled_orders: st.acceptScheduledOrders, p_scheduled_order_start_time: st.scheduledOrderStartTime, p_scheduled_order_timezone: st.scheduledOrderTimezone, p_store_name: st.storeName.trim(),
    });
  },
  /* Store publication is self-service for Business Space members. */
  getLive: async (biz: string) => {
    const r = await q<any>(supabase.from('goodies_store_schedules').select('is_live').eq('business_id', biz).maybeSingle());
    return { live: !!r?.is_live, hasSetup: !!r };
  },
  setLive: (biz: string, live: boolean) => rpc<boolean>('goodies_set_store_live', { p_business: biz, p_live: live }),
  /* Products (stock is set by the vendor). Row security allows owners and admins only. */
  listProducts: async (biz: string, page = 0, focus?:string): Promise<GProduct[]> => {
    let request=supabase.from('goodies_products').select('id,name,description,price,emoji,stock,is_available,restriction,photo_url,photo_urls,review_status,review_note').eq('business_id', biz);
    if(focus)request=request.eq('id',focus);
    const rows=await q<any[]>(request.order('sort_order', { ascending: true }).order('created_at', { ascending: true }).order('id',{ascending:true}).range(page*100,page*100+99));
    return (rows || []).map(r => ({ id: r.id, name: r.name, description: r.description || '', price: Number(r.price), emoji: r.emoji || '🛍️', stock: Number(r.stock), available: !!r.is_available, restriction: r.restriction || 'none', photoUrl: r.photo_urls?.[0] || r.photo_url || null, photoUrls: (Array.isArray(r.photo_urls) && r.photo_urls.length ? r.photo_urls : (r.photo_url ? [r.photo_url] : [])).slice(0,5), reviewStatus: r.review_status || 'approved', reviewNote: r.review_note || null }));
  },
  saveProduct: async (biz: string, p: Partial<GProduct> & { id?: string }) => {
    // Direct table writes are intentionally not granted to customers or vendors.
    // All merchant mutations pass through server-authorized, business-scoped RPCs.
    if (p.id && typeof p.available === 'boolean' &&
        Object.keys(p).every(key => key === 'id' || key === 'available')) {
      const {error} = await supabase.rpc('goodies_vendor_set_product_availability', {
        p_business: biz, p_id: p.id, p_available: p.available,
      });
      if (error) throw error;
      return;
    }
    if (p.name == null || p.price == null || p.stock == null || p.restriction == null) {
      throw new Error('Complete the product details before saving.');
    }
    const {data, error} = await supabase.rpc('goodies_vendor_save_product', {
      p_business: biz, p_id: p.id || null,
      p_name: p.name.trim(), p_description: (p.description || '').trim(),
      p_price: p.price, p_emoji: (p.emoji || '🛍️').trim(),
      p_stock: p.stock, p_restriction: p.restriction,
      p_photo_url: p.photoUrl || null, p_photo_urls: (p.photoUrls || []).slice(0, 5),
    });
    if (error) throw error;
    if (!data) throw new Error('The store did not confirm the product save.');
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
    // An empty server result is authoritative, including after administrator removal.
    return [];
  },
  saveBuilders: async (biz: string, l: GBuilder[]) => {
    const persisted = l.map(builder => ({
      ...builder,
      groups: builder.groups.map(group => ({
        ...group,
        items: group.items.map(({ assetUrl, ...item }) => item),
      })),
    }));
    await rpc('goodies_save_builder_configs', { p_business: biz, p_configs: persisted });
    try {
      await AsyncStorage.setItem(k(biz, 'builders'), JSON.stringify(persisted));
      const sid = biz, raw = JSON.parse((await AsyncStorage.getItem('goodies-byo-v4')) || 'null') || { cfg: {}, store: {}, drafts: {} };
      raw.cfg = raw.cfg || {}; raw.cfg[sid] = persisted; await AsyncStorage.setItem('goodies-byo-v4', JSON.stringify(raw));
    } catch { /* local compatibility cache only */ }
  },
  listRequests: async (biz: string, page = 0): Promise<GRequest[]> => {
    const rows = await rpc<any[]>('goodies_list_ingredient_requests_page', { p_business: biz, p_offset: page * 50, p_limit: 50 });
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
      const record = remote.content.find(x => x.content_key === 'goodies.content' || x.content_key === 'goodies')
        || remote.content.find(x => x.content_key === 'goodies.library' || x.content_key === 'goodies.vendor.library');
      const payload = record?.payload as { lib?: any[]; items?: { id: string; b: 'burger' | 'pizza'; n: string; hasArt?: boolean }[] } | undefined;
      const legacy = Array.isArray(payload?.items) ? payload.items : [];
      const contentLibrary = Array.isArray(payload?.lib) ? payload.lib.map((x: any) => {
        const id = String(x?.id || '');
        const b = x?.builder === 'pizza' || id.startsWith('pizza.') ? 'pizza' : x?.builder === 'burger' || id.startsWith('burger.') ? 'burger' : null;
        const image = x?.img || x?.image || {};
        const key = image.assetKey || image.asset_key || x?.assetKey || x?.asset_key || null;
        const rawName = x?.name;
        const n = typeof rawName === 'string' ? rawName : rawName?.en?.v || rawName?.en || id;
        return b && id ? { id, b, n: String(n), hasArt: !!key, assetKey: key } : null;
      }).filter(Boolean) as any[] : [];
      const base = [...legacy, ...contentLibrary];
      const added = await rpc<any[]>('goodies_list_library_ingredients', {});
      const seen = new Set(base.map(x => x.id));
      const assetUrl = (key: string | null | undefined) => key ? remote.assets.find(a => a.asset_key === key || a.asset_key.endsWith('/' + key))?.url || null : null;
      const baseWithAssets = base.map(x => ({ ...x, assetUrl: assetUrl(x.assetKey || x.asset_key || x.id) }));
      const extra = (added || []).filter(x => (x.builder === 'pizza' || x.builder === 'burger') && !seen.has(x.id)).map(x => ({
        id: x.id as string, b: x.builder as 'burger' | 'pizza', n: x.name as string,
        hasArt: !!x.asset_key, assetUrl: assetUrl(x.asset_key),
      }));
      return [...baseWithAssets, ...extra];
    } catch {
      throw new Error('Could not load the ingredient library. Please try again.');
    }
  },
};

export function newBuilder(type: 'pizza' | 'burger' | 'custom'): GBuilder {
  const t: TplBuilder = TEMPLATES[type];
  return {
    id: uid(), type, name: t.name, desc: t.desc, emoji: t.emoji, base: String(t.base), enabled: true, available: true, productCreated: false, notes: true,
    sizes: t.sizes.map(s => ({ id: uid(), name: s.name, add: String(s.add), avail: true })),
    groups: t.groups.map(g => ({ ...g, id: uid(), items: g.items.map(i => ({ ...i, id: uid(), avail: true })) })),
  };
}

/* Builder form validation. */
export function validateBuilder(b: GBuilder,label:GoodiesVendorLabel=(_id,fallback,vars)=>fallback.replace(/\{(\w+)\}/g,(match,key)=>String(vars?.[key]??match))): string[] {
  const e: string[] = [];
  if (!b.name.trim()) e.push(label("lbl.vendor.builders.1068fb6099","Give this custom product a name"));
  if (!(parseFloat(b.base) >= 0)) e.push(label("lbl.vendor.builders.890268ab02","Base price must be 0 or more"));
  if (b.type === 'pizza' && !b.sizes.length) e.push(label("lbl.vendor.builders.fd6fe55df6","Add at least one size"));
  b.sizes.forEach(s => { if (!s.name.trim()) e.push(label("lbl.vendor.builders.344d1cb236","Every size needs a name")); if (!(parseFloat(s.add) >= 0)) e.push(label("lbl.vendor.builders.9f7f662909","Size \"{value0}\" needs a price of 0 or more",{value0:(s.name || '?')})); });
  if (!b.groups.length) e.push(label("lbl.vendor.builders.644cbb99e4","Add at least one group"));
  b.groups.forEach(g => {
    const n = g.name.trim() || label("lbl.vendor.builders.9f3236d30d",'A group');
    if (!g.name.trim()) e.push(label("lbl.vendor.builders.b69df538a9","Every group needs a name"));
    if (!g.items.length) e.push(label("lbl.vendor.builders.72d896200b","{value0} needs at least one ingredient",{value0:(n)}));
    if (g.kind === 'many') {
      if (g.min < 0 || g.min > g.max) e.push(label("lbl.vendor.builders.75d2a1be46","{value0}: minimum cannot be above maximum",{value0:(n)}));
      if (g.max > g.items.length) e.push(label("lbl.vendor.builders.cb25ec6741","{value0}: maximum is more than the number of ingredients",{value0:(n)}));
      if (g.inc > g.max) e.push(label("lbl.vendor.builders.b22b52c951","{value0}: included picks cannot be above the maximum",{value0:(n)}));
      if (g.me < 1) e.push(label("lbl.vendor.builders.258956aad9","{value0}: \"same ingredient\" limit must be at least 1",{value0:(n)}));
    }
    if (g.req && !g.items.some(i => i.avail)) e.push(label("lbl.vendor.builders.9841bb5a06","{value0} is required but has no available ingredient",{value0:(n)}));
    g.items.forEach(i => {
      if (!i.name.trim()) e.push(label("lbl.vendor.builders.fbe00241c0","{value0}: every ingredient needs a name",{value0:(n)}));
      if (!i.free && !(i.price >= 0)) e.push(label("lbl.vendor.builders.bc094912f8","{value0}: \"{value1}\" needs a price of 0 or more",{value0:(n),value1:(i.name || '?')}));
      if (i.max != null && (i.max < 1 || (g.kind === 'many' && i.max > g.max))) e.push(label("lbl.vendor.builders.1083157e68","{value0}: \"{value1}\" limit must be between 1 and the group maximum",{value0:(n),value1:(i.name)}));
    });
  });
  return Array.from(new Set(e));
}

/* ---------- entry card shown on the Goodies feature page ---------- */
export function GoodiesToolsCard() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("tools");
  const app = useApp(), s = useS(), t = useTheme();
  const R = (title: string, sub: string, page: string) => <Row title={title} sub={sub} onPress={() => app.go(page)} right={<Icon name="chevron-right" size={18} color={t.mute} />} />;
  if (!app.meta.feats.some(f => f.feature === 'goodies')) return null;
  return (
    <View style={s.cardFlat}><Divided>
      {R(label("lbl.vendor.tools.cded093321","Orders"), label("lbl.vendor.tools.b64350c575","Review new orders and accept or decline within 15 minutes"), 'goodiesOrders')}
      {R(label("lbl.vendor.tools.e89cf98b5c","Store setup"), label("lbl.vendor.tools.2a20f7d450","Category, minimum order, delivery fee, time and publishing"), 'goodiesStore')}
      {R(label("lbl.vendor.tools.fe0a091fdb","Products"), label("lbl.vendor.tools.4980af28a8","Items, prices and stock customers can buy"), 'goodiesProducts')}
      {R(label("lbl.vendor.tools.b83c4cdafe","Reviews"), label("lbl.vendor.tools.76f75fca4b","Read customer feedback on fulfilled orders"), 'goodiesReviews')}
      {R(label("lbl.vendor.tools.dd8023440a","Ingredient requests"), label("lbl.vendor.tools.e5e9d55b6d","Ask the platform to add a new ingredient"), 'goodiesRequests')}
    </Divided></View>
  );
}

/* ---------- store setup ---------- */
const LANGS: [string, string][] = [['fr','Français'],['ht','Kreyòl ayisyen'],['es','Español'],['zh-Hans','简体中文'],['en','English'],['ar','العربية'],['bn','বাংলা'],['bg','Български'],['my','မြန်မာ'],['ca','Català'],['hr','Hrvatski'],['cs','Čeština'],['da','Dansk'],['nl','Nederlands'],['et','Eesti'],['fi','Suomi'],['de','Deutsch'],['el','Ελληνικά'],['gu','ગુજરાતી'],['he','עברית'],['hi','हिन्दी'],['hu','Magyar'],['is','Íslenska'],['id','Bahasa Indonesia'],['it','Italiano'],['ja','日本語'],['jv','Basa Jawa'],['kn','ಕನ್ನಡ'],['km','ខ្មែរ'],['ko','한국어'],['lo','ລາວ'],['lv','Latviešu'],['lt','Lietuvių'],['ms','Bahasa Melayu'],['ml','മലയാളം'],['mr','मराठी'],['mn','Монгол'],['ne','नेपाली'],['no','Norsk'],['fa','فارسی'],['pl','Polski'],['pt','Português'],['pa','ਪੰਜਾਬੀ'],['ro','Română'],['ru','Русский'],['sr','Српски'],['sk','Slovenčina'],['sl','Slovenščina'],['sw','Kiswahili'],['sv','Svenska'],['ta','தமிழ்'],['te','తెలుగు'],['th','ไทย'],['tr','Türkçe'],['uk','Українська'],['ur','اردو'],['uz','Oʻzbek'],['vi','Tiếng Việt'],['yo','Yorùbá'],['zu','isiZulu'],['am','አማርኛ'],['az','Azərbaycanca'],['eu','Euskara'],['gl','Galego'],['ga','Gaeilge'],['mk','Македонски'],['sq','Shqip']];
export function GoodiesToolsPage() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("tools");
  const app = useApp();
  return <Pg title={label("lbl.vendor.tools.7f5de3cf37","Goodies tools")} onBack={app.back}><GoodiesToolsCard /></Pg>;
}

export function GoodiesStorePage() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("store");
  const app = useApp(), s = useS(), t = useTheme();
  const [f, setF] = useState<GStore | null>(null), [busy, setBusy] = useState(false), [coverBusy, setCoverBusy] = useState(false);
  const storeSaveLock = useRef(false);
  const [savedAddress, setSavedAddress] = useState({ address: '', city: '', country: '' });
  const [capturedLocation, setCapturedLocation] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [locationBusy, setLocationBusy] = useState(false), [locationSaving, setLocationSaving] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const [customProducts, setCustomProducts] = useState(false), [customTypes, setCustomTypes] = useState<GBuilder[]>([]);
  const initialCustomToggles = useRef<{master:boolean;enabled:Record<string,boolean>}>({master:false,enabled:{}});
  const [languageOpen, setLanguageOpen] = useState(false), [languageQuery, setLanguageQuery] = useState('');
  const [timePickerOpen, setTimePickerOpen] = useState(false), [sameAsCover, setSameAsCover] = useState(false), [thumbnailBusy, setThumbnailBusy] = useState(false);
  const load = () => {
    setLoadErr('');
    setF(null);
    Promise.all([goodiesApi.getStore(app.biz.id), goodiesApi.listBuilders(app.biz.id)])
      .then(([store, rows]) => {
        setF(store);
        setSavedAddress({ address: store.address.trim(), city: store.city.trim(), country: store.country.trim() });
        setCapturedLocation(null);
        setSameAsCover(!!store.coverUrl && store.thumbnailUrl === store.coverUrl);
        const types=rows.filter(x => x.type === 'pizza' || x.type === 'burger');
        const master=types.some(x => x.enabled);
        initialCustomToggles.current={master,enabled:Object.fromEntries(types.map(x=>[x.id,x.enabled]))};
        setCustomTypes(types);
        setCustomProducts(master);
      })
      .catch(e => setLoadErr(text(errText(e))));
  };
  useEffect(load, [app.biz.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (loadErr) return <Pg title={label("lbl.vendor.store.e89cf98b5c","Store setup")} onBack={app.back}><ErrBox e={loadErr} retry={load} /></Pg>;
  if (!f) return <Pg title={label("lbl.vendor.store.e89cf98b5c","Store setup")} onBack={app.back}><Skel h={90} /><Skel h={200} /></Pg>;
  const set = (p: Partial<GStore>) => {
    if (!canManage) return;
    const addressChanged = ['address', 'city', 'country'].some(key => key in p && String(p[key as keyof GStore] || '').trim() !== savedAddress[key as keyof typeof savedAddress]);
    setF({ ...f, ...p, ...(addressChanged ? { storeLatitude: null, storeLongitude: null } : {}) });
    if (addressChanged) setCapturedLocation(null);
  };
  const err = (): string => {
    if (!f.storeName.trim()) return 'Enter a store name';
    if (!f.category) return 'Choose a store category';
    if (!f.address.trim() || !f.city.trim() || !f.country.trim()) return 'Enter the full store address, city and country';
    if (!(parseFloat(f.minOrder) >= 0)) return 'Minimum order must be 0 or more';
    if (f.pricingMode === 'fixed' && !(parseFloat(f.fee) >= 0)) return 'Delivery fee must be 0 or more (use 0 for free delivery)';
    if (f.pricingMode === 'distance' && (!(parseFloat(f.baseFee) >= 0) || !(parseFloat(f.perKmFee) >= 0) || !(parseFloat(f.minFee) >= 0) || (f.maxDistanceKm.trim() && !(parseFloat(f.maxDistanceKm) > 0)))) return 'Enter valid distance delivery pricing values';
    if (!(parseInt(f.etaMin, 10) > 0) || !(parseInt(f.etaMax, 10) >= parseInt(f.etaMin, 10))) return 'Enter a valid delivery time range';
    if (f.acceptScheduledOrders && !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.scheduledOrderStartTime)) return 'Choose a valid earliest order time';
    if (!f.delivery && !f.pickup) return 'Keep delivery or pickup on';
    if (ALC.test(f.promo)) return 'Alcohol ads and promotions are prohibited on Wantiss';
    return '';
  };
  const save = async () => {
    if (!requireManage() || storeSaveLock.current) return;
    const e = err(); if (e) return app.toast(text(e));
    storeSaveLock.current = true;
    setBusy(true);
    try {
      await goodiesApi.saveStore(app.biz.id, f);
      const nextSavedAddress = { address: f.address.trim(), city: f.city.trim(), country: f.country.trim() };
      const addressChanged = nextSavedAddress.address !== savedAddress.address || nextSavedAddress.city !== savedAddress.city || nextSavedAddress.country !== savedAddress.country;
      setSavedAddress(nextSavedAddress);
      if (addressChanged) setF(current => current ? { ...current, storeLatitude: null, storeLongitude: null } : current);
      await goodiesApi.saveStoreThumbnail(app.biz.id, sameAsCover ? f.coverUrl : f.thumbnailUrl);
      const baseline=initialCustomToggles.current;
      const togglesChanged=customProducts!==baseline.master || customTypes.some(x=>baseline.enabled[x.id]!==x.enabled);
      if(togglesChanged){
        // Store setup edits toggle publication only. Always retain the newest
        // server-owned builder content rather than overwriting other edits.
        const rows=await goodiesApi.listBuilders(app.biz.id);
        const localById=new Map(customTypes.map(x=>[x.id,x]));
        const next=rows.map(x=>{
          if(x.type!=='pizza'&&x.type!=='burger')return x;
          const selected=localById.get(x.id);
          if(customProducts!==baseline.master)return {...x,enabled:customProducts&&(selected?.enabled??x.enabled)};
          if(selected&&baseline.enabled[x.id]!==selected.enabled)return {...x,enabled:customProducts&&selected.enabled};
          return x;
        });
        next.push(...customTypes.filter(x=>!(x.id in baseline.enabled)&&!rows.some(row=>row.id===x.id)).map(x=>({...x,enabled:customProducts&&x.enabled})));
        await goodiesApi.saveBuilders(app.biz.id,next);
        initialCustomToggles.current={master:customProducts,enabled:Object.fromEntries(customTypes.map(x=>[x.id,x.enabled]))};
      }
      app.toast(label("lbl.vendor.store.0589b60d42","Store saved")); app.bump();
    } catch (x) { app.toast(text(errText(x))); } finally { storeSaveLock.current = false; setBusy(false); }
  };
  const captureStoreLocation = async () => {
    if (!requireManage()) return;
    setLocationBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        app.toast(label("lbl.vendor.store.146318c8ca","Allow location access to pin your store. You can enable it in your device settings."));
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Your device returned invalid coordinates. Try again.');
      }
      setCapturedLocation({ latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : null });
      app.toast(label("lbl.vendor.store.58ea091f9f","Location captured. Review it below, then save the pin."));
    } catch (e) {
      app.toast(text(errText(e)));
    } finally {
      setLocationBusy(false);
    }
  };
  const saveStoreLocation = async () => {
    if (!requireManage()) return;
    if (!capturedLocation) return app.toast(label("lbl.vendor.store.5dd2889f89","Capture your store location first."));
    const currentAddress = { address: f.address.trim(), city: f.city.trim(), country: f.country.trim() };
    if (currentAddress.address !== savedAddress.address || currentAddress.city !== savedAddress.city || currentAddress.country !== savedAddress.country) {
      return app.toast(label("lbl.vendor.store.bbb03b20d3","Save your store address first, then save its location."));
    }
    setLocationSaving(true);
    try {
      await goodiesApi.saveStoreLocation(app.biz.id, capturedLocation.latitude, capturedLocation.longitude);
      setF(current => current ? { ...current, storeLatitude: capturedLocation.latitude, storeLongitude: capturedLocation.longitude } : current);
      setCapturedLocation(null);
      app.toast(label("lbl.vendor.store.ef8caf3797","Store location saved. Delivery quotes can now use this pin."));
    } catch (e) {
      app.toast(text(errText(e)));
    } finally {
      setLocationSaving(false);
    }
  };
  const chooseCover = async () => {
    if (!requireManage()) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return app.toast(label("lbl.vendor.store.32aae387db","Allow photo access to choose a store cover"));
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
      app.toast(label("lbl.vendor.store.ab4b4c279f","Store cover updated"));
    } catch (e) {
      if (uploadedPath) await supabase.storage.from('listing-photos').remove([uploadedPath]).catch(() => undefined);
      app.toast(text(errText(e)));
    } finally { setCoverBusy(false); }
  };
  const chooseThumbnail = async () => {
    if (!requireManage()) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return app.toast(label("lbl.vendor.store.7c401b0939","Allow photo access to choose a store thumbnail"));
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (picked.canceled || !picked.assets?.[0]) return;
    setThumbnailBusy(true);
    let uploadedPath = '';
    try {
      const resized = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 800 } }], { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG });
      const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: FileSystem.EncodingType.Base64 });
      uploadedPath = `${app.biz.id}/goodies/store-thumbnail/${uid()}${uid()}.jpg`;
      const { error } = await supabase.storage.from('listing-photos').upload(uploadedPath, decode(base64), { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (error) throw error;
      const url = supabase.storage.from('listing-photos').getPublicUrl(uploadedPath).data.publicUrl;
      setF(current => current ? { ...current, thumbnailUrl: url } : current);
      setSameAsCover(false);
      app.toast(label("lbl.vendor.store.1faa416418","Store thumbnail selected. Save store setup to publish it."));
    } catch (e) {
      if (uploadedPath) await supabase.storage.from('listing-photos').remove([uploadedPath]).catch(() => undefined);
      app.toast(text(errText(e)));
    } finally { setThumbnailBusy(false); }
  };
  return (
    <Pg title={label("lbl.vendor.store.e89cf98b5c","Store setup")} onBack={app.back}>
      <GoLiveCard />
      <Section title={label("lbl.vendor.store.232d71339a","Store cover photo")} />
      {f.coverUrl ? <Image source={{ uri: f.coverUrl }} style={{ width: '100%', height: 150, borderRadius: 14, marginBottom: 8 }} /> : null}
      <Btn kind="soft" label={f.coverUrl ? label("lbl.vendor.store.87328054a9","Change cover photo") : label("lbl.vendor.store.77926b3396","Add cover photo")} onPress={chooseCover} busy={coverBusy} disabled={!canManage} />
      <Section title={label("lbl.vendor.store.066a886133","Store thumbnail")} />
      <Text style={s.mut}>{label("lbl.vendor.store.543f4e0747","Shown on the customer home page and store listings.")}</Text>
      {(sameAsCover ? f.coverUrl : f.thumbnailUrl) ? <Image source={{ uri: (sameAsCover ? f.coverUrl : f.thumbnailUrl) as string }} style={{ width: 88, height: 88, borderRadius: 14, marginVertical: 8 }} /> : null}
      <Btn kind="soft" label={label("lbl.vendor.store.d99bf52681","Upload thumbnail")} onPress={chooseThumbnail} busy={thumbnailBusy} disabled={!canManage} />
      <View style={[s.row, { marginTop: 8 }]}><Text style={[s.title, s.g]}>{label("lbl.vendor.store.7ac4a26ee0","Use cover photo as thumbnail")}</Text><Toggle disabled={!canManage} value={sameAsCover} onValueChange={(v: boolean) => { if (v && !f.coverUrl) { app.toast(label("lbl.vendor.store.e39355de2b","Add a cover photo first")); return; } setSameAsCover(v); set({ thumbnailUrl: v ? f.coverUrl : null }); }} /></View>
      <Field editable={canManage} label={label("lbl.vendor.store.e01ddbc892","Store name")} value={f.storeName} onChangeText={(v: string) => set({ storeName: v })} placeholder={label("lbl.vendor.store.7eb704e710","Name customers will see")} />
      <Section title={label("lbl.vendor.store.80b169bf97","Store category")} />
      <GoodiesVendorControl disabled={!canManage}><Chips items={CATEGORY_PRESETS.map(c => ({ k: c.id, l: text(c.name) }))} value={f.category} onChange={(v: string) => set({ category: v })} /></GoodiesVendorControl>
      {f.category === 'drugstore' ? <Text style={[s.mut, { marginTop: 6 }]}>{label("lbl.vendor.store.484df3f383","Pharmacy licence required during registration. Only over-the-counter products are allowed.")}</Text> : null}
      <Field editable={canManage} label={label("lbl.vendor.store.74192ee0fe","Store type")} value={f.kind} onChangeText={(v: string) => set({ kind: v })} />
      <Section title={label("lbl.vendor.store.93458909aa","Store address")} />
      <Field editable={canManage} label={label("lbl.vendor.store.497a500af2","Street address")} value={f.address} onChangeText={(v: string) => set({ address: v })} placeholder={label("lbl.vendor.store.3818af74c1","Street, building and number")} />
      <Field editable={canManage} label={label("lbl.vendor.store.4271627f4f","City")} value={f.city} onChangeText={(v: string) => set({ city: v })} />
      <Field editable={canManage} label={label("lbl.vendor.store.d523ebbd10","Country")} value={f.country} onChangeText={(v: string) => set({ country: v })} placeholder={label("lbl.vendor.store.b8449f28d3","Type any country name")} />
      <Section title={label("lbl.vendor.store.d53a2bec98","Store location")} />
      <View style={[s.cardFlat, { padding: 14, gap: 8 }]}>
        <Text style={s.mut}>{label("lbl.vendor.store.5fb4c375d0","Stand at your shop entrance and capture its position. This gives delivery-distance quotes a precise starting point even when map services cannot find your street address.")}</Text>
        {f.storeLatitude != null && f.storeLongitude != null ? <Text style={{ color: t.ink, fontWeight: '600' }}>{label("lbl.vendor.store.2ea69f1ae4","Saved pin:")} {f.storeLatitude.toFixed(6)}, {f.storeLongitude.toFixed(6)}</Text> : <Text style={s.mut}>{label("lbl.vendor.store.d346a9bf85","No store pin saved yet. Delivery distance may not work until you set one.")}</Text>}
        <Btn kind="soft" label={f.storeLatitude != null && f.storeLongitude != null ? label("lbl.vendor.store.30d1ea7183","Update store location") : label("lbl.vendor.store.9aee064193","Use my current location")} onPress={captureStoreLocation} busy={locationBusy} disabled={!canManage || locationBusy || locationSaving} />
        {capturedLocation ? <View style={{ gap: 6, paddingTop: 4 }}>
          <Text style={{ color: t.ink, fontWeight: '700' }}>{label("lbl.vendor.store.2f6c058fc6","Location captured — review before saving")}</Text>
          <Text style={s.mut}>{capturedLocation.latitude.toFixed(6)}, {capturedLocation.longitude.toFixed(6)}{capturedLocation.accuracy != null ? ' ' + label("lbl.vendor.store.ebdec74335","· accuracy about {value0} m",{value0:(Math.round(capturedLocation.accuracy))}) : ''}</Text>
          <Text style={s.mut}>{label("lbl.vendor.store.c5f3af6576","Make sure you are physically at the shop. Save your address changes first if you edited the address above.")}</Text>
          <Btn label={label("lbl.vendor.store.44740cf9d3","Save store location")} onPress={saveStoreLocation} busy={locationSaving} disabled={!canManage || locationSaving || locationBusy} />
          <Btn small kind="soft" label={label("lbl.vendor.store.e01a0ec6b7","Discard captured location")} onPress={() => setCapturedLocation(null)} disabled={locationSaving} />
        </View> : null}
      </View>
      <Section title={label("lbl.vendor.store.da4e1e0b2f","Custom products")} />
      <View style={[s.row, { marginTop: 4 }]}>
        <Text style={[s.title, s.g]}>{label("lbl.vendor.store.d83dbff929","Allow custom products")}</Text>
        <Toggle disabled={!canManage} value={customProducts} onValueChange={setCustomProducts} />
      </View>
      {customProducts ? <View>
        {(['pizza', 'burger'] as const).map(type => {
          const current = customTypes.find(x => x.type === type && x.enabled);
          return <View key={type} style={[s.row, { marginTop: 10 }]}>
            <View style={s.g}><Text style={s.title}>{type === 'pizza' ? label("lbl.vendor.store.01eb73e0be","Pizza") : label("lbl.vendor.store.2e10af9f72","Burger")}</Text></View>
            <Toggle disabled={!canManage} value={!!current} onValueChange={(v: boolean) => setCustomTypes(prev => {
              const found = prev.some(x => x.type === type);
              if (found) return prev.map(x => x.type === type ? { ...x, enabled: v } : x);
              return [...prev, { ...newBuilder(type), enabled: v, available: false, productCreated: false }];
            })} />
          </View>;
        })}
      </View> : null}
      <Section title={label("lbl.vendor.store.cded093321","Orders")} />
      <Field editable={canManage} label={label("lbl.vendor.store.0508f492d4","Minimum order ($)")} keyboardType="decimal-pad" value={f.minOrder} onChangeText={(v: string) => set({ minOrder: v })} />
      <View style={[s.row, { marginTop: 8 }]}><Text style={[s.title, s.g]}>{label("lbl.vendor.store.09a64acd69","Accept orders for later")}</Text><Toggle disabled={!canManage} value={f.acceptScheduledOrders} onValueChange={(v: boolean) => set({ acceptScheduledOrders: v })} /></View>
      {f.acceptScheduledOrders ? <View style={{ marginTop: 8 }}>
        <Text style={s.label}>{label("lbl.vendor.store.5eaa320621","Earliest scheduled order")}</Text>
        <Pressable disabled={!canManage} onPress={() => setTimePickerOpen(true)} style={[s.fld, { minHeight: 48, justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={{ color: t.ink, fontSize: 16, fontWeight: '600', flex: 1 }}>{f.scheduledOrderStartTime || '10:00'}</Text>
          <Icon name="clock-outline" size={19} color={t.mute} />
        </Pressable>
        {timePickerOpen ? <Modal visible transparent animationType="slide" onRequestClose={() => setTimePickerOpen(false)}><SheetShell title={label("lbl.vendor.store.45acf3ed0c","Earliest order time")} onClose={() => setTimePickerOpen(false)}>
          <DateTimePicker value={(() => { const d = new Date(); const [h,m] = (f.scheduledOrderStartTime || '10:00').split(':').map(Number); d.setHours(h,m,0,0); return d; })()} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'clock'} minuteInterval={5} onChange={(_, date) => { if (date) set({ scheduledOrderStartTime: date.getHours().toString().padStart(2,'0') + ':' + date.getMinutes().toString().padStart(2,'0') }); if (Platform.OS !== 'ios') setTimePickerOpen(false); }} />
          {Platform.OS === 'ios' ? <Btn label={label("lbl.vendor.store.e9b450d14b","Done")} onPress={() => setTimePickerOpen(false)} /> : null}
        </SheetShell></Modal> : null}
      </View> : null}
      <Section title={label("lbl.vendor.store.a7285b9867","Delivery pricing")} />
      <GoodiesVendorControl disabled={!canManage}><Seg {...vendorSegmentProps(['Fixed fee','By distance'],f.pricingMode==='distance'?'By distance':'Fixed fee',(v:string)=>set({pricingMode:v==='By distance'?'distance':'fixed'}),text)} /></GoodiesVendorControl>
      {f.pricingMode === 'fixed' ? <Field editable={canManage} label={label("lbl.vendor.store.4d293c105f","Delivery fee ($, 0 = free)")} keyboardType="decimal-pad" value={f.fee} onChangeText={(v: string) => set({ fee: v })} /> : <View><Field editable={canManage} label={label("lbl.vendor.store.603b4fb25b","Base delivery fee ($)")} keyboardType="decimal-pad" value={f.baseFee} onChangeText={(v: string) => set({ baseFee: v })} /><Field editable={canManage} label={label("lbl.vendor.store.85ded0ada2","Price per kilometre ($)")} keyboardType="decimal-pad" value={f.perKmFee} onChangeText={(v: string) => set({ perKmFee: v })} /><Field editable={canManage} label={label("lbl.vendor.store.af5935965f","Minimum delivery fee ($)")} keyboardType="decimal-pad" value={f.minFee} onChangeText={(v: string) => set({ minFee: v })} /><Field editable={canManage} label={label("lbl.vendor.store.21392896ce","Maximum delivery distance in km (optional)")} keyboardType="decimal-pad" value={f.maxDistanceKm} onChangeText={(v: string) => set({ maxDistanceKm: v })} /></View>}
      <View style={s.row}><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.store.422b63a00c","Fastest (min)")} keyboardType="number-pad" value={f.etaMin} onChangeText={(v: string) => set({ etaMin: v })} /></View><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.store.13ed6f261a","Slowest (min)")} keyboardType="number-pad" value={f.etaMax} onChangeText={(v: string) => set({ etaMax: v })} /></View></View>
      <View style={[s.row, { marginTop: 12 }]}><Text style={[s.title, s.g]}>{label("lbl.vendor.store.9631af52c6","Delivery")}</Text><Toggle disabled={!canManage} value={f.delivery} onValueChange={(v: boolean) => set({ delivery: v })} /></View>
      <View style={[s.row, { marginTop: 8 }]}><Text style={[s.title, s.g]}>{label("lbl.vendor.store.a51122c100","Pickup")}</Text><Toggle disabled={!canManage} value={f.pickup} onValueChange={(v: boolean) => set({ pickup: v })} /></View>
      <Field editable={canManage} label={label("lbl.vendor.store.97ccc70c75","Promotion line on your card (optional)")} value={f.promo} onChangeText={(v: string) => set({ promo: v })} />
      <View style={[s.row, { marginTop: 18, marginBottom: 8 }]}>
        <Text style={[s.title, s.g]}>{label("lbl.vendor.store.45aceea954","Store name translations")}</Text>
        <Pressable disabled={!canManage} onPress={() => { setLanguageQuery(''); setLanguageOpen(true); }}><Text style={{ color: t.blue, fontWeight: '700' }}>{label("lbl.vendor.store.8fd5db5884","+ Add language")}</Text></Pressable>
      </View>
      {Object.entries(f.names).filter(([code]) => LANGS.some(([key]) => key === code)).map(([code, value]) => {
        const language = LANGS.find(([key]) => key === code);
        return <View key={code} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}><Field editable={canManage} label={language?.[1] || code} value={String(value || '')} onChangeText={(v: string) => set({ names: { ...f.names, [code]: v } })} /></View>
          <Pressable disabled={!canManage} onPress={() => { const names = { ...f.names }; delete names[code]; set({ names }); }} style={{ padding: 10 }}><Icon name="close" size={18} color={t.mute} /></Pressable>
        </View>;
      })}
      {languageOpen ? <Modal visible transparent animationType="slide" onRequestClose={() => setLanguageOpen(false)}><SheetShell title={label("lbl.vendor.store.8960674be5","Add a language")} onClose={() => setLanguageOpen(false)} tall>
        <TextInput value={languageQuery} onChangeText={setLanguageQuery} placeholder={label("lbl.vendor.store.ea93e61773","Search languages")} placeholderTextColor={t.mute} style={[s.fld, { marginBottom: 8 }]} />
        <ScrollView style={{maxHeight: 420}} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {LANGS.filter(([code, name]) => !Object.prototype.hasOwnProperty.call(f.names, code) && (name + ' ' + code).toLowerCase().includes(languageQuery.trim().toLowerCase())).map(([code, name]) => <Pressable disabled={!canManage} key={code} onPress={() => { set({ names: { ...f.names, [code]: '' } }); setLanguageOpen(false); }} style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.line, flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: t.ink, flex: 1 }}>{name}</Text><Text style={{ color: t.mute, fontWeight: '700' }}>{code}</Text></Pressable>)}
        </ScrollView>
      </SheetShell></Modal> : null}
      <View style={{ height: 14 }} /><Btn label={label("lbl.vendor.store.2a44ecc711","Save store")} onPress={save} busy={busy} disabled={!canManage} />
    </Pg>
  );
}

/* ---------- publish / unpublish ---------- */
function GoLiveCard() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("store");
  const app = useApp(), s = useS(), t = useTheme();
  const st = useQ(() => goodiesApi.getLive(app.biz.id), [app.biz.id, app.tick]);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const lock = useRef(false);
  const live = !!st.d?.live;
  const toggle = async () => {
    if (!requireManage()) return;
    if (lock.current || st.l || st.e || !st.d) return;
    lock.current = true;
    setBusy(true); setErr('');
    try { const now = await goodiesApi.setLive(app.biz.id, !live); app.toast(now ? label("lbl.vendor.store.4b789615bc","Your store is live") : label("lbl.vendor.store.f66e947555","Your store is unpublished")); st.reload(); }
    catch (e) { const m = text(errText(e)); setErr(m); app.toast(m); }
    finally { lock.current = false; setBusy(false); }
  };
  if (st.l && !st.d) return <Skel h={70} />;
  if (st.e && !st.d) return <ErrBox e={st.e} retry={st.reload} />;
  return (
    <View>
      <View style={[s.row, { paddingVertical: 4 }]}>
        <View style={s.g}><Text style={s.title}>{label("lbl.vendor.store.e1ba5b5f09","Store status")}</Text>{st.d ? <Pill tone={live ? 'good' : 'mute'}>{live ? label("lbl.vendor.store.65c821a596","Live") : label("lbl.vendor.store.cf7d0ae846","Not live")}</Pill> : null}</View>
        <Btn small label={live ? label("lbl.vendor.store.1ac0a74d97","Unpublish") : label("lbl.vendor.store.b8d1bae42c","Go live")} kind={live ? 'soft' : 'primary'} busy={busy} disabled={!canManage || !st.d || st.l || !!st.e} onPress={toggle} />
      </View>
      {err ? <Text style={[s.mut, { marginTop: 6 }]}>{err}</Text> : null}
      {st.e ? <ErrBox e={st.e} retry={st.reload} /> : null}
    </View>
  );
}

/* ---------- products ---------- */
const RESTRICTIONS: { k: GProduct['restriction']; l: string }[] = [{ k: 'none', l: 'No restriction' }, { k: 'otc', l: 'Over the counter' }, { k: 'alcohol', l: 'Alcohol' }];
const BLANK: GProduct = { id: '', name: '', description: '', price: 0, emoji: '🛍️', stock: 0, available: true, restriction: 'none', photoUrl: null, photoUrls: [], reviewStatus: 'approved', reviewNote: null };
function ProductSheet({ product, onClose, onSaved }: { product: GProduct; onClose: () => void; onSaved: () => void }) {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("products");
  const app = useApp(), s = useS(), t = useTheme();
  const [f, setF] = useState({ name: product.name, description: product.description, price: product.id ? String(product.price) : '', stock: String(product.stock), emoji: product.emoji, restriction: product.restriction, photoUrl: product.photoUrl || '', photoUrls: product.photoUrls?.length ? product.photoUrls : product.photoUrl ? [product.photoUrl] : [], photoUris: [] as string[] });
  const [busy, setBusy] = useState(false);
  const operationLock = useRef(false);
  const [customTypes, setCustomTypes] = useState<GBuilder[]>([]);
  const [productMode, setProductMode] = useState<'regular' | 'custom'>('regular');
  const [customLoading, setCustomLoading] = useState(!product.id), [customError, setCustomError] = useState(false), [customAttempt, setCustomAttempt] = useState(0);
  useEffect(() => {
    if (product.id) return;
    let active = true;
    setCustomLoading(true);setCustomError(false);setCustomTypes([]);
    void goodiesApi.listBuilders(app.biz.id).then(rows => {if (active) setCustomTypes(rows.filter(x => (x.type === 'pizza' || x.type === 'burger') && x.enabled));})
      .catch(() => {if (active) setCustomError(true);}).finally(() => {if (active) setCustomLoading(false);});
    return () => {active = false;};
  }, [product.id, app.biz.id, customAttempt]);
  const openCustom = (type: 'pizza' | 'burger') => {
    if (!requireManage()) return;
    const existing = customTypes.find(x => x.type === type);
    onClose();
    app.go('goodiesBuilder', existing ? { id: existing.id } : { type, create: true });
  };
  const choosePhoto = async () => {
    if (!requireManage()) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { app.toast(label("lbl.vendor.products.8800aabbb8","Allow photo access to choose product photos")); return; }
    const room = Math.max(0, 5 - f.photoUrls.length - f.photoUris.length);
    if (!room) { app.toast(label("lbl.vendor.products.213417ecb4","A product can have up to 5 photos")); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: room, quality: 1 });
    if (!picked.canceled && picked.assets.length) setF(prev => ({ ...prev, photoUris: [...prev.photoUris, ...picked.assets.slice(0, Math.max(0, 5 - prev.photoUrls.length - prev.photoUris.length)).map(a => a.uri)] }));
  };
  const removePhotoAt = (index: number) => {if(!canManage)return;setF(prev => {
    const saved = [...prev.photoUrls], pending = [...prev.photoUris];
    if (index < saved.length) saved.splice(index, 1); else pending.splice(index - saved.length, 1);
    return { ...prev, photoUrls: saved, photoUris: pending };
  });};
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
    if (!requireManage()) return;
    if (operationLock.current) return;
    const e = check(); if (e) return app.toast(text(e));
    operationLock.current = true;
    setBusy(true);
    const uploadedPaths: string[] = [];
    try {
      const photoUrls = [...f.photoUrls];
      for (const uri of f.photoUris) {
        const resized = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.86, format: ImageManipulator.SaveFormat.JPEG });
        const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: FileSystem.EncodingType.Base64 });
        const uploadedPath = `${app.biz.id}/goodies/products/${uid()}${uid()}.jpg`;
        const { error } = await supabase.storage.from('listing-photos').upload(uploadedPath, decode(base64), { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (error) throw error;
        uploadedPaths.push(uploadedPath);
        photoUrls.push(supabase.storage.from('listing-photos').getPublicUrl(uploadedPath).data.publicUrl);
      }
      const nextPhotoUrls = photoUrls.slice(0, 5), photoUrl = nextPhotoUrls[0] || null;
      await goodiesApi.saveProduct(app.biz.id, { id: product.id || undefined, name: f.name, description: f.description, price: parseFloat(f.price), stock: Number(f.stock), emoji: f.emoji, restriction: f.restriction, photoUrl, photoUrls: nextPhotoUrls });
      const marker = '/storage/v1/object/public/listing-photos/';
      const removedPaths = (product.photoUrls?.length ? product.photoUrls : product.photoUrl ? [product.photoUrl] : []).filter(url => !nextPhotoUrls.includes(url)).map(url => url.includes(marker) ? decodeURIComponent(url.split(marker).pop() || '') : '').filter(Boolean);
      // The product is committed. Cleanup failures must not remove its new photos.
      if (removedPaths.length) {
        try { await supabase.storage.from('listing-photos').remove(removedPaths); }
        catch { console.warn('Unused product photos could not be removed'); }
      }
      app.toast(product.id ? label("lbl.vendor.products.c7c5dbc0c2","Product saved and updated in your store.") : label("lbl.vendor.products.cdc10422af","Product added to your store.")); onSaved();
    }
    catch (x) {
      if (uploadedPaths.length) await supabase.storage.from('listing-photos').remove(uploadedPaths).catch(() => undefined);
      app.toast(text(errText(x)));
    }
    finally { operationLock.current = false; setBusy(false); }
  };
  const del = () => {if(!requireManage())return;Alert.alert(label("lbl.vendor.products.4a95123769","Delete this product?"), label("lbl.vendor.products.23b0a87d8e","Customers will no longer see it. Past orders are not affected."), [
    { text: label("lbl.vendor.products.77dfd2135f","Cancel"), style: 'cancel' },
    { text: label("lbl.vendor.products.f6fdbe48dc","Delete"), style: 'destructive', onPress: async () => { if(!requireManage()||operationLock.current)return;operationLock.current=true;setBusy(true); try { await goodiesApi.deleteProduct(product.id); app.toast(label("lbl.vendor.products.2939664d78","Product deleted")); onSaved(); } catch (x) { app.toast(text(errText(x))); } finally { operationLock.current=false;setBusy(false); } } },
  ]);};
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
        <SheetShell title={product.id ? label("lbl.vendor.products.fbeabd233f","Edit product") : label("lbl.vendor.products.7c37958a3f","Add product")} onClose={onClose} tall>
          {!product.id && customLoading ? <Loading /> : null}
          {!product.id && customError ? <ErrBox e={label("lbl.vendor.products.5d7deda98a","Could not load custom product types. Please try again.")} retry={() => setCustomAttempt(value => value + 1)} /> : null}
          {!product.id && customTypes.length > 0 ? <View style={{ marginBottom: 12 }}>
            <Text style={s.label}>{label("lbl.vendor.products.c345f2388a","Product type")}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Btn small kind={productMode === 'regular' ? 'primary' : 'soft'} label={label("lbl.vendor.products.910b0cc6da","Regular product")} disabled={!canManage} onPress={() => setProductMode('regular')} /></View>
              <View style={{ flex: 1 }}><Btn small kind={productMode === 'custom' ? 'primary' : 'soft'} label={label("lbl.vendor.products.44873b76a6","Custom product")} disabled={!canManage} onPress={() => setProductMode('custom')} /></View>
            </View>
            {productMode === 'custom' ? <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {(['pizza', 'burger'] as const).filter(type => customTypes.some(x => x.type === type)).map(type => <View key={type} style={{ flex: 1 }}><Btn small kind="soft" label={type === 'pizza' ? label("lbl.vendor.products.01eb73e0be","Pizza") : label("lbl.vendor.products.2e10af9f72","Burger")} disabled={!canManage} onPress={() => openCustom(type)} /></View>)}
              </View>
            </View> : null}
          </View> : null}
          {product.id || productMode === 'regular' ? <>
          <Text style={s.label}>{label("lbl.vendor.products.57f1763709","Product photos ·")} {f.photoUrls.length + f.photoUris.length}/5</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {[...f.photoUrls, ...f.photoUris].map((uri, index) => <View key={uri + index} style={{ position: 'relative' }}>
              <Image source={{ uri }} style={{ width: 76, height: 76, borderRadius: 10 }} />
              <Pressable disabled={!canManage} onPress={() => removePhotoAt(index)} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={13} color="#fff" /></Pressable>
            </View>)}
            {f.photoUrls.length + f.photoUris.length < 5 ? <Pressable disabled={!canManage} onPress={choosePhoto} style={{ width: 76, height: 76, borderRadius: 10, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} color={t.blue} /><Text style={{ color: t.mute, fontSize: 10 }}>{label("lbl.vendor.products.d143493095","Add photo")}</Text></Pressable> : null}
          </View>
          <Field editable={canManage} label={label("lbl.vendor.products.709a23220f","Name")} value={f.name} onChangeText={(v: string) => setF({ ...f, name: v })} />
          <View style={s.row}><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.products.1a6eee07e8","Price ($)")} keyboardType="decimal-pad" value={f.price} onChangeText={(v: string) => setF({ ...f, price: v })} /></View><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.products.3f1356ad0e","In stock")} keyboardType="number-pad" value={f.stock} onChangeText={(v: string) => setF({ ...f, stock: v.replace(/\D/g, '') })} /></View></View>
          {Number.isFinite(parseFloat(f.price)) && parseFloat(f.price) >= 0 ? <View style={[s.card, { marginTop: 4 }]}><Text style={s.title}>{label("lbl.vendor.products.b7b32a9c85","Your earnings per unit")}</Text><View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>{label("lbl.vendor.products.7657ccd6e5","Selling price")}</Text><Text style={s.rt}>{dollars(parseFloat(f.price))}</Text></View><View style={s.row}><Text style={[s.mut, s.g]}>{label("lbl.vendor.products.60fa396946","Service fee (10%)")}</Text><Text style={s.rt}>−{dollars(Math.round(parseFloat(f.price) * 10) / 100)}</Text></View><View style={s.row}><Text style={[s.title, s.g]}>{label("lbl.vendor.products.29cc70a6ac","You receive")}</Text><Text style={s.title}>{dollars(Math.round(parseFloat(f.price) * 90) / 100)}</Text></View></View> : null}
          <Field editable={canManage} label={label("lbl.vendor.products.388de6fa3a","Description (optional)")} value={f.description} onChangeText={(v: string) => setF({ ...f, description: v })} multiline />
          <Text style={s.label}>{label("lbl.vendor.products.5de5861112","Restriction")}</Text>
          <GoodiesVendorControl disabled={!canManage}><Chips items={RESTRICTIONS.map(item=>({...item,l:text(item.l)}))} value={f.restriction} onChange={(v: GProduct['restriction']) => setF({ ...f, restriction: v })} /></GoodiesVendorControl>
          <Text style={[s.mut, { marginTop: 6 }]}>{label("lbl.vendor.products.9df9d3eb0b","Alcohol cannot be ordered online yet. Mark it so it stays blocked.")}</Text>
          <View style={{ height: 12 }} /><Btn label={product.id ? label("lbl.vendor.products.1d1e7045ee","Save product") : label("lbl.vendor.products.7c37958a3f","Add product")} onPress={save} busy={busy} disabled={!canManage} />
          {product.id ? <><View style={{ height: 8 }} /><Btn kind="soft" label={label("lbl.vendor.products.513a0e17b4","Delete product")} onPress={del} disabled={!canManage || busy} /></> : null}
          </> : null}
        </SheetShell>
      </View>
    </Modal>
  );
}

export function GoodiesProductsPage() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("products");
  const app = useApp(), s = useS(), t = useTheme(), route = useArg() as { add?: boolean;focus?:string } | undefined;
  const add = route?.add;
  const [page,setPage]=useState(0);
  const lst = useQ(() => goodiesApi.listProducts(app.biz.id,page,route?.focus), [app.biz.id, app.tick,page,route?.focus]);
  const builders = useQ(() => goodiesApi.listBuilders(app.biz.id), [app.biz.id, app.tick]);
  const [edit, setEdit] = useState<GProduct | null>(null);
  useEffect(() => { if (add && canManage) setEdit(BLANK); }, [add,canManage]);
  const items = lst.d ?? [];
  const customItems = (builders.d ?? []).filter(x => x.enabled && x.productCreated !== false);
  const [availabilityBusy, setAvailabilityBusy] = useState('');
  const availabilityLock = useRef(false);
  const toggle = async (p: GProduct, v: boolean) => {
    if (!requireManage()) return;
    if(availabilityLock.current || p.reviewStatus!=='approved')return;
    availabilityLock.current=true;setAvailabilityBusy(p.id);
    try {await goodiesApi.saveProduct(app.biz.id,{id:p.id,available:v});await lst.reload();}
    catch(e){app.toast(text(errText(e)));}
    finally{availabilityLock.current=false;setAvailabilityBusy('');}
  };
  const toggleCustom = async (b: GBuilder, v: boolean) => {
    if (!requireManage()) return;
    if(availabilityLock.current)return;availabilityLock.current=true;setAvailabilityBusy(b.id);
    try {
      const latest=await goodiesApi.listBuilders(app.biz.id);
      if(!latest.some(x=>x.id===b.id))throw new Error('This custom product is no longer available. Refresh Products.');
      await goodiesApi.saveBuilders(app.biz.id, latest.map(x => x.id === b.id ? { ...x, available: v } : x));
      await builders.reload(); app.bump();
    } catch (e) { app.toast(text(errText(e))); } finally {availabilityLock.current=false;setAvailabilityBusy('');}
  };
  return (
    <Pg title={label("lbl.vendor.products.fe0a091fdb","Products")} onBack={app.back} refreshing={lst.l && !!lst.d} onRefresh={lst.reload}>
      <Btn label={label("lbl.vendor.products.656630dc05","+ Add product")} disabled={!canManage} onPress={() => {if(canManage)setEdit(BLANK);}} />
      <View style={{ height: 8 }} />

      {lst.e ? <ErrBox e={lst.e} retry={lst.reload} /> : lst.l && !lst.d ? <Skel h={120} /> : items.length ? (
        <View style={s.cardFlat}><Divided>{items.map(p => (
          <Row key={p.id} left={(p.photoUrls?.[0] || p.photoUrl) ? <Image source={{ uri: p.photoUrls?.[0] || p.photoUrl! }} style={{ width: 48, height: 48, borderRadius: 10, marginRight: 6 }} /> : <Text style={{ fontSize: 26, marginRight: 4 }}>{p.emoji}</Text>} title={p.name} sub={label("lbl.vendor.products.6467786779","{value0} · {value1}{value2}",{value0:(dollars(p.price)),value1:(p.stock > 0 ? label("lbl.vendor.products.9ffca18168",'{count} in stock',{count:p.stock}) : text('Out of stock')),value2:(p.restriction !== 'none' ? ' · ' + (p.restriction === 'alcohol' ? text('Alcohol') : text('Over the counter')) : '')})}
            sub2={p.reviewStatus==='rejected' ? label("lbl.vendor.products.27eeb7a291","Rejected")+(p.reviewNote ? ': '+p.reviewNote : '') : p.reviewStatus==='pending' ? label("lbl.vendor.products.5a5a12dce6","Awaiting review") : availabilityBusy===p.id ? label("lbl.vendor.products.56a2285c5b","Saving…") : undefined} onPress={() => setEdit(p)} right={<Toggle value={p.available} disabled={!canManage || p.stock <= 0 || p.reviewStatus!=='approved' || !!availabilityBusy} onValueChange={(v: boolean) => toggle(p, v)} />} />
        ))}</Divided></View>
      ) : null}
      {builders.e ? <ErrBox e={builders.e} retry={builders.reload} /> : builders.l && !builders.d ? <Skel h={100} /> : null}
      {customItems.length ? <><Section title={label("lbl.vendor.products.da4e1e0b2f","Custom products")} /><View style={s.cardFlat}><Divided>{customItems.map(b => <Row key={b.id} title={b.name} sub={label("lbl.vendor.products.4fb08c0f26","{value0} · {value1} base price",{value0:(b.type === 'pizza' ? text('Pizza') : b.type === 'burger' ? text('Burger') : text('Custom')),value1:(dollars(Number(b.base) || 0))})} onPress={() => app.go('goodiesBuilder', { id: b.id })} right={<Toggle value={b.available} disabled={!canManage || !!availabilityBusy} onValueChange={(v: boolean) => toggleCustom(b, v)} />} />)}</Divided></View></> : null}
      {!items.length && !customItems.length && !lst.l && !lst.e && !builders.l && !builders.e ? <View style={s.cardFlat}><Empty icon="package-variant-closed" title={page>0 ? label("lbl.vendor.products.9728302382","No products on this page") : label("lbl.vendor.products.d2fb4b513c","No products yet")} cta={label("lbl.vendor.products.7c37958a3f","Add product")} onCta={canManage?()=>setEdit(BLANK):undefined} /></View> : null}
      <View style={[s.row,{marginTop:12}]}><Btn label={label("lbl.vendor.products.81f547195b","Previous page")} kind="soft" disabled={page===0||lst.l} onPress={()=>setPage(p=>p-1)} /><Btn label={label("lbl.vendor.products.4bfc194b68","Next page")} kind="soft" disabled={lst.l||items.length<100} onPress={()=>setPage(p=>p+1)} /></View>
      <GoLiveCard />
      {edit ? <ProductSheet product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); lst.reload(); }} /> : null}
    </Pg>
  );
}

/* ---------- builder editor ---------- */
export function GoodiesBuilderEditPage() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("builders");
  const app = useApp(), s = useS(), t = useTheme(), route = useArg() as { id?: string; type?: 'pizza' | 'burger'; create?: boolean } | undefined, id = route?.id, createType = route?.create ? route.type : undefined;
  const [all, setAll] = useState<GBuilder[]>([]), [b, setB] = useState<GBuilder | null>(null), [errs, setErrs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [saving, setSaving] = useState(false), [loadAttempt, setLoadAttempt] = useState(0);
  const builderSaveLock = useRef(false);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(0), [selectedItem, setSelectedItem] = useState<{ gi: number; ii: number } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(''); setB(null);
    const attachAssets = (builder: GBuilder, library: any[]): GBuilder => ({
      ...builder,
      groups: builder.groups.map(group => ({
        ...group,
        items: group.items.map(item => ({
          ...item,
          assetUrl: item.assetUrl || library.find(asset => asset.id === item.assetId)?.assetUrl || null,
        })),
      })),
    });
    (async () => {
      try {
        const rows = await goodiesApi.listBuilders(app.biz.id);
        if (!active) return;
        const initial = createType ? newBuilder(createType) : id ? rows.find(x => x.id === id) || null : null;
        setAll(rows);
        setB(initial);
        setLoading(false);
        try {
          const library = await goodiesApi.library();
          if (!active) return;
          setAll(current => current.map(builder => attachAssets(builder, library)));
          setB(current => current ? attachAssets(current, library) : current);
        } catch {
          // The builder remains usable when optional library metadata is unavailable.
        }
      } catch (e) {
        if (active) { setLoadError(text(errText(e))); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [app.biz.id, id, createType, loadAttempt]);
  if (loading) return <Pg title={label("lbl.vendor.builders.44873b76a6","Custom product")} onBack={app.back}><Skel h={180} /><Skel h={220} /></Pg>;
  if (loadError) return <Pg title={label("lbl.vendor.builders.44873b76a6","Custom product")} onBack={app.back}><ErrBox e={loadError} retry={() => { setLoading(true); setLoadError(''); setLoadAttempt(v => v + 1); }} /></Pg>;
  if ((!id && !createType) || !b) return <Pg title={label("lbl.vendor.builders.44873b76a6","Custom product")} onBack={app.back}><Empty icon="tune-variant" title={label("lbl.vendor.builders.d00da9ef2c","Custom product unavailable")} hint={label("lbl.vendor.builders.a8717db58c","This custom product could not be found for this store. Return to Products and add a custom product there.")} cta={label("lbl.vendor.builders.6c46da464b","Back to Products")} onCta={() => app.go('goodiesProducts')} /></Pg>;
  const up = (p: Partial<GBuilder>) => {if(canManage)setB({ ...b, ...p });};
  const upG = (gi: number, p: Partial<GGroup>) => up({ groups: b.groups.map((g, i) => (i === gi ? { ...g, ...p } : g)) });
  const upI = (gi: number, ii: number, p: Partial<GItem>) => upG(gi, { items: b.groups[gi].items.map((x, i) => (i === ii ? { ...x, ...p } : x)) });
  const move = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const c = a.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; };
  const save = async () => {
    if (!requireManage() || builderSaveLock.current) return;
    const e = validateBuilder(b,label); setErrs(e);
    if (e.length) return app.toast(e[0]);
    builderSaveLock.current = true;
    setSaving(true);
    try {
      const latest=await goodiesApi.listBuilders(app.biz.id);
      const existed=all.some(x=>x.id===b.id), existsNow=latest.some(x=>x.id===b.id);
      if(existed!==existsNow)throw new Error('This custom product changed while editing. Refresh Products and try again.');
      // Do not submit a stale full-list snapshot that removes or rewrites
      // unrelated custom products modified by a vendor or administrator.
      const updated=existed
        ? latest.map(x=>(x.id===b.id ? { ...b, productCreated: true } : x))
        : [...latest, { ...b, enabled: true, available: true, productCreated: true }];
      await goodiesApi.saveBuilders(app.biz.id,updated);
      app.toast(b.productCreated === false ? label("lbl.vendor.builders.55fbc59fd2","Custom product added") : label("lbl.vendor.builders.7efcfe59ac","Custom product saved")); app.bump(); app.back();
    } catch (error) {
      app.toast(text(errText(error)));
    } finally {
      builderSaveLock.current = false;
      setSaving(false);
    }
  };
  const num = (v: string) => parseInt(v.replace(/\D/g, '') || '0', 10);
  return (
    <Pg title={b.productCreated === false ? label("lbl.vendor.builders.85f3f1d2ea","Add custom product") : (b.name || label("lbl.vendor.builders.44873b76a6","Custom product"))} onBack={app.back}>
      <Section title={label("lbl.vendor.builders.0357f9024b","Product details")} />
      <Field editable={canManage} label={label("lbl.vendor.builders.709a23220f","Name")} value={b.name} onChangeText={(v: string) => up({ name: v })} />
      <Field editable={canManage} label={label("lbl.vendor.builders.55f8ebc805","Description")} value={b.desc} onChangeText={(v: string) => up({ desc: v })} multiline />
      <Field editable={canManage} label={label("lbl.vendor.builders.644cec20e9","Base price ($)")} keyboardType="decimal-pad" value={b.base} onChangeText={(v: string) => up({ base: v })} />
      <View style={[s.row, { marginTop: 10 }]}><Text style={[s.title, s.g]}>{label("lbl.vendor.builders.d7b31f7eaf","Allow special instructions")}</Text><Toggle disabled={!canManage} value={b.notes} onValueChange={(v: boolean) => up({ notes: v })} /></View>

      <GoodiesVendorControl disabled={!canManage}><Section title={label("lbl.vendor.builders.96de489fe3","Sizes")} right={text("Add")} onRight={() => up({ sizes: [...b.sizes, { id: uid(), name: '', add: '0', avail: true }] })} /></GoodiesVendorControl>
      {b.sizes.map((z, i) => (
        <View key={z.id} style={s.card}>
          <Field editable={canManage} label={label("lbl.vendor.builders.c99b180cd7","Size name")} value={z.name} onChangeText={(v: string) => up({ sizes: b.sizes.map((x, j) => (j === i ? { ...x, name: v } : x)) })} />
          <Field editable={canManage} label={label("lbl.vendor.builders.0bc637e5e9","Extra price ($)")} keyboardType="decimal-pad" value={z.add} onChangeText={(v: string) => up({ sizes: b.sizes.map((x, j) => (j === i ? { ...x, add: v } : x)) })} />
          <View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>{label("lbl.vendor.builders.7c62a14244","Available")}</Text><Toggle disabled={!canManage} value={z.avail} onValueChange={(v: boolean) => up({ sizes: b.sizes.map((x, j) => (j === i ? { ...x, avail: v } : x)) })} /></View>
          <View style={{ height: 8 }} /><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.d28f91d944","Remove size")} onPress={() => up({ sizes: b.sizes.filter((_, j) => j !== i) })} />
        </View>
      ))}

      <GoodiesVendorControl disabled={!canManage}><Section title={label("lbl.vendor.builders.e0b4b419b6","Sections and ingredients")} right={text("Add section")} onRight={() => { up({ groups: [...b.groups, { id: uid(), name: 'New section', kind: 'many', req: false, min: 0, max: 1, inc: 0, me: 1, items: [] }] }); setExpandedGroup(b.groups.length); setSelectedItem(null); }} /></GoodiesVendorControl>
      {b.groups.map((g, gi) => {
        const expanded = expandedGroup === gi;
        return <View key={g.id} style={{ borderBottomWidth: 1, borderBottomColor: t.line, paddingVertical: 8 }}>
          <Pressable onPress={() => { setExpandedGroup(expanded ? null : gi); setSelectedItem(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { fontSize: 15 }]}>{g.name || label("lbl.vendor.builders.f42ca5f288","Untitled section")}</Text>
              <Text style={s.mut}>{g.items.length}  {label("lbl.vendor.builders.4b78613147","ingredients ·")} {g.kind === 'one' ? label("lbl.vendor.builders.4238dc4122","Choose one") : label("lbl.vendor.builders.96ae91f43b","Choose several")}{g.req ? ' ' + label("lbl.vendor.builders.68294aebf9","· Required") : ''}</Text>
            </View>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={t.mute} />
          </Pressable>
          {expanded ? <View style={{ paddingTop: 8 }}>
            <Field editable={canManage} label={label("lbl.vendor.builders.75e2b3c1f8","Section name")} value={g.name} onChangeText={(v: string) => upG(gi, { name: v })} />
            <View style={{ height: 8 }} />
            <GoodiesVendorControl disabled={!canManage}><Seg {...vendorSegmentProps(['Pick one','Pick several'],g.kind==='one'?'Pick one':'Pick several',(v:string)=>upG(gi,v==='Pick one'?{kind:'one',min:g.req?1:0,max:1,inc:0,me:1}:{kind:'many'}),text)} /></GoodiesVendorControl>
            <View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>{label("lbl.vendor.builders.eed6bfb410","Required")}</Text><Toggle disabled={!canManage} value={g.req} onValueChange={(v: boolean) => upG(gi, { req: v, min: g.kind === 'one' ? (v ? 1 : 0) : g.min })} /></View>
            {g.kind === 'many' ? <View>
              <View style={s.row}><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.builders.ef3805eb1a","Minimum picks")} keyboardType="number-pad" value={String(g.min)} onChangeText={(v: string) => upG(gi, { min: num(v) })} /></View><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.builders.f4a4a736be","Maximum picks")} keyboardType="number-pad" value={String(g.max)} onChangeText={(v: string) => upG(gi, { max: num(v) })} /></View></View>
              <View style={s.row}><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.builders.d7e651f3fd","Included free")} keyboardType="number-pad" value={String(g.inc)} onChangeText={(v: string) => upG(gi, { inc: num(v) })} /></View><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.builders.b474575d2c","Max same ingredient")} keyboardType="number-pad" value={String(g.me)} onChangeText={(v: string) => upG(gi, { me: num(v) })} /></View></View>
            </View> : null}
            <View style={{ marginTop: 6 }}>
              {g.items.map((it, ii) => {
                const selected = selectedItem?.gi === gi && selectedItem?.ii === ii;
                return <View key={it.id}>
                  <Pressable onPress={() => setSelectedItem(selected ? null : { gi, ii })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                    {it.assetUrl ? <Image source={{ uri: it.assetUrl }} style={{ width: 42, height: 42, borderRadius: 9 }} resizeMode="cover" /> : <View style={{ width: 42, height: 42, borderRadius: 9, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name="image-outline" size={18} color={t.mute} /></View>}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.ink, fontWeight: '600' }}>{it.name || label("lbl.vendor.builders.4e06f8eb7a","Unnamed ingredient")}</Text>
                      <Text style={s.mut}>{it.avail ? (it.free ? label("lbl.vendor.builders.3e2c570409","Included") : dollars(it.price)) : label("lbl.vendor.builders.da49fb3e5c","Not offered")}{it.max ? ' ' + label("lbl.vendor.builders.583a5e0da7","· Max") + ' ' + it.max : ''}</Text>
                    </View>
                    <Icon name={selected ? 'chevron-up' : 'chevron-down'} size={18} color={t.mute} />
                  </Pressable>
                  {selected ? <View style={{ backgroundColor: t.bg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                    <Field editable={canManage} label={label("lbl.vendor.builders.6f2b4d63b7","Ingredient name")} value={it.name} onChangeText={(v: string) => upI(gi, ii, { name: v })} />
                    <View style={s.row}><View style={s.g}><Field editable={canManage && !it.free} label={label("lbl.vendor.builders.7cc61b7395","Add-on price ($)")} keyboardType="decimal-pad" value={it.free ? '0' : String(it.price)} onChangeText={(v: string) => upI(gi, ii, { price: parseFloat(v) || 0 })} /></View><View style={s.g}><Field editable={canManage} label={label("lbl.vendor.builders.41ba477e5b","Max per product")} keyboardType="number-pad" value={it.max ? String(it.max) : ''} onChangeText={(v: string) => upI(gi, ii, { max: v ? num(v) : undefined })} /></View></View>
                    <View style={[s.row, { marginTop: 4 }]}><Text style={[s.mut, s.g]}>{label("lbl.vendor.builders.8a6092adf0","Free / included")}</Text><Toggle disabled={!canManage} value={it.free} onValueChange={(v: boolean) => upI(gi, ii, { free: v, price: v ? 0 : it.price })} /></View>
                    <View style={[s.row, { marginTop: 4 }]}><Text style={[s.mut, s.g]}>{label("lbl.vendor.builders.acdee40f13","Available to customers")}</Text><Toggle disabled={!canManage} value={it.avail} onValueChange={(v: boolean) => upI(gi, ii, { avail: v })} /></View>
                    {b.type === 'custom' ? <Field editable={canManage} label={label("lbl.vendor.builders.a0152991fc","Colour (hex, optional)")} value={it.col || ''} onChangeText={(v: string) => upI(gi, ii, { col: v })} /> : null}
                    <View style={[s.row, { marginTop: 8 }]}><View style={s.g}><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.b4f57cd0cd","Move up")} onPress={() => { upG(gi, { items: move(g.items, ii, -1) }); setSelectedItem(null); }} /></View><View style={s.g}><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.260ff8ae71","Move down")} onPress={() => { upG(gi, { items: move(g.items, ii, 1) }); setSelectedItem(null); }} /></View><View style={s.g}><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.e963907dac","Remove")} onPress={() => { upG(gi, { items: g.items.filter((_, j) => j !== ii) }); setSelectedItem(null); }} /></View></View>
                  </View> : null}
                </View>;
              })}
            </View>
            <View style={[s.row, { marginTop: 8 }]}><View style={s.g}><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.14a6924966","+ Ingredient")} onPress={() => { upG(gi, { items: [...g.items, { id: uid(), name: '', price: 0, free: true, avail: true, assetId: null, assetUrl: null, col: null }] }); setSelectedItem({ gi, ii: g.items.length }); }} /></View><View style={s.g}><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.e7eaff78b3","Remove section")} onPress={() => { up({ groups: b.groups.filter((_, j) => j !== gi) }); setExpandedGroup(null); setSelectedItem(null); }} /></View></View>
            <View style={[s.row, { marginTop: 8 }]}><View style={s.g}><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.0ac7949b77","Move section up")} onPress={() => { up({ groups: move(b.groups, gi, -1) }); setExpandedGroup(Math.max(0, gi - 1)); setSelectedItem(null); }} /></View><View style={s.g}><Btn disabled={!canManage} small kind="soft" label={label("lbl.vendor.builders.6ff2ef30e1","Move section down")} onPress={() => { up({ groups: move(b.groups, gi, 1) }); setExpandedGroup(Math.min(b.groups.length - 1, gi + 1)); setSelectedItem(null); }} /></View></View>
          </View> : null}
        </View>;
      })}
      {errs.length ? <View style={s.card}><Text style={s.title}>{label("lbl.vendor.builders.d3c81046b6","Fix these first")}</Text>{errs.map(e => <Text key={e} style={s.mut}>• {e}</Text>)}</View> : null}
      <Btn disabled={!canManage} kind="soft" label={label("lbl.vendor.builders.513a775255","Request an ingredient")} onPress={() => app.go('goodiesRequests', { open: true, builder: b.type })} />
      <View style={{ height: 14 }} /><Btn label={b.productCreated === false ? label("lbl.vendor.builders.85f3f1d2ea","Add custom product") : label("lbl.vendor.builders.179359b39e","Save changes")} onPress={save} busy={saving} disabled={!canManage} />
    </Pg>
  );
}

/* ---------- ingredient requests ---------- */
export function GoodiesRequestsPage() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("requests");
  const app = useApp(), s = useS(), t = useTheme(), route = useArg() as { open?: boolean; builder?: GRequest['builder'] } | undefined;
  const [list, setList] = useState<GRequest[]>([]), [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const requestSequence = useRef(0), sendLock = useRef(false);
  const [rules, setRules] = useState(''), [ack, setAck] = useState(false), [photo, setPhoto] = useState('');
  const blank = { name: '', builder: route?.builder || 'burger' as GRequest['builder'], role: '', note: '' };
  const [f, setF] = useState(blank);
  useEffect(() => { if (route?.open) setOpen(true); if (route?.builder) setF(current => ({ ...current, builder: route.builder! })); }, [route?.open, route?.builder]);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false);
  const load = async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);setLoadError(false);
    try {const [requests, photoRules] = await Promise.all([goodiesApi.listRequests(app.biz.id,page), goodiesApi.rules()]);if(sequence===requestSequence.current){setList(requests);setRules(photoRules);}}
    catch {if(sequence===requestSequence.current)setLoadError(true);}
    finally {if(sequence===requestSequence.current)setLoading(false);}
  };
  useEffect(() => { void load();return()=>{requestSequence.current++;}; }, [app.biz.id,page]);
  const choose = async () => {
    if (!requireManage()) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return app.toast(label("lbl.vendor.requests.2d29367018","Allow photo access to add a picture"));
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
  };
  const send = async () => {
    if (!requireManage()) return;
    if(sendLock.current || loading || loadError) return;
    if (f.name.trim().length < 2) return app.toast(label("lbl.vendor.requests.677356e2db","Enter the ingredient name"));
    if (!ack) return app.toast(label("lbl.vendor.requests.47fe8340e4","Read the photo rules first"));
    sendLock.current = true;setBusy(true);
    try {
      const path = photo ? await goodiesApi.uploadRequestPhoto(app.biz.id, photo) : null;
      await goodiesApi.submitRequest(app.biz.id, { ...f, name: f.name.trim(), role: f.role.trim(), note: f.note.trim() }, path);
      setOpen(false); setF(blank); setPhoto(''); setAck(false); app.toast(label("lbl.vendor.requests.42f37e978a","Request sent to Wantiss")); if(page===0)await load();else setPage(0);
    } catch (e) { app.toast(text(errText(e))); } finally { sendLock.current = false;setBusy(false); }
  };
  const tone = (st: string): any => (st === 'approved' ? 'good' : st === 'denied' ? 'bad' : 'warn');
  const requestLabels: Record<string, string> = { submitted: 'Waiting', approved: 'Approved', denied: 'Not approved', needs_info: 'Needs info' };
  return (
    <Pg title={label("lbl.vendor.requests.dd8023440a","Ingredient requests")} onBack={app.back} right={undefined}>
      <Text style={s.mut}>{label("lbl.vendor.requests.e2b9fff418","Send a request with a photo and our team will review it. If approved, the ingredient appears in the library for your selected product type. You can then choose whether to offer it, set its price and define customer limits.")}</Text>
      <View style={{ height: 10 }} /><Btn label={label("lbl.vendor.requests.513a775255","Request an ingredient")} disabled={!canManage || loading || loadError} onPress={() => setOpen(true)} />
      <Section title={label("lbl.vendor.requests.91d672ff52","Your requests")} />
      {loading ? <Skel h={120} /> : loadError ? <ErrBox e={label("lbl.vendor.requests.7fbf2722db","Could not load ingredient requests.")} retry={load} /> : list.length === 0 ? <Text style={s.mut}>{page===0?label("lbl.vendor.requests.40fea9a851","No requests yet."):label("lbl.vendor.requests.85a325745d","No requests on this page.")}</Text> : <View style={s.cardFlat}><Divided>{list.map(r => <Row key={r.id} title={r.name} sub={label("lbl.vendor.requests.90459ace80","{value0}{value1}{value2}{value3}",{value0:(text(r.builder)),value1:(r.role ? ' · ' + r.role : ''),value2:(r.photo ? ' · '+text('Photo sent') : ''),value3:(r.reviewNote ? '\n' + r.reviewNote : '')})} right={<Pill tone={tone(r.status)}>{text(requestLabels[r.status])}</Pill>} />)}</Divided></View>}
      <View style={[s.row,{marginTop:12}]}><Btn kind="soft" label={label("lbl.vendor.requests.81f547195b","Previous page")} disabled={page===0||loading} onPress={()=>setPage(p=>p-1)} /><Btn kind="soft" label={label("lbl.vendor.requests.4bfc194b68","Next page")} disabled={loading||loadError||list.length<50} onPress={()=>setPage(p=>p+1)} /></View>
      {open ? (
        <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
            <SheetShell title={label("lbl.vendor.requests.513a775255","Request an ingredient")} onClose={() => setOpen(false)} tall>
              <ScrollView style={{ maxHeight: 520 }}>
                <Field editable={canManage} label={label("lbl.vendor.requests.6f2b4d63b7","Ingredient name")} value={f.name} onChangeText={(v: string) => setF({ ...f, name: v })} />
                <Text style={s.label}>{label("lbl.vendor.requests.87bf74571b","For which custom product")}</Text>
                <GoodiesVendorControl disabled={!canManage}><Chips items={[{ k: 'burger', l: text('Burger') }, { k: 'pizza', l: text('Pizza') }, { k: 'custom', l: text('Custom') }]} value={f.builder} onChange={(v: any) => setF({ ...f, builder: v })} /></GoodiesVendorControl>
                <Field editable={canManage} label={label("lbl.vendor.requests.1d8ec4d7df","What is it (topping, sauce, bun, patty…)")} value={f.role} onChangeText={(v: string) => setF({ ...f, role: v })} />
                <Field editable={canManage} label={label("lbl.vendor.requests.f73f7d247c","Notes for the team")} value={f.note} onChangeText={(v: string) => setF({ ...f, note: v })} multiline />
                <Text style={s.label}>{label("lbl.vendor.requests.6a4afafecc","Photo rules")}</Text>
                <View style={s.cardFlat}><Text style={s.mut}>{rules || label("lbl.vendor.requests.2f7360d6c2","Use a clear, square, top-down photo of only the ingredient on a plain background.")}</Text></View>
                <Text style={s.label}>{label("lbl.vendor.requests.d01d900383","Photo")}</Text>
                {photo ? <Image source={{ uri: photo }} style={{ width: 120, height: 120, borderRadius: 10, marginBottom: 8 }} /> : null}
                <Btn small kind="soft" label={photo ? label("lbl.vendor.requests.ed5690c3ae","Change photo") : label("lbl.vendor.requests.4a7eded8ed","Choose photo")} disabled={!canManage} onPress={choose} />
                <View style={{ height: 10 }} />
                <Btn small kind="soft" label={ack ? label("lbl.vendor.requests.3e8de24a3b","✓ I have read the photo rules") : label("lbl.vendor.requests.e76a8eae98","I have read the photo rules")} disabled={!canManage} onPress={() => setAck(!ack)} />
                <View style={{ height: 12 }} /><Btn label={label("lbl.vendor.requests.a89d641794","Send request")} onPress={send} busy={busy} disabled={!canManage||busy||loading||loadError} />
              </ScrollView>
            </SheetShell>
          </View>
        </Modal>
      ) : null}
    </Pg>
  );
}

export function GoodiesReviewsPage() {
  const {label,text,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("reviews");
  const app = useApp(), s = useS();
  const [page, setPage] = useState(0);
  const reviews = useQ(() => q<any[]>(supabase.from('goodies_order_reviews')
    .select('order_id,target,rating,comment,created_at').eq('business_id',app.biz.id)
    .order('created_at',{ascending:false}).order('order_id',{ascending:false}).order('target')
    .range(page*50,page*50+49)), [app.biz.id,app.tick,page]);
  return <Pg title={label("lbl.vendor.reviews.217856565b","Goodies reviews")} onBack={app.back} refreshing={reviews.l} onRefresh={reviews.reload}>
    {reviews.e ? <ErrBox e={reviews.e} retry={reviews.reload} /> : reviews.l ? <Skel h={140} /> : (reviews.d || []).length ? <View style={s.cardFlat}><Divided>{(reviews.d || []).map(r => <Row key={r.order_id+r.target} title={label("lbl.vendor.reviews.b06bc37417","{value0} / 5 · {value1}",{value0:(r.rating),value1:(r.target==='driver'?text('Delivery'):text('Store'))})} sub={r.comment || label("lbl.vendor.reviews.8e785c90be","No comment")} sub2={new Date(r.created_at).toLocaleDateString(locale==='ht'?'fr-HT':locale)} />)}</Divided></View> : <Empty title={label("lbl.vendor.reviews.e4d2123a31","No reviews yet")} />}
    <View style={[s.row,{marginTop:12}]}><Btn kind="soft" label={label("lbl.vendor.reviews.81f547195b","Previous page")} disabled={page===0||reviews.l} onPress={()=>setPage(p=>p-1)} /><Btn kind="soft" label={label("lbl.vendor.reviews.4bfc194b68","Next page")} disabled={reviews.l||(reviews.d||[]).length<50} onPress={()=>setPage(p=>p+1)} /></View>
  </Pg>;
}
