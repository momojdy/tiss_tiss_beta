import React, {useState} from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';
import {Btn, VEHICLES, Vehicle, YELLOW, etaRange, fare, styles, useRide, useWoulibTheme} from './WoulibShared';
import {WoulibPaymentScreen} from './WoulibPaymentScreen';

export function WoulibCarScreen() {
  const ride = useRide();
  const {t} = useWoulibTheme();
  const [showPay, setShowPay] = useState(false);
  const trip = ride.trip;
  const noun = ride.mode === 'delivery' ? 'delivery' : 'ride';
  const veh = ride.vehicle;
  const label = (s: string) => <Text style={[styles.label, {color: t.muted}]}>{s}</Text>;
  const summary = trip ? `${trip.from} → ${trip.dest} · ${trip.km} km · ${trip.min} min` : '';

  const vehicleRow = (v: Vehicle) => {
    const sel = v.id === veh.id;
    return (
      <Pressable key={v.id} onPress={() => ride.setVehicle(v)} style={[styles.vRow, {borderColor: sel ? YELLOW : t.line, backgroundColor: sel ? t.yellowSoft : t.card}]}>
        <View style={{width: 46, height: 46, borderRadius: 14, backgroundColor: v.color, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="car-sport" size={24} color={v.cat === 'L' && v.color === '#1d1d22' ? YELLOW : '#111'} /></View>
        <View style={{flex: 1, marginLeft: 12}}>
          <Text style={[styles.h2, {color: t.ink}]}>{v.name}</Text>
          <Text style={{color: t.muted, fontSize: 12.5}}>{v.seats} seats · {etaRange(v.eta)} min away</Text>
        </View>
        <Text style={[styles.h2, {color: t.ink}]}>{fare(v.price)}</Text>
      </Pressable>
    );
  };

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Text style={[styles.h1, {color: t.ink}]}>Choose a {noun}</Text>
      <Text style={{color: t.muted, marginTop: 4, fontSize: 13}}>{summary}</Text>
      {label('Standard')}
      {VEHICLES.filter(v => v.cat === 'N').map(vehicleRow)}
      {label('Luxury')}
      {VEHICLES.filter(v => v.cat === 'L').map(vehicleRow)}
      {label(ride.mode === 'delivery' ? 'Note for the courier' : 'Pickup note')}
      <TextInput value={ride.landmark} onChangeText={ride.setLandmark} placeholder="Landmark, gate, floor…" placeholderTextColor={t.muted} style={[styles.field, {backgroundColor: t.soft, color: t.ink}]} />
      {label('Payment')}
      <WoulibPaymentScreen showPay={showPay} setShowPay={setShowPay} />
      <View style={{flexDirection: 'row', marginTop: 18}}>
        <Btn label="Back" kind="secondary" onPress={ride.clearTrip} flex={1} />
        <View style={{width: 10}} />
        <Btn label={`Request ${veh.short} · ${fare(veh.price)}`} onPress={ride.startSearch} flex={3} />
      </View>
    </Animated.View>
  );
}

export default WoulibCarScreen;
