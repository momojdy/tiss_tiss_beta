import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useInterFonts, Inter_700Bold } from '@expo-google-fonts/inter';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const SAGE_TINT = '#DCE8D2';
const OLIVE = '#1A2517';
const BACKGROUND = '#F5F8F3';
const BADGE = '#C2148A';

type IconName = 'arrow-left' | 'bell-outline' | 'help-circle-outline';

function HeaderIconButton({ icon, onPress, badgeCount = 0, label }: {
  icon: IconName; onPress: () => void; badgeCount?: number; label: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.iconButton}>
      <View style={styles.iconStack}>
        <MaterialCommunityIcons name={icon} size={20} color={OLIVE} />
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={[styles.badgeText, interLoadedStyle]}>{badgeCount >= 100 ? '99+' : String(badgeCount)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const interLoadedStyle = { fontFamily: 'Inter_600SemiBold' as const };

export default function WalletHeader({ onBack, onNotificationsPress, onHelpPress }: {
  onBack: () => void; onNotificationsPress?: () => void; onHelpPress?: () => void;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [manropeLoaded] = useFonts({ Manrope_800ExtraBold });
  useInterFonts({ Inter_700Bold });

  useEffect(() => {
    let active = true;
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase.from('wallet_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('read', false);
        if (!error && active) setUnreadCount(count ?? 0);
      } catch {}
    };
    fetchUnreadCount();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.leftSide}>
          <HeaderIconButton icon="arrow-left" label="Back" onPress={onBack} />
          <Text style={styles.title}>Wallet</Text>
        </View>
        <View style={styles.rightSide}>
          <HeaderIconButton icon="bell-outline" label="Notifications" badgeCount={unreadCount} onPress={onNotificationsPress ?? (() => {})} />
          <HeaderIconButton icon="help-circle-outline" label="Help" onPress={onHelpPress ?? (() => {})} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { width: '100%', height: 100, backgroundColor: BACKGROUND, paddingHorizontal: 10, paddingBottom: 4, justifyContent: 'flex-end' },
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leftSide: { flexDirection: 'row', alignItems: 'center' },
  rightSide: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: SAGE_TINT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconStack: { position: 'relative', width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 12, fontSize: 19, fontWeight: '600', color: OLIVE, lineHeight: 19, transform: [{ translateY: 1 }] },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 15, minHeight: 15, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 8, backgroundColor: BADGE, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700', lineHeight: 8, textAlign: 'center' },
});
