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
        <View style={styles.earnMoreRow}>
          <View style={styles.earnMoreIconWrap}>
            <MaterialCommunityIcons name="star-circle" size={40} color="#1A2517" />
          </View>
          <View style={styles.earnMoreColumn}>
            <Text style={styles.earnMoreTitle}>Earn More Points</Text>
            <Text style={styles.earnMoreDescription}>Complete activities and{'
'}get rewarded.</Text>
            <View style={styles.earnMoreButtonWrap}>
              <Pressable style={styles.earnMoreButton}>
                <Text style={styles.earnMoreButtonText}>Explore Now</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
        <WalletRecentActivity />
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
  earnMoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  earnMoreIconWrap: {
    marginLeft: 10,
    marginBottom: 80,
    paddingTop: 0,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnMoreColumn: {
    marginLeft: 8,
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
  },
  earnMoreTitle: {
    marginTop: 10,
    color: '#1A2517',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
  earnMoreDescription: {
    marginBottom: 10,
    color: '#6C7280',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
  earnMoreButtonWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  earnMoreButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 30,
    backgroundColor: '#1A2517',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'InterTight_400Regular',
    includeFontPadding: false,
    marginRight: 6,
  },
});
