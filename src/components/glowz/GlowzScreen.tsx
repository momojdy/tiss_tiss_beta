import React, { useCallback, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { useInsets } from '../styles/LayoutContext';

export type BottomKind = 'root' | 'bar' | 'none';

interface Props {
  /** Sticky header shown above the scrolling content. */
  header?: React.ReactNode;
  /** Sticky action bar pinned to the bottom. */
  bar?: React.ReactNode;
  /** Root screens leave room for the bottom navigation. */
  bottom?: BottomKind;
  scrollRef?: React.Ref<ScrollView>;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Content starts under the status bar (provider cover). */
  edgeToEdge?: boolean;
}

/**
 * Shared screen frame: sticky header with a hairline once scrolled, scrolling body,
 * optional pinned bar, safe-area padding and keyboard dismissal. Scroll position is kept
 * because screens stay mounted while they are in the stack.
 */
export function GlowzScreen({ header, bar, bottom = 'none', scrollRef, children, contentStyle, edgeToEdge }: Props) {
  const { c } = useGlowzTheme();
  const insets = useInsets();
  const [scrolled, setScrolled] = useState(false);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const s = e.nativeEvent.contentOffset.y > 8;
    setScrolled((prev) => (prev === s ? prev : s));
  }, []);

  const padBottom = bottom === 'root' ? 78 + insets.bottom : bar || bottom === 'bar' ? 92 + insets.bottom : 28 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {header ? (
        <View style={{ backgroundColor: c.bg, paddingTop: Math.max(12, insets.top), paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: scrolled ? c.line : 'transparent', zIndex: 20 }}>
          {header}
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingBottom: padBottom, paddingTop: !header && !edgeToEdge ? Math.max(12, insets.top) : 0 }, contentStyle]}
      >
        {children}
      </ScrollView>
      {bar ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 31 }}>{bar}</View>
      ) : null}
    </View>
  );
}
