import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useInterFonts, Inter_700Bold } from '@expo-google-fonts/inter';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../../lib/supabase';

const SAGE_TINT = '#DCE8D2';
const OLIVE = '#1A2517';
const BACKGROUND = '#F5F8F3';
const BADGE = '#C2148A';

const ICONS = {
  back: 'M19 11H7.83l4.88-4.88c.39-.39 1.03-.39 1.42 0 .39.39.39 1.03 0 1.42L8.83 12l4.42 4.42c.39.39.39 1.03 0 1.42-.39.39-1.03.39-1.42 0L5.41 12.7c-.39-.39-.39-1.03 0-1.42l6.59-6.59c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41L7.83 11H19c.55 0 1 .45 1 1s-.45 1-1 1H7.83l4.88 4.88c.39.39.39 1.03 0 1.42-.39.39-1.03.39-1.42 0l-6.59-6.59c-.39-.39-.39-1.03 0-1.41l6.59-6.59',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-1.71 1.71c-.63.63-.19 1.71.7 1.71h14.01c.89 0 1.34-1.08.71-1.71L18 16zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z',
  help: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25-3 2.5-3 5 0-2.21-1.79-4-4-4z',
};

type IconName = keyof typeof ICONS;

function HeaderIconButton({
  icon,
  onPress,
  badgeCount = 0,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  badgeCount?: number;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.iconButton}
    >
      <View style={styles.iconStack}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d={ICONS[icon]} fill={OLIVE} />
        </Svg>

        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount >= 100 ? '99+' : String(badgeCount)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function WalletHeader({
  onBack,
  onNotificationsPress,
  onHelpPress,
}: {
  onBack: () => void;
  onNotificationsPress?: () => void;
  onHelpPress?: () => void;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [manropeLoaded] = useFonts({ Manrope_800ExtraBold });
  const [interLoaded] = useInterFonts({ Inter_700Bold });

  useEffect(() => {
    let active = true;

    const fetchUnreadCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId || !active) return;

        const { count, error } = await supabase
          .from('wallet_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false);

        if (error || !active) return;
        setUnreadCount(count ?? 0);
      } catch {
        // Keep the badge hidden if the notification query fails.
      }
    };

    fetchUnreadCount();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.leftSide}>
        <HeaderIconButton icon="back" label="Back" onPress={onBack} />

        <Text
          style={[
            styles.title,
            manropeLoaded && { fontFamily: 'Manrope_800ExtraBold' },
          ]}
        >
          Wallet
        </Text>
      </View>

      <View style={styles.rightSide}>
        <HeaderIconButton
          icon="bell"
          label="Notifications"
          badgeCount={unreadCount}
          onPress={onNotificationsPress ?? (() => {})}
        />

        <HeaderIconButton
          icon="help"
          label="Help"
          onPress={onHelpPress ?? (() => {})}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 60,
    backgroundColor: BACKGROUND,
    paddingTop: 8,
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SAGE_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconStack: {
    position: 'relative',
    width: 20,
    height: 20,
  },
  title: {
    marginLeft: 12,
    fontSize: 19,
    fontWeight: '800',
    color: OLIVE,
    lineHeight: 19,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 15,
    minHeight: 15,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 8,
    textAlign: 'center',
    ...(interLoadedPlaceholder()),
  },
});

function interLoadedPlaceholder() {
  return {};
}
