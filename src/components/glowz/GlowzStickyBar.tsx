import React from 'react';
import { View } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { useGutter, useInsets } from '../styles/LayoutContext';

/** Bottom action bar: price on the left, primary action on the right. */
export function GlowzStickyBar({ children }: { children: React.ReactNode }) {
  const { c } = useGlowzTheme();
  const insets = useInsets();
  const g = useGutter();
  return (
    <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12, paddingBottom: 12 + insets.bottom, paddingLeft: g.left, paddingRight: g.right, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {children}
    </View>
  );
}
