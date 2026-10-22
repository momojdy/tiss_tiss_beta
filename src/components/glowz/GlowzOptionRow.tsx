import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzIcon } from './GlowzIcon';

interface Props {
  selected?: boolean;
  /** radio (single choice), check (multi choice) or none (plain). */
  control?: 'radio' | 'check' | 'none';
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Selectable row used for services, professionals, payment, location and sheet choices. */
export function GlowzOptionRow({ selected, control = 'radio', disabled, onPress, children, accessibilityLabel, style }: Props) {
  const { c } = useGlowzTheme();
  const ctl =
    control === 'radio' ? (
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? c.roseInk : c.mocha, alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.roseInk }} /> : null}
      </View>
    ) : control === 'check' ? (
      <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: selected ? c.roseInk : c.mocha, backgroundColor: selected ? c.roseInk : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <GlowzIcon name="check" size={14} color={c.surface} strokeWidth={2.4} /> : null}
      </View>
    ) : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={control === 'check' ? 'checkbox' : control === 'radio' ? 'radio' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!selected, checked: control === 'check' ? !!selected : undefined, disabled: !!disabled }}
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1,
          borderColor: selected ? c.accent : c.line, backgroundColor: selected ? c.tint : c.surface, opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {ctl}
      {children}
    </Pressable>
  );
}
