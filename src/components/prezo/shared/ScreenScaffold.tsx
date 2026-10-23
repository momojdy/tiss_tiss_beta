import React, { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrezoChrome } from '../../../features/prezo/PrezoChromeContext';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { BlurSurface } from './BlurSurface';
import { prezoLayout } from '../../../theme/prezoTheme';

interface ScreenScaffoldProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
}

export const ScreenScaffold = ({ children, footer, padded = true }: ScreenScaffoldProps) => {
  const { colors } = usePrezoTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayoutMode();
  const navigation = usePrezoNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const restored = useRef(false);
  const chrome = usePrezoChrome();
  const [footerHeight, setFooterHeight] = useState(0);
  const showFooter = Boolean(footer) && !isWide;
  const bottomInset = showFooter ? chrome.bottom + footerHeight : chrome.bottom;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      navigation.scrollOffsets.current[navigation.routeId] = event.nativeEvent.contentOffset.y;
    },
    [navigation.scrollOffsets, navigation.routeId],
  );

  const onContentSizeChange = useCallback(() => {
    if (restored.current) return;
    restored.current = true;
    if (!navigation.restoreScroll) return;
    const offset = navigation.scrollOffsets.current[navigation.routeId];
    if (offset) scrollRef.current?.scrollTo({ y: offset, animated: false });
  }, [navigation.restoreScroll, navigation.routeId, navigation.scrollOffsets]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={64}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={styles.scrollContent}
        scrollIndicatorInsets={{ top: chrome.top, bottom: bottomInset }}
      >
        <View
          style={[
            styles.content,
            padded ? { paddingHorizontal: prezoLayout.gutter } : null,
            { paddingTop: chrome.top + 8, paddingBottom: bottomInset + (showFooter ? 24 : 40) },
          ]}
        >
          {children}
        </View>
      </ScrollView>
      {showFooter ? (
        <BlurSurface
          opacity={0.92}
          onLayout={(event: LayoutChangeEvent) => setFooterHeight(event.nativeEvent.layout.height)}
          style={[
            styles.footer,
            {
              bottom: chrome.bottom,
              borderTopColor: colors.ln,
              paddingBottom: 10 + (chrome.bottom ? 0 : insets.bottom),
            },
          ]}
        >
          {footer}
        </BlurSurface>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    width: '100%',
    maxWidth: prezoLayout.maxContentWidth,
    alignSelf: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: prezoLayout.gutter,
    borderTopWidth: prezoLayout.hairline,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
});

