import {GoodiesVendorError as ErrBox} from './BusinessSpaceGoodiesFeedback';
import {useGoodiesVendorLabels} from './BusinessSpaceGoodiesLabels';
import {setGoodiesCashAcceptance} from '../../services/goodiesSettlement';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, Pressable, Image } from 'react-native';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import {GOODIES_DELIVERY_PROOF_BUCKET,resolveGoodiesDeliveryProof} from '../../services/goodiesDeliveryProof';
import { useApp, useArg, useQ, Pg, Skel, Empty, Btn, Field, SheetShell, Pill,errText } from './BusinessSpaceShared';

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
const remaining = (deadline: string | null, now: number,text:(source:string)=>string=source=>source) => {
  if (!deadline) return text('15-minute response required');
  const sec = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  return sec ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' '+text('left to respond') : text('Response deadline passed');
};

async function goodiesOrdersRequest(name:string,args?:Record<string,unknown>) {
  try {return await supabase.rpc(name,args);}
  catch {return {data:null,error:{message:'Request unavailable'}};}
}

function GoodiesVendorDeliveryProof({reference}:{reference:string}) {
  const {label,text,status,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("orders");
  const proof=useQ(()=>resolveGoodiesDeliveryProof(reference),[reference]);
  const [imageFailed,setImageFailed]=useState(false);
  useEffect(()=>setImageFailed(false),[reference,proof.d]);
  if(proof.l&&!proof.d)return <Skel h={150}/>;
  if(proof.e||imageFailed)return <ErrBox e={label("lbl.vendor.orders.20a23c4b5a","Could not load the delivery photo.")} retry={()=>{setImageFailed(false);void proof.reload();}}/>;
  return proof.d?<Image source={{uri:proof.d}} onError={()=>setImageFailed(true)} style={{width:'100%',height:150,borderRadius:10,backgroundColor:'#F1F2EF'}} resizeMode="cover"/>:null;
}

export function GoodiesOrdersPage() {
  const {label,text,status,money:dollars,locale,canManage,requireManage}=useGoodiesVendorLabels("orders");
  const route=useArg() as {focus?:string;order?:string}|undefined,focus=route?.focus||route?.order;
  const app = useApp();
  const fmt=(value:string|null)=>value?new Date(value).toLocaleString(locale==='ht'?'fr-HT':locale,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
  const money=dollars;
  const [page, setPage] = useState(0);
  const [decline, setDecline] = useState<GoodiesOrder | null>(null);
  const [cancel, setCancel] = useState<GoodiesOrder | null>(null);
  const [reason, setReason] = useState('out_of_stock');
  const [detail, setDetail] = useState('');
  const [busyId, setBusyId] = useState('');
  const statusActionLock = useRef(false);
  const [now, setNow] = useState(Date.now());
  const [storeId, setStoreId] = useState('');
  const [cashEnabled, setCashEnabled] = useState(false);
  const [cashLoadError, setCashLoadError] = useState(false), [cashLoading, setCashLoading] = useState(true), [cashAttempt, setCashAttempt] = useState(0);
  const [assignmentError, setAssignmentError] = useState(false);
  const [cashBusy, setCashBusy] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<GoodiesOrder | null>(null);
  const [ownDriverOrder, setOwnDriverOrder] = useState<GoodiesOrder | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [ownBusy, setOwnBusy] = useState('');
  const ownDriverWaitLeft = (order: GoodiesOrder) => dispatchWaits.d?.businessId===app.biz.id&&!dispatchWaits.e&&Number.isFinite(dispatchWaits.d.waits[order.id])?Math.max(0,dispatchWaits.d.waits[order.id]*1000-Math.max(0,now-dispatchWaits.d.receivedAt)):null;
  const canUseOwnDriver = (order: GoodiesOrder) => order.order_type === 'delivery' && (order.status === 'ready' || order.status === 'courier_assigned') && !['accepted', 'picked_up'].includes(assignmentStates[order.id] || '');
  const submitOwnDriver = async () => {
    if (!requireManage()) return;
    if (!ownDriverOrder) return;
    setOwnBusy('assign');
    const {error} = await goodiesOrdersRequest('goodies_assign_own_driver', {p_order_id: ownDriverOrder.id, p_driver_name: driverName, p_driver_phone: driverPhone});
    setOwnBusy('');
    if (error) { console.warn('Own driver assignment failed'); app.toast(label("lbl.vendor.orders.96786592cd","Could not assign your driver. Check the order status and driver details, then try again.")); return; }
    app.toast(label("lbl.vendor.orders.9a2b5e5fe2","Your driver is assigned. Mark the order delivered with a photo once it arrives."));
    setOwnDriverOrder(null); setDriverName(''); setDriverPhone(''); await orders.reload();
  };
  const markOwnDelivered = async (order: GoodiesOrder) => {
    if (!requireManage()) return;
    try {
      const {data: privateUploads, error: policyError} = await goodiesOrdersRequest('goodies_private_delivery_proof_uploads_enabled');
      // Delivery evidence contains private customer information: never upload it to the public listing-photo bucket.
      if (policyError || privateUploads !== true) {
        app.toast(label('lbl.vendor.orders.ad5634db80','Could not save the delivery photo. Please try again.'));
        return;
      }
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      let result: ImagePicker.ImagePickerResult;
      if (perm.granted) result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      else {
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!lib.granted) { app.toast(label("lbl.vendor.orders.35556087e1","Allow camera or photo access to add the delivery photo.")); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      }
      if (result.canceled || !result.assets?.[0]) return;
      setOwnBusy(order.id);
      const asset = result.assets[0];
      const m = await ImageManipulator.manipulateAsync(asset.uri, asset.width && asset.width > 1400 ? [{ resize: { width: 1400 } }] : [], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
      const b64 = await FileSystem.readAsStringAsync(m.uri, { encoding: FileSystem.EncodingType.Base64 });
      const suffix = Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg';
      const path = app.biz.id + '/' + order.id + '/' + suffix;
      const {error: uploadError} = await supabase.storage.from(GOODIES_DELIVERY_PROOF_BUCKET).upload(path, decode(b64), { contentType: 'image/jpeg', cacheControl: '300' });
      if (uploadError) throw uploadError;
      const reference = path;
      const {error} = await goodiesOrdersRequest('goodies_self_delivery_mark_delivered', {p_order_id: order.id, p_proof_url: reference});
      if (error) throw error;
      app.toast(label("lbl.vendor.orders.b7ff1a6fb9","Marked as delivered. The customer has 24 hours to confirm or report a problem."));
      await orders.reload();
    } catch (e: any) {
      console.warn('Delivery proof failed');
      app.toast(label("lbl.vendor.orders.ad5634db80","Could not save the delivery photo. Please try again."));
    } finally { setOwnBusy(''); }
  };
  const [couriers, setCouriers] = useState<any[]>([]);
  const [dispatchBusy, setDispatchBusy] = useState('');
  const [assignmentStates, setAssignmentStates] = useState<Record<string,string>>({});
  const [productPhotos, setProductPhotos] = useState<Record<string,string>>({});
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const orders = useQ(async () => {
    let request=supabase.from('goodies_orders')
      .select('id,order_code,status,created_at,acceptance_deadline_at,scheduled_for,order_type,items,total,subtotal,discount,commissionable_subtotal,platform_commission_rate,platform_commission_amount,vendor_net_amount,notes,address,contact_phone,payment_method,payment_status,payment_refunded_amount,courier_id,ready_at,updated_at,self_delivery,self_driver_name,self_driver_phone,vendor_delivered_at,receipt_deadline_at,delivery_proof_url,delivery_dispute_status')
      .eq('business_id', app.biz.id);
    if(focus)request=request.eq('id',focus);
    const {data,error}=await request.order('created_at', { ascending: false }).order('id', {ascending: false}).range(page * 100, page * 100 + 99);
    if (error) throw error;
    return (data || []) as GoodiesOrder[];
  }, [app.biz.id, app.tick, page,focus]);

  useEffect(() => {
    const orderIds=(orders.d||[]).filter(o=>o.order_type==='delivery').map(o=>o.id);
    if(!orderIds.length){setAssignmentStates({});return;}
    let active=true;
    const sync=async()=>{
      const {data,error}=await supabase.from('goodies_delivery_assignments')
        .select('order_id,status').eq('business_id',app.biz.id).in('order_id',orderIds);
      if(active)setAssignmentError(!!error);
      if(active&&!error)setAssignmentStates(Object.fromEntries((data||[]).map((a:any)=>[a.order_id,a.status])));
    };
    void sync();
    const channel=supabase.channel('goodies-vendor-delivery-assignments-'+app.biz.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_delivery_assignments',filter:'business_id=eq.'+app.biz.id},()=>{void sync();})
      .subscribe();
    return()=>{active=false;void supabase.removeChannel(channel);};
  },[app.biz.id,orders.d]);
  const dispatchWaits=useQ(async()=>{const {data,error}=await goodiesOrdersRequest('goodies_vendor_dispatch_waits',{p_business:app.biz.id});if(error||!data||typeof data.waits!=='object'||Object.values(data.waits).some(value=>typeof value!=='number'||!Number.isFinite(value)))throw new Error('Delivery options unavailable');return{businessId:app.biz.id,waits:data.waits as Record<string,number>,receivedAt:Date.now()};},[app.biz.id,orders.d,Math.floor(now/30000)]);
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
    let active = true;setCashLoading(true);setCashLoadError(false);
    void Promise.resolve(supabase.from('goodies_store_schedules').select('store_id,accept_cash_on_delivery').eq('business_id', app.biz.id).maybeSingle())
      .then(({data,error}) => {if(error || !data)throw new Error('Store settings unavailable'); if (active) { setStoreId(data.store_id); setCashEnabled(!!data.accept_cash_on_delivery); } })
      .catch(()=>{if(active)setCashLoadError(true);}).finally(()=>{if(active)setCashLoading(false);});
    return () => { active = false; };
  }, [app.biz.id,cashAttempt]);
  const toggleCash = async () => {
    if (!requireManage()) return;
    if (!storeId || cashBusy) return;
    setCashBusy(true);
    try {
      const next = !cashEnabled;
      await setGoodiesCashAcceptance(app.biz.id,next);
      setCashEnabled(next);
      app.toast(next ? label('lbl.vendor.orders.cashEnabled','Cash on delivery enabled for your store.') : label("lbl.vendor.orders.0cfb6bc682","Cash on delivery disabled."));
    } catch (e:any) { app.toast(label("lbl.vendor.orders.e9c1d38743","Could not update cash-on-delivery settings. Please try again.")); }
    finally { setCashBusy(false); }
  };
  const openDispatch = async (order: GoodiesOrder) => {
    if (!requireManage()) return;
    setDispatchOrder(order); setCouriers([]); setDispatchBusy('loading');
    const {data,error} = await goodiesOrdersRequest('goodies_list_dispatch_couriers',{p_order_id:order.id});
    setDispatchBusy('');
    if (error) { app.toast(label("lbl.vendor.orders.7ffb864440","Could not load available couriers. Please try again.")); setDispatchOrder(null); return; }
    setCouriers(data || []);
  };
  const assignCourier = async (courierId:string) => {
    if (!requireManage()) return;
    if (!dispatchOrder) return;
    setDispatchBusy(courierId);
    const {error} = await goodiesOrdersRequest('goodies_assign_courier',{p_order_id:dispatchOrder.id,p_courier_id:courierId});
    setDispatchBusy('');
    if (error) { app.toast(label("lbl.vendor.orders.d63b7c105f","Could not assign this courier. Please refresh and try again.")); return; }
    app.toast(label("lbl.vendor.orders.6fcad3b462","Courier offer sent. The courier must accept before pickup."));
    setDispatchOrder(null); await orders.reload();
  };
  const refundAttempts = useRef(new Set<string>());
  useEffect(() => {
    if (!canManage) return;
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
  }, [orders.d,canManage]);
  useEffect(() => {
    const channel = supabase.channel('goodies-vendor-orders-' + app.biz.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goodies_orders', filter: 'business_id=eq.' + app.biz.id }, () => { void orders.reload(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [app.biz.id]);
  const act = async (order: GoodiesOrder, action: 'accept' | 'decline' | 'cancel' | 'preparing' | 'ready' | 'completed') => {
    if (!requireManage()) return;
    if (statusActionLock.current || busyId) return;
    statusActionLock.current = true;
    setBusyId(order.id);
    try {
      const { error } = action === 'accept'
        ? await goodiesOrdersRequest('accept_goodies_order', { p_order_id: order.id })
        : action === 'decline'
          ? await goodiesOrdersRequest('decline_goodies_order', { p_order_id: order.id, p_reason_code: reason, p_reason_detail: reason === 'other' ? detail.trim() : (detail.trim() || null) })
          : action === 'cancel'
            ? await goodiesOrdersRequest('cancel_goodies_order_by_store', { p_order_id: order.id, p_reason_code: reason, p_reason_detail: reason === 'other' ? detail.trim() : (detail.trim() || null) })
            : await goodiesOrdersRequest('set_goodies_order_status', { p_order_id: order.id, p_status: action });
      if (error) throw error;
      setDecline(null); setCancel(null); setDetail('');
      let refundWarning = '';
      if (action === 'decline' && order.payment_method === 'card' && ['paid', 'refund_pending', 'partially_refunded'].includes(String(order.payment_status || ''))) {
        const refund = await supabase.functions.invoke('refund-goodies-card-order', { body: { order_id: order.id } });
        if (refund.error || refund.data?.error) refundWarning = ' '+text('Card refund is pending and may need support follow-up.');
      }
      app.toast(action === 'accept' ? label("lbl.vendor.orders.7cd4ffd44f","Order accepted") : action === 'decline' ? label("lbl.vendor.orders.1fa4feae4f","Order declined. Customer notified.") + refundWarning : action === 'cancel' ? label("lbl.vendor.orders.ba0df03fa0","Order cancelled. Customer notified.") : action === 'preparing' ? label("lbl.vendor.orders.1d4a885bd6","Order marked as preparing") : action === 'ready' ? label("lbl.vendor.orders.9c1f9b164c","Order marked ready") : label("lbl.vendor.orders.8f50353fe4","Order completed"));
      await orders.reload();
      app.bump();
    } catch (e: any) {
      app.toast(e?.code==='P4201'||e?.code==='P4202'?text(errText(e)):label("lbl.vendor.orders.b1536fb05a","Could not update this order. Refresh and try again."));
      await orders.reload();
    } finally { statusActionLock.current = false; setBusyId(''); }
  };

  return (
    <>
      <Pg title={label("lbl.vendor.orders.9b730cbf1e","Goodies orders")} onBack={app.back} refreshing={orders.l} onRefresh={orders.reload}>
        <View style={{ gap: 10 }}>
          {assignmentError ? <Text style={{color:'#8D3932'}}>{label("lbl.vendor.orders.1f585d7d3d","Courier assignments could not refresh. Pull down to try again.")}</Text> : null}
          <View style={{padding:14,borderRadius:14,borderWidth:1,borderColor:'#DCE4D7',backgroundColor:'#fff',gap:7}}>
            <Text style={{fontWeight:'800',fontSize:14,color:'#1A2517'}}>{label("lbl.vendor.orders.eda24c6958","Cash on delivery")}</Text>
            <Text style={{fontSize:12,lineHeight:18,color:'#5F6B5A'}}>{label("lbl.vendor.orders.556b1fc32c","Wantiss Wallet is the default payment method. Cash on delivery is available when your store and an eligible courier both enable it.")}</Text>
            {cashLoading ? <Text>{label("lbl.vendor.orders.c04fbcb627","Loading cash settings…")}</Text> : cashLoadError ? <ErrBox e={label("lbl.vendor.orders.2e4c05df9f","Could not load cash settings.")} retry={()=>setCashAttempt(n=>n+1)} /> : null}
            <Btn label={cashBusy ? label("lbl.vendor.orders.56a2285c5b","Saving…") : cashEnabled ? label("lbl.vendor.orders.7e0982279c","Disable cash on delivery") : label("lbl.vendor.orders.8cafc23055","Enable cash on delivery")} busy={cashBusy} disabled={!canManage || !storeId || cashBusy || cashLoading || cashLoadError} onPress={() => void toggleCash()} />
          </View>
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: '#EAF4E5', gap: 4 }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#234A25' }}>{pending.length}  {label("lbl.vendor.orders.1bda586997","awaiting response on this page")}</Text>
            <Text style={{ fontSize: 12, lineHeight: 18, color: '#38583A' }}>{label("lbl.vendor.orders.e5116ca1f1","Please accept or decline each new order within 15 minutes. Orders not answered in time are automatically cancelled and the items are returned to your available stock.")}</Text>
          </View>
          {orders.l && !orders.d ? <><Skel h={110} /><Skel h={110} /></> : null}
          {orders.e ? <ErrBox e={orders.e} retry={orders.reload} /> : null}
          {!orders.l && !orders.e && !(orders.d || []).length ? <Empty icon="receipt-text-outline" title={label("lbl.vendor.orders.958e5dc8da","No Goodies orders yet")} hint={label("lbl.vendor.orders.ccc3d63c6f","New customer orders will appear here with a 15-minute response window.")} /> : null}
          {(orders.d || []).map(order => {
            const canRespond = order.status === 'placed' && !!order.acceptance_deadline_at && new Date(order.acceptance_deadline_at).getTime() > Date.now();
            return <View key={order.id} style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#DCE4D7', backgroundColor: '#fff', gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: '#1A2517' }}>{order.order_code}</Text>
                <Pill tone={order.status === 'placed' ? 'warn' : order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'good' : order.status === 'declined' || order.status === 'expired' ? 'bad' : 'mute'}>{status(order.status)}</Pill>
              </View>
              <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{order.order_type === 'pickup' ? label("lbl.vendor.orders.a51122c100","Pickup") : label("lbl.vendor.orders.9631af52c6","Delivery")} · {fmt(order.created_at)}{order.scheduled_for ? ' '+label("lbl.vendor.orders.94ce937116","· Scheduled fulfilment:")+' ' + fmt(order.scheduled_for) : ''}</Text>
              {order.payment_method === 'card' ? <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{label("lbl.vendor.orders.49e73b03d8","Card payment:")} {status(order.payment_status)}{Number(order.payment_refunded_amount) > 0 ? ' '+label("lbl.vendor.orders.8bed86c951","· refunded")+' ' + money(Number(order.payment_refunded_amount)) : ''}</Text> : null}
              {order.order_type === 'delivery' ? <>
                <Text style={{ color: '#1A2517', fontSize: 13 }}>{label("lbl.vendor.orders.4428e67f62","Delivery address:")} {String(order.address?.t || order.address?.label || order.address?.address || label("lbl.vendor.orders.2e4837b5c8","Address not provided"))}</Text>
                <Text style={{ color: '#1A2517', fontSize: 13 }}>{label("lbl.vendor.orders.34539b869d","Customer phone:")} {String(order.contact_phone || label("lbl.vendor.orders.20a0418296","Not provided"))}</Text>
              </> : null}
              <View style={{gap:8}}>
                {(Array.isArray(order.items) ? order.items : []).map((item:any,index:number) => {
                  const photo = item.photo || item.photo_url || productPhotos[String(item.id || '')] || '';
                  return <View key={String(item.k || item.id || index)} style={{flexDirection:'row',alignItems:'center',gap:10}}>
                    {photo ? <Image source={{uri:String(photo)}} style={{width:52,height:52,borderRadius:10,backgroundColor:'#EEF1EB'}} resizeMode="cover" /> : <View style={{width:52,height:52,borderRadius:10,backgroundColor:'#EEF1EB',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:24}}>{item.e || '🛍️'}</Text></View>}
                    <View style={{flex:1}}><Text style={{fontSize:13,fontWeight:'700',color:'#1A2517'}}>{(item.q || 1) + '× ' + (item.n || label("lbl.vendor.orders.ecdda59aea","Item"))}</Text>{item.d ? <Text style={{fontSize:11,color:'#5F6B5A',marginTop:2}}>{item.d}</Text> : null}</View>
                    <Text style={{fontSize:12,fontWeight:'700',color:'#1A2517'}}>{money(Number(item.p || 0) * Number(item.q || 1))}</Text>
                  </View>;
                })}
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: '#E7ECE3', paddingTop: 8, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{label("lbl.vendor.orders.540385f4ee","Product subtotal")}</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>{money(order.subtotal)}</Text>
                </View>
                {Number(order.discount) > 0 ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{label("lbl.vendor.orders.b524936d7a","Discount")}</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>−{money(order.discount)}</Text>
                </View> : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{label("lbl.vendor.orders.8fb6f28e1c","Commissionable product amount")}</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>{money(order.commissionable_subtotal)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{label("lbl.vendor.orders.717daa6816","Wantiss commission (")}{(Number(order.platform_commission_rate) * 100).toFixed(0)}%)</Text>
                  <Text style={{ color: '#1A2517', fontSize: 12 }}>−{money(order.platform_commission_amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#1A2517', fontSize: 13, fontWeight: '800' }}>{label("lbl.vendor.orders.5c3027fc66","Your net product earnings")}</Text>
                  <Text style={{ color: '#1A2517', fontSize: 13, fontWeight: '800' }}>{money(order.vendor_net_amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingTop: 3 }}>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{label("lbl.vendor.orders.584a740d20","Customer order total (includes excluded fees)")}</Text>
                  <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{money(order.total)}</Text>
                </View>
              </View>
              {order.notes ? <Text style={{ color: '#5F6B5A', fontSize: 12 }}>{label("lbl.vendor.orders.b30522ada6","Customer note:")} {order.notes}</Text> : null}
              {order.status === 'placed' ? <Text style={{ color: canRespond ? '#A15B13' : '#A33D3D', fontWeight: '700', fontSize: 12 }}>{remaining(order.acceptance_deadline_at, now,text)}</Text> : null}
              {order.status === 'courier_assigned' ? <Text style={{fontSize:12,color:'#5F6B5A'}}>{assignmentStates[order.id]==='accepted' ? label("lbl.vendor.orders.3f82e91675","Courier accepted the offer. Live GPS tracking starts now.") : assignmentStates[order.id]==='picked_up' ? label("lbl.vendor.orders.40e31a69cf","Courier picked up this order.") : label("lbl.vendor.orders.dcd53826ac","Delivery offer sent. Waiting for courier acceptance.")}</Text> : null}
              {(order.status === 'ready' || (order.status === 'courier_assigned' && (!assignmentStates[order.id] || assignmentStates[order.id]==='offered' || assignmentStates[order.id]==='declined'))) && order.order_type === 'delivery' ? <Btn label={order.courier_id ? label("lbl.vendor.orders.aba5d16c4f","Reassign courier") : label("lbl.vendor.orders.0bab2aabc0","Assign courier")} disabled={!canManage || !!busyId} onPress={() => void openDispatch(order)} /> : null}
              {canUseOwnDriver(order) ? (dispatchWaits.l&&!dispatchWaits.d?<Text style={{fontSize:12,color:'#5F6B5A'}}>{label('lbl.vendor.orders.dispatchLoading','Checking delivery options…')}</Text>:dispatchWaits.e||ownDriverWaitLeft(order)===null?<ErrBox e={label('lbl.vendor.orders.dispatchFailed','Could not check delivery options.')} retry={dispatchWaits.reload}/>:ownDriverWaitLeft(order)! > 0
                ? <Text style={{fontSize:12,color:'#5F6B5A'}}>{label("lbl.vendor.orders.e1cbec5f55","No courier yet? You can use your own driver in")} {Math.ceil(ownDriverWaitLeft(order)! / 60000)}  {label("lbl.vendor.orders.f6bc8b8a23","min.")}</Text>
                : <Btn label={label("lbl.vendor.orders.971fad06e0","Use my own driver")} kind="secondary" disabled={!canManage || !!busyId || !!ownBusy} onPress={() => { setOwnDriverOrder(order); setDriverName(''); setDriverPhone(''); }} />) : null}
              {order.self_delivery && order.status === 'picked_up' ? <View style={{gap:6}}>
                <Text style={{fontSize:12,color:'#5F6B5A'}}>{label("lbl.vendor.orders.dacaad28c3","Your driver:")} {order.self_driver_name} · {order.self_driver_phone}</Text>
                {!order.vendor_delivered_at
                  ? <Btn label={label("lbl.vendor.orders.1977c083e1","Mark delivered with photo")} busy={ownBusy === order.id} disabled={!canManage || !!ownBusy} onPress={() => void markOwnDelivered(order)} />
                  : order.delivery_dispute_status === 'open'
                    ? <Text style={{fontSize:12,fontWeight:'700',color:'#A33D3D'}}>{label("lbl.vendor.orders.482e8c36d3","The customer reported a problem. Our team is reviewing it.")}</Text>
                    : <View style={{gap:6}}>{order.delivery_proof_url ? <GoodiesVendorDeliveryProof key={order.delivery_proof_url} reference={order.delivery_proof_url}/> : null}<Text style={{fontSize:12,color:'#5F6B5A'}}>{label("lbl.vendor.orders.7ff1b090bc","Delivery photo saved. Waiting for the customer to confirm. It completes automatically after")} {new Date(order.receipt_deadline_at || '').toLocaleString(locale==='ht'?'fr-HT':locale)}  {label("lbl.vendor.orders.f4a042f986","if there is no report.")}</Text></View>}
              </View> : null}
              {order.status === 'accepted' || order.status === 'preparing' || (order.status === 'ready' && order.order_type === 'pickup') ? <Btn label={order.status === 'accepted' ? label("lbl.vendor.orders.92079d38f3","Start preparing") : order.status === 'preparing' ? label("lbl.vendor.orders.e6c9229a08","Mark ready") : label("lbl.vendor.orders.75a2b4f43e","Complete order")} busy={busyId === order.id} disabled={!canManage || !!busyId} onPress={() => void act(order, order.status === 'accepted' ? 'preparing' : order.status === 'preparing' ? 'ready' : 'completed')} /> : null}
              {canRespond ? <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Btn label={label("lbl.vendor.orders.af033e24e6","Accept order")} disabled={!canManage || !!busyId} onPress={() => void act(order, 'accept')} busy={busyId === order.id} /></View>
                <View style={{ flex: 1 }}><Btn label={label("lbl.vendor.orders.b59cf9ed55","Decline")} kind="danger" disabled={!canManage || !!busyId} onPress={() => { setDecline(order); setCancel(null); setReason('out_of_stock'); setDetail(''); }} /></View>
              </View> : null}
              {['scheduled','placed','accepted','preparing'].includes(order.status) ? <Btn label={label("lbl.vendor.orders.5ae39c4a82","Cancel order")} kind="danger" disabled={!canManage || !!busyId} onPress={() => { setCancel(order); setDecline(null); setReason('out_of_stock'); setDetail(''); }} /> : null}
            </View>;
          })}
        </View>
        <View style={{flexDirection:'row',gap:8,marginTop:14}}><Btn label={label("lbl.vendor.orders.81f547195b","Previous page")} kind="soft" disabled={page===0 || orders.l} onPress={() => setPage(p=>p-1)} /><Btn label={label("lbl.vendor.orders.4bfc194b68","Next page")} kind="soft" disabled={orders.l || (orders.d || []).length<100} onPress={() => setPage(p=>p+1)} /></View>
      </Pg>
      {ownDriverOrder ? <SheetShell title={label("lbl.vendor.orders.eea364ed29","Your own driver ·") + ' ' + ownDriverOrder.order_code} onClose={() => { if (!ownBusy) setOwnDriverOrder(null); }}>
        <Text style={{color:'#5F6B5A',fontSize:13,lineHeight:19,marginBottom:10}}>{label("lbl.vendor.orders.6c1a5f266f","Live tracking is not available for your own driver. Add a delivery photo when the order arrives.")}</Text>
        <Field editable={canManage} label={label("lbl.vendor.orders.63a7342acd","Driver name")} value={driverName} onChangeText={setDriverName} autoCapitalize="words" />
        <View style={{height:10}} />
        <Field editable={canManage} label={label("lbl.vendor.orders.043b9cc08c","Driver phone")} value={driverPhone} onChangeText={setDriverPhone} keyboardType="phone-pad" />
        <View style={{height:14}} />
        <Btn label={label("lbl.vendor.orders.f01a4bdff8","Assign my driver")} busy={ownBusy === 'assign'} disabled={!canManage || !!ownBusy || driverName.trim().length < 2 || driverPhone.replace(/\D/g, '').length < 7} onPress={() => void submitOwnDriver()} />
      </SheetShell> : null}
      {dispatchOrder ? <SheetShell title={label("lbl.vendor.orders.06d84b4546","Assign courier ·") + ' ' + dispatchOrder.order_code} tall onClose={() => { if (!dispatchBusy) setDispatchOrder(null); }}>
        <Text style={{color:'#5F6B5A',fontSize:13,lineHeight:19,marginBottom:10}}>{label("lbl.vendor.orders.b0e16f0dd9","Only couriers currently online are listed. Cash orders are offered only to couriers who explicitly accept cash on delivery.")}</Text>
        {dispatchBusy === 'loading' ? <Text>{label("lbl.vendor.orders.3023cc8a9b","Loading available couriers…")}</Text> : null}
        {!dispatchBusy && !couriers.length ? <Empty title={label("lbl.vendor.orders.ce1e152b3f","No eligible couriers online")} hint={label("lbl.vendor.orders.f4553c2513","Try again when a courier is available and has enabled the required payment preference.")} /> : null}
        {couriers.map((courier:any) => <View key={courier.courier_id} style={{padding:12,borderWidth:1,borderColor:'#DCE4D7',borderRadius:12,marginBottom:8,gap:5}}>
          <Text style={{fontWeight:'800',color:'#1A2517'}}>{courier.full_name || label("lbl.vendor.orders.be0b0bab55","Courier")}</Text>
          <Text style={{fontSize:12,color:'#5F6B5A'}}>{courier.phone_number || label("lbl.vendor.orders.4808dd2cde","No phone")} · {courier.accepts_cash_on_delivery ? label("lbl.vendor.orders.15e014f153","Accepts cash") : label("lbl.vendor.orders.43a5517e77","Wallet/card only")} · {courier.distance_km == null ? label("lbl.vendor.orders.7d925fd885","Distance unavailable") : Number(courier.distance_km).toFixed(1) + ' ' + label("lbl.vendor.orders.3dc41c87a6","km away")}</Text>
          <Btn label={label("lbl.vendor.orders.ec10013137","Send delivery offer")} busy={dispatchBusy === courier.courier_id} disabled={!canManage || !!dispatchBusy} onPress={() => void assignCourier(courier.courier_id)} />
        </View>)}
      </SheetShell> : null}
      {decline ? <SheetShell title={label("lbl.vendor.orders.b59cf9ed55","Decline") + ' ' + decline.order_code} tall onClose={() => { if (!busyId) setDecline(null); }}>
        <Text style={{ color: '#5F6B5A', fontSize: 13, lineHeight: 19, marginBottom: 10 }}>{label("lbl.vendor.orders.cf07c3b59f","Choose a reason. The customer will receive a clear, respectful explanation; your private note is not shared verbatim.")}</Text>
        <View style={{ gap: 8 }}>
          {reasons.map(item => <Pressable disabled={!canManage} key={item.id} onPress={() => setReason(item.id)} style={{ borderWidth: 1, borderColor: reason === item.id ? '#3F6B37' : '#D6DDD2', borderRadius: 12, padding: 12, backgroundColor: reason === item.id ? '#EAF4E5' : '#fff' }}>
            <Text style={{ color: '#1A2517', fontWeight: reason === item.id ? '800' : '600' }}>{reason === item.id ? '●  ' : '○  '}{text(item.label)}</Text>
          </Pressable>)}
          <Field editable={canManage} label={reason === 'other' ? label("lbl.vendor.orders.10c06e234e","Reason (required, at least 10 characters)") : label("lbl.vendor.orders.cf1db178d8","Internal note (optional)")} value={detail} onChangeText={setDetail} multiline maxLength={1000} placeholder={reason === 'other' ? label("lbl.vendor.orders.40b91e9354","Explain why you cannot accept this order…") : label("lbl.vendor.orders.06fb2ccbda","Add context for your team…")} style={{ minHeight: 84, textAlignVertical: 'top' }} />
          {reason === 'other' && detail.trim().length < 10 ? <Text style={{ color: '#A33D3D', fontSize: 12 }}>{label("lbl.vendor.orders.reasonLength","Enter at least 10 characters ({count}/10).",{count:detail.trim().length})}</Text> : null}
          <Btn label={label("lbl.vendor.orders.b4b1b95374","Confirm decline")} kind="danger" busy={busyId === decline.id} disabled={!canManage || !!busyId || (reason === 'other' && detail.trim().length < 10)} onPress={() => void act(decline, 'decline')} />
        </View>
      </SheetShell> : null}
      {cancel ? <SheetShell title={label("lbl.vendor.orders.2a4a8a9231","Cancel order ·") + ' ' + cancel.order_code} tall onClose={() => { if (!busyId) setCancel(null); }}>
        <Text style={{ color: '#5F6B5A', fontSize: 13, lineHeight: 19, marginBottom: 10 }}>{label("lbl.vendor.orders.2d6166da35","Choose the cancellation reason for your store’s records. The customer receives a separate, respectful explanation rather than your selected reason or private note.")}</Text>
        <View style={{ gap: 8 }}>
          {reasons.map(item => <Pressable disabled={!canManage} key={item.id} onPress={() => setReason(item.id)} style={{ borderWidth: 1, borderColor: reason === item.id ? '#3F6B37' : '#D6DDD2', borderRadius: 12, padding: 12, backgroundColor: reason === item.id ? '#EAF4E5' : '#fff' }}>
            <Text style={{ color: '#1A2517', fontWeight: reason === item.id ? '800' : '600' }}>{reason === item.id ? '●  ' : '○  '}{text(item.label)}</Text>
          </Pressable>)}
          <Field editable={canManage} label={reason === 'other' ? label("lbl.vendor.orders.10c06e234e","Reason (required, at least 10 characters)") : label("lbl.vendor.orders.cf1db178d8","Internal note (optional)")} value={detail} onChangeText={setDetail} multiline maxLength={1000} placeholder={reason === 'other' ? label("lbl.vendor.orders.aea7ce6af4","Explain why your restaurant must cancel…") : label("lbl.vendor.orders.9dfcfb5db1","Add private context for your team…")} style={{ minHeight: 84, textAlignVertical: 'top' }} />
          {reason === 'other' && detail.trim().length < 10 ? <Text style={{ color: '#A33D3D', fontSize: 12 }}>{label("lbl.vendor.orders.reasonLength","Enter at least 10 characters ({count}/10).",{count:detail.trim().length})}</Text> : null}
          <Btn label={label("lbl.vendor.orders.90977a5334","Confirm cancellation")} kind="danger" busy={busyId === cancel.id} disabled={!canManage || !!busyId || (reason === 'other' && detail.trim().length < 10)} onPress={() => void act(cancel, 'cancel')} />
        </View>
      </SheetShell> : null}
    </>
  );
}
