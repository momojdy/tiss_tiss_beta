import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Txt } from './Txt';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export const Stepper = ({ value, min = 0, max = 99, onChange }: Props) => {
  const { colors } = useTheme();
  const btn = (name: 'remove' | 'add', next: number, off: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={name === 'add' ? 'Increase' : 'Decrease'} disabled={off} onPress={() => onChange(next)} style={[styles.btn, { borderColor: colors.line, opacity: off ? 0.35 : 1 }]}>
      <Ionicons name={name} size={18} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {btn('remove', value - 1, value <= min)}
      <Txt v="h3" style={styles.val} center>
        {value}
      </Txt>
      {btn('add', value + 1, value >= max)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  val: { minWidth: 36 },
});
