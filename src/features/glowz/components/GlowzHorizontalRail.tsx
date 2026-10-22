import React from 'react';
import { ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useGutter } from '../styles/LayoutContext';

interface Props {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Horizontal scroller that bleeds to the screen edges but lines up with the page gutter.
 * Touches that start inside it scroll it, so it never conflicts with the left-edge back gesture.
 */
export function GlowzHorizontalRail({ children, gap = 12, style }: Props) {
  const g = useGutter();
  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={style}
      contentContainerStyle={{ gap, paddingLeft: g.left, paddingRight: g.right, paddingBottom: 4 }}
    >
      {children}
    </ScrollView>
  );
}