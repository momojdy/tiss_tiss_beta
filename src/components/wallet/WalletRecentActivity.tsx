import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type Filter = 'All' | 'Money' | 'Points' | 'Transfers';

type ActivityItem = {
  id: string;
  activityCategory: string;
  sourceFeature: string;
  transactionType: string;
  direction: string;
  moneyAmount: number;
  moneyCurrency?: string;
  pointsAmount: number;
  title: string;
  subtitle?: string;
  createdAt: Date;
};

const FILTERS: Filter[] = ['All', 'Money', 'Points', 'Transfers'];

function iconForActivity(a: ActivityItem): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (a.transactionType.toLowerCase()) {
    case 'send': return 'arrow-top-right';
    case 'receive':
    case 'request': return 'arrow-bottom-left';
    case 'transfer': return 'swap-horizontal';
    case 'topup': return 'credit-card-plus-outline';
    case 'withdraw': return 'bank-outline';
    case 'airtime': return 'cellphone';
  }
  switch (a.sourceFeature.toLowerCase()) {
    case 'goodies': return 'shopping-bag-outline';
    case 'konsoliss': return 'package-variant-closed';
    case 'woulib':
    case 'rideza': return 'car-outline';
    case 'stayz': return 'hotel';
    case 'flyz': return 'airplane-takeoff';
    case 'habita': return 'home-city-outline';
    case 'services': return 'hammer-wrench';
    case 'arts_litts': return 'palette-outline';
    case 'streamz': return 'play-circle-outline';
    case 'gatherz': return 'calendar-star';
    case 'eventiss':
    case 'lutz': return 'ticket-confirmation-outline';
    case 'glowz': return 'spa-outline';
    case 'dealz': return 'tag-outline';
    case 'prezo':
    case 'rewards': return 'gift-outline';
    case 'globiz': return 'earth';
    case 'bidz': return 'gavel';
    case 'frenzies': return 'gamepad-variant-outline';
    case 'points': return 'star-four-points-outline';
    default: return 'wallet-outline';
  }
}

function parseRow(row: Record<string, unknown>): ActivityItem {
  return {
    id: String(row.id ?? ''),
    activityCategory: String(row.activity_category ?? 'money'),
    sourceFeature: String(row.source_feature ?? 'wallet'),
    transactionType: String(row.transaction_type ?? 'transaction'),
    direction: String(row.direction ?? 'credit'),
    moneyAmount: Number(row.money_amount ?? 0),
    moneyCurrency: row.money_currency ? String(row.money_currency) : undefined,
    pointsAmount: Number(row.points_amount ?? 0),
    title: String(row.title ?? 'Wallet transaction'),
    subtitle: row.subtitle ? String(row.subtitle) : undefined,
    createdAt: new Date(String(row.created_at ?? new Date().toISOString())),
  };
}

function formatDate(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).replace(',', ' ·');
}

export default function WalletRecentActivity() {
  const [selectedFilter, setSelectedFilter] = useState<Filter>('All');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(false);
      const { data, error: rpcError } = await supabase.rpc('get_my_wallet_activity', {
        p_filter: 'all',
        p_limit: 7,
        p_offset: 0,
      });
      if (!active) return;
      if (rpcError) {
        setError(true);
        setActivities([]);
      } else {
        setActivities(Array.isArray(data) ? data.map(row => parseRow(row as Record<string, unknown>)) : []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (selectedFilter === 'Money') return a.activityCategory === 'money' || a.transactionType === 'transfer';
      if (selectedFilter === 'Points') return a.activityCategory === 'points';
      if (selectedFilter === 'Transfers') return ['send', 'receive', 'transfer', 'request', 'money_request'].includes(a.transactionType);
      return true;
    });
  }, [activities, selectedFilter]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>Recent Activity</Text>
        <Pressable><Text style={styles.seeAll}>See all</Text></Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map(filter => {
          const selected = selectedFilter === filter;
          return (
            <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[styles.filter, selected && styles.filterSelected]}>
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {loading ? (
          <View style={styles.state}><ActivityIndicator size="small" color="#3F6B37" /></View>
        ) : error ? (
          <View style={styles.state}><Text style={styles.error}>Unable to load activity.</Text></View>
        ) : filtered.length === 0 ? (
          <View style={styles.state}><Text style={styles.empty}>No recent activity yet.</Text></View>
        ) : (
          filtered.map((activity, index) => {
            const debit = activity.direction.toLowerCase() === 'debit';
            const amount = activity.activityCategory === 'points'
              ? `${debit ? '-' : '+'}${Math.abs(activity.pointsAmount)} pts`
              : `${debit ? '-' : '+'}${Math.abs(activity.moneyAmount).toFixed(2)} ${activity.moneyCurrency ?? 'USD'}`;
            return (
              <Pressable key={activity.id} style={[styles.row, index < filtered.length - 1 && styles.rowDivider]}>
                <View style={[styles.activityIcon, index % 2 === 0 ? styles.circle : styles.rounded, index % 2 === 0 ? styles.iconLight : styles.iconDark]}>
                  <MaterialCommunityIcons name={iconForActivity(activity)} size={20} color={index % 2 === 0 ? '#3F6B37' : '#DCE8D2'} />
                </View>
                <View style={styles.details}>
                  <Text numberOfLines={1} style={styles.title}>{activity.title}</Text>
                  <Text numberOfLines={1} style={styles.subtitle}>{activity.subtitle ?? formatDate(activity.createdAt)}</Text>
                </View>
                <Text style={[styles.amount, { color: debit ? '#1A2517' : '#3F6B37' }]}>{amount}</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: 15, marginTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: 'Manrope_800ExtraBold', fontSize: 18, lineHeight: 22, color: '#1A2517' },
  seeAll: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 16, color: '#3F6B37' },
  filters: { paddingTop: 10, paddingBottom: 12, gap: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#DCE8D2' },
  filterSelected: { backgroundColor: '#1A2517' },
  filterText: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 14, color: '#3F6B37' },
  filterTextSelected: { color: '#FFFFFF' },
  list: { width: '100%' },
  row: { minHeight: 66, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#E4EAE1' },
  activityIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  circle: { borderRadius: 21 },
  rounded: { borderRadius: 12 },
  iconLight: { backgroundColor: '#DCE8D2' },
  iconDark: { backgroundColor: '#3F6B37' },
  details: { flex: 1, marginLeft: 12, minWidth: 0 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 16, color: '#1A2517' },
  subtitle: { marginTop: 4, fontFamily: 'Inter', fontSize: 11.5, lineHeight: 14, color: '#9AA595' },
  amount: { marginLeft: 10, fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 16 },
  state: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: 'Inter', fontSize: 13, lineHeight: 16, color: '#9AA595' },
  error: { fontFamily: 'Inter', fontSize: 13, lineHeight: 16, color: '#B42318' },
});
