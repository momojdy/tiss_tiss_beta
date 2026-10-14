import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StayzBadge } from './stayzBadge';
import { StayzButton } from './stayzButton';
import { StayzCard } from './stayzCard';
import { StayzChip } from './stayzChip';
import { StayzPhotoSlot } from './stayzPhotoSlot';
import { StayzRow } from './stayzRow';
import { StayzScreen } from './stayzScreen';
import { StayzSection } from './stayzSection';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzStars } from './stayzStars';
import { StayzTxt } from './stayzTxt';
import { StayzDatesSheet } from './stayzDatesSheet';
import { StayzGuestsSheet } from './stayzGuestsSheet';
import { useStayzAsync } from './stayzUseAsync';
import { policyText } from './stayzCancellation';
import { fmtDate, fmtTime } from './stayzDates';
import { isInspected } from './stayzListings';
import { nightsFor, validHourlyStarts } from './stayzStay';
import { dayUseWindow, hasCleaning, quote, startingPrice } from './stayzPricing';
import { RootProps, RootStackParamList } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzDraft } from './stayzDraftContext';
import { useStayzSaved } from './stayzSavedContext';
import { useStayzSearch } from './stayzSearchContext';
import { useStayzSettings } from './stayzSettingsContext';
import { useStayzTheme } from './stayzThemeContext';
import { StayMode } from './stayzTypes';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MODE_LABEL: Record<StayMode, string> = { hourly: 'Hourly', dayuse: 'Day use', overnight: 'Overnight', extended: 'Extended' };

export const StayzPropertyScreen = ({ route }: RootProps<'Property'>) => {
  const { id } = route.params;
  const nav = useNavigation<Nav>();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { money } = useStayzSettings();
  const { search, setSearch, setMode } = useStayzSearch();
  const draftCtx = useStayzDraft();
  const saved = useStayzSaved();
  const [dates, setDates] = useState(false);
  const [guests, setGuests] = useState(false);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [breakfast, setBreakfast] = useState(false);

  const listing = useStayzAsync(() => api.getListing(id), [api, id]);
  const blocked = useStayzAsync(() => api.getUnavailableDates(id), [api, id]);
  const busy = useStayzAsync(() => api.getBusyHours(id, search.date), [api, id, search.date]);
  const reviews = useStayzAsync(() => api.getReviews(id), [api, id]);
  const l = listing.data;

  useEffect(() => {
    if (l && !l.modes.includes(search.mode)) setMode(l.modes[0]);
  }, [l, search.mode, setMode]);

  useEffect(() => {
    if (l && !roomId && l.rooms.length) setRoomId(l.rooms[0].id);
  }, [l, roomId]);

  const room = l?.rooms.find(r => r.id === roomId) ?? null;
  const range = search.mode === 'overnight' || search.mode === 'extended';
  const nights = nightsFor(search);

  const slots = useMemo(() => (l && search.mode === 'hourly' ? validHourlyStarts(l, search.hours, busy.data ?? [], search.date) : []), [l, search.mode, search.hours, search.date, busy.data]);

  useEffect(() => {
    if (search.mode === 'hourly' && slots.length) {
      const cur = slots.find(s => s.time === search.time);
      if (!cur || !cur.ok) {
        const first = slots.find(s => s.ok);
        if (first) setSearch({ time: first.time });
      }
    }
  }, [slots, search.mode, search.time, setSearch]);

  if (listing.loading)
    return (
      <StayzScreen title="">
        <StayzSkeleton height={260} radius={24} />
        <StayzSkeleton height={24} width="70%" />
        <StayzSkeleton height={16} width="40%" />
        <StayzSkeleton height={120} radius={18} />
      </StayzScreen>
    );
  if (listing.error || !l) return <StayzScreen title="Stay"><StayzErrorView message={listing.error ?? undefined} onRetry={listing.reload} /></StayzScreen>;

  const saveOn = saved.ids.includes(l.id);
  const q = quote({ listing: l, mode: search.mode, startDate: search.date, endDate: search.endDate, hours: search.hours, windowIndex: search.windowIndex, room, adults: search.adults, breakfast });
  const sp = startingPrice(l, search.mode, search.hours, search.windowIndex);
  const hourlyOk = search.mode !== 'hourly' || slots.some(s => s.ok && s.time === search.time);
  const nightsOk = !range || (nights >= l.minNights && (!l.maxNights || nights <= l.maxNights));
  const capacityOk = search.adults + search.children <= (room?.sleeps ?? l.guests) * (range ? search.rooms : 1);
  const priceKnown = q.base > 0;
  const canBook = hourlyOk && nightsOk && capacityOk && priceKnown;
  const reason = !hourlyOk ? 'Pick an available start time' : !nightsOk ? `This property requires ${l.minNights}${l.maxNights ? `–${l.maxNights}` : '+'} nights` : !capacityOk ? 'Too many guests for this room' : !priceKnown ? 'This stay type has no price set' : '';

  const book = () => {
    draftCtx.reset(l.id, room?.id);
    draftCtx.setDraft({ breakfast });
    nav.navigate('Checkout', { id: l.id });
  };

  const contact = async () => {
    try {
      const tid = await api.startThread(l.id, l.title);
      nav.navigate('Chat', { id: tid, title: l.title });
    } catch {
      nav.navigate('Tabs', { screen: 'Messages' });
    }
  };

  const openMaps = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`);

  return (
    <StayzScreen
      back={false}
      noTop
      contentStyle={{ padding: 0, gap: 0 }}
      footer={
        <View style={{ gap: 8 }}>
          {reason ? (
            <StayzTxt v="small" color={colors.danger}>
              {reason}
            </StayzTxt>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <StayzTxt v="h2">{money(q.total)}</StayzTxt>
              <StayzTxt v="small" sub>
                Total · tax included
              </StayzTxt>
            </View>
            <StayzButton title={l.instant ? 'Book now' : 'Request to book'} onPress={book} disabled={!canBook} style={{ flex: 1.2 }} />
          </View>
        </View>
      }>
      <View>
        <Pressable onPress={() => nav.navigate('Photos', { id: l.id })} accessibilityRole="imagebutton" accessibilityLabel="Open photos">
          <StayzPhotoSlot uri={l.photos[0]} icon="bed-outline" style={{ height: 300 }} />
        </Pressable>
        <View style={styles.overlayRow}>
          <Pressable accessibilityLabel="Back" onPress={() => nav.goBack()} style={[styles.round, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Pressable accessibilityLabel={saveOn ? 'Remove from saved' : 'Save'} onPress={() => saved.toggle(l.id)} style={[styles.round, { backgroundColor: colors.card }]}>
            <Ionicons name={saveOn ? 'heart' : 'heart-outline'} size={20} color={saveOn ? colors.brand : colors.text} />
          </Pressable>
        </View>
        {l.photos.length > 0 ? (
          <Pressable onPress={() => nav.navigate('Photos', { id: l.id })} style={[styles.count, { backgroundColor: colors.overlay }]}>
            <Ionicons name="images-outline" size={14} color="#FFFFFF" />
            <StayzTxt v="small" color="#FFFFFF" bold>
              {l.photos.length} photos
            </StayzTxt>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={{ gap: 6 }}>
          <StayzTxt v="title">{l.title}</StayzTxt>
          <StayzTxt sub>
            {l.type} · {l.address}, {l.city}
          </StayzTxt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {l.reviewCount > 0 ? (
              <Pressable onPress={() => nav.navigate('Reviews', { id: l.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <StayzStars value={l.rating} size={14} />
                <StayzTxt v="small" bold>
                  {l.rating.toFixed(1)} · {l.reviewCount} reviews
                </StayzTxt>
              </Pressable>
            ) : (
              <StayzTxt v="small" sub>
                No reviews yet
              </StayzTxt>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {l.verified ? <StayzBadge label="Verified business" tone="teal" icon="checkmark-circle" /> : null}
            {isInspected(l) ? <StayzBadge label="Inspected by Stayz" tone="teal" icon="shield-checkmark" /> : null}
            {l.promo ? <StayzBadge label={l.promo.title} tone="brand" icon="pricetag" /> : null}
          </View>
        </View>

        <StayzCard style={{ gap: 12 }}>
          {l.modes.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {l.modes.map(m => (
                <StayzChip key={m} label={MODE_LABEL[m]} on={search.mode === m} onPress={() => setMode(m)} />
              ))}
            </ScrollView>
          ) : null}
          <StayzRow icon="calendar-outline" label={range ? `${fmtDate(search.date)} → ${fmtDate(search.endDate)}` : fmtDate(search.date)} sub={range ? `${nights} night${nights > 1 ? 's' : ''} · check-in ${fmtTime(l.checkin)}, check-out ${fmtTime(l.checkout)}` : undefined} onPress={() => setDates(true)} />
          {search.mode === 'hourly' ? (
            <View style={{ gap: 8 }}>
              <StayzTxt v="small" bold>
                Duration
              </StayzTxt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {l.hourly.map(h => (
                  <StayzChip key={h.hours} label={`${h.hours}h · ${money(h.price)}`} on={search.hours === h.hours} onPress={() => setSearch({ hours: h.hours })} />
                ))}
              </View>
              <StayzTxt v="small" bold>
                Start time
              </StayzTxt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(s => (
                  <StayzChip key={s.time} label={fmtTime(s.time)} on={search.time === s.time} disabled={!s.ok} onPress={() => setSearch({ time: s.time })} />
                ))}
              </View>
              <StayzTxt v="small" sub>
                Hourly check-in and check-out are strict. There is no early check-in or late check-out.
              </StayzTxt>
            </View>
          ) : null}
          {search.mode === 'dayuse' ? (
            <View style={{ gap: 8 }}>
              <StayzTxt v="small" bold>
                Time window
              </StayzTxt>
              {l.dayUse.map((w, i) => (
                <StayzChip key={i} label={`${fmtTime(w.from)} – ${fmtTime(w.until)} · ${money(w.price)}`} on={search.windowIndex === i} onPress={() => setSearch({ windowIndex: i })} style={{ alignSelf: 'flex-start' }} />
              ))}
              <StayzTxt v="small" sub>
                {(() => {
                  const w = dayUseWindow(l, search.windowIndex);
                  return w ? `Arrive from ${fmtTime(w.from)} and leave by ${fmtTime(w.until)}.` : '';
                })()}
              </StayzTxt>
            </View>
          ) : null}
          <StayzRow icon="people-outline" label={`${search.adults + search.children} guest${search.adults + search.children > 1 ? 's' : ''}${range ? ` · ${search.rooms} room${search.rooms > 1 ? 's' : ''}` : ''}`} onPress={() => setGuests(true)} />
          {range && l.rooms.length ? (
            <View style={{ gap: 8 }}>
              <StayzTxt v="small" bold>
                Room type
              </StayzTxt>
              {l.rooms.map(r => (
                <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ selected: roomId === r.id }} onPress={() => setRoomId(r.id)} style={[styles.room, { borderColor: roomId === r.id ? colors.brand : colors.line, backgroundColor: roomId === r.id ? colors.brandSoft : colors.card }]}>
                  <View style={{ flex: 1 }}>
                    <StayzTxt v="h3">{r.name}</StayzTxt>
                    <StayzTxt v="small" sub>
                      Sleeps {r.sleeps}
                    </StayzTxt>
                  </View>
                  <StayzTxt bold>{money(r.price)}</StayzTxt>
                  <StayzTxt v="small" sub>
                    {' '}
                    / night
                  </StayzTxt>
                </Pressable>
              ))}
            </View>
          ) : null}
          {range && l.breakfast ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <StayzTxt v="h3">Add breakfast</StayzTxt>
                <StayzTxt v="small" sub>
                  +{money(l.breakfast)} per guest, per night
                </StayzTxt>
              </View>
              <Switch value={breakfast} onValueChange={setBreakfast} trackColor={{ true: colors.brand, false: colors.line }} />
            </View>
          ) : null}
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <StayzTxt sub>From</StayzTxt>
            <StayzTxt bold>
              {money(sp.amount)} <StayzTxt v="small" sub>/ {sp.unit}</StayzTxt>
            </StayzTxt>
          </View>
          {hasCleaning(l) ? (
            <StayzTxt v="small" sub>
              A cleaning fee applies to this property type.
            </StayzTxt>
          ) : null}
        </StayzCard>

        <StayzSection title="About this place">
          <StayzTxt>{l.description}</StayzTxt>
          <StayzTxt sub>
            {l.guests} guests · {l.bedrooms} bedroom{l.bedrooms !== 1 ? 's' : ''} · {l.baths} bathroom{l.baths !== 1 ? 's' : ''}
          </StayzTxt>
        </StayzSection>

        {l.amenities.length ? (
          <StayzSection title="Amenities">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {l.amenities.map(a => (
                <StayzChip key={a} label={a} />
              ))}
            </View>
          </StayzSection>
        ) : null}

        <StayzSection title="Location">
          <View style={styles.map}>
            <MapView style={StyleSheet.absoluteFill} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} initialRegion={{ latitude: l.lat, longitude: l.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }} onPress={openMaps}>
              <Marker coordinate={{ latitude: l.lat, longitude: l.lng }} title={l.title} />
            </MapView>
          </View>
          <StayzRow icon="navigate-outline" label="Open in Maps" sub={`${l.address}, ${l.city}`} onPress={openMaps} />
        </StayzSection>

        <StayzSection title="Good to know">
          <StayzCard style={{ gap: 4 }}>
            <StayzRow icon="close-circle-outline" label="Cancellation" sub={policyText(l)} chevron={false} />
            <StayzRow icon="log-in-outline" label="Check-in and check-out" sub={range ? `Check-in from ${fmtTime(l.checkin)} · Check-out by ${fmtTime(l.checkout)}` : search.mode === 'hourly' ? `Open ${fmtTime(l.hrFrom)} – ${fmtTime(l.hrUntil)}. Strict start and end times.` : 'Fixed day-use window'} chevron={false} />
            {l.deposit ? <StayzRow icon="cash-outline" label="Deposit" sub={`${money(l.deposit)} collected by the property at check-in`} chevron={false} /> : null}
            {l.extOn ? <StayzRow icon="add-circle-outline" label="Stay extension" sub="Request more time during your stay. The property confirms if available." chevron={false} /> : null}
            {l.rules ? <StayzRow icon="document-text-outline" label="House rules" sub={l.rules} chevron={false} /> : null}
          </StayzCard>
        </StayzSection>

        <StayzSection
          title="Reviews"
          action={
            l.reviewCount > 0 ? (
              <Pressable onPress={() => nav.navigate('Reviews', { id: l.id })}>
                <StayzTxt v="small" bold color={colors.brand}>
                  See all
                </StayzTxt>
              </Pressable>
            ) : undefined
          }>
          {reviews.loading ? (
            <StayzSkeleton height={60} radius={14} />
          ) : (reviews.data ?? []).length === 0 ? (
            <StayzTxt sub>Reviews appear after guests complete a stay.</StayzTxt>
          ) : (
            (reviews.data ?? []).slice(0, 2).map(r => (
              <StayzCard key={r.id} style={{ gap: 6 }}>
                <StayzStars value={r.rating} size={13} />
                <StayzTxt>{r.text}</StayzTxt>
                <StayzTxt v="small" sub>
                  {r.author}
                </StayzTxt>
              </StayzCard>
            ))
          )}
        </StayzSection>

        <StayzButton title="Message the property" kind="secondary" icon="chatbubble-ellipses-outline" onPress={contact} />
      </View>

      <StayzDatesSheet visible={dates} onClose={() => setDates(false)} blocked={blocked.data ?? []} />
      <StayzGuestsSheet visible={guests} onClose={() => setGuests(false)} />
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  overlayRow: { position: 'absolute', top: 52, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  body: { padding: 16, gap: 22 },
  room: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5 },
  map: { height: 160, borderRadius: 18, overflow: 'hidden' },
});
