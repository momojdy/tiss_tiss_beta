import React, {useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {supabase} from '../../lib/supabase';

const INK='#302631',MUTED='#827783',MAGENTA='#BF008E';
type Friend={id:string;name:string};
type GroupMember={user_id:string;role:string};
export default function MessageGroupManager({conversationId,onCreated,onBack}:{conversationId?:string;onCreated:(id:string)=>void;onBack:()=>void}){
 const [friends,setFriends]=useState<Friend[]>([]);
 const [members,setMembers]=useState<GroupMember[]>([]);
 const [selected,setSelected]=useState<string[]>([]);
 const [title,setTitle]=useState('');
 const [query,setQuery]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [userId,setUserId]=useState('');
 const load=useCallback(async()=>{
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)return;
  const me=auth.user.id;setUserId(me);
  const {data:relations,error:relationError}=await supabase.from('user_friendships').select('requester_id,recipient_id').eq('status','accepted').or(`requester_id.eq.${me},recipient_id.eq.${me}`);
  if(relationError){setError(relationError.message);return;}
  const ids=(relations||[]).map(r=>r.requester_id===me?r.recipient_id:r.requester_id);
  if(ids.length){const {data:profiles,error:profileError}=await supabase.from('profiles').select('id,full_name,wantiss_number').in('id',ids);if(profileError)setError(profileError.message);setFriends((profiles||[]).map(p=>({id:p.id,name:p.full_name||p.wantiss_number||'Wantiss member'})));}else setFriends([]);
  if(conversationId){const {data,error:memberError}=await supabase.from('message_group_members').select('user_id,role').eq('conversation_id',conversationId);if(memberError)setError(memberError.message);else setMembers(data||[]);}
 },[conversationId]);
 useEffect(()=>{void load();},[load]);
 const act=async(action:'add'|'remove'|'promote'|'demote',member:string)=>{
  if(!conversationId)return;setBusy(true);setError('');
  const {error:e}=await supabase.rpc('wantiss_manage_message_group',{p_conversation_id:conversationId,p_member:member,p_action:action});
  if(e)setError(e.message);else await load();setBusy(false);
 };
 const create=async()=>{
  if(!title.trim()||selected.length<2){setError('Enter a group name and select at least two friends.');return;}
  setBusy(true);setError('');
  const {data,error:e}=await supabase.rpc('wantiss_create_message_group',{p_title:title.trim(),p_members:selected});
  if(e)setError(e.message);else if(data)onCreated(data);setBusy(false);
 };
 const myRole=members.find(m=>m.user_id===userId)?.role;
 return <View style={s.root}><View style={s.header}><Pressable onPress={onBack}><Text style={s.link}>Back</Text></Pressable><Text style={s.title}>{conversationId?'Group members':'New group'}</Text></View>
 <ScrollView contentContainerStyle={s.content}>
 {!conversationId?<TextInput value={title} onChangeText={setTitle} placeholder="Group name" placeholderTextColor={MUTED} maxLength={80} style={s.input}/>:null}
 {conversationId?<><Text style={s.section}>Members</Text>{members.map(m=><View key={m.user_id} style={s.row}><Text style={s.name}>{friends.find(f=>f.id===m.user_id)?.name||(m.user_id===userId?'You':'Group member')} · {m.role}</Text>{m.user_id!==userId&&myRole==='owner'?<View style={s.actions}><Pressable onPress={()=>void act(m.role==='admin'?'demote':'promote',m.user_id)}><Text style={s.link}>{m.role==='admin'?'Demote':'Admin'}</Text></Pressable><Pressable onPress={()=>void act('remove',m.user_id)}><Text style={s.link}>Remove</Text></Pressable></View>:m.user_id!==userId&&myRole==='admin'&&m.role==='member'?<Pressable onPress={()=>void act('remove',m.user_id)}><Text style={s.link}>Remove</Text></Pressable>:null}</View>)}{myRole!=='owner'&&myRole!=='admin'?<Pressable onPress={()=>void act('remove',userId)} style={s.row}><Text style={s.link}>Leave group</Text></Pressable>:null}</>:null}
 {!conversationId||myRole==='owner'||myRole==='admin'?<><Text style={s.section}>{conversationId?'Add friends':'Select friends'}</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search friends" placeholderTextColor={MUTED} style={s.input}/>{friends.filter(f=>f.name.toLowerCase().includes(query.toLowerCase())&&!members.some(m=>m.user_id===f.id)).map(f=><Pressable key={f.id} style={s.row} onPress={()=>conversationId?void act('add',f.id):setSelected(prev=>prev.includes(f.id)?prev.filter(x=>x!==f.id):[...prev,f.id])}><Text style={s.name}>{f.name}</Text><Text style={s.link}>{conversationId?'Add':selected.includes(f.id)?'Selected':'Select'}</Text></Pressable>)}</>:null}
 {error?<Text style={s.error}>{error}</Text>:null}
 {!conversationId?<Pressable disabled={busy} style={s.primary} onPress={()=>void create()}><Text style={s.primaryText}>Create group</Text></Pressable>:null}
 {busy?<ActivityIndicator color={MAGENTA}/>:null}
 </ScrollView></View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF'},header:{height:58,flexDirection:'row',alignItems:'center',gap:20,paddingHorizontal:18,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},title:{fontSize:17,fontWeight:'500',color:INK},content:{padding:16},input:{height:44,backgroundColor:'#F7F3F6',borderRadius:9,paddingHorizontal:12,color:INK,fontSize:14,marginBottom:14},section:{fontSize:13,fontWeight:'500',color:MUTED,marginTop:10,marginBottom:8},row:{minHeight:53,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9',gap:12},name:{fontSize:13,fontWeight:'400',color:INK,flex:1},actions:{flexDirection:'row',gap:12},link:{fontSize:13,color:MAGENTA,fontWeight:'400'},error:{fontSize:12,color:'#B62442',marginTop:14},primary:{backgroundColor:MAGENTA,paddingVertical:13,borderRadius:10,alignItems:'center',marginTop:20},primaryText:{color:'#FFF',fontSize:14,fontWeight:'500'}});
