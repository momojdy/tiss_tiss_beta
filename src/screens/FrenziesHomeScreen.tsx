import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { colors, sizes, tournamentTiers, TournamentTierKey } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import { assets, gameImageFit } from '../theme/frenziesAssets';
import GradientBox from '../components/frenzies/GradientBox';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import HeroBanner from '../components/frenzies/HeroBanner';
import { supabase } from '../lib/supabase';

const STREAK_TARGET = 5;
const STREAK_REWARD_POINTS = 100;

const PASS = {
  name: 'Frenzies Pass',
  price: '$3.99',
  period: ' /mo',
  cta: 'Get Frenzies Pass',
  benefits: [
    '1 free $1 tournament ticket',
    '1 tournament discount',
    '1 Streak Shield',
    '20 Frenzies Points',
  ],
};

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family,
  fontSize: size,
  lineHeight: size * 1.21,
  color,
  includeFontPadding: false,
});

export function getInitials(name?: string | null): string | null {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

type ScreenHandlers = {
  onBack?: () => void;
  onPlayGame?: (gameId: string) => void;
  onOpenTier?: (tier: TournamentTierKey) => void;
  onGetPass?: () => void;
};

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLink}>
        <Text style={styles.sectionLinkText}>{link}</Text>
        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </View>
    </View>
  );
}

type GameCfg = {
  id: string;
  gameKey: string;
  image: ImageSourcePropType;
  fit: { width: number; height: number; resizeMode: 'cover' | 'contain'; radius: number };
  title: string;
  subtitle: string;
  duration: string;
  badgeBg: string;
  durBg: string;
  badgeLeft: number;
  durRight: number;
  titleTop: number;
  titleColor: string;
  subTop: number;
  subColor: string;
  textOpacity: number;
  btnLabel: string;
  btnTop: number;
  btnLeft: number;
  btnBg: string;
  btnText: string;
};

const rps = (id: string, edge: number, duration: string): GameCfg => ({
  id,
  gameKey: 'rps',
  image: assets.rps,
  fit: gameImageFit.rps,
  title: 'Rock Paper\nScissors',
  subtitle: 'Familiar player',
  duration,
  badgeBg: colors.gameCard.badgeRps,
  durBg: colors.gameCard.badgeRpsTime,
  badgeLeft: edge,
  durRight: edge,
  titleTop: 101.85,
  titleColor: colors.textDark,
  subTop: 138.05,
  subColor: colors.white,
  textOpacity: 0.85,
  btnLabel: 'Play',
  btnTop: 159,
  btnLeft: 12.5,
  btnBg: colors.gameCard.playBg,
  btnText: colors.gameCard.playText,
});

const GAMES: GameCfg[] = [
  rps('rps-1', 6, '2min'),
  {
    id: 'lls',
    gameKey: 'lls',
    image: assets.lls,
    fit: gameImageFit.lls,
    title: 'Load Lock Ship',
    subtitle: 'Race to load your cargo\nand ship it',
    duration: '4min',
    badgeBg: colors.gameCard.badgeRps,
    durBg: colors.gameCard.badgeRpsTime,
    badgeLeft: 6,
    durRight: 6,
    titleTop: 103.4,
    titleColor: colors.white,
    subTop: 123.6,
    subColor: colors.white,
    textOpacity: 1,
    btnLabel: 'Challenge',
    btnTop: 157,
    btnLeft: 12.375,
    btnBg: colors.gameCard.challengeBg,
    btnText: colors.gameCard.challengeText,
  },
  {
    id: 'korido',
    gameKey: 'korido',
    image: assets.korido,
    fit: gameImageFit.korido,
    title: 'Koridò',
    subtitle: 'Avoid the barricades',
    duration: '7min',
    badgeBg: colors.gameCard.badgeKorido,
    durBg: colors.gameCard.badgeKoridoTime,
    badgeLeft: 4,
    durRight: 4,
    titleTop: 113.4,
    titleColor: colors.black,
    subTop: 135.55,
    subColor: colors.black,
    textOpacity: 0.85,
    btnLabel: 'Play',
    btnTop: 159,
    btnLeft: 12.5,
    btnBg: colors.gameCard.playBg,
    btnText: colors.gameCard.playText,
  },
  rps('rps-2', 4, '2min'),
  rps('rps-3', 4, '2min'),
];

function GameCard({ g, onPlay }: { g: GameCfg; onPlay?: (gameId: string) => void }) {
  return (
    <View style={styles.gameCard}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: g.fit.width,
          height: g.fit.height,
          borderRadius: g.fit.radius,
          overflow: 'hidden',
        }}
      >
        <Image source={g.image} style={{ width: '100%', height: '100%' }} resizeMode={g.fit.resizeMode} />
      </View>
      <View style={[styles.badge, { left: g.badgeLeft, backgroundColor: g.badgeBg }]}>
        <Text style={tx(10, fonts.medium)}>PvP</Text>
      </View>
      <View style={[styles.badge, styles.durBadge, { right: g.durRight, backgroundColor: g.durBg }]}>
        <MaterialCommunityIcons name="timer-outline" size={11} color={colors.textPrimary} />
        <Text style={[tx(8, fonts.regular), { paddingTop: 2, paddingRight: 2, paddingBottom: 1 }]}>{g.duration}</Text>
      </View>
      <Text style={[tx(15, fonts.bold, g.titleColor), { position: 'absolute', left: 4, top: g.titleTop, opacity: g.textOpacity }]}>{g.title}</Text>
      <Text style={[tx(11.5, fonts.regular, g.subColor), { position: 'absolute', left: 4, top: g.subTop, opacity: g.textOpacity }]}>{g.subtitle}</Text>
      <Pressable onPress={() => onPlay?.(g.gameKey)} style={[styles.gameBtn, { top: g.btnTop, left: g.btnLeft, backgroundColor: g.btnBg }]}>
        <Text style={tx(16, fonts.semibold, g.btnText)}>{g.btnLabel}</Text>
      </Pressable>
    </View>
  );
}

function StreakCard({ currentStreak, shieldAvailable, shieldOwned, shieldActive }: { currentStreak: number; shieldAvailable: boolean; shieldOwned: boolean; shieldActive: boolean }) {
  const streak = Math.max(0, currentStreak);
  const progress = Math.min(streak / STREAK_TARGET, 1);
  const winsNeeded = Math.max(STREAK_TARGET - streak, 0);
  const streakText = streak >= STREAK_TARGET
    ? `Streak target reached`
    : `${winsNeeded} more ${winsNeeded === 1 ? 'win' : 'wins'} to earn ${STREAK_REWARD_POINTS} Frenzies Points`;
  const shieldText = shieldActive
    ? 'Streak Shield active — next match protected'
    : shieldOwned
      ? 'Streak Shield ready — use anytime'
      : shieldAvailable
        ? <>Streak Shield available{\n}<Text>Get and protect your wins</Text>{\n}<Text>Use anytime</Text></>
        : 'Streak Shield unavailable';

  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
      <GradientBox gradient={colors.streak.gradient} style={styles.streakCard}>
        <View style={styles.streakTop}>
          <View style={styles.flameBadge}>
            <MaterialCommunityIcons name="fire" size={20} color={colors.streak.flameIcon} />
          </View>
          <View style={styles.streakCopy}>
            <Text style={[tx(16, fonts.bold), { marginLeft: 11, marginTop: 0 }]}>{streak} win streak</Text>
            <Text style={[tx(12, fonts.regular, colors.streak.subtext), { marginLeft: 11, marginTop: 3 }]}>
              {streakText}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.shieldRow}>
          <View style={styles.shieldCopy}>
            <MaterialCommunityIcons name="shield-check-outline" size={19} color={colors.textPrimary} />
            <Text style={[tx(11, fonts.regular, colors.streak.subtext), { marginLeft: 7, flexShrink: 1 }]}>
              {shieldText}
            </Text>
          </View>
          <View style={[styles.shieldPill, !shieldAvailable && !shieldOwned && !shieldActive && { opacity: 0.55 }]}>
            <Text style={tx(10, fonts.bold, colors.textPrimary)}>Streak Shield</Text>
          </View>
        </View>
      </GradientBox>
    </View>
  );
}
type RankEntry = {
  rank: number;
  name: string;
  wins: number;
  photoUrl?: string;
  isTop?: boolean;
  isYou?: boolean;
};

const ENTRIES: RankEntry[] = [
  { rank: 1, name: 'Claire D.', wins: 19, isTop: true },
  { rank: 2, name: 'Joyce B.', wins: 15 },
  { rank: 3, name: 'Aitor M.', wins: 12, isTop: true },
  { rank: 4, name: 'Yumi M.', wins: 10 },
  { rank: 5, name: 'Daniel P.', wins: 9 },
  { rank: 6, name: 'You', wins: 4, isYou: true },
  { rank: 7, name: 'Nora F.', wins: 3 },
  { rank: 8, name: 'Theo W.', wins: 3 },
  { rank: 9, name: 'Priya S.', wins: 2 },
  { rank: 10, name: 'Cole J.', wins: 2 },
];

const RANK_H = sizes.rankingsHeight;
const RANK_VIEWPORT = RANK_H - 2;
const r = colors.rankings;

function Avatar({ e }: { e: RankEntry }) {
  const initials = e.isYou ? null : getInitials(e.name);
  const circle = (
    <View style={styles.avatar}>
      {e.photoUrl ? <Image source={{ uri: e.photoUrl }} style={{ width: 30, height: 30 }} /> : initials ? <Text style={tx(11, fonts.bold, r.avatarText)}>{initials}</Text> : <MaterialIcons name="person" size={15} color={r.avatarText} />}
    </View>
  );
  if (!e.isYou) return circle;
  return <View style={styles.avatarRing}>{circle}</View>;
}

function RankRowContent({ e }: { e: RankEntry }) {
  return (
    <>
      <View style={{ width: 16 }}><Text style={[tx(13, fonts.bold, e.isTop ? r.rankTop : r.rankMuted), { textAlign: 'center' }]}>{e.rank}</Text></View>
      <View style={{ width: 11 }} />
      <Avatar e={e} />
      <View style={{ width: 11 }} />
      <Text numberOfLines={1} style={[tx(13, fonts.semibold, r.text), { flex: 1 }]}>{e.name}</Text>
      <View style={styles.flamePill}><MaterialIcons name="local-fire-department" size={12} color={r.flamePillText} /><Text style={[tx(11.5, fonts.bold, r.flamePillText), { marginLeft: 4 }]}>{e.wins}</Text></View>
    </>
  );
}

function RankingsCard() {
  const scrollY = useRef(0);
  const youLayout = useRef<{ y: number; h: number } | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const check = useCallback(() => {
    const l = youLayout.current;
    if (!l) return;
    const top = l.y - scrollY.current;
    const bottom = top + l.h;
    const visible = bottom > 0 && top < RANK_VIEWPORT;
    setShowPinned(!visible);
  }, []);
  useEffect(() => {
    Animated.timing(anim, { toValue: showPinned ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [showPinned, anim]);
  const onScroll = (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = ev.nativeEvent.contentOffset.y;
    check();
  };
  const you = ENTRIES.find((x) => x.isYou)!;
  return (
    <View style={styles.rankCard}>
      <ScrollView style={{ height: RANK_VIEWPORT }} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 4 }} onScroll={onScroll} scrollEventThrottle={16} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {ENTRIES.map((e, i) => (
          <View key={e.rank} onLayout={e.isYou ? (ev) => { youLayout.current = { y: ev.nativeEvent.layout.y, h: ev.nativeEvent.layout.height }; check(); } : undefined} style={[styles.rankRow, e.isYou && { marginHorizontal: -14, paddingHorizontal: 14, backgroundColor: r.youTint }, i !== ENTRIES.length - 1 && { borderBottomWidth: 1, borderBottomColor: r.rowBorder }]}>
            <RankRowContent e={e} />
          </View>
        ))}
      </ScrollView>
      <Animated.View pointerEvents={showPinned ? 'auto' : 'none'} style={[styles.pinned, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }]}>
        <RankRowContent e={{ ...you, isTop: false }} />
      </Animated.View>
    </View>
  );
}

type TierCfg = {
  key: TournamentTierKey;
  label: string;
  labelSize: number;
  fee: string;
  pool: string;
  active: number;
  joined: number;
  capacity: number;
  width: number;
};

const TIERS: TierCfg[] = [
  { key: 't1', label: 'Entry fee', labelSize: 15, fee: '$1', pool: '$50', active: 0, joined: 0, capacity: 24, width: 185 },
  { key: 't5', label: 'Entry fee', labelSize: 15, fee: '$5', pool: '$250', active: 3, joined: 18, capacity: 24, width: 200 },
  { key: 't20', label: 'Entry fee', labelSize: 14, fee: '$20', pool: '$1,000', active: 3, joined: 18, capacity: 24, width: 200 },
  { key: 't50', label: 'Entry fee', labelSize: 15, fee: '$50', pool: '$2,500', active: 3, joined: 18, capacity: 24, width: 200 },
  { key: 't100', label: 'Entry fee', labelSize: 15, fee: '$100', pool: '$5,000', active: 3, joined: 18, capacity: 24, width: 200 },
  { key: 'ultimate', label: 'ULTIMATE', labelSize: 15, fee: '$500', pool: '$25,000', active: 3, joined: 18, capacity: 24, width: 200 },
];

function TournamentCard({ t, first, onOpen }: { t: TierCfg; first: boolean; onOpen?: (tier: TournamentTierKey) => void }) {
  const th = tournamentTiers[t.key];
  const progress = t.capacity > 0 ? Math.min(t.joined / t.capacity, 1) : 0;
  const isUlt = t.key === 'ultimate';
  return (
    <Pressable onPress={() => onOpen?.(t.key)} style={{ marginLeft: first ? 18 : 15 }}>
      <GradientBox gradient={th.gradient} style={{ width: t.width, height: sizes.tournamentCard.height, borderRadius: sizes.tournamentCard.radius, overflow: 'hidden' }}>
        <View style={{ paddingLeft: 10, paddingTop: 10 }}>
          <Text style={tx(t.labelSize, isUlt ? fonts.semibold : fonts.medium, th.text)}>{t.label}</Text>
          <Text style={[tx(20, fonts.bold, th.text), { marginTop: 2 }]}>{t.fee}</Text>
          <Text style={[tx(15, fonts.medium, th.text), { marginTop: 12 }]}>Prize pool</Text>
          <Text style={[tx(16, fonts.semibold, th.text), { marginTop: 2 }]}>{t.pool}</Text>
          {t.active > 0 && <Text style={[tx(14, fonts.regular, th.text), { marginTop: 8 }]}>{'\u2022'} {t.active} matches in progress</Text>}
          <Text style={[tx(14, fonts.medium, th.text), { marginTop: 18 }]}>{t.joined}/{t.capacity} joined</Text>
          <View style={[styles.tBarTrack, { backgroundColor: th.track }]}><View style={{ width: 170 * progress, height: 6, borderRadius: 5, backgroundColor: th.text }} /></View>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderBottomLeftRadius: 32, backgroundColor: colors.white, opacity: th.shapeOpacity }} />
      </GradientBox>
    </Pressable>
  );
}

function PassCard({ onGetPass }: { onGetPass?: () => void }) {
  const p = colors.pass;
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
      <View style={[styles.passCard, { backgroundColor: p.bg, borderColor: p.border }]}>
        <View style={styles.passTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialCommunityIcons name="diamond-outline" size={16} color={colors.textPrimary} /><Text style={[tx(14.5, fonts.bold), { marginLeft: 8 }]}>{PASS.name}</Text></View>
          <Text style={tx(14, fonts.bold)}>{PASS.price}<Text style={tx(11, fonts.medium, p.muted)}>{PASS.period}</Text></Text>
        </View>
        <View style={styles.passGrid}>{PASS.benefits.map((b) => <Text key={b} style={[tx(11.5, fonts.regular, colors.textSecondary), styles.passBenefit]}>{b}</Text>)}</View>
        <Pressable onPress={onGetPass} style={[styles.passCta, { backgroundColor: p.cta }]}><Text style={tx(13, fonts.bold, p.ctaText)}>{PASS.cta}</Text></Pressable>
      </View>
    </View>
  );
}

function NavItem({ icon, label, height, justify, padBottom = 0, padLeft = 0 }: { icon: React.ReactNode; label: string; height: number; justify: 'space-between' | 'center' | 'flex-end'; padBottom?: number; padLeft?: number }) {
  return <View style={{ width: 70, height, alignItems: 'center', justifyContent: justify, paddingLeft: padLeft }}>{icon}<Text style={[tx(11, fonts.medium), { marginTop: 6, marginBottom: padBottom }]}>{label}</Text></View>;
}

function BottomNav() {
  const inactive = colors.nav.inactive;
  const battleMotion = useRef(new Animated.Value(0)).current;
  const glareMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const motion = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(battleMotion, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(battleMotion, { toValue: -1, duration: 220, useNativeDriver: true }),
        Animated.timing(battleMotion, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    const glare = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(glareMotion, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(glareMotion, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(1800),
      ])
    );
    motion.start();
    glare.start();
    return () => {
      motion.stop();
      glare.stop();
    };
  }, [battleMotion, glareMotion]);

  const battleRotate = battleMotion.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['6deg', '0deg', '-6deg'],
  });
  const glareTranslate = glareMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-58, 58],
  });

  return (
    <View style={styles.navOuter}>
      <View style={styles.navBar}>
        <NavItem label="Home" height={50} justify="space-between" icon={<MaterialCommunityIcons name="home-outline" size={32} color="#B3DF4B" />} />
        <NavItem label="Contacts" height={50} justify="space-between" icon={<MaterialCommunityIcons name="contacts-outline" size={32} color={inactive} />} />
        <NavItem
          label="Battle"
          height={80}
          justify="flex-end"
          padBottom={15}
          icon={
            <View style={styles.battleIconWrap}>
              <Animated.View style={{ transform: [{ rotate: battleRotate }] }}>
                <FontAwesome6 name="battle-net" brand size={52} color="#EE6B2E" />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.battleGlare,
                  { transform: [{ translateX: glareTranslate }, { rotate: '-20deg' }] },
                ]}
              />
            </View>
          }
        />
        <NavItem label="Wallet" height={50} justify="center" padLeft={4} icon={<MaterialCommunityIcons name="wallet-outline" size={32} color={inactive} />} />
        <NavItem label="Profile" height={50} justify="flex-end" icon={<MaterialIcons name="tag-faces" size={32} color={inactive} />} />
      </View>
    </View>
  );
}

export function FrenziesHomeScreen({ onBack, onPlayGame, onOpenTier, onGetPass }: ScreenHandlers) {
  const [points, setPoints] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [shieldAvailable, setShieldAvailable] = useState(true);
  const [shieldOwned, setShieldOwned] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('frenzies_player_stats')
        .select('lifetime_points, current_win_streak, streak_shield_available, streak_shield_owned, streak_shield_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[FrenziesHomeScreen] Failed to load Frenzies stats:', error);
        return;
      }

      if (!mounted) return;

      setPoints(data?.lifetime_points ?? 0);
      setCurrentStreak(data?.current_win_streak ?? 0);
      setShieldOwned(data?.streak_shield_owned ?? false);
      setShieldActive(data?.streak_shield_active ?? false);

      // A shield can be purchased even before the first win. If no stats row
      // is returned yet, keep the purchase option available for the 0-win state.
      const owned = data?.streak_shield_owned ?? false;
      const active = data?.streak_shield_active ?? false;
      setShieldAvailable(data ? Boolean(data.streak_shield_available) : !owned && !active);
    };
    load();
    return () => { mounted = false; };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <StatusBar style="dark" />
      <FrenziesHeader points={points} onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <HeroBanner />
        <View style={{ paddingTop: 18 }}><SectionHeader title="Play now " link="View all" /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>{GAMES.map((g) => <GameCard key={g.id} g={g} onPlay={onPlayGame} />)}</ScrollView>
        <StreakCard currentStreak={currentStreak} shieldAvailable={shieldAvailable} shieldOwned={shieldOwned} shieldActive={shieldActive} />
        <View style={{ paddingTop: 18 }}><SectionHeader title="Rankings" link="See more" /></View>
        <View style={{ marginHorizontal: 10, marginTop: 8, height: RANK_H }}><RankingsCard /></View>
        <View style={{ paddingTop: 18 }}><SectionHeader title="Tournaments" link="Compete" /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>{TIERS.map((t, i) => <TournamentCard key={t.key} t={t} first={i === 0} onOpen={onOpenTier} />)}</ScrollView>
        <PassCard onGetPass={onGetPass} />
      </ScrollView>
      <BottomNav />
    </View>
  );
}

export default function App({ onBack, onPlayGame, onOpenTier, onGetPass }: ScreenHandlers) {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <FrenziesHomeScreen
        onBack={onBack}
        onPlayGame={onPlayGame}
        onOpenTier={onOpenTier}
        onGetPass={onGetPass}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...tx(17, fonts.bold), marginLeft: 18 },
  sectionLink: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  sectionLinkText: tx(14, fonts.regular, colors.textSecondary),
  gameCard: { width: sizes.gameCard.width, height: sizes.gameCard.height, marginLeft: sizes.gameCard.gap, marginTop: 16, backgroundColor: colors.white },
  badge: { position: 'absolute', top: 6, width: 30, height: 15, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  durBadge: { flexDirection: 'row', justifyContent: 'flex-start' },
  gameBtn: { position: 'absolute', width: 125, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  streakCard: { height: sizes.streakHeight, borderRadius: sizes.streakRadius, overflow: 'hidden' },
  flameBadge: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.streak.flameBadgeBg, alignItems: 'center', justifyContent: 'center' },
  streakTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 15 },
  streakCopy: { flex: 1 },
  progressTrack: { height: 10, borderRadius: 4, marginHorizontal: 15, marginTop: 15, backgroundColor: colors.streak.progressTrack, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.streak.progressFill },
  shieldRow: { marginTop: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shieldCopy: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  shieldPill: { marginLeft: 8, width: 100, height: 30, borderRadius: 18, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  rankCard: { flex: 1, backgroundColor: r.cardBg, borderRadius: sizes.rankingsRadius, borderWidth: 1, borderColor: r.cardBorder, overflow: 'hidden' },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: r.avatarBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarRing: { width: 37, height: 37, borderRadius: 18.5, borderWidth: 1.75, borderColor: r.youRing, alignItems: 'center', justifyContent: 'center' },
  flamePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: r.flamePillBg },
  pinned: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: r.cardBg, borderTopWidth: 1, borderTopColor: r.cardBorder, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: -8 } },
  tBarTrack: { marginTop: 8, width: 170, height: 6, borderRadius: 5, overflow: 'hidden' },
  passCard: { borderRadius: 20, borderWidth: 0.5, padding: 16 },
  passTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  passGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  passBenefit: { width: '50%', paddingRight: 10, marginBottom: 8 },
  passCta: { borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  navBar: { width: '100%', height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', elevation: 5, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  navOuter: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 15 },
  battleIconWrap: { width: 58, height: 55, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  battleGlare: { position: 'absolute', top: -12, left: 0, width: 10, height: 80, backgroundColor: 'rgba(255,255,255,0.55)' },
});