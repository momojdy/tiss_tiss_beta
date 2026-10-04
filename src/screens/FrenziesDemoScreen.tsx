import React, { useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { fonts } from '../theme/frenziesFonts';
import { assets } from '../theme/frenziesAssets';

type DemoGame = { id: string; title: string; subtitle: string; duration: string; image: typeof assets.rps };
const GAMES: DemoGame[] = [
  { id: 'rps', title: 'Rock Paper Scissors', subtitle: 'Quick and familiar', duration: '2min', image: assets.rps },
  { id: 'lls', title: 'Load Lock Ship', subtitle: 'Load your cargo and ship it', duration: '4min', image: assets.lls },
  { id: 'korido', title: 'Koridò', subtitle: 'Avoid the barricades', duration: '7min', image: assets.korido },
];
const DEMO_PLAYERS = [
  { id: 'maya', name: 'Maya', game: 'Rock Paper Scissors' },
  { id: 'jay', name: 'Jay', game: 'Koridò' },
  { id: 'niko', name: 'Niko', game: 'Load Lock Ship' },
];
const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false,
});

function BalanceCard({ balance, onAdd }: { balance: number; onAdd: () => void }) {
  return <View style={s.balanceCard}>
    <View style={s.balanceTop}>
      <View><Text style={tx(12, fonts.medium, colors.textSecondary)}>Demo balance</Text><Text style={[tx(29, fonts.bold), { marginTop: 5 }]}>{balance.toFixed(2)}</Text></View>
      <View style={s.demoCoin}><MaterialCommunityIcons name="gamepad-variant-outline" size={23} color={colors.textPrimary} /></View>
    </View>
    <View style={s.balanceBottom}>
      <Text style={[tx(11, fonts.regular, colors.textSecondary), { flex: 1, paddingRight: 10 }]}>Virtual funds only</Text>
      <Pressable onPress={onAdd} style={s.addFunds}><Text style={tx(11, fonts.bold)}>Add demo funds</Text></Pressable>
    </View>
  </View>;
}

function ModeCard({ icon, title, subtitle, button, onPress, highlighted }: { icon: React.ReactNode; title: string; subtitle: string; button: string; onPress: () => void; highlighted?: boolean }) {
  return <View style={[s.modeCard, highlighted && s.modeCardHighlight]}>
    <View style={s.modeTopRow}>
      <View style={s.modeIcon}>{icon}</View>
      <Text style={[tx(16, fonts.bold), { flex: 1, marginLeft: 10, paddingRight: 8 }]}>{title}</Text>
      <Pressable onPress={onPress} style={[s.modeButton, highlighted && s.modeButtonHighlight]}>
        <Text style={tx(13, fonts.bold, highlighted ? colors.white : colors.textPrimary)}>{button}</Text>
        <MaterialIcons name="chevron-right" size={18} color={highlighted ? colors.white : colors.textPrimary} />
      </Pressable>
    </View>
    <Text style={[tx(11.5, fonts.regular, colors.textSecondary), { marginTop: 6, lineHeight: 16 }]}>{subtitle}</Text>
  </View>;
}

function GameCard({ game, selected, onPress }: { game: DemoGame; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[s.gameCard, selected && s.gameCardSelected]}>
    <Image source={game.image} style={s.gameImage} resizeMode={game.id === 'korido' ? 'contain' : 'cover'} />
    <View style={s.gameOverlay} />
    <View style={s.practiceBadge}><Text style={tx(9, fonts.bold)}>PRACTICE</Text></View>
    <View style={s.durationBadge}><MaterialCommunityIcons name="timer-outline" size={11} color={colors.textPrimary} /><Text style={[tx(9, fonts.medium), { marginLeft: 3 }]}>{game.duration}</Text></View>
    <View style={s.gameCopy}><Text numberOfLines={2} style={tx(14, fonts.bold, colors.white)}>{game.title}</Text><Text numberOfLines={1} style={[tx(10.5, fonts.regular, colors.white), { marginTop: 3, opacity: .85 }]}>{game.subtitle}</Text></View>
    {selected && <View style={s.selectedCheck}><MaterialIcons name="check" size={15} color={colors.textPrimary} /></View>}
  </Pressable>;
}

function PlayerRow({ player, onChallenge }: { player: typeof DEMO_PLAYERS[number]; onChallenge: () => void }) {
  return <View style={s.playerRow}>
    <View style={s.avatar}><Text style={tx(12, fonts.bold, colors.textSecondary)}>{player.name.slice(0, 1)}</Text></View>
    <View style={{ flex: 1, marginLeft: 10 }}>
      <View style={s.playerNameRow}><Text style={tx(13, fonts.semibold)}>{player.name}</Text><View style={s.onlineDot} /><Text style={tx(10, fonts.regular, colors.textSecondary)}>Online</Text></View>
      <Text style={[tx(10.5, fonts.regular, colors.textSecondary), { marginTop: 3 }]}>{player.game}</Text>
    </View>
    <Pressable onPress={onChallenge} style={s.challengeButton}><Text style={tx(11, fonts.bold, colors.white)}>Challenge</Text></Pressable>
  </View>;
}

export default function FrenziesDemoScreen({ onBack, onViewOnlinePlayers }: { onBack?: () => void; onViewOnlinePlayers?: () => void }) {
  const [balance, setBalance] = useState(10);
  const [selectedGame, setSelectedGame] = useState('rps');
  const [notice, setNotice] = useState<string | null>(null);
  const selected = useMemo(() => GAMES.find(g => g.id === selectedGame) ?? GAMES[0], [selectedGame]);
  const addFunds = () => {
    setBalance(v => Math.min(v + 10, 1000));
    setNotice(balance >= 1000 ? 'Demo balance is capped at 1000.' : 'Demo funds added. These funds have no real value.');
  };
  const playComputer = () => setNotice('Starting ' + selected.title + ' against the computer.');
  const challengePlayer = (name: string) => setNotice('Demo challenge sent to ' + name + '.');

  return <SafeAreaView style={s.safe}>
    <FrenziesHeader title="Frenzies" onBack={onBack} demo />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.intro}><Text style={tx(25, fonts.bold)}>Practice your game.</Text><Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 6, lineHeight: 19 }]}>Practice with virtual demo funds. Challenge the AI or another demo player. Replenish your virtual assets anytime.</Text></View>
      <BalanceCard balance={balance} onAdd={addFunds} />
      <Text style={[tx(17, fonts.bold), { marginTop: 22 }]}>How do you want to play?</Text>
      <View style={{ marginTop: 12, gap: 10 }}>
        <ModeCard highlighted icon={<MaterialCommunityIcons name="robot-outline" size={24} color={colors.textPrimary} />} title="Play Computer" subtitle="Practice solo against the AI. No other player needed." button="Play" onPress={playComputer} />
        <ModeCard icon={<MaterialCommunityIcons name="account-group-outline" size={24} color={colors.textPrimary} />} title="Challenge Demo Players" subtitle="Play other people using demo funds. No real money is involved." button="Find players" onPress={() => setNotice('Showing online demo players.')} />
      </View>
      <View style={s.sectionHeader}><Text style={tx(17, fonts.bold)}>Choose a game</Text><Text style={tx(11, fonts.regular, colors.textSecondary)}>Selected: {selected.title}</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 18 }}>{GAMES.map(game => <GameCard key={game.id} game={game} selected={game.id === selectedGame} onPress={() => setSelectedGame(game.id)} />)}</ScrollView>
      <View style={s.playersHeader}><View><Text style={tx(17, fonts.bold)}>Demo players online</Text><Text style={[tx(11, fonts.regular, colors.textSecondary), { marginTop: 3 }]}>Challenge someone. Sharpen your skills.</Text></View><Pressable onPress={() => onViewOnlinePlayers?.()} style={s.onlineCount}><View style={s.onlineDot} /><Text style={tx(10, fonts.bold)}>3 online</Text><MaterialIcons name="chevron-right" size={16} color={colors.textSecondary} /></Pressable></View>
      <ScrollView style={s.playersCard} contentContainerStyle={{ flexGrow: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>{DEMO_PLAYERS.map((player, i) => <React.Fragment key={player.id}><PlayerRow player={player} onChallenge={() => challengePlayer(player.name)} />{i < DEMO_PLAYERS.length - 1 && <View style={s.divider} />}</React.Fragment>)}</ScrollView>
      {notice && <Pressable onPress={() => setNotice(null)} style={s.notice}><MaterialCommunityIcons name="information-outline" size={17} color={colors.textPrimary} /><Text style={[tx(11, fonts.medium), { flex: 1, marginLeft: 7 }]}>{notice}</Text><MaterialIcons name="close" size={16} color={colors.textSecondary} /></Pressable>}
      <View style={s.disclaimer}><MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.textSecondary} /><Text style={[tx(10.5, fonts.regular, colors.textSecondary), { flex: 1, marginLeft: 8, lineHeight: 15 }]}>Demo funds are virtual only. They are separate from your Wantiss Wallet, cannot be withdrawn, and can never be converted into real funds.</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  header: { height: 86, paddingHorizontal: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.pageBg },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  demoPill: { marginTop: 4, height: 18, paddingHorizontal: 8, borderRadius: 9, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'center' },
  demoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gameCard.playBg, marginRight: 4 },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  intro: { paddingTop: 12 },
  balanceCard: { marginTop: 18, padding: 17, borderRadius: 20, backgroundColor: colors.hero.gradient.colors[0] },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoCoin: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.45)', alignItems: 'center', justifyContent: 'center' },
  balanceBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  addFunds: { paddingHorizontal: 11, height: 30, borderRadius: 9, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  modeCard: { minHeight: 118, padding: 14, borderRadius: 18, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#EEF0F3' },
  modeCardHighlight: { backgroundColor: '#F4F8F0', borderColor: '#DCE8D2' },
  modeTopRow: { flexDirection: 'row', alignItems: 'center' },
  modeIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  modeButton: { height: 32, paddingHorizontal: 13, borderRadius: 9, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'center' },
  modeButtonHighlight: { backgroundColor: colors.gameCard.playBg },
  gameCard: { width: 155, height: 190, marginRight: 12, marginTop: 13, borderRadius: 20, overflow: 'hidden', backgroundColor: '#E7E9ED' },
  gameCardSelected: { borderWidth: 2, borderColor: colors.streak.shieldPill },
  gameImage: { position: 'absolute', width: '100%', height: '100%' },
  gameOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,.12)' },
  practiceBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, height: 19, borderRadius: 6, backgroundColor: 'rgba(244,241,234,.72)', alignItems: 'center', justifyContent: 'center' },
  durationBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 7, height: 19, borderRadius: 6, backgroundColor: 'rgba(244,241,234,.72)', flexDirection: 'row', alignItems: 'center' },
  gameCopy: { position: 'absolute', left: 12, right: 10, bottom: 13 },
  selectedCheck: { position: 'absolute', top: 35, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { marginTop: 23, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  playersHeader: { marginTop: 23, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onlineCount: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, height: 27, borderRadius: 14, backgroundColor: '#F7F8FA' },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#73B54A', marginRight: 5 },
  playersCard: { maxHeight: 210, borderRadius: 18, backgroundColor: colors.white, borderWidth: .5, borderColor: '#EEF0F3', overflow: 'hidden' },
  playerRow: { minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E7E9ED', alignItems: 'center', justifyContent: 'center' },
  playerNameRow: { flexDirection: 'row', alignItems: 'center' },
  challengeButton: { height: 31, paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: '#F1F2F4', marginLeft: 60 },
  notice: { marginTop: 12, minHeight: 44, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'center' },
  disclaimer: { marginTop: 16, padding: 13, borderRadius: 14, backgroundColor: '#F7F8FA', flexDirection: 'row', alignItems: 'flex-start' },
});