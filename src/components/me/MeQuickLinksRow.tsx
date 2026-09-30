import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

type Props = { onPressExpress?: () => void; onPressFavorites?: () => void; onPressFollowedShops?: () => void; onPressBrowsingHistory?: () => void };

function ExpressIcon({size=22,color='#25232A'}:{size?:number;color?:string}){return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M2.6954 7.18536L11.6954 11.1854L12.3046 9.81464L3.3046 5.81464L2.6954 7.18536ZM12.75 21.5V10.5H11.25V21.5H12.75ZM12.3046 11.1854L21.3046 7.18536L20.6954 5.81464L11.6954 9.81464L12.3046 11.1854Z" fill={color}/><Path d="M3 17.1101V6.88992C3 6.65281 3.13964 6.43794 3.35632 6.34164L11.7563 2.6083C11.9115 2.53935 12.0885 2.53935 12.2437 2.6083L20.6437 6.34164C20.8604 6.43794 21 6.65281 21 6.88992V17.1101C21 17.3472 20.8604 17.5621 20.6437 17.6584L12.2437 21.3917C12.0885 21.4606 11.9115 21.4606 11.7563 21.3917L3.35632 17.6584C3.13964 17.5621 3 17.3472 3 17.1101Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><Path d="M7.5 4.5L16.1437 8.34164C16.3604 8.43794 16.5 8.65281 16.5 8.88992V12.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></Svg>}

export default function MeQuickLinksRow({ onPressExpress, onPressFavorites, onPressFollowedShops, onPressBrowsingHistory }: Props) {
  const items = [
    { icon: 'star-outline' as const, label: 'Favorites', onPress: onPressFavorites },
    { icon: 'storefront-outline' as const, label: 'Followed Shops', onPress: onPressFollowedShops },
    { icon: 'time-outline' as const, label: 'History', onPress: onPressBrowsingHistory },
  ];
  return <View style={styles.container}><Pressable style={styles.item} onPress={onPressExpress} hitSlop={6}><ExpressIcon size={22} color="#25232A"/><Text style={styles.label} numberOfLines={1}>Express</Text></Pressable>{items.map(item => <Pressable key={item.label} style={styles.item} onPress={item.onPress} hitSlop={6}><Ionicons name={item.icon} size={22} color="#25232A"/><Text style={styles.label} numberOfLines={1}>{item.label}</Text></Pressable>)}</View>;
}
const styles=StyleSheet.create({container:{flexDirection:'row',marginTop:16,paddingHorizontal:8},item:{flex:1,alignItems:'center',justifyContent:'center'},label:{marginTop:6,fontSize:10.5,lineHeight:13,color:'#1C1C1C',fontWeight:'500',textAlign:'center'}});