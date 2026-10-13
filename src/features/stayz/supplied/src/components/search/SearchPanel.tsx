import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fmtDate, fmtTime } from '../../lib/dates';
import { HOURLY_OPTIONS } from '../../lib/listings';
import { useSearch } from '../../store/SearchContext';
import { useTheme } from '../../theme/ThemeContext';
import { StayMode } from '../../types';
import { Button } from '../Button';
import { Chip } from '../Chip';
import { Txt } from '../Txt';
import { DatesSheet } from './DatesSheet';
import { GuestsSheet } from './GuestsSheet';
import { WhereSheet } from './WhereSheet';

export const MODES: { key: StayMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'hourly', label: 'Hourly', icon: 'time-outline' },
  { key: 'dayuse', label: 'Day use', icon: 'sunny-outline' },
  { key: 'overnight', label: 'Overnight', icon: 'moon-outline' },
  { key: 'extended', label: 'Extended', icon: 'calendar-outline' },
];

const START_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export const SearchPanel = ({ onSubmit }: { onSubmit: () => void }) => {
  const { colors } = useTheme();
  const { search, setSearch, setMode, locationStatus } = useSearch();
  const [where, setWhere] = useState(false);
  const [dates, setDates] = useState(false);
  const [guests, setGuests] = useState(false);

  const range = search.mode === 'overnight' || search.mode === 'extended';
  const whereLabel = search.place ? (search.place.current ? 'Current location' : search.place.label) : locationStatus === 'locating' ? 'Finding your location…' : 'Choose where to';
  const whereSub = search.place?.sub;
  const guestsLabel = `${search.adults + search.children} guest${search.adults + search.children > 1 ? 's' : ''}${range ? ` · ${search.rooms} room${search.rooms > 1 ? 's' : ''}` : ''}`;

  const field = (icon: keyof typeof Ionicons.glyphMap, label: string, value: string, sub: string | undefined, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.field, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <View style={{ flex: 1 }}>
        <Txt v="caption" sub>
          {label}
        </Txt>
        <Txt v="h3" numberOfLines={1}>
          {value}
        </Txt>
        {sub ? (
          <Txt v="small" sub numberOfLines={1}>
            {sub}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <View style={[styles.tabs, { backgroundColor: colors.chip }]}>
        {MODES.map(m => {
          const on = search.mode === m.key;
          return (
            <Pressable key={m.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setMode(m.key)} style={[styles.tab, on && { backgroundColor: colors.brand }]}>
              <Ionicons name={m.icon} size={16} color={on ? colors.onBrand : colors.sub} />
              <Txt v="caption" color={on ? colors.onBrand : colors.sub}>
                {m.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {field('location-outline', 'Where', whereLabel, whereSub, () => setWhere(true))}
      {range ? field('calendar-outline', 'Dates', `${fmtDate(search.date)} → ${fmtDate(search.endDate)}`, undefined, () => setDates(true)) : field('calendar-outline', 'Date', fmtDate(search.date), undefined, () => setDates(true))}
      {search.mode === 'hourly' ? (
        <View style={{ gap: 8 }}>
          <Txt v="caption" sub>
            Start time
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {START_TIMES.map(t => (
              <Chip key={t} label={fmtTime(t)} on={search.time === t} onPress={() => setSearch({ time: t })} />
            ))}
          </ScrollView>
          <Txt v="caption" sub>
            Duration
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {HOURLY_OPTIONS.map(h => (
              <Chip key={h} label={`${h}h`} on={search.hours === h} onPress={() => setSearch({ hours: h })} />
            ))}
          </View>
        </View>
      ) : null}
      {field('people-outline', 'Guests', guestsLabel, undefined, () => setGuests(true))}
      <Button title="Search" icon="search" onPress={onSubmit} disabled={!search.place} />
      <WhereSheet visible={where} onClose={() => setWhere(false)} />
      <DatesSheet visible={dates} onClose={() => setDates(false)} />
      <GuestsSheet visible={guests} onClose={() => setGuests(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { borderRadius: 24, borderWidth: 1, padding: 14, gap: 12 },
  tabs: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  tab: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
});
