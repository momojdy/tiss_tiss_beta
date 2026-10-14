import React from 'react';
import {Linking, Pressable, Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';
import type {WoulibScreenProps} from './WoulibFlow';

export function WoulibOnWayScreen({ride, t, kit}: WoulibScreenProps) {
  const {styles, Btn, DriverRow, YELLOW} = kit;
  if (!ride.accepted) return null;
  const d = ride.accepted;
  const noun = ride.mode === 'delivery' ? 'delivery' : 'ride';
  const open = (n: string) => Linking.openURL(n).catch(() => {});
  return (
    <Animated.View entering={FadeIn}>
      <Text style={[styles.h1, {color: t.ink}]}>{d.first} arrives in {ride.eta} min</Text>
      <DriverRow d={d} vehicle={ride.vehicle} right={
        <View style={{flexDirection: 'row'}}>
          <Pressable onPress={() => open(`sms:${d.phone}`)} style={[styles.circle, {backgroundColor: t.soft, marginRight: 8, elevation: 0}]}><Ionicons name="chatbubble" size={18} color={t.ink} /></Pressable>
          <Pressable onPress={() => open(`tel:${d.phone}`)} style={[styles.circle, {backgroundColor: YELLOW, elevation: 0}]}><Ionicons name="call" size={18} color="#111" /></Pressable>
        </View>} />
      {!!ride.landmark && <Text style={{color: t.muted, fontSize: 13, marginTop: 4}}>Your note: {ride.landmark}</Text>}
      <View style={{marginTop: 14}}><Btn label={`Cancel ${noun}`} kind="danger" onPress={ride.cancel} /></View>
    </Animated.View>
  );
}

export default WoulibOnWayScreen;
