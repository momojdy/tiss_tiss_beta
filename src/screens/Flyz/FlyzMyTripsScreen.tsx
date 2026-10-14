import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const BLUE = '#28469E';
const TEXT = '#0E1A3A';
const MUTED = '#5F6E94';
const AQUA = '#CAE8E8';

type TripStatus = 'Upcoming' | 'Completed' | 'Cancelled';

type Trip = {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  date: string;
  time: string;
  airline: string;
  status: TripStatus;
};

const trips: Trip[] = [
  { id: '1', from: 'PAP', fromName: 'Port-au-Prince', to: 'MIA', toName: 'Miami', date: 'Dec 18', time: '8:40 AM', airline: 'American Airlines', status: 'Upcoming' },
  { id: '2', from: 'MIA', fromName: 'Miami', to: 'PAP', toName: 'Port-au-Prince', date: 'Dec 28', time: '3:15 PM', airline: 'American Airlines', status: 'Upcoming' },
  { id: '3', from: 'PAP', fromName: 'Port-au-Prince', to: 'JFK', toName: 'New York', date: 'Sep 08', time: '9:10 AM', airline: 'JetBlue', status: 'Completed' },
  { id: '4', from: 'MIA', fromName: 'Miami', to: 'PAP', toName: 'Port-au-Prince', date: 'Aug 21', time: '5:25 PM', airline: 'American Airlines', status: 'Cancelled' },
];

type Props = { onBack?: () => void; onHomePress?: () => void; onWalletPress?: () => void; onDealsPress?: () => void; onMorePress?: () => void };

function BottomNav({ active, onHome, onWallet, onDeals, onMore }: { active: string; onHome: () => void; onWallet: () => void; onDeals: () => void; onMore: () => void }) {
  const items = [['home-outline','Home',onHome],['wallet-outline','Wallet',onWallet],['tag-outline','Deals',onDeals],['dots-horizontal-circle-outline','More',onMore]] as const;
  return <View style={styles.bottomWrap}><View style={styles.bottomNav}>{items.map(([icon,label,onPress])=><Pressable key={label} onPress={onPress} style={styles.navItem}><View style={[styles.navIcon,active===label&&{backgroundColor:AQUA}]}><MaterialCommunityIcons name={icon} size={22} color={active===label?BLUE:MUTED}/></View><Text style={[styles.navLabel,active===label&&{color:BLUE}]}>{label}</Text></Pressable>)}</View></View>;
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.tripCard}>
    <View style={styles.tripTop}><View><Text style={styles.routeCode}>{trip.from} <Text style={styles.arrow}>→</Text> {trip.to}</Text><Text style={styles.routeNames}>{trip.fromName} → {trip.toName}</Text></View><View style={styles.status}><Text style={styles.statusText}>{trip.status}</Text></View></View>
    <View style={styles.divider}/>
    <View style={styles.tripBottom}><View style={{flex:1}}><Text style={styles.date}>{trip.date} · {trip.time}</Text><Text style={styles.airline}>{trip.airline}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={MUTED}/></View>
  </Pressable>;
}

export default function FlyzMyTripsScreen({ onBack, onHomePress, onWalletPress, onDealsPress, onMorePress }: Props) {
  const [status, setStatus] = useState<TripStatus>('Upcoming');
  const filtered = useMemo(() => trips.filter(t => t.status === status), [status]);

  return <View style={styles.page}>
    <StatusBar style="dark"/>
    <LinearGradient colors={['#CAE8E8','#D8EEEE','#ECF6F6','#FFFFFF']} locations={[0,.25,.48,.72]} style={styles.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={22} color={TEXT}/></Pressable>
          <Text style={styles.title}>My Trips</Text>
          <View style={{width:44}}/>
        </View>

        <View style={styles.filters}>
          {(['Upcoming','Completed','Cancelled'] as TripStatus[]).map(item => <Pressable key={item} onPress={()=>setStatus(item)} style={[styles.filter, status===item&&styles.filterActive]}><Text style={[styles.filterText,status===item&&styles.filterTextActive]}>{item}</Text></Pressable>)}
        </View>

        <Text style={styles.count}>{filtered.length} {filtered.length === 1 ? 'trip' : 'trips'}</Text>

        {filtered.length ? filtered.map(trip => <TripCard key={trip.id} trip={trip} onPress={()=>{}}/>) : <View style={styles.empty}><MaterialCommunityIcons name="airplane-off" size={40} color={BLUE}/><Text style={styles.emptyTitle}>No {status.toLowerCase()} trips</Text><Text style={styles.emptyText}>Your {status.toLowerCase()} flight bookings will appear here.</Text></View>}
      </ScrollView>
      <BottomNav active="My Trips" onHome={onHomePress ?? (()=>{})} onWallet={onWalletPress ?? (()=>{})} onDeals={onDealsPress ?? (()=>{})} onMore={onMorePress ?? (()=>{})}/>
    </LinearGradient>
  </View>;
}

const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:'#DCE6E8'},background:{flex:1},content:{paddingTop:0,paddingHorizontal:16,paddingBottom:110},
  header:{height:100,paddingBottom:4,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18},back:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(255,255,255,.65)',alignItems:'center',justifyContent:'center'},title:{fontSize:24,fontWeight:'800',letterSpacing:-.5,color:TEXT},
  filters:{flexDirection:'row',backgroundColor:'rgba(255,255,255,.6)',borderRadius:999,padding:4},filter:{flex:1,height:40,borderRadius:999,alignItems:'center',justifyContent:'center'},filterActive:{backgroundColor:BLUE},filterText:{fontSize:13,fontWeight:'700',color:MUTED},filterTextActive:{color:'#fff'},
  count:{fontSize:13,fontWeight:'600',color:MUTED,marginTop:18,marginBottom:10,paddingHorizontal:4},tripCard:{backgroundColor:'rgba(255,255,255,.84)',borderRadius:20,padding:16,marginBottom:12,shadowColor:BLUE,shadowOpacity:.08,shadowRadius:8,elevation:2},tripTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},routeCode:{fontSize:22,fontWeight:'800',letterSpacing:-.4,color:TEXT},arrow:{color:BLUE},routeNames:{fontSize:12,color:MUTED,marginTop:3},status:{backgroundColor:BLUE,borderRadius:999,paddingHorizontal:11,paddingVertical:6},statusText:{fontSize:11,fontWeight:'700',color:'#fff'},divider:{height:1,backgroundColor:'rgba(196,214,221,.65)',marginVertical:14},tripBottom:{flexDirection:'row',alignItems:'center'},date:{fontSize:13,fontWeight:'700',color:TEXT},airline:{fontSize:12,color:MUTED,marginTop:3},empty:{marginTop:42,backgroundColor:'rgba(255,255,255,.62)',borderRadius:22,padding:28,alignItems:'center'},emptyTitle:{fontSize:18,fontWeight:'800',color:TEXT,marginTop:12},emptyText:{fontSize:13,color:MUTED,textAlign:'center',marginTop:6,maxWidth:260,lineHeight:19},
  bottomWrap:{paddingHorizontal:8,paddingBottom:12,paddingTop:4},bottomNav:{height:76,borderRadius:30,backgroundColor:'rgba(255,255,255,0.72)',shadowColor:'#142864',shadowOpacity:.14,shadowRadius:14,elevation:7,flexDirection:'row',justifyContent:'space-around',alignItems:'center'},navItem:{width:80,alignItems:'center',gap:4},navIcon:{width:52,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},navLabel:{fontSize:11.5,fontWeight:'700',color:MUTED}
});