import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export type SettingsDetailKind = 'personalInfo' | 'addresses' | 'language' | 'region' | 'notifications' | 'privacy' | 'help' | 'about';
type Props = { kind: SettingsDetailKind; onBack: () => void };
const INK = '#1E1B3A', MUTED = '#8D8997', PINK = '#FCE4F1';
const TITLES: Record<SettingsDetailKind,string> = {
  personalInfo: 'Personal Information', addresses: 'Addresses', language: 'Language',
  region: 'Region & Currency', notifications: 'Notifications',
  privacy: 'Privacy & Permissions', help: 'Help Center', about: 'About Wantiss'
};
function Row({label,value,onPress,children}:{label:string;value?:string;onPress?:()=>void;children?:React.ReactNode}) {
 return <Pressable onPress={onPress} style={styles.row}><View style={{flex:1,paddingRight:10}}><Text style={styles.label}>{label}</Text>{value ? <Text style={styles.value}>{value}</Text>:null}</View>{children ?? <Ionicons name="chevron-forward" size={16} color="#B8B4BD"/>}</Pressable>;
}
function Choice({title,selected,onPress}:{title:string;selected:boolean;onPress:()=>void}) {
 return <Pressable onPress={onPress} style={styles.choice}><Text style={styles.label}>{title}</Text>{selected ? <Ionicons name="checkmark" size={20} color={INK}/> : null}</Pressable>;
}
export default function SettingsDetailScreen({kind,onBack}:Props) {
 const insets=useSafeAreaInsets();
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [phone,setPhone]=useState('');
 const [addressName,setAddressName]=useState('');
 const [recipient,setRecipient]=useState('');
 const [addressPhone,setAddressPhone]=useState('');
 const [street,setStreet]=useState('');
 const [city,setCity]=useState('');
 const [region,setRegion]=useState('');
 const [postal,setPostal]=useState('');
 const [savedAddress,setSavedAddress]=useState(false);
 const [language,setLanguage]=useState('English');
 const [country,setCountry]=useState('Haiti');
 const [currency,setCurrency]=useState('USD ($)');
 const [toggles,setToggles]=useState<Record<string,boolean>>({
   'Order updates':true,'Promotions and offers':true,'Messages':true,'Email notifications':true,
   'Personalized recommendations':true,'Location access':false,'Camera access':false,'Analytics and diagnostics':false
 });
 useEffect(()=> {
   if(kind!=='personalInfo') return;
   let active=true;
   (async()=>{
     setLoading(true);
     try {
       const {data:{user},error}=await supabase.auth.getUser();
       if(error) throw error;
       if(user && active) {
         setEmail(user.email??'');
         const {data}=await supabase.from('profiles').select('full_name,phone_number').eq('id',user.id).maybeSingle();
         if(active){setName(data?.full_name??String(user.user_metadata?.full_name??''));setPhone(data?.phone_number??String(user.user_metadata?.phone_number??''));}
       }
     } catch(e) { if(active) Alert.alert('Unable to load profile',e instanceof Error?e.message:'Please try again.'); }
     finally {if(active)setLoading(false);}
   })();
   return ()=>{active=false};
 },[kind]);
 const saveProfile=async()=>{
   setSaving(true);
   try{
     const {data:{user},error:userError}=await supabase.auth.getUser();
     if(userError) throw userError;
     if(!user) throw new Error('Please sign in again.');
     const {error}=await supabase.from('profiles').upsert({id:user.id,full_name:name.trim(),phone_number:phone.trim(),updated_at:new Date().toISOString()},{onConflict:'id'});
     if(error) throw error;
     Alert.alert('Saved','Your personal information has been updated.');
   }catch(e){Alert.alert('Could not save profile',e instanceof Error?e.message:'Please try again.');}
   finally{setSaving(false);}
 };
 const toggle=(label:string)=><Switch value={!!toggles[label]} onValueChange={v=>setToggles(old=>({...old,[label]:v}))} trackColor={{false:'#D9D5DD',true:'#E8B9D2'}} thumbColor={toggles[label]?INK:'#FFFFFF'}/>;
 const input=(label:string,value:string,onChangeText:(v:string)=>void,placeholder?:string)=><View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder??label} placeholderTextColor="#AAA5B0" style={styles.input}/></View>;
 return <View style={styles.page}>
  <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>
  <View style={[styles.header,{paddingTop:insets.top+8}]}>
   <Pressable onPress={onBack} hitSlop={10} style={styles.back}><Ionicons name="chevron-back" size={24} color={INK}/></Pressable>
   <Text style={styles.title}>{TITLES[kind]}</Text><View style={styles.balance}/>
  </View>
  <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
   {kind==='personalInfo' && <>
    <View style={styles.section}><Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
     {input('Full name',name,setName,'Enter your full name')}
     {input('Email address',email,()=>{},'Email address')}
     {input('Phone number',phone,setPhone,'Phone number')}
     <Text style={styles.hint}>Email changes are managed securely through Account & Security.</Text>
    </View>
    <Pressable style={[styles.primary,saving&&{opacity:.6}]} disabled={saving||loading} onPress={saveProfile}><Text style={styles.primaryText}>{loading?'Loading…':saving?'Saving…':'Save changes'}</Text></Pressable>
   </>}
   {kind==='addresses' && <>
    <View style={styles.section}><Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
     {!savedAddress ? <Text style={styles.hint}>Add an address to make delivery checkout faster.</Text> : <View style={styles.savedCard}><Text style={styles.label}>{addressName||'My address'}{ '  ·  Default'}</Text><Text style={styles.value}>{recipient} · {addressPhone}{'\n'}{street}, {city}, {region} {postal}</Text><Pressable onPress={()=>setSavedAddress(false)}><Text style={styles.link}>Edit address</Text></Pressable></View>}
     {!savedAddress && <>{input('Address label',addressName,setAddressName,'Home, Work…')}{input('Recipient name',recipient,setRecipient)}{input('Phone number',addressPhone,setAddressPhone,'Include country code')}{input('Street address',street,setStreet)}{input('City',city,setCity)}{input('State / Department',region,setRegion)}{input('Postal code (optional)',postal,setPostal)}</>}
    </View>
    {!savedAddress && <Pressable style={styles.primary} onPress={()=>{if(!recipient.trim()||!addressPhone.trim()||!street.trim()||!city.trim()){Alert.alert('Complete required fields','Add the recipient, phone number, street address, and city.');return;}setSavedAddress(true);Alert.alert('Address added','This address is saved for this session. Persistent address storage will be connected when the address table is available.')}}><Text style={styles.primaryText}>Save address</Text></Pressable>}
    {savedAddress && <Pressable style={styles.secondary} onPress={()=>{setSavedAddress(false);}}><Text style={styles.secondaryText}>Manage address</Text></Pressable>}
   </>}
   {kind==='language' && <View style={styles.section}><Text style={styles.sectionTitle}>APP LANGUAGE</Text>{['English','Français','Kreyòl ayisyen','Español'].map(v=><Choice key={v} title={v} selected={language===v} onPress={()=>setLanguage(v)}/>)}<Text style={styles.hint}>Your selected language is shown here. Some parts of Wantiss may remain in their current language.</Text></View>}
   {kind==='region' && <><View style={styles.section}><Text style={styles.sectionTitle}>REGION</Text>{['Haiti','United States','Canada','France','Dominican Republic'].map(v=><Choice key={v} title={v} selected={country===v} onPress={()=>setCountry(v)}/>)}</View><View style={styles.stripe}/><View style={styles.section}><Text style={styles.sectionTitle}>CURRENCY</Text>{['USD ($)','HTG (G)','CAD ($)','EUR (€)'].map(v=><Choice key={v} title={v} selected={currency===v} onPress={()=>setCurrency(v)}/>)}</View><Text style={styles.hint}>Your selected region and currency are shown here. Prices and availability may still depend on the marketplace.</Text></>}
   {kind==='notifications' && <><View style={styles.section}><Text style={styles.sectionTitle}>NOTIFICATION PREFERENCES</Text>{['Order updates','Promotions and offers','Messages','Email notifications'].map(v=><Row key={v} label={v} children={toggle(v)}/>)}</View><Text style={styles.hint}>Manage the types of updates you want to receive.</Text></>}
   {kind==='privacy' && <><View style={styles.section}><Text style={styles.sectionTitle}>PRIVACY CONTROLS</Text>{['Personalized recommendations','Location access','Camera access','Analytics and diagnostics'].map(v=><Row key={v} label={v} value={v==='Location access'?'Used for relevant local services':v==='Camera access'?'Used when you choose to capture or upload':' '} children={toggle(v)}/>)}</View><View style={styles.stripe}/><View style={styles.section}><Text style={styles.sectionTitle}>YOUR DATA</Text><Row label="Request a copy of my data" onPress={()=>Alert.alert('Data request','Contact support to request a copy of your Wantiss account data.')}/><Row label="Account deletion" value="Manage in Account & Security" onPress={()=>Alert.alert('Account deletion','Open Account & Security to review account deactivation and deletion options.')}/></View><Text style={styles.hint}>You can change these preferences at any time. Some permissions may also be managed in your device settings.</Text></>}
   {kind==='help' && <><View style={styles.section}><Text style={styles.sectionTitle}>HOW CAN WE HELP?</Text><Row label="Orders and delivery" value="Tracking, cancellations and returns" onPress={()=>Alert.alert('Orders and delivery','For order-specific help, contact Wantiss support with your order number.')}/><Row label="Payments and wallet" value="Payments, refunds and wallet" onPress={()=>Alert.alert('Payments and wallet','Never share your password or verification codes with support.')}/><Row label="Account access" value="Sign-in and security" onPress={()=>Alert.alert('Account access','Visit Account & Security to manage your sign-in details.')}/><Row label="Contact support" value="Get help from Wantiss" onPress={()=>Alert.alert('Contact Wantiss support','For help, use the support options available in the Wantiss app.')}/></View><View style={styles.stripe}/><View style={styles.section}><Text style={styles.sectionTitle}>QUICK ANSWERS</Text><Text style={styles.faqTitle}>How do I update my profile?</Text><Text style={styles.hint}>Open Personal Information, update your details, and save.</Text><Text style={styles.faqTitle}>How do I manage my account security?</Text><Text style={styles.hint}>Open Account & Security from Settings.</Text></View></>}
   {kind==='about' && <><View style={styles.brand}><View style={styles.logo}><Text style={styles.logoText}>W</Text></View><Text style={styles.brandTitle}>Wantiss</Text><Text style={styles.value}>Everyday essentials, connected.</Text><Text style={styles.value}>Version 1.0.0</Text></View><View style={styles.stripe}/><View style={styles.section}><Row label="Terms of Service" onPress={()=>Alert.alert('Terms of Service','Review the terms that apply to your use of Wantiss.')}/><Row label="Privacy Policy" onPress={()=>Alert.alert('Privacy Policy','Learn how Wantiss handles your information.')}/><Row label="Licenses" onPress={()=>Alert.alert('Open-source licenses','View notices for software used by Wantiss.')}/></View><Text style={styles.hint}>Wantiss is built to make everyday services more accessible to customers in Haiti and the diaspora.</Text></>}
  </ScrollView>
 </View>;
}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:'#FFFFFF'},header:{minHeight:58,paddingHorizontal:16,paddingBottom:12,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#F0EDF0',backgroundColor:'#FFFFFF'},back:{width:36,height:34,alignItems:'flex-start',justifyContent:'center'},title:{flex:1,textAlign:'center',color:INK,fontSize:20,lineHeight:27,fontWeight:'700',letterSpacing:-.25},balance:{width:36},content:{paddingBottom:32},section:{paddingHorizontal:18,paddingTop:18,paddingBottom:12,backgroundColor:'#FFFFFF'},sectionTitle:{color:MUTED,fontSize:11,lineHeight:15,fontWeight:'600',letterSpacing:.45,marginBottom:8},stripe:{height:10,width:'100%',backgroundColor:PINK},row:{minHeight:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#F2F0F2'},label:{color:'#262626',fontSize:15,lineHeight:21},value:{color:MUTED,fontSize:12,lineHeight:18,marginTop:3},choice:{minHeight:50,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#F2F0F2'},hint:{marginHorizontal:18,marginTop:10,marginBottom:16,color:MUTED,fontSize:12,lineHeight:18},field:{marginBottom:12},fieldLabel:{fontSize:13,color:MUTED,marginBottom:6},input:{minHeight:46,borderWidth:1,borderColor:'#EAE5EB',borderRadius:9,paddingHorizontal:12,color:INK,fontSize:15},primary:{marginHorizontal:18,marginTop:12,minHeight:48,borderRadius:10,backgroundColor:INK,alignItems:'center',justifyContent:'center'},primaryText:{color:'#FFFFFF',fontSize:14,fontWeight:'600'},secondary:{marginHorizontal:18,minHeight:46,borderRadius:10,borderWidth:1,borderColor:PINK,alignItems:'center',justifyContent:'center'},secondaryText:{color:INK,fontSize:14,fontWeight:'600'},savedCard:{padding:14,borderWidth:1,borderColor:'#F0EDF0',borderRadius:10},link:{color:INK,fontSize:13,fontWeight:'600',marginTop:10},faqTitle:{color:INK,fontSize:14,fontWeight:'600',marginTop:12},brand:{alignItems:'center',paddingVertical:32},logo:{width:64,height:64,borderRadius:20,backgroundColor:PINK,alignItems:'center',justifyContent:'center'},logoText:{fontSize:32,fontWeight:'800',color:INK},brandTitle:{fontSize:22,fontWeight:'700',color:INK,marginTop:12}
});
