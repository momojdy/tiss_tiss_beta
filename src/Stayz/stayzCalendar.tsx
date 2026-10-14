import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';
import { addDays, fmtMonth, fromISO, monthCells, today } from './stayzDates';
import { StayzTxt } from './stayzTxt';

interface Props {
  range?: boolean;
  start: string;
  end?: string;
  blocked?: string[];
  minNights?: number;
  maxNights?: number;
  onChange: (start: string, end: string) => void;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const StayzCalendar = ({ range, start, end = '', blocked = [], minNights = 1, maxNights, onChange }: Props) => {
  const { colors } = useStayzTheme();
  const base = fromISO(start || today());
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const cells = useMemo(() => monthCells(view.y, view.m), [view]);
  const t = today();
  const isBlocked = (d: string) => blocked.includes(d);

  const clash = (a: string, b: string) => {
    let d = a;
    while (d < b) {
      if (isBlocked(d)) return true;
      d = addDays(d, 1);
    }
    return false;
  };

  const press = (d: string) => {
    if (d < t || (isBlocked(d) && !range)) return;
    if (!range) return onChange(d, d);
    if (isBlocked(d) && (!start || end)) return;
    if (!start || end || d <= start) {
      if (isBlocked(d)) return;
      return onChange(d, '');
    }
    const nights = Math.round((fromISO(d).getTime() - fromISO(start).getTime()) / 86400000);
    if (clash(start, d) || nights < minNights || (maxNights && nights > maxNights)) return onChange(d, '');
    onChange(start, d);
  };

  const shift = (n: number) => {
    const d = new Date(view.y, view.m + n, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const inRange = (d: string) => !!end && d > start && d < end;

  return (
    <View>
      <View style={styles.head}>
        <Pressable accessibilityLabel="Previous month" onPress={() => shift(-1)} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <StayzTxt v="h3">{fmtMonth(view.y, view.m)}</StayzTxt>
        <Pressable accessibilityLabel="Next month" onPress={() => shift(1)} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {DOW.map((d, i) => (
          <View key={i} style={styles.cell}>
            <StayzTxt v="caption" sub>
              {d}
            </StayzTxt>
          </View>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const past = d < t;
          const off = past || isBlocked(d);
          const sel = d === start || d === end;
          const mid = inRange(d);
          return (
            <Pressable key={i} accessibilityLabel={d} disabled={off && !sel} onPress={() => press(d)} style={styles.cell}>
              <View style={[styles.day, mid && { backgroundColor: colors.brandSoft, borderRadius: 0, width: '100%' }, sel && { backgroundColor: colors.brand }]}>
                <StayzTxt v="small" bold={sel} color={sel ? colors.onBrand : off ? colors.sub : colors.text} style={isBlocked(d) && !past ? { textDecorationLine: 'line-through', opacity: 0.55 } : past ? { opacity: 0.4 } : undefined}>
                  {Number(d.slice(8))}
                </StayzTxt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
