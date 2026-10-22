import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import type { RootTab } from '../../navigation/glowz/GlowzNavigationTypes';
import { useInsets } from '../../styles/Glowz/LayoutContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { GlowzIcon } from './GlowzIcon';
import { GlowzText } from './GlowzText';

const TABS: { id: RootTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'explore', label: 'Explore', icon: 'explore' },
  { id: 'bookings', label: 'Bookings', icon: 'cal' },
  { id: 'favs', label: 'Favorites', icon: 'heart' },
  { id: 'me', label: 'Profile', icon: 'user' },
];

/** Five root destinations. Shown only on root screens. */
export function GlowzBottomNavigation() {
  const { c } = useGlowzTheme();
  const insets = useInsets();
  const nav = useGlowzNav();
  return (
    <View
      accessibilityRole="tablist"
      style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', paddingTop: 6, paddingBottom: 6 + insets.bottom, paddingLeft: Math.max(8, insets.left), paddingRight: Math.max(8, insets.right) }}
    >
      {TABS.map((t) => {
        const on = nav.tab === t.id;
        const color = on ? c.roseInk : c.muted;
        return (
          <Pressable
            key={t.id}
            onPress={() => nav.setTab(t.id)}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 7 }}
          >
            <GlowzIcon name={t.icon} size={22} color={color} strokeWidth={on ? 2.1 : 1.6} />
            <GlowzText size={11} weight={500} color={color}>{t.label}</GlowzText>
          </Pressable>
        );
      })}
    </View>
  );
}
