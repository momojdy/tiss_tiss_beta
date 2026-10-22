import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useGlowzTheme } from '../styles/ThemeContext';
import type { Tone } from '../styles/colors';
import { toneOf } from '../utils/tone';

/**
 * Tonal illustrations standing in for photography (no image assets exist yet).
 * Each tile is a soft scene with a simple motif for the category.
 */
function Motif({ icon, t }: { icon: string; t: Tone }) {
  switch (icon) {
    case 'scis':
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <Path
              key={i}
              d={`M${50 + i * 24} 28 C${90 + i * 10} 70 ${28 + i * 24} 112 ${70 + i * 20} 152 S${96 + i * 18} 186 ${80 + i * 20} 210`}
              fill="none"
              stroke={i % 2 ? t.c : t.d}
              strokeWidth={i % 2 ? 6 : 3}
              strokeLinecap="round"
              opacity={i % 2 ? 0.6 : 0.85}
            />
          ))}
        </>
      );
    case 'nail':
      return (
        <>
          <G fill={t.c}>
            <Rect x={44} y={76} width={30} height={72} rx={15} />
            <Rect x={85} y={54} width={30} height={94} rx={15} fill={t.d} />
            <Rect x={126} y={76} width={30} height={72} rx={15} />
          </G>
          <G fill="#FFFFFF" opacity={0.5}>
            <Rect x={50} y={84} width={6} height={26} rx={3} />
            <Rect x={91} y={62} width={6} height={32} rx={3} />
            <Rect x={132} y={84} width={6} height={26} rx={3} />
          </G>
        </>
      );
    case 'lip':
      return (
        <>
          <Path d="M48 104 C68 76 90 82 100 94 C110 82 132 76 152 104 C132 136 68 136 48 104Z" fill={t.c} />
          <Path d="M48 104 C80 114 120 114 152 104" stroke={t.d} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </>
      );
    case 'eye': {
      const lashes = [];
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (1.1 + (0.8 * i) / 8);
        const x1 = 100 + 56 * Math.cos(a), y1 = 114 + 40 * Math.sin(a);
        const x2 = 100 + 78 * Math.cos(a), y2 = 114 + 62 * Math.sin(a);
        lashes.push(<Path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} stroke={t.d} strokeWidth={3} strokeLinecap="round" />);
      }
      return (
        <>
          {lashes}
          <Path d="M42 114 Q100 76 158 114 Q100 146 42 114Z" fill={t.a} stroke={t.d} strokeWidth={2.5} />
          <Circle cx={100} cy={114} r={15} fill={t.c} />
          <Circle cx={100} cy={114} r={6} fill={t.d} />
        </>
      );
    }
    case 'brow':
      return (
        <>
          <Path d="M38 112 Q90 58 162 92" stroke={t.c} strokeWidth={15} fill="none" strokeLinecap="round" />
          <Path d="M52 138 Q98 106 150 124" stroke={t.d} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.6} />
        </>
      );
    case 'spark':
      return (
        <>
          <Path d="M100 40 L112 88 L160 100 L112 112 L100 160 L88 112 L40 100 L88 88Z" fill={t.c} />
          <Path d="M152 44 L156 60 L172 64 L156 68 L152 84 L148 68 L132 64 L148 60Z" fill={t.d} opacity={0.8} />
        </>
      );
    case 'comb':
      return (
        <>
          <Rect x={46} y={84} width={108} height={22} rx={11} fill={t.c} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Rect key={i} x={52 + i * 13} y={110} width={8} height={34} rx={3} fill={t.d} opacity={0.8} />
          ))}
        </>
      );
    case 'lotus':
      return (
        <G transform="translate(100 156)">
          {[-62, -31, 31, 62].map((r) => (
            <Ellipse key={r} rx={17} ry={50} cx={0} cy={-44} transform={`rotate(${r})`} fill={t.c} opacity={0.65} />
          ))}
          <Ellipse rx={19} ry={56} cx={0} cy={-48} fill={t.d} opacity={0.85} />
        </G>
      );
    case 'user':
      return (
        <>
          <Circle cx={100} cy={82} r={30} fill={t.d} />
          <Path d="M36 200 C40 146 72 124 100 124 S160 146 164 200Z" fill={t.c} />
        </>
      );
    case 'heart':
      return <Path d="M100 160 C40 118 52 66 86 66 C96 66 100 74 100 80 C100 74 104 66 114 66 C148 66 160 118 100 160Z" fill={t.c} />;
    default:
      return (
        <>
          <Path d="M52 150 C52 84 96 50 152 50 C152 112 114 154 52 150Z" fill={t.c} />
          <Path d="M52 150 C80 112 104 88 140 62" stroke={t.d} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      );
  }
}

interface Props {
  /** Hue key; decides palette and the soft circle offset. */
  h: number;
  icon: string;
  style?: StyleProp<ViewStyle>;
  /** Force a palette 0 to 3 (built-in profile pictures). */
  toneIndex?: number;
}

export function GlowzArt({ h, icon, style, toneIndex }: Props) {
  const { tones } = useGlowzTheme();
  const t = tones[toneIndex ?? toneOf(h)];
  const o = (h % 9) * 5;
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: t.a }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
        <Rect width={200} height={200} fill={t.a} />
        <Circle cx={150 - o} cy={30 + o} r={92} fill={t.b} opacity={0.75} />
        <Circle cx={20 + o} cy={195} r={70} fill={t.c} opacity={0.28} />
        <Motif icon={icon} t={t} />
      </Svg>
    </View>
  );
}