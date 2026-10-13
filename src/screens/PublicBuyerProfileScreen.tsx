import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  profile: { display_name?: string | null; wantiss_number?: string | null; avatar_url?: string | null };
  onBack: () => void;
};

export default function PublicBuyerProfileScreen({ profile, onBack }: Props) {
  const name = profile.display_name?.trim() || 'Wantiss member';
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={23} color="#302536" />
        </Pressable>
        <Text style={styles.headerTitle}>Wantiss profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatar}><Ionicons name="person" size={36} color="#B85D91" /></View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>Wantiss member</Text>
          {profile.wantiss_number ? (
            <View style={styles.numberCard}>
              <Text style={styles.label}>WANTISS ID</Text>
              <Text selectable style={styles.number}>{profile.wantiss_number}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={21} color="#B85D91" />
          <Text style={styles.noteText}>This profile was opened from a valid Wantiss QR. Only public profile details are shown here.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF8FC' },
  header: { height: 100, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0E5EC' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#302536', marginLeft: 6, paddingBottom: 8 },
  content: { padding: 16, gap: 14 },
  hero: { alignItems: 'center', padding: 24, borderRadius: 22, backgroundColor: '#FFF0F7', borderWidth: 1, borderColor: '#E8B7D1' },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 14, fontSize: 23, fontWeight: '800', color: '#302536', textAlign: 'center' },
  subtitle: { marginTop: 5, fontSize: 13, color: '#857382' },
  numberCard: { alignSelf: 'stretch', marginTop: 20, padding: 14, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center' },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#B85D91' },
  number: { marginTop: 6, fontSize: 17, fontWeight: '800', color: '#302536' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 15, borderRadius: 16, backgroundColor: '#FFF' },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#766878' },
});
