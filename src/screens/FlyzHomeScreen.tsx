import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatDate = (date: Date) => `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]} ${date.getDate()}`;
const dateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

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
  onSearch?: (data: { from: { city: string; code: string }; to: { city: string; code: string }; departDate: Date; returnDate?: Date; passengers: string; cabin: string; tripType: string; secondFrom?: { city: string; code: string }; secondTo?: { city: string; code: string }; secondDepartDate?: Date }) => void;
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

function Field({ label, value, code, flex = 1, minHeight, onPress }: { label: string; value: string; code?: string; flex?: number; minHeight?: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.field, { flex }, minHeight ? { minHeight } : null]}>
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

export default function FlyzHomeScreen({ onBack, onWalletPress, onNotificationsPress, onMyTripsPress, onDealsPress, onMorePress, onDestinationPress, onSearch }: Props) {
  const { width } = useWindowDimensions();
  const [tripType, setTripType] = useState('Round trip');
  const [from, setFrom] = useState({ city: 'Port-au-Prince', code: 'PAP' });
  const [to, setTo] = useState({ city: 'Miami', code: 'MIA' });
  const [airportPicker, setAirportPicker] = useState<'from' | 'to' | 'secondFrom' | 'secondTo' | null>(null);
  const [airportSearch, setAirportSearch] = useState('');
  const [airports, setAirports] = useState<Array<{ city: string; code: string; airport: string; country: string }>>([]);
  const [airportsLoading, setAirportsLoading] = useState(false);
  const [departDate, setDepartDate] = useState(new Date(2026, 11, 18));
  const [returnDate, setReturnDate] = useState(new Date(2026, 11, 28));
  const [calendarPicker, setCalendarPicker] = useState<'depart' | 'return' | 'secondDepart' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 11, 1));
  const [multiCitySecondAdded, setMultiCitySecondAdded] = useState(false);
  const [secondFrom, setSecondFrom] = useState({ city: '', code: '' });
  const [secondTo, setSecondTo] = useState({ city: '', code: '' });
  const [secondDepartDate, setSecondDepartDate] = useState(new Date(2026, 11, 30));
  const [passengers, setPassengers] = useState('1 Adult');
  const [cabin, setCabin] = useState('Economy');
  const [selector, setSelector] = useState<'passengers' | 'cabin' | null>(null);

  const swap = () => { setFrom(to); setTo(from); };

  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const reanimatedSheetY = useSharedValue(0);

  const openCalendar = (type: 'depart' | 'return') => {
    setCalendarPicker(type);
    const date = type === 'return' ? returnDate : type === 'depart' ? departDate : secondDepartDate;
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const closeCalendar = () => setCalendarPicker(null);

  const getDailyFare = (airportCode: string, date: Date) => {
    const seed = [...airportCode].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const daySeed = date.getFullYear() * 37 + (date.getMonth() + 1) * 17 + date.getDate() * 13;
    const seasonal = date.getMonth() === 11 ? 35 : date.getMonth() === 0 ? 20 : 0;
    const variation = Math.abs((seed * 31 + daySeed * 7) % 120);
    return 180 + (seed % 70) + variation + seasonal;
  };

  const isDateInRange = (date: Date) => {
    if (tripType !== 'Round trip' || calendarPicker !== 'return') return false;
    const day = startOfDay(date).getTime();
    return day >= startOfDay(departDate).getTime() && day <= startOfDay(returnDate).getTime();
  };

  const selectDate = (date: Date) => {
    if (calendarPicker === 'secondDepart') {
      setSecondDepartDate(date);
      setCalendarPicker(null);
      return;
    }
    if (calendarPicker === 'depart') {
      setDepartDate(date);
      if (tripType === 'Round trip') {
        const nextReturn = startOfDay(returnDate) < startOfDay(date) ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) : returnDate;
        setReturnDate(nextReturn);
        setCalendarMonth(new Date(nextReturn.getFullYear(), nextReturn.getMonth(), 1));
        setCalendarPicker('return');
      } else {
        setCalendarPicker(null);
      }
      return;
    }
    if (startOfDay(date) < startOfDay(departDate)) return;
    setReturnDate(date);
    setCalendarPicker('return');
  };

  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const leading = first.getDay();
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const total = Math.ceil((leading + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, index) => index < leading || index >= leading + daysInMonth ? null : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - leading + 1));
  }, [calendarMonth]);

  const closeAirportPicker = () => {
    setAirportPicker(null);
    setAirportSearch('');
    sheetTranslateY.setValue(0);
    reanimatedSheetY.value = 0;
  };

  const airportSheetGesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        reanimatedSheetY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 50 || event.velocityY > 800) {
        reanimatedSheetY.value = withTiming(700, { duration: 180 }, (finished) => {
          if (finished) runOnJS(closeAirportPicker)();
        });
      } else {
        reanimatedSheetY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const airportSheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reanimatedSheetY.value }],
  }));

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
    if (airportPicker === 'secondFrom') setSecondFrom({ city: airport.city, code: airport.code });
    if (airportPicker === 'secondTo') setSecondTo({ city: airport.city, code: airport.code });
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
              <View style={[styles.route, styles.multiCityRoute]}>
                <Field label="From" value={from.city} code={from.code} minHeight={80} onPress={() => { setAirportPicker('from'); setAirportSearch(''); }} />
                <Field label="To" value={to.city} code={to.code} minHeight={80} onPress={() => { setAirportPicker('to'); setAirportSearch(''); }} />
                <Pressable onPress={swap} style={[styles.swap, styles.multiCitySwap]}><MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" /></Pressable>
              </View>
              <View style={styles.fieldRow}>
                <Field label="Depart" value={formatDate(departDate)} onPress={() => openCalendar('depart')} />
              </View>
              <View style={styles.fieldRow}>
                <Field label="Passengers" value="1 Adult" onPress={() => setSelector('passengers')} />
                <Field label="Class" value={cabin} onPress={() => setSelector('cabin')} />
              </View>
              <Pressable onPress={() => {}} style={styles.addFlightField}>
                  <Text style={styles.addFlightPlus}>＋</Text>
                  <Text style={styles.addFlightText}>Add flight</Text>
              </Pressable>
              <Pressable onPress={() => {}} style={styles.searchButton}>
                <Text style={styles.searchButtonText}>Search flights</Text>
              </Pressable>
            </View>          ) : (
            <>
              <View style={styles.route}>
                <Field label="From" value={from.city} code={from.code} onPress={() => setAirportPicker('from')} />
                <Field label="To" value={to.city} code={to.code} onPress={() => setAirportPicker('to')} />
                <Pressable onPress={swap} style={styles.swap}><MaterialCommunityIcons name="swap-vertical" size={20} color="#fff" /></Pressable>
              </View>
              <View style={styles.fieldRow}>
                <Field label="Depart" value={formatDate(departDate)} onPress={() => openCalendar('depart')} />
                {tripType === 'Round trip' && <Field label="Return" value={formatDate(returnDate)} onPress={() => openCalendar('return')} />}
              </View>
              <View style={styles.fieldRow}>
                <Field label="Passengers" value="1 Adult" onPress={() => {}} />
                <Field label="Class" value="Economy" onPress={() => {}} />
              </View>
              <Pressable onPress={() => onSearch?.({ from, to, departDate, returnDate: tripType === 'Round trip' ? returnDate : undefined, passengers, cabin, tripType })} style={styles.searchButton}>
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
          <GestureDetector gesture={airportSheetGesture}>
            <Animated.View
              style={[styles.airportSheet, airportSheetAnimatedStyle]}
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
          </GestureDetector>
        </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={calendarPicker !== null} transparent animationType="slide" onRequestClose={closeCalendar}>
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{calendarPicker === 'return' ? 'Select return date' : calendarPicker === 'secondDepart' ? 'Select second departure date' : 'Select departure date'}</Text>
                <Text style={styles.sheetSub}>{calendarPicker === 'return' ? 'After ' + formatDate(departDate) : calendarPicker === 'secondDepart' ? 'Choose when your second flight starts' : 'Choose when your trip starts'}</Text>
              </View>
              <Pressable onPress={closeCalendar} style={styles.closeButton}><MaterialCommunityIcons name="close" size={22} color={TEXT} /></Pressable>
            </View>
            <View style={styles.calendarMonthRow}>
              <Pressable onPress={() => setCalendarMonth(addMonths(calendarMonth, -1))} style={styles.calendarArrow}><MaterialCommunityIcons name="chevron-left" size={24} color={TEXT} /></Pressable>
              <Text style={styles.calendarMonthTitle}>{calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
              <Pressable onPress={() => setCalendarMonth(addMonths(calendarMonth, 1))} style={styles.calendarArrow}><MaterialCommunityIcons name="chevron-right" size={24} color={TEXT} /></Pressable>
            </View>
            <View style={styles.weekRow}>{['S','M','T','W','T','F','S'].map((day, i) => <Text key={i} style={styles.weekDay}>{day}</Text>)}</View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                if (!date) return <View key={index} style={styles.calendarCell} />;
                const key = dateKey(date);
                const selectedDate = calendarPicker === 'depart' ? departDate : calendarPicker === 'return' ? returnDate : secondDepartDate;
                const selected = key === dateKey(selectedDate) || (tripType === 'Round trip' && calendarPicker === 'return' && (key === dateKey(departDate) || key === dateKey(returnDate)));
                const beforeReturn = calendarPicker === 'return' && startOfDay(date) < startOfDay(departDate);
                const inRange = isDateInRange(date);
                const isRangeStart = inRange && key === dateKey(departDate);
                const isRangeEnd = inRange && key === dateKey(returnDate);
                const showFare = tripType === 'One way' && calendarPicker === 'depart';
                const fare = showFare ? getDailyFare(from.code, date) : null;
                return (
                  <Pressable key={key} disabled={beforeReturn} onPress={() => selectDate(date)} style={styles.calendarCell}>
                    {inRange && <View style={[styles.rangeBand, isRangeStart && styles.rangeBandStart, isRangeEnd && styles.rangeBandEnd]} />}
                    <View style={[styles.dateCircle, selected && styles.dateSelected, inRange && !selected && styles.dateInRangeCircle, beforeReturn && styles.dateDisabled]}>
                      <Text style={[styles.dateText, selected && styles.dateSelectedText, inRange && !selected && styles.dateInRangeText, beforeReturn && styles.dateDisabledText]}>{date.getDate()}</Text>
                    </View>
                    {fare !== null && <Text style={styles.fareText}>{'$'}{fare}</Text>}
                  </Pressable>
                );
              })}
            </View>
            {tripType === 'One way' && calendarPicker === 'depart' && (
              <Text style={styles.fareNote}>Cheapest shown for {from.city} ({from.code}) · final fare confirmed in flight results</Text>
            )}
            {tripType === 'Round trip' && calendarPicker === 'return' && (
              <Pressable onPress={closeCalendar} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
      <Modal visible={selector !== null} transparent animationType="slide" onRequestClose={() => setSelector(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.selectorSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selector === 'passengers' ? 'Passengers' : 'Cabin class'}</Text>
              <Pressable onPress={() => setSelector(null)} style={styles.closeButton}><MaterialCommunityIcons name="close" size={22} color={TEXT} /></Pressable>
            </View>
            {(selector === 'passengers'
              ? ['1 Adult', '2 Adults', '2 Adults, 1 Child', '2 Adults, 1 Child, 1 Infant']
              : ['Economy', 'Premium Economy', 'Business', 'First']
            ).map((option) => {
              const selectedOption = selector === 'passengers' ? passengers === option : cabin === option;
              return (
                <Pressable key={option} onPress={() => { selector === 'passengers' ? setPassengers(option) : setCabin(option); setSelector(null); }} style={styles.selectorOption}>
                  <Text style={styles.selectorText}>{option}</Text>
                  <MaterialCommunityIcons name={selectedOption ? 'check-circle' : 'circle-outline'} size={22} color={selectedOption ? BLUE : MUTED} />
                </Pressable>
              );
            })}
          </View>
        </View>
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
  multiFlightDivider: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 8, paddingBottom: 2 },
  multiFlightLabel: { fontSize: 13, fontWeight: '800', color: TEXT },
  removeFlightText: { fontSize: 12, fontWeight: '700', color: MUTED },
  route: { gap: 6, position: 'relative' },
  multiCityRoute: { flexDirection: 'row' },
  multiCitySwap: { left: '50%', right: undefined, marginLeft: -20 },
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
  selectorSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  selectorOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E6EEF0' },
  selectorText: { fontSize: 16, fontWeight: '700', color: TEXT },
  calendarSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  calendarMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 14 },
  calendarMonthTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  calendarArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF4F5', alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: MUTED },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', height: 60, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  rangeBand: { position: 'absolute', left: 0, right: 0, top: 11, height: 38, backgroundColor: AQUA },
  rangeBandStart: { left: '50%', borderTopLeftRadius: 19, borderBottomLeftRadius: 19 },
  rangeBandEnd: { right: '50%', borderTopRightRadius: 19, borderBottomRightRadius: 19 },
  dateCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dateSelected: { backgroundColor: BLUE },
  dateInRangeCircle: { backgroundColor: AQUA },
  dateText: { fontSize: 14, fontWeight: '700', color: TEXT },
  dateInRangeText: { color: TEXT },
  fareText: { position: 'absolute', bottom: 0, fontSize: 9, lineHeight: 11, fontWeight: '800', color: BLUE, zIndex: 3 },
  fareNote: { padding: 5, marginTop: 2, fontSize: 10.5, lineHeight: 15, color: MUTED, textAlign: 'center' },
  doneButton: { marginTop: 14, height: 50, borderRadius: 999, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  doneButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  dateSelectedText: { color: '#fff' },
  dateDisabled: { opacity: .3 },
  dateDisabledText: { color: MUTED },
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
