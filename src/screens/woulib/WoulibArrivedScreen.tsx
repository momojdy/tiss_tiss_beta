import React from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import type {WoulibScreenProps} from './WoulibFlow';

export function WoulibArrivedScreen({ride, t, kit}: WoulibScreenProps) {
  const {styles, Btn, DriverRow, YELLOW} = kit;
  if (!ride.accepted) return null;
  const d = ride.accepted;
  return (
    <Animated.View entering={FadeIn}>
      <Text style={[styles.h1, {color: t.ink}]}>Your driver has arrived</Text>
      <DriverRow d={d} vehicle={ride.vehicle} />
      <View style={{backgroundColor: YELLOW, borderRadius: 14, padding: 12, marginTop: 6, alignItems: 'center'}}><Text style={{color: '#111', fontWeight: '800', fontSize: 20, letterSpacing: 1}}>{d.plate}</Text></View>
      <View style={{marginTop: 14}}><Btn label={ride.mode === 'delivery' ? 'Package handed over' : "I'm in the car"} icon="navigate" onPress={ride.startTrip} /></View>
    </Animated.View>
  );
}

export default WoulibArrivedScreen;
