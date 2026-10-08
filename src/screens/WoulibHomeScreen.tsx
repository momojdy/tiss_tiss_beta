import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import WoulibMap, { WoulibPoint } from '../components/woulib/WoulibMap';
import { WoulibRideStatus } from '../lib/woulib/rideState';

const YELLOW = '#FEC509';
const MAGENTA = '#BF008E';

const pickup: WoulibPoint = { x: 190, y: 315 };
const destination: WoulibPoint = { x: 535, y: 180 };
const driver: WoulibPoint = { x: 390, y: 260 };
const route: WoulibPoint[] = [pickup, { x: 245, y: 285 }, { x: 330, y: 275 }, { x: 410, y: 235 }, { x: 475, y: 205 }, destination];

export default function WoulibHomeScreen({ onBack }: { onBack?: () => void }) {
  const [pickupText, setPickupText] = useState('Current location');
  const [destinationText, setDestinationText] = useState('Where to?');
  const [status, setStatus] = useState<WoulibRideStatus>('REQUESTING');
  const searching = status === 'DRIVER_SEARCHING' || status === 'DRIVER_OFFERED' || status === 'DRIVER_ACCEPTED';
  const headline = useMemo(() => {
    if (status === 'DRIVER_SEARCHING') return 'Finding your driver';
    if (status === 'DRIVER_ACCEPTED') return 'Driver is on the way';
    return 'Where are you going?';
  }, [status]);

  return <View style={styles.root}>
    <View style={styles.mapWrap}>
      <WoulibMap pickup={pickup} destination={destination} driver={driver} route={route} animateDriver={searching} />
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.brand}><View style={styles.brandDot} /><Text style={styles.brandText}>Woulib</Text></View>
      </View>
    </View>

    <View style={styles.sheet}>
      <Text style={styles.title}>{headline}</Text>
      <Text style={styles.subtitle}>Ride, taxi and delivery — all in Woulib.</Text>

      <View style={styles.field}><View style={styles.dot} /><TextInput value={pickupText} onChangeText={setPickupText} style={styles.input} placeholder="Pickup location" /></View>
      <View style={styles.connector} />
      <View style={styles.field}><View style={[styles.dot, styles.destDot]} /><TextInput value={destinationText} onChangeText={setDestinationText} style={styles.input} placeholder="Destination" /></View>

      <View style={styles.actions}>
        <Pressable style={styles.option}><Text style={styles.optionTitle}>Ride</Text><Text style={styles.optionSub}>Everyday</Text></Pressable>
        <Pressable style={styles.option}><Text style={styles.optionTitle}>Taxi</Text><Text style={styles.optionSub}>Quick pickup</Text></Pressable>
        <Pressable style={styles.option}><Text style={styles.optionTitle}>Delivery</Text><Text style={styles.optionSub}>Send a package</Text></Pressable>
      </View>

      <Pressable onPress={() => setStatus('DRIVER_SEARCHING')} style={styles.primary}><Text style={styles.primaryText}>Find a ride</Text></Pressable>
      {status !== 'REQUESTING' && <Pressable onPress={() => setStatus('REQUESTING')} style={styles.reset}><Text style={styles.resetText}>Reset demo</Text></Pressable>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:'#fff'},
  mapWrap:{flex:1,minHeight:300},
  topBar:{position:'absolute',top:52,left:18,right:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  back:{width:44,height:44,borderRadius:22,backgroundColor:'rgba(255,255,255,.94)',alignItems:'center',justifyContent:'center'},
  backText:{fontSize:34,lineHeight:38,color:'#111'},
  brand:{height:44,paddingHorizontal:15,borderRadius:22,backgroundColor:'rgba(255,255,255,.94)',flexDirection:'row',alignItems:'center'},
  brandDot:{width:12,height:12,borderRadius:6,backgroundColor:YELLOW,marginRight:7},
  brandText:{fontSize:17,fontWeight:'800',color:'#111'},
  sheet:{backgroundColor:'#fff',borderTopLeftRadius:26,borderTopRightRadius:26,paddingHorizontal:18,paddingTop:20,paddingBottom:24,shadowColor:'#000',shadowOpacity:.08,shadowRadius:14,shadowOffset:{width:0,height:-4},elevation:7},
  title:{fontSize:24,fontWeight:'800',color:'#111'},
  subtitle:{fontSize:12,color:'#777',marginTop:4,marginBottom:16},
  field:{height:54,borderRadius:13,backgroundColor:'#F6F5F3',flexDirection:'row',alignItems:'center',paddingHorizontal:14},
  dot:{width:10,height:10,borderRadius:5,backgroundColor:'#111',marginRight:12},
  destDot:{backgroundColor:YELLOW},
  input:{flex:1,fontSize:15,color:'#222'},
  connector:{height:8,width:2,backgroundColor:'#D6D2CD',marginLeft:18},
  actions:{flexDirection:'row',gap:8,marginTop:15},
  option:{flex:1,minHeight:62,borderRadius:12,backgroundColor:'#FAFAF9',padding:10},
  optionTitle:{fontSize:14,fontWeight:'700',color:'#111'},
  optionSub:{fontSize:10,color:'#777',marginTop:3},
  primary:{height:52,borderRadius:13,backgroundColor:YELLOW,alignItems:'center',justifyContent:'center',marginTop:16},
  primaryText:{fontSize:16,fontWeight:'800',color:'#111'},
  reset:{alignItems:'center',paddingTop:10},
  resetText:{fontSize:11,color:MAGENTA,fontWeight:'600'},
});
