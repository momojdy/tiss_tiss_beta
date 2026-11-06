import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, AppState, Pressable, ScrollView, Text, View} from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {GOODIES_COURIER_LOCATION_TASK} from './goodiesCourierBackgroundLocation';
import {supabase} from '../../lib/supabase';
import {friendlyError} from './friendlyError';
import {freshGpsSample} from './deliveryTracking';

type Delivery = {
  id:string; order_id:string; status:string; order_code:string; address:any; contact_phone:string|null;
  items:any[]; total:number; payment_method:string; payment_status:string; business_id:string;
};
const money=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(v)||0);

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
    if(!user.user){setUid('');setDeliveries([]);setAvailable(false);setAcceptsCash(false);return;}
    setUid(user.user.id);
    const {data:presence,error:presenceError}=await supabase.from('goodies_courier_presence').select('is_available,accepts_cash_on_delivery').eq('courier_id',user.user.id).maybeSingle();
    if (presenceError) throw presenceError;
    setAvailable(!!presence?.is_available);setAcceptsCash(!!presence?.accepts_cash_on_delivery);
    const {data:orders,error}=await supabase.rpc('goodies_courier_orders');
    if(error)throw error;
    setDeliveries((orders || []) as Delivery[]);
  },[]);

  useEffect(()=>{let active=true;void load().catch(e=>Alert.alert('Could not load deliveries',friendlyError(e,'Please try again.'))).finally(()=>{if(active)setLoading(false);});
    const ch=supabase.channel('goodies-courier-work-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'goodies_delivery_assignments',filter:uid?'courier_id=eq.'+uid:'courier_id=eq.00000000-0000-0000-0000-000000000000'},(payload:any)=>{if(payload.eventType==='INSERT'||payload.eventType==='DELETE'||payload.new?.status!==payload.old?.status)void load().catch(e=>Alert.alert('Could not refresh deliveries',friendlyError(e,'Please try again.')));}).subscribe();
    const refresh=()=>{void load().catch(e=>{if(active)Alert.alert('Could not refresh deliveries',friendlyError(e,'Please try again.'));});};
    const poll=setInterval(()=>{if(AppState.currentState==='active')refresh();},30000);
    const appState=AppState.addEventListener('change',state=>{if(state==='active')refresh();});
    return()=>{active=false;clearInterval(poll);appState.remove();void supabase.removeChannel(ch);};
  },[load,uid]);

  const activeOrderId = deliveries.find(d=>d.status==='accepted'||d.status==='picked_up')?.order_id || '';
  useEffect(()=>{
    let cancelled=false;
    let foregroundSubscription:Location.LocationSubscription|null=null;

    const stopWhenNoActiveDelivery=async()=>{
      if(activeOrderId)return;
      try {
        if(await Location.hasStartedLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK)){
          await Location.stopLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK);
        }
      } catch {}
      if(!cancelled)setLocationStatus('Location sharing stops when no delivery is active');
    };

    const startTracking=async()=>{
      if(!activeOrderId){await stopWhenNoActiveDelivery();return;}
      const foreground=await Location.requestForegroundPermissionsAsync();
      if(cancelled)return;
      if(!foreground.granted){
        if(!cancelled)setLocationStatus('Allow location access to track your active delivery.');
        return;
      }

      const taskAvailable=await TaskManager.isAvailableAsync();
      if(cancelled)return;
      let backgroundStarted=false;
      if(taskAvailable){
        try {
          const background=await Location.requestBackgroundPermissionsAsync();
          if(cancelled)return;
          if(background.granted){
            const started=await Location.hasStartedLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK);
            if(cancelled)return;
            if(!started){
              await Location.startLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK,{
                accuracy:Location.Accuracy.High,
                timeInterval:5000,
                distanceInterval:15,
                pausesUpdatesAutomatically:false,
                showsBackgroundLocationIndicator:true,
                activityType:Location.ActivityType.AutomotiveNavigation,
                foregroundService:{
                  notificationTitle:'Wantiss delivery tracking is active',
                  notificationBody:'Your live location is shared with the customer for this delivery.',
                  killServiceOnDestroy:false,
                },
              });
            }
            backgroundStarted=true;
          } else if(!cancelled) {
            setLocationStatus('Background permission was not granted. Live GPS works only while Wantiss is open.');
          }
        } catch (backgroundError:any) {
          if(!cancelled)setLocationStatus('Background GPS is unavailable in this app build. Live GPS will continue while Wantiss is open.');
        }
      } else if(!cancelled) {
        setLocationStatus('Foreground GPS only in Expo Go. A Wantiss development build is required for background tracking.');
      }
      if(backgroundStarted){
        if(!cancelled)setLocationStatus('Background GPS active · location sharing continues when you switch apps or lock your phone');
        return;
      }

      if(cancelled)return;
      foregroundSubscription=await Location.watchPositionAsync({
        accuracy:Location.Accuracy.High,
        timeInterval:5000,
        distanceInterval:15,
      },position=>{
        if(cancelled)return;
        if(!freshGpsSample(position)){setLocationStatus('Waiting for a fresh GPS location.');return;}
        void supabase.rpc('goodies_courier_update_location',{
          p_order_id:activeOrderId,
          p_latitude:position.coords.latitude,
          p_longitude:position.coords.longitude,
          p_accuracy_m:position.coords.accuracy,
          p_heading:position.coords.heading,
          p_speed_mps:position.coords.speed,
        }).then(({error})=>{
          if(error&&!cancelled)setLocationStatus(friendlyError(error,'GPS update failed.'));
        });
      });
      if(cancelled)foregroundSubscription.remove();
    };

    void startTracking().catch(error=>{
      if(!cancelled)setLocationStatus(friendlyError(error,'Unable to start background GPS'));
    });
    return()=>{
      cancelled=true;
      foregroundSubscription?.remove();
    };
  },[activeOrderId]);


  useEffect(()=>{
    if(!available||activeOrderId)return;
    const heartbeat=setInterval(()=>{
      void supabase.rpc('goodies_set_courier_availability',{p_is_available:true,p_accepts_cash_on_delivery:acceptsCash});
    },60000);
    return()=>clearInterval(heartbeat);
  },[available,acceptsCash,activeOrderId]);

  const signOut=async()=>{
    if(activeOrderId){
      Alert.alert('Delivery in progress','Complete the active delivery before signing out so customer tracking is not interrupted.');
      return;
    }
    const {error}=await supabase.rpc('goodies_set_courier_availability',{p_is_available:false,p_accepts_cash_on_delivery:acceptsCash});
    if(error){Alert.alert('Could not go offline',friendlyError(error,'Please try again.'));return;}
    try {
      if(await Location.hasStartedLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK)){
        await Location.stopLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK);
      }
    } catch {}
    onSignOut();
  };

  const setPresence=async(next:boolean,cash=acceptsCash)=>{
    setBusy('presence');
    const {error}=await supabase.rpc('goodies_set_courier_availability',{p_is_available:next,p_accepts_cash_on_delivery:cash});
    if(error)Alert.alert('Availability not updated',friendlyError(error,'Please try again.'));else{setAvailable(next);setAcceptsCash(cash);}
    setBusy('');
  };
  const respond=async(orderId:string,accept:boolean)=>{
    setBusy(orderId);
    try {
      const {error}=await supabase.rpc('goodies_courier_respond_assignment',{p_order_id:orderId,p_accept:accept});
      if(error)throw error;
      await load();
    } catch(error) {Alert.alert('Could not refresh delivery response',friendlyError(error,'The response may have been saved. Refresh before retrying.'));}
    finally {setBusy('');}
  };
  const advance=async(orderId:string,status:'picked_up'|'delivered')=>{
    setBusy(orderId);
    try {
      const {error}=await supabase.rpc('goodies_courier_update_delivery_status',{p_order_id:orderId,p_status:status});
      if(error)throw error;
      await load();
    } catch(error) {Alert.alert('Could not refresh delivery status',friendlyError(error,'The update may have been saved. Refresh before retrying.'));}
    finally {setBusy('');}
  };

  return <View style={{flex:1,backgroundColor:'#F7F8F5'}}>
    <View style={{height:100,paddingHorizontal:20,paddingBottom:12,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#E3E8DF',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'}}>
      <View><Text style={{fontSize:20,fontWeight: "600",color:'#172316'}}>Goodies Courier</Text><Text style={{fontSize:11,color:'#667064'}}>Delivery assignments and live GPS</Text></View>
      <Pressable onPress={()=>void signOut()}><Text style={{fontSize:12,fontWeight: "600",color:'#52634F'}}>Sign out</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{padding:16,gap:12}}>
      <View style={{padding:15,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#DCE4D7',gap:10}}>
        <Text style={{fontSize:15,fontWeight: "600",color:'#1A2517'}}>Availability</Text>
        <Text style={{fontSize:12,color:'#5F6B5A'}}>Go online to receive Goodies delivery offers. GPS sharing starts after you accept and continues in the background while the delivery is active.</Text>
        <Pressable disabled={!!busy || !!activeOrderId} onPress={()=>void setPresence(!available)} style={{padding:13,borderRadius:12,backgroundColor:available?'#E8F4E8':'#F1F2EF',alignItems:'center'}}>
          <Text style={{fontWeight: "600",color:available?'#286A35':'#465044'}}>{busy==='presence'?'Saving…':activeOrderId?'Delivery in progress · GPS tracking active':available?'You are online · Tap to go offline':'Go online'}</Text>
        </Pressable>
        <Pressable disabled={!!busy||!available||!!activeOrderId} onPress={()=>void setPresence(available,!acceptsCash)} style={{paddingVertical:9,flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:13,color:'#263324'}}>I accept cash on delivery</Text><Text style={{fontSize:13,fontWeight: "600",color:acceptsCash?'#286A35':'#8A6250'}}>{acceptsCash?'ON':'OFF'}</Text>
        </Pressable>
        <Text style={{fontSize:11,color:'#697567'}}>{locationStatus}</Text>
      </View>
      <Text style={{fontSize:17,fontWeight: "600",color:'#1A2517'}}>My deliveries</Text>
      {loading?<ActivityIndicator/>:null}
      {!loading&&!deliveries.length?<View style={{padding:22,backgroundColor:'#fff',borderRadius:16,alignItems:'center'}}><Text style={{fontWeight: "600",color:'#263324'}}>No active delivery offers</Text><Text style={{fontSize:12,color:'#6B7568',marginTop:5}}>New offers will appear here when a store assigns you.</Text></View>:null}
      {deliveries.map(d=><View key={d.id} style={{padding:15,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#DCE4D7',gap:8}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight: "600",color:'#1A2517'}}>{d.order_code}</Text><Text style={{fontWeight: "600",color:'#426B39'}}>{d.status}</Text></View>
        <Text style={{fontSize:13,color:'#263324'}}> {String(d.address?.t||d.address?.address||'Delivery address unavailable')} </Text>
        <Text style={{fontSize:12,color:'#687264'}}>Customer: {d.contact_phone||'No phone'} · {d.payment_method==='cash'?'Cash on delivery':'Prepaid'}</Text>
        <Text style={{fontSize:13,fontWeight: "600",color:'#1A2517'}}>{money(d.total)}</Text>
        {d.status==='offered'?<View style={{flexDirection:'row',gap:8}}><Pressable disabled={!!busy} onPress={()=>void respond(d.order_id,true)} style={{flex:1,padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#28552B'}}>{busy===d.order_id?'Saving…':'Accept delivery'}</Text></Pressable><Pressable disabled={!!busy} onPress={()=>void respond(d.order_id,false)} style={{flex:1,padding:12,borderRadius:10,backgroundColor:'#F7ECEA',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#9B4036'}}>Decline</Text></Pressable></View>:null}
        {d.status==='accepted'?<Pressable disabled={!!busy} onPress={()=>void advance(d.order_id,'picked_up')} style={{padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#28552B'}}>Picked up order</Text></Pressable>:null}
        {d.status==='picked_up'?<Pressable disabled={!!busy} onPress={()=>void advance(d.order_id,'delivered')} style={{padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#28552B'}}>Mark delivered</Text></Pressable>:null}
      </View>)}
    </ScrollView>
  </View>;
}
