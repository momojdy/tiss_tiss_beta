import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SetupRequiredScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Wantiss needs Supabase configuration</Text>
        <Text style={styles.body}>
          The preview server is running. Add these settings for the existing
          Supabase project in Replit’s Secrets tool, then stop and run the app again:
        </Text>
        <Text style={styles.setting}>EXPO_PUBLIC_SUPABASE_URL</Text>
        <Text style={styles.setting}>EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY</Text>
        <Text style={styles.body}>
          Use only a client-safe publishable or legacy anon key, never a
          service-role key. Expo includes EXPO_PUBLIC settings in the client app.
        </Text>
        <Text style={styles.body}>
          Sign-in and database features remain unavailable until configuration
          is supplied. No demo credentials or authentication bypass are in use.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F1F2',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 600 },
  title: { fontSize: 24, fontWeight: '700', color: '#16181B', marginBottom: 16 },
  body: { fontSize: 16, lineHeight: 24, color: '#55545A', marginBottom: 16 },
  setting: { fontSize: 14, fontWeight: '600', color: '#16181B', marginBottom: 12 },
});
