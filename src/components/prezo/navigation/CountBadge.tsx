import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { PzText } from '../shared/PzText';

interface CountBadgeProps {
  count: number;
  style?: StyleProp<ViewStyle>;
}

export const CountBadge = ({ count, style }: CountBadgeProps) => {
  const { colors } = usePrezoTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.rd }, style]}>
      <PzText size={10} weight={600} tone="on" lineHeight={16} align="center">
        {String(count)}
      </PzText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

