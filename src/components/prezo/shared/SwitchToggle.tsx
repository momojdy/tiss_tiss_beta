import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { prezoLayout } from '../../../theme/prezoTheme';

interface SwitchToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export const SwitchToggle = ({ value, onChange, label }: SwitchToggleProps) => {
  const { colors } = usePrezoTheme();
  const position = useRef(new Animated.Value(value ? 23 : 3)).current;

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 23 : 3,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, position]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.rd : colors.s2,
          borderColor: value ? colors.rd : colors.ln,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.knob,
          { backgroundColor: value ? '#ffffff' : colors.mu, left: position },
        ]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 30,
    borderRadius: 99,
    borderWidth: prezoLayout.hairline,
  },
  knob: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});

