import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {Icon} from '../../features/Goodies/components/Icon';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {supabase} from '../../lib/supabase';

type Visibility='public'|'friends'|'private';
type Prefs={discover_phone:boolean;discover_wantiss_id:boolean;discover_email:boolean;discover_qr:boolean;show_last_seen:boolean;show_read_receipts:boolean;moments_visibility:Visibility;membership_visibility:'public'|'private';livestream_visibility:Visibility};
const DEFAULT:Prefs={discover_phone:true,discover_wantiss_id:true,discover_email:true,discover_qr:true,show_last_seen:false,show_read_receipts:true,moments_visibility:'friends',membership_visibility:'private',livestream_visibility:'public'};
export default function ProfilePrivacyScreen({onBack}:{onBack:()=>void}){
 const insets=useSafeAreaInsets();const [prefs,setPrefs]=useState<Prefs>(DEFAULT);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;void(async()=>{try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Sign in to manage permissions');const {data,error}=await supabase.from('user_profile_visibility').select('*').eq('user_id',user.id).maybeSingle();if(error)throw error;if(active&&data)setPrefs({...DEFAULT,...Object.fromEntries(Object.keys(DEFAULT).filter(k=>data[k]!=null).map(k=>[k,data[k]]))} as Prefs);}catch(e){Alert.alert('Permissions unavailable',e instanceof Error?e.message:'Try again');}finally{if(active)setLoading(false)}})();return()=>{active=false}},[]);
 const update=<K extends keyof Prefs>(key:K,value:Prefs[K])=>setPrefs(prev=>({...prev,[key]:value}));
 const save=async()=>{setSaving(true);try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Sign in again');const {error}=await supabase.from('user_profile_visibility').upsert({...prefs,user_id:user.id,membership_visibility_confirmed:true,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;if(prefs.show_last_seen){const {error:presenceError}=await supabase.rpc('wantiss_message_heartbeat');if(presenceError)console.warn('Last seen presence failed:',presenceError.message);}Alert.alert('Saved','Your permissions have been updated.');}catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again');}finally{setSaving(false)}};
 const toggle=(key:keyof Pick<Prefs,'discover_phone'|'discover_wantiss_id'|'discover_email'|'discover_qr'|'show_last_seen'|'show_read_receipts'>,title:string,detail:string)=><View style={styles.row}><View style={{flex:1}}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.detail}>{detail}</Text></View><Switch value={prefs[key]} onValueChange={v=>update(key,v)} trackColor={{false:'#DAD8DE',true:'#E9B5DD'}} thumbColor={prefs[key]?'#BF008E':'#FFFFFF'}/></View>;
 const choices=(key:'moments_visibility'|'membership_visibility',items:{value:string;label:string}[])=><View>{items.map(o=><Pressable key={o.value} onPress={()=>update(key,o.value as never)} style={styles.row}><Text style={styles.rowTitle}>{o.label}</Text><Text style={{fontSize:22,color:prefs[key]===o.value?'#BF008E':'#AAA'}}>{prefs[key]===o.value?'◉':'○'}</Text></Pressable>)}</View>;
 return <View style={styles.page}><View style={[styles.header,{paddingTop:insets.top+8}]}><Pressable onPress={onBack} hitSlop={12} style={styles.back}><Icon name="chevL" size={20} color="#111"/></Pressable><Text style={styles.title}>Permissions & Privacy</Text></View><ScrollView contentContainerStyle={styles.content}>{loading?<ActivityIndicator color="#BF008E" style={{marginTop:40}}/>:<>
 <Text style={styles.heading}>Account discovery</Text><Text style={styles.subtitle}>Choose how other Wantiss members can find you.</Text>
 {toggle('discover_phone','Phone number','Allow people to find you by phone')}
 {toggle('discover_wantiss_id','Wantiss ID','Allow searches using your Wantiss ID')}
 {toggle('discover_email','Email address','Allow people to find you by email')}
 {toggle('discover_qr','Personal QR code','Allow others to discover you by scanning')}
 <Text style={styles.heading}>Moments privacy</Text><Text style={styles.subtitle}>Control who can see your posts and Moments.</Text>
 {choices('moments_visibility',[{value:'public',label:'Public: Everyone on Wantiss'},{value:'friends',label:'Friends only'},{value:'private',label:'Private: Only me'}])}
 <Text style={styles.heading}>Membership privacy</Text>
 {choices('membership_visibility',[{value:'public',label:'Show membership status'},{value:'private',label:'Keep membership private'}])}
 <Text style={styles.heading}>Messages</Text>
 {toggle('show_last_seen','Last seen','Allow people to see when you were last active')}
 {toggle('show_read_receipts','Read receipts','Allow senders to see when you read their messages')}
 <Pressable disabled={saving} onPress={()=>void save()} style={[styles.save,saving&&{opacity:.6}]}><Text style={styles.saveText}>{saving?'Saving…':'Save permissions'}</Text></Pressable>
 </>}</ScrollView></View>
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#FFF'},header:{minHeight:58,paddingHorizontal:16,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'flex-start',backgroundColor:'#FFF'},back:{width:38,height:38,alignItems:'center',justifyContent:'center',marginRight:8,backgroundColor:'transparent'},title:{fontSize:19,fontWeight:'600',color:'#111'},content:{paddingHorizontal:20,paddingBottom:45},heading:{fontSize:16,fontWeight:'600',color:'#1E1B3A',marginTop:28,marginBottom:6},subtitle:{fontSize:12,color:'#8D8997',marginBottom:8},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:15,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#E9E7EB',gap:14},rowTitle:{fontSize:14,fontWeight:'500',color:'#1E1B3A'},detail:{fontSize:12,color:'#8D8997',marginTop:4},save:{backgroundColor:'#BF008E',paddingVertical:15,borderRadius:12,alignItems:'center',marginTop:32},saveText:{color:'#FFF',fontSize:14,fontWeight:'600'}});
