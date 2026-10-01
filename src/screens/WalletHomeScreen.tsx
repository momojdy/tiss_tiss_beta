import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import WalletHeader from '../components/wallet/WalletHeader';
import WalletBalance from '../components/wallet/WalletBalance';
import WalletPoints from '../components/wallet/WalletPoints';
import WalletRecentActivity from '../components/wallet/WalletRecentActivity';
import EarnMorePointsCard from '../components/wallet/EarnMorePointsCard';
import InviteFriendRow from '../components/wallet/InviteFriendRow';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const NAV_DARK = '#14181B';
const NAV_GREEN = '#81C56C';

function WalletNavLabel({ children }: { children: string }) {
  return <Text style={styles.walletNavLabel}>{children}</Text>;
}

function WalletBottomNav({ onHomePress, onMePress }: { onHomePress?: () => void; onMePress?: () => void }) {
  return (
    <View style={styles.navOuter}>
      <View style={styles.walletNav}>
        <Pressable onPress={onHomePress} style={styles.walletNavItem}>
          <Ionicons name="home-outline" size={29} color={NAV_DARK} />
          <WalletNavLabel>Home</WalletNavLabel>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <Ionicons name="people-outline" size={29} color={NAV_DARK} />
          <WalletNavLabel>Contacts</WalletNavLabel>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="qrcode-scan" size={48} color={NAV_GREEN} />
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="chart-line" size={29} color={NAV_DARK} />
          <WalletNavLabel>Insights</WalletNavLabel>
        </Pressable>
        <Pressable onPress={onMePress} style={styles.walletNavItem}>
          <Ionicons name="settings-outline" size={29} color={NAV_DARK} />
          <WalletNavLabel>Settings</WalletNavLabel>
        </Pressable>
      </View>
    </View>
  );
}
type Props = {
  onBack?: () => void;
  onHomePress?: () => void;
  onMePress?: () => void;
  onNotificationsPress?: () => void;
  onHelpPress?: () => void;
};

export default function WalletHomeScreen({
  onBack,
  onHomePress,
  onMePress,
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
        <WalletRecentActivity />
        <View style={styles.earnMorePointsSpacing}>
          <EarnMorePointsCard />
        </View>
        <View style={styles.inviteFriendSpacing}>
          <InviteFriendRow />
        </View>
      </ScrollView>
      <WalletBottomNav onHomePress={onHomePress} onMePress={onMePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F5F8F3',
  },
  navOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 2,
  },
  walletNav: {
    height: 70,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  walletNavItem: {
    width: 70,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletNavLabel: {
    paddingTop: 4,
    fontSize: 10.5,
    lineHeight: 13,
    fontFamily: 'Inter_500Medium',
    color: NAV_DARK,
    textAlign: 'center',
  },
  actionsRow: {
    paddingTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 26,
    paddingHorizontal: 13,
  },
  actionItem: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    width: 72,
    textAlign: 'center',
  },
});
