import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Btn, DriverRow, etaRange, fare, styles, useRide, useWoulibTheme } from './WoulibShared';

export function WoulibOfferDriverScreen() {
  const ride = useRide();
  const { t } = useWoulibTheme();
  const driver = ride.drivers[ride.offerIdx];
  if (!driver) return null;

  return (
    <Animated.View entering={FadeIn}>
      <Text style={[styles.h1, { color: t.ink }]}>
        {ride.status === 'offer' ? `${driver.first} can pick you up` : 'Finding another driver…'}
      </Text>
      <DriverRow d={driver} vehicle={ride.vehicle} />
      <View style={{ backgroundColor: t.yellowSoft, borderRadius: 16, padding: 14, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.muted, fontSize: 12 }}>Offer</Text>
          <Text style={{ color: t.ink, fontSize: 26, fontWeight: '800' }}>{fare(ride.price)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: t.muted, fontSize: 12 }}>Arrives in</Text>
          <Text style={{ color: t.ink, fontSize: 18, fontWeight: '800' }}>{etaRange(driver.eta)} min</Text>
        </View>
      </View>
      {ride.status === 'offer' ? (
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <Btn label="Decline" kind="secondary" onPress={ride.decline} flex={1} />
          <View style={{ width: 10 }} />
          <Btn label="Accept" onPress={ride.accept} flex={2} />
        </View>
      ) : null}
    </Animated.View>
  );
}

export default WoulibOfferDriverScreen;
