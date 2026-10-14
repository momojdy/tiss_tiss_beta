import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';
import { BRAND_ACCENT } from './stayzColors';
import { StayzTxt } from './stayzTxt';

interface Props {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}

export const StayzButton = ({ title, onPress, kind = 'primary', loading, disabled, icon, style, small }: Props) => {
  const { colors } = useStayzTheme();
  const bg = kind === 'primary' ? BRAND_ACCENT : kind === 'danger' ? colors.dangerSoft : kind === 'secondary' ? colors.card : 'transparent';
  const fg = kind === 'primary' ? colors.onBrand : kind === 'danger' ? colors.danger : colors.text;
  const border = kind === 'secondary' ? colors.line : 'transparent';
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [styles.btn, small && styles.small, { backgroundColor: bg, borderColor: border, opacity: off ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <StayzTxt v="h3" color={fg}>
            {title}
          </StayzTxt>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, shadowColor: '#8D3025', shadowOpacity: 0.16, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  small: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
