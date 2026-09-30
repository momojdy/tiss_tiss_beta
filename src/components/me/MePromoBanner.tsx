import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPressClaim?: () => void;
};

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function MePromoBanner({ onPressClaim }: Props) {
  const [remaining, setRemaining] = useState(msUntilMidnight());

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <LinearGradient
      colors={['#F9D5E8', '#FCE3F0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.banner}
    >
      <Ionicons name="mail" size={15} color="#E0115F" style={styles.icon} />

      <View style={styles.textWrap}>
        <Text style={styles.text} numberOfLines={1}>
          Tap to claim today's deals, limited time!
        </Text>
        <Text style={styles.timer}>
          Ends in <Text style={styles.timerValue}>{format(remaining)}</Text>
        </Text>
      </View>

      <Pressable style={styles.button} onPress={onPressClaim}>
        <Text style={styles.buttonText}>Claim Now</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    marginHorizontal: 13,
    marginTop: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  icon: { marginRight: 10 },
  textWrap: { flex: 1, marginRight: 8 },
  text: { fontSize: 11, color: '#2A2A2A' },
  timer: { fontSize: 10, color: '#8A6F7D', marginTop: 2 },
  timerValue: {
    fontWeight: '700',
    color: '#C2007A',
    fontVariant: ['tabular-nums'],
  },
  button: {
    width: 58,
    height: 22,
    marginLeft: 10,
    borderRadius: 11,
    backgroundColor: '#C2007A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});