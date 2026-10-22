import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ICON_SHAPES } from '../data/iconPaths';
import type { GlowzIconName } from '../data/iconPaths';

interface Props {
  name: GlowzIconName | string;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** Fill the shapes with the icon colour (saved hearts). */
  filled?: boolean;
}

/** Stroke icons from the prototype set, drawn with react-native-svg on a 24x24 grid. */
export function GlowzIcon({ name, size = 19, color, strokeWidth = 1.6, filled }: Props) {
  const shapes = ICON_SHAPES[name] ?? [];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {shapes.map((sh, i) => {
        const fill = filled || sh.fill === 'currentColor' ? color : 'none';
        if (sh.t === 'circle') return <Circle key={i} cx={Number(sh.cx)} cy={Number(sh.cy)} r={Number(sh.r)} fill={fill} />;
        if (sh.t === 'rect') {
          return <Rect key={i} x={Number(sh.x)} y={Number(sh.y)} width={Number(sh.width)} height={Number(sh.height)} rx={sh.rx ? Number(sh.rx) : undefined} fill={fill} />;
        }
        return <Path key={i} d={sh.d} fill={fill} />;
      })}
    </Svg>
  );
}