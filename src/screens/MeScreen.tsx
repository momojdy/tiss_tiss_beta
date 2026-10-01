import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View
} from 'react-native';
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
import {
  FeedCard,
  FeedEmptyState,
  FeedFooter,
  FeedItem,
  FeedTabs,
  TabKey,
  useFeed
} from '../components/me/MeFeed';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const MAGENTA = '#BF008E';
const INK = '#1E1B3A';
const MUTED = '#73728A';
const WANTISS_LOGO = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';
const DEFAULT_AVATAR = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainDefaultAvatar.PNG';

type Props = {
  onHomePress?:()=>void;
  onAvatarPress?:()=>void;
  onNamePress?:()=>void;
  onQRPress?:()=>void;
  onMembershipPress?:()=>void;
  onMemberCenterPress?:()=>void;
  onAddressPress?:()=>void;
  onWalletPress?:()=>void;
  onSettingsPress?:()=>void;
  onPromoPress?:()=>void;
  onFeedItemPress?:(item:FeedItem)=>void
};

function NavLabel({children}:{children:string}){
  return <Text style={styles.navLabel}>{children}</Text>
}

function BottomNav({onHomePress}:Pick<Props,'onHomePress'>){
  return (
    <View style={styles.navOuter}>
      <View style={styles.nav}>
        <Pressable onPress={onHomePress} style={styles.homeButton}>
          <View style={styles.homeCircle}>
            <Image
              source={{uri:WANTISS_LOGO}}
              style={styles.homeLogo}
              resizeMode="contain"
            />
          </View>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="television-play" size={32} color={MAGENTA}/>
          <NavLabel>Showcase</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="message-text-outline" size={30} color={MAGENTA}/>
          <NavLabel>Messages</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="cart-arrow-right" size={32} color={MAGENTA}/>
          <NavLabel>Cart</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="emoticon-happy-outline" size={32} color={MAGENTA}/>
          <NavLabel>Me</NavLabel>
        </Pressable>
      </View>
    </View>
  )
}

function ActionItem({
  label,
  icon,
  onPress
}:{
  label:string;
  icon:React.ReactNode;
  onPress?:()=>void
}){
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.action}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

/* Shown only while the feed is expanded. Tap anywhere on it to go back to the full page. */
function CompactHeader({
  name,
  onCollapse,
  onAddressPress,
  onWalletPress,
  onSettingsPress
}:{
  name:string;
  onCollapse:()=>void;
  onAddressPress?:()=>void;
  onWalletPress?:()=>void;
  onSettingsPress?:()=>void
}){
  const insets=useSafeAreaInsets();

  return (
    <Pressable
      onPress={onCollapse}
      accessibilityRole="button"
      accessibilityLabel="Show full profile"
      style={[styles.compact,{paddingTop:insets.top+20}]}
    >
      <Text style={styles.compactName} numberOfLines={1}>{name}</Text>

      <View style={styles.actions}>
        <ActionItem
          label="Address"
          icon={<Ionicons name="location-outline" size={18} color={INK}/>}
          onPress={onAddressPress}
        />

        <ActionItem
          label="Wallet"
          icon={<Ionicons name="wallet-outline" size={18} color={INK}/>}
          onPress={onWalletPress}
        />

        <ActionItem
          label="Settings"
          icon={<Ionicons name="settings-outline" size={18} color={INK}/>}
          onPress={onSettingsPress}
        />
      </View>
    </Pressable>
  )
}

function MeContent({
  onHomePress,
  onAvatarPress,
  onNamePress,
  onQRPress,
  onMembershipPress,
  onMemberCenterPress,
  onAddressPress,
  onWalletPress,
  onSettingsPress,
  onPromoPress,
  onFeedItemPress
}:Props){
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const [fullName,setFullName]=useState('');
  const [userId,setUserId]=useState('');
  const membershipTier='Basic';

  const [active,setActive]=useState<TabKey>('for_you');
  const [expanded,setExpanded]=useState(false);
  const listRef=useRef<FlatList<FeedItem>>(null);
  const {state,load}=useFeed(userId);
  const tab=state[active];

  const SIDE=14;
  const GAP=10;
  const cardWidth=Math.floor((width-SIDE*2-GAP)/2);

  useEffect(()=>{
    let alive=true;

    (async()=>{
      try{
        const {data:{user}}=await supabase.auth.getUser();

        if(!user?.id)return;

        if(alive)setUserId(user.id);

        const {data,error}=await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id',user.id)
          .maybeSingle();

        if(error||!alive)return;

        setFullName((data?.full_name??'').trim());
      }catch{}
    })();

    return()=>{alive=false}
  },[]);

  useEffect(()=>{
    if(active!=='for_you'&&!userId)return;
    if(!tab.loaded&&!tab.loading)load(active);
  },[active,userId,tab.loaded,tab.loading,load]);

  const animate=()=>LayoutAnimation.configureNext(LayoutAnimation.create(240,'easeInEaseOut','opacity'));
  const toTop=()=>listRef.current?.scrollToOffset({offset:0,animated:false});

  const handleSelectTab=(key:TabKey)=>{
    animate();
    setActive(key);
    setExpanded(true);
    toTop();
  };

  const handleCollapse=()=>{
    animate();
    setExpanded(false);
    toTop();
  };

  const topContent=(
    <>
      <View style={[styles.header,{paddingTop:insets.top+20}]}>
        <Pressable
          onPress={onAvatarPress}
          hitSlop={8}
          style={styles.avatarButton}
        >
          <Image
            source={{uri:DEFAULT_AVATAR}}
            style={styles.avatar}
            resizeMode="cover"
          />
        </Pressable>

        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Pressable
              onPress={onNamePress}
              style={styles.namePressable}
              hitSlop={4}
            >
              <Text style={styles.name} numberOfLines={1}>
                {fullName}
              </Text>
            </Pressable>

            <Pressable
              onPress={onQRPress}
              hitSlop={10}
              style={styles.qrButton}
            >
              <Ionicons
                name="qr-code-outline"
                size={18}
                color={MUTED}
              />
            </Pressable>
          </View>

          <View style={styles.memberRow}>
            <Pressable
              onPress={onMembershipPress}
              style={styles.membershipBadge}
            >
              <Text style={styles.membershipText}>
                {membershipTier}
              </Text>
            </Pressable>

            <View style={styles.memberDivider}/>

            <Pressable
              onPress={onMemberCenterPress}
              hitSlop={6}
              style={styles.memberCenter}
            >
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={14}
                color={MAGENTA}
              />
              <Text
                style={styles.memberCenterText}
                numberOfLines={1}
              >
                Member
              </Text>
              <Ionicons
                name="chevron-forward"
                size={12}
                color={INK}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.actions}>
          <ActionItem
            label="Address"
            icon={<Ionicons name="location-outline" size={18} color={INK}/>}
            onPress={onAddressPress}
          />

          <ActionItem
            label="Wallet"
            icon={<Ionicons name="wallet-outline" size={18} color={INK}/>}
            onPress={onWalletPress}
          />

          <ActionItem
            label="Settings"
            icon={<Ionicons name="settings-outline" size={18} color={INK}/>}
            onPress={onSettingsPress}
          />
        </View>
      </View>

      <MeSavingsCard
        totalSavings={0}
        onPressSavings={()=>{}}
        onPressMemberCenter={onMemberCenterPress}
        onPressRedeemCard={()=>{}}
      />

      <MePromoBanner onPressClaim={onPromoPress}/>
      <MeQuickLinksRow/>
      <MeOrdersCard/>
      <MeServicesRow/>
      <MeCouponCenter/>
    </>
  );

  return (
    <View style={styles.page}>
      <StatusBar style="dark"/>

      <LinearGradient
        colors={['#FCE4F1','#FCE4F1','#FDF0F6','#FFFFFF']}
        locations={[0,.48,.76,1]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {expanded&&(
        <CompactHeader
          name={fullName}
          onCollapse={handleCollapse}
          onAddressPress={onAddressPress}
          onWalletPress={onWalletPress}
          onSettingsPress={onSettingsPress}
        />
      )}

      <FlatList
        ref={listRef}
        data={tab.items}
        keyExtractor={(item)=>item.id}
        numColumns={2}
        columnWrapperStyle={styles.feedColumns}
        renderItem={({item})=>(
          <FeedCard item={item} width={cardWidth} onPress={onFeedItemPress}/>
        )}
        ListHeaderComponent={
          <View>
            {!expanded&&topContent}
            <FeedTabs active={active} onSelect={handleSelectTab}/>
          </View>
        }
        stickyHeaderIndices={expanded?[0]:undefined}
        ListEmptyComponent={
          <FeedEmptyState
            tab={active}
            state={tab}
            cardWidth={cardWidth}
            onRetry={()=>load(active,true)}
          />
        }
        ListFooterComponent={<FeedFooter loading={tab.loading} hasItems={tab.items.length>0}/>}
        onEndReached={()=>{if(tab.loaded)load(active)}}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      />

      <BottomNav onHomePress={onHomePress}/>
    </View>
  )
}

export default function MeScreen(props:Props){
  return (
    <SafeAreaProvider>
      <MeContent {...props}/>
    </SafeAreaProvider>
  )
}

const styles=StyleSheet.create({
  page:{
    flex:1,
    backgroundColor:'#FFFFFF'
  },

  gradient:{
    position:'absolute',
    top:0,
    left:0,
    right:0,
    height:350
  },

  scrollContent:{
    paddingBottom:130
  },

  header:{
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:16,
    paddingBottom:17
  },

  avatarButton:{
    width:52,
    height:52,
    alignItems:'center',
    justifyContent:'center',
    flexShrink:0
  },

  avatar:{
    width:52,
    height:52,
    borderRadius:26,
    backgroundColor:'#F8D7EA',
    borderWidth:1.5,
    borderColor:'#FFFFFF'
  },

  profileInfo:{
    flex:1,
    minWidth:0,
    marginLeft:10,
    justifyContent:'center'
  },

  nameRow:{
    flexDirection:'row',
    alignItems:'center',
    minHeight:25
  },

  namePressable:{
    flexShrink:1,
    minWidth:0
  },

  name:{
    color:INK,
    fontSize:19,
    lineHeight:23,
    fontWeight:'700',
    letterSpacing:-.25
  },

  qrButton:{
    width:20,
    height:20,
    marginLeft:7,
    alignItems:'center',
    justifyContent:'center',
    flexShrink:0
  },

  memberRow:{
    flexDirection:'row',
    alignItems:'center',
    marginTop:5,
    minHeight:21
  },

  membershipBadge:{
    width:45,
    height:15,
    alignItems:'center',
    justifyContent:'center',
    paddingLeft:6,
    paddingRight:3,
    borderRadius:11,
    backgroundColor:MAGENTA
  },

  membershipText:{
    color:'#FFFFFF',
    fontSize:11,
    lineHeight:13,
    fontWeight:'600'
  },

  memberDivider:{
    width:1,
    height:13,
    marginHorizontal:8,
    backgroundColor:'#C9C4D4'
  },

  memberCenter:{
    flexDirection:'row',
    alignItems:'center',
    flexShrink:1,
    minWidth:0
  },

  memberCenterText:{
    marginLeft:2.5,
    marginRight:2,
    color:INK,
    fontSize:10,
    lineHeight:15,
    fontWeight:'500',
    flexShrink:1
  },

  actions:{
    flexDirection:'row',
    alignItems:'flex-start',
    paddingLeft:20,
    flexShrink:0
  },

  action:{
    width:41,
    alignItems:'center',
    justifyContent:'flex-start',
    flexShrink:0
  },

  actionIcon:{
    width:26,
    height:26,
    alignItems:'center',
    justifyContent:'center'
  },

  actionLabel:{
    marginTop:2,
    color:INK,
    fontSize:9,
    lineHeight:12,
    fontWeight:'500',
    textAlign:'center'
  },

  compact:{
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:16,
    paddingBottom:12
  },

  compactName:{
    flex:1,
    marginRight:12,
    color:INK,
    fontSize:19,
    lineHeight:23,
    fontWeight:'700',
    letterSpacing:-.25
  },

  feedColumns:{
    gap:10,
    paddingHorizontal:14,
    marginBottom:18
  },

  navOuter:{
    position:'absolute',
    left:0,
    right:0,
    bottom:18,
    paddingHorizontal:2
  },

  nav:{
    height:80,
    borderRadius:20,
    backgroundColor:'#FFFFFF',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-evenly',
    elevation:6,
    shadowColor:'#000',
    shadowOpacity:.15,
    shadowRadius:6,
    shadowOffset:{width:0,height:3}
  },

  homeButton:{
    width:70,
    height:65,
    alignItems:'center'
  },

  homeCircle:{
    marginTop:4.5,
    width:60,
    height:60,
    borderRadius:30,
    borderWidth:1,
    borderColor:'#D593B0',
    alignItems:'center',
    justifyContent:'center',
    overflow:'hidden'
  },

  homeLogo:{
    width:58,
    height:58,
    borderRadius:29
  },

  navButton:{
    width:70,
    height:50,
    alignItems:'center',
    justifyContent:'flex-end'
  },

  navLabel:{
    paddingTop:5,
    fontSize:11,
    color:'#1F1E1E',
    fontFamily:'Inter_500Medium',
    textAlign:'center'
  }
});