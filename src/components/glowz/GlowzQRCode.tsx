import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { hash } from '../utils/hash';

const N = 21;
const finder = (x: number, y: number): boolean => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);

/** Decorative demo code derived from the booking reference. It is not a real credential. */
export function GlowzQRCode({ seed, size = 180 }: { seed: string; size?: number }) {
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let on: boolean;
      if (finder(x, y)) {
        const a = x < 7 ? x : x - (N - 7);
        const b = y < 7 ? y : y - (N - 7);
        on = a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4);
      } else {
        on = hash(seed + x + ',' + y) % 2 === 0;
      }
      if (on) cells.push(<Rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} />);
    }
  }
  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 14, alignSelf: 'center' }} accessibilityRole="image" accessibilityLabel="Demo appointment code">
      <Svg width="100%" height="100%" viewBox={`0 0 ${N} ${N}`} fill="#37302D">
        {cells}
      </Svg>
    </View>
  );
}
