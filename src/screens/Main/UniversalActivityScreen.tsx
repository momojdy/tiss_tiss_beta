import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type Activity = { id: string; feature: string; activity_type: string; title: string; detail: string | null; destination: string | null; destination_id: string | null; occurred_at: string };
export async function recordWantissActivity(event: Pick<Activity, 'feature' | 'activity_type' | 'title'> & Partial<Pick<Activity, 'detail' | 'destination' | 'destination_id'>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('wantiss_activity').insert({ ...event, user_id: user.id });
  if (error) console.warn('Wantiss activity could not be recorded:', error.message);
}
export default function UniversalActivityScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (destination: string, id?: string) => void }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Activity[]>([]);
  const [feature, setFeature] = useState('All');
  const [kind, setKind] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: failure } = await supabase.from('wantiss_activity').select('id,feature,activity_type,title,detail,destination,destination_id,occurred_at').order('occurred_at', { ascending: false }).limit(200);
    setItems((data ?? []) as Activity[]);
    setError(failure?.message ?? '');
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const features = ['All', ...Array.from(new Set(items.map(item => item.feature)))];
  const kinds = ['All', ...Array.from(new Set(items.filter(item => feature === 'All' || item.feature === feature).map(item => item.activity_type)))];
  const visible = items.filter(item => (feature === 'All' || item.feature === feature) && (kind === 'All' || item.activity_type === kind));
  const filters = (values: string[], selected: string, choose: (v: string) => void) => <FlatList horizontal showsHorizontalScrollIndicator={false} data={values} keyExtractor={v => v} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingVertical: 6 }} renderItem={({ item }) => <Pressable onPress={() => choose(item)} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: item === selected ? '#7427D9' : '#F3EEF9' }}><Text style={{ fontSize: 12, fontWeight: '600', color: item === selected ? '#FFFFFF' : '#49395E' }}>{item}</Text></Pressable>} />;
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <View style={{ height: 100, paddingTop: insets.top, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#ECEEF2' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={23} color="#BF008E" /></Pressable>
      <Text style={{ color: '#BF008E', fontSize: 19, fontWeight: '600', marginLeft: 12 }}>My Activity</Text>
    </View>
    {filters(features, feature, v => { setFeature(v); setKind('All'); })}
    {filters(kinds, kind, setKind)}
    {loading ? <ActivityIndicator style={{ marginTop: 32 }} color="#7427D9" /> : error ? <View style={{ padding: 20 }}><Text style={{ color: '#A33A3A' }}>Unable to load activity: {error}</Text><Pressable onPress={() => void refresh()}><Text style={{ color: '#7427D9', marginTop: 12 }}>Retry</Text></Pressable></View> :
    <FlatList data={visible} keyExtractor={item => item.id} onRefresh={() => void refresh()} refreshing={loading} contentContainerStyle={{ padding: 18, gap: 10, flexGrow: 1 }} ListEmptyComponent={<Text style={{ color: '#756C80', textAlign: 'center', marginTop: 48 }}>No activity recorded yet.</Text>} renderItem={({ item }) => <Pressable disabled={!item.destination || !onNavigate} onPress={() => item.destination && onNavigate?.(item.destination, item.destination_id ?? undefined)} style={{ borderBottomWidth: 1, borderBottomColor: '#EEE8F4', paddingVertical: 12, gap: 5 }}><Text style={{ fontSize: 11, color: '#7427D9', fontWeight: '700' }}>{item.feature} · {item.activity_type}</Text><Text style={{ color: '#251B32', fontSize: 15, fontWeight: '600' }}>{item.title}</Text>{item.detail ? <Text style={{ color: '#756C80', fontSize: 12 }}>{item.detail}</Text> : null}<Text style={{ color: '#756C80', fontSize: 11 }}>{new Date(item.occurred_at).toLocaleString()}</Text></Pressable>} />}
  </View>;
}
