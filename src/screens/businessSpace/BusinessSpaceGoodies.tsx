/* Goodies tools for the Vendor Dashboard (Business Space).
   Moves the seller-side screens out of the Goodies customer app (v24 `seller` and `sellerEdit`) and adds store setup and ingredient requests.
   Store setup, products and publishing go through `goodiesApi` to Supabase. Builders and ingredient requests still use AsyncStorage (custom builder items are not orderable yet). */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useApp, useArg, useS, useTheme, useQ, rpc, q, errText, STATUS_UI, Pg, Section, Field, Btn, Chips, Seg, Toggle, Pill, Row, Divided, Icon, SheetShell, Empty, ErrBox, Skel } from './BusinessSpaceShared';
import { TEMPLATES, TplBuilder, TplGroup, TplItem } from './goodiesTemplates';
import { fetchPublishedWantissContent } from '../../lib/wantissCms';

/* ---------- types (PROPOSED contracts) ---------- */
export type GStore = { demoStoreId: string; category: string; kind: string; minOrder: string; fee: string; etaMin: string; etaMax: string; promo: string; delivery: boolean; pickup: boolean; names: Record<string, string> };
export type GProduct = { id: string; name: string; description: string; price: number; emoji: string; stock: number; available: boolean; restriction: 'none' | 'otc' | 'alcohol' };
export type GItem = TplItem & { id: string; avail: boolean };
export type GGroup = Omit<TplGroup, 'items'> & { id: string; items: GItem[] };
export type GBuilder = { id: string; type: 'pizza' | 'burger' | 'custom'; name: string; desc: string; emoji: string; base: string; enabled: boolean; available: boolean; sizes: { id: string; name: string; add: string; avail: boolean }[]; groups: GGroup[]; notes: boolean };
export type GRequest = { id: string; name: string; builder: 'pizza' | 'burger'; role: string; note: string; status: 'submitted' | 'approved' | 'denied' | 'needs_info'; at: number };

/* admin-owned presets. The backend only accepts these category ids. */
export const CATEGORY_PRESETS: { id: string; name: string }[] = [
  { id: 'restaurants', name: 'Restaurant' }, { id: 'produce', name: 'Fresh produce' }, { id: 'beverages', name: 'Beverages' }, { id: 'bakery', name: 'Bakery & desserts' }, { id: 'meat', name: 'Meat & seafood' },
  { id: 'groceries', name: 'Groceries' }, { id: 'haitian', name: 'Haitian products' }, { id: 'care', name: 'Personal care' }, { id: 'drugstore', name: 'Drugstore' },
];
const ALC = /alcohol|alcool|liquor|licor|\brum\b|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\bbeer|bi[èe]re|cerveza|\bwine|\bvin\b|vino|champagne|cocktail|\bspirits\b|啤酒|白酒|葡萄酒|红酒|烈酒|威士忌|伏特加|朗姆|鸡尾酒/i;
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- data access: swap this object for Supabase later ---------- */
const k = (b: string, n: string) => `bs.goodies.${n}.${b}`;
const rd = async <T,>(key: string, d: T): Promise<T> => { try { const v = await AsyncStorage.getItem(key); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
export const goodiesApi = {
  /* Store setup lives on the backend: the business is the store (store id = business id). */
  getStore: async (biz: string): Promise<GStore> => {
    const d: GStore = { demoStoreId: '', category: '', kind: '', minOrder: '5', fee: '2', etaMin: '20', etaMax: '35', promo: '', delivery: true, pickup: true, names: {} };
    const r = await q<any>(supabase.from('goodies_store_schedules').select('category,kind,min_order,delivery_fee,eta_min,eta_max,promo,names,delivery_modes').eq('business_id', biz).maybeSingle());
    if (!r) return d;
    const modes: string[] = Array.isArray(r.delivery_modes) ? r.delivery_modes.map((x: string) => String(x).toLowerCase()) : [];
    return {
      demoStoreId: '', category: r.category || '', kind: r.kind || '', minOrder: String(r.min_order ?? 5), fee: String(r.delivery_fee ?? 2), etaMin: String(r.eta_min ?? 20), etaMax: String(r.eta_max ?? 35), promo: r.promo || '',
      delivery: modes.length ? modes.includes('delivery') : true, pickup: modes.length ? modes.includes('pickup') : true, names: r.names && typeof r.names === 'object' ? r.names : {},
    };
  },
  saveStore: async (biz: string, st: GStore) => {
    const names = Object.fromEntries(Object.entries(st.names).filter(([, v]) => String(v || '').trim()).map(([k2, v]) => [k2, String(v).trim().slice(0, 160)]));
    await rpc('goodies_save_store_setup', {
      p_business: biz, p_category: st.category, p_kind: st.kind.trim() || null, p_min_order: parseFloat(st.minOrder) || 0, p_delivery_fee: parseFloat(st.fee) || 0,
      p_eta_min: parseInt(st.etaMin, 10) || 20, p_eta_max: parseInt(st.etaMax, 10) || 35, p_promo: st.promo.trim() || null, p_names: names, p_delivery: st.delivery, p_pickup: st.pickup,
    });
  },
  /* Publish status. Going live is checked on the server: verified business, category, hours and one in-stock product. */
  getLive: async (biz: string) => {
    const r = await q<any>(supabase.from('goodies_store_schedules').select('is_live').eq('business_id', biz).maybeSingle());
    const v = await q<any>(supabase.from('businesses').select('verification').eq('id', biz).maybeSingle());
    return { live: !!r?.is_live, hasSetup: !!r, verification: (v?.verification || 'pending') as keyof typeof STATUS_UI };
  },
  setLive: (biz: string, live: boolean) => rpc<boolean>('goodies_set_store_live', { p_business: biz, p_live: live }),
  /* Products (stock is set by the vendor). Row security allows owners and admins only. */
  listProducts: async (biz: string): Promise<GProduct[]> => {
    const rows = await q<any[]>(supabase.from('goodies_products').select('id,name,description,price,emoji,stock,is_available,restriction').eq('business_id', biz).order('sort_order', { ascending: true }).order('created_at', { ascending: true }));
    return (rows || []).map(r => ({ id: r.id, name: r.name, description: r.description || '', price: Number(r.price), emoji: r.emoji || '🛍️', stock: Number(r.stock), available: !!r.is_available, restriction: r.restriction || 'none' }));
  },
  saveProduct: async (biz: string, p: Partial<GProduct> & { id?: string }) => {
    const f: Record<string, unknown> = {};
    if (p.name !== undefined) f.name = p.name.trim();
    if (p.description !== undefined) f.description = p.description.trim() || null;
    if (p.price !== undefined) f.price = p.price;
    if (p.emoji !== undefined) f.emoji = p.emoji.trim() || '🛍️';
    if (p.stock !== undefined) f.stock = p.stock;
    if (p.available !== undefined) f.is_available = p.available;
    if (p.restriction !== undefined) f.restriction = p.restriction;
    const res = p.id ? await supabase.from('goodies_products').update({ ...f, updated_at: new Date().toISOString() }).eq('id', p.id).select('id') : await supabase.from('goodies_products').insert({ ...f, business_id: biz }).select('id');
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) throw new Error('Not allowed. Only the owner or an admin can change products.');
  },
  deleteProduct: async (id: string) => {
    const res = await supabase.from('goodies_products').delete().eq('id', id).select('id');
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) throw new Error('Not allowed. Only the owner or an admin can delete products.');
  },
  listBuilders: (biz: string) => rd<GBuilder[]>(k(biz, 'builders'), []),
  saveBuilders: async (biz: string, l: GBuilder[]) => {
    await AsyncStorage.setItem(k(biz, 'builders'), JSON.stringify(l));
    try {
      const st = await goodiesApi.getStore(biz), sid = st.demoStoreId || biz, raw = JSON.parse((await AsyncStorage.getItem('goodies-byo-v4')) || 'null') || { cfg: {}, store: {}, drafts: {} };
      raw.cfg = raw.cfg || {}; raw.cfg[sid] = l; await AsyncStorage.setItem('goodies-byo-v4', JSON.stringify(raw));
    } catch { /* demo bridge only */ }
  },
  listRequests: (biz: string) => rd<GRequest[]>(k(biz, 'requests'), []),
  saveRequests: (biz: string, l: GRequest[]) => AsyncStorage.setItem(k(biz, 'requests'), JSON.stringify(l)),
  library: async () => {
    try {
      const remote = await fetchPublishedWantissContent('en');
      const record = remote.content.find(x => x.content_key === 'goodies.library' || x.content_key === 'goodies.vendor.library');
      const payload = record?.payload as { items?: { id: string; b: 'burger' | 'pizza'; n: string; hasArt?: boolean }[] } | undefined;
      return Array.isArray(payload?.items) ? payload.items : [];
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
  if (!b.name.trim()) e.push('Give the builder a name');
  if (!(parseFloat(b.base) >= 0)) e.push('Base price must be 0 or more');
  if (!b.sizes.length) e.push('Add at least one size');
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
  return (
    <View style={s.cardFlat}><Divided>
      {R('Store setup', 'Category, minimum order, delivery fee, time and publishing', 'goodiesStore')}
      {R('Products', 'Items, prices and stock customers can buy', 'goodiesProducts')}
      {R('Builders', 'Pizza, burger and custom builders for your store', 'goodiesBuilders')}
      {R('Ingredient requests', 'Ask the platform to add a new ingredient', 'goodiesRequests')}
    </Divided></View>
  );
}

/* ---------- store setup ---------- */
const LANGS: [string, string][] = [['fr', 'Français'], ['ht', 'Kreyòl ayisyen'], ['es', 'Español'], ['zh-Hans', '简体中文']];
export function GoodiesStorePage() {
  const app = useApp(), s = useS(), t = useTheme();
  const [f, setF] = useState<GStore | null>(null), [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const load = () => { setLoadErr(''); goodiesApi.getStore(app.biz.id).then(setF).catch(e => setLoadErr(errText(e))); };
  useEffect(load, [app.biz.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (loadErr) return <Pg title="Store setup" onBack={app.back}><ErrBox e={loadErr} retry={load} /></Pg>;
  if (!f) return <Pg title="Store setup" onBack={app.back}><Skel h={90} /><Skel h={200} /></Pg>;
  const set = (p: Partial<GStore>) => setF({ ...f, ...p });
  const err = (): string => {
    if (!f.category) return 'Choose a store category';
    if (!(parseFloat(f.minOrder) >= 0)) return 'Minimum order must be 0 or more';
    if (!(parseFloat(f.fee) >= 0)) return 'Delivery fee must be 0 or more (use 0 for free delivery)';
    if (!(parseInt(f.etaMin, 10) > 0) || !(parseInt(f.etaMax, 10) >= parseInt(f.etaMin, 10))) return 'Enter a delivery time range, for example 20 to 35 minutes';
    if (!f.delivery && !f.pickup) return 'Keep delivery or pickup on';
    if (ALC.test(f.promo)) return 'Alcohol ads and promotions are prohibited on Wantiss';
    return '';
  };
  const save = async () => { const e = err(); if (e) return app.toast(e); setBusy(true); try { await goodiesApi.saveStore(app.biz.id, f); app.toast('Store saved'); app.bump(); } catch (x) { app.toast(errText(x)); } finally { setBusy(false); } };
  return (
    <Pg title="Store setup" onBack={app.back}>
      <GoLiveCard />
      <Section title="Store category" />
      <Text style={s.mut}>Pick the category customers will find you under. Categories are set by Wantiss and cannot be created here.</Text>
      <Chips items={CATEGORY_PRESETS.map(c => ({ k: c.id, l: c.name }))} value={f.category} onChange={(v: string) => set({ category: v })} />
      {f.category === 'drugstore' ? <View style={s.card}><Text style={s.title}>Pharmacy licence required</Text><Text style={s.mut}>Drugstore stores must upload a pharmacy licence during registration. Only over-the-counter products are allowed.</Text></View> : null}
      <Field label="Store type shown under your name (for example Haitian restaurant)" value={f.kind} onChangeText={(v: string) => set({ kind: v })} />
      <Section title="Orders" />
      <Field label="Minimum order ($)" keyboardType="decimal-pad" value={f.minOrder} onChangeText={(v: string) => set({ minOrder: v })} />
      <Field label="Delivery fee ($, 0 = free)" keyboardType="decimal-pad" value={f.fee} onChangeText={(v: string) => set({ fee: v })} />
      <View style={s.row}><View style={s.g}><Field label="Fastest (min)" keyboardType="number-pad" value={f.etaMin} onChangeText={(v: string) => set({ etaMin: v })} /></View><View style={s.g}><Field label="Slowest (min)" keyboardType="number-pad" value={f.etaMax} onChangeText={(v: string) => set({ etaMax: v })} /></View></View>
      <View style={[s.row, { marginTop: 12 }]}><Text style={[s.title, s.g]}>Delivery</Text><Toggle value={f.delivery} onValueChange={(v: boolean) => set({ delivery: v })} /></View>
      <View style={[s.row, { marginTop: 8 }]}><Text style={[s.title, s.g]}>Pickup</Text><Toggle value={f.pickup} onValueChange={(v: boolean) => set({ pickup: v })} /></View>
      <Field label="Promotion line on your card (optional)" value={f.promo} onChangeText={(v: string) => set({ promo: v })} />
      <Text style={s.mut}>Alcohol cannot be advertised or promoted.</Text>
      <Section title="Store name in other languages (optional)" />
      <Text style={s.mut}>Your name is shown as you entered it. Add translations if you want customers to see them in their language.</Text>
      {LANGS.map(([c, n]) => <Field key={c} label={n} value={f.names[c] || ''} onChangeText={(v: string) => set({ names: { ...f.names, [c]: v } })} />)}
      <View style={{ height: 14 }} /><Btn label="Save store" onPress={save} busy={busy} />
      <Text style={[s.mut, { marginTop: 8 }]}>Logo, hours and address are in Business information. Your business is your store, so there is nothing to link.</Text>
    </Pg>
  );
}

/* ---------- publish / unpublish ---------- */
function GoLiveCard() {
  const app = useApp(), s = useS();
  const st = useQ(() => goodiesApi.getLive(app.biz.id), [app.biz.id, app.tick]);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const live = !!st.d?.live, ver = st.d?.verification || 'pending';
  const toggle = async () => {
    setBusy(true); setErr('');
    try { const now = await goodiesApi.setLive(app.biz.id, !live); app.toast(now ? 'Your store is live' : 'Your store is unpublished'); st.reload(); }
    catch (e) { const m = errText(e); setErr(m); app.toast(m); }
    finally { setBusy(false); }
  };
  if (st.e && !st.d) return <ErrBox e={st.e} retry={st.reload} />;
  return (
    <View style={s.card}>
      <View style={s.row}><Text style={[s.title, s.g]}>Store status</Text>{st.d ? <Pill tone={live ? 'good' : 'mute'}>{live ? 'Live' : 'Not live'}</Pill> : null}</View>
      <View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>Business verification</Text><Pill tone={STATUS_UI[ver]?.tone || 'warn'}>{STATUS_UI[ver]?.label || String(ver)}</Pill></View>
      <Text style={[s.mut, { marginTop: 8 }]}>{live ? 'Customers can see your store and order from it. Unpublish to pause orders.' : 'Customers cannot see your store yet. Wantiss must verify your business first, and you need a category, opening hours and at least one product in stock.'}</Text>
      {err ? <Text style={[s.mut, { marginTop: 8 }]}>{err}</Text> : null}
      <View style={{ height: 10 }} /><Btn label={live ? 'Unpublish store' : 'Go live'} kind={live ? 'soft' : 'primary'} busy={busy} disabled={!st.d} onPress={toggle} />
    </View>
  );
}

/* ---------- products ---------- */
const RESTRICTIONS: { k: GProduct['restriction']; l: string }[] = [{ k: 'none', l: 'No restriction' }, { k: 'otc', l: 'Over the counter' }, { k: 'alcohol', l: 'Alcohol' }];
const BLANK: GProduct = { id: '', name: '', description: '', price: 0, emoji: '🛍️', stock: 0, available: true, restriction: 'none' };
const dollars = (n: number) => '$' + n.toFixed(2);
function ProductSheet({ product, onClose, onSaved }: { product: GProduct; onClose: () => void; onSaved: () => void }) {
  const app = useApp(), s = useS();
  const [f, setF] = useState({ name: product.name, description: product.description, price: product.id ? String(product.price) : '', stock: String(product.stock), emoji: product.emoji, restriction: product.restriction });
  const [busy, setBusy] = useState(false);
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
    try { await goodiesApi.saveProduct(app.biz.id, { id: product.id || undefined, name: f.name, description: f.description, price: parseFloat(f.price), stock: Number(f.stock), emoji: f.emoji, restriction: f.restriction }); app.toast(product.id ? 'Product saved' : 'Product added'); onSaved(); }
    catch (x) { app.toast(errText(x)); }
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
          <Field label="Name" value={f.name} onChangeText={(v: string) => setF({ ...f, name: v })} />
          <View style={s.row}><View style={s.g}><Field label="Price ($)" keyboardType="decimal-pad" value={f.price} onChangeText={(v: string) => setF({ ...f, price: v })} /></View><View style={s.g}><Field label="In stock" keyboardType="number-pad" value={f.stock} onChangeText={(v: string) => setF({ ...f, stock: v.replace(/\D/g, '') })} /></View></View>
          <Field label="Emoji" value={f.emoji} onChangeText={(v: string) => setF({ ...f, emoji: v })} />
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
  const app = useApp(), s = useS(), t = useTheme();
  const lst = useQ(() => goodiesApi.listProducts(app.biz.id), [app.biz.id, app.tick]);
  const [edit, setEdit] = useState<GProduct | null>(null);
  const items = lst.d ?? [];
  const toggle = async (p: GProduct, v: boolean) => { try { await goodiesApi.saveProduct(app.biz.id, { id: p.id, available: v }); lst.reload(); } catch (e) { app.toast(errText(e)); } };
  return (
    <Pg title="Products" onBack={app.back} refreshing={lst.l && !!lst.d} onRefresh={lst.reload}>
      <Text style={s.mut}>Set the price and how many you have. Stock goes down when customers order and back up if an order is cancelled. Customers only see available products while your store is live.</Text>
      <Btn label="+ Add product" onPress={() => setEdit(BLANK)} />
      {lst.e && !lst.d ? <ErrBox e={lst.e} retry={lst.reload} /> : lst.l && !lst.d ? <Skel h={120} /> : items.length ? (
        <View style={s.cardFlat}><Divided>{items.map(p => (
          <Row key={p.id} left={<Text style={{ fontSize: 26, marginRight: 4 }}>{p.emoji}</Text>} title={p.name} sub={`${dollars(p.price)} · ${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}${p.restriction !== 'none' ? ' · ' + (p.restriction === 'alcohol' ? 'Alcohol' : 'Over the counter') : ''}`}
            onPress={() => setEdit(p)} right={<Toggle value={p.available} onValueChange={(v: boolean) => toggle(p, v)} />} />
        ))}</Divided></View>
      ) : <View style={s.cardFlat}><Empty icon="package-variant-closed" title="No products yet" hint="Add your first product. You need at least one in stock to go live." cta="Add product" onCta={() => setEdit(BLANK)} /></View>}
      <GoLiveCard />
      {edit ? <ProductSheet product={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); lst.reload(); }} /> : null}
    </Pg>
  );
}

/* ---------- builders list ---------- */
export function GoodiesBuildersPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const [list, setList] = useState<GBuilder[]>([]);
  const load = () => goodiesApi.listBuilders(app.biz.id).then(setList);
  useEffect(() => { load(); }, [app.biz.id, app.tick]);
  const persist = async (l: GBuilder[]) => { setList(l); await goodiesApi.saveBuilders(app.biz.id, l); };
  const add = async (type: 'pizza' | 'burger' | 'custom') => { const b = newBuilder(type); await persist([...list, b]); app.go('goodiesBuilder', { id: b.id }); };
  const del = (b: GBuilder) => persist(list.filter(x => x.id !== b.id)).then(() => app.toast('Builder deleted'));
  return (
    <Pg title="Builders" onBack={app.back}>
      <Text style={s.mut}>Customers build their own pizza, burger or custom order from these. Ingredients come from the Wantiss library. You choose which to offer, the price and how many a customer may pick.</Text>
      {list.length === 0 ? <View style={s.card}><Text style={s.title}>No builders yet</Text><Text style={s.mut}>Start from a template and change it.</Text></View> : null}
      {list.map(b => (
        <View key={b.id} style={s.card}>
          <View style={s.row}><Text style={{ fontSize: 28 }}>{b.emoji}</Text><View style={s.g}><Text style={s.title}>{b.name}</Text><Text style={s.mut}>{b.type} · {b.groups.length} groups · {b.groups.reduce((a, g) => a + g.items.length, 0)} ingredients</Text></View>{b.enabled ? <Pill tone="good">On</Pill> : <Pill tone="mute">Off</Pill>}</View>
          <View style={[s.row, { marginTop: 10 }]}><Text style={[s.mut, s.g]}>Offered to customers</Text><Toggle value={b.enabled} onValueChange={(v: boolean) => persist(list.map(x => (x.id === b.id ? { ...x, enabled: v } : x)))} /></View>
          <View style={[s.row, { marginTop: 8 }]}><Text style={[s.mut, s.g]}>Available right now</Text><Toggle value={b.available} onValueChange={(v: boolean) => persist(list.map(x => (x.id === b.id ? { ...x, available: v } : x)))} /></View>
          <View style={[s.row, { marginTop: 12 }]}><View style={s.g}><Btn small kind="soft" label="Edit" onPress={() => app.go('goodiesBuilder', { id: b.id })} /></View><View style={s.g}><Btn small kind="soft" label="Delete" onPress={() => del(b)} /></View></View>
        </View>
      ))}
      <Section title="Add a builder" />
      <View style={s.row}><View style={s.g}><Btn small label="🍕 Pizza" onPress={() => add('pizza')} /></View><View style={s.g}><Btn small label="🍔 Burger" onPress={() => add('burger')} /></View><View style={s.g}><Btn small label="✨ Custom" onPress={() => add('custom')} /></View></View>
      <View style={{ height: 14 }} /><Btn kind="soft" label="Request a new ingredient" onPress={() => app.go('goodiesRequests')} />
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
        <SheetShell title="Choose from the Wantiss library" onClose={onClose} tall>
          <Field label="Search" value={q} onChangeText={setQ} />
          <ScrollView style={{ maxHeight: 380 }}>
            {list.map(l => <Row key={l.id} title={l.n} sub={l.id} onPress={() => onPick(l.id, l.n)} right={<Icon name="plus" size={18} color={t.mute} />} />)}
            {!list.length ? <Text style={s.mut}>Nothing matches. You can request a new ingredient from the Builders page.</Text> : null}
          </ScrollView>
        </SheetShell>
      </View>
    </Modal>
  );
}

export function GoodiesBuilderEditPage() {
  const app = useApp(), s = useS(), t = useTheme(), { id } = useArg() as { id: string };
  const [all, setAll] = useState<GBuilder[]>([]), [b, setB] = useState<GBuilder | null>(null), [pick, setPick] = useState<{ gi: number; ii: number } | null>(null), [errs, setErrs] = useState<string[]>([]);
  useEffect(() => { goodiesApi.listBuilders(app.biz.id).then(l => { setAll(l); setB(l.find(x => x.id === id) || null); }); }, [id]);
  if (!b) return <Pg title="Builder" onBack={app.back}><Text style={s.mut}>Builder not found.</Text></Pg>;
  const up = (p: Partial<GBuilder>) => setB({ ...b, ...p });
  const upG = (gi: number, p: Partial<GGroup>) => up({ groups: b.groups.map((g, i) => (i === gi ? { ...g, ...p } : g)) });
  const upI = (gi: number, ii: number, p: Partial<GItem>) => upG(gi, { items: b.groups[gi].items.map((x, i) => (i === ii ? { ...x, ...p } : x)) });
  const move = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const c = a.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; };
  const save = async () => {
    const e = validateBuilder(b); setErrs(e);
    if (e.length) return app.toast(e[0]);
    await goodiesApi.saveBuilders(app.biz.id, all.map(x => (x.id === b.id ? b : x)));
    app.toast('Builder saved'); app.bump(); app.back();
  };
  const num = (v: string) => parseInt(v.replace(/\D/g, '') || '0', 10);
  return (
    <Pg title={b.name || 'Builder'} onBack={app.back}>
      <Section title="Basics" />
      <Field label="Name" value={b.name} onChangeText={(v: string) => up({ name: v })} />
      <Field label="Description" value={b.desc} onChangeText={(v: string) => up({ desc: v })} multiline />
      <Field label="Emoji" value={b.emoji} onChangeText={(v: string) => up({ emoji: v })} />
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

      <Section title="Groups and ingredients" right="Add group" onRight={() => up({ groups: [...b.groups, { id: uid(), name: '', kind: 'many', req: false, min: 0, max: 1, inc: 0, me: 1, items: [] }] })} />
      <Text style={s.mut}>Set the limit on the whole group, on individual ingredients, or both.</Text>
      {b.groups.map((g, gi) => (
        <View key={g.id} style={s.card}>
          <Field label="Group name (for example Crust, Toppings)" value={g.name} onChangeText={(v: string) => upG(gi, { name: v })} />
          <View style={{ height: 8 }} /><Seg items={['Pick one', 'Pick several']} value={g.kind === 'one' ? 'Pick one' : 'Pick several'} onChange={(v: string) => upG(gi, v === 'Pick one' ? { kind: 'one', min: g.req ? 1 : 0, max: 1, inc: 0, me: 1 } : { kind: 'many' })} />
          <View style={[s.row, { marginTop: 10 }]}><Text style={[s.title, s.g]}>Required</Text><Toggle value={g.req} onValueChange={(v: boolean) => upG(gi, { req: v, min: g.kind === 'one' ? (v ? 1 : 0) : g.min })} /></View>
          {g.kind === 'many' ? (<>
            <View style={s.row}><View style={s.g}><Field label="Min picks" keyboardType="number-pad" value={String(g.min)} onChangeText={(v: string) => upG(gi, { min: num(v) })} /></View><View style={s.g}><Field label="Max picks" keyboardType="number-pad" value={String(g.max)} onChangeText={(v: string) => upG(gi, { max: num(v) })} /></View></View>
            <View style={s.row}><View style={s.g}><Field label="Included free" keyboardType="number-pad" value={String(g.inc)} onChangeText={(v: string) => upG(gi, { inc: num(v) })} /></View><View style={s.g}><Field label="Max of the same" keyboardType="number-pad" value={String(g.me)} onChangeText={(v: string) => upG(gi, { me: num(v) })} /></View></View>
          </>) : null}
          <Text style={[s.title, { marginTop: 12 }]}>Ingredients</Text>
          {g.items.map((it, ii) => (
            <View key={it.id} style={[s.card, { backgroundColor: t.bg }]}>
              <Field label="Name" value={it.name} onChangeText={(v: string) => upI(gi, ii, { name: v })} />
              <View style={s.row}><View style={s.g}><Field label="Price ($)" keyboardType="decimal-pad" editable={!it.free} value={it.free ? '0' : String(it.price)} onChangeText={(v: string) => upI(gi, ii, { price: parseFloat(v) || 0 })} /></View>
                <View style={s.g}><Field label="Max per customer (optional)" keyboardType="number-pad" value={it.max ? String(it.max) : ''} onChangeText={(v: string) => upI(gi, ii, { max: v ? num(v) : undefined })} /></View></View>
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
      <View style={{ height: 14 }} /><Btn label="Save builder" onPress={save} />
      {pick && b.type !== 'custom' ? <LibraryPicker type={b.type} onClose={() => setPick(null)} onPick={(aid, nm) => { const it = b.groups[pick.gi].items[pick.ii]; upI(pick.gi, pick.ii, { assetId: aid, name: it.name || nm }); setPick(null); }} /> : null}
    </Pg>
  );
}

/* ---------- ingredient requests ---------- */
export function GoodiesRequestsPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const [list, setList] = useState<GRequest[]>([]), [open, setOpen] = useState(false);
  const [f, setF] = useState<{ name: string; builder: 'pizza' | 'burger'; role: string; note: string }>({ name: '', builder: 'burger', role: '', note: '' });
  useEffect(() => { goodiesApi.listRequests(app.biz.id).then(setList); }, [app.biz.id]);
  const send = async () => {
    if (f.name.trim().length < 2) return app.toast('Enter the ingredient name');
    const r: GRequest = { id: uid(), name: f.name.trim(), builder: f.builder, role: f.role.trim(), note: f.note.trim(), status: 'submitted', at: Date.now() };
    const l = [r, ...list]; setList(l); await goodiesApi.saveRequests(app.biz.id, l); setOpen(false); setF({ name: '', builder: 'burger', role: '', note: '' }); app.toast('Request sent to Wantiss');
  };
  const tone = (st: string): any => (st === 'approved' ? 'good' : st === 'denied' ? 'bad' : 'warn');
  const label: Record<string, string> = { submitted: 'Waiting', approved: 'Approved', denied: 'Not approved', needs_info: 'Needs info' };
  return (
    <Pg title="Ingredient requests" onBack={app.back} right={undefined}>
      <Text style={s.mut}>You cannot upload ingredients yourself. Send a request and the Wantiss team will approve or decline it. If approved, it appears in your library and you decide whether to show it, its price and how many a customer can pick.</Text>
      <View style={{ height: 10 }} /><Btn label="Request an ingredient" onPress={() => setOpen(true)} />
      <Section title="Your requests" />
      {list.length === 0 ? <Text style={s.mut}>No requests yet.</Text> : <View style={s.cardFlat}><Divided>{list.map(r => <Row key={r.id} title={r.name} sub={`${r.builder}${r.role ? ' · ' + r.role : ''}`} right={<Pill tone={tone(r.status)}>{label[r.status]}</Pill>} />)}</Divided></View>}
      {open ? (
        <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
            <SheetShell title="Request an ingredient" onClose={() => setOpen(false)} tall>
              <Field label="Ingredient name" value={f.name} onChangeText={(v: string) => setF({ ...f, name: v })} />
              <Text style={s.label}>For which builder</Text>
              <Chips items={[{ k: 'burger', l: 'Burger' }, { k: 'pizza', l: 'Pizza' }]} value={f.builder} onChange={(v: any) => setF({ ...f, builder: v })} />
              <Field label="What is it (topping, sauce, bun, patty…)" value={f.role} onChangeText={(v: string) => setF({ ...f, role: v })} />
              <Field label="Notes for the team" value={f.note} onChangeText={(v: string) => setF({ ...f, note: v })} multiline />
              <View style={{ height: 12 }} /><Btn label="Send request" onPress={send} />
            </SheetShell>
          </View>
        </Modal>
      ) : null}
    </Pg>
  );
}
