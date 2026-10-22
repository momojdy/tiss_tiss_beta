import React from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { getActiveTab, getRouteTitle, isRootRoute, primaryTabs } from '../../../lib/prezo/navigation';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { prezoLayout } from '../../../theme/prezoTheme';
import { BlurSurface } from '../shared/BlurSurface';
import { Icon } from '../shared/Icon';
import { PzText } from '../shared/PzText';
import { CountBadge } from './CountBadge';

export const PrezoHeader = ({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) => {
  const { colors } = usePrezoTheme();
  const insets = useSafeAreaInsets();
  const navigation = usePrezoNavigation();
  const data = usePrezoData();
  const { isWide } = useLayoutMode();
  const sub = !isRootRoute(navigation.route);
  const activeTab = getActiveTab(navigation.route);
  const unread = data.unreadAlertCount;
  const showLogo = !sub || isWide;

  return (
    <BlurSurface
      opacity={0.88}
      onLayout={onLayout}
      style={[
        styles.header,
        {
          borderBottomColor: colors.ln,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.inner}>
        {sub ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={navigation.back}
            style={styles.iconButton}
          >
            <Icon name="back" color={colors.tx} />
          </Pressable>
        ) : null}
        {showLogo ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Prezo home"
            onPress={() => navigation.navigate({ name: 'home' })}
            style={styles.logo}
          >
            <View style={[styles.logoDot, { backgroundColor: colors.rd, shadowColor: colors.rd }]} />
            <PzText display={800} size={20} lineHeight={21}>
              Prezo{' '}
              <PzText display={500} size={20} tone="mu" lineHeight={21}>
                by Wantiss
              </PzText>
            </PzText>
          </Pressable>
        ) : null}
        {!isWide ? (
          <PzText
            display={700}
            size={18}
            numberOfLines={1}
            style={styles.title}
            accessibilityRole="header"
          >
            {sub ? getRouteTitle(navigation.route) : ''}
          </PzText>
        ) : (
          <View style={styles.nav}>
            {primaryTabs.map((tab) => {
              const on = tab.key === activeTab;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="link"
                  accessibilityState={{ selected: on }}
                  onPress={() => navigation.navigate(tab.route)}
                  style={[styles.navLink, on ? { backgroundColor: colors.s2 } : null]}
                >
                  <PzText size={15} weight={500} tone={on ? 'tx' : 'mu'}>
                    {tab.label}
                  </PzText>
                </Pressable>
              );
            })}
          </View>
        )}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={unread ? `Alerts, ${unread} unread` : 'Alerts'}
          onPress={() => navigation.navigate({ name: 'alerts' })}
          style={styles.iconButton}
        >
          <Icon name="bell" color={colors.tx} />
          {unread ? <CountBadge count={unread} style={styles.bellBadge} /> : null}
        </Pressable>
      </View>
    </BlurSurface>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: prezoLayout.hairline,
  },
  inner: {
    height: prezoLayout.headerHeight,
    width: '100%',
    maxWidth: prezoLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: prezoLayout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 1,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  nav: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
  },
});

