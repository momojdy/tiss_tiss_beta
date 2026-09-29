import React,{useState} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import type {Category} from '../data/categories';
import {colors,fonts} from '../theme';
export default function CategoryIcon({category}:{category:Category}){
 const[loaded,setLoaded]=useState(false); const[failed,setFailed]=useState(false);
 return <View style={styles.item}><View style={styles.circle}>
 {!loaded||failed?<MaterialIcons name={category.icon} size={28} color={colors.black87}/>:null}
 {!failed?<Image source={{uri:category.image}} style={styles.image} resizeMode="cover" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>:null}
 </View><Text numberOfLines={1} style={styles.label}>{category.label}</Text></View>;
}
const styles=StyleSheet.create({item:{alignItems:'center',paddingTop:5,width:'100%'},circle:{width:52,height:52,borderRadius:26,overflow:'hidden',alignItems:'center',justifyContent:'center',marginBottom:5},image:{...StyleSheet.absoluteFill},label:{fontFamily:fonts.semibold,fontSize:11,lineHeight:14,color:colors.labelGrey,textAlign:'center',width:'100%'}});