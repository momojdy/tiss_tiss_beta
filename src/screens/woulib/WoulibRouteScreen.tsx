import React from 'react';
import {Pressable, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';
import {PLACES, Seg, YELLOW, styles, useRide, useWoulibTheme} from './WoulibShared';

export function WoulibRouteScreen() {
  const ride = useRide();
  const {t} = useWoulibTheme();
  const label = (s: string) => <Text style={[styles.label, {color: t.muted}]}>{s}</Text>;
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Text style={[styles.h1, {color: t.ink, marginBottom: 12}]}>{ride.mode === 'delivery' ? 'Send something' : 'Where to?'}</Text>
      <Seg value={ride.mode} onChange={ride.setMode} />
      {label('Pickup')}
      <Pressable onPress={ride.cycleFrom} style={[styles.field, {backgroundColor: t.soft}]}> 
        <View style={[styles.dot, {backgroundColor: YELLOW, borderColor: '#111'}]} />
        <Text style={{flex: 1, color: t.ink, fontWeight: '700'}}>{ride.from}</Text>
        <Text style={{color: t.muted, fontSize: 12}}>Tap to change</Text>
      </Pressable>
      {label('Destination')}
      {PLACES.map(p => (
        <Pressable key={p.n} onPress={() => ride.setDest(p.n)} style={[styles.row, {borderBottomWidth: 1, borderBottomColor: t.line}]}> 
          <View style={{width: 38, height: 38, borderRadius: 19, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center'}}><Ionicons name="location" size={18} color={t.ink} /></View>
          <View style={{flex: 1, marginLeft: 12}}><Text style={[styles.h2, {color: t.ink}]}>{p.n}</Text><Text style={{color: t.muted, fontSize: 12.5}}>{p.a}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={t.muted} />
        </Pressable>
      ))}
    </Animated.View>
  );
}

export default WoulibRouteScreen;
