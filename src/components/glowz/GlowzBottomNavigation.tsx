import React from 'react';
import { Pressable, View } from 'react-native';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import type { RootTab } from '../../navigation/glowz/GlowzNavigationTypes';
import { GlowzIcon } from './GlowzIcon';
import { GlowzText } from './GlowzText';

const TABS: { id: RootTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'explore', label: 'Explore', icon: 'explore' },
  { id: 'bookings', label: 'Bookings', icon: 'cal' },
  { id: 'favs', label: 'Favorites', icon: 'heart' },
  { id: 'me', label: 'Profile', icon: 'user' },
];

/** Floating five-tab bar styled to match the Wallet home navigation. */
export function GlowzBottomNavigation() {
  const nav = useGlowzNav();
  const { c, mode } = useGlowzTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ paddingHorizontal: 14, paddingBottom: 18 }}
    >
      <View
        style={{
          height: 65,
          borderRadius: 18,
          backgroundColor: mode === 'dark' ? 'rgba(215,154,155,0.58)' : 'rgba(201,130,131,0.76)',
          borderWidth: 1,
          borderColor: mode === 'dark' ? 'rgba(215,154,155,0.42)' : 'rgba(201,130,131,0.38)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          elevation: 5,
          shadowColor: '#000',
          shadowOpacity: 0.13,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        {TABS.map((t) => {
          const on = nav.tab === t.id;
          const color = on ? c.ink : c.muted;
          return (
            <Pressable
              key={t.id}
              onPress={() => nav.setTab(t.id)}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
              style={{ flex: 1, minWidth: 0, height: 50, alignItems: 'center', justifyContent: 'center' }}
            >
              <GlowzIcon name={t.icon} size={24} color={color} strokeWidth={on ? 2.1 : 1.6} />
              <GlowzText size={10.5} weight={on ? 500 : 400} color={color} style={{ paddingTop: 4, lineHeight: 13 }}>
                {t.label}
              </GlowzText>
              {on ? <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: c.sage, marginTop: 3 }} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
