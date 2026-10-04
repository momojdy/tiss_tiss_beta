import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';
const tx = (size: number, family: string, color: string = colors.textPrimary) => ({ fontFamily: family, fontSize: size, lineHeight: size * 1.21, color, includeFontPadding: false });
export default function FrenziesChallengeStatusScreen({ onBack, ready = false, opponent = 'Maya', game = 'Rock Paper Scissors' }: { onBack?: () => void; ready?: boolean; opponent?: string; game?: string }) {
  const [seconds, setSeconds] = useState(600);
  useEffect(() => { if (!ready) return; const timer = setInterval(() => setSeconds(v => Math.max(0, v - 1)), 1000); return () => clearInterval(timer); }, [ready]);
  const minutes = Math.floor(seconds / 60); const secs = String(seconds % 60).padStart(2, '0');
  return <View style={s.safe}>
    <FrenziesHeader title={ready ? 'Match Ready' : 'Challenge Accepted'} onBack={onBack} showPoints={false} />
    <View style={s.content}><View style={s.glass}>
      <View style={s.icon}><MaterialIcons name={ready ? 'sports-esports' : 'schedule'} size={28} color="#EE6B2E" /></View>
      <Text style={tx(23, fonts.bold)}>{ready ? opponent + ' is available' : 'Waiting for ' + opponent}</Text>
      <Text style={[tx(13, fonts.regular, colors.textSecondary), { marginTop: 7, lineHeight: 19 }]}>{ready ? 'Your ' + game + ' challenge is ready. You have 10 minutes to respond.' : 'Your challenge is accepted. We will let you know when ' + opponent + ' is available.'}</Text>
      {ready && <View style={s.timer}><Text style={tx(30, fonts.bold, '#EE6B2E')}>{minutes + ':' + secs}</Text><Text style={[tx(10.5, fonts.medium, colors.textSecondary), { marginTop: 2 }]}>time remaining</Text></View>}
      <Pressable style={s.primary} onPress={onBack}><Text style={tx(13, fonts.bold, colors.white)}>{ready ? 'Open match' : 'Back to Frenzies'}</Text></Pressable>
    </View></View>
  </View>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.pageBg }, content: { flex: 1, paddingHorizontal: 18, paddingTop: 14 }, glass: { padding: 20, borderRadius: 24, backgroundColor: 'rgba(238,107,46,0.12)', borderWidth: 1, borderColor: 'rgba(238,107,46,0.28)' }, icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(238,107,46,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, timer: { marginTop: 22, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.58)' }, primary: { marginTop: 18, height: 44, borderRadius: 12, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center' } });