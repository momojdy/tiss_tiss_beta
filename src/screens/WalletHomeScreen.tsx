import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import WalletHeader from '../components/wallet/WalletHeader';
import WalletBalance from '../components/wallet/WalletBalance';
import WalletPoints from '../components/wallet/WalletPoints';
import WalletRecentActivity from '../components/wallet/WalletRecentActivity';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  onBack?: () => void;
  onNotificationsPress?: () => void;
  onHelpPress?: () => void;
};

export default function WalletHomeScreen({
  onBack,
  onNotificationsPress,
  onHelpPress,
}: Props) {
  return (
    <View style={styles.page}>
      <WalletHeader
        onBack={onBack ?? (() => {})}
        onNotificationsPress={onNotificationsPress}
        onHelpPress={onHelpPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <WalletBalance />
        <WalletPoints />
        <WalletRecentActivity />
        <View style={styles.actionsRow}>
          {[
            { label: 'Top up', icon: 'arrow-collapse-up' as const },
            { label: 'Send', icon: 'send-outline' as const },
            { label: 'Request', icon: 'inbox-arrow-down-outline' as const },
            { label: 'Withdraw', icon: 'arrow-collapse-down' as const },
            { label: 'Utility', icon: 'water-outline' as const },
          ].map(action => (
            <Pressable key={action.label} style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <MaterialCommunityIcons name={action.icon} size={20} color="#1A2517" />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F5F8F3',
  },
  content: {
    paddingBottom: 24,
  },
  actionsRow: {
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 13,
    paddingHorizontal: 13,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#DCE8D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    marginTop: 4,
    color: '#1A2517',
    fontSize: 13,
    lineHeight: 13,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
});
