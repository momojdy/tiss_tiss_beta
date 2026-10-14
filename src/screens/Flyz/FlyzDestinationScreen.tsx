import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE='#28469E',TEXT='#0E1A3A',MUTED='#5F6E94';
type Props={city:string;code:string;price:string;onBack?:()=>void};

export default function FlyzDestinationScreen({city,code,price,onBack}:Props){
 return <View style={s.page}><StatusBar style="dark"/><LinearGradient colors={['#CAE8E8','#D8EEEE','#ECF6F6','#FFFFFF']} locations={[0,.25,.48,.72]} style={s.bg}>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <View style={s.header}>
    <Pressable onPress={onBack} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color={TEXT}/></Pressable>
    <Text style={s.headerTitle}>{city}</Text>
    <View style={s.headerSpacer}/>
   </View>
   <LinearGradient colors={['#9CD3EA','#E6F4F6']} style={s.hero}><MaterialCommunityIcons name="airplane-takeoff" size={68} color={BLUE}/></LinearGradient>
   <Text style={s.title}>{city}</Text><Text style={s.code}>{code} · Popular destination</Text>
   <Text style={s.copy}>Discover {city} with Flyz. Explore the destination and compare available flights from Port-au-Prince.</Text>
   <Text style={s.section}>Flights to {city}</Text>
   <View style={s.price}><View><Text style={s.label}>Starting from</Text><Text style={s.amount}>{price}</Text><Text style={s.small}>per passenger</Text></View><MaterialCommunityIcons name="chevron-right" size={25} color={BLUE}/></View>
   <Text style={s.section}>Travel highlights</Text>
   <View style={s.info}><Text style={s.infoTitle}>Explore the destination</Text><Text style={s.infoText}>Popular places, local experiences and travel information can be explored here.</Text></View>
  </ScrollView>
 </LinearGradient></View>
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#DCE6E8'},
 bg:{flex:1},
 content:{paddingHorizontal:16,paddingTop:0,paddingBottom:30},
 header:{width:'100%',height:100,paddingHorizontal:0,paddingBottom:4,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18},
 back:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(255,255,255,.65)',alignItems:'center',justifyContent:'center'},
 headerTitle:{fontSize:21,fontWeight:'800',color:TEXT},
 headerSpacer:{width:44,height:44},
 hero:{height:190,borderRadius:24,alignItems:'center',justifyContent:'center'},
 title:{fontSize:30,fontWeight:'800',color:TEXT,marginTop:20},
 code:{fontSize:13,color:MUTED,marginTop:3},
 copy:{fontSize:14,lineHeight:21,color:MUTED,marginTop:14},
 section:{fontSize:19,fontWeight:'800',color:TEXT,marginTop:25,marginBottom:10},
 price:{backgroundColor:'rgba(255,255,255,.84)',borderRadius:20,padding:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 label:{fontSize:11,textTransform:'uppercase',letterSpacing:.6,color:MUTED,fontWeight:'700'},
 amount:{fontSize:24,fontWeight:'800',color:BLUE,marginTop:2},
 small:{fontSize:11,color:MUTED},
 info:{backgroundColor:'rgba(202,232,232,.55)',borderRadius:20,padding:18},
 infoTitle:{fontSize:15,fontWeight:'800',color:TEXT},
 infoText:{fontSize:13,lineHeight:19,color:MUTED,marginTop:5}
});
