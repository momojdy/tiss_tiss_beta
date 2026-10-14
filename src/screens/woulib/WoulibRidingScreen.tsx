import React from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {DriverRow, YELLOW, clamp, styles, useRide, useWoulibTheme} from './WoulibShared';

export function WoulibRidingScreen() {
  const ride = useRide();
  const {t} = useWoulibTheme();
  const trip = ride.trip;
  if (!trip) return null;
  const p = clamp(1 - ride.eta / Math.max(1, trip.min), 0, 1);
  return (
    <Animated.View entering={FadeIn}>
      <Text style={[styles.h1, {color: t.ink}]}>Heading to {trip.dest}</Text>
      <Text style={{color: t.muted, marginTop: 4}}>{ride.eta} min left · {trip.km} km</Text>
      <View style={[styles.bar, {backgroundColor: t.soft}]}><View style={{height: 8, width: `${Math.round(p * 100)}%`, backgroundColor: YELLOW, borderRadius: 4}} /></View>
      {ride.accepted && <DriverRow d={ride.accepted} vehicle={ride.vehicle} />}
    </Animated.View>
  );
}

export default WoulibRidingScreen;
