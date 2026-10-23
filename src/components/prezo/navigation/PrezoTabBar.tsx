import React from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { getActiveTab, primaryTabs } from '../../../lib/prezo/navigation';
import { prezoLayout } from '../../../theme/prezoTheme';
import { BlurSurface } from '../shared/BlurSurface';
import { Icon } from '../shared/Icon';
import { PzText } from '../shared/PzText';
import { CountBadge } from './CountBadge';

export const PrezoTabBar = ({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) => {
  const { colors } = usePrezoTheme();
  const insets = useSafeAreaInsets();
  const navigation = usePrezoNavigation();
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const active = getActiveTab(navigation.route);
  const offers = data.openWaitlistOfferCount(fmt.now);

  return (
    <BlurSurface
      opacity={0.92}
      onLayout={onLayout}
      style={[
        styles.bar,
        {
          borderTopColor: colors.ln,
          paddingBottom: 6 + insets.bottom,
        },
      ]}
    >
      {primaryTabs.map((tab) => {
        const on = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            onPress={() => navigation.navigate(tab.route)}
            style={styles.tab}
          >
            {on ? <View style={[styles.indicator, { backgroundColor: colors.rd }]} /> : null}
            <Icon name={tab.key} color={on ? colors.tx : colors.mu} />
            <View style={styles.labelWrap}>
              <PzText size={12} weight={500} tone={on ? 'tx' : 'mu'} lineHeight={18}>
                {tab.label}
              </PzText>
              {tab.key === 'waitlist' && offers ? (
                <CountBadge count={offers} style={styles.badge} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </BlurSurface>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: prezoLayout.hairline,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicator: {
    position: 'absolute',
    top: -7,
    left: '35%',
    right: '35%',
    height: 2,
  },
  labelWrap: {
    alignSelf: 'center',
  },
  badge: {
    position: 'absolute',
    left: '100%',
    marginLeft: 6,
    top: -29,
  },
});

