import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import MeSavingsCard from '../components/me/MeSavingsCard';
import MePromoBanner from '../components/me/MePromoBanner';
import MeQuickLinksRow from '../components/me/MeQuickLinksRow';
import MeOrdersCard from '../components/me/MeOrdersCard';
import MeServicesRow from '../components/me/MeServicesRow';
import MeCouponCenter from '../components/me/MeCouponCenter';

const MAGENTA = '#BF008E';
const INK = '#1E1B3A';
const MUTED = '#73728A';
const WANTISS_LOGO = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';
const DEFAULT_AVATAR = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainDefaultAvatar.PNG';

type Props = { onHomePress?:()=>void; onAvatarPress?:()=>void; onNamePress?:()=>void; onQRPress?:()=>void; onMembershipPress?:()=>void; onMemberCenterPress?:()=>void; onAddressPress?:()=>void; onWalletPress?:()=>void; onSettingsPress?:()=>void; onPromoPress?:()=>void };
function NavLabel({children}:{children:string}){return <Text style={styles.navLabel}>{children}</Text>}
const NAV_MUTED = '#9A96A3';
const MESSAGE_UNREAD_COUNT = 1;
function MessageBadge({count}:{count:number}){if(count<=0)return null;const label=count>99?'99+':String(count);return <View style={styles.messageBadge}><Text style={styles.messageBadgeText}>{label}</Text></View>}
function BottomNav({onHomePress}:Pick<Props,'onHomePress'>){return <View style={styles.navOuter}><View style={styles.nav}><Pressable onPress={onHomePress} style={styles.homeButton}><View style={styles.homeCircle}><Image source={{uri:WANTISS_LOGO}} style={styles.homeLogo} resizeMode="contain"/></View></Pressable><Pressable style={styles.navButton}><MaterialCommunityIcons name="television-play" size={29} color={NAV_MUTED}/><NavLabel>Showcase</NavLabel></Pressable><Pressable style={styles.navButton}><View style={styles.messageIconWrap}><MaterialCommunityIcons name="message-text-outline" size={27} color={NAV_MUTED}/><MessageBadge count={MESSAGE_UNREAD_COUNT}/></View><NavLabel>Messages</NavLabel></Pressable><Pressable style={styles.navButton}><MaterialCommunityIcons name="cart-outline" size={29} color={NAV_MUTED}/><NavLabel>Cart</NavLabel></Pressable><Pressable style={styles.navButton}><MaterialCommunityIcons name="emoticon-happy-outline" size={29} color={MAGENTA}/><NavLabel>Me</NavLabel></Pressable></View></View>}
function ActionItem({label,icon,onPress}:{label:string;icon:React.ReactNode;onPress?:()=>void}){return <Pressable onPress={onPress} hitSlop={8} style={styles.action}><View style={styles.actionIcon}>{icon}</View><Text style={styles.actionLabel} numberOfLines={1}>{label}</Text></Pressable>}
function FeedTab({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.feedTabPressable}><Text style={[styles.feedTab,active&&styles.feedTabActive]}>{label}</Text><View style={[styles.feedTabDivider,active&&styles.feedTabDividerActive]}/></Pressable>}

const FEED_TABS=[
  {key:'forYou',label:'For You'},
  {key:'favorites',label:'My Favorites'},
  {key:'reviews',label:'My Reviews'},
] as const;

function FeedTabs({activeTab,onChange}:{activeTab:'forYou'|'favorites'|'reviews';onChange:(tab:'forYou'|'favorites'|'reviews')=>void}){return <View style={styles.feedTabs}>{FEED_TABS.map(tab=><FeedTab key={tab.key} label={tab.label} active={activeTab===tab.key} onPress={()=>onChange(tab.key)}/>)}</View>}

function feedTitle(tab:'forYou'|'favorites'|'reviews'){if(tab==='favorites')return 'My Favorites';if(tab==='reviews')return 'My Reviews';return 'For You'}

function MeContent({onHomePress,onAvatarPress,onNamePress,onQRPress,onMembershipPress,onMemberCenterPress,onAddressPress,onWalletPress,onSettingsPress,onPromoPress}:Props){
  const insets=useSafeAreaInsets();
  const [fullName,setFullName]=useState('');
  const [isFeedMode,setIsFeedMode]=useState(false);
  const [activeTab,setActiveTab]=useState<'forYou'|'favorites'|'reviews'>('forYou');
  const membershipTier='Basic';

  const loadProfile=useCallback(async()=>{
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user?.id)return;

      const {data,error}=await supabase
        .from('profiles')
        .select('full_name')
        .eq('id',user.id)
        .maybeSingle();

      if(error)return;
      setFullName((data?.full_name??'').trim());
    }catch{}
  },[]);

  useEffect(()=>{
    loadProfile();
  },[loadProfile]);

  const selectTab=(tab:'forYou'|'favorites'|'reviews')=>{
    setActiveTab(tab);
    setIsFeedMode(true);
  };

  return <View style={styles.page}>
    <StatusBar style="dark"/>
    <LinearGradient colors={['#FCE4F1','#FCE4F1','#FDF0F6','#FFFFFF']} locations={[0,.48,.76,1]} style={styles.gradient} pointerEvents="none"/>

    {isFeedMode ? (
      <View style={styles.feedMode}>
        <LinearGradient colors={['#FCE4F1','#FCE4F1','#FDF0F6','#FFFFFF']} locations={[0,.48,.76,1]} style={[styles.compactHeader,{paddingTop:insets.top+14}]}><Pressable onPress={()=>setIsFeedMode(false)} style={styles.compactHeaderPressable}>
          <Text style={styles.compactName} numberOfLines={1}>{fullName}</Text>
          <Ionicons name="chevron-down" size={18} color={INK}/>
          <View style={styles.compactActions}>
            <ActionItem label="Address" icon={<Ionicons name="location-outline" size={17} color={INK}/>} onPress={onAddressPress}/>
            <ActionItem label="Wallet" icon={<Ionicons name="wallet-outline" size={17} color={INK}/>} onPress={onWalletPress}/>
            <ActionItem label="Settings" icon={<Ionicons name="settings-outline" size={17} color={INK}/>} onPress={onSettingsPress}/>
          </View>
        </Pressable></LinearGradient>

        <FeedTabs activeTab={activeTab} onChange={selectTab}/>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.feedArea}>
            <Text style={styles.feedAreaText}>{feedTitle(activeTab)}</Text>
          </View>
        </ScrollView>
      </View>
    ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header,{paddingTop:insets.top+20}]}>
          <Pressable onPress={onAvatarPress} hitSlop={8} style={styles.avatarButton}>
            <Image source={{uri:DEFAULT_AVATAR}} style={styles.avatar} resizeMode="cover"/>
          </Pressable>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Pressable onPress={onNamePress} style={styles.namePressable} hitSlop={4}>
                <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
              </Pressable>
              <Pressable onPress={onQRPress} hitSlop={10} style={styles.qrButton}>
                <Ionicons name="qr-code-outline" size={18} color={MUTED}/>
              </Pressable>
            </View>

            <View style={styles.memberRow}>
              <Pressable onPress={onMembershipPress} style={styles.membershipBadge}>
                <Text style={styles.membershipText}>{membershipTier}</Text>
              </Pressable>
              <View style={styles.memberDivider}/>
              <Pressable onPress={onMemberCenterPress} hitSlop={6} style={styles.memberCenter}>
                <MaterialCommunityIcons name="card-account-details-outline" size={14} color={MAGENTA}/>
                <Text style={styles.memberCenterText} numberOfLines={1}>Member</Text>
                <Ionicons name="chevron-forward" size={12} color={INK}/>
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            <ActionItem label="Address" icon={<Ionicons name="location-outline" size={18} color={INK}/>} onPress={onAddressPress}/>
            <ActionItem label="Wallet" icon={<Ionicons name="wallet-outline" size={18} color={INK}/>} onPress={onWalletPress}/>
            <ActionItem label="Settings" icon={<Ionicons name="settings-outline" size={18} color={INK}/>} onPress={onSettingsPress}/>
          </View>
        </View>

        <MeSavingsCard totalSavings={0} onPressSavings={()=>{}} onPressMemberCenter={onMemberCenterPress} onPressRedeemCard={()=>{}}/>
        <MePromoBanner onPressClaim={onPromoPress}/>
        <MeQuickLinksRow/>
        <MeOrdersCard/>
        <MeServicesRow/>
        <MeCouponCenter/>

        <FeedTabs activeTab={activeTab} onChange={selectTab}/>
      </ScrollView>
    )}

    <BottomNav onHomePress={onHomePress}/>
  </View>
}
export default function MeScreen(props:Props){return <SafeAreaProvider><MeContent {...props}/></SafeAreaProvider>}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#FFFFFF'},gradient:{position:'absolute',top:0,left:0,right:0,height:350},scrollContent:{paddingBottom:130},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingBottom:17},avatarButton:{width:52,height:52,alignItems:'center',justifyContent:'center',flexShrink:0},avatar:{width:52,height:52,borderRadius:26,backgroundColor:'#F8D7EA',borderWidth:1.5,borderColor:'#FFFFFF'},profileInfo:{flex:1,minWidth:0,marginLeft:10,justifyContent:'center'},nameRow:{flexDirection:'row',alignItems:'center',minHeight:25},namePressable:{flexShrink:1,minWidth:0},name:{color:INK,fontSize:19,lineHeight:23,fontWeight:'700',letterSpacing:-.25},qrButton:{width:20,height:20,marginLeft:7,alignItems:'center',justifyContent:'center',flexShrink:0},memberRow:{flexDirection:'row',alignItems:'center',marginTop:5,minHeight:21},membershipBadge:{width:45,height:15,alignItems:'center',justifyContent:'center',paddingLeft:6,paddingRight:3,borderRadius:11,backgroundColor:MAGENTA},membershipText:{color:'#FFFFFF',fontSize:11,lineHeight:13,fontWeight:'600'},memberDivider:{width:1,height:13,marginHorizontal:8,backgroundColor:'#C9C4D4'},memberCenter:{flexDirection:'row',alignItems:'center',flexShrink:1,minWidth:0},memberCenterText:{marginLeft:2.5,marginRight:2,color:INK,fontSize:10,lineHeight:15,fontWeight:'500',flexShrink:1},actions:{flexDirection:'row',alignItems:'flex-start',paddingLeft:20,flexShrink:0},action:{width:41,alignItems:'center',justifyContent:'flex-start',flexShrink:0},actionIcon:{width:26,height:26,alignItems:'center',justifyContent:'center'},actionLabel:{marginTop:2,color:INK,fontSize:9,lineHeight:12,fontWeight:'500',textAlign:'center'},foundationSpace:{minHeight:0},compactHeader:{position:'relative',zIndex:5,minHeight:76,paddingBottom:10,flexDirection:'row',alignItems:'center',paddingHorizontal:16,borderBottomLeftRadius:14,borderBottomRightRadius:14,overflow:'hidden'},compactHeaderPressable:{flex:1,minHeight:76,paddingBottom:10,flexDirection:'row',alignItems:'center'},compactName:{flex:1,color:INK,fontSize:19,fontWeight:'700',marginRight:6},compactActions:{flexDirection:'row',alignItems:'flex-start',marginLeft:8},feedMode:{flex:1},feedTabPressable:{flex:1,alignItems:'center',paddingTop:8},feedTabs:{flexDirection:'row',justifyContent:'space-around',paddingTop:8,paddingBottom:14,backgroundColor:'#FFFFFF'},feedTab:{fontSize:15,fontWeight:'500',color:'#8D8A9F'},feedTabActive:{color:MAGENTA,fontWeight:'500'},feedTabDivider:{alignSelf:'stretch',height:1,marginTop:7,backgroundColor:'#EEEAF0'},feedTabDividerActive:{backgroundColor:MAGENTA},feedArea:{minHeight:520,alignItems:'center',paddingTop:36,backgroundColor:'#FFFFFF'},feedAreaText:{fontSize:16,fontWeight:'600',color:MUTED},navOuter:{position:'absolute',left:0,right:0,bottom:18,paddingHorizontal:2},nav:{height:70,borderRadius:18,backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',elevation:5,shadowColor:'#000',shadowOpacity:.13,shadowRadius:5,shadowOffset:{width:0,height:2}},homeButton:{width:64,height:60,alignItems:'center'},homeCircle:{marginTop:2,width:56,height:56,borderRadius:28,borderWidth:1,borderColor:'#D593B0',alignItems:'center',justifyContent:'center',overflow:'hidden'},homeLogo:{width:54,height:54,borderRadius:27},navButton:{width:68,height:46,alignItems:'center',justifyContent:'flex-end'},messageIconWrap:{width:30,height:29,alignItems:'center',justifyContent:'center'},messageBadge:{position:'absolute',top:-5,right:-9,minWidth:16,height:16,paddingHorizontal:4,borderRadius:8,backgroundColor:MAGENTA,alignItems:'center',justifyContent:'center'},messageBadgeText:{color:'#FFFFFF',fontSize:9,lineHeight:11,fontWeight:'700'},navLabel:{paddingTop:4,fontSize:10.5,color:'#1F1E1E',fontFamily:'Inter_500Medium',textAlign:'center'}});