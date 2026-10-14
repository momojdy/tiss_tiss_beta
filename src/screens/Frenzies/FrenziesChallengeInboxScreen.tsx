import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';

export type Challenge = { id: string; name: string; game: string; createdAt: string; expiresIn: string };
export const DEMO_CHALLENGES: Challenge[] = [
  { id: 'maya-rps', name: 'Maya', game: 'Rock Paper Scissors', createdAt: 'Today, 2:00 PM', expiresIn: '23h 18m left' },
  { id: 'jay-korido', name: 'Jay', game: 'Koridò', createdAt: 'Today, 1:42 PM', expiresIn: '23h left' },
];

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({ fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false });

function ChallengeRow({ item, onAccept, onDecline }: { item: Challenge; onAccept: () => void; onDecline: () => void }) {
  return <View style={s.row}>
    <View style={s.avatar}><Text style={tx(12, fonts.bold, colors.textSecondary)}>{item.name.slice(0, 1)}</Text></View>
    <View style={{ flex: 1, marginLeft: 11 }}>
      <Text style={tx(14, fonts.bold)}>{item.name} challenged you</Text>
      <Text style={[tx(11, fonts.regular, colors.textSecondary), { marginTop: 3 }]}>{item.game}</Text>
      <Text style={[tx(10, fonts.regular, '#8A6A59'), { marginTop: 5 }]}>{item.expiresIn}</Text>
    </View>
    <View style={s.actions}>
      <Pressable onPress={onDecline} style={s.decline}><Text style={tx(10.5, fonts.bold, colors.textSecondary)}>Decline</Text></Pressable>
      <Pressable onPress={onAccept} style={s.accept}><Text style={tx(10.5, fonts.bold, colors.white)}>Accept</Text></Pressable>
    </View>
  </View>;
}

export default function FrenziesChallengeInboxScreen({ onBack, onAccept, onDecline }: { onBack?: () => void; onAccept?: (challenge: Challenge) => void; onDecline?: (challenge: Challenge) => void }) {
  return <View style={s.safe}>
    <FrenziesHeader title="Challenges" onBack={onBack} showPoints={false} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={tx(24, fonts.bold)}>Challenges waiting.</Text>
        <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 6, lineHeight: 19 }]}>You can accept or decline each challenge. Clearing a phone notification never removes a pending challenge.</Text>
      </View>
      <View style={s.card}>{DEMO_CHALLENGES.map((item, i) => <React.Fragment key={item.id}><ChallengeRow item={item} onAccept={() => onAccept?.(item)} onDecline={() => onDecline?.(item)} />{i < DEMO_CHALLENGES.length - 1 && <View style={s.divider} />}</React.Fragment>)}</View>
      <View style={s.note}><MaterialIcons name="schedule" size={17} color="#8A6A59" /><Text style={[tx(11, fonts.regular, '#765A4B'), { flex: 1, marginLeft: 8, lineHeight: 16 }]}>Offline challenges stay available for 24 hours. Once accepted, a match only stays open for 10 minutes after your opponent becomes available.</Text></View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg }, content: { paddingHorizontal: 18, paddingBottom: 40 }, hero: { paddingTop: 14 },
  card: { marginTop: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 0.5, borderColor: 'rgba(238,107,46,0.22)', overflow: 'hidden' },
  row: { minHeight: 112, padding: 13, flexDirection: 'row', alignItems: 'center' }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E7E9ED', alignItems: 'center', justifyContent: 'center' },
  actions: { marginLeft: 8, gap: 7 }, decline: { height: 30, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#EEF0F3', alignItems: 'center', justifyContent: 'center' },
  accept: { height: 30, paddingHorizontal: 12, borderRadius: 9, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: 'rgba(238,107,46,0.12)', marginLeft: 66 }, note: { marginTop: 16, padding: 13, borderRadius: 16, backgroundColor: 'rgba(238,107,46,0.08)', flexDirection: 'row', alignItems: 'center' },
});