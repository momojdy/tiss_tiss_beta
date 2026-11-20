import React from 'react';
import {Text,View} from 'react-native';
import {Btn,Icon,useS,errText} from './BusinessSpaceShared';
import {useGoodiesVendorLabels} from './BusinessSpaceGoodiesLabels';

export function GoodiesVendorError({e,retry}:{e:unknown;retry:()=>void}) {
 const s=useS(),{text}=useGoodiesVendorLabels('shared');
 return <View style={[s.card,{alignItems:'center',gap:8}]}>
  <Icon name="alert-circle-outline" size={24} color="#C65D2E"/>
  <Text style={s.title}>{text("Couldn't load this")}</Text>
  <Text style={[s.mut,{textAlign:'center'}]}>{text(errText(e))}</Text>
  <Btn small label={text('Retry')} onPress={retry}/>
 </View>;
}

/** Disable editing options without changing the shared control layout. */
export function GoodiesVendorControl({disabled,children}:{disabled:boolean;children:React.ReactNode}) {
 return <View pointerEvents={disabled?'none':'auto'} accessibilityState={{disabled}} style={disabled?{opacity:0.45}:undefined}>{children}</View>;
}
