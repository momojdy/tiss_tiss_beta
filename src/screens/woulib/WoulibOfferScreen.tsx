import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Btn, FROMS, MAP_TOP, PLACES, WoulibOfferedRide, fare, styles, useWoulibTheme} from './WoulibShared';

const OFFER_WHEN = ['In 15 min', 'In 1 hour', 'Tonight · 7:00 PM', 'Tomorrow · 8:00 AM'];

export function WoulibOfferScreen({onBack, onPublish}: {onBack: () => void; onPublish: (r: WoulibOfferedRide) => void}) {
  const {t} = useWoulibTheme();
  const places = useMemo(() => PLACES.map(p => p.n), []);
  const [from, setFrom] = useState(FROMS[0]);
  const [to, setTo] = useState(PLACES[0].n);
  const [when, setWhen] = useState(OFFER_WHEN[1]);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(10);
  const same = from === to;
  const next = (list: string[], v: string) => list[(list.indexOf(v) + 1) % list.length];
  const field = (label: string, value: string, onPress: () => void) => (
    <View>
      <Text style={[styles.label, {color: t.muted}]}>{label}</Text>
      <Pressable onPress={onPress} style={[styles.field, {backgroundColor: t.soft}]}> 
        <Text style={{flex: 1, color: t.ink, fontWeight: '700'}}>{value}</Text>
        <Text style={{color: t.muted, fontSize: 12}}>Tap to change</Text>
      </Pressable>
    </View>
  );
  const stepper = (label: string, value: string, dec: () => void, inc: () => void) => (
    <View style={{flex: 1}}>
      <Text style={[styles.label, {color: t.muted}]}>{label}</Text>
      <View style={[styles.field, {backgroundColor: t.soft, justifyContent: 'space-between'}]}>
        <Pressable onPress={dec} hitSlop={10}><Ionicons name="remove-circle" size={26} color={t.ink} /></Pressable>
        <Text style={{color: t.ink, fontWeight: '800', fontSize: 16}}>{value}</Text>
        <Pressable onPress={inc} hitSlop={10}><Ionicons name="add-circle" size={26} color={t.ink} /></Pressable>
      </View>
    </View>
  );
  return (
    <View style={{flex: 1, backgroundColor: t.bg}}>
      <ScrollView contentContainerStyle={{paddingTop: MAP_TOP - 20, paddingHorizontal: 18, paddingBottom: 40}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Pressable onPress={onBack} style={[styles.circle, {backgroundColor: t.card, marginRight: 12}]}><Ionicons name="arrow-back" size={19} color={t.ink} /></Pressable>
          <Text style={{color: t.ink, fontSize: 26, fontWeight: '800'}}>Offer a ride</Text>
        </View>
        <Text style={{color: t.muted, marginTop: 10, fontSize: 13}}>Share your trip and let others book a seat.</Text>
        {field('Pickup', from, () => setFrom(next(FROMS, from)))}
        {field('Destination', to, () => setTo(next(places, to)))}
        {same && <Text style={{color: t.red, fontSize: 12.5, marginTop: 8}}>Pickup and destination must be different.</Text>}
        {field('When', when, () => setWhen(next(OFFER_WHEN, when)))}
        <View style={{flexDirection: 'row'}}>
          {stepper('Seats', String(seats), () => setSeats(s => Math.max(1, s - 1)), () => setSeats(s => Math.min(6, s + 1)))}
          <View style={{width: 10}} />
          {stepper('Price / seat', fare(price), () => setPrice(p => Math.max(1, p - 1)), () => setPrice(p => Math.min(200, p + 1)))}
        </View>
        <View style={{marginTop: 26}}>
          <Btn label="Publish ride" icon="checkmark-circle" disabled={same} onPress={() => onPublish({id: 'o' + Date.now(), from, destination: to, when, seats, pricePerSeat: price})} />
        </View>
      </ScrollView>
    </View>
  );
}

export default WoulibOfferScreen;
