import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

type Props = { onPressExpress?: () => void; onPressFavorites?: () => void; onPressFollowedShops?: () => void; onPressBrowsingHistory?: () => void };
function BoxIcon(){return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Z" stroke="#25232A" strokeWidth={1.35} strokeLinejoin="round"/><Path d="M4.5 7.7 12 11l7.5-3.3M12 11v9" stroke="#25232A" strokeWidth={1.35} strokeLinejoin="round"/></Svg>}
export default function MeQuickLinksRow({ onPressExpress, onPressFavorites, onPressFollowedShops, onPressBrowsingHistory }: Props) {
  const items = [
    { label:'Express', onPress:onPressExpress, icon:<BoxIcon/> },
    { label:'Favorites', onPress:onPressFavorites, icon:<Ionicons name="star-outline" size={22} color="#25232A"/> },
    { label:'Followed Shops', onPress:onPressFollowedShops, icon:<Ionicons name="storefront-outline" size={22} color="#25232A"/> },
    { label:'Browsing History', onPress:onPressBrowsingHistory, icon:<Ionicons name="time-outline" size={22} color="#25232A"/> },
  ];
  return <View style={styles.container}>{items.map(item=><Pressable key={item.label} style={styles.item} onPress={item.onPress} hitSlop={6}>{item.icon}<Text style={styles.label} numberOfLines={1}>{item.label}</Text></Pressable>)}</View>;
}
const styles=StyleSheet.create({container:{flexDirection:'row',marginTop:13,paddingHorizontal:8},item:{flex:1,alignItems:'center',justifyContent:'center'},label:{marginTop:6,fontSize:10.5,lineHeight:13,color:'#1C1C1C',fontWeight:'500',textAlign:'center'}});