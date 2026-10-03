import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const ASSET_BASE = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/';
const ASSETS = {
  korido: ASSET_BASE + 'Korido.PNG',
  trophy: ASSET_BASE + 'Trophy.png',
  rps: ASSET_BASE + 'RPS_thumbnail.jpg',
  lls: ASSET_BASE + 'LLS_thumbnail.jpg',
};

const COLORS = {
  background: '#FFFFFF',
  text: '#15161B',
  secondary: '#6C7280',
  muted: '#9CA1AC',
  border: '#EEF0F3',
  heroStart: '#F7E9C1',
  heroEnd: '#F3DEA7',
  green: '#C9F24B',
  orange: '#EE6B2E',
  orangeDark: '#DD3E2A',
};

const GAMES = [
{ key: 'rps-1', title: 'Rock Paper\nScissors', subtitle: 'Familiar player', image: ASSETS.rps, fit: 'cover' as const, duration: '3min' },
  { key: 'lls', title: 'Load Lock Ship', subtitle: 'Race to load your cargo and ship it', image: ASSETS.lls, fit: 'cover' as const, duration: '4min', challenge: true },
  { key: 'korido', title: 'Koridò', subtitle: 'Avoid the barricades', image: ASSETS.korido, fit: 'contain' as const, duration: '7min' },
  { key: 'rps-2', title: 'Rock Paper\nScissors', subtitle: 'Familiar player', image: ASSETS.rps, fit: 'cover' as const, duration: '3min' },
];

const RANKINGS = [
  ['1', 'Mika', '18'],
  ['2', 'Dany', '16'],
  ['3', 'Jojo', '15'],
  ['4', 'Steeve', '13'],
  ['5', 'Nadia', '12'],
  ['6', 'Rico', '11'],
  ['7', 'Luna', '10'],
  ['8', 'Ken', '9'],
  ['9', 'Maya', '8'],
  ['10', 'Tina', '7'],
];

const TOURNAMENTS = [
  { fee: '$1', prize: '$50', colors: ['#DBF1CB', '#A9DE8C'], text: '#2E6A1D', joined: 17 },
  { fee: '$5', prize: '$250', colors: ['#D6EAFC', '#9DC8F0'], text: '#1F5FA0', joined: 12 },
  { fee: '$20', prize: '$1,000', colors: ['#FBEACB', '#EFC873'], text: '#8A5E10', joined: 21 },
  { fee: '$50', prize: '$2,500', colors: ['#E9DDF7', '#C1A3E8'], text: '#5B2E8C', joined: 9 },
  { fee: '$100', prize: '$5,000', colors: ['#FBD9D2', '#EE9C87'], text: '#A3311A', joined: 18 },
  { fee: 'ULTIMATE', prize: '$25,000', colors: ['#2C2A22', '#15140F'], text: '#F0C864', joined: 6, ultimate: true },
];

function SectionHeader({ title, action }: { title: string; action: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable hitSlop={8}>
        <Text style={styles.sectionAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function GameCard({ game }: { game: (typeof GAMES)[number] & { duration?: string; challenge?: boolean } }) {
  return (
    <Pressable style={styles.gameCard}>
      <View style={styles.gameArt}>
        <Image source={{ uri: game.image }} style={styles.gameImage} resizeMode={game.fit} />
        <View style={styles.gameBadgeLeft}><Text style={styles.badgeText}>PvP</Text></View>
        <View style={styles.gameBadgeRight}><MaterialCommunityIcons name="timer-outline" size={11} color="#180C0C" /><Text style={styles.badgeText}>{game.duration}</Text></View>
      </View>
      <View style={styles.gameBody}>
        <Text numberOfLines={2} style={styles.gameTitle}>{game.title}</Text>
        <Text numberOfLines={2} style={styles.gameSubtitle}>{game.subtitle}</Text>
        <Pressable style={[styles.playButton, game.challenge && styles.challengeButton]}>
          <Text style={[styles.playButtonText, game.challenge && styles.challengeButtonText]}>{game.challenge ? 'Challenge' : 'Play'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function StreakCard() {
  return (
    <LinearGradient colors={['#FBDEC4', '#F6B68C']} start={{ x: 1, y: 1 }} end={{ x: -1, y: -1 }} style={styles.streakCard}>
      <View style={styles.streakTop}>
        <View style={styles.flameBadge}>
          <MaterialCommunityIcons name="fire" size={20} color="#180C0C" />
        </View>
        <View style={styles.streakCopy}>
          <Text style={styles.streakTitle}>4 win streak</Text>
          <Text style={styles.streakSubtitle}>One more win to earn 100 Frenzies Points</Text>
        </View>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '80%' }]} /></View>
      <View style={styles.shieldRow}>
        <View style={styles.shieldCopy}>
          <MaterialCommunityIcons name="shield-check-outline" size={19} color={COLORS.text} />
          <Text style={styles.shieldLabel}>Protect streak before match 5</Text>
        </View>
        <View style={styles.shieldPill}><Text style={styles.shieldPillText}>Streak Shield</Text></View>
      </View>
    </LinearGradient>
  );
}

function Avatar({ name, own }: { name: string; own?: boolean }) {
  const initials = name.length > 1 ? name.slice(0, 2).toUpperCase() : name.toUpperCase();
  return (
    <View style={[styles.avatarRing, own && styles.ownAvatarRing]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
    </View>
  );
}

function RankingsCard() {
  return (
    <View style={styles.rankingsCard}>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.rankingsScroll}>
        {RANKINGS.map(([rank, name, wins]) => {
          const own = name === 'Maya';
          const rankNumber = Number(rank);
          return (
            <View key={rank} style={[styles.rankRow, own && styles.ownRankRow]}>
              <Text style={[styles.rankNumber, (rankNumber === 1 || rankNumber === 3) && styles.accentRank]}>{rank}</Text>
              <Avatar name={name} own={own} />
              <Text numberOfLines={1} style={styles.rankName}>{name}</Text>
              <View style={styles.winPill}>
                <MaterialCommunityIcons name="fire" size={13} color="#DE5A2A" />
                <Text style={styles.winText}>{wins}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TournamentCard({ tier }: { tier: (typeof TOURNAMENTS)[number] }) {
  const percent = Math.min(100, (tier.joined / 24) * 100);
  return (
    <Pressable style={styles.tournamentCard}>
      <LinearGradient colors={tier.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.tournamentDecoration} />
      <View style={styles.tournamentContent}>
        <Text style={[styles.tournamentFee, { color: tier.text }]}>{tier.fee}</Text>
        <Text style={[styles.tournamentEntry, { color: tier.text }]}>entry fee</Text>
        <View style={styles.tournamentSpacer} />
        <Text style={[styles.tournamentPrizeLabel, { color: tier.text }]}>Prize pool</Text>
        <Text style={[styles.tournamentPrize, { color: tier.text }]}>{tier.prize}</Text>
        <View style={styles.joinedRow}>
          <Text style={[styles.joinedText, { color: tier.text }]}>{tier.joined}/24 joined</Text>
        </View>
        <View style={[styles.joinTrack, tier.ultimate && styles.ultimateTrack]}>
          <View style={[styles.joinFill, { width: `${percent}%` }, tier.ultimate && styles.ultimateFill]} />
        </View>
      </View>
    </Pressable>
  );
}

export default function FrenziesHomeScreen({ onBack }: { onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const gameWidth = Math.max(220, Math.min(270, width * 0.64));

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={25} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Frenzies</Text>
        <View style={styles.pointsPill}>
          <MaterialIcons name="bolt" size={17} color="#8B6A12" />
          <Text style={styles.pointsText}>0</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={[COLORS.heroStart, COLORS.heroEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.sparkleOne}><Text>✦</Text></View>
          <View style={styles.sparkleTwo}><Text>✧</Text></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Fast PvP. Big fun.</Text>
            <Text style={styles.heroSubtitle}>Challenge players. Build your streak. Earn Frenzies Points.</Text>
          </View>
          <Image source={{ uri: ASSETS.trophy }} style={styles.trophy} resizeMode="contain" />
        </LinearGradient>

        <SectionHeader title="Play now" action="View all →" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gameRow}>
          {GAMES.map(game => <View key={game.key} style={{ width: gameWidth }}><GameCard game={game} /></View>)}
        </ScrollView>

        <View style={styles.sectionSpacing} />
        <SectionHeader title="Your streak" action="" />
        <StreakCard />

        <View style={styles.sectionSpacing} />
        <SectionHeader title="Rankings" action="See more →" />
        <RankingsCard />

        <View style={styles.sectionSpacing} />
        <SectionHeader title="Tournaments" action="Compete →" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tournamentRow}>
          {TOURNAMENTS.map(tier => <TournamentCard key={tier.fee} tier={tier} />)}
        </ScrollView>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  pointsPill: { height: 32, minWidth: 55, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#FFF4CF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  pointsText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  content: { paddingBottom: 24 },
  hero: { marginHorizontal: 12, marginTop: 12, minHeight: 158, borderRadius: 22, overflow: 'hidden', padding: 20, flexDirection: 'row', alignItems: 'center' },
  heroCopy: { width: '64%', zIndex: 2 },
  heroTitle: { fontSize: 29, lineHeight: 34, fontWeight: '800', color: COLORS.text, letterSpacing: -0.8 },
  heroSubtitle: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#6B6252', maxWidth: 220 },
  trophy: { position: 'absolute', right: 8, bottom: 7, width: 128, height: 128 },
  sparkleOne: { position: 'absolute', right: 126, top: 22, opacity: 0.7 },
  sparkleTwo: { position: 'absolute', right: 52, top: 18, opacity: 0.55 },
  sectionHeader: { marginTop: 18, paddingHorizontal: 16, minHeight: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.25 },
  sectionAction: { fontSize: 13, fontWeight: '600', color: '#7D838E' },
  gameRow: { paddingLeft: 13, paddingRight: 13, gap: 10 },
  gameCard: { backgroundColor: '#F4F4F4', borderRadius: 0, overflow: 'hidden', height: 200 },
  gameArt: { height: 200, backgroundColor: '#F2F4F7', position: 'relative' },
  gameImage: { width: '100%', height: '100%' },
  gameBadgeLeft: { position: 'absolute', left: 6, top: 6, paddingHorizontal: 7, height: 15, borderRadius: 3, backgroundColor: 'rgba(244,241,234,0.38)', alignItems: 'center', justifyContent: 'center' },
  gameBadgeRight: { position: 'absolute', right: 6, top: 6, paddingHorizontal: 5, height: 15, borderRadius: 3, backgroundColor: 'rgba(244,241,234,0.38)', flexDirection: 'row', gap: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 8, fontWeight: '500', color: '#180C0C' },
  gameBody: { position: 'absolute', left: 4, right: 4, top: 40, bottom: 0 },
  gameTitle: { fontSize: 15, lineHeight: 18, fontWeight: '700', color: '#180C0C', opacity: 0.85 },
  gameSubtitle: { marginTop: 7, fontSize: 11.5, lineHeight: 15, color: '#FFFFFF', opacity: 0.85 },
  playButton: { marginTop: 10, height: 34, borderRadius: 17, backgroundColor: '#B3DF4B', alignItems: 'center', justifyContent: 'center' },
  playButtonText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  challengeButton: { backgroundColor: '#FFFFFF' },
  challengeButtonText: { color: '#173A12' },
  sectionSpacing: { height: 2 },
  streakCard: { marginHorizontal: 18, marginTop: 2, height: 150, borderRadius: 20, padding: 15 },
  streakTop: { flexDirection: 'row', alignItems: 'center' },
  flameBadge: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  streakCopy: { flex: 1, marginLeft: 11 },
  streakTitle: { fontSize: 16, fontWeight: '750', color: COLORS.text },
  streakSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 17, color: COLORS.secondary },
  progressTrack: { height: 10, borderRadius: 4, marginTop: 15, backgroundColor: '#F2D6BC', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.orange },
  shieldRow: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shieldCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  shieldLabel: { fontSize: 11, color: COLORS.secondary, flexShrink: 1 },
  shieldPill: { marginLeft: 8, paddingHorizontal: 10, height: 30, borderRadius: 18, backgroundColor: '#B3DF4B', alignItems: 'center', justifyContent: 'center' },
  shieldPillText: { fontSize: 10, fontWeight: '800', color: COLORS.text },
  rankingsCard: { marginHorizontal: 10, marginTop: 0, height: 200, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  rankingsScroll: { flex: 1 },
  rankRow: { height: 56, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F4F5F7' },
  ownRankRow: { backgroundColor: 'rgba(201,242,75,0.06)' },
  rankNumber: { width: 24, fontSize: 16, fontWeight: '700', color: '#B7BBC4' },
  accentRank: { color: '#E0862E' },
  avatarRing: { width: 37, height: 37, borderRadius: 18.5, alignItems: 'center', justifyContent: 'center' },
  ownAvatarRing: { borderWidth: 1.75, borderColor: COLORS.green },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E7E9ED', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#8A8F99' },
  rankName: { flex: 1, marginLeft: 9, fontSize: 13, fontWeight: '600', color: COLORS.text },
  winPill: { minWidth: 47, height: 25, paddingHorizontal: 7, borderRadius: 13, backgroundColor: '#FBE1D2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  winText: { fontSize: 11, fontWeight: '700', color: '#DE5A2A' },
  tournamentRow: { paddingLeft: 18, paddingRight: 12, gap: 10 },
  tournamentCard: { width: 185, height: 200, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  tournamentDecoration: { position: 'absolute', right: -8, top: -8, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.32)' },
  tournamentContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 10 },
  tournamentFee: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  tournamentEntry: { marginTop: 1, fontSize: 15, fontWeight: '500', opacity: 0.9 },
  tournamentSpacer: { flex: 1 },
  tournamentPrizeLabel: { fontSize: 15, fontWeight: '500', opacity: 0.9 },
  tournamentPrize: { marginTop: 1, fontSize: 16, fontWeight: '600' },
  joinedRow: { marginTop: 8 },
  joinedText: { fontSize: 15, fontWeight: '600' },
  joinTrack: { height: 6, marginTop: 5, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  joinFill: { height: '100%', borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.24)' },
  ultimateTrack: { backgroundColor: 'rgba(240,200,100,0.18)', borderWidth: 1, borderColor: 'rgba(240,200,100,0.35)' },
  ultimateFill: { backgroundColor: '#F0C864' },
});
