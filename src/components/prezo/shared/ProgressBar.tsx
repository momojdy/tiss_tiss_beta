import React from 'react';
import { View } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';

interface ProgressBarProps {
  percent: number;
  height?: number;
  marginTop?: number;
}

export const ProgressBar = ({ percent, height = 5, marginTop = 12 }: ProgressBarProps) => {
  const { colors } = usePrezoTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        height,
        borderRadius: 9,
        backgroundColor: colors.s2,
        marginTop,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: '100%', width: `${percent}%`, backgroundColor: colors.rd }} />
    </View>
  );
};

