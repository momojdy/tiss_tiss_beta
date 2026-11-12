import React,{useEffect,useState} from 'react';
import {label} from '../content';
import {ActivityIndicator,Alert,Pressable,ScrollView,Share,View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {Bar,Card,Cta,Row,T,Ttl,useTheme} from '../components/ui';
import {S,STB,totals,money,navBack,emit,save,completeGoodiesCheckoutAttempt} from '../store';
import {placeOrder,go} from '../actions';
import {supabase} from '../../../lib/supabase';
import {cancelHelpPayRequest,fetchHelpPayStatus,helpPayQRValue,shareHelpPayToFriend} from '../helpPayApi';
import type {HelpPayMode,HelpPaySnapshot} from '../helpPayApi';

type Friend={id:string;name:string;avatar_url?:string|null};
const cents=(n:number)=>money((Number(n)||0)/100);
export function HelpPayPreview(){
 const th=useTheme();
 const id=typeof S.helpPayRequestId==='string'?S.helpPayRequestId:'';
 const [mode,setMode]=useState<HelpPayMode>('share');
 const [snapshot,setSnapshot]=useState<HelpPaySnapshot|null>(null);
 const [busy,setBusy]=useState(false);
 const [friends,setFriends]=useState<Friend[]>([]);
 const [shareBusy,setShareBusy]=useState<string|null>(null);
 const [now,setNow]=useState(Date.now());
 const [error,setError]=useState('');
 const total=Math.round(Number(totals().total||0)*100);
 const remaining=snapshot?.remaining_cents??Math.max(0,total-(mode==='share'?Math.ceil(total*0.6):0));
 const expires=snapshot?Math.max(0,Math.ceil((Date.parse(snapshot.expires_at)-now)/1000)):1800;
 const clock=`${Math.floor(expires/60)}:${String(expires%60).padStart(2,'0')}`;
 const funded=snapshot?(snapshot.initial_cents+snapshot.contributed_cents)/Math.max(1,snapshot.total_cents):0;
 const load=async(requestId:string)=>{
   try{const next=await fetchHelpPayStatus(requestId);setSnapshot(next);setError('');}
   catch(e:any){setError(e?.message||'Could not load this payment request');}
 };
 useEffect(()=>{if(!id){setSnapshot(null);return;}let alive=true;
   const poll=()=>{if(alive)void load(id);};
   poll();const timer=setInterval(poll,5000);
   return()=>{alive=false;clearInterval(timer);};
 },[id]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 // The order is created on the server by the last contributor, not in this
 // device's normal checkout flow. Materialize it in local Goodies Orders.
 useEffect(()=>{
   if(snapshot?.status!=='fulfilled'||!snapshot.order_id||S.orders.some((o:any)=>o.backendId===snapshot.order_id))return;
   let active=true;
   void(async()=>{
     const {data:row,error:orderError}=await supabase.from('goodies_orders')
       .select('id,order_code,store_id,order_type,address,contact_phone,items,subtotal,delivery_fee,service_fee,discount,tip,total,scheduled_for,created_at,status')
       .eq('id',snapshot.order_id!).maybeSingle();
     if(!active||orderError||!row||S.orders.some((o:any)=>o.backendId===row.id))return;
     const store=STB[row.store_id];
     const localOrder:any={
       id:row.order_code,backendId:row.id,serverStatus:row.status,sid:row.store_id,
       lines:Array.isArray(row.items)?row.items:[],
       sn:store?.n||'Goodies store',sub:Number(row.subtotal),fee:Number(row.delivery_fee),
       svc:Number(row.service_fee),disc:Number(row.discount),tip:Number(row.tip),
       total:Number(row.total),t0:new Date(row.created_at).getTime(),
       st:0,rated:0,cx:0,pk:row.order_type==='pickup',
       addr:row.address?.t||store?.n||'Goodies',ad:row.address||null,
       ph:row.contact_phone||'',phl:'Wantiss number',cid:'w',
       pay:'wallet',payl:'Wantiss Wallet · Help Pay',note:'',
       sch:row.scheduled_for?new Date(row.scheduled_for).getTime():0,promo:'',alc:null
     };
     S.orders.unshift(localOrder);
     // Clear only the cart that actually matches the funded order.
     const items=Array.isArray(row.items)?row.items:[];
     if(S.cart.sid===row.store_id&&S.cart.lines.length===items.length&&
       S.cart.lines.every((l:any,i:number)=>l.id===items[i]?.id&&Number(l.q)===Number(items[i]?.q))){
       S.cart={sid:null,lines:[]};S.promo='';S.tip=0;S.note='';S.sch=0;S.cs=0;
     }
     await completeGoodiesCheckoutAttempt(row.id);
     await save();emit();
   })();
   return()=>{active=false};
 },[snapshot?.status,snapshot?.order_id]);

 useEffect(()=>{if(!id)return;let alive=true;void(async()=>{
   const {data:{user}}=await supabase.auth.getUser();if(!user)return;
   const {data:relations,error:friendsError}=await supabase.from('user_friendships').select('requester_id,recipient_id,status').eq('status','accepted')
     .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
   if(friendsError||!alive)return;
   const ids=new Set((relations||[]).map((r:any)=>r.requester_id===user.id?r.recipient_id:r.requester_id));
   const {data:profiles}=await supabase.rpc('wantiss_message_contact_profiles');
   if(alive)setFriends((Array.isArray(profiles)?profiles:[]).filter((p:any)=>ids.has(p.id)).map((p:any)=>({
     id:p.id,name:p.full_name?.trim()||'Wantiss member',avatar_url:p.avatar_url||null
   })));
 })();return()=>{alive=false};},[id]);
 const create=async()=>{if(busy||total<=0)return;setBusy(true);try{await placeOrder(mode);}finally{setBusy(false);}};
 const sendFriend=async(friend:Friend)=>{if(!snapshot||shareBusy)return;setShareBusy(friend.id);try{
   await shareHelpPayToFriend(snapshot.id,friend.id);
   Alert.alert('Sent in Wantiss','The Help Pay card was sent to '+friend.name+'. They can tap it in Messages to pay.');
 }catch(e:any){Alert.alert('Could not share',e?.message||'Please try again.');}finally{setShareBusy(null);}};
 const nativeShare=async()=>{if(!snapshot)return;try{await Share.share({
   message:`Help me pay for my Goodies order on Wantiss. ${cents(snapshot.remaining_cents)} remaining. ${helpPayQRValue(snapshot.id)}`,
 });}catch(e:any){Alert.alert('Could not share',e?.message||'Try again.');}};
 const cancel=()=>{if(!snapshot)return;Alert.alert('Cancel Help Pay?','All reserved Wallet contributions, including your upfront share, will be refunded.',[
   {text:'Keep request',style:'cancel'},{text:'Cancel and refund',style:'destructive',onPress:()=>{void(async()=>{setBusy(true);try{
     await cancelHelpPayRequest(snapshot.id);await load(snapshot.id);
     Alert.alert('Cancelled','All contributions have been returned to the Wallets that paid.');
   }catch(e:any){Alert.alert('Unable to cancel',e?.message||'Please retry');}finally{setBusy(false);}})();}}
 ]);};
 const newCheckout=async()=>{S.helpPayRequestId=null;await completeGoodiesCheckoutAttempt('help-pay-resolved');await save();emit();go('checkout');};
 return <View style={{flex:1,backgroundColor:th.bg}}>
   <Bar title={label('lbl.helpPayTitle','Help Pay · Goodies')} onBack={()=>{navBack();emit();}}/>
   <ScrollView contentContainerStyle={{paddingHorizontal:20,paddingTop:18,paddingBottom:56,gap:15}}>
     {!id?<><T size={24} weight="600">{label('lbl.helpPayPayTogether', "Pay together.")}</T><T color={th.mut} size={13}>
       {label('lbl.helpPayExplainer', "Create a secure Wallet request for your Goodies checkout. Friends can pay by scanning your QR code or opening your Wantiss message.")}
     </T><Row style={{gap:8}}>
       {(['share','full'] as const).map(next=><Pressable key={next} onPress={()=>setMode(next)}
         style={{flex:1,paddingVertical:14,paddingHorizontal:10,borderRadius:14,borderWidth:1.5,
           borderColor:mode===next?th.br:th.line,backgroundColor:mode===next?th.brt:th.bg}}>
         <T size={13} weight="600" color={mode===next?th.br:th.ink} align="center">
           {next==='share'?'Share bill · 60/40':'Help me fully pay'}
         </T>
       </Pressable>)}</Row>
       <Card style={{borderRadius:20,padding:18}}>
         <Row sp><T weight="600">{label('lbl.helpPayYourGoodiesBill', "Your Goodies bill")}</T><T weight="600">{cents(total)}</T></Row>
         <Row sp style={{marginTop:12}}><T size={13}>{label('lbl.helpPayYouPayNow', "You pay now")}</T><T weight="600">{cents(mode==='share'?Math.ceil(total*0.6):0)}</T></Row>
         <Row sp style={{marginTop:9}}><T size={13}>{label('lbl.helpPayFriendsCanCover', "Friends can cover")}</T><T weight="600" color={th.br}>{cents(remaining)}</T></Row>
         <T size={12} color={th.mut} style={{marginTop:13}}>
           {mode==='share'?'Your 60% is reserved from your Wantiss Wallet before sharing. Friends choose any amount or percentage of the remaining 40%.':'One friend pays the full remaining bill through Wantiss Wallet.'}
         </T>
       </Card>
       <T color={th.mut} size={12}>{label('lbl.helpPayExpiresExplainer', "The request expires after 30 minutes. If it is not funded, every Wallet contribution is automatically refunded. The order is only created once the entire bill is paid.")}</T>
       <Cta label={busy?'Preparing secure request…':mode==='share'?`Pay ${cents(Math.ceil(total*0.6))} and create request`:'Create full-payment request'}
         disabled={busy||total<=0} onPress={()=>void create()}/>
       {busy?<ActivityIndicator color={th.br}/>:null}
     </>:<><Row sp>
       <View style={{flex:1}}><T size={23} weight="600">{snapshot?.status==='fulfilled'?'Order funded':snapshot?.status==='expired'?'Request expired':snapshot?.status==='cancelled'?'Request cancelled':'Help Pay is ready'}</T>
         <T color={th.mut} size={12} style={{marginTop:4}}>{label('lbl.helpPayGoodiesPrefix','Goodies · ')}{snapshot?.mode==='full'?'Full bill':'Share bill · 60/40'}</T>
       </View><T color={th.br} weight="600" size={12}>{clock}{label('lbl.helpPayLeftSuffix',' left')}</T>
     </Row>
       {error?<Card><T color={th.red}>{error}</T><Cta ghost label={label('lbl.helpPayRetry','Retry')} onPress={()=>void load(id)}/></Card>:null}
       {!snapshot&&!error?<ActivityIndicator color={th.br}/>:null}
       {snapshot?<><Card style={{borderRadius:20,padding:18}}>
         <Row sp><T weight="600">{label('lbl.helpPayGoodiesTotal', "Goodies total")}</T><T weight="600">{cents(snapshot.total_cents)}</T></Row>
         <Row sp style={{marginTop:11}}><T size={13}>{label('lbl.helpPayUpfrontShare', "Your upfront share")}</T><T size={13}>{cents(snapshot.initial_cents)}</T></Row>
         <Row sp style={{marginTop:9}}><T size={13}>{label('lbl.helpPayFriendsContributed', "Friends contributed")}</T><T size={13}>{cents(snapshot.contributed_cents)}</T></Row>
         <View style={{height:8,borderRadius:8,backgroundColor:th.soft,overflow:'hidden',marginTop:14}}>
           <View style={{height:8,width:`${Math.min(100,Math.max(0,funded*100))}%`,backgroundColor:th.br}}/>
         </View>
         <Row sp style={{marginTop:10}}><T size={12} color={th.mut}>{Math.round(funded*100)}{label('lbl.helpPayPercentFundedSuffix','% funded')}</T>
           <T size={13} weight="600" color={th.br}>{cents(snapshot.remaining_cents)}{label('lbl.helpPayRemainingSuffix',' remaining')}</T></Row>
       </Card>
       {snapshot.status==='active'&&expires>0?<><Card style={{alignItems:'center',borderRadius:20,padding:18}}>
         <T size={16} weight="600">{label('lbl.helpPayScanTitle', "Scan to help pay")}</T><T size={12} color={th.mut} style={{marginTop:5,marginBottom:14}}>{label('lbl.helpPayScanInstructions', "Scan using the Wantiss Wallet scanner")}</T>
         <View style={{backgroundColor:'#FFF',padding:15,borderRadius:14}}><QRCode value={helpPayQRValue(snapshot.id)} size={180} color="#1A2517" backgroundColor="#FFF"/></View>
         <Pressable onPress={()=>void nativeShare()} style={{marginTop:15,paddingVertical:12,paddingHorizontal:18,borderRadius:12,backgroundColor:th.brt}}>
           <T color={th.br} weight="600">{label('lbl.helpPayShareLink', "Share payment link")}</T>
         </Pressable>
       </Card>
       <Ttl>{label('lbl.helpPayShareInMessages', "Share in Wantiss Messages")}</Ttl>
       <Card style={{padding:12}}>{friends.length?friends.map(friend=>
         <Pressable key={friend.id} disabled={!!shareBusy} onPress={()=>void sendFriend(friend)}
           style={{paddingVertical:12,paddingHorizontal:6,borderBottomWidth:0.5,borderColor:th.line}}>
           <Row sp><T weight="600">{friend.name}</T><T weight="600" color={th.br}>{shareBusy===friend.id?'Sending…':'Send'}</T></Row>
         </Pressable>):<T color={th.mut} size={13}>{label('lbl.helpPayNoFriends', "No accepted friends yet. Add friends in Wantiss Messages, or share the payment link above.")}</T>}</Card>
       </>:null}
       {snapshot.is_creator&&Array.isArray(snapshot.contributors)&&snapshot.contributors.length?
         <Card><T weight="600">{label('lbl.helpPayContributorsTitle', "Who helped pay")}</T>
           {snapshot.contributors.map((person,i)=><Row key={person.user_id+'-'+i} sp style={{marginTop:11}}>
             <T>{person.name}</T><T weight="600">{cents(person.amount_cents)}</T>
           </Row>)}</Card>:null}
       {snapshot.status==='fulfilled'?<Card><T weight="600" color={th.br}>{label('lbl.helpPayConfirmed', "Payment confirmed · Order placed")}</T><T size={12} color={th.mut} style={{marginTop:8}}>{label('lbl.helpPayOrderSent', "The store has received your funded Goodies order.")}</T>
         <Cta label={label('lbl.helpPayViewOrders','View Goodies orders')} onPress={()=>go('orders')}/></Card>:null}
       {snapshot.status==='active'&&snapshot.is_creator?<Pressable disabled={busy} onPress={cancel} style={{paddingVertical:12,alignSelf:'flex-start'}}>
         <T color={th.red} weight="600">{label('lbl.helpPayCancelTitle', "Cancel request and refund everyone")}</T>
       </Pressable>:null}
       {(snapshot.status==='expired'||snapshot.status==='cancelled')&&snapshot.is_creator?
         <Cta ghost label={label('lbl.helpPayReturnCheckout','Return to checkout')} onPress={()=>void newCheckout()}/>:null}
       </>:null}
     </>}
   </ScrollView>
 </View>;
}
