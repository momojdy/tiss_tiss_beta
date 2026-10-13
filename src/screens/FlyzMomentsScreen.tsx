import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

type Moment = { id:string; user_id:string; media_url:string; display_url?:string; media_type:'image'|'video'; caption:string; visibility:'public'|'friends'|'private'; created_at:string };
type Props = { onBack:()=>void; profileUserId?:string; profileName?:string; onPrivacyPress?:()=>void; onHomePress?:()=>void; onDealsPress?:()=>void; onWalletPress?:()=>void; onMorePress?:()=>void };

export default function FlyzMomentsScreen({onBack,profileUserId,profileName,onPrivacyPress,onHomePress,onDealsPress,onWalletPress,onMorePress}:Props) {
 const [viewerId,setViewerId]=useState<string|null>(null);
 const [items,setItems]=useState<Moment[]>([]); const [selectedMoment,setSelectedMoment]=useState<Moment|null>(null);
 const [loading,setLoading]=useState(true);
 const [publishing,setPublishing]=useState(false);
 const [caption,setCaption]=useState('');
 const [visibility,setVisibility]=useState<'public'|'friends'|'private'>('public');
 const [selectedMoment,setSelectedMoment]=useState<Moment|null>(null);
 const [selectedMoment,setSelectedMoment]=useState<Moment|null>(null);
 const isOwner=!!viewerId && (!profileUserId || profileUserId===viewerId);
 const load=async()=>{
  setLoading(true);
  try {
   const {data:auth}=await supabase.auth.getUser(); const uid=auth.user?.id??null; setViewerId(uid);
   const owner=profileUserId??uid;
   if(!owner){setItems([]);return;}
   let query=supabase.from('flyz_moments').select('id,user_id,media_url,media_type,caption,visibility,created_at').eq('user_id',owner).order('created_at',{ascending:false}).limit(60);
   const {data,error}=await query;
   if(error) throw error;
   const rows=(data??[]) as Moment[];
   const withUrls=await Promise.all(rows.map(async item=>{const {data:signed}=await supabase.storage.from('flyz-moments').createSignedUrl(item.media_url,3600);return {...item,display_url:signed?.signedUrl};}));
   setItems(withUrls);
  } catch(e){Alert.alert('Moments unavailable',e instanceof Error?e.message:'Please try again.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[profileUserId,initialMomentId]);
 const publish=async()=>{
  if(!viewerId){Alert.alert('Sign in required','Sign in to share a Flyz Moment.');return;}
  try {
   const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
   if(!permission.granted){Alert.alert('Photo permission needed','Allow access to choose a photo or video for your Moment.');return;}
   const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','videos'],allowsEditing:false,quality:0.85,base64:true,videoMaxDuration:60});
   if(picked.canceled||!picked.assets?.[0])return;
   const asset=picked.assets[0]; setPublishing(true);
   let url=asset.uri;
   const mime=asset.mimeType??(asset.type==='video'?'video/mp4':'image/jpeg');
   const base64=asset.base64??await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.Base64});
   if(!base64)throw new Error('Could not read this media file. Please choose another photo or video.');
   const ext=mime.split('/')[1]?.replace('quicktime','mov')??'jpg';
   const path=viewerId+'/'+Date.now()+'.'+ext;
   const {error:uploadError}=await supabase.storage.from('flyz-moments').upload(path,decode(base64),{contentType:mime,upsert:false});
   if(uploadError)throw uploadError;
   url=path;
   const {error}=await supabase.from('flyz_moments').insert({user_id:viewerId,media_url:url,media_type:asset.type==='video'?'video':'image',caption:caption.trim(),visibility});
   if(error)throw error;
   setCaption(''); await load(); Alert.alert('Moment shared','Your Moment is now on Flyz.');
  } catch(e){Alert.alert('Could not publish Moment',e instanceof Error?e.message:'Please try again.');}
  finally{setPublishing(false);}
 };
 const remove=async(item:Moment)=>{
  Alert.alert('Delete this Moment?','This removes it from your profile.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{void(async()=>{const {error:mediaError}=await supabase.storage.from('flyz-moments').remove([item.media_url]);if(mediaError){Alert.alert('Could not delete media',mediaError.message);return;}const {error}=await supabase.from('flyz_moments').delete().eq('id',item.id);if(error)Alert.alert('Could not delete',error.message);else setItems(v=>v.filter(x=>x.id!==item.id));})();}}]);
 };
 return <View style={s.page}>
  <View style={s.header}><Pressable onPress={onBack} style={s.back}><Ionicons name="chevron-back" size={23} color="#102047"/></Pressable><View style={{flex:1}}><Text style={s.brand}>Flyz.</Text><Text style={s.headerTitle}>{isOwner?'Moments':'Moments by '+(profileName||'Wantiss member')}</Text></View>{isOwner?<Pressable onPress={onPrivacyPress} style={s.brandIcon} accessibilityLabel="Profile privacy"><Ionicons name="settings-outline" size={19} color="#28469E"/></Pressable>:<View style={s.brandIcon}><MaterialCommunityIcons name="star-four-points" size={19} color="#28469E"/></View>}</View>
  <Modal visible={!!selectedMoment} transparent animationType="fade" onRequestClose={()=>setSelectedMoment(null)}><View style={s.viewerBackdrop}><View style={s.viewerCard}><View style={s.viewerHeader}><Pressable onPress={()=>setSelectedMoment(null)} style={s.viewerClose}><Ionicons name="close" size={23} color="#0E1A3A"/></Pressable><Text style={s.viewerTitle}>Flyz Moment</Text><View style={{width:36}}/></View>{selectedMoment?.media_type==='image'&&selectedMoment.display_url?<Image source={{uri:selectedMoment.display_url}} resizeMode="contain" style={s.viewerImage}/>:<View style={s.viewerVideo}><Ionicons name="play-circle" size={56} color="#FFF"/><Text style={s.videoLabel}>VIDEO MOMENT</Text><Text style={s.viewerVideoNote}>Video playback is not available in this build yet.</Text></View>}<Text style={s.viewerCaption}>{selectedMoment?.caption||'A little moment worth keeping ✨'}</Text>{selectedMoment?<Text style={s.viewerDate}>{new Date(selectedMoment.created_at).toLocaleDateString()}</Text>:null}</View></View></Modal>
  <View style={s.bottomNav}>
   <Pressable style={s.navItem} onPress={onHomePress}><Ionicons name="home-outline" size={23} color="#5F6E94"/><Text style={s.navLabel}>Home</Text></Pressable>
   <Pressable style={s.navItem} onPress={onDealsPress}><Ionicons name="pricetag-outline" size={23} color="#5F6E94"/><Text style={s.navLabel}>Deals</Text></Pressable>
   <View style={s.navItem}><View style={s.navActive}><MaterialCommunityIcons name="star-four-points" size={23} color="#28469E"/></View><Text style={[s.navLabel,{color:'#28469E'}]}>Moments</Text></View>
   <Pressable style={s.navItem} onPress={onWalletPress}><Ionicons name="wallet-outline" size={23} color="#5F6E94"/><Text style={s.navLabel}>Wallet</Text></Pressable>
   <Pressable style={s.navItem} onPress={onMorePress}><Ionicons name="ellipsis-horizontal-circle-outline" size={23} color="#5F6E94"/><Text style={s.navLabel}>More</Text></Pressable>
  </View>
 </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#F5F9FC'},viewer:{flex:1,backgroundColor:'#0E1A3A',justifyContent:'center',padding:18},viewerClose:{position:'absolute',top:52,right:18,zIndex:2,width:42,height:42,borderRadius:21,backgroundColor:'rgba(255,255,255,.15)',alignItems:'center',justifyContent:'center'},viewerImage:{width:'100%',height:'68%'},viewerVideo:{height:'68%',alignItems:'center',justifyContent:'center',backgroundColor:'#28469E',borderRadius:18},viewerVideoText:{fontSize:17,fontWeight:'900',color:'#FFF',marginTop:10},viewerVideoHint:{fontSize:11,color:'#D5E3F7',marginTop:5},viewerCaption:{padding:18},viewerCaptionText:{fontSize:17,fontWeight:'800',lineHeight:24,color:'#FFF'},viewerDate:{fontSize:12,color:'#B8C8E4',marginTop:10},header:{height:100,paddingHorizontal:14,paddingBottom:9,flexDirection:'row',alignItems:'flex-end',backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#D7E5EC'},back:{width:38,height:38,borderRadius:13,backgroundColor:'#EAF2FA',alignItems:'center',justifyContent:'center'},brand:{fontSize:21,fontWeight:'900',letterSpacing:-.6,color:'#28469E',marginLeft:10},headerTitle:{fontSize:12,fontWeight:'700',color:'#5F6E94',marginLeft:10,marginTop:1},brandIcon:{width:35,height:35,borderRadius:13,backgroundColor:'#DDEFF3',alignItems:'center',justifyContent:'center',marginBottom:1},
 content:{padding:16,paddingBottom:110,gap:16},intro:{flexDirection:'row',alignItems:'center',padding:19,borderRadius:22,backgroundColor:'#EAF4F8',borderWidth:1,borderColor:'#C4D6DD'},introTitle:{fontSize:20,fontWeight:'900',color:'#0E1A3A'},introSub:{fontSize:12,lineHeight:18,color:'#5F6E94',marginTop:6},introIcon:{width:56,height:56,borderRadius:20,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',marginLeft:12},
 compose:{padding:16,borderRadius:20,backgroundColor:'#FFF',borderWidth:1,borderColor:'#C4D6DD',gap:11},composeTitle:{fontSize:16,fontWeight:'900',color:'#0E1A3A'},captionInput:{minHeight:45,borderWidth:1,borderColor:'#D5E1E7',borderRadius:12,paddingHorizontal:12,color:'#0E1A3A'},visibilityRow:{flexDirection:'row',gap:7,flexWrap:'wrap'},visibilityChip:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:8,paddingHorizontal:10,borderRadius:99,backgroundColor:'#F0F5F8'},visibilityActive:{backgroundColor:'#28469E'},visibilityText:{fontSize:11,fontWeight:'800',color:'#405781'},publish:{minHeight:45,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderRadius:13,backgroundColor:'#28469E'},publishText:{fontSize:13,fontWeight:'800',color:'#FFF'},
 feedHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},feedTitle:{fontSize:19,fontWeight:'900',color:'#0E1A3A'},feedSub:{fontSize:11,color:'#5F6E94',marginTop:4},feedIcon:{width:35,height:35,borderRadius:13,backgroundColor:'#DDEFF3',alignItems:'center',justifyContent:'center'},empty:{padding:26,alignItems:'center',backgroundColor:'#FFF',borderRadius:20,borderWidth:1,borderColor:'#D7E5EC'},emptyIcon:{width:60,height:60,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#EAF4F8'},emptyTitle:{fontSize:15,fontWeight:'900',color:'#0E1A3A',marginTop:14,textAlign:'center'},emptyText:{fontSize:12,lineHeight:18,color:'#5F6E94',textAlign:'center',marginTop:7},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:10},card:{width:'48%',backgroundColor:'#FFF',borderRadius:17,overflow:'hidden',borderWidth:1,borderColor:'#D7E5EC'},media:{height:155,backgroundColor:'#DCEBF2'},image:{width:'100%',height:'100%'},video:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#28469E'},videoLabel:{fontSize:9,fontWeight:'900',color:'#FFF',letterSpacing:1,marginTop:4},visibilityBadge:{position:'absolute',top:8,right:8,width:25,height:25,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(14,26,58,.7)'},cardText:{padding:10},caption:{fontSize:12,lineHeight:17,fontWeight:'700',color:'#0E1A3A'},date:{fontSize:10,color:'#71809D',marginTop:7},delete:{marginTop:8,flexDirection:'row',alignItems:'center',gap:5},deleteText:{fontSize:10,fontWeight:'800',color:'#9C4765'},privacyNote:{fontSize:11,color:'#5F6E94',textAlign:'center',marginVertical:5},modalBackdrop:{flex:1,backgroundColor:'rgba(10,20,43,.58)',justifyContent:'center',padding:18},viewer:{backgroundColor:'#FFF',borderRadius:22,padding:14,gap:10},viewerHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},viewerTitle:{fontSize:16,fontWeight:'900',color:'#0E1A3A'},viewerClose:{width:34,height:34,borderRadius:12,backgroundColor:'#EAF4F8',alignItems:'center',justifyContent:'center'},viewerImage:{width:'100%',height:350,backgroundColor:'#EDF4F7',borderRadius:14},viewerVideo:{height:250,backgroundColor:'#28469E',borderRadius:14,alignItems:'center',justifyContent:'center'},viewerVideoText:{fontSize:14,fontWeight:'900',color:'#FFF',marginTop:7},viewerVideoSub:{fontSize:11,color:'#DDE8F5',marginTop:6},viewerCaption:{fontSize:14,lineHeight:20,fontWeight:'700',color:'#0E1A3A'},viewerDate:{fontSize:11,color:'#71809D'},viewerDone:{minHeight:42,borderRadius:12,backgroundColor:'#28469E',alignItems:'center',justifyContent:'center'},viewerDoneText:{fontSize:13,fontWeight:'900',color:'#FFF'}
});