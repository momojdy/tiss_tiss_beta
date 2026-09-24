import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {ColorSwitcher} from './TextSwitcher';
import {colors,fonts} from '../theme';

export default function TeaserCard({label,icon,background,swatchColor,caption,onPress}:{label:string;icon:any;background:string;swatchColor:string;caption:string;onPress?:()=>void}){
 return <Pressable onPress={onPress} style={[styles.card,{backgroundColor:background}]}>
  <View style={styles.title}><MaterialIcons name={icon} size={16} color={colors.black}/><Text style={styles.titleText}>{label}</Text></View>
  <ColorSwitcher color={swatchColor} duration={400} style={styles.swatch}/>
  <Text style={styles.caption}>{caption}</Text>
 </Pressable>;
}
const styles=StyleSheet.create({
 card:{flex:1,height:112,borderRadius:12,marginHorizontal:4,padding:8},
 title:{flexDirection:'row',alignItems:'center',gap:4},
 titleText:{fontFamily:fonts.semibold,fontSize:11},
 swatch:{height:66,borderRadius:8,marginTop:4},
 caption:{fontFamily:fonts.medium,fontSize:10,marginTop:2}
});
