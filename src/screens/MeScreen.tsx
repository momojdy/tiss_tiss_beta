import React from 'react';
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

const MAGENTA = '#BF008E';
const WANTISS_LOGO =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';

type Props = {
  onHomePress?: () => void;
};

function NavLabel({ children }: { children: string }) {
  return <Text style={styles.navLabel}>{children}</Text>;
}

function BottomNav({ onHomePress }: Props) {
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

export default function MeScreen({ onHomePress }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <LinearGradient
          colors={['#FCE4F1', '#FCE4F1', '#FDF0F6', '#FFFFFF']}
          locations={[0, 0.28, 0.62, 1]}
          style={styles.header}
        >
          <Text style={styles.title}>Me</Text>
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
    height: 190,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#16181B',
  },
  foundationSpace: {
    flex: 1,
    minHeight: 710,
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
