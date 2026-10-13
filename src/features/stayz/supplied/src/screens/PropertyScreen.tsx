import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { PhotoSlot } from '../components/PhotoSlot';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { Section } from '../components/Section';
import { ErrorView, Skeleton } from '../components/States';
import { Stars } from '../components/Stars';
import { Txt } from '../components/Txt';
import { DatesSheet } from '../components/search/DatesSheet';
import { GuestsSheet } from '../components/search/GuestsSheet';
import { useAsync } from '../hooks/useAsync';
import { policyText } from '../lib/cancellation';
import { fmtDate, fmtTime } from '../lib/dates';
import { isInspected } from '../lib/listings';
import { nightsFor, validHourlyStarts } from '../lib/stay';
import { dayUseWindow, hasCleaning, quote, startingPrice } from '../lib/pricing';
import { RootProps, RootStackParamList } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useDraft } from '../store/DraftContext';
import { useSaved } from '../store/SavedContext';
import { useSearch } from '../store/SearchContext';
import { useSettings } from '../store/SettingsContext';
import { useTheme } from '../theme/ThemeContext';
import { StayMode } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MODE_LABEL: Record<StayMode, string> = { hourly: 'Hourly', dayuse: 'Day use', overnight: 'Overnight', extended: 'Extended' };

export const PropertyScreen = ({ route }: RootProps<'Property'>) => {
  const { id } = route.params;
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const api = useApi();
  const { money } = useSettings();
  const { search, setSearch, setMode } = useSearch();
  const draftCtx = useDraft();
  const saved = useSaved();
  const [dates, setDates] = useState(false);
  const [guests, setGuests] = useState(false);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [breakfast, setBreakfast] = useState(false);

  const listing = useAsync(() => api.getListing(id), [api, id]);
  const blocked = useAsync(() => api.getUnavailableDates(id), [api, id]);
  const busy = useAsync(() => api.getBusyHours(id, search.date), [api, id, search.date]);
  const reviews = useAsync(() => api.getReviews(id), [api, id]);
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
      <Screen title="">
        <Skeleton height={260} radius={24} />
        <Skeleton height={24} width="70%" />
        <Skeleton height={16} width="40%" />
        <Skeleton height={120} radius={18} />
      </Screen>
    );
  if (listing.error || !l) return <Screen title="Stay"><ErrorView message={listing.error ?? undefined} onRetry={listing.reload} /></Screen>;

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
    <Screen
      back={false}
      noTop
      contentStyle={{ padding: 0, gap: 0 }}
      footer={
        <View style={{ gap: 8 }}>
          {reason ? (
            <Txt v="small" color={colors.danger}>
              {reason}
            </Txt>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Txt v="h2">{money(q.total)}</Txt>
              <Txt v="small" sub>
                Total · tax included
              </Txt>
            </View>
            <Button title={l.instant ? 'Book now' : 'Request to book'} onPress={book} disabled={!canBook} style={{ flex: 1.2 }} />
          </View>
        </View>
      }>
      <View>
        <Pressable onPress={() => nav.navigate('Photos', { id: l.id })} accessibilityRole="imagebutton" accessibilityLabel="Open photos">
          <PhotoSlot uri={l.photos[0]} icon="bed-outline" style={{ height: 300 }} />
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
            <Txt v="small" color="#FFFFFF" bold>
              {l.photos.length} photos
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={{ gap: 6 }}>
          <Txt v="title">{l.title}</Txt>
          <Txt sub>
            {l.type} · {l.address}, {l.city}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {l.reviewCount > 0 ? (
              <Pressable onPress={() => nav.navigate('Reviews', { id: l.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Stars value={l.rating} size={14} />
                <Txt v="small" bold>
                  {l.rating.toFixed(1)} · {l.reviewCount} reviews
                </Txt>
              </Pressable>
            ) : (
              <Txt v="small" sub>
                No reviews yet
              </Txt>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {l.verified ? <Badge label="Verified business" tone="teal" icon="checkmark-circle" /> : null}
            {isInspected(l) ? <Badge label="Inspected by Stayz" tone="teal" icon="shield-checkmark" /> : null}
            {l.promo ? <Badge label={l.promo.title} tone="brand" icon="pricetag" /> : null}
          </View>
        </View>

        <Card style={{ gap: 12 }}>
          {l.modes.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {l.modes.map(m => (
                <Chip key={m} label={MODE_LABEL[m]} on={search.mode === m} onPress={() => setMode(m)} />
              ))}
            </ScrollView>
          ) : null}
          <Row icon="calendar-outline" label={range ? `${fmtDate(search.date)} → ${fmtDate(search.endDate)}` : fmtDate(search.date)} sub={range ? `${nights} night${nights > 1 ? 's' : ''} · check-in ${fmtTime(l.checkin)}, check-out ${fmtTime(l.checkout)}` : undefined} onPress={() => setDates(true)} />
          {search.mode === 'hourly' ? (
            <View style={{ gap: 8 }}>
              <Txt v="small" bold>
                Duration
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {l.hourly.map(h => (
                  <Chip key={h.hours} label={`${h.hours}h · ${money(h.price)}`} on={search.hours === h.hours} onPress={() => setSearch({ hours: h.hours })} />
                ))}
              </View>
              <Txt v="small" bold>
                Start time
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(s => (
                  <Chip key={s.time} label={fmtTime(s.time)} on={search.time === s.time} disabled={!s.ok} onPress={() => setSearch({ time: s.time })} />
                ))}
              </View>
              <Txt v="small" sub>
                Hourly check-in and check-out are strict. There is no early check-in or late check-out.
              </Txt>
            </View>
          ) : null}
          {search.mode === 'dayuse' ? (
            <View style={{ gap: 8 }}>
              <Txt v="small" bold>
                Time window
              </Txt>
              {l.dayUse.map((w, i) => (
                <Chip key={i} label={`${fmtTime(w.from)} – ${fmtTime(w.until)} · ${money(w.price)}`} on={search.windowIndex === i} onPress={() => setSearch({ windowIndex: i })} style={{ alignSelf: 'flex-start' }} />
              ))}
              <Txt v="small" sub>
                {(() => {
                  const w = dayUseWindow(l, search.windowIndex);
                  return w ? `Arrive from ${fmtTime(w.from)} and leave by ${fmtTime(w.until)}.` : '';
                })()}
              </Txt>
            </View>
          ) : null}
          <Row icon="people-outline" label={`${search.adults + search.children} guest${search.adults + search.children > 1 ? 's' : ''}${range ? ` · ${search.rooms} room${search.rooms > 1 ? 's' : ''}` : ''}`} onPress={() => setGuests(true)} />
          {range && l.rooms.length ? (
            <View style={{ gap: 8 }}>
              <Txt v="small" bold>
                Room type
              </Txt>
              {l.rooms.map(r => (
                <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ selected: roomId === r.id }} onPress={() => setRoomId(r.id)} style={[styles.room, { borderColor: roomId === r.id ? colors.brand : colors.line, backgroundColor: roomId === r.id ? colors.brandSoft : colors.card }]}>
                  <View style={{ flex: 1 }}>
                    <Txt v="h3">{r.name}</Txt>
                    <Txt v="small" sub>
                      Sleeps {r.sleeps}
                    </Txt>
                  </View>
                  <Txt bold>{money(r.price)}</Txt>
                  <Txt v="small" sub>
                    {' '}
                    / night
                  </Txt>
                </Pressable>
              ))}
            </View>
          ) : null}
          {range && l.breakfast ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Txt v="h3">Add breakfast</Txt>
                <Txt v="small" sub>
                  +{money(l.breakfast)} per guest, per night
                </Txt>
              </View>
              <Switch value={breakfast} onValueChange={setBreakfast} trackColor={{ true: colors.brand, false: colors.line }} />
            </View>
          ) : null}
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt sub>From</Txt>
            <Txt bold>
              {money(sp.amount)} <Txt v="small" sub>/ {sp.unit}</Txt>
            </Txt>
          </View>
          {hasCleaning(l) ? (
            <Txt v="small" sub>
              A cleaning fee applies to this property type.
            </Txt>
          ) : null}
        </Card>

        <Section title="About this place">
          <Txt>{l.description}</Txt>
          <Txt sub>
            {l.guests} guests · {l.bedrooms} bedroom{l.bedrooms !== 1 ? 's' : ''} · {l.baths} bathroom{l.baths !== 1 ? 's' : ''}
          </Txt>
        </Section>

        {l.amenities.length ? (
          <Section title="Amenities">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {l.amenities.map(a => (
                <Chip key={a} label={a} />
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Location">
          <View style={styles.map}>
            <MapView style={StyleSheet.absoluteFill} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} initialRegion={{ latitude: l.lat, longitude: l.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }} onPress={openMaps}>
              <Marker coordinate={{ latitude: l.lat, longitude: l.lng }} title={l.title} />
            </MapView>
          </View>
          <Row icon="navigate-outline" label="Open in Maps" sub={`${l.address}, ${l.city}`} onPress={openMaps} />
        </Section>

        <Section title="Good to know">
          <Card style={{ gap: 4 }}>
            <Row icon="close-circle-outline" label="Cancellation" sub={policyText(l)} chevron={false} />
            <Row icon="log-in-outline" label="Check-in and check-out" sub={range ? `Check-in from ${fmtTime(l.checkin)} · Check-out by ${fmtTime(l.checkout)}` : search.mode === 'hourly' ? `Open ${fmtTime(l.hrFrom)} – ${fmtTime(l.hrUntil)}. Strict start and end times.` : 'Fixed day-use window'} chevron={false} />
            {l.deposit ? <Row icon="cash-outline" label="Deposit" sub={`${money(l.deposit)} collected by the property at check-in`} chevron={false} /> : null}
            {l.extOn ? <Row icon="add-circle-outline" label="Stay extension" sub="Request more time during your stay. The property confirms if available." chevron={false} /> : null}
            {l.rules ? <Row icon="document-text-outline" label="House rules" sub={l.rules} chevron={false} /> : null}
          </Card>
        </Section>

        <Section
          title="Reviews"
          action={
            l.reviewCount > 0 ? (
              <Pressable onPress={() => nav.navigate('Reviews', { id: l.id })}>
                <Txt v="small" bold color={colors.brand}>
                  See all
                </Txt>
              </Pressable>
            ) : undefined
          }>
          {reviews.loading ? (
            <Skeleton height={60} radius={14} />
          ) : (reviews.data ?? []).length === 0 ? (
            <Txt sub>Reviews appear after guests complete a stay.</Txt>
          ) : (
            (reviews.data ?? []).slice(0, 2).map(r => (
              <Card key={r.id} style={{ gap: 6 }}>
                <Stars value={r.rating} size={13} />
                <Txt>{r.text}</Txt>
                <Txt v="small" sub>
                  {r.author}
                </Txt>
              </Card>
            ))
          )}
        </Section>

        <Button title="Message the property" kind="secondary" icon="chatbubble-ellipses-outline" onPress={contact} />
      </View>

      <DatesSheet visible={dates} onClose={() => setDates(false)} blocked={blocked.data ?? []} />
      <GuestsSheet visible={guests} onClose={() => setGuests(false)} />
    </Screen>
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
