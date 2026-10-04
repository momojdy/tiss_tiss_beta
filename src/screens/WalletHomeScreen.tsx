import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import WalletHeader from '../components/wallet/WalletHeader';
import WalletBalance from '../components/wallet/WalletBalance';
import WalletPoints from '../components/wallet/WalletPoints';
import WalletRecentActivity from '../components/wallet/WalletRecentActivity';
import EarnMorePointsCard from '../components/wallet/EarnMorePointsCard';
import InviteFriendRow from '../components/wallet/InviteFriendRow';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';

const NAV_DARK = '#14181B';
const MUTED = '#5F6B5A';
const NAV_GREEN = '#81C56C';

function WalletNavLabel({ children }: { children: string }) {
  return <Text style={styles.walletNavLabel}>{children}</Text>;
}

function WalletNavIndicator() {
  return <View style={styles.walletNavIndicator} />;
}

function WalletBottomNav({ onHomePress, onMePress }: { onHomePress?: () => void; onMePress?: () => void }) {
  return (
    <View style={styles.navOuter}>
      <View style={styles.walletNav}>
        <Pressable onPress={onHomePress} style={styles.walletNavItem}>
          <MaterialCommunityIcons name="home-outline" size={29} color={NAV_DARK} />
          <WalletNavLabel>Home</WalletNavLabel>
          <WalletNavIndicator />
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="account-group-outline" size={29} color={MUTED} />
          <Text style={styles.walletNavLabelMuted}>Contacts</Text>
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialCommunityIcons name="qrcode-scan" size={48} color={NAV_GREEN} />
        </Pressable>
        <Pressable style={styles.walletNavItem}>
          <MaterialIcons name="query-stats" size={29} color={MUTED} />
          <Text style={styles.walletNavLabelMuted}>Insights</Text>
        </Pressable>
        <Pressable onPress={onMePress} style={styles.walletNavItem}>
          <MaterialCommunityIcons name="cog-outline" size={29} color={MUTED} />
          <Text style={styles.walletNavLabelMuted}>Settings</Text>
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
  onRecentActivityPress?: () => void;
  onHelpPress?: () => void;
};

export default function WalletHomeScreen({
  onBack,
  onHomePress,
  onMePress,
  onNotificationsPress,
  onHelpPress,
  onRecentActivityPress,
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
                <MaterialCommunityIcons name={action.icon} size={18} color="#1A2517" />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
        <WalletRecentActivity onSeeAll={onRecentActivityPress} />
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
    paddingHorizontal: 15,
  },
  walletNav: {
    height: 65,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
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
  walletNavIndicator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: NAV_GREEN,
    marginTop: 3,
  },
  walletNavLabel: {
    paddingTop: 4,
    fontSize: 10.5,
    lineHeight: 13,
    fontFamily: 'Inter_500Medium',
    color: NAV_DARK,
    textAlign: 'center',
  },
  walletNavLabelMuted: {
    paddingTop: 4,
    fontSize: 10.5,
    lineHeight: 13,
    fontFamily: 'Inter_400Regular',
    color: '#5F6B5A',
    textAlign: 'center',
  },
  actionsRow: {
    paddingTop: 20,
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
    marginTop: 6,
    color: '#1A2517',
    fontSize: 13,
    lineHeight: 13,
    fontFamily: 'Inter_500Medium',
    includeFontPadding: false,
    width: 72,
    textAlign: 'center',
  },
  content: {
    paddingBottom: 105,
  },
  earnMorePointsSpacing: {
    paddingTop: 8,
  },
  inviteFriendSpacing: {
    paddingTop: 15,
  },
});
