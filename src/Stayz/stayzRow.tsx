import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';
import { StayzTxt } from './stayzTxt';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  sub?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  chevron?: boolean;
}

export const StayzRow = ({ icon, label, value, sub, onPress, right, danger, chevron = true }: Props) => {
  const { colors } = useStayzTheme();
  const body = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.brandSoft }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.brand} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <StayzTxt v="h3" color={danger ? colors.danger : undefined}>
          {label}
        </StayzTxt>
        {sub ? (
          <StayzTxt v="small" sub>
            {sub}
          </StayzTxt>
        ) : null}
      </View>
      {value ? (
        <StayzTxt sub v="small">
          {value}
        </StayzTxt>
      ) : null}
      {right}
      {onPress && chevron && !right ? <Ionicons name="chevron-forward" size={18} color={colors.sub} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
