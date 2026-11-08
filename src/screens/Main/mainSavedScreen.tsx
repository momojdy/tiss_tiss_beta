import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {supabase} from '../../lib/supabase';
import {S, useGoodies} from '../../features/Goodies/store';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Icon} from '../../features/Goodies/components/Icon';

const INK='#302631', MUTED='#827783', MAGENTA='#BF008E', PINK='#FBE8EF';
const goodies=[
 {icon:'storefront-outline' as const,title:'Favorite stores',detail:'Your go-to restaurants and shops',count:'',color:'#FD802E'},
 {icon:'food-outline' as const,title:'Saved food & drinks',detail:'Meals and treats to try again',count:'',color:'#FD802E'},
 {icon:'tag-heart-outline' as const,title:'Saved offers',detail:'Deals worth keeping',count:'',color:'#FD802E'},
];
const other=[
 {icon:'airplane' as const,title:'Flyz',detail:'Saved destinations and trips',count:'',color:'#4A67B0'},
 {icon:'ticket-outline' as const,title:'Gatherz',detail:'Events you want to attend',count:'',color:'#BF008E'},
 {icon:'heart-outline' as const,title:'Frenzies',detail:'Saved moments and favorites',count:'',color:'#91B834'},
 {icon:'bed-outline' as const,title:'Stayz',detail:'Places you want to stay',color:'#d92d36'},
];
export default function SavedScreen({onBack,onOpenGoodies,onOpenFeature}:{onBack:()=>void;onOpenGoodies:(route:string)=>void;onOpenFeature:(feature:string)=>void}) {
 useGoodies();
 const storeCount=S.fav.length, itemCount=S.favp.length;
 const [counts,setCounts]=useState<Record<string,number>>({});
 useEffect(()=>{let active=true;const refresh=async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){if(active)setCounts({});return;}const {count,error}=await supabase.from('stayz_saved').select('listing_id',{count:'exact',head:true}).eq('user_id',user.id);if(active)setCounts(error?{}:{stayz:count??0});};void refresh();const sub=supabase.auth.onAuthStateChange(()=>{void refresh();});return()=>{active=false;sub.data.subscription.unsubscribe();};},[]);
 const sortedOther=useMemo(()=>other.map((item,index)=>({...item,index,savedCount:counts[item.title.toLowerCase()]})).sort((a,b)=>{const ac=a.savedCount,bc=b.savedCount;if(ac===undefined&&bc===undefined)return a.index-b.index;if(ac===undefined)return 1;if(bc===undefined)return -1;return bc-ac||a.index-b.index;}),[counts]);
 return <View style={s.root}>
  <View style={s.header}><Pressable onPress={onBack} hitSlop={12} style={s.back}><Icon name="chevL" size={20} color={INK}/></Pressable><Text style={s.heading}>Saved</Text></View>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
   <Text style={s.eyebrow}>YOUR COLLECTION</Text>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Goodies</Text><Text style={s.sectionNote}>Food, shops & offers</Text></View>
   {goodies.map(item=><Pressable key={item.title} onPress={()=>onOpenGoodies(item.title==='Favorite stores' ? 'favs:stores' : item.title==='Saved food & drinks' ? 'favs:items' : 'promos')} style={s.item}><View style={[s.iconBox,{backgroundColor:'#FFF0E4'}]}><MaterialCommunityIcons name={item.icon} size={23} color={item.color}/></View><View style={s.itemText}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.itemDetail}>{item.detail}</Text></View><Text style={s.count}>{item.title==='Favorite stores' ? storeCount : item.title==='Saved food & drinks' ? itemCount : ''}</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#A79BA5"/></Pressable>)}
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Other collections</Text><Text style={s.sectionNote}></Text></View>
   <View style={s.featureGrid}>{sortedOther.map(item=><Pressable key={item.title} onPress={()=>onOpenFeature(item.title.toLowerCase())} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={s.featureCard}><View style={[s.featureIcon,{backgroundColor:item.title==='Stayz' ? '#FCE9EB' : item.color+'16'}]}><MaterialCommunityIcons name={item.icon} size={25} color={item.title==='Stayz' ? '#d92d36' : item.color}/></View><Text style={s.featureTitle} numberOfLines={1}>{item.title}</Text>{item.savedCount!==undefined?<Text style={s.featureCount}>{item.savedCount} saved</Text>:null}</Pressable>)}</View>

  </ScrollView>
 </View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#FFFCFD'},header:{height:100,paddingHorizontal:18,paddingBottom:12,backgroundColor:PINK,flexDirection:'row',alignItems:'flex-end',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},back:{width:38,height:38,alignItems:'center',justifyContent:'center',marginRight:8},heading:{fontSize:19,fontWeight:'600',color:INK,height:38,textAlignVertical:'center',paddingTop:7},
 scroll:{paddingHorizontal:18,paddingTop:20,paddingBottom:48},intro:{paddingTop:28,paddingBottom:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:10,letterSpacing:2,fontWeight:'700',color:MAGENTA,marginBottom:10},introTitle:{fontSize:23,fontWeight:'600',color:INK,lineHeight:31},
 featureGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginBottom:10},featureCard:{width:'23.5%',backgroundColor:'#FFFFFF',borderWidth:0.5,borderColor:'#ECE5E9',borderRadius:13,paddingVertical:14,paddingHorizontal:3,alignItems:'center',marginBottom:10},featureIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:10},featureTitle:{fontSize:11,fontWeight:'600',color:INK,textAlign:'center'},featureCount:{fontSize:10,color:MUTED,marginTop:5,textAlign:'center'},
 preview:{flexDirection:'row',gap:7,alignItems:'center',paddingVertical:10,paddingHorizontal:12,backgroundColor:'#F8F4F6',borderRadius:10,marginBottom:24},previewText:{fontSize:11,color:MUTED,flex:1},
 sectionHead:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,marginTop:8},sectionTitle:{fontSize:17,fontWeight:'600',color:INK},sectionNote:{fontSize:11,color:MUTED},
 item:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#FFFFFF',padding:12,borderWidth:0.5,borderColor:'#ECE5E9',borderRadius:15,marginBottom:10},iconBox:{width:48,height:48,borderRadius:13,alignItems:'center',justifyContent:'center'},itemText:{flex:1},itemTitle:{fontSize:14,fontWeight:'600',color:INK},itemDetail:{fontSize:11,color:MUTED,marginTop:5},count:{fontSize:12,fontWeight:'600',color:INK},footer:{fontSize:12,color:MUTED,textAlign:'center',marginTop:22}
});