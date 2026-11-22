import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, View, Text as RNText, TextProps, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, StatusBar, useColorScheme, useWindowDimensions, StyleSheet, Image} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {useKonsolissCopy, type KonsolissCopy} from './useKonsolissCopy';
import {currentKonsolissContainerLabel, useCurrentKonsolissContainer, type KonsolissContainerStatus} from './useCurrentKonsolissContainer';
import {KONSOLISS_LIFECYCLE_MESSAGES} from './konsolissLifecycleMessages';
import {useKonsolissLoadProgress} from './useKonsolissLoadProgress';
import {useKonsolissContainerOccupancy} from './useKonsolissContainerOccupancy';
import {useKonsolissAssignedContainers} from './useKonsolissAssignedContainers';
import {KONSOLISS_DEMO_CONTAINERS, type KonsolissSelectableContainer} from './konsolissDemoContainers';
import Svg, {Path, G, Circle, Rect, Defs, LinearGradient, Stop} from 'react-native-svg';

const StatusBarCompat: any = StatusBar;


const L = {bg: '#FFFBD4', tx: '#2B1210', mu: '#7a5a52', ac: '#A90E02', tint: 'rgba(169,14,2,0.1)', nav: '#FFFBD4', card: 'rgba(255,255,255,0.55)', bd: 'rgba(169,14,2,0.12)', gr: '#1E8E3E', inp: '#fff9c2'};
const Dk: typeof L = {bg: '#17100F', tx: '#FFFBD4', mu: '#BDB08C', ac: '#FF5B4A', tint: 'rgba(255,251,212,0.09)', nav: '#1E1514', card: 'rgba(255,251,212,0.06)', bd: 'rgba(255,251,212,0.1)', gr: '#5FD38A', inp: '#241a18'};
type Th = typeof L;
const Tx = (p: TextProps) => <RNText {...p} style={[{includeFontPadding: false}, p.style]} />;
const RED = '#A90E02', CREAM = '#FFFBD4', RATE = 550;

const P: Record<string, string> = {
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  calc: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01',
  wh: 'M3 10l9-6 9 6v10H3zM8 20v-6h8v6',
  ct: 'M3 7h18v10H3zM7 7v10M11 7v10M15 7v10',
  ln: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  gl: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  ch: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  home: 'M3 10.5L12 3l9 7.5v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  warehouse: 'M5 16h14a3 3 0 013 3v1H2v-1a3 3 0 013-3zM5 16a2 2 0 01-2-2v-1h18v1a2 2 0 01-2 2M7 13a2 2 0 104 0 2 2 0 10-4 0M13 13a2 2 0 104 0 2 2 0 10-4 0M7 6h10a1 1 0 011 1v4H6V7a1 1 0 011-1zM9 6v5M15 6v5',
  consolidated: 'M4 8l4-3 4 3-4 3-4-3zM8 11l4-3 4 3-4 3-4-3zM12 14l4-3 4 3-4 3-4-3zM4 8v4l4 3M12 8v4l4 3M16 11v4',
  handshake: 'M7 11l2-2 3 3 3-3 2 2-3 3a3 3 0 01-4 0zM9 9L7 7a2 2 0 00-3 0l-1 1 4 4M15 9l2-2a2 2 0 013 0l1 1-4 4M7 12l-2 2a2 2 0 003 3l2-2M17 12l2 2a2 2 0 01-3 3l-2-2',
  hub: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 13v8M13 17h8',
};
const Ic = ({d, c, s = 22, w = 1.8}: {d: string; c: string; s?: number; w?: number}) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><Path d={d} /></Svg>
);

const Fa = (t: Th) => ({fill: t.tint, stroke: t.mu, strokeWidth: 1});
const Wl = (t: Th) => ({fill: 'none', stroke: t.mu, strokeWidth: 1.2});
const CP = ({c}: {c: string}) => (<><Path fill={c} fillOpacity={0.5} d="M10 0l10 5-10 5L0 5z" /><Path fill={c} fillOpacity={0.8} d="M0 5l10 5v12L0 17z" /><Path fill={c} d="M10 10l10-5v12l-10 5z" /></>);
const Cube = ({x, y, w = 20, h = 22, c}: {x: number; y: number; w?: number; h?: number; c: string}) => (<G transform={`translate(${x} ${y}) scale(${w / 20} ${h / 22})`}><CP c={c} /></G>);
const Ctr = ({t, x = 0, y = 0, w = 140, h = 100}: {t: Th; x?: number; y?: number; w?: number; h?: number}) => (<G transform={`translate(${x} ${y}) scale(${w / 140} ${h / 100})`}><Path d="M70 12l54 24-54 24-54-24z" {...Fa(t)} /><Path d="M16 36l54 24v32L16 68zM70 60l54-24v32L70 92z" {...Fa(t)} /><Path d="M34 44v32M52 52v32M88 52v32M106 44v32M43 24l54 24M97 24l-54 24" {...Wl(t)} /></G>);
const ILL: ((t: Th) => React.ReactNode)[] = [
  t => (<><Ctr t={t} /><Cube x={48} y={52} c={t.ac} /><Cube x={68} y={42} c={t.ac} /><Cube x={68} y={64} c={t.ac} /><Cube x={88} y={52} c={t.ac} /></>),
  t => (<><Path d="M60 30l40 18-40 18-40-18z" {...Fa(t)} /><Path d="M20 48l40 18v22L20 70zM60 66l40-18v22L60 88z" {...Fa(t)} /><Path d="M28 62l10 4v10l-10-4zM44 69l10 4v10l-10-4z" {...Wl(t)} /><Cube x={104} y={62} c={t.mu} /><Cube x={114} y={74} w={16} h={18} c={t.mu} /></>),
  t => (<><Path d="M70 50l36 16-36 16-36-16z" {...Fa(t)} /><Path d="M34 66l36 16v10L34 76zM70 82l36-16v10L70 92z" {...Fa(t)} /><Cube x={60} y={42} c={t.ac} /><Circle cx={104} cy={24} r={14} fill={t.gr} /><Path d="M97 24l5 5 9-10" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></>),
  t => (<><Ctr t={t} /><Cube x={34} y={52} c={t.mu} /><Cube x={54} y={62} c={t.mu} /><Cube x={94} y={48} c={t.mu} /><Cube x={74} y={52} c={t.ac} /></>),
  t => (<><Ctr t={t} x={30} y={18} w={80} h={57} /><Path d="M8 76h124l-14 16H22z" {...Fa(t)} /><Path d="M6 98q8-4 16 0t16 0t16 0t16 0t16 0t16 0t16 0" {...Wl(t)} /></>),
];
const KONSOLISS_HOW_IMAGES = [
  require('../../assets/konsoliss/how-it-works/step1.png'),
  require('../../assets/konsoliss/how-it-works/step2.png'),
  require('../../assets/konsoliss/how-it-works/step3.png'),
  require('../../assets/konsoliss/how-it-works/step4.png'),
  require('../../assets/konsoliss/how-it-works/step5.png'),
];
const STEPS = [
  ['Book Space', 'Reserve the CBM you need for your shipment. Starting from 0.02 CBM.'],
  ['Inbound to warehouse', 'Buy on WANTISS, paste a product link for us to purchase, or ship external items to our warehouse.'],
  ['Items processing', 'We verify incoming items and optimize packaging when needed.'],
  ['Load items', 'Allocate items to your reserved space.'],
  ['Container departs', 'Your orders are shipped and delivered to you or ready for pickup at a designated location.'],
];

function Card({t, i, title, sub, onPress, red, right, style}: {t: Th; i: string; title: string; sub: string; onPress?: () => void; red?: boolean; right?: React.ReactNode; style?: object}) {
  return <Pressable onPress={onPress} style={[s.card, {backgroundColor: red ? RED : t.card, borderColor: red ? RED : t.bd}, red && s.redSh, style, {paddingHorizontal: 5}]}><Ic d={P[i]} c={red ? CREAM : t.ac} /><View style={{flex: 1, minWidth: 0}}><Tx numberOfLines={1} ellipsizeMode="tail" style={[s.ct, {color: red ? CREAM : t.tx}]}>{title}</Tx><Tx numberOfLines={1} ellipsizeMode="tail" style={[s.cs, {color: red ? 'rgba(255,251,212,0.75)' : t.mu}]}>{sub}</Tx></View>{right}<Ic d={P.ch} c={red ? CREAM : t.mu} s={16} w={2} /></Pressable>;
}
const Head = ({t, i, title}: {t: Th; i: string; title: string}) => <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}><Ic d={P[i]} c={t.ac} s={20} /><Tx style={{flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '700', color: t.tx}}>{title}</Tx><Ic d={P.ch} c={t.mu} s={16} w={2} /></View>;

function Sheet({t, onClose, children}: {t: Th; onClose: () => void; children: (close: () => void) => React.ReactNode}) {
  const insets = useSafeAreaInsets(); const {height} = useWindowDimensions(); const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(p, {toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start(); }, [p]);
  const close = () => Animated.timing(p, {toValue: 0, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true}).start(({finished}) => finished && onClose());
  return <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}><Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.4)', opacity: p}]}><Pressable style={{flex: 1}} onPress={close} /></Animated.View><View style={{flex: 1, justifyContent: 'flex-end'}} pointerEvents="box-none"><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none"><Animated.View style={[s.sheet, {backgroundColor: t.bg, paddingBottom: Math.max(28, insets.bottom), transform: [{translateY: p.interpolate({inputRange: [0, 1], outputRange: [height, 0]})}]}]}>{children(close)}</Animated.View></KeyboardAvoidingView></View></Modal>;
}
function Calc({t,copy}: {t: Th;copy:KonsolissCopy}) {
  const [v, setV] = useState({l: '', w: '', h: '', q: '1'}); const n = (x: string) => parseFloat(x.replace(',', '.')) || 0; const c = (n(v.l) * n(v.w) * n(v.h)) / 1e6 * n(v.q); const f = [['l', copy['calc.length']], ['w', copy['calc.width']], ['h', copy['calc.height']], ['q', copy['calc.quantity']]] as const;
  return <><Tx style={[s.h3, {color: t.tx}]}>{copy['calc.heading']}</Tx><Tx style={[s.m, {color: t.mu}]}>{copy['calc.instructions']}</Tx><View style={s.g}>{f.map(([k, p]) => <TextInput key={k} value={v[k]} onChangeText={x => setV({...v, [k]: x})} placeholder={p} placeholderTextColor={t.mu} keyboardType="decimal-pad" style={[s.inp, {backgroundColor: t.inp, color: t.tx}]} />)}</View><Tx style={[s.res, {color: t.ac}]}>{`Estimated volume: ${c.toFixed(2)} CBM`}</Tx><Tx style={[s.rs, {color: t.mu}]}>{c ? `About $${(c * RATE).toFixed(0)} at the sample rate of $${RATE} per CBM` : `Sample rate $${RATE} per CBM`}</Tx></>;
}
function Book({t, onClose,copy}: {t: Th; onClose: () => void;copy:KonsolissCopy}) {
  const [v, setV] = useState(0.5); return <><Tx style={[s.h3, {color: t.tx}]}>{copy['book.heading']}</Tx><Tx style={[s.m, {color: t.mu}]}>Container capacity: 68 CBM. Live free space must be confirmed before booking.</Tx><View style={s.chips}>{[0.02, 0.05, 0.2, 0.5, 1].map(x => <Pressable key={x} onPress={() => setV(x)} style={[s.chip, {backgroundColor: x === v ? RED : t.tint}]}><Tx style={{color: x === v ? CREAM : t.ac, fontWeight: '700', fontSize: 14}}>{x.toFixed(2)} CBM</Tx></Pressable>)}</View><Tx style={[s.res, {color: t.ac}]}>{`${v.toFixed(2)} CBM`}</Tx><Tx style={[s.rs, {color: t.mu}]}>{`About $${(v * RATE).toFixed(0)} at the sample rate of $${RATE} per CBM`}</Tx><Pressable onPress={onClose} style={s.rev}><Tx style={{color: CREAM, fontWeight: '700', fontSize: 16}}>{copy['book.review']}</Tx></Pressable></>;
}

function KonsolissMarker({n, top, ac}: {n: number; top: boolean; ac: string}) {
  const dash = {width: 38, height: 4, marginTop: 6, backgroundColor: ac};
  return <View style={{width: 48, height: 161, alignItems: 'center', justifyContent: top ? 'flex-start' : 'center', paddingTop: top ? 20 : 0}}>
    <View style={{width: 7, height: 80, backgroundColor: ac}} />
    <View style={dash} />
    <View style={dash} />
    <Tx style={{marginTop: 2, fontSize: 30, lineHeight: 36, fontWeight: '700', color: ac}}>{n}</Tx>
  </View>;
}

const KONSOLISS_STEPS = [
  ['Book Space', 'Reserve the CBM you need for your shipment.\nStarting from 0.02 CBM'],
  ['Inbound to warehouse', 'Buy on WANTISS, \npaste a product link \nfor us to purchase,\nor ship external items \nto our warehouse.'],
  ['Items processing', 'We verify incoming items \nand optimize packaging \nwhen needed'],
  ['Load items', 'Allocate items \nto your reserved space'],
  ['Container departs', 'Your orders are shipped \nand delivered to you \nor ready for pickup \nat a designated location'],
] as const;

export default function KonsolissHomeScreen({onBack}: {onBack?: () => void}) {
  return <SafeAreaProvider><Screen onBack={onBack} /></SafeAreaProvider>;
}
function Screen({onBack}: {onBack?: () => void}) {
  const insets = useSafeAreaInsets(); const dark = useColorScheme() === 'dark'; const t = dark ? Dk : L; const copy = useKonsolissCopy(); const [sh, setSh] = useState<null | 'calc' | 'book'>(null); const [scroll, setScroll] = useState(true); const [progressView,setProgressView]=useState<'customer'|'container'>('customer'); const [containerMenuOpen,setContainerMenuOpen]=useState(false); const [selectedContainerId,setSelectedContainerId]=useState<string|null>(null); const currentContainer = useCurrentKonsolissContainer(); const assignedContainers=useKonsolissAssignedContainers(); const loadProgress=useKonsolissLoadProgress();
  const [lifecycleNotice,setLifecycleNotice] = useState<KonsolissContainerStatus|null>(null);
  const previousContainerStage = useRef<string|null>(null);
  const assignedStage = currentContainer.kind === 'assigned' ? currentContainer.number + ':' + currentContainer.status : null;
  useEffect(() => {
    if (!assignedStage) return;
    if (previousContainerStage.current === assignedStage) return;
    previousContainerStage.current = assignedStage;
    setLifecycleNotice(currentContainer.kind === 'assigned' ? currentContainer.status : null);
  }, [assignedStage]);
  useEffect(() => {
    if (!lifecycleNotice) return;
    const timer = setTimeout(() => setLifecycleNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [lifecycleNotice]);
  // Customer assignments remain server-owned; sample containers are local preview data only.
  const realFallback=currentContainer.kind==='assigned'?{
    id:'current:'+currentContainer.number,number:currentContainer.number,status:currentContainer.status,demo:false,
  } as KonsolissSelectableContainer:null;
  const liveContainers=assignedContainers.containers.length?assignedContainers.containers:(realFallback?[realFallback]:[]);
  const defaultContainer=liveContainers.find(row=>row.number===realFallback?.number)
    ??liveContainers[0]??realFallback
    ??(currentContainer.kind==='unassigned'&&assignedContainers.state==='ready'?KONSOLISS_DEMO_CONTAINERS[0]:null);
  const selectedContainer:KonsolissSelectableContainer|null=selectedContainerId==='live'?null:
    (KONSOLISS_DEMO_CONTAINERS.find(row=>row.id===selectedContainerId)
      ??liveContainers.find(row=>row.id===selectedContainerId)
      ??(selectedContainerId===realFallback?.id?realFallback:null)
      ??(selectedContainerId===null?defaultContainer:null));
  const isDemo=selectedContainer?.demo===true;
  const hasCurrentContainer=selectedContainer!==null;
  const isSelectedCurrent=selectedContainer!==null&&!isDemo&&currentContainer.kind==='assigned'&&currentContainer.number===selectedContainer.number;
  const containerStatusLabel=(item:KonsolissSelectableContainer)=>
    currentKonsolissContainerLabel({kind:'assigned',number:item.number,status:item.status});
  // Rotate only when a container is selected; always start with customer progress.
  useEffect(()=>{
    if(!hasCurrentContainer){setProgressView('customer');return;}
    // A manual arrow tap changes progressView, resets this timeout and guarantees 7 full seconds.
    const timeout=setTimeout(()=>setProgressView(view=>view==='customer'?'container':'customer'),7000);
    return()=>clearTimeout(timeout);
  },[hasCurrentContainer,selectedContainer?.id,progressView]);
  const verifiedOccupancy=useKonsolissContainerOccupancy(!isDemo&&selectedContainer?.id&&!selectedContainer.id.startsWith('current:')?selectedContainer.id:null);
  const containerOccupancy=selectedContainer?.demo?{
    containerType:'40HQ' as const,capacityCbm:68,loadedCbm:selectedContainer.loadedCbm??0,
    yourSpaceCbm:selectedContainer.yourLoadedCbm??0,
    otherCargoCbm:Math.max(0,(selectedContainer.loadedCbm??0)-(selectedContainer.yourLoadedCbm??0)),
    freeCbm:Math.max(0,68-(selectedContainer.loadedCbm??0)),
  }:verifiedOccupancy;
  // "Your space" in the lower container bar is loaded cargo, not reserved allocation.
  // The aggregation RPC's yourSpaceCbm is also physically loaded cargo.
  const yourPhysicallyLoadedCbm=isDemo?selectedContainer?.yourLoadedCbm:verifiedOccupancy?.yourSpaceCbm;
  // Reserved space, goods sent and cargo loaded are different customer-owned quantities.
  // Unknown data is never replaced with the former 51.7/68 sample occupancy.
  const progress=loadProgress.kind==='recorded'?loadProgress.progress:null;
  const noActiveLoad=currentContainer.kind==='unassigned'&&(
    loadProgress.kind==='unrecorded'||(progress!==null&&progress.reservedCbm===0&&progress.sentCbm===0));
  const initialZero=noActiveLoad&&loadProgress.kind==='unrecorded';
  const fmt=(n:number)=>n.toFixed(2).replace(/0$/,'').replace(/\.$/,'.0');
  const loadedValue=progress?fmt(progress.loadedCbm):initialZero?'0.0':'—';
  const inboundValue=progress?fmt(progress.inboundCbm):initialZero?'0.0':'—';
  const committedValue=progress?fmt(progress.allocatedCbm):initialZero?'0.0':'—';
  const warehouseOrTransitValue=progress?fmt(progress.atWarehouseOrInTransitCbm):initialZero?'0.0':'—';
  const reservedValue=progress?fmt(progress.reservedCbm):initialZero?'0.0':'—';
  const sentValue=progress?fmt(progress.sentCbm):initialZero?'0.0':'—';
  const notLoadedValue=progress?fmt(progress.sentNotLoadedCbm):initialZero?'0.0':'—';
  const stillToSendValue=progress?fmt(progress.reservedNotSentCbm):initialZero?'0.0':'—';
  const notAllocatedValue=progress?fmt(Math.max(0,progress.reservedCbm-progress.allocatedCbm)):initialZero?'0.0':'—';
  const physicallyLoadedRatio=progress&&progress.reservedCbm>0?progress.loadedCbm/progress.reservedCbm:0;
  const inboundRatio=progress&&progress.reservedCbm>0?progress.inboundCbm/progress.reservedCbm:0;
  const fillPercent=progress?progress.loadedPercent+'%':initialZero?'0%':'—';
  const fillRatio=progress&&progress.reservedCbm>0?progress.allocatedCbm/progress.reservedCbm:0;
  const noCargoLoaded=!progress||progress.allocatedCbm===0;
  const visualMode=noCargoLoaded?'illustration':'sample';
  // Left: customer committed CBM / reserved CBM. Right: the shared 68 CBM container only.
  const containerRatio=containerOccupancy?containerOccupancy.loadedCbm/containerOccupancy.capacityCbm:0;
  const containerPercent=containerOccupancy?(containerRatio>0&&containerRatio<0.01?(containerRatio*100).toFixed(2):String(Math.round(containerRatio*100)))+'%':!hasCurrentContainer&&currentContainer.kind==='unassigned'?'0%':'—';
  const containerAvailable=containerOccupancy?fmt(containerOccupancy.freeCbm):!hasCurrentContainer&&currentContainer.kind==='unassigned'?'68.0':'—';
  const showEmptyLoadHint=currentContainer.kind==='unassigned'&&(
    loadProgress.kind==='unrecorded'||(progress!==null&&progress.loadedCbm===0&&progress.inboundCbm===0));
  const nav = [copy['nav.home'], copy['nav.warehouse'], copy['nav.consolidated'], copy['nav.sourcing'], copy['nav.hub']];
  return <View style={{flex: 1, backgroundColor: t.bg}}><StatusBarCompat barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
    <ScrollView scrollEnabled={scroll} contentContainerStyle={{paddingTop: Math.max(14, insets.top), paddingBottom: 110 + insets.bottom}} showsVerticalScrollIndicator={false}>
      <View style={[s.row, {height: 60, paddingHorizontal: 24}]}><View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Pressable onPress={onBack} hitSlop={8}><Ic d={P.back} c={t.ac} s={22} w={2} /></Pressable><Pressable onPress={onBack}><Tx style={[s.logo, {color: t.ac}]}>{copy['home.brand']}</Tx></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel="Choose container" accessibilityHint="Open a list of assigned containers or preview sample containers"
        onPress={() => setContainerMenuOpen(true)}
        style={[s.pill,{backgroundColor:t.tint,flexDirection:'row',alignItems:'center',gap:5,maxWidth:'72%'}]}>
        <Tx numberOfLines={1} style={{fontSize:12,lineHeight:15,fontWeight:'600',color:t.ac}}>
          {selectedContainer?(isDemo?'DEMO · ':'')+containerStatusLabel(selectedContainer):
            currentContainer.kind==='unassigned'?(progress&&(progress.reservedCbm>0||progress.sentCbm>0)?'Preparing your load':currentKonsolissContainerLabel(currentContainer)):
              currentKonsolissContainerLabel(currentContainer)}
        </Tx>
        <Tx style={{fontSize:12,color:t.ac}}>⌄</Tx>
      </Pressable></View>
      {showEmptyLoadHint?<Tx style={{fontSize:11,color:t.mu,textAlign:'right',marginRight:24,marginTop:3}}>No container assigned</Tx>:null}
      <View style={[s.row, {alignItems: 'flex-end', marginTop: 16}]}><View><Tx style={{fontSize: 12.5, lineHeight: 16, fontWeight: '600', color: t.mu}}>{copy['home.load.heading']}</Tx><Tx style={[s.num, {color: t.ac}]}>{committedValue}<Tx style={{fontSize: 17, letterSpacing: 0, color: t.mu, fontWeight: '600'}} > / {reservedValue} CBM</Tx></Tx></View><View style={{alignItems: 'flex-end', paddingBottom: 4}}><Svg width={34} height={34} viewBox="0 0 36 36" style={{marginBottom: 8}}><Circle cx={18} cy={18} r={14} fill="none" stroke={t.tint} strokeWidth={4} /><Circle cx={18} cy={18} r={14} fill="none" stroke={t.ac} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${(containerRatio*87.96).toFixed(2)} 87.96`} rotation={-90} origin="18, 18" /></Svg><Tx style={{fontSize: 20, lineHeight: 25, fontWeight: '700', color: t.tx}}>{containerPercent} filled</Tx><Tx style={{fontSize: 12, lineHeight: 15, color: t.mu}}><Tx style={{color: t.gr, fontWeight: '700'}} >{containerAvailable} CBM</Tx> {copy['home.available']}</Tx></View></View>
      <View style={{height: 300, marginTop: 2}} onTouchStart={() => setScroll(false)} onTouchEnd={() => setScroll(true)} onTouchCancel={() => setScroll(true)}><WebView key={(dark ? 'd' : 'l')+'-'+(selectedContainer?.id??visualMode)+'-'+(containerOccupancy?.loadedCbm??'unverified')+'-'+(yourPhysicallyLoadedCbm??'unknown')} originWhitelist={['*']} source={{html: containerHtml(dark,!hasCurrentContainer&&noCargoLoaded,containerOccupancy?.capacityCbm??0,containerOccupancy?.loadedCbm??0,0,isDemo,yourPhysicallyLoadedCbm??0,containerOccupancy?.freeCbm??(!hasCurrentContainer&&currentContainer.kind==='unassigned'?68:null))}} style={{backgroundColor: 'transparent'}} containerStyle={{backgroundColor: 'transparent'}} scrollEnabled={false} bounces={false} overScrollMode="never" javaScriptEnabled showsVerticalScrollIndicator={false} /></View>
      <View style={{marginTop: 1, height: 32, alignItems: 'center', justifyContent: 'center'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}><Tx style={{fontSize: 12, lineHeight: 14, fontWeight: '600', color: t.mu}}>———</Tx><View style={{width: 4}} /><View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: t.mu}} /><View style={{width: 4}} /><Tx style={{fontSize: 12, lineHeight: 14, fontWeight: '600', color: t.mu}}>———</Tx></View>
      </View>
      <View style={{paddingHorizontal:24,marginTop:12}}>
        {progressView==='container'&&hasCurrentContainer?<>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{flex:1,height:10,borderRadius:5,overflow:'hidden',backgroundColor:t.tint,flexDirection:'row'}}>
              <View style={{width:`${containerOccupancy?Math.max(0,Math.min(100,containerOccupancy.otherCargoCbm/containerOccupancy.capacityCbm*100)):0}%`,backgroundColor:'#CDAA7D'}}/>
              <View style={{width:`${containerOccupancy?Math.max(0,Math.min(100,containerOccupancy.yourSpaceCbm/containerOccupancy.capacityCbm*100)):0}%`,backgroundColor:t.ac}}/>
            </View>
            {hasCurrentContainer?<Pressable accessibilityRole="button" accessibilityLabel="Show other progress bar" accessibilityHint="Toggle between cargo loading and container allocation"
            onPress={()=>setProgressView(view=>view==='customer'?'container':'customer')}
            hitSlop={10} style={{paddingHorizontal:5,paddingVertical:5,justifyContent:'center',alignItems:'center'}}>
            <Svg width={30} height={19} viewBox="0 0 30 19" fill="none" stroke={t.ac} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 5h23m-5-4 5 4-5 4M27 14H4m5-4-5 4 5 4"/>
            </Svg>
          </Pressable>:null}
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:7}}>
            <Tx style={s.leg}>{copy['home.otherCargo']} <Tx style={{color:t.tx}}>{containerOccupancy?fmt(containerOccupancy.otherCargoCbm):'—'}</Tx></Tx>
            <Tx style={[s.leg,{color:t.ac}]}>{copy['home.yourSpace']} <Tx style={{color:t.tx}}>{containerOccupancy?fmt(containerOccupancy.yourSpaceCbm):'—'}</Tx></Tx>
            <Tx style={s.leg}>{copy['home.free']} <Tx style={{color:t.tx}}>{containerOccupancy?fmt(containerOccupancy.freeCbm):'—'}</Tx></Tx>
          </View>
          {!containerOccupancy?<Tx style={{fontSize:10,color:t.mu,marginTop:4}}>Container totals appear once all loaded cargo has been verified.</Tx>:null}
        </>:<>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <View style={{flex:1,flexDirection:'row',height:10,borderRadius:5,overflow:'hidden',gap:2}}>
            <View style={{width:`${Math.max(0,Math.min(100,physicallyLoadedRatio*100))}%`}}>
              <Svg width="100%" height={10}><Defs><LinearGradient id="g" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#CDAA7D"/><Stop offset="0.5" stopColor="#B7B1A3"/><Stop offset="1" stopColor="#D2B48A"/></LinearGradient></Defs><Rect width="100%" height={10} fill="url(#g)"/></Svg>
            </View>
            <View style={{width:`${Math.max(0,Math.min(100,inboundRatio*100))}%`,backgroundColor:t.ac}}/>
              <View style={{flex:1,backgroundColor:t.tint}}/>
            </View>
            {hasCurrentContainer?<Pressable accessibilityRole="button" accessibilityLabel="Show other progress bar" accessibilityHint="Toggle between cargo loading and container allocation"
            onPress={()=>setProgressView(view=>view==='customer'?'container':'customer')}
            hitSlop={10} style={{paddingHorizontal:5,paddingVertical:5,justifyContent:'center',alignItems:'center'}}>
            <Svg width={30} height={19} viewBox="0 0 30 19" fill="none" stroke={t.ac} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 5h23m-5-4 5 4-5 4M27 14H4m5-4-5 4 5 4"/>
            </Svg>
          </Pressable>:null}
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:7}}>
            <Tx style={s.leg}>Loaded <Tx style={{color:t.tx}}>{loadedValue}</Tx></Tx>
            <Tx style={[s.leg,{color:t.ac}]}>Inbound <Tx style={{color:t.tx}}>{inboundValue}</Tx></Tx>
            <Tx style={s.leg}>Not allocated <Tx style={{color:t.tx}}>{notAllocatedValue}</Tx></Tx>
          </View>
        </>}
      </View>
      <View style={{paddingHorizontal: 24, paddingTop: 22, gap: 12}}><View style={{flexDirection: 'row', gap: 12}}><Card t={t} i="box" title={copy['home.book.title']} sub={copy['home.book.subtitle']} red style={{flex: 1, height: 70}} onPress={() => setSh('book')} /><Card t={t} i="box" title={copy['home.load.title']} sub={copy['home.load.subtitle']} style={{flex: 1, height: 70, borderWidth: 0.5}} /></View><Card t={t} i="calc" title={copy['home.calc.title']} sub={copy['home.calc.subtitle']} onPress={() => setSh('calc')} style={{borderWidth: 0.5}} /><View style={{flexDirection: 'row', gap: 12}}><View style={[s.card2, {backgroundColor: t.card, borderColor: t.bd, borderWidth: 0.5}]}><Head t={t} i="wh" title={copy['home.warehouse.title']} /><Tx style={[s.body, {color: t.tx}]}>{progress?`${warehouseOrTransitValue} CBM sent, not yet allocated`:(noActiveLoad?'No goods sent yet':'Warehouse volume not yet recorded')}</Tx><View style={{position: 'absolute', right: 10, bottom: 8}}><Svg width={38} height={42} viewBox="0 0 20 22"><CP c={t.ac} /></Svg></View></View><Pressable accessibilityRole="button" accessibilityLabel="Choose consolidated container"
  onPress={() => setContainerMenuOpen(true)}
  style={[s.card2, {backgroundColor: t.card, borderColor: t.bd, borderWidth: 0.5}]}>
  <Head t={t} i="ct" title={copy['home.consolidated.title']} />
  {selectedContainer?<Tx style={[s.body,{color:t.tx}]}>
    {(isDemo?'DEMO · ':'')+selectedContainer.number+'\n'+selectedContainer.status}
  </Tx>:<Tx style={[s.body,{color:t.mu}]}>{currentContainer.kind==='unassigned'?'No active load':'Load details unavailable'}</Tx>}
</Pressable></View><Card t={t} i="ln" title={copy['home.sourcing.title']} sub={copy['home.sourcing.subtitle']} right={<Ic d={P.gl} c={t.tx} s={20} />} style={{borderWidth: 0.5}} /></View>
      <View style={{paddingTop: 20}}>
        <Tx style={[s.how, {color: t.tx, fontSize: 16, lineHeight: 20, fontWeight: '400', paddingTop: 6, paddingBottom: 10, marginBottom: 0}]}>{copy['home.how.heading']}</Tx>
        {KONSOLISS_STEPS.map((_, i) => {
          const title = copy[`home.how.${i+1}.title`];
          const body = copy[`home.how.${i+1}.body`];
          const textFirst = i % 2 === 0;
          const last = i === KONSOLISS_STEPS.length - 1;
          const textBlock = <View style={{flex: 1, minWidth: 150, paddingTop: 25, alignItems: 'flex-start'}}>
            <View style={{alignItems: 'center'}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Tx style={{fontSize: 14, lineHeight: 18, fontWeight: '600', color: t.tx, maxWidth: i === 1 ? 105 : undefined, paddingRight: i === 1 ? 3 : 0}}>{title}</Tx>
                {i === 3 && <Svg width={16} height={16} viewBox="0 0 16 16" style={{marginLeft: 5}}>
                  <Circle cx={8} cy={8} r={6.6} fill="none" stroke={t.tx} strokeWidth={1.4} />
                  <Path d="M8 7.2V11.2" stroke={t.tx} strokeWidth={1.4} strokeLinecap="round" />
                  <Circle cx={8} cy={5.2} r={0.8} fill={t.tx} />
                </Svg>}
              </View>
              <Tx style={{marginTop: 10, fontSize: 12, lineHeight: 16, fontStyle: 'italic', color: t.mu}}>{body}</Tx>
            </View>
          </View>;
          const pic = <View style={[{width: 190, height: 190, overflow: 'hidden'}, last ? {borderTopLeftRadius: 90} : {borderRadius: 8}]}>
            <Image source={KONSOLISS_HOW_IMAGES[i]} style={{width: '100%', height: '100%'}} resizeMode={last ? 'cover' : 'contain'} />
          </View>;
          return <View key={title} style={{flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 1}}>
            {textFirst ? <>{textBlock}<KonsolissMarker n={i + 1} top={textFirst} ac={t.ac} />{pic}</> : <>{pic}<KonsolissMarker n={i + 1} top={textFirst} ac={t.ac} />{textBlock}</>}
          </View>;
        })}
      </View>
    </ScrollView>
    <View style={s.bottomWrap}><View style={s.bottomNav}>{nav.map((n, k) => <Pressable key={n} onPress={() => {}} style={s.flyzNavItem}><View style={[s.flyzNavIcon, k === 0 && {backgroundColor: t.tint, borderRadius: 999}]}><Image source={k===0?require('../../assets/konsoliss/icons/homeicon.png'):k===1?require('../../assets/konsoliss/icons/warehouseicon.png'):k===2?require('../../assets/konsoliss/icons/consolidation.png'):k===3?require('../../assets/konsoliss/icons/sourcingicon.png'):require('../../assets/konsoliss/icons/hub.png')} style={{width: k === 3 ? 43 : k === 4 ? 37 : 39, height: k === 3 ? 43 : k === 4 ? 37 : 39}} resizeMode="contain" /></View><Tx style={[s.flyzNavLabel, {color: k===0?t.ac:t.tx}]}>{n}</Tx></Pressable>)}</View></View>
    {sh && <Sheet t={t} onClose={() => setSh(null)}>{done => sh === 'calc' ? <Calc t={t} copy={copy} /> : <Book t={t} copy={copy} onClose={done} />}</Sheet>}
    <Modal transparent visible={containerMenuOpen} animationType="fade" statusBarTranslucent
      onRequestClose={() => setContainerMenuOpen(false)}>
      <View style={{flex:1}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close container list"
          onPress={() => setContainerMenuOpen(false)}
          style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.23)'}]}/>
        <View style={{position:'absolute',top:Math.max(14,insets.top)+55,right:18,width:'88%',maxWidth:350,
          backgroundColor:t.bg,borderRadius:16,borderWidth:1,borderColor:t.bd,overflow:'hidden',
          shadowColor:'#000',shadowOpacity:0.16,shadowRadius:12,elevation:12}}>
          <View style={{paddingHorizontal:14,paddingVertical:11,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <Tx style={{fontSize:14,fontWeight:'800',color:t.tx}}>Choose container</Tx>
            <Pressable accessibilityRole="button" accessibilityLabel="Close container selector"
              onPress={() => setContainerMenuOpen(false)} hitSlop={10}><Tx style={{color:t.ac,fontSize:19}}>✕</Tx></Pressable>
          </View>
          <Tx style={{paddingHorizontal:14,paddingVertical:6,fontSize:10,color:t.mu}}>
            DEMO PREVIEW · NOT LIVE DATA
          </Tx>
          <Pressable accessibilityRole="button" accessibilityLabel="Show live container status without demo"
            onPress={() => {setSelectedContainerId('live');setContainerMenuOpen(false);setProgressView('customer');}}
            style={{paddingHorizontal:14,minHeight:53,justifyContent:'center',borderTopWidth:0.5,borderTopColor:t.bd}}>
            <Tx style={{fontSize:12,fontWeight:'700',color:t.tx}}>Live view</Tx>
            <Tx style={{fontSize:11,color:t.mu}}>
              {liveContainers.length?liveContainers.length+' assigned container(s)':'No container assigned'}
            </Tx>
          </Pressable>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator
            style={{maxHeight:5*59}} contentContainerStyle={{paddingBottom:5}}>
            {liveContainers.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',
              borderTopWidth:0.5,borderTopColor:t.bd,minHeight:59}}>
              <Pressable accessibilityRole="button" accessibilityLabel={'Select container '+item.number}
                accessibilityState={{selected:selectedContainer?.id===item.id}}
                onPress={() => {setSelectedContainerId(item.id);setContainerMenuOpen(false);setProgressView('customer');}}
                style={{flex:1,paddingHorizontal:14,paddingVertical:10}}>
                <Tx style={{fontSize:13,fontWeight:'700',color:selectedContainer?.id===item.id?t.ac:t.tx}}>{item.number}</Tx>
                <Tx style={{fontSize:11,color:t.mu}}>{item.status}</Tx>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={'Explain status of '+item.number}
                onPress={() => {setSelectedContainerId(item.id);setContainerMenuOpen(false);setLifecycleNotice(item.status);}}
                style={{paddingHorizontal:14,paddingVertical:12}}><Tx style={{color:t.ac,fontSize:17}}>ⓘ</Tx></Pressable>
            </View>)}
            {KONSOLISS_DEMO_CONTAINERS.map(item=><Pressable key={item.id} accessibilityRole="button"
              accessibilityLabel={'Preview demo container '+item.number}
              accessibilityState={{selected:selectedContainer?.id===item.id}}
              onPress={() => {setSelectedContainerId(item.id);setContainerMenuOpen(false);setProgressView('customer');}}
              style={{minHeight:59,borderTopWidth:0.5,borderTopColor:t.bd,
                paddingHorizontal:14,paddingVertical:10,justifyContent:'center'}}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
                <Tx style={{fontSize:13,fontWeight:'700',color:selectedContainer?.id===item.id?t.ac:t.tx}}>{item.number}</Tx>
                <Tx style={{fontSize:11,color:t.ac,fontWeight:'700'}}>{Math.round((item.loadedCbm??0)/68*100)}% filled</Tx>
              </View>
              <Tx style={{fontSize:11,color:t.mu}}>{item.status} · {(item.loadedCbm??0).toFixed(1)} / 68 CBM · Demo</Tx>
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Modal transparent visible={lifecycleNotice!==null} animationType="fade"
      statusBarTranslucent onRequestClose={() => setLifecycleNotice(null)}>
      <View style={{flex:1,justifyContent:'flex-end'}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss container status explanation"
          onPress={() => setLifecycleNotice(null)}
          style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.32)'}]}/>
        {lifecycleNotice ? <View accessibilityLabel="Container status explanation"
          style={{backgroundColor:t.bg,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:22,
            paddingHorizontal:24,paddingBottom:Math.max(30,insets.bottom+18),borderWidth:1,borderColor:t.bd}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <View style={{flex:1}}>
              <Tx style={{fontSize:19,fontWeight:'800',color:t.ac,lineHeight:25}}>{KONSOLISS_LIFECYCLE_MESSAGES[lifecycleNotice].title}</Tx>
              {selectedContainer&&!selectedContainer.demo?<Tx style={{fontSize:12,color:t.mu,marginTop:3}}>{selectedContainer.number}</Tx>:null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close container status explanation"
              hitSlop={12} onPress={() => setLifecycleNotice(null)}
              style={{padding:6}}><Tx style={{fontSize:19,color:t.tx}}>✕</Tx></Pressable>
          </View>
          <Tx style={{fontSize:14,lineHeight:21,color:t.tx,marginTop:12}}>
            {KONSOLISS_LIFECYCLE_MESSAGES[lifecycleNotice].description}
          </Tx>
          <Tx style={{fontSize:11,lineHeight:16,color:t.mu,marginTop:13}}>
            This notice closes automatically. Tap the container status anytime to read it again.
          </Tx>
        </View>:null}
      </View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24}, logo: {lineHeight: 26, fontSize: 21, fontWeight: '800', letterSpacing: -0.5}, pill: {paddingVertical: 6, paddingHorizontal: 11, borderRadius: 20}, num: {fontSize: 52, fontWeight: '800', letterSpacing: -2.5, lineHeight: 52, marginTop: 2}, leg: {fontSize: 11.5, lineHeight: 14, fontWeight: '600', color: '#9a8a60'}, card: {flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 14}, card2: {flex: 1, borderWidth: 1, borderRadius: 18, padding: 14}, redSh: {shadowColor: '#A90E02', shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: {width: 0, height: 8}, elevation: 6}, ct: {fontSize: 14, lineHeight: 18, fontWeight: '700'}, cs: {fontSize: 10.5, lineHeight: 14, marginTop: 1}, body: {fontSize: 11.5, lineHeight: 17, marginTop: 8}, how: {textAlign: 'center', fontSize: 20, lineHeight: 25, fontWeight: '800', marginBottom: 18}, st: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 10}, bottomWrap: {position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 14, zIndex: 100}, bottomNav: {paddingTop: 3, height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', elevation: 5, shadowColor: '#000', shadowOpacity: .13, shadowRadius: 5, shadowOffset: {width: 0, height: 2}}, flyzNavItem: {flex: 1, minWidth: 0, height: 46, paddingTop: 4.5, alignItems: 'center', justifyContent: 'flex-end'}, flyzNavIcon: {width: 35, height: 35, alignItems: 'center', justifyContent: 'center'}, flyzNavLabel: {paddingTop: 4, fontSize: 10.5, lineHeight: 13, fontWeight: '500', textAlign: 'center'}, sheet: {borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 24}, h3: {fontSize: 19, lineHeight: 24, fontWeight: '700', marginBottom: 4}, m: {fontSize: 13, lineHeight: 17, marginBottom: 14}, g: {flexDirection: 'row', flexWrap: 'wrap', gap: 10}, inp: {flexGrow: 1, flexBasis: '45%', height: 46, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 0, fontSize: 16}, res: {marginTop: 16, fontSize: 22, lineHeight: 28, fontWeight: '800'}, rs: {fontSize: 12, lineHeight: 15, fontWeight: '600', marginTop: 2}, chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6}, chip: {paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20}, rev: {height: 50, borderRadius: 25, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', marginTop: 16},
});

const containerHtml = (dark: boolean, empty = false, reserved = 0, loaded = 0, inbound = 0, demo = false, yourLoaded = 0, freeCbm: number | null = null) => `<!doctype html><html data-reserved="${reserved}" data-loaded="${loaded}" data-inbound="${inbound}" data-demo="${demo ? 'true' : 'false'}" data-your-loaded="${yourLoaded}" data-free="${freeCbm ?? '-'}" data-empty="${empty ? 'true' : 'false'}" data-theme="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body{margin:0;background:transparent;overflow:hidden}canvas{display:block;width:100%;height:300px;touch-action:none}#sheet,#scrim,#calc,#book{display:none}</style></head><body><canvas id="cv"></canvas><div id="scrim"></div><div id="sheet"><div id="sb"></div></div><div id="calc"></div><div id="book"></div><script>${CONTAINER_JS}</script></body></html>`;

const CONTAINER_JS = [
"const $=s=>document.querySelector(s),cv=$('#cv'),cx=cv.getContext('2d'),D=document.documentElement.dataset.theme==='dark',DEMO=document.documentElement.dataset.demo==='true',EMPTY=document.documentElement.dataset.empty==='true',RESERVED=Number(document.documentElement.dataset.reserved)||0,LOADED=Number(document.documentElement.dataset.loaded)||0,INBOUND=Number(document.documentElement.dataset.inbound)||0,YOUR_LOADED=Number(document.documentElement.dataset.yourLoaded)||0,FREE=Number(document.documentElement.dataset.free);",
"const C=D?{int:'#2b2724',gr:'#FF7A68',spot:'rgba(169,14,2,.32)',shd:'rgba(0,0,0,.6)',tx:'#FFFBD4',fl:'#FFF3A0',halo:'rgba(23,16,15,.92)',fv:.16,ac:'#FF5B4A'}:{int:'#6a6455',gr:'#A90E02',spot:'rgba(241,228,138,.55)',shd:'rgba(43,18,16,.25)',tx:'#2B1210',fl:'#5c4a00',halo:'#FFF3A0',fv:.26,ac:'#A90E02'};",
"const L=12,W=2.35,H=2.7,HX=6,HZ=W/2,ST='#A90E02',LG=[-.45,.85,.5].map((v,_,a)=>v/Math.hypot(...a)),DEF=10;let yaw=0,pitch=DEF,w=0,h=300,raf=0;",
"const rgb=x=>[1,3,5].map(i=>parseInt(x.substr(i,2),16)),sh=(x,k)=>`rgb(${rgb(x).map(v=>Math.max(0,Math.min(255,v*k|0)))})`;",
"const boxF=(x0,x1,y0,y1,z0,z1)=>[[[1,0,0],[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],[[-1,0,0],[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]],[[0,1,0],[[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]]],[[0,-1,0],[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],[[0,0,1],[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]],[[0,0,-1],[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]]]];",
"const GR=[[0,2,'#CDAA7D'],[2,4,'#E3D3B0'],[4,5,'#B7B1A3'],[5,7,'#D9B8A6'],[7,9,'#D2B48A'],[9,10,'#A90E02']];let sd=11;const rnd=()=>(sd=sd*16807%2147483647)/2147483647;const stickerPick=(i,j,l,q,salt)=>{const n=Math.sin((i+1)*12.9898+(j+1)*78.233+(l+1)*37.719+q*19.19+salt*11.83)*43758.5453;return n-Math.floor(n)};const cargo=[];let user;",
"for(let i=0;i<10;i++){const base=GR.find(g=>i>=g[0]&&i<g[1])[2];for(let j=0;j<2;j++){const za=j?.05:-1.1,zb=j?1.1:-.05,u=i==9&&j==1,nl=i==9?2:(rnd()<.25?2:3),x0=-5.9+i*.9+.02,x1=x0+.86;cargo.push({b:[x0,x1,.15,.27,za+.03,zb-.03],c:'#9a7442',pal:1});for(let l=0;l<nl;l++){const y0=.27+l*.77,y1=y0+.75;for(let q=0;q<2;q++)cargo.push({b:[x0+q*.43+.008,x0+(q+1)*.43-.008,y0,y1,za+.02,zb-.02],c:base,u,top:l==nl-1,lab:stickerPick(i,j,l,q,0)>.18,labelPos:Math.floor(stickerPick(i,j,l,q,1)*6),labelSide:Math.floor(stickerPick(i,j,l,q,2)*4),labelSize:Math.floor(stickerPick(i,j,l,q,4)*5),labelTwo:stickerPick(i,j,l,q,3)<.32,demoCurrent:i===6&&j===1&&l===nl-1&&q===0,k:.95+.05*((l+q+i)%2)});if(u&&l==nl-1)user=[(x0+x1)/2,y1,(za+zb)/2]}}}",
"let demoCount=0,demoBlink=false,demoShowLoad=false;const CE=3.1,wrap=a=>((a+180)%360+360)%360-180;function draw(){raf=0;const th=yaw*Math.PI/180,ph=pitch*Math.PI/180,ct=Math.cos(th),st=Math.sin(th),cp=Math.cos(ph),sp=Math.sin(ph),sc=w/13.6,ox=w/2;let oy=0;const t=Math.max(0,Math.min(1,Math.max(Math.abs(wrap(yaw))/35,(pitch-DEF)/30))),lift=.9*t,lop=1-.86*t;const proj=([x,y,z])=>{y-=H/2;const X=x*ct+z*st,Z=-x*st+z*ct;return[ox+X*sc,oy-(y*cp-Z*sp)*sc,Z*cp+y*sp]};{const ys=[0,H+lift+.1].flatMap(y=>[-HX,HX].flatMap(x=>[-HZ,HZ].map(z=>proj([x,y,z])[1])));oy=h/2+16-(Math.min(...ys)+Math.max(...ys))/2}const nv=n=>{const X=n[0]*ct+n[2]*st,Z=-n[0]*st+n[2]*ct;return[X,n[1]*cp-Z*sp,Z*cp+n[1]*sp]};const lit=n=>{const v=nv(n);return .55+.55*Math.max(0,v[0]*LG[0]+v[1]*LG[1]+v[2]*LG[2])};const it=[];const poly=(l,pts,f,o=1,s=1,sc)=>{const P=pts.map(proj);it.push({l,d:P.reduce((a,p)=>a+p[2],0)/P.length,P,f,o,s,sc})};const line=(l,a,b,c,o,wd,dash)=>{const A=proj(a),B=proj(b);it.push({l,d:(A[2]+B[2])/2,A,B,c,o,wd,dash})};const abox=(l,b,c,o=1,g=0,dec,sc)=>{for(const[n,pts]of boxF(...b)){if(nv(n)[2]<=.001)continue;poly(l,pts,sh(c,g?.82+.5*(lit(n)-.55):lit(n)),o,1,sc);if(dec)dec(l+.001,n)}};const hole=(l,n,b)=>{const[x0,x1,y0,y1,z0,z1]=b,mx=(x0+x1)/2,my=(y0+y1)/2,mz=(z0+z1)/2,r=.06;let q;if(n[0]){const X=n[0]>0?x1:x0;q=[[X,my-r,mz-r],[X,my+r,mz-r],[X,my+r,mz+r],[X,my-r,mz+r]]}else if(n[2]){const Z=n[2]>0?z1:z0;q=[[mx-r,my-r,Z],[mx+r,my-r,Z],[mx+r,my+r,Z],[mx-r,my+r,Z]]}else if(n[1]){const Y=n[1]>0?y1:y0;q=[[mx-r,Y,mz-r],[mx+r,Y,mz-r],[mx+r,Y,mz+r],[mx-r,Y,mz+r]]}if(q)poly(l,q,'#1a0402',.85,0)};const lp=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u),grid=(A,B,Cc,Dd,nu,nw,l,col,op)=>{for(let i=1;i<nu;i++)line(l,lp(A,B,i/nu),lp(Dd,Cc,i/nu),col,op,.6);for(let j=1;j<nw;j++)line(l,lp(A,Dd,j/nw),lp(B,Cc,j/nw),col,op,.6)};abox(.5,[-HX,HX,0,.15,-HZ,HZ],'#7a5636');for(let k=-3;k<4;k++){const z=k*.3;if(Math.abs(z)<HZ)line(.6,[-HX,.15,z],[HX,.15,z],'#4d3420',.35,.6)}const wall=(on,q,n)=>{const near=nv(on)[2]>.02;for(let i=0;i<n;i++){let p=q(i);if(near){p=p.map(a=>[a[0],Math.min(a[1],.28),a[2]]);poly(3,p,sh(ST,lit(on)*(i%2?.75:1)))}else poly(0,p,sh(C.int,lit(on.map(c=>-c))*(i%2?.78:1)))}};for(const[zs,n]of[[HZ,[0,0,1]],[-HZ,[0,0,-1]]])wall(n,i=>[[-HX+i*.2,0,zs],[-HX+i*.2+.2,0,zs],[-HX+i*.2,H,zs],[-HX+i*.2,H,zs]],60);for(const[xs,n]of[[HX,[1,0,0]],[-HX,[-1,0,0]]])wall(n,i=>{const z=-HZ+i*.2;return[[xs,0,z],[xs,0,z+.2],[xs,H,z+.2],[xs,H,z]]},12);const labelLocations=[[.19,.81],[.81,.81],[.5,.16],[.5,.5],[.19,.49],[.81,.26]];const labelSizes=[[.10,.09],[.17,.14],[.25,.21],[.34,.27],[.43,.34]];const sticker=(layer,face,b,info)=>{const side=face[2]>0?0:face[2]<0?1:face[0]>0?2:face[0]<0?3:-1;if(side<0||side!==info.side&&!(info.second&&side===(info.side+1)%4))return;const[x0,x1,y0,y1,z0,z1]=b,[u,v]=labelLocations[info.pos],[width,height]=labelSizes[info.size??0];const u0=Math.max(.025,Math.min(.975-width,u-width/2)),v0=Math.max(.025,Math.min(.975-height,v-height/2));const low=y0+(y1-y0)*v0,high=y0+(y1-y0)*(v0+height);if(face[2]){const xx=x0+(x1-x0)*(face[2]>0?u0:1-u0-width),xx2=xx+(x1-x0)*width,zz=face[2]>0?z1:z0;poly(layer,[[xx,low,zz],[xx2,low,zz],[xx2,high,zz],[xx,high,zz]],'#FFF8E8',.98,0)}else{const zz=z0+(z1-z0)*(face[0]>0?u0:1-u0-width),zz2=zz+(z1-z0)*width,xx=face[0]>0?x1:x0;poly(layer,[[xx,low,zz],[xx,low,zz2],[xx,high,zz2],[xx,high,zz]],'#FFF8E8',.98,0)}};const tinyTotal=!EMPTY&&LOADED>0&&LOADED<=0.1,fillRatio=Math.max(0,Math.min(1,LOADED/68)),innerX0=-HX+.12,innerX1=HX-.12,loadedEnd=innerX0+(innerX1-innerX0)*fillRatio,visualGap=Math.min(.045,(innerX1-innerX0)*Math.min(fillRatio,1-fillRatio)*.18),visible=EMPTY?demoCount:tinyTotal?0:cargo.length,boxCount=EMPTY?cargo.slice(0,visible).filter(c=>!c.pal).length:cargo.filter(c=>!c.pal).length,ownCount=!EMPTY&&LOADED>0&&YOUR_LOADED>0.1?Math.min(boxCount,Math.round(boxCount*YOUR_LOADED/LOADED)|| (YOUR_LOADED>0?1:0)):0;let boxIndex=0;for(let ci=0;ci<cargo.length;ci++){if(ci>=visible)continue;const c=cargo[ci],highlight=EMPTY&&demoBlink&&c.demoCurrent;if(!EMPTY){const b=c.b;const x0=innerX0+(b[0]+5.9)/9*(innerX1-innerX0),x1=innerX0+(b[1]+5.9)/9*(innerX1-innerX0);if(x0>=loadedEnd-visualGap)continue;const scaleY=(y)=>.15+(y-.15)*(H-.32)/2.43;const scaleZ=(z)=>z*(HZ-.17)/1.1;const xlo=Math.max(innerX0,x0),xhi=Math.min(x1,loadedEnd-visualGap);if(xhi<=xlo)continue;c.b=[xlo,xhi,scaleY(b[2]),Math.min(H-.15,scaleY(b[3])),scaleZ(b[4]),scaleZ(b[5])];}if(c.pal){abox(1,c.b,c.c,1,1);continue}const isYours=!EMPTY&&boxIndex>=boxCount-ownCount;boxIndex++;abox(1,c.b,highlight?'#FFE36B':isYours?'#A90E02':c.k?sh(c.c,c.k).replace(/rgb\\((.*)\\)/,(m,v)=>'#'+v.split(',').map(a=>(+a).toString(16).padStart(2,'0')).join('')):c.c,1,1,(l,n)=>{const[x0,x1,y0,y1,z0,z1]=c.b,xm=(x0+x1)/2,zm=(z0+z1)/2,tp=c.u?'#FFE9A8':'#EBDDBF',lb=c.u?'#FFFBD4':'#F7F3E6';if(n[1]==1){if(c.top)poly(l,[[x0,y1,zm-.035],[x0,y1,zm+.035],[x1,y1,zm+.035],[x1,y1,zm-.035]],tp,.9,0)}else if(c.lab)sticker(l,n,c.b,{pos:c.labelPos,side:c.labelSide,second:c.labelTwo,size:c.labelSize})})}let miniatureMarker=null;if(!EMPTY&&LOADED>0){const miniature=(volume,color,base)=>{if(volume<=0)return null;const edge=Math.cbrt(volume*(L*W*H)/68),sx=Math.min(.43,edge),sy=Math.min(.75,edge),sz=Math.min(.55,edge);const x=Math.max(-HX+.1,Math.min(HX-.1-sx,base[0])),z=Math.max(-HZ+.1,Math.min(HZ-.1-sz,base[2])),y=Math.max(.16,Math.min(H-.1-sy,base[1]));const b=[x,x+sx,y,y+sy,z,z+sz];abox(1.1,b,color,1,1,(l,n)=>sticker(l,n,b,{pos:1,side:0,second:true,size:1}));if(color==='#A90E02')miniatureMarker=[(b[0]+b[1])/2,b[3],(b[4]+b[5])/2];return b};const last=visible?cargo.slice(0,visible).reverse().find(c=>!c.pal):null,at=last?[(last.b[0]+last.b[1])*.5,last.b[3]+.03,(last.b[4]+last.b[5])*.5]:[-HX+.55,.18,0];if(tinyTotal){const others=Math.max(0,LOADED-YOUR_LOADED);if(others>0)miniature(others,'#CDAA7D',at);if(YOUR_LOADED>0)miniature(YOUR_LOADED,'#A90E02',[at[0]+.38,at[1],at[2]])}else if(YOUR_LOADED>0&&YOUR_LOADED<=.1)miniature(YOUR_LOADED,'#A90E02',at)}const freeRatio=!EMPTY&&Number.isFinite(FREE)?Math.max(0,Math.min(1,FREE/68)):0,freeX0=innerX1-(innerX1-innerX0)*freeRatio;if(freeRatio>0){const fz=[Math.min(innerX1,freeX0+visualGap),innerX1,.15,H-.15,-HZ+.12,HZ-.12];abox(.85,fz,'#FFF1A0',C.fv);const cs=[];for(const x of[fz[0],fz[1]])for(const y of[fz[2],fz[3]])for(const z of[fz[4],fz[5]])cs.push([x,y,z]);for(const a of cs)for(const b of cs)if(a<b&&a.filter((v,i)=>v!=b[i]).length==1)line(.95,a,b,C.ac,.55,.9,[3,2.5]);}const tp=a=>t>.02&&pitch>=0&&proj(a)[2]>proj([0,H/2,0])[2]+.05;const bm=[];for(const zs of[-HZ,HZ])bm.push([-HX,HX,H-.14,H,zs-.07,zs+.07],[-HX,HX,0,.15,zs-.07,zs+.07]);for(const xs of[-HX,HX]){bm.push([xs-.07,xs+.07,H-.14,H,-HZ,HZ],[xs-.07,xs+.07,0,.15,-HZ,HZ]);for(const zs of[-HZ,HZ])bm.push([xs-.07,xs+.07,0,H,zs-.07,zs+.07])}for(const b of bm){const c=[(b[0]+b[1])/2,H/2,(b[4]+b[5])/2],far=proj(c)[2]<proj([0,H/2,0])[2]-.05;if(b[2]>H-.15&&tp(c))continue;abox(far?.7:1.5,b,'#B31204',1,0,null,b[1]<-5.9?'rgba(70,6,2,.55)':undefined)}for(const xs of[-HX,HX])for(const zs of[-HZ,HZ])for(const ys of[.08,H-.08]){if(ys>1&&tp([xs,H/2,zs]))continue;{const cb=[xs-.17,xs+.17,ys-.11,ys+.11,zs-.17,zs+.17],far=proj([xs,H/2,zs])[2]<proj([0,H/2,0])[2]-.05,layer=far?.65:1.6;if(xs<0)abox(layer,cb,'#6a0a02',1,0,(l,n)=>hole(l,n,cb),'rgba(30,3,1,.7)');else abox(layer,cb,'#3b0b06')}}if(nv([-1,0,0])[2]>.02){{const G=[[-HX,.28,-HZ],[-HX,.28,HZ],[-HX,H,HZ],[-HX,H,-HZ]];poly(3,G,ST,.07,0);grid(G[0],G[1],G[2],G[3],3,5,3,C.gr,.2)}poly(4,[[-HX-.01,.28,-HZ],[-HX-.01,.28,HZ],[-HX-.01,H-.14,HZ],[-HX-.01,H-.14,-HZ]],sh(ST,lit([-1,0,0])),.32,0);for(const z of[-.9,-.45,.45,.9]){abox(4.2,[-HX-.09,-HX,.15,H-.15,z-.035,z+.035],'#E6DFCB',1,0,null,'rgba(60,50,35,.5)');for(const y of[.4,1.35,2.3])abox(4.3,[-HX-.12,-HX,y,y+.13,z-.075,z+.075],'#C9C1AA',1,0,null,'rgba(60,50,35,.5)')}line(4.1,[-HX-.01,.28,0],[-HX-.01,H-.14,0],'#3b0b06',.6,1);[.9,1.8].forEach(y=>line(4.1,[-HX-.01,y,-HZ],[-HX-.01,y,HZ],'#3b0b06',.35,.8))}for(const sx of[-HX,HX])for(const sz of[-HZ,HZ])if(lift>.02)line(3.9,[sx,H,sz],[sx,H+lift,sz],ST,.5*lop+.15,.9,[2,2.5]);abox(4,[-HX,HX,H+lift,H+lift+.1,-HZ,HZ],ST,lop);if(nv([0,1,0])[2]>0)for(let i=0;i<60;i+=2)poly(4.1,[[-HX+i*.2,H+lift+.1,-HZ],[-HX+i*.2+.2,H+lift+.1,-HZ],[-HX+i*.2+.2,H+lift+.1,HZ],[-HX+i*.2,H+lift+.1,HZ]],'#000000',.1*lop,0);cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);cx.clearRect(0,0,w,h);const o0=proj([0,0,0]);cx.save();cx.translate(o0[0],o0[1]+4);cx.scale(1,.34);const g=cx.createRadialGradient(0,0,0,0,0,w*.52);g.addColorStop(0,C.spot);g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,w*.52,0,7);cx.fill();cx.restore();cx.save();cx.fillStyle=C.shd;cx.shadowColor=C.shd;cx.shadowBlur=14;cx.beginPath();[[-HX-.3,-HZ-.3],[HX+.3,-HZ-.3],[HX+.3,HZ+.3],[-HX-.3,HZ+.3]].forEach((p,i)=>{const q=proj([p[0],0,p[1]]);i?cx.lineTo(q[0],q[1]+5):cx.moveTo(q[0],q[1]+5)});cx.fill();cx.restore();it.sort((a,b)=>a.l-b.l||a.d-b.d);for(const e of it){cx.globalAlpha=e.o;if(e.A){cx.strokeStyle=e.c;cx.lineWidth=e.wd;cx.setLineDash(e.dash||[]);cx.beginPath();cx.moveTo(e.A[0],e.A[1]);cx.lineTo(e.B[0],e.B[1]);cx.stroke();cx.setLineDash([])}else{cx.fillStyle=e.f;cx.beginPath();e.P.forEach((p,i)=>i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));cx.closePath();cx.fill();if(e.s&&e.o>=1){cx.strokeStyle=e.sc||e.f;cx.lineWidth=e.sc?.7:.5;cx.stroke()}}}cx.lineJoin='round';cx.globalAlpha=1;cx.font='700 11px -apple-system,Arial,sans-serif';cx.textAlign='center';if(t<.3&&pitch<35){const sx=proj([-HX-.5,0,0])[0]<proj([HX+.5,0,0])[0]?-HX-.5:HX+.5,zn=nv([0,0,1])[2]>0?HZ:-HZ,a=proj([sx,.02,zn]),b=proj([sx,H-.02,zn]);cx.globalAlpha=1-t/.3;cx.strokeStyle=C.tx;cx.lineWidth=1.1;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.moveTo(a[0]-3,a[1]);cx.lineTo(a[0]+3,a[1]);cx.moveTo(b[0]-3,b[1]);cx.lineTo(b[0]+3,b[1]);cx.stroke();cx.fillStyle=C.tx;cx.font='700 10px -apple-system,Arial,sans-serif';cx.textAlign=sx<0?'left':'right';const e=proj([sx<0?-HX:HX,H,zn]);cx.fillText('Ceiling 2.69 m',e[0],proj([sx<0?-HX:HX,H+lift+.1,zn])[1]-7);cx.globalAlpha=1-t/.3;cx.textAlign='center';cx.font='700 11px -apple-system,Arial,sans-serif'}if(EMPTY&&demoShowLoad){const carton=cargo.find(c=>c.demoCurrent);if(carton){const b=carton.b,p=proj([(b[0]+b[1])/2,b[3],(b[4]+b[5])/2]),top=Math.min(...[-HX,HX].flatMap(x=>[0,H+1].flatMap(y=>[-HZ,HZ].map(z=>proj([x,y,z])[1])))),labelY=Math.max(17,top-12),labelX=Math.max(82,Math.min(w-82,p[0]));cx.globalAlpha=1;cx.strokeStyle=C.ac;cx.lineWidth=1.5;cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(labelX,labelY+5);cx.stroke();cx.fillStyle=C.ac;cx.beginPath();cx.arc(p[0],p[1],3,0,Math.PI*2);cx.fill();cx.font='700 12px -apple-system,Arial,sans-serif';cx.textAlign='center';cx.fillStyle=C.tx;cx.fillText('My current loaded space',labelX,labelY);}}if(!EMPTY&&RESERVED>0&&YOUR_LOADED>0){const top=Math.min(...[-HX,HX].flatMap(x=>[0,H+1].flatMap(y=>[-HZ,HZ].map(z=>proj([x,y,z])[1])))),mc=cargo[Math.max(0,visible-1)],u=proj(mc?[(mc.b[0]+mc.b[1])/2,mc.b[3],(mc.b[4]+mc.b[5])/2]:user),ly=Math.max(14,top-12);cx.globalAlpha=1;cx.strokeStyle=C.tx;cx.lineWidth=1.1;cx.beginPath();cx.moveTo(u[0],u[1]);cx.lineTo(u[0],ly+4);cx.stroke();cx.fillStyle=C.tx;cx.beginPath();cx.arc(u[0],u[1],2.3,0,7);cx.fill();cx.fillText('My current loaded space '+YOUR_LOADED.toFixed(2)+' CBM',Math.max(108,Math.min(w-108,u[0])),ly);}if(Number.isFinite(FREE)&&FREE>=0&&FREE<=68){const f=proj([HX-(FREE/68)*L/2,1.3,0]);cx.globalAlpha=1;cx.textAlign='center';cx.font='700 10px -apple-system,Arial,sans-serif';cx.lineWidth=3;cx.strokeStyle=C.halo;cx.strokeText(FREE.toFixed(1)+' CBM free',f[0],f[1]);cx.fillStyle=C.fl;cx.fillText(FREE.toFixed(1)+' CBM free',f[0],f[1]);}}const rq=()=>{if(!raf)raf=requestAnimationFrame(draw)};if(EMPTY){const started=Date.now();const tick=()=>{const cycle=(Date.now()-started)%13600;demoCount=cycle<4800?Math.floor(Math.min(1,cycle/4800)*cargo.length):cycle<8600?cargo.length:0;demoShowLoad=cycle>=4800&&cycle<8600;demoBlink=demoShowLoad&&Math.floor((cycle-4800)/500)%2===0;rq()};tick();const timer=setInterval(tick,100);addEventListener('pagehide',()=>clearInterval(timer),{once:true});}function fit(){const r=cv.getBoundingClientRect();w=r.width;h=r.height;cv.width=w*devicePixelRatio;cv.height=h*devicePixelRatio;rq()}addEventListener('resize',fit);fit();let px,py,dn=0;cv.addEventListener('pointerdown',e=>{dn=1;px=e.clientX;py=e.clientY;cv.setPointerCapture(e.pointerId)});cv.addEventListener('pointermove',e=>{if(!dn)return;yaw=wrap(yaw+(e.clientX-px)*.5);pitch=Math.max(4,Math.min(90,pitch+(e.clientY-py)*.35));px=e.clientX;py=e.clientY;rq()});['pointerup','pointercancel'].forEach(k=>cv.addEventListener(k,()=>dn=0));"
].join("\n");