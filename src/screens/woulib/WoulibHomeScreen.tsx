import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {WoulibUpcomingRide, YELLOW, useWoulibTheme} from './WoulibShared';

const NEARBY = [
  {id: 'n1', name: 'Ronald Richards', color: '#5b7fd0', from: 'Business District', to: 'City Center', seats: 3, price: 8.5, away: '0.4 km', when: 'Leaves in 5 min'},
  {id: 'n2', name: 'Jane Cooper', color: '#e0714f', from: 'Shopping District', to: 'Airport', seats: 2, price: 14, away: '0.9 km', when: 'Leaves in 12 min'},
  {id: 'n3', name: 'Marcus Lee', color: '#4aa391', from: 'City Center', to: 'Downtown', seats: 1, price: 9.75, away: '1.3 km', when: 'Leaves in 20 min'},
  {id: 'n4', name: 'Sofia Alvarez', color: '#b36fc4', from: 'Downtown', to: 'Business District', seats: 3, price: 11, away: '2.1 km', when: 'Leaves in 30 min'},
];

export function WoulibHomeScreen({
  upcoming,
  onFind,
  onOffer,
  onExit,
}: {
  upcoming: WoulibUpcomingRide[];
  onFind: (dest?: string) => void;
  onOffer: () => void;
  onExit?: () => void;
}) {
  const {t, dark, toggle} = useWoulibTheme();

  return (
    <View style={{flex: 1, backgroundColor: t.bg}}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 0,
          paddingHorizontal: 18,
          paddingBottom: 112,
        }}
      >
        <View
          style={{
            height: 100,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            {onExit ? (
              <Pressable
                onPress={onExit}
                hitSlop={10}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Ionicons name="arrow-back" size={19} color={t.ink} />
              </Pressable>
            ) : null}

            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{fontSize: 27, fontWeight: '900', color: t.ink, letterSpacing: -0.8}}>Woulib</Text>
              <Ionicons name="location-sharp" size={26} color={YELLOW} style={{marginLeft: 2, marginTop: 5}} />
            </View>
          </View>

          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Pressable
              onPress={toggle}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={dark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={t.ink}
              />
            </Pressable>

            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: t.yellowSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-outline" size={18} color={t.ink} />
            </View>
          </View>
        </View>

        <View
          style={{
            backgroundColor: t.yellowSoft,
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: t.line,
            overflow: 'hidden',
          }}
        >
          <Text
            style={{
              color: t.ink,
              fontSize: 25,
              lineHeight: 30,
              fontWeight: '900',
              letterSpacing: -0.6,
              maxWidth: 300,
            }}
          >
            You’re already going there.{"\n"}Why not share the ride?
          </Text>

          <Text
            style={{
              color: t.muted,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 9,
              maxWidth: 310,
            }}
          >
            Find a nearby ride, save money, and get where you need to go.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              marginTop: 18,
              gap: 9,
            }}
          >
            <Pressable
              onPress={() => onFind()}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: 14,
                backgroundColor: YELLOW,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: '#111111',
                  fontSize: 13,
                  fontWeight: '900',
                }}
              >
                Share a ride
              </Text>
            </Pressable>

            <Pressable
              onPress={onOffer}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: t.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: t.ink,
                  fontSize: 13,
                  fontWeight: '900',
                }}
              >
                Offer a Ride
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{backgroundColor: t.card, borderRadius: 20, borderWidth: 1, borderColor: t.line, paddingHorizontal: 14, paddingTop: 5, paddingBottom: 12, marginTop: 18}}>
          <Pressable onPress={() => onFind()} style={{minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.line}}><Ionicons name="location" size={21} color={YELLOW} style={{marginHorizontal: 7, marginRight: 14}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>From</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Where are you leaving from?</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></Pressable>
          <Pressable onPress={() => onFind()} style={{minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.line}}><Ionicons name="location" size={21} color={t.ink} style={{marginHorizontal: 7, marginRight: 14}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>To</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Where are you going?</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></Pressable>
          <View style={{flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.line}}><Pressable onPress={() => onFind()} style={{flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingLeft: 7}}><Ionicons name="calendar-outline" size={20} color={t.ink} style={{marginRight: 13}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>Date</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Today</Text></View><Ionicons name="chevron-down" size={17} color={t.ink} /></Pressable><View style={{width: 1, backgroundColor: t.line, marginVertical: 10}} /><Pressable onPress={() => onFind()} style={{flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingLeft: 15}}><Ionicons name="time-outline" size={20} color={t.ink} style={{marginRight: 13}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>Time</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>Anytime</Text></View><Ionicons name="chevron-down" size={17} color={t.ink} /></Pressable></View>
          <Pressable onPress={() => onFind()} style={{minHeight: 62, flexDirection: 'row', alignItems: 'center'}}><Ionicons name="person" size={20} color={t.ink} style={{marginHorizontal: 7, marginRight: 14}} /><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 13, fontWeight: '700'}}>Passengers</Text><Text style={{color: t.muted, fontSize: 14, marginTop: 3}}>1 passenger</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></Pressable>
          <Pressable onPress={() => onFind()} style={{height: 52, borderRadius: 14, backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 2}}><Ionicons name="search-outline" size={20} color="#111111" /><Text style={{color: '#111111', fontSize: 15, fontWeight: '900'}}>Find Rides</Text></Pressable>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 11}}><Text style={{color: t.ink, fontSize: 19, fontWeight: '900'}}>Nearby Rides</Text><Text style={{color: YELLOW, fontSize: 12, fontWeight: '800'}}>See All ›</Text></View>
        {NEARBY.slice(0, 3).map((ride) => (<Pressable key={ride.id} onPress={() => onFind(ride.to)} style={{backgroundColor: t.card, borderRadius: 17, borderWidth: 1, borderColor: t.line, padding: 10, marginBottom: 10}}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 82, height: 82, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', marginRight: 11}}><Ionicons name="car-sport" size={43} color={YELLOW} /></View><View style={{flex: 1, minWidth: 0}}><Text numberOfLines={1} style={{color: t.ink, fontSize: 14, fontWeight: '900'}}>{ride.from} → {ride.to}</Text><Text style={{color: t.muted, fontSize: 12, marginTop: 4}}>{ride.when}</Text><View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}><Ionicons name="people-outline" size={14} color={t.ink} /><Text style={{color: t.muted, fontSize: 11, marginLeft: 4}}>{ride.seats} seats left</Text><Ionicons name="cash-outline" size={14} color={t.ink} style={{marginLeft: 10}} /><Text style={{color: t.ink, fontSize: 12, fontWeight: '800', marginLeft: 4}}>${ride.price.toFixed(0)}</Text></View></View></View><View style={{flexDirection: 'row', alignItems: 'center', marginTop: 9}}><View style={{width: 31, height: 31, borderRadius: 16, backgroundColor: ride.color, alignItems: 'center', justifyContent: 'center', marginRight: 8}}><Text style={{color: '#FFFFFF', fontSize: 12, fontWeight: '900'}}>{ride.name.charAt(0)}</Text></View><View style={{flex: 1}}><Text numberOfLines={1} style={{color: t.ink, fontSize: 12, fontWeight: '700'}}>{ride.name}</Text><Text style={{color: t.muted, fontSize: 10, marginTop: 1}}>★ 4.8 (124 rides)</Text></View><View style={{backgroundColor: YELLOW, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8}}><Text style={{color: '#111111', fontSize: 12, fontWeight: '900'}}>Join Ride  ›</Text></View></View></Pressable>))}
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 21, marginBottom: 11}}><Text style={{color: t.ink, fontSize: 19, fontWeight: '900'}}>Your Upcoming Rides</Text><Text style={{color: YELLOW, fontSize: 12, fontWeight: '800'}}>See All ›</Text></View>
        {upcoming.slice(0, 3).map((ride) => (<View key={ride.id} style={{backgroundColor: t.card, borderRadius: 17, borderWidth: 1, borderColor: t.line, padding: 10, marginBottom: 10}}><View style={{flexDirection: 'row', alignItems: 'center'}}><View style={{width: 82, height: 72, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', marginRight: 11}}><Ionicons name="car-sport" size={38} color={YELLOW} /></View><View style={{flex: 1}}><Text style={{color: t.ink, fontSize: 14, fontWeight: '900'}}>{ride.from} → {ride.to}</Text><Text style={{color: t.muted, fontSize: 12, marginTop: 4}}>{ride.when}</Text></View><Ionicons name="chevron-forward" size={18} color={t.muted} /></View></View>))}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 68,
          borderRadius: 18,
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 5,
        }}
      >
        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
          <View
            style={{
              width: 38,
              height: 30,
              borderRadius: 15,
              backgroundColor: t.yellowSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="home" size={18} color={t.ink} />
          </View>
          <Text style={{fontSize: 9, fontWeight: '800', color: t.ink, marginTop: 2}}>
            Home
          </Text>
        </View>

        <Pressable
          onPress={() => onFind()}
          style={{alignItems: 'center', justifyContent: 'center', flex: 1}}
        >
          <Ionicons name="search-outline" size={20} color={t.muted} />
          <Text style={{fontSize: 9, fontWeight: '700', color: t.muted, marginTop: 3}}>
            Search
          </Text>
        </Pressable>

        <Pressable
          onPress={onOffer}
          style={{alignItems: 'center', justifyContent: 'center', flex: 1}}
        >
          <Ionicons name="add-circle-outline" size={21} color={t.muted} />
          <Text style={{fontSize: 9, fontWeight: '700', color: t.muted, marginTop: 2}}>
            Offer
          </Text>
        </Pressable>

        <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
          <Ionicons name="person-outline" size={20} color={t.muted} />
          <Text style={{fontSize: 9, fontWeight: '700', color: t.muted, marginTop: 3}}>
            Profile
          </Text>
        </View>
      </View>
    </View>
  );
}

export default WoulibHomeScreen;
