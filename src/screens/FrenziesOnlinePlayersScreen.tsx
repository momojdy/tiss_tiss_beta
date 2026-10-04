import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';

const PLAYERS = [
  { id: 'maya', name: 'Maya', game: 'Rock Paper Scissors' },
  { id: 'jay', name: 'Jay', game: 'Koridò' },
  { id: 'niko', name: 'Niko', game: 'Load Lock Ship' },
];

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false,
});

export default function FrenziesOnlinePlayersScreen({ onBack }: { onBack?: () => void }) {
  return (
    <SafeAreaView style={s.safe}>
      <FrenziesHeader title="Online Players" onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Text style={tx(24, fonts.bold)}>Find someone to challenge.</Text>
        <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 6, lineHeight: 19 }]}>
          Choose an online player and sharpen your skills with demo funds.
        </Text>
        <View style={s.card}>
          {PLAYERS.map((player, i) => (
            <React.Fragment key={player.id}>
              <View style={s.row}>
                <View style={s.avatar}><Text style={tx(12, fonts.bold, colors.textSecondary)}>{player.name.slice(0, 1)}</Text></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={s.nameRow}>
                    <Text style={tx(13, fonts.semibold)}>{player.name}</Text>
                    <View style={s.dot} />
                    <Text style={tx(10, fonts.regular, colors.textSecondary)}>Online</Text>
                  </View>
                  <Text style={[tx(10.5, fonts.regular, colors.textSecondary), { marginTop: 3 }]}>{player.game}</Text>
                </View>
                <Pressable style={s.challenge}><Text style={tx(11, fonts.bold, colors.white)}>Challenge</Text></Pressable>
              </View>
              {i < PLAYERS.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40 },
  card: { marginTop: 18, borderRadius: 18, backgroundColor: colors.white, borderWidth: 0.5, borderColor: '#EEF0F3', overflow: 'hidden' },
  row: { minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E7E9ED', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#73B54A', marginLeft: 7, marginRight: 5 },
  challenge: { height: 31, paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: '#F1F2F4', marginLeft: 60 },
});