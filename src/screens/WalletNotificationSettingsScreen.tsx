import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const BACKGROUND = '#F5F8F3';
const TEXT = '#1A2517';
const MUTED = '#5F6B5A';
const LINE = '#D3DECB';
const TINT = '#DCE8D2';
const ART = '#8FAF84';

type Props = { onBack?: () => void };

type Preferences = {
  channel: 'push' | 'email';
  security: boolean;
  transactions: boolean;
  walletStatus: boolean;
  paymentMethods: boolean;
  rewards: boolean;
  support: boolean;
};

const DEFAULTS: Preferences = {
  channel: 'push',
  security: true,
  transactions: true,
  walletStatus: true,
  paymentMethods: true,
  rewards: true,
  support: true,
};

function SettingRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#C9D4C2', true: ART }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#C9D4C2"
      />
    </View>
  );
}

export default function WalletNotificationSettingsScreen({ onBack }: Props) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const stored = data.user?.user_metadata?.wallet_notification_preferences;
      if (!mounted || !stored || typeof stored !== 'object') return;

      setPreferences({
        ...DEFAULTS,
        ...stored,
        channel: stored.channel === 'email' ? 'email' : 'push',
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const updatePreferences = async (next: Preferences) => {
    setPreferences(next);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { wallet_notification_preferences: next },
    });
    setSaving(false);

    if (error) {
      console.error('Notification preference update failed:', error);
    }
  };

  const setChannel = (channel: Preferences['channel']) => {
    updatePreferences({ ...preferences, channel });
  };

  const setToggle = (key: keyof Omit<Preferences, 'channel'>, value: boolean) => {
    updatePreferences({ ...preferences, [key]: value });
  };

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8} accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={20} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <View style={styles.strip} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.channelControl}>
          <Pressable
            onPress={() => setChannel('push')}
            style={[styles.channelOption, preferences.channel === 'push' && styles.channelOptionSelected]}
          >
            <Text style={[styles.channelText, preferences.channel === 'push' && styles.channelTextSelected]}>
              Push notifications
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setChannel('email')}
            style={[styles.channelOption, preferences.channel === 'email' && styles.channelOptionSelected]}
          >
            <Text style={[styles.channelText, preferences.channel === 'email' && styles.channelTextSelected]}>
              Email
            </Text>
          </Pressable>
        </View>

        <View style={styles.rows}>
          <SettingRow label="Security Alerts" value={preferences.security} onValueChange={value => setToggle('security', value)} />
          <SettingRow label="Transactions" value={preferences.transactions} onValueChange={value => setToggle('transactions', value)} />
          <SettingRow label="Wallet Status Updates" value={preferences.walletStatus} onValueChange={value => setToggle('walletStatus', value)} />
          <SettingRow label="Payment Method Updates" value={preferences.paymentMethods} onValueChange={value => setToggle('paymentMethods', value)} />
          <SettingRow label="Rewards & Points" value={preferences.rewards} onValueChange={value => setToggle('rewards', value)} />
          <SettingRow label="Support & Feedback" value={preferences.support} onValueChange={value => setToggle('support', value)} />
        </View>

        {saving && <Text style={styles.saving}>Saving…</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    height: 100,
    paddingHorizontal: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: BACKGROUND,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 12,
    paddingBottom: 1,
    color: TEXT,
    fontSize: 19,
    lineHeight: 23,
    fontFamily: 'Inter_600SemiBold',
    transform: [{ translateY: -4.5 }],
  },
  strip: { height: 20, backgroundColor: '#E6EDE1' },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  channelControl: {
    height: 50,
    padding: 4,
    flexDirection: 'row',
    backgroundColor: '#E0E3E7',
    borderRadius: 12,
  },
  channelOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  channelOptionSelected: { backgroundColor: '#A7DE96' },
  channelText: {
    color: MUTED,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  channelTextSelected: { color: TEXT },
  rows: { marginTop: 18 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  rowLabel: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  saving: {
    marginTop: 12,
    color: MUTED,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
