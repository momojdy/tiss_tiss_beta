import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {supabase} from '../../lib/supabase';
const INK='#302631',MUTED='#827783',MAGENTA='#BF008E';
type Business={id:string;name:string};
export default function MessageMarketingManager({onBack}:{onBack:()=>void}){
 const [businesses,setBusinesses]=useState<Business[]>([]);
 const [muted,setMuted]=useState<Record<string,boolean>>({});
 const [filter,setFilter]=useState<'All'|'Allowed'|'Muted'>('All');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  const {data:auth}=await supabase.auth.getUser();if(!auth.user){setLoading(false);return;}
  const {data:conversations,error:e}=await supabase.from('conversations').select('business_id').contains('participant_ids',[auth.user.id]).not('business_id','is',null);
  if(e){setError(e.message);setLoading(false);return;}
  const ids=Array.from(new Set((conversations||[]).map(c=>c.business_id).filter((id):id is string=>!!id)));
  if(ids.length){const {data,error:be}=await supabase.from('businesses').select('id,name').in('id',ids);if(be)setError(be.message);setBusinesses(data||[]);}
  else setBusinesses([]);
  const {data:preferences,error:pe}=await supabase.from('message_business_preferences').select('business_id,muted').eq('user_id',auth.user.id);
  if(pe)setError(pe.message);
  setMuted(Object.fromEntries((preferences||[]).map(p=>[p.business_id,p.muted])));
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 const toggle=async(id:string)=>{
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)return;
  const next=!muted[id];const {error:e}=await supabase.from('message_business_preferences').upsert({user_id:auth.user.id,business_id:id,muted:next,updated_at:new Date().toISOString()},{onConflict:'user_id,business_id'});
  if(e)setError(e.message);else setMuted(prev=>({...prev,[id]:next}));
 };
 const visible=businesses.filter(b=>filter==='All'||(filter==='Muted'?!!muted[b.id]:!muted[b.id]));
 return <View style={s.root}><View style={s.header}><Pressable onPress={onBack}><Text style={s.link}>Back</Text></Pressable><Text style={s.title}>Marketing messages</Text></View>
 <View style={s.tabs}>{(['All','Allowed','Muted'] as const).map(t=><Pressable key={t} style={[s.tab,filter===t&&s.active]} onPress={()=>setFilter(t)}><Text style={[s.tabText,filter===t&&{color:MAGENTA}]}>{t}</Text></Pressable>)}</View>
 {loading?<ActivityIndicator color={MAGENTA} style={{marginTop:24}}/>:<ScrollView contentContainerStyle={{paddingHorizontal:16}}>{visible.map(b=><Pressable key={b.id} onPress={()=>void toggle(b.id)} style={s.row}><Text style={s.name}>{b.name}</Text><Text style={s.link}>{muted[b.id]?'Unmute':'Mute'}</Text></Pressable>)}{!visible.length?<Text style={s.empty}>No businesses in this category.</Text>:null}{error?<Text style={s.error}>{error}</Text>:null}</ScrollView>}
 <Text style={s.foot}>Muting marketing messages does not disable essential order or booking updates.</Text>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF'},header:{height:58,flexDirection:'row',alignItems:'center',gap:18,paddingHorizontal:18,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},title:{fontSize:17,fontWeight:'500',color:INK},link:{color:MAGENTA,fontSize:13,fontWeight:'400'},tabs:{flexDirection:'row',gap:22,paddingHorizontal:18,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},tab:{paddingVertical:14},active:{borderBottomWidth:2,borderBottomColor:MAGENTA},tabText:{fontSize:13,color:MUTED},row:{minHeight:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},name:{fontSize:14,color:INK,flex:1},empty:{fontSize:13,color:MUTED,marginTop:24,textAlign:'center'},error:{fontSize:12,color:'#B62442',marginTop:12},foot:{fontSize:11,color:MUTED,padding:16,lineHeight:17}});
