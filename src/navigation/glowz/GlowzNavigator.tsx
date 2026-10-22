import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, StatusBar, StyleSheet, View } from 'react-native';
import { GlowzBottomNavigation } from '../components/GlowzBottomNavigation';
import { GlowzErrorBoundary } from '../components/GlowzErrorBoundary';
import { GlowzSheetHost } from '../components/sheets/GlowzSheetHost';
import { useGlowzSheet } from '../hooks/GlowzSheetContext';
import { useGlowzState } from '../hooks/GlowzStore';
import { usePersistence } from '../hooks/usePersistence';
import { useGlowzTheme } from '../styles/ThemeContext';
import { size } from '../styles/tokens';
import { useGlowzNav } from './GlowzNavigationContext';
import { ROOT_TABS, RootTab } from './GlowzNavigationTypes';
import { RootTabView, RouteView } from './GlowzRouteView';
import { GlowzSwipeBack } from './GlowzSwipeBack';

const hidden = { opacity: 0 } as const;

/**
 * Layers: root tabs (kept mounted once visited so scroll and state survive), then every secondary screen
 * on the stack, then the bottom navigation (root only) and sheets. Hidden layers stay mounted and untouchable.
 */
export function GlowzNavigator() {
  const nav = useGlowzNav();
  const { c, mode } = useGlowzTheme();
  const { sheet } = useGlowzSheet();
  const state = useGlowzState();
  usePersistence();

  const [visited, setVisited] = useState<RootTab[]>([nav.tab]);
  useEffect(() => { setVisited((v) => (v.includes(nav.tab) ? v : [...v, nav.tab])); }, [nav.tab]);

  const back = nav.back;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => back());
    return () => sub.remove();
  }, [back]);

  const translateX = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);
  const onBack = useCallback(() => { nav.back(); }, [nav]);

  const stackLen = nav.stack.length;
  const rootActive = stackLen === 0;
  const swipeOn = stackLen > 0 && !sheet && !(state.bk && state.bk.processing);

  return (
    <View style={{ flex: 1, backgroundColor: mode === 'dark' ? '#120E0D' : '#EADDD2' }}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.bg} translucent />
      <View style={{ flex: 1, width: '100%', maxWidth: size.contentMaxWidth, alignSelf: 'center', backgroundColor: c.bg, overflow: 'hidden' }}>
        {ROOT_TABS.filter((t) => visited.includes(t)).map((t) => {
          const showing = rootActive && t === nav.tab;
          const peek = dragging && stackLen === 1 && t === nav.tab;
          return (
            <View
              key={t}
              pointerEvents={showing ? 'auto' : 'none'}
              importantForAccessibility={showing ? 'auto' : 'no-hide-descendants'}
              accessibilityElementsHidden={!showing}
              style={[StyleSheet.absoluteFill, showing || peek ? null : hidden]}
            >
              <GlowzErrorBoundary onHome={() => nav.goRoot('home')}><RootTabView tab={t} /></GlowzErrorBoundary>
            </View>
          );
        })}

        {nav.stack.map((route, i) => {
          const top = i === stackLen - 1;
          const peek = dragging && i === stackLen - 2;
          const inner = (
            <GlowzErrorBoundary onHome={() => nav.goRoot('home')}>
              <RouteView route={route} />
            </GlowzErrorBoundary>
          );
          return (
            <Animated.View
              key={`${i}:${route.name}`}
              pointerEvents={top ? 'auto' : 'none'}
              importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
              accessibilityElementsHidden={!top}
              style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }, top ? { transform: [{ translateX }] } : peek ? null : hidden]}
            >
              {inner}
            </Animated.View>
          );
        })}

        {rootActive ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <GlowzBottomNavigation />
          </View>
        ) : null}

        <GlowzSwipeBack enabled={swipeOn} translateX={translateX} onDragChange={setDragging} onBack={onBack} />
      </View>
      <GlowzSheetHost />
    </View>
  );
}
