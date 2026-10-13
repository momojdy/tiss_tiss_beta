import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';

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

export const Row = ({ icon, label, value, sub, onPress, right, danger, chevron = true }: Props) => {
  const { colors } = useTheme();
  const body = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.brandSoft }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.brand} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt v="h3" color={danger ? colors.danger : undefined}>
          {label}
        </Txt>
        {sub ? (
          <Txt v="small" sub>
            {sub}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt sub v="small">
          {value}
        </Txt>
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
