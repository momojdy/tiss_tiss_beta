import React from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { usePrezoData } from '../../../features/prezo/PrezoDataContext';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { getActiveTab, primaryTabs } from '../../../lib/prezo/navigation';
import { BlurSurface } from '../shared/BlurSurface';
import { Icon } from '../shared/Icon';
import { PzText } from '../shared/PzText';
import { CountBadge } from './CountBadge';

export const PrezoTabBar = ({ onLayout }: { onLayout: (event: LayoutChangeEvent) => void }) => {
  const { colors, mode } = usePrezoTheme();
  const navigation = usePrezoNavigation();
  const data = usePrezoData();
  const fmt = usePrezoFormat();
  const active = getActiveTab(navigation.route);
  const offers = data.openWaitlistOfferCount(fmt.now);

  return (
    <View style={styles.navOuter}>
      <BlurSurface
        opacity={0.88}
        onLayout={onLayout}
        style={[
          styles.bar,
          {
            borderColor: mode === 'dark' ? colors.ln : 'rgba(255,255,255,0.55)',
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
              <Icon name={tab.key} size={24} color={on ? colors.tx : colors.mu} />
              <View style={styles.labelWrap}>
                <PzText size={10.5} weight={500} tone={on ? 'tx' : 'mu'} lineHeight={13}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  navOuter: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    height: 65,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicator: {
    position: 'absolute',
    top: -1,
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
