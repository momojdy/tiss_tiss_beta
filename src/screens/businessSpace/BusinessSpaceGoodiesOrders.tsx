import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useApp, useQ, Pg, Skel, ErrBox, Empty, Btn, Field, SheetShell, Pill } from './BusinessSpaceShared';

type GoodiesOrder = {
  id: string; order_code: string; status: string; created_at: string; acceptance_deadline_at: string | null; payment_method?: string | null; payment_status?: string | null;
  scheduled_for: string | null; order_type: string; items: any[]; total: number; notes: string | null; address?: Record<string, any> | null; contact_phone?: string | null;
};
const reasons = [
  { id: 'out_of_stock', label: 'Item unavailable' },
  { id: 'too_busy', label: 'Too busy to prepare' },
  { id: 'fulfilment_unavailable', label: 'Cannot fulfil this order' },
  { id: 'delivery_unavailable', label: 'Delivery unavailable' },
  { id: 'timing_unavailable', label: 'Timing unavailable' },
  { id: 'other', label: 'Other' },
];
const fmt = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const remaining = (deadline: string | null, now: number) => {
  if (!deadline) return '15-minute response required';
  const sec = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  return sec ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' left to respond' : 'Response deadline passed';
};

export function GoodiesOrdersPage() {
  const app = useApp();
  const [decline, setDecline] = useState<GoodiesOrder | null>(null);
  const [reason, setReason] = useState('out_of_stock');
  const [detail, setDetail] = useState('');
  const [busyId, setBusyId] = useState('');
  const [now, setNow] = useState(Date.now());
  const [storeId, setStoreId] = useState('');
  const [cashEnabled, setCashEnabled] = useState(false);
  const [cashBusy, setCashBusy] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<GoodiesOrder | null>(null);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [dispatchBusy, setDispatchBusy] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const orders = useQ(async () => {
    const { data, error } = await supabase.from('goodies_orders')
      .select('id,order_code,status,created_at,acceptance_deadline_at,scheduled_for,order_type,items,total,notes,address,contact_phone,payment_method,payment_status')
      .eq('business_id', app.biz.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return (data || []) as GoodiesOrder[];
  }, [app.biz.id, app.tick]);

  const pending = useMemo(() => (orders.d || []).filter(o => o.status === 'placed'), [orders.d]);
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
          order.payment_method !== 'card' || !['paid', 'refund_pending'].includes(String(order.payment_status || '')) ||
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
  const act = async (order: GoodiesOrder, action: 'accept' | 'decline' | 'preparing' | 'ready' | 'completed') => {
    if (busyId) return;
    setBusyId(order.id);
    try {
      const { error } = action === 'accept'
        ? await supabase.rpc('accept_goodies_order', { p_order_id: order.id })
        : action === 'decline'
          ? await supabase.rpc('decline_goodies_order', { p_order_id: order.id, p_reason_code: reason, p_reason_detail: reason === 'other' ? detail.trim() : (detail.trim() || null) })
          : await supabase.rpc('set_goodies_order_status', { p_order_id: order.id, p_status: action });
      if (error) throw error;
      setDecline(null); setDetail('');
      let refundWarning = '';
      if (action === 'decline' && order.payment_method === 'card' && order.payment_status !== 'refunded') {
        const refund = await supabase.functions.invoke('refund-goodies-card-order', { body: { order_id: order.id } });
        if (refund.error || refund.data?.error) refundWarning = ' Card refund is pending and may need support follow-up.';
      }
      app.toast(action === 'accept' ? 'Order accepted' : action === 'decline' ? 'Order declined. Customer notified.' + refundWarning : action === 'preparing' ? 'Order marked as preparing' : action === 'ready' ? 'Order marked ready' : 'Order completed');
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
            <Text style={{fontSize:12,lineHeight:18,color:'#5F6B5A'}}>Wantiss Wallet remains the customer's default. Cash appears only when your store enables it and an available courier has also opted in to accepting cash.</Text>
            <Btn label={cashBusy ? 'Saving…' : cashEnabled ? 'Disable cash on delivery' : 'Enable cash on delivery'} busy={cashBusy} disabled={!storeId || cashBusy} onPress={() => void toggleCash()} />
          </View>
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: '#EAF4E5', gap: 4 }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#234A25' }}>{pending.length} awaiting response</Text>
            <Text style={{ fontSize: 12, lineHeight: 18, color: '#38583A' }}>Accept or decline each new order within 15 minutes. If the deadline expires, the order is marked expired and stock is restored by the scheduled server job.</Text>
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
              {order.order_type === 'delivery' ? <>
                <Text style={{ color: '#1A2517', fontSize: 13 }}>Delivery address: {String(order.address?.t || order.address?.label || order.address?.address || 'Address not provided')}</Text>
                <Text style={{ color: '#1A2517', fontSize: 13 }}>Customer phone: {String(order.contact_phone || 'Not provided')}</Text>
              </> : null}
              <Text style={{ fontSize: 13, color: '#1A2517' }}>{(Array.isArray(order.items) ? order.items : []).map(i => (i.q || 1) + '× ' + (i.n || 'Item')).join(' · ') || 'Order items'}</Text>
              <Text style={{ fontWeight: '800', color: '#1A2517' }}>{money(order.total)}</Text>
              {order.notes ? <Text style={{ color: '#5F6B5A', fontSize: 12 }}>Customer note: {order.notes}</Text> : null}
              {order.status === 'placed' ? <Text style={{ color: canRespond ? '#A15B13' : '#A33D3D', fontWeight: '700', fontSize: 12 }}>{remaining(order.acceptance_deadline_at, now)}</Text> : null}
              {order.status === 'ready' && order.order_type === 'delivery' ? <Btn label={order.courier_id ? 'Reassign courier' : 'Assign courier'} disabled={!!busyId} onPress={() => void openDispatch(order)} /> : null}
              {order.status === 'accepted' || order.status === 'preparing' || order.status === 'ready' ? <Btn label={order.status === 'accepted' ? 'Start preparing' : order.status === 'preparing' ? 'Mark ready' : 'Complete order'} busy={busyId === order.id} disabled={!!busyId} onPress={() => void act(order, order.status === 'accepted' ? 'preparing' : order.status === 'preparing' ? 'ready' : 'completed')} /> : null}
              {canRespond ? <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Btn label="Accept order" onPress={() => void act(order, 'accept')} busy={busyId === order.id} /></View>
                <View style={{ flex: 1 }}><Btn label="Decline" kind="danger" disabled={!!busyId} onPress={() => { setDecline(order); setReason('out_of_stock'); setDetail(''); }} /></View>
              </View> : null}
            </View>;
          })}
        </View>
      </Pg>
      {dispatchOrder ? <SheetShell title={'Assign courier · ' + dispatchOrder.order_code} tall onClose={() => { if (!dispatchBusy) setDispatchOrder(null); }}>
        <Text style={{color:'#5F6B5A',fontSize:13,lineHeight:19,marginBottom:10}}>Only couriers currently online are listed. Cash orders are offered only to couriers who explicitly accept cash on delivery.</Text>
        {dispatchBusy === 'loading' ? <Text>Loading available couriers…</Text> : null}
        {!dispatchBusy && !couriers.length ? <Empty title="No eligible couriers online" hint="Try again when a courier is available and has enabled the required payment preference." /> : null}
        {couriers.map((courier:any) => <View key={courier.courier_id} style={{padding:12,borderWidth:1,borderColor:'#DCE4D7',borderRadius:12,marginBottom:8,gap:5}}>
          <Text style={{fontWeight:'800',color:'#1A2517'}}>{courier.full_name || 'Courier'}</Text>
          <Text style={{fontSize:12,color:'#5F6B5A'}}>{courier.phone_number || 'No phone'} · {courier.accepts_cash_on_delivery ? 'Accepts cash' : 'Wallet/card only'}</Text>
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
    </>
  );
}
