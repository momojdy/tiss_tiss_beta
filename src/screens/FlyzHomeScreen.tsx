import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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

function BottomNav({ active, onHome, onWallet, onDeals, onMore }: { active: string; onHome: () => void; onWallet: () => void; onDeals: () => void; onMore: () => void }) {
  const items = [
    ['home-outline', 'Home', onHome],
    ['wallet-outline', 'Wallet', onWallet],
    ['tag-outline', 'Deals', onDeals],
    ['dots-horizontal-circle-outline', 'More', onMore],
  ] as const;
  return (
    <View style={styles.bottomWrap}>
      <View style={styles.bottomNav}>
        {items.map(([icon, label, onPress]) => (
          <Pressable key={label} onPress={onPress} style={styles.navItem}>
            <View style={[styles.navIcon, active === label && { backgroundColor: AQUA }]}>
              <MaterialCommunityIcons name={icon} size={22} color={active === label ? BLUE : MUTED} />
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

  const swap = () => { setFrom(to); setTo(from); };

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
                <Field label="From" value={from.city} code={from.code} />
                <Field label="To" value={to.city} code={to.code} />
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
                <Field label="From" value={from.city} code={from.code} />
                <Field label="To" value={to.city} code={to.code} />
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
        <BottomNav active="Home" onHome={() => {}} onWallet={onWalletPress ?? (() => {})} onDeals={onDealsPress ?? (() => Alert.alert('Flyz Deals', 'Discounted fares, travel promotions, Wantiss offers, airline promotions and destination deals.'))} onMore={onMorePress ?? (() => {})} />
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
  tripPlane: { zIndex: 2, backgroundColor: 'rgba(202,232,232,.55)', paddingHorizontal: 4 },
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
  bottomWrap: { paddingHorizontal: 8, paddingBottom: 12, paddingTop: 4 },
  bottomNav: { height: 76, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.72)', shadowColor: '#142864', shadowOpacity: .14, shadowRadius: 14, elevation: 7, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  navItem: { width: 80, alignItems: 'center', gap: 4 },
  navIcon: { width: 52, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 11.5, fontWeight: '700', color: MUTED },
});