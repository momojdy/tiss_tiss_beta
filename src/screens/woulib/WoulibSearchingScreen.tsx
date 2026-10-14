import React from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {Btn, DriverRow, YELLOW, etaRange, styles, useRide, useWoulibTheme} from './WoulibShared';

export function WoulibSearchingScreen() {
  const ride = useRide();
  const {t} = useWoulibTheme();
  const noun = ride.mode === 'delivery' ? 'delivery' : 'ride';
  const veh = ride.vehicle;
  return (
    <Animated.View entering={FadeIn}>
      <Text style={[styles.h1, {color: t.ink}]}>Finding your driver…</Text>
      <Text style={{color: t.muted, marginTop: 4}}>{ride.found === 0 ? 'Looking around your pickup point' : `${ride.found} driver${ride.found === 1 ? '' : 's'} nearby`}</Text>
      <View style={[styles.bar, {backgroundColor: t.soft}]}><Animated.View style={{height: 8, width: `${Math.min(100, 20 + ride.found * 25)}%`, backgroundColor: YELLOW, borderRadius: 4}} /></View>
      {ride.drivers.filter(d => ride.shown[d.id]).map(d => (
        <Animated.View key={d.id} entering={FadeInDown.duration(250)}><DriverRow d={d} vehicle={veh} right={<Text style={{color: t.ink, fontWeight: '800'}}>{etaRange(d.eta)} min</Text>} /></Animated.View>
      ))}
      <View style={{marginTop: 14}}><Btn label={`Cancel ${noun}`} kind="danger" onPress={ride.cancel} /></View>
    </Animated.View>
  );
}

export default WoulibSearchingScreen;
