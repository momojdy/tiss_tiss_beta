import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { heroGradientStops } from '../../../theme/prezoTheme';
import { Button } from '../shared/Button';
import { Chip } from '../shared/Chip';
import { PzText } from '../shared/PzText';

interface HeroBannerProps {
  onSearch: () => void;
}

export const HeroBanner = ({ onSearch }: HeroBannerProps) => {
  const { width, isWide } = useLayoutMode();
  const titleSize = Math.min(76, Math.max(38, width * 0.08));
  return (
    <View style={[styles.hero, isWide ? styles.heroWide : null]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="heroGradient" cx="85%" cy="0%" fx="85%" fy="0%" rx="120%" ry="90%">
            <Stop offset="0" stopColor={heroGradientStops[0]} />
            <Stop offset="0.38" stopColor={heroGradientStops[1]} />
            <Stop offset="0.78" stopColor={heroGradientStops[2]} />
            <Stop offset="1" stopColor={heroGradientStops[2]} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="#000000" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGradient)" />
      </Svg>
      <View pointerEvents="none" style={styles.rings}>
        <Svg width={540} height={540} viewBox="-270 -270 540 540">
          <Circle r={245} stroke="rgba(255,255,255,0.03)" strokeWidth={50} fill="none" />
          <Circle r={200} stroke="rgba(255,255,255,0.04)" strokeWidth={40} fill="none" />
          <Circle r={179.75} stroke="rgba(255,255,255,0.22)" strokeWidth={0.5} fill="none" />
        </Svg>
      </View>
      <Chip label="Group buying" tone="red" />
      <PzText
        display={800}
        size={titleSize}
        tone="on"
        accessibilityRole="header"
        style={styles.title}
      >
        Better prices when enough people join.
      </PzText>
      <PzText size={14} tone="on" style={styles.copy}>
        Back a campaign at the primary price. If it hits its target, it’s made. If it doesn’t, you
        choose what happens next.
      </PzText>
      <View style={{ marginTop: 18 }}>
        <Button label="Search campaigns" variant="white" onPress={onSearch} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    borderRadius: 20,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 22,
    paddingHorizontal: 20,
    minHeight: 200,
    justifyContent: 'flex-end',
    backgroundColor: '#000000',
  },
  heroWide: {
    padding: 36,
    minHeight: 320,
  },
  rings: {
    position: 'absolute',
    right: -150,
    top: -130,
    width: 540,
    height: 540,
  },
  title: {
    maxWidth: 640,
    marginTop: 10,
    marginBottom: 12,
  },
  copy: {
    maxWidth: 440,
    opacity: 0.82,
  },
});

