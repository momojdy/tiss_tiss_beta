import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {PAYMENTS, styles, useRide, useWoulibTheme} from './WoulibShared';

export function WoulibPaymentScreen({showPay, setShowPay}: {showPay: boolean; setShowPay: React.Dispatch<React.SetStateAction<boolean>>}) {
  const ride = useRide();
  const {t} = useWoulibTheme();
  return (
    <>
      <Pressable onPress={() => setShowPay(v => !v)} style={[styles.field, {backgroundColor: t.soft}]}> 
        <View style={{backgroundColor: ride.payment.color, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 12}}><Text style={{color: '#fff', fontSize: 10.5, fontWeight: '800'}}>{ride.payment.badge}</Text></View>
        <View style={{flex: 1}}><Text style={{color: t.ink, fontWeight: '700'}}>{ride.payment.name}</Text><Text style={{color: t.muted, fontSize: 12}}>{ride.payment.sub}</Text></View>
        <Ionicons name={showPay ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
      </Pressable>
      {showPay && PAYMENTS.map(p => (
        <Pressable key={p.id} onPress={() => { ride.setPayment(p); setShowPay(false); }} style={[styles.row, {paddingLeft: 6}]}> 
          <View style={{backgroundColor: p.color, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginRight: 12, minWidth: 44, alignItems: 'center'}}><Text style={{color: '#fff', fontSize: 10.5, fontWeight: '800'}}>{p.badge}</Text></View>
          <View style={{flex: 1}}><Text style={{color: t.ink, fontWeight: '600'}}>{p.name}</Text><Text style={{color: t.muted, fontSize: 12}}>{p.sub}</Text></View>
          {p.id === ride.payment.id && <Ionicons name="checkmark-circle" size={20} color={t.green} />}
        </Pressable>
      ))}
    </>
  );
}

export default WoulibPaymentScreen;
