import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const LINE = '#D3DECB';
const TINT = '#DCE8D2';
const NAV_GREEN = '#81C56C';
const TOGGLE_BG = '#E0E3E7';
const TOGGLE_ON = '#8FAF84';
const TOGGLE_OFF = '#C9D4C2';
const CHANNEL_SELECTED = '#8FAF84';

type Props = { onBack?: () => void };
type ChannelPreferences = { security:boolean; transactions:boolean; walletStatus?:boolean; paymentMethods?:boolean; rewards:boolean; support:boolean };
type EmailPreferences = { accountSecurity:boolean; transactionsBilling:boolean; serviceOrderUpdates:boolean; rewardsPromotions:boolean; supportFollowUps:boolean };
type Preferences = { channel:'push'|'email'; push:ChannelPreferences; email:EmailPreferences };

const DEFAULTS: Preferences = {
  channel:'push',
  push:{security:true,transactions:true,walletStatus:true,paymentMethods:true,rewards:true,support:true},
  email:{accountSecurity:true,transactionsBilling:true,serviceOrderUpdates:true,rewardsPromotions:true,supportFollowUps:true},
};

function SettingRow({label,value,onValueChange}:{label:string;value:boolean;onValueChange:(value:boolean)=>void}) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{false:TOGGLE_OFF,true:TOGGLE_ON}} thumbColor="#FFFFFF" ios_backgroundColor={TOGGLE_OFF} /></View>;
}

export default function WalletNotificationSettingsScreen({onBack}:Props) {
  const [preferences,setPreferences]=useState<Preferences>(DEFAULTS);

  useEffect(()=>{ let mounted=true; (async()=>{ const {data}=await supabase.auth.getUser(); const stored=data.user?.user_metadata?.wallet_notification_preferences; if(!mounted||!stored||typeof stored!=='object') return; const legacy=stored as Record<string,any>; setPreferences({channel:legacy.channel==='email'?'email':'push',push:{...DEFAULTS.push,...(legacy.push&&typeof legacy.push==='object'?legacy.push:{}),...(legacy.push?{}:{security:legacy.security??DEFAULTS.push.security,transactions:legacy.transactions??DEFAULTS.push.transactions,walletStatus:legacy.walletStatus??DEFAULTS.push.walletStatus,paymentMethods:legacy.paymentMethods??DEFAULTS.push.paymentMethods,rewards:legacy.rewards??DEFAULTS.push.rewards,support:legacy.support??DEFAULTS.push.support})},email:{...DEFAULTS.email,...(legacy.email&&typeof legacy.email==='object'?legacy.email:{})}}); })(); return()=>{mounted=false;}; },[]);

  const updatePreferences=async(next:Preferences)=>{ setPreferences(next); const {error}=await supabase.auth.updateUser({data:{wallet_notification_preferences:next}}); if(error) console.error('Notification preference update failed:',error); };
  const setChannel=(channel:Preferences['channel'])=>updatePreferences({...preferences,channel});
  const setPushToggle=(key:keyof ChannelPreferences,value:boolean)=>updatePreferences({...preferences,push:{...preferences.push,[key]:value}});
  const setEmailToggle=(key:keyof EmailPreferences,value:boolean)=>updatePreferences({...preferences,email:{...preferences.email,[key]:value}});

  return <View style={styles.page}>
    <StatusBar barStyle="dark-content"/>
    <View style={styles.header}><Pressable onPress={onBack} style={styles.headerButton} hitSlop={8} accessibilityLabel="Back"><MaterialCommunityIcons name="arrow-left" size={20} color={TEXT}/></Pressable><Text style={styles.headerTitle}>Notifications</Text></View>
    <View style={styles.strip}/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.channelControl}>
        <Pressable onPress={()=>setChannel('push')} style={[styles.channelOption,preferences.channel==='push'&&styles.channelOptionSelected]}><Text style={[styles.channelText,preferences.channel==='push'&&styles.channelTextSelected]}>Push notifications</Text></Pressable>
        <Pressable onPress={()=>setChannel('email')} style={[styles.channelOption,preferences.channel==='email'&&styles.channelOptionSelected]}><Text style={[styles.channelText,preferences.channel==='email'&&styles.channelTextSelected]}>Email</Text></Pressable>
      </View>
      <View style={styles.rows}>
        {preferences.channel==='push'?<><SettingRow label="Security Alerts" value={preferences.push.security} onValueChange={value=>setPushToggle('security',value)}/><SettingRow label="Transactions" value={preferences.push.transactions} onValueChange={value=>setPushToggle('transactions',value)}/><SettingRow label="Wallet Status Updates" value={preferences.push.walletStatus??true} onValueChange={value=>setPushToggle('walletStatus',value)}/><SettingRow label="Payment Method Updates" value={preferences.push.paymentMethods??true} onValueChange={value=>setPushToggle('paymentMethods',value)}/><SettingRow label="Rewards & Points" value={preferences.push.rewards} onValueChange={value=>setPushToggle('rewards',value)}/><SettingRow label="Support & Feedback" value={preferences.push.support} onValueChange={value=>setPushToggle('support',value)}/></>:<><SettingRow label="Account & Security" value={preferences.email.accountSecurity} onValueChange={value=>setEmailToggle('accountSecurity',value)}/><SettingRow label="Transactions & Billing" value={preferences.email.transactionsBilling} onValueChange={value=>setEmailToggle('transactionsBilling',value)}/><SettingRow label="Service & Order Updates" value={preferences.email.serviceOrderUpdates} onValueChange={value=>setEmailToggle('serviceOrderUpdates',value)}/><SettingRow label="Rewards & Promotions" value={preferences.email.rewardsPromotions} onValueChange={value=>setEmailToggle('rewardsPromotions',value)}/><SettingRow label="Support Follow-ups" value={preferences.email.supportFollowUps} onValueChange={value=>setEmailToggle('supportFollowUps',value)}/></>}
      </View>
    </ScrollView>
  </View>;
}

const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:BACKGROUND},
  header:{height:100,paddingHorizontal:10,paddingBottom:4,flexDirection:'row',alignItems:'flex-end',backgroundColor:BACKGROUND},
  headerButton:{width:36,height:36,borderRadius:12,backgroundColor:TINT,alignItems:'center',justifyContent:'center'},
  headerTitle:{marginLeft:12,paddingBottom:1,color:TEXT,fontSize:19,lineHeight:23,fontFamily:'Inter_600SemiBold',transform:[{translateY:-4.5}]},
  strip:{height:20,backgroundColor:'#E6EDE1'},
  content:{paddingHorizontal:16,paddingTop:20,paddingBottom:40},
  channelControl:{height:50,padding:2,flexDirection:'row',backgroundColor:TOGGLE_BG,borderWidth:1,borderColor:TOGGLE_BG,borderRadius:12},
  channelOption:{flex:1,height:44,alignItems:'center',justifyContent:'center',borderRadius:10},
  channelOptionSelected:{backgroundColor:CHANNEL_SELECTED},
  channelText:{color:MUTED,fontSize:14,fontFamily:'Inter_600SemiBold'},
  channelTextSelected:{color:TEXT},
  rows:{marginTop:18},
  row:{minHeight:56,flexDirection:'row',alignItems:'center',paddingVertical:6,paddingHorizontal:2,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:LINE},
  rowLabel:{flex:1,color:TEXT,fontSize:14,fontFamily:'Inter_500Medium'},
});
