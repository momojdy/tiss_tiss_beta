import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE='#28469E', TEXT='#0E1A3A', MUTED='#5F6E94', AQUA='#CAE8E8';
type Props={onBack?:()=>void;onHomePress?:()=>void;onTripsPress?:()=>void;onMorePress?:()=>void};
const offers=[
 {title:'Weekend fares',subtitle:'Save on selected flights',icon:'airplane-takeoff'},
 {title:'Destination deals',subtitle:'Explore popular routes',icon:'map-marker-radius-outline'},
 {title:'Wantiss offers',subtitle:'Travel promotions and partner offers',icon:'gift-outline'},
 {title:'Airline promotions',subtitle:'Special fares from participating airlines',icon:'ticket-percent-outline'},
];
export default function FlyzDealsScreen({onBack,onHomePress,onTripsPress,onMorePress}:Props){
 return <View style={styles.page}><StatusBar style="dark"/><LinearGradient colors={['#CAE8E8','#D8EEEE','#ECF6F6','#FFFFFF']} locations={[0,.25,.48,.72]} style={styles.bg}>
  <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
   <View style={styles.header}><View style={styles.headerLeft}><Pressable onPress={onBack} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={22} color={TEXT}/></Pressable><Text style={styles.logo}>Flyz.</Text></View><Text style={styles.title}>Deals</Text></View>
   <Text style={styles.sub}>Discounted fares, travel promotions and Wantiss travel offers.</Text>
   <View style={styles.pills}><View style={[styles.pill,styles.active]}><Text style={styles.activeText}>All</Text></View><View style={styles.pill}><Text style={styles.pillText}>Flights</Text></View><View style={styles.pill}><Text style={styles.pillText}>Destinations</Text></View><View style={styles.pill}><Text style={styles.pillText}>Offers</Text></View></View>
   {offers.map(o=><Pressable key={o.title} style={styles.card}><View style={styles.icon}><MaterialCommunityIcons name={o.icon as any} size={25} color={BLUE}/></View><View style={{flex:1}}><Text style={styles.cardTitle}>{o.title}</Text><Text style={styles.cardSub}>{o.subtitle}</Text></View><MaterialCommunityIcons name="chevron-right" size={23} color={MUTED}/></Pressable>)}
  </ScrollView>
  <View style={styles.bottom}><View style={styles.nav}>{[['home-outline','Home',onHomePress],['briefcase-outline','My Trips',onTripsPress],['tag-outline','Deals',undefined],['dots-horizontal-circle-outline','More',onMorePress]].map(([icon,label,fn])=><Pressable key={label as string} onPress={fn as any} style={styles.item}><View style={[styles.navIcon,label==='Deals'&&styles.activeNav]}><MaterialCommunityIcons name={icon as any} size={22} color={label==='Deals'?BLUE:MUTED}/></View><Text style={[styles.navText,label==='Deals'&&{color:BLUE}]}>{label}</Text></Pressable>)}</View></View>
 </LinearGradient></View>
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#DCE6E8'},bg:{flex:1},content:{paddingHorizontal:16,paddingTop:0,paddingBottom:110},header:{width:'100%',height:100,paddingBottom:4,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},headerLeft:{flexDirection:'row',alignItems:'center',gap:10},backButton:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(255,255,255,.65)',alignItems:'center',justifyContent:'center'},logo:{fontSize:26,fontWeight:'800',color:BLUE,letterSpacing:-.6},title:{fontSize:24,fontWeight:'800',color:TEXT},sub:{fontSize:14,lineHeight:20,color:MUTED,marginTop:12,maxWidth:320},pills:{flexDirection:'row',gap:6,marginTop:22},pill:{paddingHorizontal:15,height:38,borderRadius:20,backgroundColor:'rgba(255,255,255,.6)',alignItems:'center',justifyContent:'center'},active:{backgroundColor:BLUE},pillText:{fontSize:12,fontWeight:'700',color:MUTED},activeText:{fontSize:12,fontWeight:'700',color:'#fff'},card:{minHeight:84,borderRadius:20,backgroundColor:'rgba(255,255,255,.82)',marginTop:12,padding:14,flexDirection:'row',alignItems:'center',gap:13},icon:{width:52,height:52,borderRadius:26,backgroundColor:AQUA,alignItems:'center',justifyContent:'center'},cardTitle:{fontSize:15,fontWeight:'800',color:TEXT},cardSub:{fontSize:12,color:MUTED,marginTop:4},bottom:{position:'absolute',left:0,right:0,bottom:0,paddingHorizontal:8,paddingBottom:12,paddingTop:4},nav:{height:76,borderRadius:30,backgroundColor:'#fff',shadowColor:'#142864',shadowOpacity:.14,shadowRadius:14,elevation:7,flexDirection:'row',justifyContent:'space-around',alignItems:'center'},item:{width:80,alignItems:'center',gap:4},navIcon:{width:52,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},activeNav:{backgroundColor:AQUA},navText:{fontSize:11.5,fontWeight:'700',color:MUTED}});
