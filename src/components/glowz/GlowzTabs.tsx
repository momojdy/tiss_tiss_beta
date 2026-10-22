import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzText } from './GlowzText';

interface Props<T extends string> {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

/** Underlined text tabs (Bookings, Favorites, Provider). */
export function GlowzTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const { c } = useGlowzTheme();
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 22 }} accessibilityRole="tablist">
        {tabs.map((t) => {
          const on = t.id === value;
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: on ? c.accent : 'transparent', marginBottom: -1 }}
            >
              <GlowzText weight={on ? 600 : 500} color={on ? c.ink : c.muted}>{t.label}</GlowzText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
