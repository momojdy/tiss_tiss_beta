import React, { useState } from 'react';
import { StatusBar, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { PrezoChromeProvider } from '../../../features/prezo/PrezoChromeContext';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { PrezoRouteView } from '../../../features/prezo/PrezoRouteView';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { showsTabBar } from '../../../lib/prezo/navigation';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { PrezoHeader } from './PrezoHeader';
import { PrezoTabBar } from './PrezoTabBar';
import { ToastHost } from './ToastHost';

export const PrezoShell = () => {
  const { colors, mode } = usePrezoTheme();
  const navigation = usePrezoNavigation();
  const { isWide } = useLayoutMode();
  const tabBar = showsTabBar(navigation.route) && !isWide;

  const [headerHeight, setHeaderHeight] = useState(100);
  const [tabHeight, setTabHeight] = useState(0);
  // Route screens scroll inside the viewport below the fixed header, stripe, and bottom nav.
  const chrome = { top: 0, bottom: 0 };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <PrezoChromeProvider value={chrome}>
        <View
          style={[
            styles.body,
            { paddingTop: headerHeight, paddingBottom: tabBar ? tabHeight : 0 },
          ]}
        >
          <View style={[styles.stripe, { backgroundColor: colors.rd }]} />
          <View style={styles.routeContent}>
            <PrezoRouteView key={navigation.routeId} route={navigation.route} />
          </View>
        </View>
      </PrezoChromeProvider>
      <PrezoHeader
        onLayout={(event: LayoutChangeEvent) => setHeaderHeight(event.nativeEvent.layout.height)}
      />
      {tabBar ? (
        <PrezoTabBar
          onLayout={(event: LayoutChangeEvent) => setTabHeight(event.nativeEvent.layout.height)}
        />
      ) : null}
      <ToastHost bottomOffset={tabBar ? 150 : 96} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  stripe: {
    height: 20,
    width: '100%',
    flexShrink: 0,
  },
  routeContent: {
    flex: 1,
    minHeight: 0,
    marginTop: 15,
  },
});
