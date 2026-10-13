import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onBack: () => void;
};

export default function StayzGuestScreen({ onBack }: Props) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>‹  Back</Text>
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏨</Text>
        <Text style={styles.title}>Stayz</Text>
        <Text style={styles.subtitle}>Discover stays that feel like home.</Text>
        <Text style={styles.note}>The guest booking experience is being connected.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  backButton: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, alignSelf: 'flex-start' },
  backText: { fontSize: 16, color: '#6B5CE7', fontWeight: '600' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '700', color: '#222222' },
  subtitle: { marginTop: 10, fontSize: 16, color: '#555555', textAlign: 'center' },
  note: { marginTop: 24, fontSize: 13, color: '#888888', textAlign: 'center' },
});
