import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSettings } from '../store/SettingsContext';
import { useSaved } from '../store/SavedContext';
import { Listing, SearchState } from '../types';
import { startingPrice } from '../lib/pricing';
import { shortPolicy } from '../lib/cancellation';
import { fmtKm } from '../lib/distance';
import { distanceFrom, isInspected } from '../lib/listings';
import { Badge } from './Badge';
import { PhotoSlot } from './PhotoSlot';
import { Txt } from './Txt';

interface Props {
  listing: Listing;
  search: SearchState;
  onPress: () => void;
  compact?: boolean;
}

export const PropertyCard = ({ listing: l, search, onPress, compact }: Props) => {
  const { colors } = useTheme();
  const { money } = useSettings();
  const saved = useSaved();
  const on = saved.ids.includes(l.id);
  const sp = startingPrice(l, search.mode, search.hours, search.windowIndex);
  const km = distanceFrom(l, search.place);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, compact && styles.compact]}>
      <View>
        <PhotoSlot uri={l.photos[0]} style={[styles.photo, compact && styles.photoCompact]} icon="bed-outline" />
        <Pressable
          accessibilityLabel={on ? 'Remove from saved' : 'Save'}
          onPress={() => saved.toggle(l.id)}
          style={[styles.heart, { backgroundColor: colors.card }]}
          hitSlop={8}>
          <Ionicons name={on ? 'heart' : 'heart-outline'} size={18} color={on ? colors.brand : colors.text} />
        </Pressable>
        <View style={styles.badges}>
          {l.promo ? <Badge label={l.promo.title} tone="brand" /> : null}
          {isInspected(l) ? <Badge label="Inspected by Stayz" tone="teal" icon="shield-checkmark" /> : null}
        </View>
      </View>
      <View style={styles.meta}>
        <View style={styles.line}>
          <Txt v="h3" numberOfLines={1} style={{ flex: 1 }}>
            {l.title}
          </Txt>
          {l.reviewCount > 0 ? (
            <View style={styles.rate}>
              <Ionicons name="star" size={13} color="#F5A623" />
              <Txt v="small" bold>
                {l.rating.toFixed(1)}
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt v="small" sub numberOfLines={1}>
          {l.type} · {l.city}
          {km !== null ? ` · ${fmtKm(km)}` : ''}
        </Txt>
        <View style={styles.line}>
          <Txt v="small" color={colors.teal} bold>
            {shortPolicy(l)}
          </Txt>
        </View>
        <Txt>
          <Txt bold>{money(sp.amount)}</Txt>
          <Txt sub v="small">
            {' '}
            / {sp.unit} · tax included
          </Txt>
        </Txt>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { gap: 10 },
  compact: { width: 260 },
  photo: { height: 200, borderRadius: 22 },
  photoCompact: { height: 160 },
  heart: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', left: 12, bottom: 12, gap: 6 },
  meta: { gap: 3, paddingHorizontal: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
