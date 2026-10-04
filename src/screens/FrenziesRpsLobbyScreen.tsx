import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors, sizes } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import { assets } from '../theme/frenziesAssets';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { supabase } from '../lib/supabase';

type Props = { onBack?: () => void; onDemoPress?: () => void };

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family, fontSize: size, lineHeight: size * 1.22, color, includeFontPadding: false,
});

export default function FrenziesRpsLobbyScreen({ onBack, onDemoPress }: Props) {
  const [mode, setMode] = useState<'demo' | 'live' | 'tournament'>('demo');
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadPoints = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('frenzies_player_stats').select('lifetime_points').eq('user_id', user.id).maybeSingle();
      if (mounted) setPoints(data?.lifetime_points ?? 0);
    };
    loadPoints();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={s.safe}>
      <FrenziesHeader title="Rock Paper Scissors" points={points} onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.gameHero}>
          <Image source={assets.rps} style={s.heroImage} resizeMode="cover" />
          <View style={s.heroShade} />
          <View style={s.pvpBadge}><Text style={tx(10, fonts.medium)}>PvP</Text></View>
          <View style={s.timeBadge}>
            <MaterialCommunityIcons name="timer-outline" size={12} color={colors.textPrimary} />
            <Text style={[tx(10, fonts.medium), { marginLeft: 4 }]}>2min</Text>
          </View>
          <View style={s.heroBottom}>
            <Text style={tx(25, fonts.bold, colors.white)}>Rock Paper Scissors</Text>
            <Text style={[tx(12, fonts.regular, colors.white), { marginTop: 4, opacity: .86 }]}>
              Quick rounds. Read your opponent. Make your move.
            </Text>
          </View>
        </View>

        <View style={s.modeTitle}>
          <Text style={tx(20, fonts.bold)}>How do you want to play?</Text>
          <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 5 }]}>
            Choose a mode before entering the match.
          </Text>
        </View>

        <Pressable onPress={() => setMode('demo')} style={[s.modeCard, mode === 'demo' && s.modeSelected]}>
          <View style={[s.modeIcon, { backgroundColor: '#DCE8D2' }]}>
            <MaterialCommunityIcons name="gamepad-variant-outline" size={25} color={colors.textPrimary} />
          </View>
          <View style={s.modeCopy}>
            <View style={s.modeNameRow}>
              <Text style={tx(16, fonts.bold)}>Demo Mode</Text>
              <View style={s.recommended}><Text style={tx(9, fonts.bold)}>PRACTICE</Text></View>
            </View>
            <Text style={[tx(11.5, fonts.regular, colors.textSecondary), s.modeDescription]}>
              Practice with virtual demo funds. Challenge the AI or another demo player. Replenish your virtual assets anytime.
            </Text>
          </View>
          {mode === 'demo' && <View style={s.check}><MaterialIcons name="check" size={15} color={colors.textPrimary} /></View>}
        </Pressable>

        <Pressable onPress={() => setMode('live')} style={[s.modeCard, mode === 'live' && s.modeSelected]}>
          <View style={[s.modeIcon, { backgroundColor: '#FBE1D2' }]}>
            <MaterialCommunityIcons name="sword-cross" size={24} color={colors.textPrimary} />
          </View>
          <View style={s.modeCopy}>
            <Text style={tx(16, fonts.bold)}>Live Challenge</Text>
            <Text style={[tx(11.5, fonts.regular, colors.textSecondary), s.modeDescription]}>
              Challenge an online player or create an open challenge using real Wallet funds.
            </Text>
            <Text style={[tx(11, fonts.semibold, colors.textPrimary), { marginTop: 7 }]}>Minimum stake applies · 10% platform fee</Text>
          </View>
          {mode === 'live' && <View style={s.check}><MaterialIcons name="check" size={15} color={colors.textPrimary} /></View>}
        </Pressable>

        <Pressable onPress={() => setMode('tournament')} style={[s.modeCard, mode === 'tournament' && s.modeSelected]}>
          <View style={[s.modeIcon, { backgroundColor: '#F3E8C9' }]}>
            <MaterialCommunityIcons name="trophy-outline" size={25} color={colors.textPrimary} />
          </View>
          <View style={s.modeCopy}>
            <Text style={tx(16, fonts.bold)}>Tournament</Text>
            <Text style={[tx(11.5, fonts.regular, colors.textSecondary), s.modeDescription]}>
              Enter a scheduled 16-player single-elimination Frenzies tournament.
            </Text>
            <Text style={[tx(11, fonts.semibold, colors.textPrimary), { marginTop: 7 }]}>Paid entry · 16 players · 10% platform fee</Text>
          </View>
          {mode === 'tournament' && <View style={s.check}><MaterialIcons name="check" size={15} color={colors.textPrimary} /></View>}
        </Pressable>

        {mode === 'demo' && (
          <View style={s.demoInfo}>
            <View style={s.infoIcon}><MaterialCommunityIcons name="shield-check-outline" size={19} color={colors.textPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={tx(13, fonts.bold)}>Demo funds are separate</Text>
              <Text style={[tx(11, fonts.regular, colors.textSecondary), { marginTop: 4, lineHeight: 16 }]}>
                Your demo balance lives only in Demo Mode. It is not your Wantiss Wallet and has no cash value.
              </Text>
            </View>
          </View>
        )}

        {mode === 'live' && (
          <View style={s.liveInfo}>
            <Text style={tx(13, fonts.bold)}>Live Challenge</Text>
            <Text style={[tx(11, fonts.regular, colors.textSecondary), { marginTop: 5, lineHeight: 16 }]}>
              Browse online challenges or create your own. Your chosen stake must be at least the platform minimum. Open challenges expire after 7 days and the locked stake is returned if nobody accepts.
            </Text>
          </View>
        )}

        {mode === 'tournament' && (
          <View style={s.tournamentInfo}>
            <View style={s.tournamentStat}><Text style={tx(11, fonts.regular, colors.textSecondary)}>Format</Text><Text style={[tx(14, fonts.bold), { marginTop: 3 }]}>16 players</Text></View>
            <View style={s.tournamentStat}><Text style={tx(11, fonts.regular, colors.textSecondary)}>Rounds</Text><Text style={[tx(14, fonts.bold), { marginTop: 3 }]}>4</Text></View>
            <View style={s.tournamentStat}><Text style={tx(11, fonts.regular, colors.textSecondary)}>Type</Text><Text style={[tx(14, fonts.bold), { marginTop: 3 }]}>Single elimination</Text></View>
          </View>
        )}

        <Pressable style={s.continueButton} onPress={mode === 'demo' ? onDemoPress : undefined}>
          <Text style={tx(15, fonts.bold, colors.white)}>
            {mode === 'demo' ? 'Continue to Demo' : mode === 'live' ? 'Find a Challenge' : 'View Tournaments'}
          </Text>
          <MaterialIcons name="arrow-forward" size={19} color={colors.white} />
        </Pressable>

        <Text style={s.footerNote}>
          {mode === 'demo'
            ? 'Practice with virtual funds against the computer or other demo players.'
            : mode === 'live'
              ? 'Real-money play uses your Wantiss Wallet.'
              : 'Tournament entry is paid and the tournament starts when scheduled.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 18, paddingBottom: 38 },
  gameHero: { height: 260, borderRadius: 22, overflow: 'hidden', backgroundColor: '#E7E9ED' },
  heroImage: { position: 'absolute', width: '100%', height: '100%' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,.20)' },
  pvpBadge: { position: 'absolute', left: 12, top: 12, height: 23, paddingHorizontal: 9, borderRadius: 7, backgroundColor: 'rgba(244,241,234,.72)', justifyContent: 'center', alignItems: 'center' },
  timeBadge: { position: 'absolute', right: 12, top: 12, height: 23, paddingHorizontal: 9, borderRadius: 7, backgroundColor: 'rgba(244,241,234,.72)', flexDirection: 'row', alignItems: 'center' },
  heroBottom: { position: 'absolute', left: 16, right: 16, bottom: 17 },
  modeTitle: { marginTop: 24, marginBottom: 13 },
  modeCard: { minHeight: 122, marginBottom: 10, padding: 14, borderRadius: 18, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#EEF0F3', flexDirection: 'row', alignItems: 'flex-start' },
  modeSelected: { borderColor: colors.streak.shieldPill, backgroundColor: '#F8FBF5' },
  modeIcon: { width: 45, height: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modeCopy: { flex: 1, marginLeft: 12, paddingRight: 23 },
  modeNameRow: { flexDirection: 'row', alignItems: 'center' },
  recommended: { marginLeft: 7, height: 19, paddingHorizontal: 7, borderRadius: 9, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  modeDescription: { marginTop: 6, lineHeight: 16 },
  check: { position: 'absolute', right: 13, top: 14, width: 23, height: 23, borderRadius: 12, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  demoInfo: { marginTop: 4, padding: 13, borderRadius: 15, backgroundColor: '#F4F8F0', flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  liveInfo: { marginTop: 4, padding: 14, borderRadius: 15, backgroundColor: '#FBEFE8' },
  tournamentInfo: { marginTop: 4, padding: 14, borderRadius: 15, backgroundColor: '#F8F3E7', flexDirection: 'row', justifyContent: 'space-between' },
  tournamentStat: { flex: 1 },
  continueButton: { height: 52, marginTop: 16, borderRadius: 14, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  footerNote: { marginTop: 11, textAlign: 'center', ...tx(10.5, fonts.regular, colors.textSecondary) },
});
