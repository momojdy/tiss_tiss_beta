import React from 'react';
import {Pressable,View} from 'react-native';

// The shared Wantiss trigger is fixed to the feature viewport, not the scrolling page.
// Its three circles deliberately increase in diameter from left to right.
export const QUICK_MENU_DOT_SIZES=[5,7,10] as const;
export function FloatingQuickMenuButton({top,right=18,background,color,onPress,testID='feature-floating-quick-menu',label='Open quick menu'}:{top:number;right?:number;background:string;color:string;onPress:()=>void;testID?:string;label?:string}){
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={{top:1,bottom:1,left:0,right:0}} style={{position:'absolute',top,right,width:49,height:42,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:3,backgroundColor:background,borderRadius:22,zIndex:45,elevation:8,shadowColor:'#000',shadowOpacity:.15,shadowRadius:5,shadowOffset:{width:0,height:2}}}>{QUICK_MENU_DOT_SIZES.map(size=><View key={size} pointerEvents="none" style={{width:size,height:size,borderRadius:size/2,backgroundColor:color}}/>)}</Pressable>;
}
