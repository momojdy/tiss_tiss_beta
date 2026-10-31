import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, Text, View} from 'react-native';
import * as Location from 'expo-location';
import {supabase} from '../../lib/supabase';

type Delivery = {
  id:string; order_id:string; status:string; order_code:string; address:any; contact_phone:string|null;
  items:any[]; total:number; payment_method:string; payment_status:string; business_id:string;
};
const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);
const date=(v:string|null)=>v?new Date(v).toLocaleString():'—';

export default function GoodiesCourierScreen({onSignOut}:{onSignOut:()=>void}) {
  const [uid,setUid]=useState('');
  const [available,setAvailable]=useState(false);
  const [acceptsCash,setAcceptsCash]=useState(false);
  const [deliveries,setDeliveries]=useState<Delivery[]>([]);
  const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);
  const [locationStatus,setLocationStatus]=useState('Location sharing is off');

  const load=useCallback(async()=>{
    const {data:user}=await supabase.auth.getUser();
    if(!user.user)return;
    setUid(user.user.id);
    const {data:presence}=await supabase.from('goodies_courier_presence').select('is_available,accepts_cash_on_delivery').eq('courier_id',user.user.id).maybeSingle();
    setAvailable(!!presence?.is_available);setAcceptsCash(!!presence?.accepts_cash_on_delivery);
    const {data:assignments,error}=await supabase.from('goodies_delivery_assignments').select('id,order_id,status').eq('courier_id',user.user.id).in('status',['offered','accepted','picked_up']).order('offered_at',{ascending:false}).limit(30);
    if(error)throw error;
    const ids=(assignments||[]).map((a:any)=>a.order_id);
    if(!ids.length){setDeliveries([]);return;}
    const {data:orders,error:orderError}=await supabase.from('goodies_orders').select('id,order_code,address,contact_phone,items,total,payment_method,payment_status,business_id').in('id',ids);
    if(orderError)throw orderError;
    setDeliveries((assignments||[]).flatMap((a:any)=>{const o=(orders||[]).find((x:any)=>x.id===a.order_id);return o?[{...o,id:a.id,order_id:a.order_id,status:a.status}]:[];}));
  },[]);

  useEffect(()=>{let active=true;void load().catch(e=>Alert.alert('Could not load deliveries',e.message)).finally(()=>{if(active)setLoading(false);});
    const ch=supabase.channel('goodies-courier-work-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'goodies_delivery_assignments',filter:uid?'courier_id=eq.'+uid:'courier_id=eq.00000000-0000-0000-0000-000000000000'},()=>{void load();}).subscribe();
    return()=>{active=false;void supabase.removeChannel(ch);};
  },[load,uid]);

  const activeOrderId = deliveries.find(d=>d.status==='accepted'||d.status==='picked_up')?.order_id || '';
  useEffect(()=>{
    if(!activeOrderId)return;
    let subscription:Location.LocationSubscription|null=null;let cancelled=false;
    void (async()=>{
      const permission=await Location.requestForegroundPermissionsAsync();
      if(!permission.granted){setLocationStatus('Location permission is required for active delivery tracking.');return;}
      if(cancelled)return;
      setLocationStatus('Sharing live GPS location');
      subscription=await Location.watchPositionAsync({accuracy:Location.Accuracy.Balanced,timeInterval:5000,distanceInterval:15},position=>{
        void supabase.rpc('goodies_courier_update_location',{p_order_id:activeOrderId,p_latitude:position.coords.latitude,p_longitude:position.coords.longitude,p_accuracy_m:position.coords.accuracy,p_heading:position.coords.heading,p_speed_mps:position.coords.speed}).then(({error})=>{if(error)setLocationStatus('GPS update failed: '+error.message);});
      });
    })().catch(e=>setLocationStatus(e.message||'Unable to start GPS sharing'));
    return()=>{cancelled=true;subscription?.remove();setLocationStatus('Location sharing is off');};
  },[activeOrderId]);

  const setPresence=async(next:boolean,cash=acceptsCash)=>{
    setBusy('presence');
    const {error}=await supabase.rpc('goodies_set_courier_availability',{p_is_available:next,p_accepts_cash_on_delivery:cash});
    if(error)Alert.alert('Availability not updated',error.message);else{setAvailable(next);setAcceptsCash(cash);}
    setBusy('');
  };
  const respond=async(orderId:string,accept:boolean)=>{
    setBusy(orderId);
    const {error}=await supabase.rpc('goodies_courier_respond_assignment',{p_order_id:orderId,p_accept:accept});
    if(error)Alert.alert('Could not respond',error.message);else await load();
    setBusy('');
  };
  const advance=async(orderId:string,status:'picked_up'|'delivered')=>{
    setBusy(orderId);
    const {error}=await supabase.rpc('goodies_courier_update_delivery_status',{p_order_id:orderId,p_status:status});
    if(error)Alert.alert('Could not update delivery',error.message);else await load();
    setBusy('');
  };

  return <View style={{flex:1,backgroundColor:'#F7F8F5'}}>
    <View style={{height:100,paddingHorizontal:20,paddingBottom:12,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#E3E8DF',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'}}>
      <View><Text style={{fontSize:20,fontWeight:'800',color:'#172316'}}>Goodies Courier</Text><Text style={{fontSize:11,color:'#667064'}}>Delivery assignments and live GPS</Text></View>
      <Pressable onPress={onSignOut}><Text style={{fontSize:12,fontWeight:'700',color:'#52634F'}}>Sign out</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{padding:16,gap:12}}>
      <View style={{padding:15,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#DCE4D7',gap:10}}>
        <Text style={{fontSize:15,fontWeight:'800',color:'#1A2517'}}>Availability</Text>
        <Text style={{fontSize:12,color:'#5F6B5A'}}>Go online to receive Goodies delivery offers. Keep this screen open while working so GPS can be shared during an active delivery.</Text>
        <Pressable disabled={!!busy} onPress={()=>void setPresence(!available)} style={{padding:13,borderRadius:12,backgroundColor:available?'#E8F4E8':'#F1F2EF',alignItems:'center'}}>
          <Text style={{fontWeight:'800',color:available?'#286A35':'#465044'}}>{busy==='presence'?'Saving…':available?'You are online · Tap to go offline':'Go online'}</Text>
        </Pressable>
        <Pressable disabled={!!busy||!available} onPress={()=>void setPresence(available,!acceptsCash)} style={{paddingVertical:9,flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:13,color:'#263324'}}>I accept cash on delivery</Text><Text style={{fontSize:13,fontWeight:'800',color:acceptsCash?'#286A35':'#8A6250'}}>{acceptsCash?'ON':'OFF'}</Text>
        </Pressable>
        <Text style={{fontSize:11,color:'#697567'}}>{locationStatus}</Text>
      </View>
      <Text style={{fontSize:17,fontWeight:'800',color:'#1A2517'}}>My deliveries</Text>
      {loading?<ActivityIndicator/>:null}
      {!loading&&!deliveries.length?<View style={{padding:22,backgroundColor:'#fff',borderRadius:16,alignItems:'center'}}><Text style={{fontWeight:'700',color:'#263324'}}>No active delivery offers</Text><Text style={{fontSize:12,color:'#6B7568',marginTop:5}}>New offers will appear here when a store assigns you.</Text></View>:null}
      {deliveries.map(d=><View key={d.id} style={{padding:15,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#DCE4D7',gap:8}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'800',color:'#1A2517'}}>{d.order_code}</Text><Text style={{fontWeight:'700',color:'#426B39'}}>{d.status}</Text></View>
        <Text style={{fontSize:13,color:'#263324'}}> {String(d.address?.t||d.address?.address||'Delivery address unavailable')} </Text>
        <Text style={{fontSize:12,color:'#687264'}}>Customer: {d.contact_phone||'No phone'} · {d.payment_method==='cash'?'Cash on delivery':'Prepaid'}</Text>
        <Text style={{fontSize:13,fontWeight:'800',color:'#1A2517'}}>{money(d.total)}</Text>
        {d.status==='offered'?<View style={{flexDirection:'row',gap:8}}><Pressable disabled={!!busy} onPress={()=>void respond(d.order_id,true)} style={{flex:1,padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight:'800',color:'#28552B'}}>{busy===d.order_id?'Saving…':'Accept delivery'}</Text></Pressable><Pressable disabled={!!busy} onPress={()=>void respond(d.order_id,false)} style={{flex:1,padding:12,borderRadius:10,backgroundColor:'#F7ECEA',alignItems:'center'}}><Text style={{fontWeight:'800',color:'#9B4036'}}>Decline</Text></Pressable></View>:null}
        {d.status==='accepted'?<Pressable disabled={!!busy} onPress={()=>void advance(d.order_id,'picked_up')} style={{padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight:'800',color:'#28552B'}}>Picked up order</Text></Pressable>:null}
        {d.status==='picked_up'?<Pressable disabled={!!busy} onPress={()=>void advance(d.order_id,'delivered')} style={{padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight:'800',color:'#28552B'}}>Mark delivered</Text></Pressable>:null}
      </View>)}
    </ScrollView>
  </View>;
}
