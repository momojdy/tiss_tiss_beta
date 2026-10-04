import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { supabase } from '../lib/supabase';

type Entry = { rank: number; name: string; wins: number; photoUrl?: string; isYou?: boolean };

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family,
  fontSize: size,
  lineHeight: size * 1.21,
  color,
  includeFontPadding: false,
});

function Avatar({ entry }: { entry: Entry }) {
  const initials = entry.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  return (
    <View style={[styles.avatar, entry.isYou && styles.youAvatar]}>
      {entry.photoUrl ? <Image source={{ uri: entry.photoUrl }} style={styles.avatarImage} /> : <Text style={tx(11, fonts.bold, colors.rankings.avatarText)}>{initials || 'Y'}</Text>}
    </View>
  );
}

function RankRow({ entry }: { entry: Entry }) {
  return (
    <View style={[styles.row, entry.isYou && styles.youRow]}>
      <View style={styles.rank}><Text style={tx(13, fonts.bold, entry.rank <= 3 ? colors.rankings.rankTop : colors.rankings.rankMuted)}>{entry.rank}</Text></View>
      <Avatar entry={entry} />
      <Text numberOfLines={1} style={[tx(14, fonts.semibold, colors.rankings.text), { flex: 1, marginLeft: 12 }]}>{entry.name}</Text>
      <View style={styles.wins}><MaterialIcons name="local-fire-department" size={13} color={colors.rankings.flamePillText} /><Text style={[tx(11.5, fonts.bold, colors.rankings.flamePillText), { marginLeft: 4 }]}>{entry.wins}</Text></View>
    </View>
  );
}

export default function FrenziesRankingScreen({ onBack }: { onBack?: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.rpc('frenzies_get_leaderboard');
      if (!mounted) return;
      if (!error) {
        const rows = (data ?? []) as Array<{ rank: number; name: string; wins: number; avatar_url: string | null; is_you: boolean }>;
        setEntries(rows.map((row) => ({
          rank: row.rank,
          name: row.is_you ? 'You' : row.name,
          wins: row.wins ?? 0,
          photoUrl: row.avatar_url ?? undefined,
          isYou: row.is_you,
        })));
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const hasPlayers = entries.some((e) => e.wins > 0);

  return (
    <View style={styles.safe}>
      <FrenziesHeader title="Rankings" onBack={onBack} showPoints={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={tx(22, fonts.bold)}>Frenzies Rankings</Text>
          <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 6 }]}>See who is climbing the leaderboard.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={tx(14, fonts.bold)}>Leaderboard</Text>
            <View style={styles.fireLabel}><MaterialIcons name="local-fire-department" size={14} color={colors.rankings.flamePillText} /><Text style={[tx(11, fonts.semibold, colors.rankings.flamePillText), { marginLeft: 4 }]}>Wins</Text></View>
          </View>
          {loading ? (
            <View style={styles.empty}><Text style={tx(13, fonts.regular, colors.textSecondary)}>Loading rankings…</Text></View>
          ) : !hasPlayers ? (
            <View style={styles.empty}>
              <Text style={tx(14, fonts.semibold)}>Be the first to climb the leaderboard</Text>
              <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 5, textAlign: 'center' }]}>Play Frenzies games to earn wins and move up.</Text>
            </View>
          ) : (
            entries.map((entry, index) => <RankRow key={entry.isYou ? 'you' : String(entry.rank)} entry={entry} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  intro: { paddingTop: 14, paddingBottom: 18 },
  card: { backgroundColor: colors.rankings.cardBg, borderRadius: colors.rankings.cardRadius ?? 20, borderWidth: 1, borderColor: colors.rankings.cardBorder, overflow: 'hidden' },
  cardHeader: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.rankings.rowBorder },
  fireLabel: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.rankings.flamePillBg },
  row: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.rankings.rowBorder },
  youRow: { backgroundColor: colors.rankings.youTint },
  rank: { width: 28, alignItems: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.rankings.avatarBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  youAvatar: { borderWidth: 2, borderColor: colors.rankings.youRing },
  avatarImage: { width: 34, height: 34 },
  wins: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.rankings.flamePillBg },
  empty: { minHeight: 180, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
});
