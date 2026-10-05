import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const BLUE = '#28469E';
const TEXT = '#0E1A3A';
const MUTED = '#5F6E94';
const AQUA = '#CAE8E8';
const BORDER = '#C4D6DD';

type Props = {
  onBack?: () => void;
  onWalletPress?: () => void;
  onNotificationsPress?: () => void;
  onMyTripsPress?: () => void;
  onDealsPress?: () => void;
  onMorePress?: () => void;
  onDestinationPress?: (city: string, code: string, price: string) => void;
};

const destinations = [
  { city: 'Miami', code: 'MIA', price: '$245', type: 'skyline' },
  { city: 'Paris', code: 'CDG', price: '$699', type: 'tower' },
  { city: 'New York', code: 'JFK', price: '$520', type: 'city' },
  { city: 'Montreal', code: 'YUL', price: '$480', type: 'city' },
  { city: 'Santo Domingo', code: 'SDQ', price: '$210', type: 'coast' },
];

function SectionHeader({ title, link, onPress, compact = false }: { title: string; link?: string; onPress?: () => void; compact?: boolean }) {
  return (
    <View style={[styles.sectionHeader, compact && { paddingTop: 20 }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {link && <Pressable onPress={onPress} hitSlop={8}><Text style={styles.sectionLink}>{link} ›</Text></Pressable>}
    </View>
  );
}

function Field({ label, value, code, flex = 1, onPress }: { label: string; value: string; code?: string; flex?: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.field, { flex }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={1}>{value}{code ? <Text style={styles.code}> {code}</Text> : null}</Text>
    </Pressable>
  );
}

function PlaneMark({ size = 26, color = BLUE }: { size?: number; color?: string }) {
  return <MaterialCommunityIcons name="airplane" size={size} color={color} />;
}

function DestinationArt({ type }: { type: string }) {
  return (
    <LinearGradient colors={['#9CD3EA', '#E6F4F6']} style={styles.destinationArt}>
      {type === 'tower' ? <MaterialCommunityIcons name="domain" size={68} color={BLUE} /> :
       type === 'coast' ? <MaterialCommunityIcons name="beach" size={66} color="#1E7F6B" /> :
       <View style={styles.cityArt}>{[1,2,3,4,5,6].map((n) => <View key={n} style={[styles.building, { height: 24 + (n % 3) * 15, backgroundColor: n % 2 ? BLUE : '#6C86C8' }]} />)}</View>}
    </LinearGradient>
  );
}

function QuickAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickIcon}><MaterialCommunityIcons name={icon} size={24} color="#4A67B0" /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function BottomNav({ active, onHome, onMoments, onWallet, onDeals, onMore }: { active: string; onHome: () => void; onMoments: () => void; onWallet: () => void; onDeals: () => void; onMore: () => void }) {
  const items = [
    ['home-outline', 'Home', onHome],
    ['tag-outline', 'Deals', onDeals],
    ['star-four-points-outline', 'Moments', onMoments],
    ['wallet-outline', 'Wallet', onWallet],
    ['dots-horizontal-circle-outline', 'More', onMore],
  ] as const;
  return (
    <View style={styles.bottomWrap}>
      <View style={styles.bottomNav}>
        {items.map(([icon, label, onPress]) => (
          <Pressable key={label} onPress={onPress} style={styles.navItem}>
            <View style={[styles.navIcon, active === label && { backgroundColor: AQUA, borderRadius: 999 }]}>
              <MaterialCommunityIcons name={icon} size={29} color={active === label ? BLUE : MUTED} />
            </View>
            <Text style={[styles.navLabel, active === label && { color: BLUE }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function FlyzHomeScreen({ onBack, onWalletPress, onNotificationsPress, onMyTripsPress, onDealsPress, onMorePress, onDestinationPress }: Props) {
  const { width } = useWindowDimensions();
  const [tripType, setTripType] = useState('Round trip');
  const [from, setFrom] = useState({ city: 'Port-au-Prince', code: 'PAP' });
  const [to, setTo] = useState({ city: 'Miami', code: 'MIA' });
  const [airportPicker, setAirportPicker] = useState<'from' | 'to' | null>(null);
  const [airportSearch, setAirportSearch] = useState('');
  const [airports, setAirports] = useState<Array<{ city: string; code: string; airport: string; country: string }>>([]);
  const [airportsLoading, setAirportsLoading] = useState(false);

  const swap = () => { setFrom(to); setTo(from); };

  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  const closeAirportPicker = () => {
    setAirportPicker(null);
    setAirportSearch('');
    sheetTranslateY.setValue(0);
  };

  const sheetDragStartY = useRef(0);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onStartShouldSetPanResponderCapture: (evt) => {
        sheetDragStartY.current = evt.nativeEvent.locationY;
        return false;
      },

      onMoveShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponderCapture: (_, g) =>
        sheetDragStartY.current <= 145 &&
        g.dy > 4 &&
        Math.abs(g.dy) > Math.abs(g.dx),

      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        sheetTranslateY.stopAnimation();
      },

      onPanResponderMove: (_, g) => {
        sheetTranslateY.setValue(Math.max(0, g.dy));
      },

      onPanResponderRelease: (_, g) => {
        if (g.dy > 50 || g.vy > 0.8) {
          Animated.timing(sheetTranslateY, {
            toValue: 700,
            duration: 180,
            useNativeDriver: true,
          }).start(() => closeAirportPicker());
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 10,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (airportPicker === null || airports.length) return;
    let cancelled = false;
    setAirportsLoading(true);
    fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat')
      .then((res) => res.text())
      .then((text) => {
        if (cancelled) return;
        const parsed = text.split(/\r?\n/).map((line) => {
          const fields = line.split(',');
          const clean = (value: string) => value.replace(/^"|"$/g, '').replace(/""/g, '"');
          return {
            city: clean(fields[2] || ''),
            code: clean(fields[4] || ''),
            airport: clean(fields[1] || ''),
            country: clean(fields[3] || ''),
          };
        }).filter((a) => a.code && a.city && a.airport);
        setAirports(parsed);
      })
      .catch(() => {
        if (!cancelled) setAirports([]);
      })
      .finally(() => {
        if (!cancelled) setAirportsLoading(false);
      });
    return () => { cancelled = true; };
  }, [airportPicker, airports.length]);

  const filteredAirports = useMemo(() => {
    const query = airportSearch.trim().toLowerCase();
    if (!query) return airports.slice(0, 100);
    return airports.filter((a) => `${a.city} ${a.code} ${a.airport} ${a.country}`.toLowerCase().includes(query)).slice(0, 100);
  }, [airports, airportSearch]);

  const selectAirport = (airport: typeof airports[number]) => {
    if (airportPicker === 'from') setFrom({ city: airport.city, code: airport.code });
    if (airportPicker === 'to') setTo({ city: airport.city, code: airport.code });
    setAirportPicker(null);
  };

  const cardWidth = Math.max(154, Math.min(170, width * 0.405));
  const isMultiCity = tripType === 'Multi-city';

  const destinationCards = useMemo(() => destinations.map(d => (
    <Pressable key={d.code} style={[styles.destinationCard, { width: cardWidth }]} onPress={() => onDestinationPress?.(d.city, d.code, d.price)}>
      <DestinationArt type={d.type} />
      <View style={styles.destinationArrow}><MaterialIcons name="chevron-right" size={20} color={BLUE} /></View>
      <View style={styles.destinationText}>
        <Text style={styles.destinationName} numberOfLines={1}>{d.city}</Text>
        <Text style={styles.destinationMeta}>{d.code} · from {d.price}</Text>
      </View>
    </Pressable>
  )), [cardWidth]);

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#CAE8E8', '#D8EEEE', '#ECF6F6', '#FFFFFF']} locations={[0, .25, .48, .72]} style={styles.background}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable onPress={onBack} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={TEXT} />
              </Pressable>
              <Text style={styles.logo}>Flyz.</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={onNotificationsPress} style={styles.roundButton}>
                <MaterialCommunityIcons name="bell-outline" size={20} color={TEXT} />
              </Pressable>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Where to next?</Text>
              <Text style={styles.heroSub}>Search, book and manage your flights.</Text>
            </View>
            <View style={styles.heroPlane}><PlaneMark size={50} /></View>
          </View>

          <View style={styles.segment}>
            {['Round trip', 'One way', 'Multi-city'].map(type => (
              <Pressable key={type} onPress={() => setTripType(type)} style={[styles.segmentItem, tripType === type && styles.segmentActive]}>
                <Text style={[styles.segmentText, tripType === type && { color: '#fff' }]}>{type}</Text>
              </Pressable>
            ))}
          </View>

          {isMultiCity ? (
            <View style={styles.multiCityFields}>
              <View style={styles.route}>
                <Field label="From" value={from.city} code={from.code} onPress={() => { setAirportPicker('from'); setAirportSearch(''); }} />
                <Field label="To" value={to.city} code={to.code} onPress={() => { setAirportPicker('to'); setAirportSearch(''); }} />
                <Pressable onPress={swap} style={styles.swap}><MaterialCommunityIcons name="swap-vertical" size={20} color="#fff" /></Pressable>
              </View>
              <View style={styles.fieldRow}>
                <Field label="Depart" value="Dec 18" />
                <Field label="Passengers" value="1 Adult" onPress={() => {}} />
              </View>
              <View style={styles.fieldRow}>
                <Field label="Class" value="Economy" onPress={() => {}} />
                <Pressable onPress={() => {}} style={[styles.field, styles.addFlightField]}>
                  <Text style={styles.addFlightPlus}>＋</Text>
                  <Text style={styles.addFlightText}>Add flight</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => {}} style={styles.searchButton}>
                <Text style={styles.searchButtonText}>Search flights</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.route}>
                <Field label="From" value={from.city} code={from.code} onPress={() => setAirportPicker('from')} />
                <Field label="To" value={to.city} code={to.code} onPress={() => setAirportPicker('to')} />
                <Pressable onPress={swap} style={styles.swap}><MaterialCommunityIcons name="swap-vertical" size={20} color="#fff" /></Pressable>
              </View>
              <View style={styles.fieldRow}>
                <Field label="Depart" value="Dec 18" />
                <Field label="Return" value={tripType === 'One way' ? '—' : 'Dec 28'} />
              </View>
              <View style={styles.fieldRow}>
                <Field label="Passengers" value="1 Adult" onPress={() => {}} />
                <Field label="Class" value="Economy" onPress={() => {}} />
              </View>
              <Pressable onPress={() => {}} style={styles.searchButton}>
                <Text style={styles.searchButtonText}>Search flights</Text>
              </Pressable>
            </>
          )}

          <View style={styles.quickRow}>
            <QuickAction icon="cellphone-check" label="Check-in" onPress={() => {}} />
            <QuickAction icon="clock-outline" label="Flight status" onPress={() => {}} />
            <QuickAction icon="briefcase-outline" label="Manage booking" onPress={onMyTripsPress} />
            <QuickAction icon="help-circle-outline" label="Help" onPress={() => {}} />
          </View>

          <SectionHeader title="My Trips" link="View All" onPress={onMyTripsPress} compact />
          <Pressable onPress={onMyTripsPress} style={styles.tripCard}>
            <View style={styles.tripLegs}>
              <View><Text style={styles.airport}>PAP</Text><Text style={styles.airportName}>Port-au-Prince</Text></View>
              <View style={styles.tripLine}><View style={styles.line} /><View style={styles.tripPlane}><PlaneMark size={23} /></View></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={styles.airport}>MIA</Text><Text style={styles.airportName}>Miami</Text></View>
            </View>
            <View style={styles.tripMeta}>
              <View style={{ flex: 1 }}><Text style={styles.tripDate}>Dec 18 · 8:40 AM</Text><Text style={styles.tripAirline}>American Airlines</Text></View>
              <View style={styles.confirmed}><Text style={styles.confirmedText}>Confirmed</Text></View>
            </View>
          </Pressable>

          <SectionHeader title="Popular destinations" link="View all" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>
            {destinationCards}
          </ScrollView>
        </ScrollView>
        <Modal visible={airportPicker !== null} transparent animationType="slide" onRequestClose={closeAirportPicker}>
        <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[styles.airportSheet, { transform: [{ translateY: sheetTranslateY }] }]}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{airportPicker === 'from' ? 'Where are you flying from?' : 'Where are you flying to?'}</Text><Text style={styles.sheetSub}>Search any airport worldwide</Text></View>
              <Pressable onPress={closeAirportPicker} style={styles.closeButton}><MaterialCommunityIcons name="close" size={22} color={TEXT} /></Pressable>
            </View>
            <View style={styles.airportSearch}>
              <MaterialCommunityIcons name="magnify" size={21} color={MUTED} />
              <TextInput value={airportSearch} onChangeText={setAirportSearch} placeholder="Search city, airport or code" placeholderTextColor={MUTED} style={styles.airportSearchInput} autoCapitalize="none" autoCorrect={false} autoFocus />
              {airportSearch.length > 0 && <Pressable onPress={() => setAirportSearch('')}><MaterialCommunityIcons name="close-circle" size={19} color={MUTED} /></Pressable>}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {airportsLoading ? <View style={styles.airportLoading}><Text style={styles.airportLoadingText}>Loading airports worldwide…</Text></View> :
              filteredAirports.map((airport) => <Pressable key={airport.code + airport.airport} onPress={() => selectAirport(airport)} style={styles.airportOption}>
                <View style={styles.airportIcon}><MaterialCommunityIcons name="airplane" size={20} color={BLUE} /></View>
                <View style={{ flex: 1 }}><Text style={styles.airportCity}>{airport.city} <Text style={styles.airportCode}>{airport.code}</Text></Text><Text style={styles.airportName}>{airport.airport} · {airport.country}</Text></View>
              </Pressable>)}
            </ScrollView>
          </Animated.View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
      <BottomNav active="Home" onHome={() => {}} onMoments={() => {}} onWallet={onWalletPress ?? (() => {})} onDeals={onDealsPress ?? (() => Alert.alert('Flyz Deals', 'Discounted fares, travel promotions, Wantiss offers, airline promotions and destination deals.'))} onMore={onMorePress ?? (() => {})} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#DCE6E8' },
  background: { flex: 1 },
  scrollContent: { paddingTop: 0, paddingHorizontal: 16, paddingBottom: 110 },
  header: { width: '100%', height: 100, paddingHorizontal: 0, paddingBottom: 4, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.65)', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, color: BLUE },
  headerActions: { flexDirection: 'row', gap: 8 },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.65)', alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 30, marginHorizontal: 4, marginBottom: 18, flexDirection: 'row', alignItems: 'flex-start' },
  heroTitle: { fontSize: 31, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: TEXT, marginBottom: 6 },
  heroSub: { fontSize: 14, lineHeight: 20, color: MUTED, maxWidth: 300 },
  heroPlane: { paddingRight: 20 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,.6)', borderRadius: 999, padding: 4, marginBottom: 12 },
  segmentItem: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: BLUE },
  segmentText: { color: MUTED, fontSize: 13, fontWeight: '700' },
  multiCityFields: { gap: 6 },
  route: { gap: 6, position: 'relative' },
  fieldRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  field: { backgroundColor: 'rgba(255,255,255,.82)', borderRadius: 18, paddingVertical: 13, paddingHorizontal: 18, minHeight: 66 },
  addFlightField: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  addFlightPlus: { fontSize: 22, fontWeight: '600', color: BLUE },
  addFlightText: { fontSize: 14, fontWeight: '700', color: BLUE },
  fieldLabel: { fontSize: 11, letterSpacing: .6, textTransform: 'uppercase', color: MUTED, fontWeight: '700', marginBottom: 3 },
  fieldValue: { fontSize: 18, fontWeight: '700', color: TEXT },
  code: { color: BLUE, fontSize: 14, fontWeight: '700' },
  swap: { position: 'absolute', right: 14, top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOpacity: .35, shadowRadius: 6, elevation: 4 },
  searchButton: { marginTop: 14, width: '100%', height: 54, borderRadius: 999, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOpacity: .28, shadowRadius: 11, elevation: 3 },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 20, paddingBottom: 4 },
  quickAction: { width: '23%', alignItems: 'center', gap: 8 },
  quickIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: AQUA, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11.5, lineHeight: 15, fontWeight: '700', color: TEXT, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, paddingTop: 26, paddingBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -.4, color: TEXT },
  sectionLink: { fontSize: 13, fontWeight: '600', color: BLUE },
  tripCard: { marginHorizontal: 4, backgroundColor: 'rgba(202,232,232,.55)', borderRadius: 20, padding: 16 },
  tripLegs: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  airport: { fontSize: 26, fontWeight: '800', letterSpacing: -.5, color: TEXT },
  airportName: { fontSize: 12, color: MUTED },
  tripLine: { flex: 1, height: 28, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  line: { position: 'absolute', left: 0, right: 0, top: 13, height: 2, backgroundColor: BORDER },
  tripPlane: { zIndex: 2, backgroundColor: 'transparent', paddingHorizontal: 0 },
  tripMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  tripDate: { fontSize: 13, fontWeight: '700', color: TEXT },
  tripAirline: { fontSize: 12, color: MUTED, marginTop: 3 },
  confirmed: { backgroundColor: BLUE, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  confirmedText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  destinationRow: { gap: 12, paddingHorizontal: 4, paddingBottom: 14 },
  destinationCard: { height: 184, backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden', shadowColor: BLUE, shadowOpacity: .12, shadowRadius: 10, elevation: 3 },
  destinationArt: { height: 104, alignItems: 'center', justifyContent: 'center' },
  cityArt: { height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  building: { width: 17, borderRadius: 1 },
  destinationArrow: { position: 'absolute', right: 10, top: 88, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .14, shadowRadius: 5, elevation: 2 },
  destinationText: { padding: 12 },
  destinationName: { fontSize: 16, fontWeight: '700', color: TEXT },
  destinationMeta: { marginTop: 4, fontSize: 11.5, color: MUTED, fontWeight: '500' },
  keyboardAvoid: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(14,26,58,.35)', justifyContent: 'flex-end' },
  airportSheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  sheetSub: { marginTop: 3, fontSize: 13, color: MUTED },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF4F5', alignItems: 'center', justifyContent: 'center' },
  airportSearch: { height: 50, borderRadius: 16, backgroundColor: '#F2F7F7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 8 },
  airportSearchInput: { flex: 1, marginLeft: 9, fontSize: 14, color: TEXT },
  airportLoading: { paddingVertical: 30, alignItems: 'center' },
  airportLoadingText: { fontSize: 13, color: MUTED },
  airportOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E6EEF0', gap: 12 },
  airportIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EAF5F5', alignItems: 'center', justifyContent: 'center' },
  airportCity: { fontSize: 16, fontWeight: '800', color: TEXT },
  airportCode: { color: BLUE, fontSize: 14 },
  airportName: { marginTop: 3, fontSize: 12, color: MUTED },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 15 },
  bottomNav: { height: 65, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', elevation: 5, shadowColor: '#000', shadowOpacity: .13, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  navItem: { width: 68, height: 46, alignItems: 'center', justifyContent: 'flex-end' },
  navIcon: { width: 30, height: 29, alignItems: 'center', justifyContent: 'center' },
  navLabel: { paddingTop: 4, fontSize: 10.5, lineHeight: 13, fontWeight: '500', color: '#1F1E1E', textAlign: 'center' },
});