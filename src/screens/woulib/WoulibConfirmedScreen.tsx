import React from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';
import type {WoulibScreenProps} from './WoulibFlow';

export function WoulibConfirmedScreen({ride, t, kit}: WoulibScreenProps) {
  const {styles, DriverRow} = kit;
  if (!ride.accepted) return null;
  return (
    <Animated.View entering={FadeIn}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="checkmark-circle" size={26} color={t.green} /><Text style={[styles.h1, {color: t.ink, marginLeft: 8}]}>Driver confirmed</Text></View>
      <DriverRow d={ride.accepted} vehicle={ride.vehicle} />
      <Text style={{color: t.muted, marginTop: 6}}>{ride.accepted.first} is getting ready to head to you…</Text>
    </Animated.View>
  );
}

export default WoulibConfirmedScreen;
