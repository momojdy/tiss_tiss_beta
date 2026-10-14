import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';
import {Btn, YELLOW, fare, styles, useRide, useWoulibTheme} from './WoulibShared';

export function WoulibCompleteScreen() {
  const ride = useRide();
  const {t} = useWoulibTheme();
  const [stars, setStars] = useState(5);
  const trip = ride.trip;
  if (!trip) return null;
  return (
    <Animated.View entering={FadeIn}>
      <View style={{alignItems: 'center', marginTop: 4}}>
        <Ionicons name="checkmark-circle" size={44} color={t.green} />
        <Text style={[styles.h1, {color: t.ink, marginTop: 6}]}>{ride.mode === 'delivery' ? 'Delivered' : "You've arrived"}</Text>
        <Text style={{color: t.muted, marginTop: 2}}>{trip.dest} · {trip.km} km</Text>
        <Text style={{color: t.ink, fontSize: 34, fontWeight: '800', marginTop: 10}}>{fare(ride.price)}</Text>
        <Text style={{color: t.muted, fontSize: 12.5}}>Paid with {ride.payment.name}</Text>
      </View>
      <Text style={[styles.label, {color: t.muted}]}>Rate your driver</Text>
      <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 14}}>
        {[1, 2, 3, 4, 5].map(n => <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}><Ionicons name={n <= stars ? 'star' : 'star-outline'} size={34} color={YELLOW} style={{marginHorizontal: 4}} /></Pressable>)}
      </View>
      <Btn label="Done" onPress={() => { setStars(5); ride.finish(); }} />
    </Animated.View>
  );
}

export default WoulibCompleteScreen;
