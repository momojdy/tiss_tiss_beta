import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, Pressable, Image } from 'react-native';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import {GOODIES_DELIVERY_PROOF_BUCKET} from '../../services/goodiesDeliveryProof';
import { useApp, useQ, Pg, Skel, ErrBox, Empty, Btn, Field, SheetShell, Pill } from './BusinessSpaceShared';

type GoodiesOrder = {
  id: string; order_code: string; status: string; created_at: string; acceptance_deadline_at: string | null; payment_method?: string | null; payment_status?: string | null; payment_refunded_amount?: number | null; courier_id?: string | null;
  scheduled_for: string | null; order_type: string; items: any[]; total: number; subtotal: number; discount: number;
  commissionable_subtotal: number; platform_commission_rate: number; platform_commission_amount: number; vendor_net_amount: number;
  notes: string | null; address?: Record<string, any> | null; contact_phone?: string | null;
  ready_at?: string | null; updated_at?: string | null; self_delivery?: boolean | null; self_driver_name?: string | null; self_driver_phone?: string | null;
  vendor_delivered_at?: string | null; receipt_deadline_at?: string | null; delivery_proof_url?: string | null; delivery_dispute_status?: string | null;
};
const reasons = [
  { id: 'out_of_stock', label: 'Item unavailable' },
  { id: 'too_busy', label: 'Too busy to prepare' },
  { id: 'fulfilment_unavailable', label: 'Cannot fulfil this order' },
  { id: 'delivery_unavailable', label: 'Delivery unavailable' },
  { id: 'timing_unavailable', label: 'Timing unavailable' },
  { id: 'other', label: 'Other' },
];
const fmt = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const remaining = (deadline: string | null, now: number) => {
  if (!deadline) return '15-minute response required';
  const sec = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  return sec ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' left to respond' : 'Response deadline passed';
};

export function GoodiesOrdersPage() {
  const app = useApp();
  const [decline, setDecline] = useState<GoodiesOrder | null>(null);
  const [cancel, setCancel] = useState<GoodiesOrder | null>(null);
  const [reason, setReason] = useState('out_of_stock');
  const [detail, setDetail] = useState('');
  const [busyId, setBusyId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [storeId, setStoreId] = useState('');
  const [cashEnabled, setCashEnabled] = useState(false);
  const [cashBusy, setCashBusy] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<GoodiesOrder | null>(null);
  const [ownDriverOrder, setOwnDriverOrder] = useState<GoodiesOrder | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [ownBusy, setOwnBusy] = useState('');
  const OWN_DRIVER_WAIT_MS = 20 * 60 * 1000;
  const ownDriverReadyAt = (order: GoodiesOrder) => new Date(order.ready_at || order.updated_at || order.created_at).getTime();
  const ownDriverWaitLeft = (order: GoodiesOrder) => Math.max(0, ownDriverReadyAt(order) + OWN_DRIVER_WAIT_MS - now);
  const canUseOwnDriver = (order: GoodiesOrder) => order.order_type === 'delivery' && (order.status === 'ready' || order.status === 'courier_assigned') && !['accepted', 'picked_up'].includes(assignmentStates[order.id] || '');
  const submitOwnDriver = async () => {
    if (!ownDriverOrder) return;
    setOwnBusy('assign');
    const {error} = await supabase.rpc('goodies_assign_own_driver', {p_order_id: ownDriverOrder.id, p_driver_name: driverName, p_driver_phone: driverPhone});
    setOwnBusy('');
    if (error) { console.warn('Own driver assignment failed', error.message); app.toast(/20 minutes|name|phone|accepted|ready/i.test(error.message) ? error.message : 'Could not assign your driver. Please try again.'); return; }
    app.toast('Your driver is assigned. Mark the order delivered with a photo once it arrives.');
    setOwnDriverOrder(null); setDriverName(''); setDriverPhone(''); await orders.reload();
  };
  const markOwnDelivered = async (order: GoodiesOrder) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      let result: ImagePicker.ImagePickerResult;
      if (perm.granted) result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      else {
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!lib.granted) { app.toast('Allow camera or photo access to add the delivery photo.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      }
      if (result.canceled || !result.assets?.[0]) return;
      setOwnBusy(order.id);
      const asset = result.assets[0];
      const m = await ImageManipulator.manipulateAsync(asset.uri, asset.width && asset.width > 1400 ? [{ resize: { width: 1400 } }] : [], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
      const b64 = await FileSystem.readAsStringAsync(m.uri, { encoding: FileSystem.EncodingType.Base64 });
      const path = app.biz.id + '/' + order.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg';
      const {error: uploadError} = await supabase.storage.from(GOODIES_DELIVERY_PROOF_BUCKET).upload(path, decode(b64), { contentType: 'image/jpeg', cacheControl: '300' });
      if (uploadError) throw uploadError;
      const {error} = await supabase.rpc('goodies_self_delivery_mark_delivered', {p_order_id: order.id, p_proof_url: path});
      if (error) throw error;
      app.toast('Marked as delivered. The customer has 24 hours to confirm or report a problem.');
      await orders.reload();
    } catch (e: any) {
      console.warn('Delivery proof failed', e?.message);
      app.toast('Could not save the delivery photo. Please try again.');
    } finally { setOwnBusy(''); }
  };
  const [couriers, setCouriers] = useState<any[]>([]);
  const [dispatchBusy, setDispatchBusy] = useState('');
  const [assignmentStates, setAssignmentStates] = useState<Record<string,string>>({});
  const [productPhotos, setProductPhotos] = useState<Record<string,string>>({});
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const orders = useQ(async () => {
    const { data, error } = await supabase.from('goodies_orders')
      .select('id,order_code,status,created_at,acceptance_deadline_at,scheduled_for,order_type,items,total,subtotal,discount,commissionable_subtotal,platform_commission_rate,platform_commission_amount,vendor_net_amount,notes,address,contact_phone,payment_method,payment_status,payment_refunded_amount,courier_id,ready_at,updated_at,self_delivery,self_driver_name,self_driver_phone,vendor_delivered_at,receipt_deadline_at,delivery_proof_url,delivery_dispute_status')
      .eq('business_id', app.biz.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return (data || []) as GoodiesOrder[];
  }, [app.biz.id, app.tick]);

  useEffect(() => {
    const orderIds=(orders.d||[]).filter(o=>o.order_type==='delivery').map(o=>o.id);
    if(!orderIds.length){setAssignmentStates({});return;}
    let active=true;
    const sync=async()=>{
      const {data,error}=await supabase.from('goodies_delivery_assignments')
        .select('order_id,status').eq('business_id',app.biz.id).in('order_id',orderIds);
      if(active&&!error)setAssignmentStates(Object.fromEntries((data||[]).map((a:any)=>[a.order_id,a.status])));
    };
    void sync();
    const channel=supabase.channel('goodies-vendor-delivery-assignments-'+app.biz.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_delivery_assignments',filter:'business_id=eq.'+app.biz.id},()=>{void sync();})
      .subscribe();
    return()=>{active=false;void supabase.removeChannel(channel);};
  },[app.biz.id,orders.d]);
  const pending = useMemo(() => (orders.d || []).filter(o => o.status === 'placed'), [orders.d]);
  useEffect(() => {
    const ids = [...new Set((orders.d || []).flatMap(order => (Array.isArray(order.items) ? order.items : []).map((item: any) => String(item?.id || '')).filter(Boolean)))];
    if (!ids.length) { setProductPhotos({}); return; }
    let active = true;
    void supabase.from('goodies_products').select('id,photo_url,photo_urls').eq('business_id', app.biz.id).in('id', ids)
      .then(({data,error}) => {
        if (!active || error) return;
        setProductPhotos(Object.fromEntries((data || []).map((product: any) => [String(product.id), (Array.isArray(product.photo_urls) ? product.photo_urls[0] : null) || product.photo_url || '']).filter((entry: any) => !!entry[1])));
      });
    return () => { active = false; };
  }, [app.biz.id, orders.d]);
  useEffect(() => {
    let active = true;
    void supabase.from('goodies_store_schedules').select('store_id,accept_cash_on_delivery').eq('business_id', app.biz.id).maybeSingle()
      .then(({data,error}) => { if (active && !error && data) { setStoreId(data.store_id); setCashEnabled(!!data.accept_cash_on_delivery); } });
    return () => { active = false; };
  }, [app.biz.id]);
  const toggleCash = async () => {
    if (!storeId || cashBusy) return;
    setCashBusy(true);
    try {
      const next = !cashEnabled;
      const {error} = await supabase.rpc('goodies_set_store_cash_policy', {p_store_id:storeId,p_enabled:next});
      if (error) throw error;
      setCashEnabled(next);
      app.toast(next ? 'Cash on delivery enabled. It is still shown only when an available courier accepts COD.' : 'Cash on delivery disabled.');
    } catch (e:any) { app.toast(e?.message || 'Could not update cash-on-delivery settings.'); }
    finally { setCashBusy(false); }
  };
  const openDispatch = async (order: GoodiesOrder) => {
    setDispatchOrder(order); setCouriers([]); setDispatchBusy('loading');
    const {data,error} = await supabase.rpc('goodies_list_dispatch_couriers',{p_order_id:order.id});
    setDispatchBusy('');
    if (error) { app.toast(error.message); setDispatchOrder(null); return; }
    setCouriers(data || []);
  };
  const assignCourier = async (courierId:string) => {
    if (!dispatchOrder) return;
    setDispatchBusy(courierId);
    const {error} = await supabase.rpc('goodies_assign_courier',{p_order_id:dispatchOrder.id,p_courier_id:courierId});
    setDispatchBusy('');
    if (error) { app.toast(error.message); return; }
    app.toast('Courier offer sent. The courier must accept before pickup.');
    setDispatchOrder(null); await orders.reload();
  };
  const refundAttempts = useRef(new Set<string>());
  useEffect(() => {
    for (const order of orders.d || []) {
      if (!['declined', 'expired', 'cancelled'].includes(order.status) ||
          order.payment_method !== 'card' || !['paid', 'refund_pending', 'partially_refunded'].includes(String(order.payment_status || '')) ||
          refundAttempts.current.has(order.id)) continue;
      refundAttempts.current.add(order.id);
      void supabase.functions.invoke('refund-goodies-card-order', { body: { order_id: order.id } })
        .then(result => {
          if (result.error || result.data?.error) refundAttempts.current.delete(order.id);
          else void orders.reload();
        })
        .catch(() => refundAttempts.current.delete(order.id));
    }
  }, [orders.d]);
  useEffect(() => {
    const channel = supabase.channel('goodies-vendor-orders-' + app.biz.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goodies_orders', filter: 'business_id=eq.' + app.biz.id }, () => { void orders.reload(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [app.biz.id]);
  const act = async (order: GoodiesOrder, action: 'accept' | 'decline' | 'cancel' | 'preparing' | 'ready' | 'completed') => {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const { error } = action === 'accept'
        ? await supabase.rpc('accept_goodies_order', { p_order_id: order.id })
        : action === 'decline'
          ? await supabase.rpc('decline_goodies_order', { p_order_id: order.id, p_reason_code: reason, p_reason_detail: reason === 'other' ? detail.trim() : (detail.trim() || null) })
          : action === 'cancel'
            ? await supabase.rpc('cancel_goodies_order_by_store', { p_order_id: order.id, p_reason_code: reason, p_reason_detail: reason === 'other' ? detail.trim() : (detail.trim() || null) })
            : await supabase.rpc('set_goodies_order_status', { p_order_id: order.id, p_status: action });
      if (error) throw error;
      setDecline(null); setCancel(null); setDetail('');
      let refundWarning = '';
      if (action === 'decline' && order.payment_method === 'card' && ['paid', 'refund_pending', 'partially_refunded'].includes(String(order.payment_status || ''))) {
        const refund = await supabase.functions.invoke('refund-goodies-card-order', { body: { order_id: order.id } });
        if (refund.error || refund.data?.error) refundWarning = ' Card refund is pending and may need support follow-up.';
      }
      app.toast(action === 'accept' ? 'Order accepted' : action === 'decline' ? 'Order declined. Customer notified.' + refundWarning : action === 'cancel' ? 'Order cancelled. Customer notified.' : action === 'preparing' ? 'Order marked as preparing' : action === 'ready' ? 'Order marked ready' : 'Order completed');
      await orders.reload();
      app.bump();
    } catch (e: any) {
      app.toast(e?.message || 'Could not update this order. Refresh and try again.');
      await orders.reload();
    } finally { setBusyId(''); }
  };

  return (
    <>
      <Pg title="Goodies orders" onBack={app.back} refreshing={orders.l} onRefresh={orders.reload}>
        <View style={{ gap: 10 }}>
          <View style={{padding:14,borderRadius:14,borderWidth:1,borderColor:'#DCE4D7',backgroundColor:'#fff',gap:7}}>
            <Text style={{fontWeight:'800',fontSize:14,color:'#1A2517'}}>Cash on delivery</Text>
            <Text style={{fontSize:12,lineHeight:18,color:'#5F6B5A'}}>Wantiss Wallet is the default payment method. Cash on delivery is available when your store and an eligible courier both enable it.</Text>
            <Btn label={cashBusy ? 'Saving…' : cashEnabled ? 'Disable cash on delivery' : 'Enable cash on delivery'} busy={cashBusy} disabled={!storeId || cashBusy} onPress={() => void toggleCash()} />
          </View>
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: '#EAF4E5', gap: 4 }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#234A25' }}>{pending.length} awaiting response</Text>
            <Text style={{ fontSize: 12, lineHeight: 18, color: '#38583A' }}>Please accept or decline each new order within 15 minutes. Orders not answered in time are automatically cancelled and the items are returned to your available stock.</Text>
          </View>
          {orders.l && !orders.d ? <><Skel h={110} /><Skel h={110} /></> : null}
          {orders.e ? <ErrBox e={orders.e} retry={orders.reload} /> : null}
          {!orders.l && !orders.e && !(orders.d || []).length ? <Empty icon="receipt-text-outline" title="No Goodies orders yet" hint="New customer orders will appear here with a 15-minute response window." /> : null}
          {(orders.d || []).map(order => {
            const canRespond = order.status === 'placed' && !!order.acceptance_deadline_at && new Date(order.acceptance_deadline_at).getTime() > Date.now();
            return <View key={order.id} style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#DCE4D7', backgroundColor: '#fff', gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: '#1A2517' }}>{order.order_code}</Text>
                <Pill tone={order.status === 'placed' ? 'warn' : order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'good' : order.status === 'declined' || order.status === 'expired' ? 'bad' : 'mute'}>{order.status}</Pill>
              </View>
              <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{order.order_type === 'pickup' ? 'Pickup' : 'Delivery'} · {fmt(order.created_at)}{order.scheduled_for ? ' · Scheduled fulfilment: ' + fmt(order.scheduled_for) : ''}</Text>
              {order.payment_method === 'card' ? <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Card payment: {order.payment_status || 'unknown'}{Number(order.payment_refunded_amount) > 0 ? ' · refunded ' + money(Number(order.payment_refunded_amount)) : ''}</Text> : null}
              {order.order_type === 'delivery' ? <>
                <Text style={{ color: '#1A2517', fontSize: 13 }}>Delivery address: {String(order.address?.t || order.address?.label || order.address?.address || 'Address not provided')}</Text>
                <Text style={{ color: '#1A2517', fontSize: 13 }}>Customer phone: {String(order.contact_phone || 'Not provided')}</Text>
              </> : null}
              <View style={{gap:8}}>
                {(Array.isArray(order.items) ? order.items : []).map((item:any,index:number) => {
                  const photo = item.photo || item.photo_url || productPhotos[String(item.id || '')] || '';
                  return <View key={String(item.k || item.id || index)} style={{flexDirection:'row',alignItems:'center',gap:10}}>
                    {photo ? <Image source={{uri:String(photo)}} style={{width:52,height:52,borderRadius:10,backgroundColor:'#EEF1EB'}} resizeMode="cover" /> : <View style={{width:52,height:52,borderRadius:10,backgroundColor:'#EEF1EB',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:24}}>{item.e || '🛍️'}</Text></View>}
                    <View style={{flex:1}}><Text style={{fontSize:13,fontWeight:'700',color:'#1A2517'}}>{(item.q || 1) + '× ' + (item.n || 'Item')}</Text>{item.d ? <Text style={{fontSize:11,color:'#5F6B5A',marginTop:2}}>{item.d}</Text> : null}</View>
                    <Text style={{fontSize:12,fontWeight:'700',color:'#1A2517'}}>{money(Number(item.p || 0) * Number(item.q || 1))}</Text>
                  </View>;
                })}
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: '#E7ECE3', paddingTop: 8, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Product subtotal</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>{money(order.subtotal)}</Text>
                </View>
                {Number(order.discount) > 0 ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Discount</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>−{money(order.discount)}</Text>
                </View> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Commissionable product amount</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>{money(order.commissionable_subtotal)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Wantiss commission ({(Number(order.platform_commission_rate) * 100).toFixed(0)}%)</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>−{money(order.platform_commission_amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#1A2517', fontSize: 13, fontWeight: '800' }}>Your net product earnings</Text>
                  <Text style={{ color: '#1A2517', fontSize: 13, fontWeight: '800' }}>{money(order.vendor_net_amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 3 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Customer order total (includes excluded fees)</Text>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{money(order.total)}</Text>
                </View>
              </View>
              {order.notes ? <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Customer note: {order.notes}</Text> : null}
              {order.status === 'placed' ? <Text style={{ color: canRespond ? '#A15B13' : '#A33D3D', fontWeight: '700', fontSize: 12 }}>{remaining(order.acceptance_deadline_at, now)}</Text> : null}
              {order.status === 'courier_assigned' ? <Text style={{fontSize:12,color:'#5F6B5A'}}>{assignmentStates[order.id]==='accepted' ? 'Courier accepted the offer. Live GPS tracking starts now.' : assignmentStates[order.id]==='picked_up' ? 'Courier picked up this order.' : 'Delivery offer sent. Waiting for courier acceptance.'}</Text> : null}
              {(order.status === 'ready' || (order.status === 'courier_assigned' && (!assignmentStates[order.id] || assignmentStates[order.id]==='offered' || assignmentStates[order.id]==='declined'))) && order.order_type === 'delivery' ? <Btn label={order.courier_id ? 'Reassign courier' : 'Assign courier'} disabled={!!busyId} onPress={() => void openDispatch(order)} /> : null}
              {canUseOwnDriver(order) ? (ownDriverWaitLeft(order) > 0
                ? <Text style={{fontSize:12,color:'#5F6B5A'}}>No courier yet? You can use your own driver in {Math.ceil(ownDriverWaitLeft(order) / 60000)} min.</Text>
                : <Btn label="Use my own driver" kind="secondary" disabled={!!busyId || !!ownBusy} onPress={() => { setOwnDriverOrder(order); setDriverName(''); setDriverPhone(''); }} />) : null}
              {order.self_delivery && order.status === 'picked_up' ? <View style={{gap:6}}>
                <Text style={{fontSize:12,color:'#5F6B5A'}}>Your driver: {order.self_driver_name} · {order.self_driver_phone}</Text>
                {!order.vendor_delivered_at
                  ? <Btn label="Mark delivered with photo" busy={ownBusy === order.id} disabled={!!ownBusy} onPress={() => void markOwnDelivered(order)} />
                  : order.delivery_dispute_status === 'open'
                    ? <Text style={{fontSize:12,fontWeight:'700',color:'#A33D3D'}}>The customer reported a problem. Our team is reviewing it.</Text>
                    : <View style={{gap:6}}>{order.delivery_proof_url ? <Image source={{uri:order.delivery_proof_url}} style={{width:'100%',height:150,borderRadius:10,backgroundColor:'#F1F2EF'}} resizeMode="cover" /> : null}<Text style={{fontSize:12,color:'#5F6B5A'}}>Delivery photo saved. Waiting for the customer to confirm. It completes automatically after {new Date(order.receipt_deadline_at || '').toLocaleString()} if there is no report.</Text></View>}
              </View> : null}
              {order.status === 'accepted' || order.status === 'preparing' || (order.status === 'ready' && order.order_type === 'pickup') ? <Btn label={order.status === 'accepted' ? 'Start preparing' : order.status === 'preparing' ? 'Mark ready' : 'Complete order'} busy={busyId === order.id} disabled={!!busyId} onPress={() => void act(order, order.status === 'accepted' ? 'preparing' : order.status === 'preparing' ? 'ready' : 'completed')} /> : null}
              {canRespond ? <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Btn label="Accept order" onPress={() => void act(order, 'accept')} busy={busyId === order.id} /></View>
                <View style={{ flex: 1 }}><Btn label="Decline" kind="danger" disabled={!!busyId} onPress={() => { setDecline(order); setCancel(null); setReason('out_of_stock'); setDetail(''); }} /></View>
              </View> : null}
              {['scheduled','placed','accepted','preparing'].includes(order.status) ? <Btn label="Cancel order" kind="danger" disabled={!!busyId} onPress={() => { setCancel(order); setDecline(null); setReason('out_of_stock'); setDetail(''); }} /> : null}
            </View>;
          })}
        </View>
      </Pg>
      {ownDriverOrder ? <SheetShell title={'Your own driver · ' + ownDriverOrder.order_code} onClose={() => { if (!ownBusy) setOwnDriverOrder(null); }}>
        <Text style={{color:'#5F6B5A',fontSize:13,lineHeight:19,marginBottom:10}}>Live tracking is not available for your own driver. Add a delivery photo when the order arrives.</Text>
        <Field label="Driver name" value={driverName} onChangeText={setDriverName} autoCapitalize="words" />
        <View style={{height:10}} />
        <Field label="Driver phone" value={driverPhone} onChangeText={setDriverPhone} keyboardType="phone-pad" />
        <View style={{height:14}} />
        <Btn label="Assign my driver" busy={ownBusy === 'assign'} disabled={!!ownBusy || driverName.trim().length < 2 || driverPhone.replace(/\D/g, '').length < 7} onPress={() => void submitOwnDriver()} />
      </SheetShell> : null}
      {dispatchOrder ? <SheetShell title={'Assign courier · ' + dispatchOrder.order_code} tall onClose={() => { if (!dispatchBusy) setDispatchOrder(null); }}>
        <Text style={{color:'#5F6B5A',fontSize:13,lineHeight:19,marginBottom:10}}>Only couriers currently online are listed. Cash orders are offered only to couriers who explicitly accept cash on delivery.</Text>
        {dispatchBusy === 'loading' ? <Text>Loading available couriers…</Text> : null}
        {!dispatchBusy && !couriers.length ? <Empty title="No eligible couriers online" hint="Try again when a courier is available and has enabled the required payment preference." /> : null}
        {couriers.map((courier:any) => <View key={courier.courier_id} style={{padding:12,borderWidth:1,borderColor:'#DCE4D7',borderRadius:12,marginBottom:8,gap:5}}>
          <Text style={{fontWeight:'800',color:'#1A2517'}}>{courier.full_name || 'Courier'}</Text>
          <Text style={{fontSize:12,color:'#5F6B5A'}}>{courier.phone_number || 'No phone'} · {courier.accepts_cash_on_delivery ? 'Accepts cash' : 'Wallet/card only'} · {courier.distance_km == null ? 'Distance unavailable' : Number(courier.distance_km).toFixed(1) + ' km away'}</Text>
          <Btn label="Send delivery offer" busy={dispatchBusy === courier.courier_id} disabled={!!dispatchBusy} onPress={() => void assignCourier(courier.courier_id)} />
        </View>)}
      </SheetShell> : null}
      {decline ? <SheetShell title={'Decline ' + decline.order_code} tall onClose={() => { if (!busyId) setDecline(null); }}>
        <Text style={{ color: '#5F6B5A', fontSize: 13, lineHeight: 19, marginBottom: 10 }}>Choose a reason. The customer will receive a clear, respectful explanation; your private note is not shared verbatim.</Text>
        <View style={{ gap: 8 }}>
          {reasons.map(item => <Pressable key={item.id} onPress={() => setReason(item.id)} style={{ borderWidth: 1, borderColor: reason === item.id ? '#3F6B37' : '#D6DDD2', borderRadius: 12, padding: 12, backgroundColor: reason === item.id ? '#EAF4E5' : '#fff' }}>
            <Text style={{ color: '#1A2517', fontWeight: reason === item.id ? '800' : '600' }}>{reason === item.id ? '●  ' : '○  '}{item.label}</Text>
          </Pressable>)}
          <Field label={reason === 'other' ? 'Reason (required, at least 10 characters)' : 'Internal note (optional)'} value={detail} onChangeText={setDetail} multiline maxLength={1000} placeholder={reason === 'other' ? 'Explain why you cannot accept this order…' : 'Add context for your team…'} style={{ minHeight: 84, textAlignVertical: 'top' }} />
          {reason === 'other' && detail.trim().length < 10 ? <Text style={{ color: '#A33D3D', fontSize: 12 }}>Enter at least 10 characters ({detail.trim().length}/10).</Text> : null}
          <Btn label="Confirm decline" kind="danger" busy={busyId === decline.id} disabled={!!busyId || (reason === 'other' && detail.trim().length < 10)} onPress={() => void act(decline, 'decline')} />
        </View>
      </SheetShell> : null}
      {cancel ? <SheetShell title={'Cancel order · ' + cancel.order_code} tall onClose={() => { if (!busyId) setCancel(null); }}>
        <Text style={{ color: '#5F6B5A', fontSize: 13, lineHeight: 19, marginBottom: 10 }}>Choose the cancellation reason for your store’s records. The customer receives a separate, respectful explanation rather than your selected reason or private note.</Text>
        <View style={{ gap: 8 }}>
          {reasons.map(item => <Pressable key={item.id} onPress={() => setReason(item.id)} style={{ borderWidth: 1, borderColor: reason === item.id ? '#3F6B37' : '#D6DDD2', borderRadius: 12, padding: 12, backgroundColor: reason === item.id ? '#EAF4E5' : '#fff' }}>
            <Text style={{ color: '#1A2517', fontWeight: reason === item.id ? '800' : '600' }}>{reason === item.id ? '●  ' : '○  '}{item.label}</Text>
          </Pressable>)}
          <Field label={reason === 'other' ? 'Reason (required, at least 10 characters)' : 'Internal note (optional)'} value={detail} onChangeText={setDetail} multiline maxLength={1000} placeholder={reason === 'other' ? 'Explain why your restaurant must cancel…' : 'Add private context for your team…'} style={{ minHeight: 84, textAlignVertical: 'top' }} />
          {reason === 'other' && detail.trim().length < 10 ? <Text style={{ color: '#A33D3D', fontSize: 12 }}>Enter at least 10 characters ({detail.trim().length}/10).</Text> : null}
          <Btn label="Confirm cancellation" kind="danger" busy={busyId === cancel.id} disabled={!!busyId || (reason === 'other' && detail.trim().length < 10)} onPress={() => void act(cancel, 'cancel')} />
        </View>
      </SheetShell> : null}
    </>
  );
}
