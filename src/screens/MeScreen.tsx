import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';

const MAGENTA = '#B8107F';
const INK = '#1E1B3A';
const MUTED = '#73728A';

const WANTISS_LOGO =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';

const DEFAULT_AVATAR =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainDefaultAvatar.PNG';

type Props = {
  onHomePress?: () => void;
  onAvatarPress?: () => void;
  onNamePress?: () => void;
  onQRPress?: () => void;
  onMembershipPress?: () => void;
  onMemberCenterPress?: () => void;
  onAddressPress?: () => void;
  onWalletPress?: () => void;
  onSettingsPress?: () => void;
};

type Profile = {
  full_name: string | null;
  role: string | null;
};

function NavLabel({ children }: { children: string }) {
  return <Text style={styles.navLabel}>{children}</Text>;
}

function BottomNav({ onHomePress }: Pick<Props, 'onHomePress'>) {
  return (
    <View style={styles.navOuter}>
      <View style={styles.nav}>
        <Pressable
          onPress={onHomePress}
          style={styles.homeButton}
          accessibilityRole="button"
          accessibilityLabel="Home"
        >
          <View style={styles.homeCircle}>
            <Image
              source={{ uri: WANTISS_LOGO }}
              style={styles.homeLogo}
              resizeMode="contain"
            />
          </View>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons
            name="television-play"
            size={32}
            color={MAGENTA}
          />
          <NavLabel>Showcase</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons
            name="message-text-outline"
            size={30}
            color={MAGENTA}
          />
          <NavLabel>Messages</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons
            name="cart-arrow-right"
            size={32}
            color={MAGENTA}
          />
          <NavLabel>Cart</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons
            name="emoticon-happy-outline"
            size={32}
            color={MAGENTA}
          />
          <NavLabel>Me</NavLabel>
        </Pressable>
      </View>
    </View>
  );
}

function ActionItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.action}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionIcon}>{icon}</View>

      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function MeContent({
  onHomePress,
  onAvatarPress,
  onNamePress,
  onQRPress,
  onMembershipPress,
  onMemberCenterPress,
  onAddressPress,
  onWalletPress,
  onSettingsPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [profileRole, setProfileRole] = useState<string | null>(null);

  // New customers start as Basic; this can be changed later by membership data.
  const membershipTier = 'Basic';

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !active) return;

        setFullName((data?.full_name ?? '').trim());
        setProfileRole(data?.role ?? null);
      } catch {
        // Keep profile fields empty on failure.
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={['#FCE4F1', '#FCE4F1', '#FDF0F6', '#FFFFFF']}
        locations={[0, 0.48, 0.76, 1]}
        style={styles.gradient}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.header,
            {
              // Keep the approved vertical header position.
              paddingTop: insets.top + 20,
            },
          ]}
        >
          <Pressable
            onPress={onAvatarPress}
            hitSlop={8}
            style={styles.avatarButton}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <Image
              source={{ uri: DEFAULT_AVATAR }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </Pressable>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Pressable
                onPress={onNamePress}
                style={styles.namePressable}
                hitSlop={4}
              >
                <Text
                  style={styles.name}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {fullName}
                </Text>
              </Pressable>

              <Pressable
                onPress={onQRPress}
                hitSlop={10}
                style={styles.qrButton}
                accessibilityRole="button"
                accessibilityLabel="My QR code"
              >
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color={MUTED}
                />
              </Pressable>
            </View>

            <View style={styles.memberRow}>
              {membershipTier ? (
                <>
                  <Pressable
                    onPress={onMembershipPress}
                    style={styles.membershipBadge}
                  >
                    <Text style={styles.membershipText}>{membershipTier}</Text>
                  </Pressable>

                  <View style={styles.memberDivider} />
                </>
              ) : null}

              <Pressable
                onPress={onMemberCenterPress}
                hitSlop={6}
                style={styles.memberCenter}
                accessibilityRole="button"
                accessibilityLabel="Member"
              >
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={14}
                  color={MAGENTA}
                />

                <Text
                  style={styles.memberCenterText}
                  numberOfLines={1}
                >
                  Member
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={INK}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.actions}>
            <ActionItem
              label="Address"
              icon={
                <Ionicons
                  name="location-outline"
                  size={21}
                  color={INK}
                />
              }
              onPress={onAddressPress}
            />

            <ActionItem
              label="Wallet"
              icon={
                <Ionicons
                  name="wallet-outline"
                  size={25}
                  color={INK}
                />
              }
              onPress={onWalletPress}
            />

            <ActionItem
              label="Settings"
              icon={
                <Ionicons
                  name="settings-outline"
                  size={25}
                  color={INK}
                />
              }
              onPress={onSettingsPress}
            />
          </View>
        </View>

        {/* Step 4 starts here. Savings / Rewards is intentionally not added yet. */}
        <View style={styles.foundationSpace} />
      </ScrollView>

      <BottomNav onHomePress={onHomePress} />
    </View>
  );
}

export default function MeScreen(props: Props) {
  return (
    <SafeAreaProvider>
      <MeContent {...props} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },

  scrollContent: {
    paddingBottom: 130,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 17,
  },

  avatarButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8D7EA',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
    justifyContent: 'center',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 25,
  },

  namePressable: {
    flexShrink: 1,
    minWidth: 0,
  },

  name: {
    color: INK,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.25,
  },

  qrButton: {
    width: 20,
    height: 20,
    marginLeft: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    minHeight: 21,
  },

  membershipBadge: {
    width: 50,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 3,
    borderRadius: 11,
    backgroundColor: MAGENTA,
  },

  membershipText: {
    marginLeft: 4,
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },

  memberDivider: {
    width: 1,
    height: 13,
    marginHorizontal: 8,
    backgroundColor: '#C9C4D4',
  },

  memberCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },

  memberCenterText: {
    marginLeft: 2.5,
    marginRight: 2,
    color: INK,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
    flexShrink: 1,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 8,
    flexShrink: 0,
  },

  action: {
    width: 41,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },

  actionIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionLabel: {
    marginTop: 2,
    color: INK,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  foundationSpace: {
    minHeight: 650,
  },

  navOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 2,
  },

  nav: {
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  homeButton: {
    width: 70,
    height: 65,
    alignItems: 'center',
  },

  homeCircle: {
    marginTop: 4.5,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#D593B0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  homeLogo: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  navButton: {
    width: 70,
    height: 50,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  navLabel: {
    paddingTop: 5,
    fontSize: 11,
    color: '#1F1E1E',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
});
