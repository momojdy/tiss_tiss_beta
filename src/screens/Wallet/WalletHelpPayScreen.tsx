import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {supabase} from '../../lib/supabase';
import {contributeToHelpPay,fetchHelpPayStatus,validHelpPayId} from '../../features/Goodies/helpPayApi';
import type {HelpPaySnapshot} from '../../features/Goodies/helpPayApi';

type Props={requestId:string;onBack:()=>void};
const GREEN='#438C53',INK='#1A2517',MUTED='#63745E',BG='#F6FAF5';
const price=(cents:number)=>'$'+(Math.max(0,Number(cents)||0)/100).toFixed(2);
const key=()=> 'help-pay-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);

export default function WalletHelpPayScreen({requestId,onBack}:Props){
 const [request,setRequest]=useState<HelpPaySnapshot|null>(null),[loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[walletBalance,setWalletBalance]=useState<number|null>(null);
 const [mode,setMode]=useState<'percent'|'amount'>('percent'),[percent,setPercent]=useState('100'),[enteredAmount,setEnteredAmount]=useState('');
 const [receipt,setReceipt]=useState<string|null>(null),[now,setNow]=useState(Date.now());
 const pending=useRef<{key:string;amount:number}|null>(null);
 const load=async()=>{
   if(!validHelpPayId(requestId)){setError('Invalid Wantiss payment link');setLoading(false);return;}
   try{
     const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in to pay this request');
     const [snapshot,wallet]=await Promise.all([
       fetchHelpPayStatus(requestId),
       supabase.from('wallets').select('balance').eq('user_id',user.id).maybeSingle()
     ]);
     if(wallet.error)throw wallet.error;
     setWalletBalance(wallet.data?Number(wallet.data.balance):null);setRequest(snapshot);setError('');
   }catch(e:any){setError(e?.message||'Could not load the payment request');}
   finally{setLoading(false);}
 };
 useEffect(()=>{setLoading(true);setRequest(null);setReceipt(null);pending.current=null;void load();
  const timer=setInterval(()=>{void load();},5000);return()=>clearInterval(timer);
 },[requestId]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const remaining=request?.remaining_cents??0;
 const enteredPercent=Number(percent);
 const value=request?.mode==='full'?remaining:mode==='amount'?Math.round(Number(enteredAmount||0)*100):Math.round(remaining*enteredPercent/100);
 const valid=request&&request.status==='active'&&new Date(request.expires_at).getTime()>now
   &&Number.isSafeInteger(value)&&value>0&&value<=remaining
   &&(request.mode==='full'||(mode==='amount'||(enteredPercent>0&&enteredPercent<=100)));
 const seconds=request?Math.max(0,Math.ceil((new Date(request.expires_at).getTime()-now)/1000)):0;
 const confirm=()=>{
   if(!valid||busy||!request)return;
   if(walletBalance===null)return Alert.alert('Wallet required','Create a Wantiss Wallet before paying this request.');
   if(walletBalance*100+0.0001<value)return Alert.alert('Insufficient Wallet balance','Add money to your Wantiss Wallet before contributing.');
   Alert.alert('Confirm Help Pay contribution',
    'Pay '+price(value)+' from your Wantiss Wallet for this Goodies order? This payment is reserved until the order is fully funded or refunded.',
    [{text:'Not now',style:'cancel'},{
      text:'Pay '+price(value),onPress:()=>{void(async()=>{
        setBusy(true);
        try{
          if(!pending.current||pending.current.amount!==value)pending.current={key:key(),amount:value};
          const result=await contributeToHelpPay(requestId,value,pending.current.key);
          if(result.ok){setReceipt(result.status==='fulfilled'?'Your contribution completed the order.':'Your contribution was reserved. The order will be placed when fully funded.');}
          else {setReceipt(null);Alert.alert('Payment refunded',result.message||'This request could not be finalized. Your Wallet has been refunded.');}
          pending.current=null;
          await load();
        }catch(e:any){
          Alert.alert('Payment not confirmed',e?.message||'Please check Wallet activity before trying again.');
          // Keep the same idempotency key for retries until a new amount is chosen.
          await load();
        }finally{setBusy(false);}
      })();}
    }]
   );
 };
 return <View style={s.page}>
   <View style={s.header}>
     <Pressable accessibilityLabel="Back" onPress={onBack} style={s.back}><MaterialCommunityIcons name="arrow-left" size={24} color={INK}/></Pressable>
     <Text style={s.heading}>Help Pay · Goodies</Text>
   </View>
   <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
     <View style={s.hero}>
       <View style={s.icon}><MaterialCommunityIcons name="account-group-outline" size={27} color={GREEN}/></View>
       <Text style={s.title}>Help pay a Goodies bill</Text>
       <Text style={s.subtitle}>A secure Wantiss request. Your payment goes directly toward the original customer's order.</Text>
     </View>
     {loading?<ActivityIndicator color={GREEN} size="large"/>:null}
     {!!error?<View style={s.card}><Text style={s.error}>{error}</Text><Pressable onPress={()=>{void load();}} style={s.outline}><Text style={s.outlineText}>Retry</Text></Pressable></View>:null}
     {request?<><View style={s.card}>
       <Text style={s.caption}>BILL SUMMARY</Text>
       <View style={s.row}><Text style={s.label}>Goodies bill</Text><Text style={s.total}>{price(request.total_cents)}</Text></View>
       <View style={s.row}><Text style={s.label}>Already funded</Text><Text style={s.value}>{price(request.total_cents-remaining)}</Text></View>
       <View style={s.progress}><View style={[s.progressActive,{width:`${Math.max(0,Math.min(100,100*(request.total_cents-remaining)/Math.max(1,request.total_cents)))}%`}]}/></View>
       <View style={s.row}><Text style={s.label}>Still needed</Text><Text style={s.totalGreen}>{price(remaining)}</Text></View>
       <View style={s.row}><Text style={s.label}>Expires in</Text><Text style={s.value}>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</Text></View>
     </View>
     {request.is_creator?<View style={s.notice}><MaterialCommunityIcons name="information-outline" color={GREEN} size={20}/><Text style={s.noticeText}>This is your own request. Share your QR or message card with friends; you cannot pay yourself.</Text></View>:null}
     {request.status!=='active'||seconds<=0?<View style={s.card}>
       <Text style={s.title}>{request.status==='fulfilled'?'Order fully funded':request.status==='cancelled'?'Request cancelled':request.status==='expired'||seconds<=0?'Request expired':'Not accepting payments'}</Text>
       <Text style={s.subtitle}>No new payments can be accepted. Any expired or cancelled contributions are returned to their original Wallets.</Text>
     </View>:!request.is_creator?<><View style={s.card}>
       <Text style={s.caption}>YOUR CONTRIBUTION</Text>
       {request.mode==='share'?<>
         <Text style={s.label}>Choose a percentage of the remaining bill</Text>
         <View style={s.percentRow}>{[10,25,50,75,100].map(p=><Pressable key={p} onPress={()=>{setMode('percent');setPercent(String(p));pending.current=null;}}
           style={[s.chip,mode==='percent'&&percent===String(p)&&s.chipSelected]}><Text style={[s.chipText,mode==='percent'&&percent===String(p)&&s.chipTextSelected]}>{p}%</Text></Pressable>)}</View>
         <View style={s.row}><Pressable onPress={()=>{setMode('percent');pending.current=null;}} style={{flex:1}}><Text style={s.label}>Custom percentage (%)</Text></Pressable>
           <TextInput accessibilityLabel="Custom percentage" value={percent} onChangeText={v=>{setMode('percent');setPercent(v);pending.current=null;}} keyboardType="decimal-pad" style={s.smallInput} placeholder="25" /></View>
         <View style={s.row}><Pressable onPress={()=>{setMode('amount');pending.current=null;}} style={{flex:1}}><Text style={s.label}>Or exact amount (USD)</Text></Pressable>
           <TextInput accessibilityLabel="Custom contribution amount" value={enteredAmount} onChangeText={v=>{setMode('amount');setEnteredAmount(v);pending.current=null;}} keyboardType="decimal-pad" style={s.smallInput} placeholder="0.00" /></View>
       </>:<Text style={s.subtitle}>This request requires one person to cover the entire unpaid bill.</Text>}
       {!valid?<Text style={s.error}>Choose an amount between $0.01 and {price(remaining)}.</Text>:null}
       <View style={s.separator}/>
       <View style={s.row}><Text style={s.label}>You will pay</Text><Text style={s.payAmount}>{price(valid?value:0)}</Text></View>
       <View style={s.row}><Text style={s.label}>Wallet balance</Text><Text style={s.value}>{walletBalance===null?'Wallet not available':'$'+walletBalance.toFixed(2)}</Text></View>
       <Pressable accessibilityRole="button" disabled={!valid||busy||walletBalance===null||walletBalance*100+0.0001<value} onPress={confirm} style={[s.primary,(!valid||busy||walletBalance===null||walletBalance*100+0.0001<value)&&s.disabled]}>
         {busy?<ActivityIndicator color="#FFF"/>:<MaterialCommunityIcons name="wallet-outline" size={20} color="#FFF"/>}
         <Text style={s.primaryText}>{busy?'Confirming…':'Pay '+price(valid?value:0)}</Text>
       </Pressable>
       <Text style={s.helper}>Payments are debited exactly once and automatically refunded if the order cannot be fulfilled.</Text>
     </View></>:null}
     {!!receipt?<View style={s.success}><MaterialCommunityIcons name="check-circle" size={24} color={GREEN}/><Text style={s.noticeText}>{receipt}</Text></View>:null}
     {request.my_contributed_cents>0?<View style={s.notice}><MaterialCommunityIcons name="check-circle-outline" size={21} color={GREEN}/><Text style={s.noticeText}>Your Wallet contributions: {price(request.my_contributed_cents)}</Text></View>:null}
     </>:null}
   </ScrollView>
 </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:BG},header:{height:94,paddingTop:35,paddingHorizontal:15,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:'#E1ECDD'},
 back:{width:42,height:42,alignItems:'center',justifyContent:'center'},heading:{fontSize:18,fontWeight:'700',color:INK},
 content:{padding:17,paddingBottom:65,gap:14},hero:{backgroundColor:'#ECF7EB',borderRadius:22,padding:23,alignItems:'center'},icon:{width:54,height:54,borderRadius:18,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center'},
 title:{fontSize:19,fontWeight:'800',color:INK,textAlign:'center',marginTop:10},subtitle:{fontSize:13,color:MUTED,textAlign:'center',marginTop:8,lineHeight:19},
 card:{backgroundColor:'#FFF',borderRadius:19,padding:19,borderWidth:1,borderColor:'#E0ECDB',gap:12},
 caption:{fontSize:11,fontWeight:'800',color:GREEN,letterSpacing:1.2},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
 label:{fontSize:13,color:MUTED,flexShrink:1},value:{fontSize:14,fontWeight:'700',color:INK},total:{fontSize:21,fontWeight:'800',color:INK},totalGreen:{fontSize:20,fontWeight:'800',color:GREEN},
 progress:{height:9,borderRadius:9,backgroundColor:'#EAF2E7',overflow:'hidden'},progressActive:{height:9,backgroundColor:GREEN},
 percentRow:{flexDirection:'row',gap:6,flexWrap:'wrap',marginTop:7,marginBottom:4},chip:{flexGrow:1,paddingHorizontal:9,paddingVertical:11,borderRadius:12,backgroundColor:BG,borderWidth:1,borderColor:'#DEEBDB',alignItems:'center'},
 chipSelected:{backgroundColor:'#E2F1E0',borderColor:GREEN},chipText:{fontSize:12,fontWeight:'700',color:INK},chipTextSelected:{color:GREEN},
 smallInput:{width:102,borderWidth:1,borderColor:'#D7E5D3',borderRadius:11,paddingVertical:9,paddingHorizontal:9,fontSize:16,fontWeight:'700',textAlign:'right',color:INK},
 separator:{borderBottomWidth:1,borderColor:'#E5EEE1',marginVertical:2},payAmount:{fontSize:25,fontWeight:'800',color:GREEN},
 primary:{minHeight:53,backgroundColor:GREEN,borderRadius:14,flexDirection:'row',gap:9,alignItems:'center',justifyContent:'center',marginTop:6},disabled:{opacity:.45},
 primaryText:{fontSize:16,fontWeight:'800',color:'#FFF'},helper:{fontSize:11,lineHeight:17,color:MUTED,textAlign:'center'},error:{fontSize:13,color:'#C33C43'},
 notice:{backgroundColor:'#ECF7EB',borderRadius:14,padding:14,flexDirection:'row',gap:9,alignItems:'center'},noticeText:{fontSize:12,lineHeight:18,color:'#315B37',flex:1},
 success:{backgroundColor:'#ECF7EB',borderRadius:14,padding:13,flexDirection:'row',gap:10,alignItems:'center'},
 outline:{borderRadius:12,borderWidth:1,borderColor:GREEN,alignItems:'center',padding:11,marginTop:7},outlineText:{color:GREEN,fontWeight:'700'}
});
