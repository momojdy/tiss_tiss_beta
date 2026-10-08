import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

export type WoulibPoint = { x: number; y: number };
const YELLOW = '#FEC509';
const ROAD_1 = 'M -20 150 C 70 120, 130 185, 220 145 S 370 80, 470 125 S 610 220, 740 165';
const ROAD_2 = 'M 90 -20 C 110 75, 80 125, 155 210 S 280 350, 260 470';
const ROAD_3 = 'M 440 -20 C 405 75, 460 135, 410 220 S 335 360, 390 490';
const ROAD_4 = 'M -20 300 C 80 260, 170 300, 260 285 S 430 250, 540 300 S 650 350, 760 315';

export default function WoulibMap({ pickup, destination, driver, route, animateDriver = false }: { pickup: WoulibPoint; destination: WoulibPoint; driver: WoulibPoint; route: WoulibPoint[]; animateDriver?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animateDriver) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [animateDriver, pulse]);
  const points = route.map((p) => `${p.x},${p.y}`).join(' ');
  return <View style={styles.map}>
    <Svg width="100%" height="100%" viewBox="0 0 720 500">
      {[{d:ROAD_1,w:34},{d:ROAD_2,w:30},{d:ROAD_3,w:30},{d:ROAD_4,w:28}].map((r,i)=><React.Fragment key={i}><Path d={r.d} stroke="#D8D5D1" strokeWidth={r.w} fill="none" strokeLinecap="round"/><Path d={r.d} stroke="#FFFFFF" strokeWidth={r.w-12} fill="none" strokeLinecap="round"/></React.Fragment>)}
      <Polyline points={points} fill="none" stroke={YELLOW} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pickup.x} cy={pickup.y} r="10" fill="#111" stroke="#fff" strokeWidth="5" />
      <Circle cx={destination.x} cy={destination.y} r="11" fill={YELLOW} stroke="#fff" strokeWidth="5" />
      <Circle cx={driver.x} cy={driver.y} r="14" fill="#111" stroke="#fff" strokeWidth="5" />
    </Svg>
    {animateDriver && <Animated.View pointerEvents="none" style={[styles.pulse, { left: `${driver.x / 720 * 100}%`, top: `${driver.y / 500 * 100}%`, opacity: pulse.interpolate({ inputRange:[0,1], outputRange:[.15,.55] }), transform:[{ scale: pulse.interpolate({ inputRange:[0,1], outputRange:[.7,1.45] }) }] }]} />}
  </View>;
}
const styles = StyleSheet.create({ map:{flex:1,backgroundColor:'#EEECE8',overflow:'hidden'}, pulse:{position:'absolute',width:42,height:42,marginLeft:-21,marginTop:-21,borderRadius:21,backgroundColor:YELLOW} });
