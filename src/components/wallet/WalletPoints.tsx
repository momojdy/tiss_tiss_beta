import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

const SAGE = '#ACC8A2';
const SAGE_TINT = '#DCE8D2';
const OLIVE = '#1A2517';
const OLIVE_SOFT = '#5C6B57';
const TRACK = 'rgba(26, 37, 23, 0.12)';
const MINIMUM_PROGRESS = 0.01;
const MILESTONE_TARGET = 15000;

type Summary = {
  pointsBalance: number;
  pointsEarnedToday: number;
  pointsEarnedThisMonth: number;
  lifetimeQualifyingPoints: number;
  milestoneProgress: number;
  nextMilestone: number;
  completedMilestones: number;
  milestoneBonus: number;
  pointsPerDollar: number;
  wantissValue: number;
};

const INITIAL: Summary = {
  pointsBalance: 0,
  pointsEarnedToday: 0,
  pointsEarnedThisMonth: 0,
  lifetimeQualifyingPoints: 0,
  milestoneProgress: 0,
  nextMilestone: MILESTONE_TARGET,
  completedMilestones: 0,
  milestoneBonus: 50,
  pointsPerDollar: 87,
  wantissValue: 0,
};

const num = (v: unknown, fallback: number): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return fallback;
};

const withCommas = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const roundHalfAway = (v: number) => Math.sign(v) * Math.round(Math.abs(v));
const formatPoints = (v: number) => withCommas(String(roundHalfAway(v)));
const formatMoney = (v: number) => {
  const [int, dec] = v.toFixed(2).split('.');
  return `${withCommas(int)}.${dec}`;
};

export default function WantissPoints({
  height = 170,
  onUsePoints,
}: {
  height?: number;
  onUsePoints?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [s, setS] = useState<Summary>(INITIAL);
  const mounted = useRef(false);
  const isFetching = useRef(false);

  const loadPointsSummary = useCallback(async () => {
    if (!mounted.current || isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        if (!mounted.current) return;
        setIsLoading(false);
        setErrorMessage('Sign in to view your points.');
        return;
      }

      const { data, error } = await supabase.rpc('get_my_wallet_summary');
      if (error) throw error;

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Invalid points summary response.');
      }

      const d = data as Record<string, unknown>;
      const pointsBalance = num(d.points_balance, 0);
      const pointsPerDollar = num(d.points_per_dollar, 87);

      const next: Summary = {
        pointsBalance,
        pointsEarnedToday: num(d.points_earned_today, 0),
        pointsEarnedThisMonth: num(d.points_earned_month, 0),
        lifetimeQualifyingPoints: num(d.lifetime_qualifying_points, 0),
        milestoneProgress: num(d.milestone_progress, 0),
        nextMilestone: num(d.next_milestone, MILESTONE_TARGET),
        completedMilestones: num(d.completed_milestones, 0),
        milestoneBonus: num(d.milestone_bonus, 50),
        pointsPerDollar,
        wantissValue: num(
          d.wantiss_value,
          pointsPerDollar > 0 ? pointsBalance / pointsPerDollar : 0,
        ),
      };

      if (!mounted.current) return;
      setS(next);
      setIsLoading(false);
    } catch (error) {
      console.warn('WantissPoints error:', error);
      if (!mounted.current) return;
      setIsLoading(false);
      setErrorMessage('Could not load points. Tap to retry.');
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadPointsSummary();
    return () => {
      mounted.current = false;
    };
  }, [loadPointsSummary]);

  const progressRatio = Math.min(1, Math.max(0, s.milestoneProgress / MILESTONE_TARGET));
  const barValue = progressRatio < MINIMUM_PROGRESS ? MINIMUM_PROGRESS : progressRatio;
  const pointsToNextMilestone = Math.max(0, s.nextMilestone - s.lifetimeQualifyingPoints);
  const showData = !isLoading && errorMessage === null;
  const showTodayBadge = showData && s.pointsEarnedToday > 0;

  return (
    <Pressable
      disabled={!errorMessage}
      onPress={loadPointsSummary}
      style={[styles.card, { height }]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <Text style={styles.title}>Wantiss Points</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>
              {isLoading ? '···' : formatPoints(s.pointsBalance)}
            </Text>
            <Text style={styles.pts}>PTS</Text>
          </View>
          <Text style={styles.small}>
            {isLoading ? '≈ $0.00 in Wantiss Value' : `≈ $${formatMoney(s.wantissValue)} in Wantiss Value`}
          </Text>
        </View>

        {showTodayBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{`+${formatPoints(s.pointsEarnedToday)} today`}</Text>
          </View>
        )}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(showData ? barValue : MINIMUM_PROGRESS) * 100}%` }]} />
      </View>

      <Text style={styles.progressText}>
        {isLoading
          ? 'Loading…'
          : `${formatPoints(pointsToNextMilestone)} pts away from ${formatPoints(s.nextMilestone)} pts`}
      </Text>

      <Pressable onPress={onUsePoints} style={styles.useRow}>
        <Text style={styles.useText}>Use points</Text>
        <Text style={styles.arrow}>→</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 15,
    marginTop: 13,
    backgroundColor: SAGE_TINT,
    borderRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  leftCol: { flex: 1, minWidth: 0 },
  title: {
    color: OLIVE_SOFT,
    fontSize: 12,
    lineHeight: 12,
    fontFamily: 'Manrope_600SemiBold',
    includeFontPadding: false,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  amount: {
    color: OLIVE,
    fontSize: 26,
    lineHeight: 41,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_800ExtraBold',
    includeFontPadding: false,
  },
  pts: {
    marginLeft: 4,
    color: OLIVE_SOFT,
    fontSize: 12,
    lineHeight: 12,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
  small: {
    marginTop: 3,
    color: OLIVE_SOFT,
    fontSize: 11.5,
    lineHeight: 11.5,
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: OLIVE,
  },
  badgeText: {
    color: SAGE,
    fontSize: 11,
    lineHeight: 11,
    fontFamily: 'Inter_700Bold',
    includeFontPadding: false,
  },
  track: {
    marginTop: 16,
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: TRACK,
  },
  fill: { height: 6, backgroundColor: OLIVE },
  progressText: {
    marginTop: 8,
    color: OLIVE_SOFT,
    fontSize: 11.5,
    lineHeight: 11.5,
    fontFamily: 'Inter_400Regular',
    includeFontPadding: false,
  },
  useRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  useText: {
    color: OLIVE,
    fontSize: 13,
    lineHeight: 13,
    fontFamily: 'Inter_700Bold',
    includeFontPadding: false,
  },
  arrow: {
    color: OLIVE,
    fontSize: 16,
    lineHeight: 16,
    fontFamily: 'Inter_600SemiBold',
    includeFontPadding: false,
  },
});
