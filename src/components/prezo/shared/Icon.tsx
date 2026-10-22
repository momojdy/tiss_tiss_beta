import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'bell'
  | 'home'
  | 'explore'
  | 'waitlist'
  | 'orders'
  | 'profile'
  | 'heart'
  | 'share'
  | 'close'
  | 'chevronRight'
  | 'chevronLeft'
  | 'check';

type Shape = { d: string } | { cx: number; cy: number; r: number };

const shapes: Record<IconName, Shape[]> = {
  back: [{ d: 'M15 5l-7 7 7 7' }],
  chevronLeft: [{ d: 'M15 5l-7 7 7 7' }],
  chevronRight: [{ d: 'M9 5l7 7-7 7' }],
  bell: [{ d: 'M6 17v-6a6 6 0 0112 0v6l2 2H4z' }, { d: 'M10 21a2 2 0 004 0' }],
  home: [{ d: 'M4 11l8-7 8 7v9H4z' }, { d: 'M10 20v-6h4v6' }],
  explore: [{ cx: 11, cy: 11, r: 7 }, { d: 'M20 20l-4-4' }],
  waitlist: [{ cx: 12, cy: 12, r: 9 }, { d: 'M12 7v5l3 2' }],
  orders: [{ d: 'M4 8l8-4 8 4v8l-8 4-8-4z' }, { d: 'M4 8l8 4 8-4M12 12v8' }],
  profile: [{ cx: 12, cy: 8, r: 4 }, { d: 'M4 21c1-4 4-6 8-6s7 2 8 6' }],
  heart: [{ d: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z' }],
  share: [{ d: 'M7 17L17 7' }, { d: 'M9 7h8v8' }],
  close: [{ d: 'M6 6l12 12M18 6L6 18' }],
  check: [{ d: 'M5 12.5l4.5 4.5L19 7' }],
};

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  filled?: boolean;
}

export const Icon = ({ name, size = 22, color, strokeWidth = 1.8, filled = false }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {shapes[name].map((shape, index) =>
      'd' in shape ? (
        <Path
          key={index}
          d={shape.d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={filled ? color : 'none'}
        />
      ) : (
        <Circle
          key={index}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
      ),
    )}
  </Svg>
);

