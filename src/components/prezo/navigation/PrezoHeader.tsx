import React from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { getActiveTab, getRouteTitle, primaryTabs } from '../../../lib/prezo/navigation';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { BlurSurface } from '../shared/BlurSurface';
import { Icon } from '../shared/Icon';
import { PzText } from '../shared/PzText';
import { CountBadge } from './CountBadge';

export const PrezoHeader = ({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) => {
  const { colors, mode } = usePrezoTheme();
  const navigation = usePrezoNavigation();
  const data = usePrezoData();
  const { isWide } = useLayoutMode();
  const activeTab = getActiveTab(navigation.route);
  const unread = data.unreadAlertCount;
  const isHome = navigation.route.name === 'home';
  const title = getRouteTitle(navigation.route);

  return (
    <BlurSurface
      opacity={mode === 'dark' ? 0.94 : 0.88}
      onLayout={onLayout}
      style={[
        styles.header,
        {
          borderBottomColor: colors.ln,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <View style={styles.inner}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isHome ? 'Exit Prezo' : 'Go back'}
          onPress={navigation.back}
          style={styles.iconButton}
        >
          <Icon name="back" size={24} color={colors.tx} />
        </Pressable>

        {isHome ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Prezo home"
            onPress={() => navigation.navigate({ name: 'home' })}
            style={styles.logo}
          >
            <View style={[styles.logoDot, { backgroundColor: colors.rd, shadowColor: colors.rd }]} />
            <PzText display={800} size={20} lineHeight={21}>
              Prezo
            </PzText>
          </Pressable>
        ) : (
          <PzText
            display={700}
            size={19}
            numberOfLines={1}
            style={styles.title}
            accessibilityRole="header"
          >
            {title || 'Prezo'}
          </PzText>
        )}

        {!isWide ? (
          <View style={styles.rightSpacer}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={unread ? `Alerts, ${unread} unread` : 'Alerts'}
              onPress={() => navigation.navigate({ name: 'alerts' })}
              style={styles.iconButton}
            >
              <Icon name="bell" size={24} color={colors.tx} />
              {unread ? <CountBadge count={unread} style={styles.bellBadge} /> : null}
            </Pressable>
          </View>
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
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={unread ? `Alerts, ${unread} unread` : 'Alerts'}
              onPress={() => navigation.navigate({ name: 'alerts' })}
              style={styles.iconButton}
            >
              <Icon name="bell" size={24} color={colors.tx} />
              {unread ? <CountBadge count={unread} style={styles.bellBadge} /> : null}
            </Pressable>
          </View>
        )}
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
    height: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
    zIndex: 10,
    elevation: 10,
  },
  inner: {
    height: 40,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logo: {
    flex: 1,
    minWidth: 0,
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
    lineHeight: 23,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  rightSpacer: {
    alignItems: 'flex-end',
  },
  nav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    top: 0,
    right: 0,
  },
});
