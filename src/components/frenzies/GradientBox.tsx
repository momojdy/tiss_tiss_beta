import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientDef } from '../../theme/frenziesTheme';

type Props = {
  gradient: GradientDef;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export default function GradientBox({ gradient, style, children }: Props) {
  return (
    <LinearGradient
      colors={gradient.colors}
      start={gradient.start}
      end={gradient.end}
      style={[styles.base, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
