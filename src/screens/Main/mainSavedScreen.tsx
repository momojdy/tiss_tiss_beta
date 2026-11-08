import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Icon} from '../../features/Goodies/components/Icon';

const INK='#302631', MUTED='#827783', MAGENTA='#BF008E', PINK='#FBE8EF';
const goodies=[
 {icon:'storefront-outline' as const,title:'Favorite stores',detail:'Your go-to restaurants and shops',count:'08',color:'#FD802E'},
 {icon:'food-outline' as const,title:'Saved food & drinks',detail:'Meals and treats to try again',count:'12',color:'#FD802E'},
 {icon:'tag-heart-outline' as const,title:'Saved offers',detail:'Deals worth keeping',count:'04',color:'#FD802E'},
];
const other=[
 {icon:'airplane' as const,title:'Flyz',detail:'Saved destinations and trips',count:'03',color:'#4A67B0'},
 {icon:'ticket-outline' as const,title:'Gatherz',detail:'Events you want to attend',count:'06',color:'#BF008E'},
 {icon:'heart-outline' as const,title:'Frenzies',detail:'Saved moments and favorites',count:'02',color:'#91B834'},
 {icon:'bed-outline' as const,title:'Stayz',detail:'Places you want to stay',count:'05',color:'#8A73C9'},
];
export default function SavedScreen({onBack,onOpenGoodies}:{onBack:()=>void;onOpenGoodies:()=>void}) {
 return <View style={s.root}>
  <View style={s.header}><Pressable onPress={onBack} hitSlop={12} style={s.back}><Icon name="chevL" size={20} color={INK}/></Pressable><Text style={s.heading}>Saved</Text></View>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
   <View style={s.intro}><View><Text style={s.eyebrow}>YOUR COLLECTION</Text><Text style={s.introTitle}>Everything you love,</Text><Text style={s.introTitle}>all in one place.</Text></View><MaterialCommunityIcons name="bookmark-heart-outline" size={48} color={MAGENTA}/></View>
   <View style={s.preview}><MaterialCommunityIcons name="information-outline" size={15} color={MUTED}/><Text style={s.previewText}>Design preview · Sample saved items and counts</Text></View>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Goodies</Text><Text style={s.sectionNote}>Food, shops & offers</Text></View>
   {goodies.map(item=><Pressable key={item.title} onPress={onOpenGoodies} style={s.item}><View style={[s.iconBox,{backgroundColor:'#FFF0E4'}]}><MaterialCommunityIcons name={item.icon} size={23} color={item.color}/></View><View style={s.itemText}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.itemDetail}>{item.detail}</Text></View><Text style={s.count}>{item.count}</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#A79BA5"/></Pressable>)}
   <View style={s.sectionHead}><Text style={s.sectionTitle}>More from Wantiss</Text><Text style={s.sectionNote}>Across your spaces</Text></View>
   {other.map(item=><View key={item.title} style={s.item}><View style={[s.iconBox,{backgroundColor:item.color+'16'}]}><MaterialCommunityIcons name={item.icon} size={23} color={item.color}/></View><View style={s.itemText}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.itemDetail}>{item.detail}</Text></View><Text style={s.count}>{item.count}</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#A79BA5"/></View>)}
   <Text style={s.footer}>Your favorites, thoughtfully organized.</Text>
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#FFFCFD'},header:{height:100,paddingHorizontal:18,paddingBottom:12,backgroundColor:PINK,flexDirection:'row',alignItems:'flex-end',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#EDE5E9'},back:{width:38,height:38,alignItems:'center',justifyContent:'center',marginRight:8},heading:{fontSize:19,fontWeight:'600',color:INK,height:38,textAlignVertical:'center',paddingTop:7},
 scroll:{paddingHorizontal:18,paddingBottom:48},intro:{paddingTop:28,paddingBottom:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:10,letterSpacing:2,fontWeight:'700',color:MAGENTA,marginBottom:10},introTitle:{fontSize:23,fontWeight:'600',color:INK,lineHeight:31},
 preview:{flexDirection:'row',gap:7,alignItems:'center',paddingVertical:10,paddingHorizontal:12,backgroundColor:'#F8F4F6',borderRadius:10,marginBottom:24},previewText:{fontSize:11,color:MUTED,flex:1},
 sectionHead:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,marginTop:8},sectionTitle:{fontSize:17,fontWeight:'600',color:INK},sectionNote:{fontSize:11,color:MUTED},
 item:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#FFFFFF',padding:12,borderWidth:0.5,borderColor:'#ECE5E9',borderRadius:15,marginBottom:10},iconBox:{width:48,height:48,borderRadius:13,alignItems:'center',justifyContent:'center'},itemText:{flex:1},itemTitle:{fontSize:14,fontWeight:'600',color:INK},itemDetail:{fontSize:11,color:MUTED,marginTop:5},count:{fontSize:12,fontWeight:'600',color:INK},footer:{fontSize:12,color:MUTED,textAlign:'center',marginTop:22}
});