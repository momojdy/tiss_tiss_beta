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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const MAGENTA = '#BF008E';
const WANTISS_LOGO =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';
const DEFAULT_AVATAR =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/MainDefaultAvatar.PNG';

type Props = {
  onHomePress?: () => void;
  onMemberCenterPress?: () => void;
  onAddressPress?: () => void;
  onWalletPress?: () => void;
  onSettingsPress?: () => void;
  onQrPress?: () => void;
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
          <MaterialCommunityIcons name="television-play" size={32} color={MAGENTA} />
          <NavLabel>Showcase</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="message-text-outline" size={30} color={MAGENTA} />
          <NavLabel>Messages</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="cart-arrow-right" size={32} color={MAGENTA} />
          <NavLabel>Cart</NavLabel>
        </Pressable>

        <Pressable style={styles.navButton}>
          <MaterialCommunityIcons name="emoticon-happy-outline" size={32} color={MAGENTA} />
          <NavLabel>Me</NavLabel>
        </Pressable>
      </View>
    </View>
  );
}

function TopAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.topAction, pressed && styles.topActionPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.topIconCircle}>
        <MaterialCommunityIcons name={icon} size={25} color={MAGENTA} />
      </View>
      <Text style={styles.topActionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function MeScreen({
  onHomePress,
  onMemberCenterPress,
  onAddressPress,
  onWalletPress,
  onSettingsPress,
  onQrPress,
}: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && mounted) setProfile(data);
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = profile?.full_name?.trim() || null;
  const isBuyer = profile?.role === 'buyer';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <LinearGradient
          colors={['#FCE4F1', '#FCE4F1', '#FDF0F6', '#FFFFFF']}
          locations={[0, 0.58, 0.82, 1]}
          style={styles.header}
        >
          <View style={styles.pageTitleRow}>
            <Text style={styles.title}>Me</Text>
          </View>

          <View style={styles.profileRow}>
            <Image
              source={{ uri: DEFAULT_AVATAR }}
              style={styles.avatar}
              resizeMode="cover"
            />

            <View style={styles.profileInfo}>
              {displayName ? (
                <Text style={styles.customerName} numberOfLines={1}>
                  {displayName}
                </Text>
              ) : null}

              {isBuyer ? (
                <View style={styles.memberBadge}>
                  <MaterialCommunityIcons
                    name="crown"
                    size={13}
                    color={MAGENTA}
                  />
                  <Text style={styles.memberBadgeText}>Member</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={onQrPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.qrButton,
                pressed && styles.qrButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="My QR code"
            >
              <MaterialCommunityIcons name="qrcode" size={30} color="#16181B" />
            </Pressable>
          </View>

          <View style={styles.topNav}>
            <TopAction
              icon="account-star-outline"
              label="Member Center"
              onPress={onMemberCenterPress}
            />
            <TopAction
              icon="map-marker-outline"
              label="Address"
              onPress={onAddressPress}
            />
            <TopAction
              icon="wallet-outline"
              label="Wallet"
              onPress={onWalletPress}
            />
            <TopAction
              icon="cog-outline"
              label="Settings"
              onPress={onSettingsPress}
            />
          </View>
        </LinearGradient>

        <View style={styles.foundationSpace} />
      </ScrollView>

      <BottomNav onHomePress={onHomePress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 130,
    minHeight: 900,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 300,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  pageTitleRow: {
    height: 34,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#16181B',
  },
  profileRow: {
    marginTop: 20,
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#16181B',
  },
  memberBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 9,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: MAGENTA,
  },
  qrButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrButtonPressed: {
    opacity: 0.55,
  },
  topNav: {
    marginTop: 28,
    marginHorizontal: -4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topAction: {
    width: '25%',
    height: 66,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  topActionPressed: {
    opacity: 0.55,
  },
  topIconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionLabel: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    color: '#252326',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  foundationSpace: {
    minHeight: 650,
    backgroundColor: '#FFFFFF',
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
