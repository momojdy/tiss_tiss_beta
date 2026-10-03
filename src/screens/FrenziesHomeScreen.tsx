import React, { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from '../lib/supabase';

import { colors, sizes, tournamentTiers, TournamentTierKey } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import { assets, gameImageFit } from '../theme/frenziesAssets';
import GradientBox from '../components/frenzies/GradientBox';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import HeroBanner from '../components/frenzies/HeroBanner';

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false,
});

type ScreenHandlers = {
  onBack?: () => void;
  onPlayGame?: (gameId: string) => void;
  onOpenTier?: (tier: TournamentTierKey) => void;
  onGetPass?: () => void;
};

function SectionHeader({ title, link }: { title: string; link: string }) {
  return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionLink}><Text style={styles.sectionLinkText}>{link}</Text><MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} /></View></View>;
}

type GameCfg = {
  id:string; gameKey:string; image:ImageSourcePropType; fit:{width:number;height:number;resizeMode:'cover'|'contain';radius:number}; title:string; subtitle:string; duration:string; badgeBg:string; durBg:string; badgeLeft:number; durRight:number; titleTop:number; titleColor:string; subTop:number; subColor:string; textOpacity:number; btnLabel:string; btnTop:number; btnLeft:number; btnBg:string; btnText:string;
};
const rps=(id:string,edge:number,duration:string):GameCfg=>({id,gameKey:'rps',image:assets.rps,fit:gameImageFit.rps,title:'Rock Paper\nScissors',subtitle:'Familiar player',duration,badgeBg:colors.gameCard.badgeRps,durBg:colors.gameCard.badgeRpsTime,badgeLeft:edge,durRight:edge,titleTop:101.85,titleColor:colors.textDark,subTop:138.05,subColor:colors.white,textOpacity:.85,btnLabel:'Play',btnTop:159,btnLeft:12.5,btnBg:colors.gameCard.playBg,btnText:colors.gameCard.playText});
const GAMES:GameCfg[]=[
 rps('rps-1',6,'2min'),
 {id:'lls',gameKey:'lls',image:assets.lls,fit:gameImageFit.lls,title:'Load Lock Ship',subtitle:'Race to load your cargo\nand ship it',duration:'4min',badgeBg:colors.gameCard.badgeRps,durBg:colors.gameCard.badgeRpsTime,badgeLeft:6,durRight:6,titleTop:103.4,titleColor:colors.white,subTop:123.6,subColor:colors.white,textOpacity:1,btnLabel:'Challenge',btnTop:157,btnLeft:12.375,btnBg:colors.gameCard.challengeBg,btnText:colors.gameCard.challengeText},
 {id:'korido',gameKey:'korido',image:assets.korido,fit:gameImageFit.korido,title:'Koridò',subtitle:'Avoid the barricades',duration:'7min',badgeBg:colors.gameCard.badgeKorido,durBg:colors.gameCard.badgeKoridoTime,badgeLeft:4,durRight:4,titleTop:113.4,titleColor:colors.black,subTop:135.55,subColor:colors.black,textOpacity:.85,btnLabel:'Play',btnTop:159,btnLeft:12.5,btnBg:colors.gameCard.playBg,btnText:colors.gameCard.playText},
 rps('rps-2',4,'2min'),rps('rps-3',4,'2min')
];

function GameCard({g,onPlay}:{g:GameCfg;onPlay?: (gameId:string)=>void}){return <View style={styles.gameCard}><View style={{position:'absolute',top:0,left:0,width:g.fit.width,height:g.fit.height,borderRadius:g.fit.radius,overflow:'hidden'}}><Image source={g.image} style={{width:'100%',height:'100%'}} resizeMode={g.fit.resizeMode}/></View><View style={[styles.badge,{left:g.badgeLeft,backgroundColor:g.badgeBg}]}><Text style={tx(10,fonts.medium)}>PvP</Text></View><View style={[styles.badge,styles.durBadge,{right:g.durRight,backgroundColor:g.durBg}]}><MaterialCommunityIcons name="timer-outline" size={11} color={colors.textPrimary}/><Text style={[tx(8,fonts.regular),{paddingTop:2,paddingRight:2,paddingBottom:1}]}>{g.duration}</Text></View><Text style={[tx(15,fonts.bold,g.titleColor),{position:'absolute',left:4,top:g.titleTop,opacity:g.textOpacity}]}>{g.title}</Text><Text style={[tx(11.5,fonts.regular,g.subColor),{position:'absolute',left:4,top:g.subTop,opacity:g.textOpacity}]}>{g.subtitle}</Text><Pressable onPress={()=>onPlay?.(g.gameKey)} style={[styles.gameBtn,{top:g.btnTop,left:g.btnLeft,backgroundColor:g.btnBg}]}><Text style={tx(16,fonts.semibold,g.btnText)}>{g.btnLabel}</Text></Pressable></View>}

function RankingsCard(){return <View style={styles.rankCard}><Text style={[tx(13,fonts.regular,colors.textSecondary),{padding:16}]}>Rankings will load from player data.</Text></View>}

function TournamentCard({t,first,onOpen}:{t:{key:TournamentTierKey;width:number};first:boolean;onOpen?: (tier:TournamentTierKey)=>void}){const th=tournamentTiers[t.key];return <Pressable onPress={()=>onOpen?.(t.key)} style={{marginLeft:first?18:15}}><GradientBox gradient={th.gradient} style={{width:t.width,height:200,borderRadius:20,overflow:'hidden'}}><Text style={tx(15,fonts.medium,th.text)}>{t.key}</Text></GradientBox></Pressable>}

function PassCard({onGetPass}:{onGetPass?:()=>void}){return <View style={{paddingHorizontal:18,paddingTop:20}}><Pressable onPress={onGetPass} style={[styles.passCard,{backgroundColor:colors.pass.bg,borderColor:colors.pass.border}]}><Text style={tx(14,fonts.bold)}>Frenzies Pass</Text></Pressable></View>}

function NavItem({icon,label}:{icon:React.ReactNode;label:string}){return <View style={styles.navItem}>{icon}<Text style={[tx(11,fonts.medium),{marginTop:6}]}>{label}</Text></View>}

function BottomNav(){const insets=useSafeAreaInsets();return <View style={{padding:2,paddingBottom:Math.max(2,insets.bottom),backgroundColor:colors.pageBg}}><View style={styles.navBar}><NavItem label="Home" icon={<MaterialCommunityIcons name="home-outline" size={32} color={colors.nav.active}/>}/><NavItem label="Contacts" icon={<MaterialCommunityIcons name="contacts-outline" size={32} color={colors.nav.inactive}/>}/><NavItem label="Battle" icon={<FontAwesome5 name="battle-net" brand size={52} color={colors.nav.inactive}/>}/><NavItem label="Wallet" icon={<MaterialCommunityIcons name="wallet-outline" size={32} color={colors.nav.inactive}/>}/><NavItem label="Profile" icon={<MaterialIcons name="tag-faces" size={32} color={colors.nav.inactive}/>}/></View></View>}

export function FrenziesHomeScreen({onBack,onPlayGame,onOpenTier,onGetPass}:ScreenHandlers){
 const [points,setPoints]=useState<number|null>(null);
 useEffect(()=>{let mounted=true;const load=async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data,error}=await supabase.from('frenzies_player_stats').select('lifetime_points').eq('user_id',user.id).maybeSingle();if(!error&&mounted)setPoints(data?.lifetime_points ?? 0);};load();return()=>{mounted=false;};},[]);
 return <View style={{flex:1,backgroundColor:colors.pageBg}}><StatusBar style="dark"/><FrenziesHeader points={points} onBack={onBack}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:20}}><HeroBanner/><View style={{paddingTop:18}}><SectionHeader title="Play now " link="View all"/></View><ScrollView horizontal showsHorizontalScrollIndicator={false}>{GAMES.map(g=><GameCard key={g.id} g={g} onPlay={onPlayGame}/>)}</ScrollView><RankingsCard/><View style={{paddingTop:18}}><SectionHeader title="Tournaments" link="Compete"/></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>{([{key:'t1',width:185},{key:'t5',width:200},{key:'t20',width:200},{key:'t50',width:200},{key:'t100',width:200},{key:'ultimate',width:200}] as const).map((t,i)=><TournamentCard key={t.key} t={t} first={i===0} onOpen={onOpenTier}/>)}</ScrollView><PassCard onGetPass={onGetPass}/></ScrollView><BottomNav/></View>;
}

export default function App({onBack,onPlayGame,onOpenTier,onGetPass}:ScreenHandlers){const [loaded]=useFonts({Inter_400Regular,Inter_500Medium,Inter_600SemiBold,Inter_700Bold});if(!loaded)return null;return <SafeAreaProvider><FrenziesHomeScreen onBack={onBack} onPlayGame={onPlayGame} onOpenTier={onOpenTier} onGetPass={onGetPass}/></SafeAreaProvider>}

const styles=StyleSheet.create({
 sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{...tx(17,fonts.bold),marginLeft:18},sectionLink:{flexDirection:'row',alignItems:'center',marginRight:10},sectionLinkText:tx(14,fonts.regular,colors.textSecondary),
 gameCard:{width:150,height:200,marginLeft:13,marginTop:16},badge:{position:'absolute',top:6,width:30,height:15,borderRadius:5,alignItems:'center',justifyContent:'center'},durBadge:{flexDirection:'row',justifyContent:'flex-start'},gameBtn:{position:'absolute',width:125,height:30,borderRadius:8,alignItems:'center',justifyContent:'center',opacity:.9},
 rankCard:{marginHorizontal:10,height:100,borderRadius:20,borderWidth:1,borderColor:colors.rankings.cardBorder,backgroundColor:colors.white},
 passCard:{borderRadius:20,borderWidth:1,padding:16},navItem:{width:70,height:50,alignItems:'center',justifyContent:'center'},navBar:{width:'100%',height:90,borderRadius:20,backgroundColor:colors.nav.bg,flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',elevation:4,shadowColor:'#000',shadowOpacity:.2,shadowRadius:4,shadowOffset:{width:0,height:2}}
});
