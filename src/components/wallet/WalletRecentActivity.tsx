import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const OLIVE = '#1A2517';
const GREEN = '#3F6B37';
const SAGE_TINT = '#DCE8D2';
const MUTED = '#9AA595';
const DIVIDER = '#E4EAE1';
const ERROR_RED = '#D32F2F';

const FILTERS = ['All', 'Money', 'Points', 'Transfers'] as const;
type Filter = (typeof FILTERS)[number];

type ActivityItem = {
  id: string;
  activityCategory: string;
  sourceFeature: string;
  transactionType: string;
  direction: string;
  moneyAmount: number;
  moneyCurrency: string | null;
  pointsAmount: number;
  status: string;
  title: string;
  subtitle: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

const str = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

const parseDouble = (v: unknown): number => {
  const s = str(v) ?? '0';
  if (s.trim() === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const parseInt0 = (v: unknown): number => {
  const s = (str(v) ?? '0').trim();
  return /^[+-]?\d+$/.test(s) ? parseInt(s, 10) : 0;
};

const categoryName = (a: ActivityItem) =>
  a.activityCategory === 'points' ? 'points' : 'money';

function fromRpcRow(row: Record<string, unknown>): ActivityItem {
  if (row.id === null || row.id === undefined) {
    throw new Error('Activity row has no id.');
  }

  const created = new Date(str(row.created_at) ?? '');

  return {
    id: String(row.id),
    activityCategory: str(row.activity_category) ?? 'money',
    sourceFeature: str(row.source_feature) ?? 'wallet',
    transactionType: str(row.transaction_type) ?? 'transaction',
    direction: str(row.direction) ?? 'credit',
    moneyAmount: parseDouble(row.money_amount),
    moneyCurrency: str(row.money_currency),
    pointsAmount: parseInt0(row.points_amount),
    status: str(row.status) ?? 'completed',
    title: str(row.title) ?? 'Wallet transaction',
    subtitle: str(row.subtitle),
    referenceId: str(row.reference_id),
    metadata:
      row.metadata &&
      typeof row.metadata === 'object' &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: Number.isNaN(created.getTime()) ? new Date() : created,
  };
}

type IconSpec = { name: string };

const out = (name: string): IconSpec => ({ name });
const rnd = (name: string): IconSpec => ({ name });

function iconForActivity(a: ActivityItem): IconSpec {
  const type = a.transactionType.toLowerCase();
  const feature = a.sourceFeature.toLowerCase();

  switch (type) {
    case 'send':
      return rnd('arrow-top-right');
    case 'receive':
    case 'request':
      return rnd('arrow-bottom-left');
    case 'transfer':
      return rnd('swap-horizontal');
    case 'topup':
      return out('credit-card-outline');
    case 'withdraw':
      return out('bank-outline');
    case 'airtime':
      return out('cellphone');
  }

  switch (feature) {
    case 'goodies':
      return out('shopping-outline');
    case 'konsoliss':
      return out('shopping-outline');
    case 'woulib':
    case 'rideza':
      return out('car-outline');
    case 'stayz':
      return out('bed-outline');
    case 'flyz':
      return out('airplane-takeoff');
    case 'habita':
      return out('home-outline');
    case 'services':
      return out('hammer-wrench');
    case 'arts_litts':
      return out('palette-outline');
    case 'streamz':
      return out('play-circle-outline');
    case 'gatherz':
      return out('calendar-outline');
    case 'eventiss':
    case 'lutz':
      return out('ticket-outline');
    case 'glowz':
      return out('spa-outline');
    case 'dealz':
      return out('tag-outline');
    case 'prezo':
    case 'rewards':
      return out('gift-outline');
    case 'globiz':
      return out('earth');
    case 'bidz':
      return out('gavel');
    case 'frenzies':
      return out('gamepad-variant-outline');
    case 'points':
      return rnd('star-four-points-outline');
    case 'wallet':
    default:
      return out('wallet-outline');
  }
}

function MaterialGlyph({
  spec,
  size,
  color,
}: {
  spec: IconSpec;
  size: number;
  color: string;
}) {
  return <MaterialCommunityIcons name={spec.name as any} size={size} color={color} />;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const isDebit = (a: ActivityItem) =>
  a.direction.toLowerCase() === 'debit';

const formatMoney = (a: ActivityItem) =>
  `${isDebit(a) ? '-' : '+'}${Math.abs(a.moneyAmount).toFixed(2)} ${a.moneyCurrency ?? 'USD'}`;

const formatPoints = (a: ActivityItem) =>
  `${isDebit(a) ? '-' : '+'}${Math.abs(a.pointsAmount)} pts`;

function formatDate(d: Date) {
  const h = d.getHours();
  const hour = h % 12 === 0 ? 12 : h % 12;
  const minute = String(d.getMinutes()).padStart(2, '0');

  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${hour}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
}

type Props = {
  onOpenActivity?: (params: {
    activityId: string;
    activityCategory: string;
  }) => void;
  onSeeAll?: () => void;
};

export default function WalletRecentActivity({
  onOpenActivity,
  onSeeAll,
}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<Filter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const mounted = useRef(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_my_wallet_activity',
        {
          p_filter: 'all',
          p_limit: 7,
          p_offset: 0,
        },
      );

      if (rpcError) throw rpcError;
      if (!Array.isArray(data)) {
        throw new Error('Invalid activity response.');
      }

      const items = data.map(row =>
        fromRpcRow(row as Record<string, unknown>),
      );

      if (!mounted.current) return;

      setActivities(items);
      setLoading(false);
    } catch (e) {
      if (!mounted.current) return;

      setLoading(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadActivities();

    return () => {
      mounted.current = false;
    };
  }, [loadActivities]);

  const filtered = useMemo(() => {
    switch (selectedFilter) {
      case 'Money':
        return activities.filter(
          a =>
            a.activityCategory === 'money' ||
            a.transactionType === 'transfer',
        );
      case 'Points':
        return activities.filter(
          a => a.activityCategory === 'points',
        );
      case 'Transfers':
        return activities.filter(a =>
          [
            'send',
            'receive',
            'transfer',
            'request',
            'money_request',
          ].includes(a.transactionType),
        );
      default:
        return activities;
    }
  }, [activities, selectedFilter]);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Recent Activity</Text>
        <Pressable onPress={onSeeAll} style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {FILTERS.map(filter => {
          const selected = selectedFilter === filter;

          return (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={[
                styles.chip,
                selected && styles.chipSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.stateBox28}>
          <ActivityIndicator
            size="small"
            color={GREEN}
            style={{ transform: [{ scale: 1.1 }] }}
          />
        </View>
      ) : error !== null ? (
        <View style={styles.stateBox20}>
          <Text style={[styles.stateText, styles.errorText]}>
            Unable to load activity.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.stateBox24}>
          <Text style={[styles.stateText, styles.emptyText]}>
            No recent activity yet.
          </Text>
        </View>
      ) : (
        <View>
          {filtered.map((activity, index) => {
            const even = index % 2 === 0;
            const isLast = index === filtered.length - 1;
            const isPoints = activity.activityCategory === 'points';

            return (
              <Pressable
                key={activity.id}
                onPress={() =>
                  onOpenActivity?.({
                    activityId: activity.id,
                    activityCategory: categoryName(activity),
                  })
                }
                style={({ pressed }) => [
                  styles.row,
                  !isLast && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    even ? styles.iconLight : styles.iconDark,
                    even ? styles.circle : styles.rounded,
                  ]}
                >
                  <MaterialGlyph
                    spec={iconForActivity(activity)}
                    size={20}
                    color={even ? GREEN : SAGE_TINT}
                  />
                </View>

                <View style={styles.rowText}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.title}
                  >
                    {activity.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.subtitle}
                  >
                    {activity.subtitle ?? formatDate(activity.createdAt)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.amount,
                    {
                      color: isDebit(activity) ? OLIVE : GREEN,
                    },
                  ]}
                >
                  {isPoints
                    ? formatPoints(activity)
                    : formatMoney(activity)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    marginTop: 18,
    paddingHorizontal: 15,
  },
  headerRow: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: OLIVE,
    fontSize: 18,
    lineHeight: 24.6,
    fontFamily: 'Manrope_800ExtraBold',
    includeFontPadding: false,
  },
  seeAll: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllText: {
    color: GREEN,
    fontSize: 13,
    lineHeight: 15.7,
    fontFamily: 'Inter_700Bold',
    includeFontPadding: false,
  },
  chipScroll: {
    flexGrow: 0,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SAGE_TINT,
  },
  chipSelected: {
    backgroundColor: OLIVE,
  },
  chipText: {
    fontSize: 12,
    lineHeight: 14.5,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
    color: GREEN,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  stateBox28: {
    marginTop: 12,
    paddingVertical: 28,
    alignItems: 'center',
  },
  stateBox24: {
    marginTop: 12,
    paddingVertical: 24,
    alignItems: 'center',
  },
  stateBox20: {
    marginTop: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  stateText: {
    fontSize: 13,
    lineHeight: 15.7,
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
  emptyText: {
    color: MUTED,
  },
  errorText: {
    color: ERROR_RED,
  },
  row: {
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPressed: {
    backgroundColor: 'rgba(26, 37, 23, 0.05)',
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderRadius: 21,
  },
  rounded: {
    borderRadius: 12,
  },
  iconLight: {
    backgroundColor: SAGE_TINT,
  },
  iconDark: {
    backgroundColor: GREEN,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  title: {
    color: OLIVE,
    fontSize: 13,
    lineHeight: 15.7,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
  subtitle: {
    marginTop: 4,
    color: MUTED,
    fontSize: 11.5,
    lineHeight: 13.9,
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
  amount: {
    marginLeft: 10,
    fontSize: 13,
    lineHeight: 15.7,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
});
