import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import WalletHeader from '../components/wallet/WalletHeader';
import WalletBalance from '../components/wallet/WalletBalance';
import WalletPoints from '../components/wallet/WalletPoints';
import WalletRecentActivity from '../components/wallet/WalletRecentActivity';
import EarnMorePointsCard from '../components/wallet/EarnMorePointsCard';
import InviteFriendRow from '../components/wallet/InviteFriendRow';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MAGENTA = '#BF008E';
const NAV_MUTED = '#9A96A3';
const WANTISS_LOGO = 'https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/refs/heads/main/WantisslogoOuterless.PNG';
const MESSAGE_UNREAD_COUNT = 1;

function NavLabel({ children, active }: { children: string; active?: boolean }) {
  return <Text style={[styles.navLabel, active && styles.navLabelActive]}>{children}</Text>;
}

function MessageBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={styles.messageBadge}>
      <Text style={styles.messageBadgeText}>{label}</Text>
    </View>
  );
}

function BottomNav({ onHomePress, onMePress }: { onHomePress?: () => void; onMePress?: () => void }) {
  return (
    <View style={styles.navOuter}>
      <View style={styles.nav}>
        <Pressable onPress={onHomePress} style={styles.homeButton}>
          <View style={styles.homeCircle}>
            <Image source={{ uri: WANTISS_LOGO }} style={styles.homeLogo} resizeMode="contain" />
          </View>
        </Pressable>
        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="television-play" size={29} color={NAV_MUTED} />
          <NavLabel>Showcase</NavLabel>
        </Pressable>
        <Pressable style={styles.navButton}>
          <View style={styles.messageIconWrap}>
            <MaterialCommunityIcons name="message-text-outline" size={27} color={NAV_MUTED} />
            <MessageBadge count={MESSAGE_UNREAD_COUNT} />
          </View>
          <NavLabel>Messages</NavLabel>
        </Pressable>
        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="cart-outline" size={29} color={NAV_MUTED} />
          <NavLabel>Cart</NavLabel>
        </Pressable>
        <Pressable onPress={onMePress} style={styles.navButton}>
          <MaterialCommunityIcons name="emoticon-happy-outline" size={29} color={MAGENTA} />
          <NavLabel active>Me</NavLabel>
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
      <BottomNav onHomePress={onHomePress} onMePress={onMePress} />
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
  nav: {
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
  homeButton: {
    width: 64,
    height: 60,
    alignItems: 'center',
  },
  homeCircle: {
    marginTop: 2,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E8CFE0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  homeLogo: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  navButton: {
    width: 68,
    height: 46,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageIconWrap: {
    width: 30,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBadge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: MAGENTA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
  },
  navLabel: {
    paddingTop: 4,
    fontSize: 10.5,
    color: '#1F1E1E',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  navLabelActive: {
    color: MAGENTA,
  },
  content: {
    paddingBottom: 24,
  },
  inviteFriendSpacing: {
    paddingTop: 15,
  },
  earnMorePointsSpacing: {
    paddingTop: 8,
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
