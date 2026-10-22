import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzText } from './GlowzText';

const STAR_D = 'M12 2.8l2.8 5.9 6.4.9-4.7 4.5 1.2 6.4L12 17.3 6.3 20.5l1.2-6.4L2.8 9.6l6.4-.9z';

export function StarGlyph({ size = 13, color, opacity = 1 }: { size?: number; color: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path d={STAR_D} fill={color} />
    </Svg>
  );
}

/** Row of five stars with the first `value` filled. */
export function GlowzStarRow({ value, size = 14 }: { value: number; size?: number }) {
  const { c } = useGlowzTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarGlyph key={n} size={size} color={c.star} opacity={n <= value ? 1 : 0.25} />
      ))}
    </View>
  );
}

/** "★ 4.9" */
export function GlowzRating({ rating, size = 13 }: { rating: number; size?: number }) {
  const { c } = useGlowzTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <StarGlyph size={size} color={c.star} />
      <GlowzText size={size} weight={600}>{rating.toFixed(1)}</GlowzText>
    </View>
  );
}

/** Sage tick shown next to verified providers. */
export function GlowzVerified({ size = 15 }: { size?: number }) {
  const { c } = useGlowzTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Verified">
      <Circle cx={12} cy={12} r={11} fill={c.sage} />
      <Path d="M7.5 12.4l3 3 6-6.6" stroke="#FFF7F0" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
