import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { supabase } from '../../lib/supabase';

const SAGE_TINT = '#DCE8D2';
const OLIVE = '#1A2517';
const OLIVE_SOFT = '#5C6B57';
const MINIMUM_PROGRESS = 0.01;
const DEFAULT_MILESTONE_TARGET = 15000;
const DEFAULT_POINTS_PER_DOLLAR = 87;
const DEFAULT_MILESTONE_BONUS = 50;

type Props = {
  onUsePointsPress?: () => void;
};

type WalletSummary = {
  points_balance: number;
  points_earned_today: number;
  points_earned_month: number;
  lifetime_qualifying_points: number;
  milestone_progress: number;
  milestone_target: number;
  next_milestone: number;
  completed_milestones: number;
  milestone_bonus: number;
  points_per_dollar: number;
  wantiss_value: number;
};

function numberValue(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatPoints(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString('en-US');
}

function formatMoney(value: number) {
  return Math.max(0, value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function WalletPoints({ onUsePointsPress }: Props) {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mounted = useRef(false);
  const isFetching = useRef(false);

  const [manropeSemiLoaded] = useFonts({ Manrope_600SemiBold });
  const [manropeBoldLoaded] = useFonts({ Manrope_700Bold });
  const [manropeExtraLoaded] = useFonts({ Manrope_800ExtraBold });

  const loadPointsSummary = useCallback(async () => {
    if (!mounted.current || isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase.rpc('get_my_wallet_summary');
      if (error) throw error;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Invalid points summary response.');
      }

      const raw = data as Record<string, unknown>;
      const pointsBalance = numberValue(raw.points_balance);
      const pointsPerDollar = numberValue(raw.points_per_dollar, DEFAULT_POINTS_PER_DOLLAR);
      const wantissValue = numberValue(
        raw.wantiss_value,
        pointsPerDollar > 0 ? pointsBalance / pointsPerDollar : 0,
      );

      const nextMilestone = Math.max(
        0,
        numberValue(raw.next_milestone, DEFAULT_MILESTONE_TARGET),
      );
      const milestoneTarget = Math.max(
        1,
        numberValue(raw.milestone_target, DEFAULT_MILESTONE_TARGET),
      );

      const nextSummary: WalletSummary = {
        points_balance: pointsBalance,
        points_earned_today: numberValue(raw.points_earned_today),
        points_earned_month: numberValue(raw.points_earned_month),
        lifetime_qualifying_points: numberValue(raw.lifetime_qualifying_points),
        milestone_progress: Math.max(0, numberValue(raw.milestone_progress)),
        milestone_target: milestoneTarget,
        next_milestone: nextMilestone,
        completed_milestones: Math.max(0, numberValue(raw.completed_milestones)),
        milestone_bonus: Math.max(0, numberValue(raw.milestone_bonus, DEFAULT_MILESTONE_BONUS)),
        points_per_dollar: pointsPerDollar > 0 ? pointsPerDollar : DEFAULT_POINTS_PER_DOLLAR,
        wantiss_value: Math.max(0, wantissValue),
      };

      if (!mounted.current) return;
      setSummary(nextSummary);
      setErrorMessage(null);
      setIsLoading(false);
    } catch (error) {
      console.warn('WalletPoints error:', error);
      if (!mounted.current) return;
      setIsLoading(false);
      setErrorMessage('Could not load points. Tap to retry.');
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    loadPointsSummary();

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (!userId || cancelled) return;

        channel = supabase
          .channel(`wallet-points-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wallet_points',
              filter: `user_id=eq.${userId}`,
            },
            () => loadPointsSummary(),
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wallet_points_transactions',
              filter: `user_id=eq.${userId}`,
            },
            () => loadPointsSummary(),
          )
          .subscribe();
      } catch (error) {
        console.warn('WalletPoints realtime error:', error);
      }
    })();

    return () => {
      mounted.current = false;
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadPointsSummary]);

  const values = summary ?? {
    points_balance: 0,
    points_earned_today: 0,
    points_earned_month: 0,
    lifetime_qualifying_points: 0,
    milestone_progress: 0,
    milestone_target: DEFAULT_MILESTONE_TARGET,
    next_milestone: DEFAULT_MILESTONE_TARGET,
    completed_milestones: 0,
    milestone_bonus: DEFAULT_MILESTONE_BONUS,
    points_per_dollar: DEFAULT_POINTS_PER_DOLLAR,
    wantiss_value: 0,
  };

  const progressRatio = useMemo(() => {
    const target = values.milestone_target > 0 ? values.milestone_target : DEFAULT_MILESTONE_TARGET;
    return Math.min(1, Math.max(0, values.milestone_progress / target));
  }, [values.milestone_progress, values.milestone_target]);

  const barValue = progressRatio < MINIMUM_PROGRESS ? MINIMUM_PROGRESS : progressRatio;
  const pointsToNextMilestone = Math.max(
    0,
    values.next_milestone - values.lifetime_qualifying_points,
  );
  const showData = !isLoading && !errorMessage;
  const showTodayBadge = showData && values.points_earned_today > 0;

  return (
    <Pressable
      disabled={!errorMessage}
      onPress={loadPointsSummary}
      style={[styles.card, { height: 170 }]}
    >
      <View style={styles.topSection}>
        <View style={styles.copy}>
          <Text style={[styles.label, manropeSemiLoaded && styles.manropeSemi]}>
            Wantiss Points
          </Text>

          <View style={styles.pointsRow}>
            <Text style={[styles.points, manropeExtraLoaded && styles.manropeExtra]}>
              {isLoading ? '···' : formatPoints(values.points_balance)}
            </Text>
            <Text style={[styles.pts, manropeSemiLoaded && styles.manropeSemi]}>PTS</Text>
          </View>

          <Text style={styles.value}>
            {isLoading
              ? '≈ $0.00 in Wantiss Value'
              : `≈ $${formatMoney(values.wantiss_value)} in Wantiss Value`}
          </Text>
        </View>

        {showTodayBadge && (
          <View style={styles.todayBadge}>
            <Text style={[styles.todayText, manropeBoldLoaded && styles.manropeBold]}>
              +{formatPoints(values.points_earned_today)} today
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${barValue * 100}%` },
          ]}
        />
      </View>

      <Text style={styles.progressText}>
        {isLoading
          ? 'Loading…'
          : errorMessage
            ? errorMessage
            : `${formatPoints(pointsToNextMilestone)} pts away from ${formatPoints(values.next_milestone)} pts`}
      </Text>

      <Pressable
        disabled={!onUsePointsPress}
        onPress={onUsePointsPress}
        style={styles.usePoints}
      >
        <Text style={[styles.usePointsText, manropeBoldLoaded && styles.manropeBold]}>
          Use points
        </Text>
        <Text style={styles.arrow}>→</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginHorizontal: 15,
    marginTop: 13,
    backgroundColor: SAGE_TINT,
    borderRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: OLIVE_SOFT,
    fontSize: 12,
    lineHeight: 12,
    fontFamily: 'Manrope_600SemiBold',
    includeFontPadding: false,
  },
  manropeSemi: {
    fontFamily: 'Manrope_600SemiBold',
  },
  manropeBold: {
    fontFamily: 'Manrope_700Bold',
  },
  manropeExtra: {
    fontFamily: 'Manrope_800ExtraBold',
    includeFontPadding: false,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  points: {
    color: OLIVE,
    fontSize: 26,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_800ExtraBold',
  },
  pts: {
    color: OLIVE_SOFT,
    fontSize: 12,
    lineHeight: 12,
    marginLeft: 4,
    fontFamily: 'Manrope_600SemiBold',
  },
  value: {
    color: OLIVE_SOFT,
    fontSize: 11.5,
    lineHeight: 11.5,
    fontFamily: 'Inter',
    marginTop: 3,
  },
  todayBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: OLIVE,
    borderRadius: 20,
    flexShrink: 0,
  },
  todayText: {
    color: '#ACC8A2',
    fontSize: 11,
    lineHeight: 11,
    fontFamily: 'Inter',
  },
  progressTrack: {
    height: 6,
    marginTop: 16,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(26,37,23,0.12)',
  },
  progressFill: {
    height: 6,
    minWidth: 1,
    borderRadius: 6,
    backgroundColor: OLIVE,
  },
  progressText: {
    color: OLIVE_SOFT,
    fontSize: 11.5,
    lineHeight: 11.5,
    fontFamily: 'Inter',
    marginTop: 8,
  },
  usePoints: {
    marginTop: 18,
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usePointsText: {
    color: OLIVE,
    fontSize: 13,
    lineHeight: 13,
    fontFamily: 'Inter',
  },
  arrow: {
    color: OLIVE,
    fontSize: 16,
    lineHeight: 16,
    fontFamily: 'Inter',
  },
});
