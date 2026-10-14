import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';
import { StayzTxt } from './stayzTxt';

interface Props {
  label: string;
  on?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const StayzChip = ({ label, on, onPress, icon, disabled, style }: Props) => {
  const { colors } = useStayzTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={[styles.chip, { backgroundColor: on ? colors.brand : colors.chip, borderColor: on ? colors.brand : colors.line, opacity: disabled ? 0.4 : 1 }, style]}>
      {icon ? <Ionicons name={icon} size={15} color={on ? colors.onBrand : colors.text} /> : null}
      <StayzTxt v="small" bold color={on ? colors.onBrand : colors.text}>
        {label}
      </StayzTxt>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1 },
});
