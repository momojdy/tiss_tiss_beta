import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzSaved } from './stayzSavedContext';
import { Listing, SearchState } from './stayzTypes';
import { startingPrice } from './stayzPricing';
import { shortPolicy } from './stayzCancellation';
import { fmtKm } from './stayzDistance';
import { distanceFrom, isInspected } from './stayzListings';
import { StayzBadge } from './stayzBadge';
import { StayzPhotoSlot } from './stayzPhotoSlot';
import { StayzTxt } from './stayzTxt';

interface Props {
  listing: Listing;
  search: SearchState;
  onPress: () => void;
  compact?: boolean;
}

export const StayzPropertyCard = ({ listing: l, search, onPress, compact }: Props) => {
  const { colors } = useStayzTheme();
  const { money } = useStayzSettings();
  const saved = useStayzSaved();
  const on = saved.ids.includes(l.id);
  const sp = startingPrice(l, search.mode, search.hours, search.windowIndex);
  const km = distanceFrom(l, search.place);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }, compact && styles.compact]}>
      <View>
        <StayzPhotoSlot uri={l.photos[0]} style={[styles.photo, compact && styles.photoCompact]} icon="bed-outline" />
        <Pressable
          accessibilityLabel={on ? 'Remove from saved' : 'Save'}
          onPress={() => saved.toggle(l.id)}
          style={[styles.heart, { backgroundColor: colors.card }]}
          hitSlop={8}>
          <Ionicons name={on ? 'heart' : 'heart-outline'} size={18} color={on ? colors.brand : colors.text} />
        </Pressable>
        <View style={styles.badges}>
          {l.promo ? <StayzBadge label={l.promo.title} tone="brand" /> : null}
          {isInspected(l) ? <StayzBadge label="Inspected by Stayz" tone="teal" icon="shield-checkmark" /> : null}
        </View>
      </View>
      <View style={styles.meta}>
        <View style={styles.line}>
          <StayzTxt v="h3" numberOfLines={1} style={{ flex: 1 }}>
            {l.title}
          </StayzTxt>
          {l.reviewCount > 0 ? (
            <View style={styles.rate}>
              <Ionicons name="star" size={13} color="#F5A623" />
              <StayzTxt v="small" bold>
                {l.rating.toFixed(1)}
              </StayzTxt>
            </View>
          ) : null}
        </View>
        <StayzTxt v="small" sub numberOfLines={1}>
          {l.type} · {l.city}
          {km !== null ? ` · ${fmtKm(km)}` : ''}
        </StayzTxt>
        <View style={styles.line}>
          <StayzTxt v="small" color={colors.teal} bold>
            {shortPolicy(l)}
          </StayzTxt>
        </View>
        <StayzTxt>
          <StayzTxt bold>{money(sp.amount)}</StayzTxt>
          <StayzTxt sub v="small">
            {' '}
            / {sp.unit} · tax included
          </StayzTxt>
        </StayzTxt>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { gap: 0, borderRadius: 22, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#EDE1DC', shadowColor: '#241710', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  compact: { width: 260 },
  photo: { height: 200, borderRadius: 0 },
  photoCompact: { height: 160, borderRadius: 0 },
  heart: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', left: 12, bottom: 12, gap: 6 },
  meta: { gap: 5, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 13 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
