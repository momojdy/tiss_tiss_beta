import {label, loadContent, onContent} from "./content";
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, AppState, Pressable, ScrollView, Text, View} from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {GOODIES_COURIER_LOCATION_TASK} from './goodiesCourierBackgroundLocation';
import {supabase} from '../../lib/supabase';
import {S, money, emit} from './store';
import {wantissLocale} from '../../lib/locales';
import {friendlyError} from './friendlyError';
import {createGoodiesRefresh} from './refreshScope';
import {freshGpsSample} from './deliveryTracking';

type Delivery = {
  id:string; order_id:string; status:string; order_code:string; address:any; contact_phone:string|null;
  items:any[]; total:number; payment_method:string; payment_status:string; business_id:string;
};

export default function GoodiesCourierScreen({onSignOut}:{onSignOut:()=>void}) {
  const [,refreshContent]=useState(0);
  const [uid,setUid]=useState('');
  const [available,setAvailable]=useState(false);
  const [acceptsCash,setAcceptsCash]=useState(false);
  const [deliveries,setDeliveries]=useState<Delivery[]>([]);
  const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState(false);
  const owner=useRef(''), mounted=useRef(true), mutation=useRef<object|null>(null);
  const reader=useRef<ReturnType<typeof createGoodiesRefresh>|null>(null);
  useEffect(()=>{
    mounted.current=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      const id=session?.user?.id||'';
      if(owner.current!==id){owner.current=id;setUid(id);setDeliveries([]);setAvailable(false);setAcceptsCash(false);setLoading(true);setLoadError(false);setBusy('');mutation.current=null;}
    });
    return()=>{mounted.current=false;subscription.unsubscribe();};
  },[]);
  const [locationStatus,setLocationStatus]=useState(label("lbl.page.GoodiesCourierScreen.9ea62e5a2d", "Location sharing is off"));

  useEffect(()=>{
    const stop=onContent(()=>{
      refreshContent(value=>value+1);
      setLocationStatus(current=>current==='Location sharing is off'?label('lbl.page.GoodiesCourierScreen.9ea62e5a2d','Location sharing is off'):current);
    });
    void loadContent();
    const foreground=AppState.addEventListener('change',state=>{if(state==='active')void loadContent();});
    return()=>{stop();foreground.remove();};
  },[]);
  useEffect(()=>{
    if(!uid)return;
    let active=true;
    void Promise.resolve(supabase.from('user_settings').select('language').eq('user_id',uid).maybeSingle().then(({data,error})=>{
      if(active&&!error){S.lang=wantissLocale(data?.language);emit();refreshContent(value=>value+1);}
    })).catch(()=>{});
    return()=>{active=false;};
  },[uid]);

  const load=useCallback(async()=>{await reader.current?.refresh();},[]);

  useEffect(()=>{
    const scope=createGoodiesRefresh({
      current:()=>mounted.current&&owner.current===uid,
      state:status=>{setLoading(status==='loading');setLoadError(status==='error');},
      read:async()=>{
        const expectedOwner=owner.current;
        const {data:user,error:authError}=await supabase.auth.getUser();
        if(authError)throw authError;
        if(!user.user)throw new Error('Sign in required');
        if(!mounted.current||owner.current!==expectedOwner)return null;
        if(owner.current!==user.user.id){owner.current=user.user.id;setUid(user.user.id);return null;}
        const {data:presence,error:presenceError}=await supabase.from('goodies_courier_presence').select('is_available,accepts_cash_on_delivery').eq('courier_id',user.user.id).maybeSingle();
        if(presenceError)throw presenceError;
        if(!mounted.current||owner.current!==expectedOwner)return null;
        const {data:orders,error}=await supabase.rpc('goodies_courier_orders');
        if(error||!Array.isArray(orders))throw error||new Error('Deliveries unavailable');
        return {presence,orders};
      },
      commit:result=>{if(result){setAvailable(!!result.presence?.is_available);setAcceptsCash(!!result.presence?.accepts_cash_on_delivery);setDeliveries((result.orders||[]) as Delivery[]);}},
    });
    reader.current=scope;void scope.refresh();
    const ch=supabase.channel('goodies-courier-work-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'goodies_delivery_assignments',filter:uid?'courier_id=eq.'+uid:'courier_id=eq.00000000-0000-0000-0000-000000000000'},(payload:any)=>{if(payload.eventType==='INSERT'||payload.eventType==='DELETE'||payload.new?.status!==payload.old?.status)void scope.refresh();}).subscribe();
    const poll=setInterval(()=>{if(AppState.currentState==='active')void scope.refresh();},30000);
    const appState=AppState.addEventListener('change',state=>{if(state==='active')void scope.refresh();});
    return()=>{scope.stop();if(reader.current===scope)reader.current=null;clearInterval(poll);appState.remove();void supabase.removeChannel(ch);};
  },[uid]);

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
      if(!cancelled)setLocationStatus(label("lbl.page.GoodiesCourierScreen.c5dd75349b", "Location sharing stops when no delivery is active"));
    };

    const startTracking=async()=>{
      if(!activeOrderId){await stopWhenNoActiveDelivery();return;}
      const foreground=await Location.requestForegroundPermissionsAsync();
      if(cancelled)return;
      if(!foreground.granted){
        if(!cancelled)setLocationStatus(label("lbl.page.GoodiesCourierScreen.22a7f353b4", "Allow location access to track your active delivery."));
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
                  notificationTitle:label("lbl.page.GoodiesCourierScreen.dc28ca1956", "Wantiss delivery tracking is active"),
                  notificationBody:label("lbl.page.GoodiesCourierScreen.5adac531a4", "Your live location is shared with the customer for this delivery."),
                  killServiceOnDestroy:false,
                },
              });
            }
            backgroundStarted=true;
          } else if(!cancelled) {
            setLocationStatus(label("lbl.page.GoodiesCourierScreen.5800646f2b", "Background permission was not granted. Live GPS works only while Wantiss is open."));
          }
        } catch (backgroundError:any) {
          if(!cancelled)setLocationStatus(label("lbl.page.GoodiesCourierScreen.82058ce156", "Background GPS is unavailable in this app build. Live GPS will continue while Wantiss is open."));
        }
      } else if(!cancelled) {
        setLocationStatus(label("lbl.page.GoodiesCourierScreen.e769b32cb8", "Foreground GPS only in Expo Go. A Wantiss development build is required for background tracking."));
      }
      if(backgroundStarted){
        if(!cancelled)setLocationStatus(label("lbl.page.GoodiesCourierScreen.762dfff7c0", "Background GPS active · location sharing continues when you switch apps or lock your phone"));
        return;
      }

      if(cancelled)return;
      foregroundSubscription=await Location.watchPositionAsync({
        accuracy:Location.Accuracy.High,
        timeInterval:5000,
        distanceInterval:15,
      },position=>{
        if(cancelled)return;
        if(!freshGpsSample(position)){setLocationStatus(label("lbl.page.GoodiesCourierScreen.01753bced3", "Waiting for a fresh GPS location."));return;}
        void Promise.resolve(supabase.rpc('goodies_courier_update_location',{
          p_order_id:activeOrderId,
          p_latitude:position.coords.latitude,
          p_longitude:position.coords.longitude,
          p_accuracy_m:position.coords.accuracy,
          p_heading:position.coords.heading,
          p_speed_mps:position.coords.speed,
        })).then(({error})=>{
          if(error&&!cancelled)setLocationStatus(friendlyError(error,label("lbl.cms.809e99644369", "GPS update failed.")));
        }).catch(()=>{if(!cancelled)setLocationStatus(label('lbl.cms.809e99644369', 'GPS update failed.'));});
      });
      if(cancelled)foregroundSubscription.remove();
    };

    void startTracking().catch(error=>{
      if(!cancelled)setLocationStatus(friendlyError(error,label("lbl.cms.87e2d9bf2774", "Unable to start background GPS")));
    });
    return()=>{
      cancelled=true;
      foregroundSubscription?.remove();
    };
  },[activeOrderId]);


  useEffect(()=>{
    if(!available||activeOrderId)return;
    const userId=owner.current;
    const heartbeat=setInterval(()=>{
      void Promise.resolve(supabase.rpc('goodies_set_courier_availability',{p_is_available:true,p_accepts_cash_on_delivery:acceptsCash})).then(({error})=>{if(error&&mounted.current&&owner.current===userId)setLoadError(true);}).catch(()=>{if(mounted.current&&owner.current===userId)setLoadError(true);});
    },60000);
    return()=>clearInterval(heartbeat);
  },[available,acceptsCash,activeOrderId]);

  const signOut=async()=>{
    if(activeOrderId){
      Alert.alert(label("lbl.cms.a56cc2117fd5", "Delivery in progress"),label("lbl.cms.9694ac7e3bc7", "Complete the active delivery before signing out so customer tracking is not interrupted."));
      return;
    }
    if(mutation.current)return;
    const token={},userId=owner.current;mutation.current=token;setBusy('signout');
    try {
    const {error}=await supabase.rpc('goodies_set_courier_availability',{p_is_available:false,p_accepts_cash_on_delivery:acceptsCash});
    if(!mounted.current||owner.current!==userId)return;
    if(error){Alert.alert(label("lbl.cms.2e6f98d92bd3", "Could not go offline"),friendlyError(error,label("lbl.cms.89e524601f0d", "Please try again.")));return;}
    try {
      if(await Location.hasStartedLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK)){
        await Location.stopLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK);
      }
    } catch {}
    if(mounted.current&&owner.current===userId)onSignOut();
    }catch(error){if(mounted.current&&owner.current===userId)Alert.alert(label('lbl.cms.2e6f98d92bd3', 'Could not go offline'),friendlyError(error,label('lbl.cms.89e524601f0d', 'Please try again.')));}
    finally{if(mutation.current===token)mutation.current=null;if(mounted.current&&owner.current===userId)setBusy('');}
  };

  const setPresence=async(next:boolean,cash=acceptsCash)=>{
    if(mutation.current)return;
    const token={},userId=owner.current;mutation.current=token;setBusy('presence');
    try{
      const {error}=await supabase.rpc('goodies_set_courier_availability',{p_is_available:next,p_accepts_cash_on_delivery:cash});
      if(error)throw error;
      if(mounted.current&&owner.current===userId){setAvailable(next);setAcceptsCash(cash);}
    }catch(error){if(mounted.current&&owner.current===userId)Alert.alert(label('lbl.cms.0de16b1a1542', 'Availability not updated'),friendlyError(error,label('lbl.cms.89e524601f0d', 'Please try again.')));}
    finally{if(mutation.current===token)mutation.current=null;if(mounted.current&&owner.current===userId)setBusy('');}
  };
  const respond=async(orderId:string,accept:boolean)=>{
    if(mutation.current)return;
    const token={},userId=owner.current;mutation.current=token;setBusy(orderId);
    try {
      const {error}=await supabase.rpc('goodies_courier_respond_assignment',{p_order_id:orderId,p_accept:accept});
      if(error)throw error;
      if(mounted.current&&owner.current===userId)await load();
    } catch(error) {if(mounted.current&&owner.current===userId)Alert.alert(label("lbl.page.GoodiesCourierScreen.f37119df43", "Could not refresh delivery response"),friendlyError(error,label("lbl.page.GoodiesCourierScreen.9716bbbf48", "The response may have been saved. Refresh before retrying.")));}
    finally {if(mutation.current===token)mutation.current=null;if(mounted.current&&owner.current===userId)setBusy('');}
  };
  const advance=async(orderId:string,status:'picked_up'|'delivered')=>{
    if(mutation.current)return;
    const token={},userId=owner.current;mutation.current=token;setBusy(orderId);
    try {
      const {error}=await supabase.rpc('goodies_courier_update_delivery_status',{p_order_id:orderId,p_status:status});
      if(error)throw error;
      if(mounted.current&&owner.current===userId)await load();
    } catch(error) {if(mounted.current&&owner.current===userId)Alert.alert(label("lbl.page.GoodiesCourierScreen.66000cc67d", "Could not refresh delivery status"),friendlyError(error,label("lbl.page.GoodiesCourierScreen.ccaf4d36ba", "The update may have been saved. Refresh before retrying.")));}
    finally {if(mutation.current===token)mutation.current=null;if(mounted.current&&owner.current===userId)setBusy('');}
  };

  return <View style={{flex:1,backgroundColor:'#F7F8F5'}}>
    <View style={{height:100,paddingHorizontal:20,paddingBottom:12,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#E3E8DF',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'}}>
      <View><Text style={{fontSize:20,fontWeight: "600",color:'#172316'}}>{label("lbl.cms.1c37cd1c523e", "Goodies Courier")}</Text><Text style={{fontSize:11,color:'#667064'}}>{label("lbl.cms.7961892a1ae8", "Delivery assignments and live GPS")}</Text></View>
      <Pressable disabled={!!busy} onPress={()=>void signOut()}><Text style={{fontSize:12,fontWeight: "600",color:'#52634F'}}>{label("lbl.cms.7169f4af4373", "Sign out")}</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{padding:16,gap:12}}>
      <View style={{padding:15,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#DCE4D7',gap:10}}>
        <Text style={{fontSize:15,fontWeight: "600",color:'#1A2517'}}>{label("lbl.cms.4670a8753b97", "Availability")}</Text>
        <Text style={{fontSize:12,color:'#5F6B5A'}}>{label("lbl.cms.923b004405b0", "Go online to receive Goodies delivery offers. GPS sharing starts after you accept and continues in the background while the delivery is active.")}</Text>
        <Pressable disabled={!!busy || !!activeOrderId || loading || loadError} onPress={()=>void setPresence(!available)} style={{padding:13,borderRadius:12,backgroundColor:available?'#E8F4E8':'#F1F2EF',alignItems:'center'}}>
          <Text style={{fontWeight: "600",color:available?'#286A35':'#465044'}}>{busy==='presence'?label("lbl.cms.ea052535e65e", "Saving…"):activeOrderId?label("lbl.cms.a56cc2117fd5", "Delivery in progress"):available?label("lbl.cms.e0c1f42dae8c", "You are online · Tap to go offline"):label("lbl.cms.d3055d65ac25", "Go online")}</Text>
        </Pressable>
        <Pressable disabled={!!busy||!available||!!activeOrderId||loading||loadError} onPress={()=>void setPresence(available,!acceptsCash)} style={{paddingVertical:9,flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:13,color:'#263324'}}>{label("lbl.cms.09ae3d36c166", "I accept cash on delivery")}</Text><Text style={{fontSize:13,fontWeight: "600",color:acceptsCash?'#286A35':'#8A6250'}}>{acceptsCash?label("lbl.cms.8f4b0527a23c", "ON"):label("lbl.cms.6cde4afa422f", "OFF")}</Text>
        </Pressable>
        <Text style={{fontSize:11,color:'#697567'}}>{locationStatus}</Text>
      </View>
      <Text style={{fontSize:17,fontWeight: "600",color:'#1A2517'}}>{label("lbl.cms.9ed6a2aa1cf9", "My deliveries")}</Text>
      {loading?<ActivityIndicator/>:null}
      {loadError?<View style={{padding:16,backgroundColor:'#fff',borderRadius:16,gap:10}}><Text style={{color:'#9B4036'}}>{label('lbl.cms.ce9c4301c916', 'Could not load deliveries')}</Text><Pressable accessibilityRole="button" onPress={()=>void load()}><Text style={{fontWeight:'600',color:'#426B39'}}>{label('lbl.retry', 'Try again')}</Text></Pressable></View>:null}
      {!loading&&!loadError&&!deliveries.length?<View style={{padding:22,backgroundColor:'#fff',borderRadius:16,alignItems:'center'}}><Text style={{fontWeight: "600",color:'#263324'}}>{label("lbl.cms.6ddb87eb71b2", "No active delivery offers")}</Text><Text style={{fontSize:12,color:'#6B7568',marginTop:5}}>{label("lbl.cms.4b8df09e4dfe", "New offers will appear here when a store assigns you.")}</Text></View>:null}
      {deliveries.map(d=><View key={d.id} style={{padding:15,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#DCE4D7',gap:8}}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight: "600",color:'#1A2517'}}>{d.order_code}</Text><Text style={{fontWeight: "600",color:'#426B39'}}>{d.status}</Text></View>
        <Text style={{fontSize:13,color:'#263324'}}> {String(d.address?.t||d.address?.address||label("lbl.page.GoodiesCourierScreen.c8c91e20b0", "Delivery address unavailable"))} </Text>
        <Text style={{fontSize:12,color:'#687264'}}>{label("lbl.cms.1e2ac2ca5391", "Customer: ")}{d.contact_phone||label("lbl.cms.846f347b830b", "No phone")} · {d.payment_method==='cash'?label("lbl.cms.3942099232a3", "Cash on delivery"):label("lbl.cms.74ebf31a8487", "Prepaid")}</Text>
        <Text style={{fontSize:13,fontWeight: "600",color:'#1A2517'}}>{money(d.total)}</Text>
        {d.status==='offered'?<View style={{flexDirection:'row',gap:8}}><Pressable disabled={!!busy} onPress={()=>void respond(d.order_id,true)} style={{flex:1,padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#28552B'}}>{busy===d.order_id?label("lbl.cms.ea052535e65e", "Saving…"):label("lbl.cms.3e82f7a82e08", "Accept delivery")}</Text></Pressable><Pressable disabled={!!busy} onPress={()=>void respond(d.order_id,false)} style={{flex:1,padding:12,borderRadius:10,backgroundColor:'#F7ECEA',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#9B4036'}}>{label("lbl.cms.19a9e614842b", "Decline")}</Text></Pressable></View>:null}
        {d.status==='accepted'?<Pressable disabled={!!busy} onPress={()=>void advance(d.order_id,'picked_up')} style={{padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#28552B'}}>{label("lbl.cms.2ca6e6a547c5", "Picked up order")}</Text></Pressable>:null}
        {d.status==='picked_up'?<Pressable disabled={!!busy} onPress={()=>void advance(d.order_id,'delivered')} style={{padding:12,borderRadius:10,backgroundColor:'#E7F2E5',alignItems:'center'}}><Text style={{fontWeight: "600",color:'#28552B'}}>{label("lbl.cms.af35acfc4f83", "Mark delivered")}</Text></Pressable>:null}
      </View>)}
    </ScrollView>
  </View>;
}
