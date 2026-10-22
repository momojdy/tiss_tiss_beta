import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { PzText } from './PzText';
import { Icon } from './Icon';

interface AvatarProps {
  text?: string;
  size?: number;
  fontSize?: number;
  check?: boolean;
}

export const Avatar = ({ text, size = 72, fontSize = 26, check = false }: AvatarProps) => {
  const { colors } = usePrezoTheme();
  const gradientId = `av${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.rd2} />
            <Stop offset="1" stopColor="#000000" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#${gradientId})`} />
      </Svg>
      {check ? (
        <Icon name="check" size={Math.round(size * 0.45)} color="#ffffff" strokeWidth={2} />
      ) : (
        <PzText display={700} size={fontSize} tone="on">
          {text}
        </PzText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

