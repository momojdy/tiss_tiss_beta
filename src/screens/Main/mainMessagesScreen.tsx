import {Icon} from '../../features/Goodies/components/Icon';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
const PINK='#FBE8EF',MAGENTA='#BF008E',INK='#302631',MUTED='#827783';
type Message={id:string;conversation_id:string;sender_id:string;body:string;created_at:string;read_at:string|null};
const formatConversationDate=(value:string)=>{const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const now=new Date();return d.toDateString()===now.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{year:'2-digit',month:'2-digit',day:'2-digit'});};
type Conversation={id:string;title:string|null;participant_ids:string[];updated_at:string;feature?:string|null;ref_id?:string|null;business_id?:string|null};
export default function MessagesScreen({onBack}:{onBack:()=>void}) {
 const [currentUserId,setCurrentUserId]=useState('');const [items,setItems]=useState<Conversation[]>([]),[unread,setUnread]=useState<Record<string,number>>({}),[storeCovers,setStoreCovers]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[activeConversation,setActiveConversation]=useState<Conversation|null>(null),[messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[lastMessages,setLastMessages]=useState<Record<string,Message>>({}),[drafts,setDrafts]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setItems([]);setUnread({});setCurrentUserId('');setLoading(false);return;}setCurrentUserId(auth.user.id);
  try{const saved=await AsyncStorage.getItem('wantiss.message-drafts.'+auth.user.id);setDrafts(saved?JSON.parse(saved):{});}catch{setDrafts({});}
  const {data,error:queryError}=await supabase.from('conversations').select('id,title,participant_ids,updated_at,feature,ref_id,business_id').contains('participant_ids',[auth.user.id]).order('updated_at',{ascending:false});
  if(queryError){setError(queryError.message);setLoading(false);return;}
  const rows=(data||[]) as Conversation[];setItems(rows);setError('');
  const storeIds=Array.from(new Set(rows.filter(c=>c.feature==='goodies'&&c.ref_id).map(c=>c.ref_id as string)));
  if(storeIds.length){const {data:stores,error:storeError}=await supabase.from('goodies_store_schedules').select('store_id,cover_url,thumbnail_url,logo_url').in('store_id',storeIds);if(storeError)console.warn('Store cover photos could not load:',storeError.message);const covers:Record<string,string>={};(stores||[]).forEach((s:any)=>{const uri=s.thumbnail_url||s.logo_url||s.cover_url;if(uri)covers[s.store_id]=uri;});setStoreCovers(covers);}else setStoreCovers({});
  if(rows.length){const {data:latest}=await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,read_at').in('conversation_id',rows.map(x=>x.id)).order('created_at',{ascending:false}).limit(1000);const previews:Record<string,Message>={};((latest||[]) as Message[]).forEach(m=>{if(!previews[m.conversation_id])previews[m.conversation_id]=m;});setLastMessages(previews);const {data:msgs}=await supabase.from('messages').select('conversation_id,sender_id').in('conversation_id',rows.map(x=>x.id)).is('read_at',null).neq('sender_id',auth.user.id);const counts:Record<string,number>={};(msgs||[]).forEach((m:any)=>counts[m.conversation_id]=(counts[m.conversation_id]||0)+1);setUnread(counts);}else{setUnread({});setLastMessages({});}
  setLoading(false);
 },[]);
 const openConversation=async(c:Conversation)=>{
  setActiveConversation(c);setDraft(drafts[c.id]||'');
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)return;
  const {data,error:queryError}=await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,read_at').eq('conversation_id',c.id).order('created_at',{ascending:true}).limit(300);
  if(queryError){setError(queryError.message);return;}
  const rows=(data||[]) as Message[];setMessages(rows);setError('');
  const unreadIds=rows.filter(m=>m.sender_id!==auth.user!.id&&!m.read_at).map(m=>m.id);
  if(unreadIds.length){
   const readAt=new Date().toISOString();
   if(c.feature==='goodies'){
    const {error:readError}=await supabase.rpc('mark_conversation_read',{p_conv:c.id});
    if(readError)setError(readError.message);
   }else{
    const {error:readError}=await supabase.from('messages').update({read_at:readAt}).in('id',unreadIds);
    if(readError)setError(readError.message);
   }
   setMessages(prev=>prev.map(m=>unreadIds.includes(m.id)?{...m,read_at:readAt}:m));void load();
  }
 };
 const updateDraft=(value:string)=>{setDraft(value);if(!activeConversation)return;const next={...drafts};if(value.trim())next[activeConversation.id]=value;else delete next[activeConversation.id];setDrafts(next);if(currentUserId)void AsyncStorage.setItem('wantiss.message-drafts.'+currentUserId,JSON.stringify(next));};
 const sendMessage=async()=>{
  const body=draft.trim();if(!body||!activeConversation||sending)return;
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)return;
  setSending(true);
  const {error:sendError}=activeConversation.feature==='goodies'
   ? await supabase.rpc('goodies_send_store_message',{p_conversation_id:activeConversation.id,p_body:body})
   : await supabase.from('messages').insert({conversation_id:activeConversation.id,sender_id:auth.user.id,body});
  if(sendError)setError(sendError.message);else{
   setDraft('');setDrafts(prev=>{const next={...prev};delete next[activeConversation.id];void AsyncStorage.setItem('wantiss.message-drafts.'+auth.user!.id,JSON.stringify(next));return next;});
   if(activeConversation.feature!=='goodies')await supabase.from('conversations').update({updated_at:new Date().toISOString()}).eq('id',activeConversation.id);
   const {data}=await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,read_at').eq('conversation_id',activeConversation.id).order('created_at',{ascending:true}).limit(300);
   setMessages((data||[]) as Message[]);
  }
  setSending(false);
 };
 useEffect(()=>{let alive=true;let channel:ReturnType<typeof supabase.channel>|undefined;void (async()=>{await load();const {data:auth}=await supabase.auth.getUser();if(!alive||!auth.user)return;channel=supabase.channel('customer-messages-'+auth.user.id).on('postgres_changes',{event:'*',schema:'public',table:'messages'},()=>{void load()}).on('postgres_changes',{event:'*',schema:'public',table:'conversations'},()=>{void load()}).subscribe();})();return()=>{alive=false;if(channel)void supabase.removeChannel(channel)};},[load]);
 return <View style={s.root}><View style={s.header}><Pressable onPress={onBack} style={s.back} hitSlop={12}><Icon name="chevL" size={20} color={INK} /></Pressable><View style={{flex:1,height:38,justifyContent:"center"}}><Text style={s.title}>Messages</Text></View></View>
 {activeConversation?<View style={{flex:1}}><View style={s.threadHeader}><Pressable onPress={()=>{setActiveConversation(null);setError('');void load();}} hitSlop={10}><Icon name="chevL" size={20} color={INK} /></Pressable>{activeConversation.feature==='goodies'&&activeConversation.ref_id&&storeCovers[activeConversation.ref_id]?<Image source={{uri:storeCovers[activeConversation.ref_id]}} style={{width:38,height:38,borderRadius:9}} resizeMode="cover"/>:null}<Text style={s.conversationTitle}>{activeConversation.title||'Conversation'}</Text></View>{error? <Text style={s.body}>{error}</Text>:null}<ScrollView style={{flex:1}} contentContainerStyle={{padding:14}}>{messages.map(m=><View key={m.id} style={[s.bubble,m.sender_id===currentUserId&&s.ownBubble]}><Text style={s.bubbleText}>{m.body}</Text><Text style={s.messageTime}>{new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text></View>)}</ScrollView><View style={s.composer}><TextInput value={draft} onChangeText={updateDraft} maxLength={activeConversation?.feature==='goodies'?2000:undefined} placeholder="Write a message…" placeholderTextColor="#A99AA6" multiline style={s.input}/><Pressable disabled={!draft.trim()||sending} onPress={()=>void sendMessage()} style={[s.send,(!draft.trim()||sending)&&{opacity:0.5}]}><MaterialCommunityIcons name="send" size={20} color="#FFF"/></Pressable></View></View>:loading?<View style={s.center}><ActivityIndicator color={MAGENTA}/><Text style={s.body}>Loading conversations…</Text></View>:error?<View style={s.center}><MaterialCommunityIcons name="alert-circle-outline" size={30} color={MAGENTA}/><Text style={s.body}>{error}</Text><Pressable onPress={()=>{setLoading(true);void load()}} style={s.retry}><Text style={{color:'#FFF',fontWeight:'700'}}>Try again</Text></Pressable></View>:items.length===0?<View style={s.center}><View style={s.icon}><MaterialCommunityIcons name="message-text-outline" size={30} color={MAGENTA}/></View><Text style={s.heading}>No conversations yet</Text><Text style={s.body}>When you start a conversation with someone on Wantiss, it will appear here.</Text></View>:<ScrollView contentContainerStyle={{padding:14}}>{items.map(c=><Pressable key={c.id} onPress={()=>void openConversation(c)} style={s.row}>{c.feature==='goodies'&&c.ref_id&&storeCovers[c.ref_id]?<Image source={{uri:storeCovers[c.ref_id]}} style={{width:44,height:44,borderRadius:12,marginRight:12}} resizeMode="cover"/>:<View style={s.avatar}><MaterialCommunityIcons name="account-outline" size={23} color={MAGENTA}/></View>}<View style={{flex:1}}><Text style={s.heading}>{c.title||'Wantiss conversation'}</Text><Text style={[s.preview,drafts[c.id]?s.draftPreview:null]} numberOfLines={1}>{drafts[c.id]?'Draft: '+drafts[c.id]:(lastMessages[c.id]?.body||'No messages yet')}</Text></View><View style={s.rowRight}><Text style={s.rowDate}>{formatConversationDate(lastMessages[c.id]?.created_at||c.updated_at)}</Text>{!!unread[c.id]&&<View style={s.badge}><Text style={s.badgeText}>{unread[c.id]}</Text></View>}</View></Pressable>)}</ScrollView>}
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#FFF'},threadHeader:{height:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},bubble:{alignSelf:'flex-start',maxWidth:'84%',backgroundColor:'#F6EAF0',padding:11,borderRadius:14,marginBottom:8},ownBubble:{alignSelf:'flex-end',backgroundColor:'#FBE8EF'},bubbleText:{fontSize:14,color:INK,lineHeight:20},messageTime:{fontSize:9,color:MUTED,marginTop:5,textAlign:'right'},composer:{flexDirection:'row',alignItems:'flex-end',padding:12,borderTopWidth:1,borderTopColor:'#F0E8ED',gap:8},input:{flex:1,maxHeight:110,minHeight:42,backgroundColor:'#FFF8FB',borderColor:'#EAD7E1',borderWidth:1,borderRadius:18,paddingHorizontal:14,paddingVertical:10,color:INK},send:{width:42,height:42,borderRadius:21,backgroundColor:MAGENTA,alignItems:'center',justifyContent:'center'},header:{height:100,paddingHorizontal:18,paddingTop:0,paddingBottom:12,backgroundColor:PINK,flexDirection:'row',alignItems:'flex-end',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},back:{width:38,height:38,alignItems:'center',justifyContent:'center',marginRight:8,backgroundColor:'transparent'},title:{fontSize:19,fontWeight:'600',color:INK},subtitle:{fontSize:12,color:MUTED,marginTop:3},center:{flex:1,alignItems:'center',justifyContent:'center',padding:32},icon:{width:66,height:66,borderRadius:22,backgroundColor:PINK,alignItems:'center',justifyContent:'center',marginBottom:15},conversationTitle:{fontSize:15,fontWeight:'500',color:INK},heading:{fontSize:15,fontWeight:'700',color:INK},body:{fontSize:13,lineHeight:20,color:MUTED,marginTop:7,textAlign:'center'},retry:{marginTop:14,backgroundColor:MAGENTA,borderRadius:10,paddingHorizontal:18,paddingVertical:10},row:{flexDirection:'row',alignItems:'center',padding:13,minHeight:74,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},preview:{fontSize:13,lineHeight:19,color:MUTED,marginTop:5},draftPreview:{color:MAGENTA},rowRight:{alignItems:'flex-end',justifyContent:'space-between',alignSelf:'stretch',paddingVertical:2,marginLeft:10,minWidth:66},rowDate:{fontSize:11,color:'#A8A0AA'},avatar:{width:44,height:44,borderRadius:15,backgroundColor:PINK,alignItems:'center',justifyContent:'center',marginRight:12},badge:{backgroundColor:MAGENTA,minWidth:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center',paddingHorizontal:5},badgeText:{fontSize:11,fontWeight:'700',color:'#FFF'}});
