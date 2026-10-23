import React from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { withAlpha } from '../../../lib/prezo/colors';

interface BlurSurfaceProps {
  opacity: number;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
  children?: React.ReactNode;
}

export const BlurSurface = ({
  opacity,
  intensity = 40,
  style,
  onLayout,
  children,
}: BlurSurfaceProps) => {
  const { colors, mode } = usePrezoTheme();
  return (
    <View onLayout={onLayout} style={[styles.root, style]}>
      <BlurView
        pointerEvents="none"
        intensity={intensity}
        tint={mode === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(colors.bg, opacity) }]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
});

