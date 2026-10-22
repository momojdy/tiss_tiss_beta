import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzText } from './GlowzText';

interface Props<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

/** Light/Dark and List/Map/Inspiration switch. */
export function GlowzSegmented<T extends string>({ options, value, onChange }: Props<T>) {
  const { c } = useGlowzTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.tint, borderRadius: 12, padding: 3, gap: 2 }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? c.surface : 'transparent',
              ...(on ? { shadowColor: '#3C281E', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
            }}
          >
            <GlowzText size={13} weight={on ? 600 : 500} color={on ? c.ink : c.tintInk}>{o.label}</GlowzText>
          </Pressable>
        );
      })}
    </View>
  );
}
