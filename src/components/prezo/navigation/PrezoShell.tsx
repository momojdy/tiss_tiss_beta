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

  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabHeight, setTabHeight] = useState(0);
  // Keep the route viewport between the fixed header and tab bar. The scaffold
  // should scroll inside this viewport rather than underneath the chrome.
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
          <PrezoRouteView key={navigation.routeId} route={navigation.route} />
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
});

