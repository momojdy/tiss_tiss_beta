import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Polyline, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import * as Device from 'expo-device';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';

/* =====================================================================
   Wantiss Business Space
   Single-file React Native (Expo) screen. Backend: Supabase (migrations 001-005).
   ===================================================================== */

// Every feature has its own status lifecycle and its own listing form. Nothing is shared except the engine that renders them.
// The same lifecycles are seeded in SQL (status_transitions) so the backend enforces them, not just this UI.

type V = Record<string, any>;
type FType = 'text' | 'area' | 'num' | 'money' | 'sel' | 'chips' | 'bool' | 'date' | 'dt' | 'time' | 'photos' | 'file' | 'rows' | 'cat' | 'cal';
interface Fld {
  k: string; l: string; t: FType;
  req?: boolean; must?: boolean;            // must: boolean that has to be true (consents)
  opts?: string[]; min?: number; max?: number; def?: any;
  help?: string; ph?: string; priv?: boolean; accept?: string;
  sub?: Fld[]; tree?: Record<string, string[]>;
  when?: (v: V) => boolean;
}
interface Step { t: string; f: Fld[] }
interface Feature {
  key: string; name: string; emoji: string; color: string; noun: string; add: string;
  flow: string[];                       // order/booking lifecycle; the last entry is terminal
  approval?: boolean;                   // listings are reviewed by Wantiss before going live
  autoTitle?: (v: V) => string;         // when set, there is no title field
  steps: Step[];
  check?: (v: V) => Record<string, string>;   // cross-field rules
}


/* ---------- vendor feature registry: lifecycles and listing forms ---------- */
const FX = (() => {
const D = { text: 'text', area: 'area', num: 'num', money: 'money', sel: 'sel', chips: 'chips', bool: 'bool', date: 'date', dt: 'dt', time: 'time', photos: 'photos', file: 'file', rows: 'rows', cat: 'cat', cal: 'cal' } as const;
const mk = (t: FType) => (k: string, l: string, o: Partial<Fld> = {}): Fld => ({ k, l, t, ...o });
const T = mk(D.text), A = mk(D.area), N = mk(D.num), M = mk(D.money), Bo = mk(D.bool), DT = mk(D.dt), TM = mk(D.time), CAL = mk(D.cal), CT = mk(D.cat), PH = mk(D.photos), FL = mk(D.file), R = mk(D.rows);
const S = (k: string, l: string, opts: string[], o: Partial<Fld> = {}): Fld => ({ k, l, t: 'sel', opts, ...o });
const C = (k: string, l: string, opts: string[], o: Partial<Fld> = {}): Fld => ({ k, l, t: 'chips', opts, ...o });
const DESC = (min = 30) => A('desc', 'Description', { req: true, min, max: 4000 });
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const after = (a: any, b: any) => a && b && new Date(b).getTime() <= new Date(a).getTime();

const GOODS: Record<string, string[]> = {
  Fashion: ['Men', 'Women', 'Kids', 'Shoes', 'Bags', 'Accessories', 'Jewellery'],
  Electronics: ['Phones', 'Computers', 'Audio', 'Cameras', 'Gaming', 'Accessories'],
  'Home and Garden': ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Garden', 'Tools'],
  'Beauty and Health': ['Skincare', 'Haircare', 'Makeup', 'Fragrance', 'Wellness'],
  'Food and Drinks': ['Groceries', 'Snacks', 'Beverages', 'Fresh produce', 'Bakery'],
  'Sports and Outdoors': ['Fitness', 'Cycling', 'Camping', 'Team sports'],
  'Baby and Kids': ['Toys', 'Clothing', 'Nursery', 'School'],
  Other: ['Other'],
};
const COLLECT: Record<string, string[]> = { Collectibles: ['Coins', 'Stamps', 'Cards', 'Memorabilia', 'Toys'], Antiques: ['Furniture', 'Art', 'Jewellery', 'Watches'], Electronics: ['Phones', 'Computers', 'Cameras'], Fashion: ['Luxury bags', 'Sneakers', 'Watches'], Other: ['Other'] };
const GEN: Record<string, string[]> = { Lifestyle: ['Fashion', 'Home', 'Beauty', 'Food'], Business: ['Retail', 'Wholesale', 'Services'], Other: ['Other'] };
const SHIP = (): Fld[] => [Bo('delivery', 'Offer delivery', { def: true }), Bo('pickup', 'Offer pickup'), N('weight', 'Weight (kg)', { min: 0 }), N('handling', 'Handling time (days)', { min: 0, max: 30, def: 2 }), S('returns', 'Return policy', ['No returns', '7 days', '14 days', '30 days'], { def: '7 days' })];
const AVAIL = (): Fld[] => [C('days', 'Days available', DAYS, { req: true, def: DAYS.slice(0, 5) }), TM('from', 'Available from', { def: '09:00' }), TM('until', 'Available until', { def: '17:00' }), N('lead', 'Notice required (hours)', { min: 0, def: 12 }), CAL('blocked', 'Block dates you are unavailable')];

const FEATURES: Feature[] = [
  {
    key: 'goodies', name: 'Goodies', emoji: '🛍️', color: '#2D5BFF', noun: 'order', add: 'Add a product',
    flow: ['New', 'Accepted', 'Processing', 'Ready', 'Completed'],
    steps: [
      { t: 'Basics', f: [T('title', 'Product name', { req: true, max: 120, ph: 'e.g. Linen shirt, slim fit' }), CT('cat', 'Category', { req: true, tree: GOODS }), T('brand', 'Brand'), S('condition', 'Condition', ['New', 'Like new', 'Used - good', 'Used - fair'], { req: true, def: 'New' }), DESC(), T('tags', 'Tags', { help: 'Comma separated. Helps buyers find this product.' })] },
      { t: 'Photos', f: [PH('photos', 'Product photos', { req: true, min: 1, max: 10, help: 'The first photo is the cover. Use bright, square images on a plain background.' })] },
      { t: 'Pricing and stock', f: [M('price', 'Price', { req: true, min: 0.01 }), M('compare', 'Compare-at price', { help: 'Shown crossed out next to your price.' }), M('cost', 'Cost per item', { help: 'Only you can see this.' }), T('sku', 'SKU'), T('barcode', 'Barcode (ISBN, UPC)'), Bo('track', 'Track stock', { def: true }), N('qty', 'Quantity in stock', { req: true, min: 0, when: v => v.track !== false }), N('low', 'Low-stock alert at', { min: 0, def: 3 })] },
      { t: 'Variants', f: [R('variants', 'Variants', { help: 'Optional. Each variant can have its own price and stock.', sub: [T('name', 'Option', { req: true, ph: 'Size' }), T('value', 'Value', { req: true, ph: 'M' }), M('price', 'Price'), N('qty', 'Stock', { min: 0 })] })] },
      { t: 'Delivery', f: SHIP() },
    ],
    check: v => (v.compare && v.price && Number(v.compare) <= Number(v.price) ? { compare: 'Compare-at price must be higher than the price' } : {}),
  },
  {
    key: 'stayz', name: 'Stayz', emoji: '🏨', color: '#6B5CE7', noun: 'booking', add: 'Add a stay',
    flow: ['Requested', 'Accepted', 'Upcoming', 'Checked in', 'Completed'],
    steps: [
      { t: 'Property', f: [T('title', 'Listing title', { req: true, max: 100, ph: 'Sunny studio by the sea' }), S('ptype', 'Property type', ['Apartment', 'House', 'Villa', 'Hotel room', 'Guesthouse', 'Hostel', 'Resort', 'Cabin', 'Other'], { req: true }), S('place', 'Guests have', ['Entire place', 'Private room', 'Shared room'], { req: true, def: 'Entire place' }), DESC(50), T('address', 'Street address', { req: true }), T('city', 'City', { req: true }), T('country', 'Country', { req: true })] },
      { t: 'Spaces', f: [N('guests', 'Maximum guests', { req: true, min: 1, max: 50, def: 2 }), N('bedrooms', 'Bedrooms', { req: true, min: 0, max: 30, def: 1 }), N('beds', 'Beds', { req: true, min: 1, max: 50, def: 1 }), N('baths', 'Bathrooms', { req: true, min: 0, max: 30, def: 1 }), C('amenities', 'Amenities', ['WiFi', 'Air conditioning', 'Kitchen', 'Parking', 'Pool', 'Washer', 'TV', 'Workspace', 'Gym', 'Breakfast included', 'Elevator', 'Balcony', 'Pet friendly', 'Security'])] },
      { t: 'Photos', f: [PH('photos', 'Property photos', { req: true, min: 5, max: 30, help: 'Show every room. Listings with 8 or more photos get more bookings.' })] },
      { t: 'Pricing', f: [M('price', 'Nightly price', { req: true, min: 1 }), M('weekend', 'Weekend price'), M('cleaning', 'Cleaning fee'), N('minNights', 'Minimum nights', { min: 1, def: 1 }), N('maxNights', 'Maximum nights', { min: 1 }), N('weekly', 'Weekly discount %', { min: 0, max: 50 }), N('monthly', 'Monthly discount %', { min: 0, max: 70 })] },
      { t: 'Rules and calendar', f: [TM('checkin', 'Check-in from', { def: '14:00' }), TM('checkout', 'Check-out by', { def: '11:00' }), S('cancel', 'Cancellation policy', ['Flexible', 'Moderate', 'Strict'], { req: true, def: 'Moderate' }), Bo('instant', 'Instant booking'), A('rules', 'House rules'), CAL('blocked', 'Block dates you are unavailable')] },
    ],
    check: v => (v.maxNights && v.minNights && Number(v.maxNights) < Number(v.minNights) ? { maxNights: 'Must be at least the minimum nights' } : {}),
  },
  {
    key: 'flyz', name: 'Flyz', emoji: '✈️', color: '#0EA5B7', noun: 'booking', add: 'Add a flight',
    flow: ['Booked', 'Ticketed', 'Confirmed', 'Completed'],
    autoTitle: v => `${(v.from || '').toUpperCase()} to ${(v.to || '').toUpperCase()} · ${v.airline || ''} ${v.flightNo || ''}`.trim(),
    steps: [
      { t: 'Route', f: [T('airline', 'Airline', { req: true }), T('flightNo', 'Flight number', { req: true, ph: 'KQ 100' }), T('from', 'From (airport code)', { req: true, max: 3, ph: 'NBO' }), T('to', 'To (airport code)', { req: true, max: 3, ph: 'DXB' }), S('trip', 'Trip type', ['One-way', 'Round trip'], { req: true, def: 'One-way' }), N('stops', 'Stops', { min: 0, max: 3, def: 0 }), A('desc', 'Notes for travellers')] },
      { t: 'Schedule', f: [DT('dep', 'Departure', { req: true }), DT('arr', 'Arrival', { req: true }), DT('retDep', 'Return departure', { req: true, when: v => v.trip === 'Round trip' }), DT('retArr', 'Return arrival', { req: true, when: v => v.trip === 'Round trip' })] },
      { t: 'Fare', f: [S('cabin', 'Cabin class', ['Economy', 'Premium economy', 'Business', 'First'], { req: true, def: 'Economy' }), M('price', 'Fare per passenger', { req: true, min: 1 }), N('qty', 'Seats available', { req: true, min: 1, max: 500 }), S('baggage', 'Checked baggage', ['None', '1 x 23 kg', '2 x 23 kg'], { def: '1 x 23 kg' }), N('carryOn', 'Carry-on (kg)', { min: 0, def: 7 }), Bo('refundable', 'Refundable'), M('changeFee', 'Change fee'), A('fareRules', 'Fare rules')] },
      { t: 'Photos', f: [PH('photos', 'Photos (optional)', { max: 3 })] },
    ],
    check: v => ({
      ...(v.from && v.to && String(v.from).toUpperCase() === String(v.to).toUpperCase() ? { to: 'Destination must differ from origin' } : {}),
      ...(after(v.dep, v.arr) ? { arr: 'Arrival must be after departure' } : {}),
      ...(v.trip === 'Round trip' && after(v.arr, v.retDep) ? { retDep: 'Return must be after arrival' } : {}),
    }),
  },
  {
    key: 'woulib', name: 'Woulib', emoji: '🚖', color: '#1F9D6B', noun: 'request', add: 'Set up a service',
    flow: ['Requested', 'Driver assigned', 'En route', 'In progress', 'Completed'],
    steps: [
      { t: 'Service', f: [T('title', 'Service name', { req: true, max: 80 }), S('service', 'Service type', ['Ride (taxi)', 'Ride-share', 'Parcel delivery', 'Food delivery', 'Courier (documents)'], { req: true }), DESC(20)] },
      { t: 'Vehicle', f: [S('vehicle', 'Vehicle type', ['Motorbike', 'Car', 'Van', 'Truck', 'Bicycle'], { req: true }), T('plate', 'Plate number', { req: true }), N('seats', 'Passenger seats', { min: 1, max: 60, req: true, when: v => /Ride/.test(v.service || '') }), N('capacityKg', 'Load capacity (kg)', { min: 1, req: true, when: v => /(delivery|Courier)/.test(v.service || '') }), PH('photos', 'Vehicle photos', { req: true, min: 2, max: 8 }), PH('docs', 'Licence and insurance documents', { req: true, min: 1, max: 6, priv: true, help: 'Only the Wantiss review team can see these.' })] },
      { t: 'Coverage', f: [T('city', 'City', { req: true }), N('radius', 'Service radius (km)', { req: true, min: 1, max: 500 }), T('areas', 'Areas served', { help: 'Comma separated' })] },
      { t: 'Pricing', f: [M('base', 'Base fare', { req: true, min: 0 }), M('perKm', 'Price per km', { req: true, min: 0.01 }), M('perMin', 'Price per minute'), M('minFare', 'Minimum fare'), N('night', 'Night surcharge %', { min: 0, max: 100 })] },
      { t: 'Availability', f: [...AVAIL().slice(0, 3), Bo('auto', 'Accept requests automatically', { def: true })] },
    ],
  },
  {
    key: 'rideza', name: 'Rideza', emoji: '🚗', color: '#E0A526', noun: 'reservation', add: 'List a vehicle',
    flow: ['Reserved', 'Confirmed', 'Picked up', 'Returned', 'Completed'],
    autoTitle: v => `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim(),
    steps: [
      { t: 'Vehicle', f: [T('make', 'Make', { req: true }), T('model', 'Model', { req: true }), N('year', 'Year', { req: true, min: 1990, max: 2027 }), S('type', 'Vehicle type', ['Economy', 'Compact', 'Sedan', 'SUV', 'Van', 'Luxury', 'Pickup', 'Convertible'], { req: true }), S('trans', 'Transmission', ['Automatic', 'Manual'], { req: true }), S('fuel', 'Fuel', ['Petrol', 'Diesel', 'Hybrid', 'Electric'], { req: true }), N('seats', 'Seats', { req: true, min: 1, max: 20 }), N('doors', 'Doors', { min: 2, max: 6 }), T('plate', 'Plate number', { req: true }), T('color', 'Colour'), C('features', 'Features', ['Air conditioning', 'GPS', 'Bluetooth', 'Child seat', 'USB charging', 'Roof rack', 'Cruise control', 'Sunroof', 'Dashcam']), A('desc', 'Description')] },
      { t: 'Photos', f: [PH('photos', 'Vehicle photos', { req: true, min: 4, max: 20, help: 'Exterior from four angles plus the interior.' })] },
      { t: 'Rates', f: [M('price', 'Daily rate', { req: true, min: 1 }), M('weekly', 'Weekly rate'), M('deposit', 'Security deposit', { req: true, min: 0 }), Bo('unlimited', 'Unlimited mileage'), N('kmDay', 'Mileage limit per day (km)', { min: 1, req: true, when: v => !v.unlimited }), M('extraKm', 'Extra km fee', { when: v => !v.unlimited })] },
      { t: 'Rental terms', f: [N('minAge', 'Minimum driver age', { min: 18, max: 30, def: 21 }), N('minDays', 'Minimum rental days', { min: 1, def: 1 }), C('pickup', 'Pickup options', ['Branch pickup', 'Airport', 'Delivered to customer'], { req: true }), T('location', 'Pickup address', { req: true }), S('fuelPolicy', 'Fuel policy', ['Full to full', 'Prepaid'], { def: 'Full to full' }), S('ins', 'Insurance', ['Basic included', 'Full coverage included', 'Customer provides'], { req: true }), CAL('blocked', 'Block dates the vehicle is unavailable')] },
    ],
  },
  {
    key: 'habita', name: 'Habita', emoji: '🏠', color: '#E4572E', noun: 'inquiry', add: 'List a property',
    flow: ['Inquiry', 'Viewing scheduled', 'Offer', 'Under contract', 'Closed'],
    steps: [
      { t: 'Property', f: [S('mode', 'Listing type', ['For rent', 'For sale'], { req: true }), S('ptype', 'Property type', ['Apartment', 'House', 'Land', 'Commercial', 'Office', 'Warehouse'], { req: true }), T('title', 'Listing title', { req: true, max: 100 }), DESC(50), T('address', 'Address', { req: true }), T('city', 'City', { req: true }), T('country', 'Country', { req: true })] },
      { t: 'Details', f: [N('beds', 'Bedrooms', { min: 0, max: 50 }), N('baths', 'Bathrooms', { min: 0, max: 50 }), N('area', 'Area (m²)', { req: true, min: 1 }), N('year', 'Year built', { min: 1800, max: 2027 }), S('furnished', 'Furnishing', ['Furnished', 'Semi-furnished', 'Unfurnished']), C('feat', 'Features', ['Parking', 'Garden', 'Balcony', 'Security', 'Elevator', 'Pool', 'Generator', 'Water tank', 'Fibre internet'])] },
      { t: 'Photos', f: [PH('photos', 'Property photos', { req: true, min: 5, max: 30 })] },
      { t: 'Price and contact', f: [M('price', 'Price', { req: true, min: 1 }), S('period', 'Rent period', ['Month', 'Year', 'Week'], { req: true, def: 'Month', when: v => v.mode === 'For rent' }), M('deposit', 'Deposit', { when: v => v.mode === 'For rent' }), N('lease', 'Minimum lease (months)', { min: 1, when: v => v.mode === 'For rent' }), Bo('negotiable', 'Price negotiable'), Bo('deed', 'Title documents available', { when: v => v.mode === 'For sale' }), T('agent', 'Contact name', { req: true }), T('phone', 'Contact phone', { req: true })] },
    ],
  },
  {
    key: 'services', name: 'Services', emoji: '🧰', color: '#3A7BD5', noun: 'request', add: 'Add a service',
    flow: ['Requested', 'Accepted', 'Scheduled', 'In progress', 'Completed'],
    steps: [
      { t: 'Basics', f: [T('title', 'Service title', { req: true, max: 100 }), CT('cat', 'Category', { req: true, tree: { 'Home services': ['Cleaning', 'Plumbing', 'Electrical', 'Painting', 'Moving', 'Repairs'], Professional: ['Legal', 'Accounting', 'Consulting', 'Translation', 'Tutoring'], Tech: ['Web design', 'App development', 'IT support'], Creative: ['Photography', 'Video', 'Design', 'Writing', 'Music'], Personal: ['Fitness coaching', 'Childcare', 'Pet care'] } }), DESC(), N('years', 'Years of experience', { min: 0, max: 60 })] },
      { t: 'Photos', f: [PH('photos', 'Work samples', { req: true, min: 1, max: 10 })] },
      { t: 'Pricing', f: [S('model', 'Pricing model', ['Fixed price', 'Per hour', 'Per day', 'Quote on request'], { req: true }), M('price', 'Price', { req: true, min: 1, when: v => v.model !== 'Quote on request' }), N('duration', 'Typical duration (min)', { min: 5 }), M('callout', 'Call-out fee')] },
      { t: 'Coverage and availability', f: [S('where', 'Where you work', ['At customer location', 'At my location', 'Online', 'Any'], { req: true }), N('radius', 'Service radius (km)', { min: 1 }), ...AVAIL(), Bo('instant', 'Accept bookings instantly')] },
    ],
  },
  {
    key: 'arts', name: 'Arts & Litts', emoji: '🎨', color: '#B24BF3', noun: 'order', add: 'Add artwork or book',
    flow: ['New', 'Accepted', 'In production', 'Shipped', 'Completed'],
    steps: [
      { t: 'Basics', f: [S('kind', 'Type', ['Artwork', 'Book', 'Print', 'Sculpture', 'Handmade craft', 'Ebook'], { req: true }), T('title', 'Title', { req: true, max: 150 }), T('creator', 'Artist or author', { req: true }), CT('cat', 'Category', { req: true, tree: { Art: ['Painting', 'Drawing', 'Photography', 'Digital art', 'Sculpture', 'Textile'], Books: ['Fiction', 'Non-fiction', 'Poetry', 'Children', 'Academic', 'Comics'], Craft: ['Pottery', 'Jewellery', 'Woodwork', 'Leather'] } }), DESC()] },
      { t: 'Details', f: [T('medium', 'Medium or format'), T('dims', 'Dimensions'), T('isbn', 'ISBN', { when: v => /Book/.test(v.kind || '') }), N('pages', 'Pages', { min: 1, when: v => /Book/.test(v.kind || '') }), T('lang', 'Language'), S('edition', 'Edition', ['Original', 'Limited edition', 'Open edition'], { def: 'Original' }), N('editionSize', 'Edition size', { min: 2, req: true, when: v => v.edition === 'Limited edition' }), N('year', 'Year created', { min: 1000, max: 2027 }), Bo('signed', 'Signed by creator'), Bo('cert', 'Certificate of authenticity')] },
      { t: 'Photos', f: [PH('photos', 'Photos', { req: true, min: 1, max: 12 })] },
      { t: 'Price and shipping', f: [M('price', 'Price', { req: true, min: 0.01 }), N('qty', 'Quantity', { req: true, min: 1 }), ...SHIP().slice(0, 3), S('packaging', 'Packaging', ['Standard', 'Fragile (crated)', 'Rolled tube', 'Digital download'])] },
    ],
  },
  {
    key: 'gatherz', name: 'Gatherz / Eventiss', emoji: '🎉', color: '#E0457B', noun: 'booking', add: 'Create an event',
    flow: ['Booked', 'Confirmed', 'Checked in', 'Completed'],
    steps: [
      { t: 'Event', f: [T('title', 'Event name', { req: true, max: 120 }), CT('cat', 'Category', { req: true, tree: { Music: ['Concert', 'Festival', 'Club night'], Business: ['Conference', 'Networking', 'Workshop'], Community: ['Charity', 'Religious', 'Sports'], Arts: ['Theatre', 'Exhibition', 'Film'], Food: ['Tasting', 'Market'] } }), DESC(), PH('photos', 'Event poster and photos', { req: true, min: 1, max: 8 })] },
      { t: 'When and where', f: [DT('start', 'Starts', { req: true }), DT('end', 'Ends', { req: true }), S('format', 'Format', ['In person', 'Online', 'Hybrid'], { req: true, def: 'In person' }), T('venue', 'Venue', { req: true, when: v => v.format !== 'Online' }), T('address', 'Address', { req: true, when: v => v.format !== 'Online' }), T('city', 'City', { req: true, when: v => v.format !== 'Online' }), T('link', 'Online link', { req: true, when: v => v.format !== 'In person' })] },
      { t: 'Tickets', f: [R('tiers', 'Ticket tiers', { req: true, sub: [T('name', 'Tier name', { req: true, ph: 'General admission' }), M('price', 'Price', { req: true, min: 0 }), N('qty', 'Quantity', { req: true, min: 1 })] }), N('max', 'Max tickets per order', { min: 1, max: 50, def: 10 }), DT('salesEnd', 'Ticket sales close')] },
      { t: 'Policies', f: [S('refund', 'Refund policy', ['No refunds', 'Up to 7 days before', 'Up to 48 hours before'], { req: true }), S('age', 'Age limit', ['All ages', '16+', '18+', '21+'], { def: 'All ages' }), A('rules', 'Entry rules')] },
    ],
    check: v => (after(v.start, v.end) ? { end: 'Event must end after it starts' } : {}),
  },
  {
    key: 'glowz', name: 'Glowz', emoji: '💅', color: '#D4639B', noun: 'appointment', add: 'Add a treatment',
    flow: ['Requested', 'Confirmed', 'In service', 'Completed'],
    steps: [
      { t: 'Treatment', f: [T('title', 'Treatment name', { req: true, max: 100 }), CT('cat', 'Category', { req: true, tree: { Hair: ['Cut', 'Colour', 'Braids', 'Styling'], Nails: ['Manicure', 'Pedicure'], Skin: ['Facial', 'Waxing'], Makeup: ['Bridal', 'Everyday'], Wellness: ['Massage', 'Spa', 'Yoga'], Barber: ['Haircut', 'Beard'] } }), DESC(), PH('photos', 'Photos', { req: true, min: 1, max: 10 })] },
      { t: 'Price and add-ons', f: [M('price', 'Price', { req: true, min: 1 }), N('duration', 'Duration (min)', { req: true, min: 5 }), M('deposit', 'Deposit'), R('addons', 'Add-ons', { sub: [T('name', 'Add-on', { req: true }), M('price', 'Price', { req: true }), N('mins', 'Extra minutes')] })] },
      { t: 'Where and when', f: [S('where', 'Where', ['At salon', 'At customer location', 'Both'], { req: true }), T('address', 'Salon address', { req: true, when: v => v.where !== 'At customer location' }), N('staff', 'Staff available', { min: 1, def: 1 }), N('buffer', 'Buffer between bookings (min)', { min: 0, def: 10 }), ...AVAIL(), S('cancel', 'Cancellation', ['Free up to 24h', 'Free up to 48h', 'Deposit non-refundable'], { def: 'Free up to 24h' })] },
    ],
  },
  {
    key: 'streamz', name: 'Streamz', emoji: '🎬', color: '#7A5AF8', noun: 'subscription', add: 'Publish content',
    flow: ['Pending', 'Active', 'Completed'],
    steps: [
      { t: 'Content', f: [S('type', 'Content type', ['Video', 'Live stream', 'Music', 'Podcast', 'Course', 'Photo gallery'], { req: true }), T('title', 'Title', { req: true, max: 120 }), DESC(20), T('tags', 'Tags', { help: 'Comma separated' }), S('age', 'Audience', ['Everyone', '13+', '18+'], { def: 'Everyone' })] },
      { t: 'Media', f: [PH('photos', 'Cover image', { req: true, min: 1, max: 1 }), FL('media', 'Media file', { req: true, accept: 'video/*,audio/*', max: 200, help: 'Up to 200 MB. Live streams do not need a file.', when: v => v.type !== 'Live stream' }), DT('liveAt', 'Live start', { req: true, when: v => v.type === 'Live stream' })] },
      { t: 'Monetisation', f: [S('model', 'Monetisation', ['Free', 'Pay per view', 'Subscription', 'Tips only'], { req: true, def: 'Free' }), M('price', 'Price', { req: true, min: 0.5, when: v => /(Pay|Subscription)/.test(v.model || '') }), S('period', 'Billing period', ['Month', 'Year'], { req: true, when: v => v.model === 'Subscription' }), Bo('preview', 'Allow a free preview'), DT('publishAt', 'Schedule publishing'), Bo('rights', 'I own or license all rights to this content', { must: true })] },
    ],
  },
  {
    key: 'dealz', name: 'Dealz', emoji: '🏷️', color: '#F2780C', noun: 'claim', add: 'Create a deal',
    flow: ['Claimed', 'Redeemed', 'Settled'],
    steps: [
      { t: 'Deal', f: [T('title', 'Deal title', { req: true, max: 100 }), CT('cat', 'Category', { req: true, tree: GEN }), DESC(20), PH('photos', 'Photos', { req: true, min: 1, max: 6 })] },
      { t: 'Offer', f: [M('original', 'Original price', { req: true, min: 0.01 }), M('price', 'Deal price', { req: true, min: 0 }), N('qty', 'Deals available', { req: true, min: 1 }), N('perUser', 'Limit per customer', { min: 1, def: 1 }), DT('start', 'Starts', { req: true }), DT('end', 'Ends', { req: true })] },
      { t: 'Redemption', f: [S('redeem', 'How it is redeemed', ['Online', 'In store (show code)', 'Both'], { req: true }), T('location', 'Store address', { req: true, when: v => v.redeem !== 'Online' }), A('terms', 'Terms and conditions', { req: true, min: 20 })] },
    ],
    check: v => ({
      ...(v.original && v.price && Number(v.price) >= Number(v.original) ? { price: 'Deal price must be lower than the original price' } : {}),
      ...(after(v.start, v.end) ? { end: 'Must end after it starts' } : {}),
    }),
  },
  {
    key: 'globiz', name: 'Globiz', emoji: '🌐', color: '#2A9D8F', noun: 'inquiry', add: 'Add a business offer',
    flow: ['Inquiry', 'Quoted', 'Accepted', 'Completed'],
    steps: [
      { t: 'Offer', f: [T('title', 'Business or offer name', { req: true, max: 120 }), S('type', 'Offer type', ['Product offer', 'Service offer', 'Partnership', 'Wholesale bulk'], { req: true }), CT('cat', 'Industry', { req: true, tree: { Retail: ['Fashion', 'Electronics', 'Home'], Wholesale: ['Food', 'Textiles', 'Hardware'], Manufacturing: ['Packaging', 'Furniture'], Agriculture: ['Produce', 'Equipment'], 'Professional services': ['Consulting', 'Legal'], Construction: ['Materials', 'Contracting'], Logistics: ['Freight', 'Warehousing'], Technology: ['Software', 'Hardware'] } }), DESC(), PH('photos', 'Photos', { req: true, min: 1, max: 10 }), M('price', 'Starting price'), T('moq', 'Minimum order', { when: v => v.type === 'Wholesale bulk' })] },
      { t: 'Contact', f: [T('contact', 'Contact name', { req: true }), T('phone', 'Phone', { req: true }), T('email', 'Email'), T('website', 'Website'), T('address', 'Address'), T('city', 'City', { req: true }), T('regions', 'Regions served', { help: 'Comma separated' }), S('response', 'Typical response time', ['Within 1 hour', 'Same day', '1-2 days']), Bo('quote', 'Accept quote requests', { def: true })] },
    ],
  },
  {
    key: 'bidz', name: 'Bidz', emoji: '🔨', color: '#8E5BE8', noun: 'auction', add: 'Start an auction',
    flow: ['Live', 'Ended', 'Awarded', 'Paid', 'Completed'],
    steps: [
      { t: 'Item', f: [T('title', 'Item title', { req: true, max: 120 }), CT('cat', 'Category', { req: true, tree: COLLECT }), S('condition', 'Condition', ['New', 'Like new', 'Used - good', 'Used - fair', 'For parts'], { req: true }), DESC(), PH('photos', 'Photos', { req: true, min: 3, max: 12 })] },
      { t: 'Auction', f: [M('start', 'Starting bid', { req: true, min: 0.01 }), M('reserve', 'Reserve price', { help: 'The item will not sell below this. Hidden from bidders.' }), M('buyNow', 'Buy now price'), M('inc', 'Bid increment', { req: true, min: 0.01, def: 1 }), DT('startAt', 'Starts', { req: true }), S('hours', 'Duration', ['24', '48', '72', '120', '168'], { req: true, def: '72', help: 'Hours' }), Bo('autoExtend', 'Extend 5 minutes when a bid arrives at the end', { def: true })] },
      { t: 'Delivery', f: SHIP() },
    ],
    check: v => ({
      ...(v.reserve && v.start && Number(v.reserve) < Number(v.start) ? { reserve: 'Reserve cannot be below the starting bid' } : {}),
      ...(v.buyNow && Number(v.buyNow) <= Number(v.reserve || v.start || 0) ? { buyNow: 'Buy now must be higher than the reserve or starting bid' } : {}),
    }),
  },
  {
    key: 'lutz', name: 'Lutz', emoji: '🎟️', color: '#C79A3E', noun: 'ticket order', add: 'Create a raffle', approval: true,
    flow: ['Open', 'Sold out', 'Drawn', 'Prize sent', 'Completed'],
    steps: [
      { t: 'Prize', f: [T('title', 'Raffle title', { req: true, max: 120 }), T('prize', 'Prize', { req: true }), M('prizeValue', 'Prize value', { req: true, min: 1 }), DESC(), PH('photos', 'Prize photos', { req: true, min: 2, max: 8 })] },
      { t: 'Tickets and draw', f: [M('ticket', 'Ticket price', { req: true, min: 0.5 }), N('total', 'Total tickets', { req: true, min: 10 }), N('maxPer', 'Max tickets per person', { min: 1 }), N('minSold', 'Minimum tickets to run the draw', { min: 1 }), DT('drawAt', 'Draw date', { req: true }), S('method', 'Draw method', ['Random draw by Wantiss', 'Live draw'], { req: true, def: 'Random draw by Wantiss' })] },
      { t: 'Rules', f: [A('rules', 'Rules and eligibility', { req: true, min: 30 }), T('eligible', 'Eligible countries', { req: true }), Bo('age', 'Entrants must be 18 or older', { must: true })] },
    ],
    check: v => (v.drawAt && new Date(v.drawAt).getTime() < Date.now() ? { drawAt: 'Draw date must be in the future' } : {}),
  },
];

const FM: Record<string, Feature> = Object.fromEntries(FEATURES.map(f => [f.key, f]));
const TOPUP_NOTE = 'Topup has no vendor dashboard.';
/** Managed by Wantiss itself, so they never appear in the vendor tools. */
const PLATFORM_MANAGED = ['konsoliss', 'prezo', 'frenzies'];
/** Icon and colour for each vendor feature (Material Community Icons). */
const FUI: Record<string, { icon: string; color: string }> = {
  goodies: { icon: 'shopping-outline', color: '#2D5BFF' }, stayz: { icon: 'bed-outline', color: '#7357E8' }, woulib: { icon: 'car-outline', color: '#16A085' },
  rideza: { icon: 'car-key', color: '#E58A28' }, flyz: { icon: 'airplane', color: '#2388D9' }, habita: { icon: 'home-city-outline', color: '#8B6BD6' },
  services: { icon: 'briefcase-outline', color: '#3B9B7A' }, glowz: { icon: 'spa-outline', color: '#D56BA8' }, gatherz: { icon: 'ticket-confirmation-outline', color: '#E58A28' },
  arts: { icon: 'palette-outline', color: '#7C64C7' }, streamz: { icon: 'play-circle-outline', color: '#D54F65' }, dealz: { icon: 'tag-outline', color: '#168C9A' },
  globiz: { icon: 'earth', color: '#3A77B8' }, lutz: { icon: 'ticket-outline', color: '#7B62D6' }, bidz: { icon: 'gavel', color: '#4F6C9E' },
};

const visible = (f: Fld, v: V) => !f.when || f.when(v);
const defaults = (fe: Feature): V => {
  const v: V = {};
  fe.steps.forEach(s => s.f.forEach(f => {
    if (f.def !== undefined) v[f.k] = f.def;
    else if (f.t === 'photos' || f.t === 'chips' || f.t === 'rows' || f.t === 'cal') v[f.k] = [];
  }));
  return v;
};
const titleOf = (fe: Feature, v: V) => (fe.autoTitle ? fe.autoTitle(v) : String(v.title || '')).trim();

const empty = (f: Fld, x: any) => (Array.isArray(x) ? x.length === 0 : x === undefined || x === null || String(x).trim() === '');

/** Returns field errors. mode 'draft' only needs a title; 'publish' validates everything visible. */
function validate(fe: Feature, v: V, mode: 'draft' | 'publish', only?: Fld[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (mode === 'draft') { if (!titleOf(fe, v) && !fe.autoTitle) e.title = 'Add a title to save a draft'; return e; }
  const fields = only ?? fe.steps.flatMap(s => s.f);
  for (const f of fields) {
    if (!visible(f, v)) continue;
    const x = v[f.k];
    if (f.must) { if (x !== true) e[f.k] = 'You need to confirm this'; continue; }
    if (f.req && empty(f, x)) { e[f.k] = f.t === 'photos' ? `Add at least ${f.min ?? 1} photo${(f.min ?? 1) > 1 ? 's' : ''}` : f.t === 'rows' ? 'Add at least one row' : 'Required'; continue; }
    if (empty(f, x)) continue;
    if (f.t === 'photos') { const n = (x as string[]).length; if (f.min && n < f.min) e[f.k] = `Add at least ${f.min} photos (you have ${n})`; if (f.max && n > f.max) e[f.k] = `At most ${f.max} photos`; }
    if (f.t === 'num' || f.t === 'money') { const n = Number(x); if (Number.isNaN(n)) e[f.k] = 'Enter a number'; else if (f.min !== undefined && n < f.min) e[f.k] = `Must be at least ${f.min}`; else if (f.max !== undefined && n > f.max) e[f.k] = `Must be at most ${f.max}`; }
    if ((f.t === 'text' || f.t === 'area') && f.min && String(x).trim().length < f.min) e[f.k] = `Write at least ${f.min} characters`;
    if ((f.t === 'text' || f.t === 'area') && f.max && String(x).length > f.max) e[f.k] = `At most ${f.max} characters`;
    if (f.t === 'cat' && !x?.sub && f.req) e[f.k] = 'Choose a category and subcategory';
    if (f.t === 'rows') (x as V[]).forEach((row, i) => (f.sub ?? []).forEach(sf => { if (sf.req && empty(sf, row[sf.k])) e[`${f.k}.${i}.${sf.k}`] = 'Required'; }));
  }
  if (!only && fe.check) Object.assign(e, fe.check(v));
  return e;
}

return { FEATURES, FM, TOPUP_NOTE, PLATFORM_MANAGED, FUI, defaults, titleOf, validate };
})();

/* ---------- theme ---------- */
const LIGHT = { blue: '#2D5BFF', ink: '#182033', mute: '#6F7890', line: '#E8ECF5', bg: '#F5F7FC', card: '#FFFFFF', soft: '#EEF1FF', chip: '#F3F5FA', good: '#16794B', goodBg: '#E3F7EC', warn: '#96650B', warnBg: '#FFF2D7', bad: '#C65D2E', badBg: '#FDE3E3', badFg: '#B3261E', ref: '#FFF0E8', scrim: 'rgba(15,23,42,0.35)' };
const DARK: typeof LIGHT = { blue: '#4C73FF', ink: '#EEF1FA', mute: '#98A2BD', line: '#2A3350', bg: '#0E1424', card: '#171F36', soft: '#202B4F', chip: '#202944', good: '#5BD39B', goodBg: '#123524', warn: '#F0BE5A', warnBg: '#3A2D12', bad: '#F08A5A', badBg: '#3A1A1A', badFg: '#F08A80', ref: '#3A2418', scrim: 'rgba(0,0,0,0.55)' };
type Theme = typeof LIGHT;
const ThemeCtx = createContext<Theme>(LIGHT);
const useTheme = () => useContext(ThemeCtx);

function useS() {
  const t = useTheme();
  return useMemo(() => StyleSheet.create({
    card: { backgroundColor: t.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: t.line },
    cardFlat: { backgroundColor: t.card, borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: t.line },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    g: { flex: 1, minWidth: 0 },
    h1: { fontSize: 24, fontWeight: '800', color: t.ink },
    title: { fontSize: 16, fontWeight: '800', color: t.ink },
    rt: { fontSize: 13, fontWeight: '700', color: t.ink },
    mut: { fontSize: 12, lineHeight: 18, color: t.mute },
    sub: { fontSize: 11, color: t.mute, marginTop: 3 },
    big: { fontSize: 20, fontWeight: '800', color: t.ink },
    ar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    div: { borderTopWidth: 1, borderTopColor: t.line },
    label: { fontSize: 12, fontWeight: '700', color: t.mute, marginTop: 12, marginBottom: 6 },
    fld: { minHeight: 46, borderWidth: 1, borderColor: t.line, borderRadius: 12, backgroundColor: t.card, paddingHorizontal: 14, color: t.ink, fontSize: 14 },
    sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
    secT: { fontSize: 16, fontWeight: '800', color: t.ink },
    link: { fontSize: 12, fontWeight: '700', color: t.blue },
  }), [t]);
}

/* ---------- helpers ---------- */
const money = (v: unknown, cur = 'USD') => {
  const n = Number(v ?? 0), x = Number.isFinite(n) ? n : 0;
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(x); } catch { return `$${x.toFixed(2)}`; }
};
const short = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (s: string) => new Date(`${s}T00:00:00`);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtDay = (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
const ago = (v: string) => { const s = (Date.now() - new Date(v).getTime()) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} hr ago` : `${Math.floor(s / 86400)}d ago`; };
const dayHead = (v: string) => { const d = new Date(v), n = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }); };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const errText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e ?? 'Something went wrong'));
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const uuid = () => (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/* ---------- types ---------- */
type Status = 'setup' | 'pending' | 'action' | 'restricted' | 'verified';
interface Biz { id: string; name: string; logo_url: string | null; verification: Status; payout_ready: boolean; is_live: boolean; role: string; description?: string | null; phone?: string | null; phone_country?: string | null; email?: string | null; address?: string | null; city?: string | null; country?: string | null; website?: string | null; hours?: Record<string, { open: string; close: string; closed: boolean }> | null; delivery_modes?: string[] | null }
interface PayRule { method: string; name: string; cap: number; window_days: number; fee: number; eta: string; needs_bank: boolean }
interface Meta { feats: { feature: string; status: string }[]; listings: number; unreadN: number; unreadM: number; payout: { status: string; last4: string | null } | null; rules: PayRule[]; minWithdrawal: number }
interface Range { key: string; from: string; to: string; label: string; days: number }
const STATUS_UI: Record<Status, { label: string; tone: 'good' | 'warn' | 'bad' | 'mute' }> = { verified: { label: 'Verified', tone: 'good' }, pending: { label: 'In review', tone: 'warn' }, action: { label: 'Action required', tone: 'bad' }, restricted: { label: 'Restricted', tone: 'bad' }, setup: { label: 'Not registered', tone: 'mute' } };
const MAX_BUSINESSES = 5;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultHours = () => Object.fromEntries(DAYS.map((d, i) => [d, { open: '09:00', close: i > 4 ? '15:00' : '18:00', closed: i === 6 }]));
const DEFAULT_RULES: PayRule[] = [
  { method: 'std', name: 'Standard bank payout', cap: 100000, window_days: 7, fee: 0, eta: 'Arrives within 14 days', needs_bank: true },
  { method: 'exp', name: 'Express bank payout', cap: 3000000, window_days: 1, fee: 0.035, eta: 'Same day', needs_bank: true },
  { method: 'card', name: 'Debit card', cap: 10000, window_days: 1, fee: 0, eta: '', needs_bank: true },
  { method: 'wal', name: 'Wantiss wallet', cap: 0, window_days: 0, fee: 0, eta: '', needs_bank: false },
];
const LANGUAGES = ['English', 'Français', 'Español', 'Português', 'العربية', 'Kiswahili', 'Hausa', 'Yorùbá'];
const COUNTRIES = ("NG|Nigeria|234;GH|Ghana|233;KE|Kenya|254;ZA|South Africa|27;EG|Egypt|20;MA|Morocco|212;TZ|Tanzania|255;UG|Uganda|256;ET|Ethiopia|251;SN|Senegal|221;CI|Côte d'Ivoire|225;CM|Cameroon|237;DZ|Algeria|213;TN|Tunisia|216;RW|Rwanda|250;ZM|Zambia|260;ZW|Zimbabwe|263;AO|Angola|244;MZ|Mozambique|258;BW|Botswana|267;NA|Namibia|264;US|United States|1;CA|Canada|1;GB|United Kingdom|44;IE|Ireland|353;FR|France|33;DE|Germany|49;ES|Spain|34;PT|Portugal|351;IT|Italy|39;NL|Netherlands|31;BE|Belgium|32;CH|Switzerland|41;SE|Sweden|46;NO|Norway|47;DK|Denmark|45;PL|Poland|48;TR|Türkiye|90;AE|United Arab Emirates|971;SA|Saudi Arabia|966;QA|Qatar|974;KW|Kuwait|965;IL|Israel|972;IN|India|91;PK|Pakistan|92;BD|Bangladesh|880;LK|Sri Lanka|94;CN|China|86;JP|Japan|81;KR|South Korea|82;SG|Singapore|65;MY|Malaysia|60;ID|Indonesia|62;PH|Philippines|63;TH|Thailand|66;VN|Vietnam|84;AU|Australia|61;NZ|New Zealand|64;BR|Brazil|55;MX|Mexico|52;AR|Argentina|54;CO|Colombia|57;CL|Chile|56;PE|Peru|51;JM|Jamaica|1876;TT|Trinidad and Tobago|1868")
  .split(';').map(x => { const p = x.split('|'); return { code: p[0], name: p[1], dial: p[2] }; });
const flagOf = (c: string) => c.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
const countryOf = (c?: string | null) => COUNTRIES.find(x => x.code === c) ?? COUNTRIES[0];

/* ---------- ranges ---------- */
const rangeLabel = (from: string, to: string) => `${fmtDay(parseISO(from))} – ${fmtDay(parseISO(to))}`;
function presetRange(key: string): Range {
  const days = key === '7D' ? 7 : key === '30D' ? 30 : key === '90D' ? 90 : 365, to = new Date(), from = addDays(to, -(days - 1));
  return { key, from: iso(from), to: iso(to), days, label: key === '7D' ? 'Last 7 days' : key === '30D' ? 'Last 30 days' : key === '90D' ? 'Last 90 days' : 'Last year' };
}
function customRange(from: string, to: string): Range { return { key: 'custom', from, to, days: Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 864e5) + 1, label: rangeLabel(from, to) }; }

/* ---------- data layer ---------- */
async function q<T = any>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T> { const { data, error } = await p; if (error) throw error; return data as T; }
const rpc = <T = any,>(fn: string, args: Record<string, unknown>) => q<T>(supabase.rpc(fn, args) as any);
function useQ<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [s, set] = useState<{ d: T | null; l: boolean; e: string | null }>({ d: null, l: true, e: null });
  const n = useRef(0);
  const run = useCallback(async () => {
    const id = ++n.current;
    set(p => ({ ...p, l: true, e: null }));
    try { const d = await fn(); if (id === n.current) set({ d, l: false, e: null }); }
    catch (e) { if (id === n.current) set(p => ({ ...p, l: false, e: errText(e) })); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void run(); }, [run]);
  return { ...s, reload: run };
}
const publicUrl = (path: string) => supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;

/* ---------- app context ---------- */
interface App {
  biz: Biz; bizList: Biz[]; meta: Meta; userId: string; email: string; name: string;
  tick: number; bump: () => void; toast: (m: string) => void;
  go: (page: string, arg?: any) => void; back: () => void; tab: (p: string | null) => void;
  sheet: (name: string, arg?: any) => void; closeSheet: () => void;
  panel: (p: string | null, fromProfile?: boolean) => void;
  wizard: (feature: string, listingId?: string | null) => void;
  range: Range; setRange: (r: Range) => void;
  selectBiz: (id: string) => void; reloadBiz: () => void;
  onBuyer: () => void; onSignOut: () => void;
  dark: boolean; setDark: (d: boolean) => void; lang: string; setLang: (l: string) => void;
  pref: { push: boolean; email: boolean }; setPref: (p: { push: boolean; email: boolean }) => void;
  regDismissed: boolean; dismissReg: () => void;
}
const AppCtx = createContext<App>(null as unknown as App);
const useApp = () => useContext(AppCtx);
const ArgCtx = createContext<any>(undefined);
const useArg = () => useContext(ArgCtx);

/** Runs a server action once at a time and reports the result. */
function useAct() {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    if (busy) return false;
    setBusy(true);
    try { await fn(); if (ok) app.toast(ok); app.bump(); return true; }
    catch (e) { app.toast(errText(e)); return false; }
    finally { setBusy(false); }
  };
  return { busy, run };
}

/* ---------- UI kit ---------- */
function Icon({ name, size = 22, color }: any) { const t = useTheme(); return <MaterialCommunityIcons name={name} size={size} color={color ?? t.ink} />; }
function Btn({ label, onPress, kind = 'primary', disabled, busy, small, style }: any) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.blue : kind === 'danger' ? t.badBg : t.chip, fg = kind === 'primary' ? '#fff' : kind === 'danger' ? t.badFg : t.ink;
  return (
    <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={[{ minHeight: small ? 34 : 50, paddingHorizontal: small ? 14 : 18, borderRadius: small ? 10 : 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1, flexDirection: 'row', gap: 8 }, style]}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '800', fontSize: small ? 12 : 15 }}>{label}</Text>
    </Pressable>
  );
}
function Pill({ tone = 'warn', children }: any) {
  const t = useTheme();
  const m: any = { good: [t.goodBg, t.good], warn: [t.warnBg, t.warn], bad: [t.badBg, t.badFg], mute: [t.chip, t.mute], blue: [t.soft, t.blue] };
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: m[tone][0] }}><Text style={{ fontSize: 10, fontWeight: '800', color: m[tone][1] }}>{children}</Text></View>;
}
function StatusPill({ s }: { s: Status }) { return <Pill tone={STATUS_UI[s].tone}>{STATUS_UI[s].label}</Pill>; }
function Chips({ items, value, onChange }: any) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
      {items.map((x: any) => { const k = typeof x === 'string' ? x : x.k, l = typeof x === 'string' ? x : x.l, on = value === k; return (
        <Pressable key={k} onPress={() => onChange(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: on ? t.blue : t.chip }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : t.mute }}>{l}</Text>
        </Pressable>); })}
    </ScrollView>
  );
}
function Seg({ items, value, onChange }: any) {
  const t = useTheme();
  return <View style={{ flexDirection: 'row', backgroundColor: t.chip, borderRadius: 12, padding: 3 }}>{items.map((x: string) => <Pressable key={x} onPress={() => onChange(x)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: value === x ? t.card : 'transparent' }}><Text style={{ fontSize: 12, fontWeight: '700', color: value === x ? t.ink : t.mute }}>{x}</Text></Pressable>)}</View>;
}
function Toggle({ value, onValueChange }: any) { const t = useTheme(); return <Switch value={value} onValueChange={onValueChange} trackColor={{ false: t.line, true: t.blue }} thumbColor="#fff" />; }
function Section({ title, right, onRight }: any) { const s = useS(); return <View style={s.sec}><Text style={s.secT}>{title}</Text>{right ? <Pressable onPress={onRight}><Text style={s.link}>{right}</Text></Pressable> : null}</View>; }
function Field({ label, style, ...rest }: any) { const s = useS(), t = useTheme(); return <View>{label ? <Text style={s.label}>{label}</Text> : null}<TextInput placeholderTextColor={t.mute} {...rest} style={[s.fld, style]} /></View>; }
function Empty({ icon = 'text-box-search-outline', title, hint, cta, onCta }: any) {
  const t = useTheme();
  return <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 6 }}><Icon name={icon} size={28} color={t.mute} /><Text style={{ fontSize: 14, fontWeight: '800', color: t.ink, textAlign: 'center' }}>{title}</Text>{hint ? <Text style={{ fontSize: 12, color: t.mute, textAlign: 'center', lineHeight: 18 }}>{hint}</Text> : null}{cta ? <Btn small label={cta} onPress={onCta} style={{ marginTop: 8 }} /> : null}</View>;
}
function Skel({ h = 80, style }: any) {
  const t = useTheme(), o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true })])); a.start(); return () => a.stop(); }, [o]);
  return <Animated.View style={[{ height: h, borderRadius: 16, backgroundColor: t.chip, opacity: o }, style]} />;
}
function ErrBox({ e, retry }: any) { const s = useS(); return <View style={[s.card, { alignItems: 'center', gap: 8 }]}><Icon name="alert-circle-outline" size={24} color="#C65D2E" /><Text style={s.title}>Couldn't load this</Text><Text style={[s.mut, { textAlign: 'center' }]}>{e}</Text><Btn small label="Retry" onPress={retry} /></View>; }
function Loading({ n = 3, h = 70 }: any) { return <View style={{ gap: 10 }}>{Array.from({ length: n }).map((_, i) => <Skel key={i} h={h} />)}</View>; }
function Avatar({ text, size = 44, logo, radius, onPress, bg }: any) {
  const t = useTheme(), r = radius ?? size * 0.3;
  const inner = logo ? <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: r }} /> : <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg ?? t.blue, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.34 }}>{text}</Text></View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{inner}</Pressable> : inner;
}
function FIcon({ k, size = 36 }: any) {
  const ui = FX.FUI[k] ?? { icon: 'shape-outline', color: '#6F7890' };
  return <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: `${ui.color}18`, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name={ui.icon as any} size={size * 0.55} color={ui.color} /></View>;
}
function Row({ left, title, sub, sub2, right, onPress, last }: any) {
  const s = useS();
  const body = <View style={[s.ar, !last && null]}>{left}<View style={s.g}><Text style={s.rt}>{title}</Text>{sub ? <Text style={s.sub}>{sub}</Text> : null}{sub2 ? <Text style={s.sub}>{sub2}</Text> : null}</View>{right}</View>;
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}
const Divided = ({ children }: any) => { const s = useS(); const a = React.Children.toArray(children).filter(Boolean); return <>{a.map((c, i) => <View key={i} style={i ? s.div : undefined}>{c}</View>)}</>; };

/** Full-screen page that sits above Home. */
function Pg({ title, onBack, right, children, scroll = true, refreshing, onRefresh }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets();
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: t.bg, zIndex: 25, paddingTop: ins.top + 8 }}>
      <View style={{ paddingHorizontal: 16, gap: 4 }}>
        <Pressable onPress={onBack} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', height: 30 }}><Icon name="chevron-left" size={22} color={t.blue} /><Text style={{ color: t.blue, fontWeight: '800', fontSize: 14 }}>Back</Text></Pressable>
        <View style={s.row}><Text style={[s.h1, { flex: 1 }]} numberOfLines={1}>{title}</Text>{right}</View>
      </View>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 60, gap: 14 }} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.blue} /> : undefined}>{children}</ScrollView>
      ) : <View style={{ flex: 1, padding: 16 }}>{children}</View>}
    </View>
  );
}

/** Short bottom sheet used for forms and menus. */
function SheetShell({ title, onClose, children, tall }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets(), { height: H } = useWindowDimensions();
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 30, justifyContent: 'flex-end' }}>
      <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: t.scrim }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: ins.bottom + 16, maxHeight: H * (tall ? 0.9 : 0.8) }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, marginBottom: 10 }} />
          <View style={[s.row, { marginBottom: 6 }]}><Text style={[s.h1, { flex: 1, fontSize: 20 }]}>{title}</Text><Pressable onPress={onClose} accessibilityLabel="Close"><Icon name="close" size={24} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Bottom-tab panel. Swipe up to expand under the header, swipe down to collapse, swipe down again to close. */
function PanelSheet({ title, onClose, children }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets(), { height: H } = useWindowDimensions();
  const dH = Math.round(H * 0.6), fH = H - ins.top - 96;
  const h = useRef(new Animated.Value(0)).current, snap = useRef<'d' | 'f'>('d'), start = useRef(0), scrollY = useRef(0);
  const to = (v: number, cb?: () => void) => Animated.timing(h, { toValue: v, duration: 200, useNativeDriver: false }).start(cb);
  useEffect(() => { to(dH); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const finish = (dy: number) => {
    if (dy < -40 && snap.current === 'd') { snap.current = 'f'; to(fH); }
    else if (dy > 40) { if (snap.current === 'f') { snap.current = 'd'; to(dH); } else to(0, onClose); }
    else to(snap.current === 'f' ? fH : dH);
  };
  const make = (capture: boolean) => PanResponder.create({
    onStartShouldSetPanResponder: () => !capture,
    onMoveShouldSetPanResponder: () => !capture,
    onMoveShouldSetPanResponderCapture: (_: any, g: any) => capture && Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx) && ((g.dy < 0 && snap.current === 'd') || (g.dy > 0 && scrollY.current <= 0)),
    onPanResponderGrant: () => { h.stopAnimation((v: number) => { start.current = v; }); },
    onPanResponderMove: (_: any, g: any) => h.setValue(Math.max(120, Math.min(fH, start.current - g.dy))),
    onPanResponderRelease: (_: any, g: any) => finish(g.dy),
    onPanResponderTerminate: (_: any, g: any) => finish(g.dy),
  });
  const head = useRef(make(false)).current, body = useRef(make(true)).current;
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: 'flex-end' }}>
      <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: t.scrim }} onPress={() => to(0, onClose)} />
      <Animated.View style={{ height: h, backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingBottom: ins.bottom + 8, overflow: 'hidden' }}>
        <View {...head.panHandlers} style={{ paddingTop: 10 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, marginBottom: 12 }} />
          <View style={[s.row, { marginBottom: 10 }]}><Text style={[s.h1, { flex: 1, fontSize: 20 }]}>{title}</Text><Pressable onPress={() => to(0, onClose)} accessibilityLabel="Close"><Icon name="close" size={24} /></Pressable></View>
        </View>
        <View style={{ flex: 1 }} {...body.panHandlers}>
          <ScrollView onScroll={(e: any) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>{children}</ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

/* ---------- listing wizard ---------- */
const toDate = (type: string, v?: string) => {
  if (!v) return new Date();
  if (type === 'time') { const [h, m] = v.split(':').map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d; }
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v); return Number.isNaN(d.getTime()) ? new Date() : d;
};
const fmtVal = (type: string, d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  if (type === 'time') return `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (type === 'date') return iso(d);
  return `${iso(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
function DateField({ type, value, onChange }: any) {
  const t = useTheme(), s = useS();
  const [show, setShow] = useState<null | 'date' | 'time' | 'datetime'>(null);
  const tmp = useRef<Date | null>(null);
  const label = value ? (type === 'time' ? value : type === 'date' ? fmtDay(parseISO(value)) + ', ' + value.slice(0, 4) : new Date(value).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })) : 'Choose';
  const open = () => setShow(type === 'date' ? 'date' : type === 'time' ? 'time' : Platform.OS === 'ios' ? 'datetime' : 'date');
  const pick = (e: any, d?: Date) => {
    if (Platform.OS === 'android' && e.type === 'dismissed') { setShow(null); return; }
    if (!d) return;
    if (type === 'dt' && Platform.OS === 'android' && show === 'date') { tmp.current = d; setShow('time'); return; }
    let out = d;
    if (type === 'dt' && Platform.OS === 'android' && tmp.current) { const x = tmp.current; out = new Date(x.getFullYear(), x.getMonth(), x.getDate(), d.getHours(), d.getMinutes()); tmp.current = null; }
    onChange(fmtVal(type, out));
    if (Platform.OS === 'android') setShow(null);
  };
  return (
    <View>
      <Pressable onPress={open} style={[s.fld, { justifyContent: 'center' }]}><Text style={{ color: value ? t.ink : t.mute, fontSize: 14 }}>{label}</Text></Pressable>
      {show ? <DateTimePicker value={toDate(type, value)} mode={show} is24Hour onChange={pick} display={Platform.OS === 'ios' ? 'spinner' : 'default'} /> : null}
      {show && Platform.OS === 'ios' ? <Btn small kind="soft" label="Done" onPress={() => setShow(null)} style={{ alignSelf: 'flex-end', marginTop: 6 }} /> : null}
    </View>
  );
}
function BlockCalendar({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTheme(), s = useS();
  const [m, setM] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const first = (m.getDay() + 6) % 7, days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), today = iso(new Date());
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <View style={[s.card, { padding: 12 }]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Pressable onPress={() => setM(new Date(m.getFullYear(), m.getMonth() - 1, 1))}><Icon name="chevron-left" color={t.blue} /></Pressable>
        <Text style={s.rt}>{m.toLocaleString('en', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => setM(new Date(m.getFullYear(), m.getMonth() + 1, 1))}><Icon name="chevron-right" color={t.blue} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={{ width: '14.28%', textAlign: 'center', color: t.mute, fontSize: 11 }}>{d}</Text>)}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: '14.28%', height: 38 }} />;
          const k = iso(new Date(m.getFullYear(), m.getMonth(), d)), off = value.includes(k), past = k < today;
          return <Pressable key={i} disabled={past} onPress={() => onChange(off ? value.filter(x => x !== k) : [...value, k].sort())} style={{ width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: off ? t.badFg : 'transparent', alignItems: 'center', justifyContent: 'center', opacity: past ? 0.3 : 1 }}><Text style={{ color: off ? '#fff' : t.ink, fontWeight: '600' }}>{d}</Text></View></Pressable>;
        })}
      </View>
      <Text style={s.mut}>{value.length ? `${value.length} blocked` : 'No blocked dates'}</Text>
    </View>
  );
}
async function uploadLarge(uri: string, path: string, bucket: string, mime: string) {
  const { data } = await supabase.auth.getSession();
  const url = `${(supabase as any).supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  const r = await FileSystem.uploadAsync(url, uri, { httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT, headers: { Authorization: `Bearer ${data.session?.access_token}`, apikey: (supabase as any).supabaseKey, 'Content-Type': mime } });
  if (r.status >= 300) throw new Error('Upload failed');
}

function ListingWizard({ biz, feature, listingId, onClose, onDone, onToast }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets();
  const fe = FX.FM[feature] as Feature, last = fe.steps.length;
  const [v, setV] = useState<V>(() => FX.defaults(fe));
  const [id, setId] = useState<string | null>(listingId ?? null);
  const [status, setStatus] = useState('draft');
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(!listingId);
  const key = useRef(uuid());
  const bodyRef = useRef<ScrollView>(null);
  useEffect(() => { bodyRef.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  useEffect(() => {
    if (!listingId) return;
    (async () => {
      try {
        const d = await q<any>(supabase.from('listings').select('*').eq('id', listingId).single());
        setStatus(d.status);
        setV({ ...FX.defaults(fe), ...d.attributes, title: d.title, desc: d.description ?? '', cat: d.category ? { main: d.category, sub: d.subcategory } : undefined, price: d.price ?? '', qty: d.stock ?? '', photos: d.photos ?? [] });
        setReady(true);
      } catch (e) { onToast(errText(e)); onClose(); }
    })();
  }, [listingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, x: any) => { setV(p => ({ ...p, [k]: x })); if (err[k]) setErr(e => { const n = { ...e }; delete n[k]; return n; }); };
  const row = () => {
    const a: V = { ...v }; ['title', 'desc', 'cat', 'price', 'qty', 'photos'].forEach(k => delete a[k]);
    return { title: FX.titleOf(fe, v) || 'Untitled draft', description: v.desc || null, category: v.cat?.main ?? null, subcategory: v.cat?.sub ?? null, price: v.price === '' || v.price == null ? null : Number(v.price), photos: v.photos ?? [], attributes: a };
  };
  const ensure = async (): Promise<string> => {
    if (id) return id;
    const d = await rpc<string>('create_draft', { p_business: biz.id, p_feature: feature, p_key: key.current, p_title: FX.titleOf(fe, v) });
    setId(d); return d;
  };
  const save = async (): Promise<string> => {
    const lid = await ensure();
    await q(supabase.from('listings').update(row()).eq('id', lid));
    if (status === 'draft') {
      const qty = v.track === false || v.qty === '' || v.qty == null ? null : Math.trunc(Number(v.qty));
      await rpc('set_draft_stock', { p_listing: lid, p_stock: qty, p_variants: v.variants ?? [] });
    }
    return lid;
  };

  const addAssets = async (f: Fld) => {
    const cur: string[] = v[f.k] ?? [], room = (f.max ?? 10) - cur.length;
    if (room <= 0) { onToast(`You can add up to ${f.max ?? 10} here`); return; }
    try {
      let assets: { uri: string; mime: string; w?: number; name?: string }[] = [];
      if (f.priv) {
        const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], multiple: true, copyToCacheDirectory: true });
        if (r.canceled) return;
        assets = r.assets.slice(0, room).map((a: any) => ({ uri: a.uri, mime: a.mimeType ?? 'application/pdf', name: a.name }));
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { onToast('Allow photo access to add pictures'); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: room > 1, selectionLimit: room, quality: 1 });
        if (r.canceled) return;
        assets = r.assets.slice(0, room).map((a: any) => ({ uri: a.uri, mime: 'image/jpeg', w: a.width }));
      }
      setUp(u => ({ ...u, [f.k]: assets.length }));
      const lid = await ensure(), added: string[] = [];
      for (const a of assets) {
        try {
          let uri = a.uri, mime = a.mime;
          if (mime.startsWith('image/')) { const m = await ImageManipulator.manipulateAsync(uri, a.w && a.w > 1600 ? [{ resize: { width: 1600 } }] : [], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }); uri = m.uri; mime = 'image/jpeg'; }
          const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const ext = mime === 'application/pdf' ? 'pdf' : 'jpg', path = `${biz.id}/${lid}/${f.k}/${uuid()}.${ext}`;
          const { error } = await supabase.storage.from(f.priv ? 'business-docs' : 'listing-photos').upload(path, decode(b64), { contentType: mime, cacheControl: '31536000' });
          if (error) throw error;
          added.push(path);
        } catch (e) { onToast(errText(e)); }
        setUp(u => ({ ...u, [f.k]: Math.max(0, (u[f.k] ?? 1) - 1) }));
      }
      if (added.length) set(f.k, [...cur, ...added]);
    } catch (e) { onToast(errText(e)); }
    finally { setUp(u => ({ ...u, [f.k]: 0 })); }
  };
  const addMedia = async (f: Fld) => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: f.accept ? f.accept.split(',') : ['*/*'], copyToCacheDirectory: true });
      if (r.canceled) return;
      const a: any = r.assets[0];
      if (a.size && a.size > (f.max ?? 200) * 1024 * 1024) { onToast(`File must be under ${f.max ?? 200} MB`); return; }
      setUp(u => ({ ...u, [f.k]: 1 }));
      const lid = await ensure(), path = `${biz.id}/${lid}/${f.k}/${uuid()}-${String(a.name).replace(/[^\w.-]/g, '_')}`;
      await uploadLarge(a.uri, path, 'creator-media', a.mimeType ?? 'application/octet-stream');
      set(f.k, path);
    } catch (e) { onToast(errText(e)); }
    finally { setUp(u => ({ ...u, [f.k]: 0 })); }
  };
  const removeAsset = async (f: Fld, path: string) => { await supabase.storage.from(f.priv ? 'business-docs' : 'listing-photos').remove([path]); set(f.k, (v[f.k] as string[]).filter(p => p !== path)); };
  const moveAsset = (f: Fld, i: number, d: number) => { const a = [...(v[f.k] as string[])], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set(f.k, a); };

  const visible = (f: Fld) => !f.when || f.when(v);
  const field = (f: Fld, val: any, on: (x: any) => void, ek: string): React.ReactNode => {
    if (ek === f.k && !visible(f)) return null;
    const e = err[ek];
    if (f.k === 'variants' && status !== 'draft') return <View key={ek} style={{ marginTop: 16 }}><Text style={s.label}>Variants</Text><Text style={s.mut}>Change variants and stock from the Stock action on the listing.</Text></View>;
    const lab = <Text style={s.label}>{f.l}{f.req || f.must ? ' *' : ''}</Text>;
    let body: React.ReactNode = null;
    switch (f.t) {
      case 'text': body = <TextInput style={s.fld} value={val ?? ''} placeholder={f.ph} placeholderTextColor={t.mute} maxLength={f.max} onChangeText={on} />; break;
      case 'area': body = <View><TextInput style={[s.fld, { height: 110, paddingTop: 12, textAlignVertical: 'top' }]} multiline value={val ?? ''} placeholderTextColor={t.mute} onChangeText={on} />{f.max ? <Text style={[s.mut, { textAlign: 'right' }]}>{(val ?? '').length}/{f.max}</Text> : null}</View>; break;
      case 'num': case 'money': body = <TextInput style={s.fld} keyboardType={f.t === 'money' ? 'decimal-pad' : 'number-pad'} value={val == null ? '' : String(val)} editable={!(f.k === 'qty' && status !== 'draft')} placeholder={f.t === 'money' ? '0.00' : undefined} placeholderTextColor={t.mute} onChangeText={on} />; break;
      case 'date': case 'dt': case 'time': body = <DateField type={f.t} value={val} onChange={on} />; break;
      case 'sel': body = <Wrap items={f.opts!} value={val} onChange={on} />; break;
      case 'chips': body = <Wrap multi items={f.opts!} value={val ?? []} onChange={on} />; break;
      case 'cat': body = <View style={{ gap: 8 }}><Wrap items={Object.keys(f.tree!)} value={val?.main} onChange={(m: string) => on({ main: m, sub: '' })} />{val?.main ? <Wrap items={f.tree![val.main]} value={val?.sub} onChange={(x: string) => on({ ...val, sub: x })} /> : null}</View>; break;
      case 'bool': return (
        <View key={ek} style={{ marginTop: 16 }}><View style={[s.card, s.row, { paddingVertical: 10 }]}><Text style={[s.rt, { flex: 1 }]}>{f.l}{f.must ? ' *' : ''}</Text><Toggle value={!!val} onValueChange={on} /></View>{f.help ? <Text style={s.mut}>{f.help}</Text> : null}{e ? <Text style={wzErr(t)}>{e}</Text> : null}</View>
      );
      case 'cal': body = <BlockCalendar value={val ?? []} onChange={on} />; break;
      case 'photos': {
        const a: string[] = val ?? [];
        body = (
          <View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {a.map((p, i) => (
                <View key={p} style={{ width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: t.chip }}>
                  {f.priv ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Icon name="file-document-outline" size={26} color={t.mute} /><Text style={{ fontSize: 9, color: t.mute }}>{p.split('.').pop()}</Text></View> : <Image source={{ uri: publicUrl(p) }} style={{ flex: 1 }} />}
                  {i === 0 && !f.priv ? <View style={{ position: 'absolute', left: 6, top: 6, backgroundColor: t.blue, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Cover</Text></View> : null}
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'flex-end', gap: 3, padding: 4, backgroundColor: 'rgba(0,0,0,0.35)' }}>
                    {i > 0 ? <MiniBtn icon="chevron-left" onPress={() => moveAsset(f, i, -1)} /> : null}
                    {i < a.length - 1 ? <MiniBtn icon="chevron-right" onPress={() => moveAsset(f, i, 1)} /> : null}
                    <MiniBtn icon="close" onPress={() => removeAsset(f, p)} />
                  </View>
                </View>
              ))}
              {Array.from({ length: up[f.k] ?? 0 }).map((_, i) => <Skel key={`u${i}`} h={100} style={{ width: '31%', aspectRatio: 1, height: undefined }} />)}
              {a.length < (f.max ?? 10) ? <Pressable onPress={() => addAssets(f)} style={{ width: '31%', aspectRatio: 1, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={24} color={t.blue} /><Text style={{ color: t.blue, fontWeight: '700', fontSize: 12 }}>Add</Text></Pressable> : null}
            </View>
            <Text style={s.mut}>{a.length}/{f.max ?? 10}{f.min ? ` · minimum ${f.min}` : ''}</Text>
          </View>
        );
        break;
      }
      case 'file': body = <Pressable onPress={() => addMedia(f)} style={[s.card, s.row]}><Icon name={val ? 'check-circle' : 'upload'} color={val ? t.good : t.blue} /><Text style={[s.rt, { flex: 1 }]} numberOfLines={1}>{up[f.k] ? 'Uploading…' : val ? String(val).split('/').pop() : 'Choose a file'}</Text></Pressable>; break;
      case 'rows': {
        const rows: V[] = val ?? [];
        body = (
          <View style={{ gap: 10 }}>
            {rows.map((r, i) => (
              <View key={i} style={[s.card, { paddingTop: 4 }]}>
                {f.sub!.map(sf => field(sf, r[sf.k], x => on(rows.map((q2, j) => (j === i ? { ...q2, [sf.k]: x } : q2))), `${f.k}.${i}.${sf.k}`))}
                <Pressable onPress={() => on(rows.filter((_, j) => j !== i))} style={{ marginTop: 10 }}><Text style={{ color: t.badFg, fontWeight: '700' }}>Remove</Text></Pressable>
              </View>
            ))}
            <Btn small label="+ Add row" kind="soft" onPress={() => on([...rows, {}])} style={{ alignSelf: 'flex-start' }} />
          </View>
        );
        break;
      }
      default: return null;
    }
    return <View key={ek} style={{ marginTop: 16 }}>{lab}{body}{f.help && f.t !== 'photos' ? <Text style={s.mut}>{f.help}</Text> : null}{e ? <Text style={wzErr(t)}>{e}</Text> : null}</View>;
  };

  const stepErrors = (i: number) => FX.validate(fe, v, 'publish', fe.steps[i].f);
  const next = async () => {
    const e = stepErrors(step); setErr(e);
    if (Object.keys(e).length) { onToast('Complete the highlighted fields'); return; }
    setBusy(true);
    try { if (FX.titleOf(fe, v) || id) await save(); setStep(step + 1); } catch (x) { onToast(errText(x)); } finally { setBusy(false); }
  };
  const draft = async () => {
    const e = FX.validate(fe, v, 'draft');
    if (Object.keys(e).length) { setErr(e); onToast(e.title); return; }
    setBusy(true);
    try { await save(); onToast('Draft saved'); } catch (x) { onToast(errText(x)); } finally { setBusy(false); }
  };
  const publish = async () => {
    const e = FX.validate(fe, v, 'publish');
    if (Object.keys(e).length) {
      setErr(e);
      const bad = fe.steps.findIndex(st => st.f.some(f => e[f.k] || Object.keys(e).some(k => k.startsWith(`${f.k}.`))));
      setStep(bad >= 0 ? bad : 0); onToast('Some fields need attention'); return;
    }
    setBusy(true);
    try {
      const lid = await save();
      const r = await rpc<string>('publish_listing', { p_listing: lid });
      onDone(r === 'in_review' ? 'Submitted for review' : status === 'paused' ? 'Changes saved' : 'Published');
    } catch (x) { onToast(errText(x)); } finally { setBusy(false); }
  };
  const close = async () => { if (FX.titleOf(fe, v) && !busy) { try { await save(); } catch { /* leaving stays possible */ } } onClose(); };

  if (!ready) return <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: t.bg, zIndex: 40, padding: 20, paddingTop: ins.top + 20 }}><Loading n={4} h={60} /></View>;
  const price = Number(v.price ?? v.start ?? v.ticket ?? 0), off = v.original && v.price ? Math.round((1 - Number(v.price) / Number(v.original)) * 100) : null, cover = (v.photos ?? [])[0];
  const editing = !!listingId, titles = [...fe.steps.map(x => x.t), 'Review'];
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: t.bg, zIndex: 40 }}>
      <View style={{ backgroundColor: t.card, paddingTop: ins.top + 6, borderBottomWidth: 1, borderBottomColor: t.line }}>
        <View style={[s.row, { paddingHorizontal: 16, paddingBottom: 8, justifyContent: 'space-between' }]}>
          <Pressable onPress={close} style={s.row}><Icon name="close" size={20} color={t.blue} /><Text style={{ color: t.blue, fontWeight: '800' }}>Close</Text></Pressable>
          <Text style={[s.rt, { fontSize: 14 }]}>{editing ? 'Edit listing' : fe.add}</Text>
          {editing && status !== 'draft' ? <View style={{ width: 70 }} /> : <Pressable disabled={busy} onPress={draft}><Text style={{ color: t.blue, fontWeight: '800' }}>Save draft</Text></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 4 }}>
          {titles.map((x, i) => (
            <Pressable key={x} onPress={() => i <= step && setStep(i)} style={[s.row, { gap: 6, paddingVertical: 4, paddingLeft: 5, paddingRight: 10, borderRadius: 99, backgroundColor: i === step ? t.chip : 'transparent' }]}>
              <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: i === step ? t.blue : i < step ? '#1F9D6B' : t.chip }}><Text style={{ fontSize: 11, fontWeight: '800', color: i <= step ? '#fff' : t.mute }}>{i < step ? '✓' : i + 1}</Text></View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: i === step ? t.ink : t.mute }}>{x}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView ref={bodyRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        {step < last ? (
          <>
            <Text style={s.title}>{fe.steps[step].t}</Text>
            {fe.steps[step].f.map(f => field(f, v[f.k], x => set(f.k, x), f.k))}
            {step === 0 && fe.autoTitle ? <Text style={[s.mut, { marginTop: 14 }]}>Listing title: {FX.titleOf(fe, v) || '—'}</Text> : null}
          </>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={s.title}>Review</Text>
            <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
              {cover && !fe.steps.some(st => st.f.some(f => f.k === 'photos' && f.priv)) ? <Image source={{ uri: publicUrl(cover) }} style={{ width: '100%', height: 170 }} /> : null}
              <View style={{ padding: 14 }}>
                <Text style={[s.rt, { fontSize: 15 }]}>{FX.titleOf(fe, v) || 'Untitled'}</Text>
                <Text style={s.mut}>{[v.cat?.main, v.cat?.sub].filter(Boolean).join(' › ') || fe.name}</Text>
                {price > 0 ? <View style={[s.row, { marginTop: 6 }]}><Text style={s.big}>{money(price)}</Text>{off !== null && off > 0 ? <Pill tone="good">{off}% off</Pill> : null}</View> : null}
              </View>
            </View>
            <View style={s.cardFlat}>
              <Divided>{fe.steps.map((st, i) => { const n = Object.keys(stepErrors(i)).length; return <Row key={st.t} title={st.t} sub={n ? `${n} to fix` : 'Complete'} onPress={() => setStep(i)} right={<Pill tone={n ? 'warn' : 'good'}>{n ? 'Fix' : '✓'}</Pill>} />; })}</Divided>
            </View>
            {fe.approval ? <Text style={s.mut}>Reviewed by Wantiss before it goes live.</Text> : null}
          </View>
        )}
      </ScrollView>
      <View style={[s.row, { padding: 14, paddingBottom: ins.bottom + 12, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.line }]}>
        <Btn kind="soft" label="Back" disabled={busy || step === 0} onPress={() => setStep(step - 1)} style={{ flex: 0.4 }} />
        {step < last ? <Btn label={step === last - 1 ? 'Review' : 'Next'} busy={busy} onPress={next} style={{ flex: 1 }} />
          : <Btn label={fe.approval ? 'Submit for review' : editing && status !== 'draft' ? 'Save changes' : 'Publish'} busy={busy} onPress={publish} style={{ flex: 1 }} />}
      </View>
    </View>
  );
}
const wzErr = (t: Theme) => ({ color: t.badFg, fontSize: 12, fontWeight: '600' as const, marginTop: 4 });
function MiniBtn({ icon, onPress }: any) { return <Pressable onPress={onPress} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name={icon} size={14} color="#182033" /></Pressable>; }
function Wrap({ items, value, onChange, multi }: any) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((o: string) => { const on = multi ? (value ?? []).includes(o) : value === o; return (
        <Pressable key={o} onPress={() => onChange(multi ? (on ? value.filter((x: string) => x !== o) : [...(value ?? []), o]) : o)} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, backgroundColor: on ? t.blue : t.chip }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : t.mute }}>{o}</Text>
        </Pressable>); })}
    </View>
  );
}

/* ---------- shared pieces ---------- */
const POLICY: Record<string, string> = { goodies: 'Not allowed: weapons, medicines and alcohol.', glowz: 'Not allowed: medical-aesthetic services.', lutz: 'Reviewed by Wantiss before it goes live. Entrants must be 18 or older.' };
const RANGES = ['7D', '30D', '90D', '1Y'];
function RangeBar() {
  const app = useApp(), t = useTheme();
  const items = [...RANGES, 'Custom'];
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {items.map(k => { const on = app.range.key === (k === 'Custom' ? 'custom' : k); return (
        <Pressable key={k} onPress={() => (k === 'Custom' ? app.sheet('custom') : app.setRange(presetRange(k)))} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11, backgroundColor: on ? t.soft : t.card, borderWidth: 1, borderColor: on ? t.blue : t.line }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: on ? t.blue : t.mute }}>{k}</Text>
        </Pressable>); })}
    </View>
  );
}
function actionTarget(app: App, a: any) {
  const tg: string = a.target ?? '';
  if (tg.startsWith('feature:')) app.go('feature', { k: tg.slice(8) });
  else if (tg.startsWith('requirements:')) app.go('feature', { k: tg.slice(13) });
  else if (tg === 'payout') app.sheet('payout');
  else if (tg === 'messages') app.go('messages');
  else if (tg === 'registration') app.go('registration');
  else app.go('actions');
}
function ActionRow({ a }: any) {
  const app = useApp();
  return <Row left={a.feature ? <FIcon k={a.feature} /> : <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: app.dark ? '#202B4F' : '#EEF1FF', alignItems: 'center', justifyContent: 'center' }}><Icon name="alert-circle-outline" size={20} color="#2D5BFF" /></View>} title={a.label} sub={a.feature ? FX.FM[a.feature]?.name : a.sub} right={<Btn small label="Action" onPress={() => actionTarget(app, a)} />} />;
}

/* ---------- header ---------- */
function Header() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz;
  const badge = (n: number) => n > 0 ? <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{n}</Text></View> : null;
  const btn = (icon: string, n: number, onPress: () => void, label: string) => <Pressable accessibilityLabel={label} onPress={onPress} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={21} />{badge(n)}</Pressable>;
  return (
    <View style={[s.row, { gap: 11 }]}>
      <Avatar text={initials(app.name || app.email)} size={44} radius={15} onPress={() => app.sheet('profile')} />
      <View style={s.g}>
        <Text style={{ fontSize: 19, fontWeight: '800', color: t.ink }} numberOfLines={1}>{greeting()}, {(app.name || 'there').split(' ')[0]}</Text>
        <Pressable onPress={() => app.sheet('switch')} style={[s.row, { gap: 5, marginTop: 3 }]}>
          <Text style={{ color: t.mute, fontWeight: '700', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{b.name}</Text>
          {b.verification === 'verified' ? <Icon name="check-decagram" size={15} color={t.blue} /> : b.verification === 'setup' ? null : <StatusPill s={b.verification} />}
          <Icon name="chevron-down" size={15} color={t.mute} />
        </Pressable>
      </View>
      {btn('bell-outline', app.meta.unreadN, () => app.go('notifications'), 'Notifications')}
      {btn('chat-outline', app.meta.unreadM, () => app.go('messages'), 'Messages')}
    </View>
  );
}
function Banner({ icon = 'credit-card-outline', text, onPress, tone = 'soft', onClose, cta }: any) {
  const t = useTheme(), bad = tone === 'bad';
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: bad ? t.badBg : t.soft }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={bad ? t.badFg : t.blue} /></View>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: bad ? t.badFg : t.blue }}>{text}</Text>
      {cta ? <Btn small label={cta} onPress={onPress} /> : <Icon name="arrow-right" size={18} color={bad ? t.badFg : t.blue} />}
      {onClose ? <Pressable onPress={onClose} accessibilityLabel="Dismiss" hitSlop={10}><Icon name="close" size={18} color={t.mute} /></Pressable> : null}
    </Pressable>
  );
}
function WalletCard({ available, pending }: any) {
  const app = useApp(), p = app.meta.payout;
  const setup = p?.status === 'verified' ? `•••• ${p.last4 ?? ''}` : p ? 'Verifying' : 'Not ready';
  return (
    <Pressable onPress={() => app.panel('payouts')} style={{ borderRadius: 22, backgroundColor: LIGHT.blue, padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: '#DDE5FF' }}>AVAILABLE BALANCE</Text><Icon name="shield-check-outline" size={20} color="#DDE5FF" /></View>
      <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 10 }}>{money(available)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 20 }}>
        <View><Text style={{ fontSize: 11, color: '#DDE5FF' }}>Pending</Text><Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 3 }}>{money(pending)}</Text></View>
        <View style={{ height: 34, width: 1, backgroundColor: 'rgba(255,255,255,.3)' }} />
        <View><Text style={{ fontSize: 11, color: '#DDE5FF' }}>Payout method</Text><Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 3 }}>{setup}</Text></View>
      </View>
    </Pressable>
  );
}
function Checklist() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz, a = useAct();
  const nF = app.meta.feats.length, first = app.meta.feats[0]?.feature, payOK = app.meta.payout?.status === 'verified';
  const steps: any[] = [
    { l: 'Create business profile', d: true, sub: 'Name, logo, contact, location' },
    { l: 'Register your business (optional)', d: b.verification === 'verified', sub: b.verification === 'verified' ? 'Approved by Wantiss' : b.verification === 'pending' ? 'In review' : b.verification === 'restricted' ? 'Restricted' : 'Earn the Verified badge', btn: b.verification === 'setup' ? 'Register' : 'Open', on: () => app.go('registration') },
    { l: 'Activate a feature', d: nF > 0, sub: nF ? `${nF} active` : 'Choose where you sell', btn: 'Choose', on: () => app.go('explore') },
    { l: 'Add your first listing', d: app.meta.listings > 0, sub: app.meta.listings ? `${app.meta.listings} listings` : 'Start with a draft', btn: first ? 'Add' : undefined, on: () => first && app.wizard(first) },
    { l: 'Set up payouts', d: payOK, sub: payOK ? 'Ready' : 'Needed to withdraw', btn: 'Set up', on: () => app.sheet('payout') },
    { l: 'Go live', d: b.is_live, sub: b.is_live ? 'Your business is live' : 'Needs a feature and a listing', btn: nF > 0 && app.meta.listings > 0 ? 'Go live' : undefined, on: () => a.run(() => rpc('go_live', { p_business: b.id }), 'You are live') },
  ];
  const done = steps.filter(x => x.d).length;
  return (
    <View style={s.cardFlat}>
      <View style={[s.row, { paddingTop: 16 }]}><Text style={[s.title, { flex: 1 }]}>Finish setting up</Text><Pill tone="mute">{done} of {steps.length}</Pill></View>
      <View style={{ height: 3, backgroundColor: t.chip, borderRadius: 2, marginVertical: 12 }}><View style={{ width: `${(done / steps.length) * 100}%`, height: 3, backgroundColor: t.blue, borderRadius: 2 }} /></View>
      <Divided>{steps.map(x => <Row key={x.l} left={<View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: x.d ? '#1F9D6B' : t.chip, alignItems: 'center', justifyContent: 'center' }}>{x.d ? <Icon name="check" size={15} color="#fff" /> : null}</View>} title={x.l} sub={x.sub} right={!x.d && x.btn ? <Btn small label={x.btn} onPress={x.on} busy={a.busy && x.btn === 'Go live'} /> : null} />)}</Divided>
    </View>
  );
}

/* ---------- home ---------- */
function Home() {
  const app = useApp(), s = useS(), t = useTheme(), ins = useSafeAreaInsets(), { biz, meta, range } = app;
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: biz.id, p_from: range.from, p_to: range.to, p_feature: null }), [biz.id, range.from, range.to, app.tick]);
  const act = useQ(() => rpc<any[]>('action_required', { p_business: biz.id }), [biz.id, app.tick]);
  const feed = useQ(() => rpc<any[]>('activity_feed', { p_business: biz.id, p_days: 120, p_before: null, p_limit: 5, p_kind: null }), [biz.id, app.tick]);
  const cnt = useQ(async () => ({ l: await q<any[]>(supabase.from('listings').select('feature,status').eq('business_id', biz.id)), o: await q<any[]>(supabase.from('feature_orders').select('feature,status').eq('business_id', biz.id)) }), [biz.id, app.tick]);
  const d = sum.d, refreshing = !!d && (sum.l || act.l);
  const payOK = meta.payout?.status === 'verified', hasF = meta.feats.length > 0;
  const top = (d?.features ?? []).filter((x: any) => Number(x.amount) > 0).sort((a: any, b: any) => b.amount - a.amount);
  const total = top.reduce((a: number, x: any) => a + Number(x.amount), 0) || 1;
  const rev = Number(d?.revenue ?? 0), prev = Number(d?.prev_revenue ?? 0), growth = prev ? ((rev - prev) / Math.abs(prev)) * 100 : null;
  const ser: { d: string; v: number }[] = d?.series ?? [], mx = Math.max(1, ...ser.map(x => Math.abs(x.v))), hasSales = ser.some(x => x.v !== 0);
  const actions: any[] = act.d ?? [];
  const open = (k: string) => (cnt.d?.o ?? []).filter((o: any) => o.feature === k && !FX.FM[k].flow.slice(-1).includes(o.status) && o.status !== 'Cancelled').length;
  const lcount = (k: string) => (cnt.d?.l ?? []).filter((l: any) => l.feature === k && l.status !== 'archived').length;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: ins.top + 12, paddingBottom: 130, gap: 14 }} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={app.bump} tintColor={t.blue} />}>
      <Header />
      {['setup', 'action'].includes(biz.verification) && !app.regDismissed ? <Banner icon="check-decagram-outline" text={biz.verification === 'action' ? 'Update your registration documents' : 'Register your business to earn the Verified badge'} cta="Register" onPress={() => app.go('registration')} onClose={app.dismissReg} /> : null}
      {biz.verification === 'pending' ? <Banner icon="clock-outline" text="Registration is in review" onPress={() => app.go('registration')} /> : null}
      {biz.verification === 'restricted' ? <Banner tone="bad" icon="alert-circle-outline" text="Your business is restricted. View details" onPress={() => app.go('registration')} /> : null}
      {!payOK && biz.verification !== 'restricted' ? <Banner text={meta.payout ? 'Payout setup is in review' : 'Add a payout method to receive earnings'} onPress={() => app.sheet('payout')} /> : null}
      {sum.e && !d ? <ErrBox e={sum.e} retry={() => { sum.reload(); app.bump(); }} /> : <WalletCard available={d?.available ?? 0} pending={d?.pending ?? 0} />}
      {!hasF ? (
        <>
          <Checklist />
          <View style={s.card}><Empty icon="chart-line" title="No revenue yet" hint="Sales appear here after your first completed order." /></View>
          {actions.length ? <ActionCard actions={actions} /> : null}
          <View style={s.card}><Empty icon="storefront-outline" title="No features yet" hint="Activate a feature to start selling." cta="Explore features" onCta={() => app.go('explore')} /></View>
        </>
      ) : (
        <>
          <RangeBar />
          <View style={s.card}>
            {sum.l && !d ? <Skel h={190} /> : (
              <>
                <View style={[s.row, { alignItems: 'flex-start' }]}>
                  <View style={s.g}><Text style={s.title}>Earnings</Text><Text style={s.mut}>{range.label}</Text></View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.big}>{money(rev)}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: growth !== null && growth < 0 ? t.bad : t.good }}>{growth === null ? 'No previous period' : `${growth >= 0 ? '↑' : '↓'} ${Math.abs(growth).toFixed(1)}% vs previous period`}</Text>
                    {prev ? <Text style={s.mut}>Previous {money(prev)}</Text> : null}
                  </View>
                </View>
                {hasSales ? (
                  <View style={{ height: 124, flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingTop: 14 }}>
                    {ser.map((x, i) => <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}><View style={{ width: '68%', minHeight: 4, height: Math.max(4, Math.round((Math.abs(x.v) / mx) * 88)), backgroundColor: t.blue, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} /><Text style={{ fontSize: 9, color: t.mute }}>{i + 1}</Text></View>)}
                  </View>
                ) : <Empty icon="chart-bar" title="No sales in this period" hint="Try a longer range." />}
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.line, paddingTop: 13, marginTop: 8, gap: 8 }}>
                  {[['Gross sales', d?.gross], ['Fees', Math.abs(Number(d?.fees ?? 0))], ['Refunds', Math.abs(Number(d?.refunds ?? 0))]].map(([l, v]: any) => <View key={l} style={{ flex: 1 }}><Text style={{ fontSize: 10, color: t.mute }}>{l}</Text><Text style={{ fontSize: 13, fontWeight: '800', color: t.ink, marginTop: 4 }}>{money(v ?? 0)}</Text></View>)}
                </View>
              </>
            )}
          </View>
          <View style={s.card}>
            <Text style={s.title}>Sales by Feature</Text><Text style={s.mut}>Share of gross sales · {range.label}</Text>
            {top.length ? <View style={{ marginTop: 4 }}>{top.slice(0, 5).map((x: any, i: number) => { const pc = Math.round((Number(x.amount) / total) * 100); return (
              <View key={x.feature} style={[s.row, { paddingVertical: 10, gap: 12 }, i ? s.div : null]}>
                <FIcon k={x.feature} size={30} /><Text style={[s.rt, { width: 70 }]} numberOfLines={1}>{FX.FM[x.feature]?.name}</Text>
                <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: t.chip, overflow: 'hidden' }}><View style={{ width: `${pc}%`, height: 7, borderRadius: 4, backgroundColor: FX.FUI[x.feature]?.color ?? t.blue }} /></View>
                <Text style={{ width: 38, textAlign: 'right', fontSize: 12, fontWeight: '700', color: t.mute }}>{pc}%</Text>
              </View>); })}</View>
              : <Empty icon="chart-donut" title="No sales in this period" />}
            {top.length ? <Pressable onPress={() => app.go('charts')} style={{ marginTop: 6 }}><Text style={s.link}>View charts →</Text></Pressable> : null}
          </View>
          {actions.length ? <ActionCard actions={actions} /> : null}
          <Section title="Your business tools" right={`${meta.feats.length} enabled`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {meta.feats.slice(0, 5).map(f => (
              <Pressable key={f.feature} onPress={() => app.go('feature', { k: f.feature })} style={{ width: '31.5%', minHeight: 112, borderRadius: 16, padding: 11, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
                <FIcon k={f.feature} size={38} /><Text style={[s.rt, { fontSize: 11, marginTop: 8 }]}>{FX.FM[f.feature]?.name}</Text>
                <Text style={{ fontSize: 10, color: t.mute, marginTop: 3 }}>{lcount(f.feature)} listings · {open(f.feature)} open</Text>
                <Text style={{ fontSize: 10, color: t.good, fontWeight: '700', marginTop: 3 }}>● Active</Text>
              </Pressable>))}
            <Pressable onPress={() => app.go('explore')} style={{ width: '31.5%', minHeight: 112, borderRadius: 16, padding: 11, backgroundColor: t.soft, justifyContent: 'space-between' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={18} color="#fff" /></View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: t.blue }}>Explore more ways to sell</Text>
            </Pressable>
          </View>
          <Section title="Recent activity" right="Latest updates" onRight={() => app.go('activity')} />
          <View style={s.cardFlat}>
            {feed.l && !feed.d ? <View style={{ padding: 12 }}><Skel h={150} /></View> : (feed.d ?? []).length ? <Divided>{(feed.d ?? []).map((a: any) => <ActivityRow key={a.id} a={a} />)}</Divided> : <Empty icon="history" title="No activity yet" hint="Orders, refunds and payouts appear here." />}
          </View>
        </>
      )}
    </ScrollView>
  );
}
function ActionCard({ actions }: any) {
  const app = useApp(), t = useTheme(), s = useS();
  return (
    <View style={{ gap: 10 }}>
      <View style={s.sec}><Text style={s.secT}>Action Required</Text><Pressable accessibilityLabel="See all actions" onPress={() => app.go('actions')} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron-right" size={18} color={t.blue} /></Pressable></View>
      <View style={{ borderWidth: 2, borderStyle: 'dotted', borderColor: t.blue, borderRadius: 20, backgroundColor: t.card, paddingHorizontal: 16, maxHeight: 4 * 66 + 4 }}>
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}><Divided>{actions.map((a: any, i: number) => <ActionRow key={i} a={a} />)}</Divided></ScrollView>
      </View>
    </View>
  );
}
function ActivityRow({ a }: any) {
  const t = useTheme(), refund = a.kind === 'refund', money_ = a.amount != null;
  return <Row left={<View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: refund ? t.ref : t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name={refund ? 'cash-refund' : 'history'} size={17} color={refund ? t.bad : t.blue} /></View>} title={a.title} sub={`${a.feature ? FX.FM[a.feature]?.name ?? 'Business' : 'Business'} · ${ago(a.at)}`} right={money_ ? <Text style={{ fontSize: 11, fontWeight: '800', color: Number(a.amount) < 0 ? t.bad : t.good }}>{Number(a.amount) < 0 ? '−' : '+'}{money(Math.abs(Number(a.amount)))}</Text> : null} />;
}

/* ---------- pages ---------- */
function ActionsPage() {
  const app = useApp(), s = useS();
  const a = useQ(() => rpc<any[]>('action_required', { p_business: app.biz.id }), [app.biz.id, app.tick]);
  return (
    <Pg title="Action required" onBack={app.back} refreshing={a.l && !!a.d} onRefresh={app.bump}>
      {a.e ? <ErrBox e={a.e} retry={a.reload} /> : a.l && !a.d ? <Loading /> : (a.d ?? []).length ? <View style={[s.cardFlat, { borderWidth: 2, borderStyle: 'dotted', borderColor: LIGHT.blue }]}><Divided>{(a.d ?? []).map((x: any, i: number) => <ActionRow key={i} a={x} />)}</Divided></View> : <View style={s.card}><Empty icon="check-circle-outline" title="You're all caught up" hint="Nothing needs your attention right now." /></View>}
    </Pg>
  );
}
function ActivityPage() {
  const app = useApp(), s = useS();
  const [kind, setKind] = useState('All'), [rows, setRows] = useState<any[]>([]), [more, setMore] = useState(false), [load, setLoad] = useState(true), [err, setErr] = useState<string | null>(null);
  const kinds: Record<string, string | null> = { All: null, Earnings: 'earn', Refunds: 'refund', Orders: 'order', Payouts: 'payout' };
  const fetchPage = useCallback(async (reset: boolean, cur: any[]) => {
    setLoad(true); setErr(null);
    try {
      const r = await rpc<any[]>('activity_feed', { p_business: app.biz.id, p_days: 120, p_before: reset || !cur.length ? null : cur[cur.length - 1].at, p_limit: 30, p_kind: kinds[kind] });
      setRows(reset ? r : [...cur, ...r]); setMore(r.length === 30);
    } catch (e) { setErr(errText(e)); } finally { setLoad(false); }
  }, [app.biz.id, kind, app.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchPage(true, []); }, [fetchPage]);
  let lastDay = '';
  return (
    <Pg title="Recent activity" onBack={app.back} refreshing={load && rows.length > 0} onRefresh={app.bump}>
      <Text style={s.mut}>Last 120 days</Text>
      <Chips items={Object.keys(kinds)} value={kind} onChange={setKind} />
      {err ? <ErrBox e={err} retry={() => fetchPage(true, [])} /> : load && !rows.length ? <Loading /> : rows.length ? (
        <View style={s.cardFlat}>{rows.map((a, i) => { const d = dayHead(a.at), head = d !== lastDay; lastDay = d; return <View key={a.id}>{head ? <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: LIGHT.mute, paddingTop: 14, paddingBottom: 2, textTransform: 'uppercase' }}>{d}</Text> : i ? <View style={s.div} /> : null}<ActivityRow a={a} /></View>; })}</View>
      ) : <View style={s.card}><Empty icon="history" title="No activity yet" hint="Orders, refunds and payouts appear here." /></View>}
      {more ? <Btn kind="soft" label="Load more" busy={load} onPress={() => fetchPage(false, rows)} /> : null}
    </Pg>
  );
}
function ExplorePage() {
  const app = useApp(), s = useS(), t = useTheme(), on = new Set(app.meta.feats.map(f => f.feature));
  return (
    <Pg title="Explore more ways to sell" onBack={app.back}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {FX.FEATURES.map(f => (
          <Pressable key={f.key} onPress={() => app.go('feature', { k: f.key })} style={{ width: '31.5%', minHeight: 112, borderRadius: 16, padding: 11, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
            <FIcon k={f.key} size={38} /><Text style={[s.rt, { fontSize: 11, marginTop: 8 }]} numberOfLines={1}>{f.name}</Text>
            <Text style={{ fontSize: 10, color: on.has(f.key) ? t.good : t.mute, fontWeight: on.has(f.key) ? '700' : '400', marginTop: 3 }}>{on.has(f.key) ? '● Active' : f.approval ? 'Needs approval' : 'Not activated'}</Text>
          </Pressable>
        ))}
      </View>
    </Pg>
  );
}

/* ---------- charts ---------- */
function ChartsPage() {
  const app = useApp(), s = useS(), t = useTheme(), { range } = app;
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: app.biz.id, p_from: range.from, p_to: range.to, p_feature: null }), [app.biz.id, range.from, range.to, app.tick]);
  const [ci, setCi] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const d = sum.d, cur: { d: string; v: number }[] = d?.series ?? [], pv: { d: string; v: number }[] = d?.prev_series ?? [];
  const feats: any[] = [...(d?.features ?? [])].sort((a, b) => Number(b.amount) - Number(a.amount));
  const total = feats.reduce((a, x) => a + Number(x.amount), 0) || 1;
  const rev = Number(d?.revenue ?? 0), prev = Number(d?.prev_revenue ?? 0), growth = prev ? ((rev - prev) / Math.abs(prev)) * 100 : null;
  const W = width - 32 - 32, H = 170, L = 44, B_ = 26, T_ = 10, R_ = 8, pw = W - L - R_, ph = H - T_ - B_, n = cur.length;
  const mx = Math.max(1, ...cur.map(x => x.v), ...pv.map(x => x.v)) * 1.1, X = (i: number) => L + (n > 1 ? (i * pw) / (n - 1) : pw / 2), Y = (v: number) => T_ + ph - (v / mx) * ph;
  const pts = (a: { v: number }[]) => a.map((x, i) => `${X(i)},${Y(x.v)}`).join(' ');
  const hasData = cur.some(x => x.v !== 0) || pv.some(x => x.v !== 0);
  const r = 38, C = 2 * Math.PI * r; let off = 0;
  const slices = feats.filter(x => Number(x.amount) > 0);
  return (
    <Pg title="Sales by feature" onBack={app.back} refreshing={sum.l && !!d} onRefresh={app.bump}>
      <RangeBar />
      {sum.e && !d ? <ErrBox e={sum.e} retry={sum.reload} /> : sum.l && !d ? <Loading n={3} h={160} /> : (
        <>
          <View style={s.card}>
            <View style={s.row}><View style={s.g}><Text style={s.mut}>Net revenue · {range.label}</Text><Text style={[s.big, { fontSize: 26 }]}>{money(rev)}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ fontWeight: '800', fontSize: 13, color: growth !== null && growth < 0 ? t.bad : t.good }}>{growth === null ? '—' : `${growth >= 0 ? '↑' : '↓'} ${Math.abs(growth).toFixed(1)}%`}</Text><Text style={s.mut}>vs previous period</Text></View></View>
            {hasData ? (
              <>
                <Svg width={W} height={H} style={{ marginTop: 10 }}>
                  {[0, 0.5, 1].map(f => <G key={f}><Line x1={L} x2={W - R_} y1={Y(mx * f)} y2={Y(mx * f)} stroke={t.line} /><SvgText x={L - 6} y={Y(mx * f) + 3} fontSize="9" fill={t.mute} textAnchor="end">{short(mx * f)}</SvgText></G>)}
                  {[0, Math.floor((n - 1) / 2), n - 1].map((i, k) => cur[i] ? <SvgText key={k} x={X(i)} y={H - 8} fontSize="9" fill={t.mute} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{fmtDay(parseISO(cur[i].d))}</SvgText> : null)}
                  <Polyline points={pts(pv)} fill="none" stroke={t.mute} strokeWidth="1.6" strokeDasharray="4 3" />
                  <Polyline points={pts(cur)} fill="none" stroke={t.blue} strokeWidth="2.6" strokeLinejoin="round" />
                  {ci !== null && cur[ci] ? <G><Line x1={X(ci)} x2={X(ci)} y1={T_} y2={T_ + ph} stroke={t.blue} strokeOpacity="0.35" /><Circle cx={X(ci)} cy={Y(cur[ci].v)} r="4" fill={t.blue} />{pv[ci] ? <Circle cx={X(ci)} cy={Y(pv[ci].v)} r="3.5" fill={t.card} stroke={t.mute} /> : null}</G> : null}
                  {cur.map((_, i) => <Rect key={i} x={X(i) - pw / Math.max(n, 1) / 2} y={T_} width={pw / Math.max(n, 1)} height={ph} fill="transparent" onPress={() => setCi(i)} />)}
                </Svg>
                <View style={{ backgroundColor: t.soft, borderRadius: 12, padding: 10, minHeight: 38, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: t.blue }}>{ci !== null && cur[ci] ? `${fmtDay(parseISO(cur[ci].d))} · This period ${money(cur[ci].v)}${pv[ci] ? ` · Previous ${money(pv[ci].v)}` : ''}` : 'Tap the chart for a day'}</Text>
                </View>
                <View style={[s.row, { marginTop: 8, gap: 16 }]}><View style={s.row}><View style={{ width: 14, height: 3, backgroundColor: t.blue }} /><Text style={s.mut}>This period</Text></View><View style={s.row}><View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: t.mute }} /><Text style={s.mut}>Previous ({money(prev)})</Text></View></View>
              </>
            ) : <Empty icon="chart-line" title="No sales in this period" hint="Try a longer range." />}
          </View>
          <View style={s.card}>
            <Text style={[s.title, { marginBottom: 8 }]}>Share of gross sales</Text>
            {slices.length ? (
              <View style={s.row}>
                <Svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle cx="60" cy="60" r={r} fill="none" stroke={t.chip} strokeWidth="16" />
                  {slices.map(x => { const l = (Number(x.amount) / total) * C, e = <Circle key={x.feature} cx="60" cy="60" r={r} fill="none" stroke={FX.FUI[x.feature]?.color ?? t.blue} strokeWidth="16" strokeDasharray={`${Math.max(0, l - 1.5)} ${C - l + 1.5}`} strokeDashoffset={-off} />; off += l; return e; })}
                </Svg>
                <View style={s.g}>{slices.map(x => <View key={x.feature} style={[s.row, { paddingVertical: 4, gap: 8 }]}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: FX.FUI[x.feature]?.color }} /><Text style={[s.rt, { flex: 1 }]}>{FX.FM[x.feature]?.name}</Text><Text style={s.rt}>{Math.round((Number(x.amount) / total) * 100)}%</Text></View>)}</View>
              </View>
            ) : <Empty icon="chart-donut" title="No sales yet" />}
          </View>
          <View style={s.card}>
            <Text style={s.title}>By feature</Text>
            <View style={{ maxHeight: 5 * 66, marginTop: 6 }}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                <Divided>{feats.map(x => { const on = app.meta.feats.some(f => f.feature === x.feature), a = Number(x.amount); return <Row key={x.feature} left={<FIcon k={x.feature} />} title={FX.FM[x.feature]?.name} sub={on ? (a > 0 ? `${x.orders} orders · fees ${money(Math.abs(Number(x.fees)))}` : 'No sales in this period') : 'Not activated'} right={<View style={{ alignItems: 'flex-end' }}><Text style={s.rt}>{money(a)}</Text><Text style={s.sub}>{Math.round((a / total) * 100)}%</Text></View>} />; })}</Divided>
              </ScrollView>
            </View>
          </View>
        </>
      )}
    </Pg>
  );
}

/* ---------- order / listing rows ---------- */
function OrderRow({ o, hl }: any) {
  const app = useApp(), t = useTheme(), s = useS(), a = useAct();
  const fl = FX.FM[o.feature]?.flow ?? [], cx = o.status === 'Cancelled', i = fl.indexOf(o.status), nxt = cx ? undefined : fl[i + 1], first = i === 0 || i === 1;
  return (
    <View style={[s.ar, hl ? { backgroundColor: t.soft, borderRadius: 12, paddingHorizontal: 8 } : null]}>
      <FIcon k={o.feature} />
      <View style={s.g}><Text style={s.rt}>{o.customer_name ?? 'Customer'}</Text><Text style={s.sub}>{o.title} · {money(o.amount)}{Number(o.refunded) > 0 ? ` · refunded ${money(o.refunded)}` : ''}</Text><View style={{ marginTop: 6 }}><Pill tone={cx ? 'mute' : nxt ? 'blue' : 'good'}>{o.status}</Pill></View></View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        {nxt ? <Btn small label={nxt} busy={a.busy} onPress={() => a.run(() => rpc('advance_order', { p_order: o.id }), `Customer notified: ${nxt}`)} /> : null}
        <View style={[s.row, { gap: 12 }]}>
          {!cx && i >= 1 && Number(o.amount) > Number(o.refunded) ? <Pressable onPress={() => app.sheet('refund', o)}><Text style={s.link}>Refund</Text></Pressable> : null}
          {!cx && first ? <Pressable onPress={() => Alert.alert('Cancel this order?', 'Reservations are released and the customer is refunded.', [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: () => a.run(() => rpc('cancel_order', { p_order: o.id, p_reason: 'Cancelled by business' }), 'Order cancelled') }])}><Text style={[s.link, { color: t.bad }]}>Cancel</Text></Pressable> : null}
        </View>
      </View>
    </View>
  );
}
function ListingRow({ l, focus }: any) {
  const app = useApp(), t = useTheme(), s = useS(), a = useAct();
  const tone = l.status === 'published' ? 'good' : l.status === 'draft' ? 'mute' : 'warn';
  return (
    <View style={[s.ar, focus ? { backgroundColor: t.soft, borderRadius: 12, paddingHorizontal: 8 } : null]}>
      {l.photos?.[0] ? <Image source={{ uri: publicUrl(l.photos[0]) }} style={{ width: 44, height: 44, borderRadius: 10 }} /> : <FIcon k={l.feature} size={44} />}
      <View style={s.g}><Text style={s.rt} numberOfLines={1}>{l.title}</Text><Text style={s.sub}>{l.price != null ? money(l.price) : 'No price'}{l.stock != null ? ` · ${l.stock} in stock` : ''}</Text><View style={{ marginTop: 6 }}><Pill tone={tone}>{String(l.status).replace('_', ' ')}</Pill></View></View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Pressable onPress={() => app.wizard(l.feature, l.id)}><Text style={s.link}>Edit</Text></Pressable>
        {l.stock != null && l.status !== 'draft' ? <Pressable onPress={() => app.sheet('stock', l)}><Text style={s.link}>Stock</Text></Pressable> : null}
        {l.status === 'published' || l.status === 'paused' ? <Pressable disabled={a.busy} onPress={() => a.run(() => rpc('set_listing_status', { p_listing: l.id, p_status: l.status === 'published' ? 'paused' : 'published' }))}><Text style={s.link}>{l.status === 'published' ? 'Pause' : 'Resume'}</Text></Pressable> : null}
        {l.status !== 'in_review' ? <Pressable disabled={a.busy} onPress={() => Alert.alert('Archive this listing?', undefined, [{ text: 'Keep', style: 'cancel' }, { text: 'Archive', style: 'destructive', onPress: () => a.run(() => rpc('set_listing_status', { p_listing: l.id, p_status: 'archived' }), 'Archived') }])}><Text style={[s.link, { color: t.bad }]}>Archive</Text></Pressable> : null}
      </View>
    </View>
  );
}

/* ---------- requirements ---------- */
function RequirementsCard({ feature }: { feature: string }) {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct();
  const r = useQ(() => rpc<any[]>('feature_requirements_status', { p_business: app.biz.id, p_feature: feature }), [app.biz.id, feature, app.tick]);
  const rows = r.d ?? [], gap = rows.filter(x => x.required && !x.pay_gate && x.status !== 'approved').length;
  const upload = async (x: any) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const f: any = res.assets[0];
    if (f.size && f.size > 15 * 1024 * 1024) { app.toast('File must be under 15 MB'); return; }
    await a.run(async () => {
      const b64 = await FileSystem.readAsStringAsync(f.uri, { encoding: FileSystem.EncodingType.Base64 });
      const path = `${app.biz.id}/requirements/${x.key}/${uuid()}-${String(f.name).replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('business-docs').upload(path, decode(b64), { contentType: f.mimeType ?? 'application/pdf' });
      if (error) throw error;
      await rpc('submit_requirement', { p_business: app.biz.id, p_requirement: x.id, p_file: path, p_declared: false });
    }, 'Submitted for review');
  };
  const pill = (st: string) => st === 'approved' ? <Pill tone="good">Approved</Pill> : st === 'submitted' ? <Pill tone="warn">In review</Pill> : st === 'rejected' ? <Pill tone="bad">Rejected</Pill> : <Pill tone="mute">Missing</Pill>;
  return (
    <View style={s.cardFlat}>
      <Text style={[s.title, { paddingTop: 14 }]}>Requirements</Text>
      {r.e ? <View style={{ paddingVertical: 12 }}><ErrBox e={r.e} retry={r.reload} /></View> : r.l && !r.d ? <View style={{ paddingVertical: 12 }}><Skel h={80} /></View> : rows.length ? (
        <>
          <Text style={[s.mut, { marginBottom: 2 }]}>{gap ? `${gap} required ${gap > 1 ? 'items' : 'item'} left before you can publish. Drafts are always allowed.` : 'All required items are approved.'}</Text>
          <Divided>{rows.map(x => (
            <Row key={x.id} title={x.label} sub={`${x.required ? 'Required' : 'Optional'}${x.note ? ` · ${x.note}` : ''}`} sub2={x.reason} right={<View style={{ alignItems: 'flex-end', gap: 6 }}>{pill(x.status)}{x.status === 'missing' || x.status === 'rejected' ? (x.kind === 'declaration' ? <Btn small label="Confirm" busy={a.busy} onPress={() => a.run(() => rpc('submit_requirement', { p_business: app.biz.id, p_requirement: x.id, p_file: null, p_declared: true }), 'Confirmed')} /> : <Btn small label={x.status === 'rejected' ? 'Replace' : 'Upload'} busy={a.busy} onPress={() => upload(x)} />) : null}</View>} />
          ))}</Divided>
          {POLICY[feature] ? <Text style={[s.mut, { paddingBottom: 12 }]}>{POLICY[feature]}</Text> : null}
        </>
      ) : <View style={{ paddingVertical: 10 }}><Text style={s.mut}>{POLICY[feature] ?? 'No documents needed.'}</Text></View>}
    </View>
  );
}

/* ---------- feature page ---------- */
function FeaturePage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), { k, focus } = useArg() as { k: string; focus?: string };
  const fe = FX.FM[k] as Feature | undefined, on = app.meta.feats.some(f => f.feature === k);
  const [of, setOf] = useState('All'), [lf, setLf] = useState('All');
  const orders = useQ(() => q<any[]>(supabase.from('feature_orders').select('*').eq('business_id', app.biz.id).eq('feature', k).order('created_at', { ascending: false }).limit(60)), [app.biz.id, k, app.tick]);
  const lst = useQ(() => q<any[]>(supabase.from('listings').select('id,title,status,price,stock,photos,feature,updated_at').eq('business_id', app.biz.id).eq('feature', k).neq('status', 'archived').order('updated_at', { ascending: false })), [app.biz.id, k, app.tick]);
  if (!fe) return <Pg title="Feature" onBack={app.back}><Empty title="Feature not found" /></Pg>;
  const os = orders.d ?? [], ls = lst.d ?? [];
  const fo = os.filter(o => of === 'All' || (of === 'Cancelled' ? o.status === 'Cancelled' : o.status === of));
  const fl = ls.filter(l => lf === 'All' || l.status === lf);
  const openN = os.filter(o => o.status !== 'Cancelled' && o.status !== fe.flow[fe.flow.length - 1]).length;
  const restricted = app.biz.verification === 'restricted';
  return (
    <Pg title={fe.name} onBack={app.back} refreshing={(orders.l || lst.l) && !!orders.d} onRefresh={app.bump}>
      <View style={s.card}>
        <View style={s.row}><FIcon k={k} size={40} /><View style={s.g}><Text style={[s.rt, { fontSize: 15 }]}>{fe.name}</Text><Text style={s.mut}>{on ? `${ls.length} listings · ${openN} open` : 'Not activated'}</Text></View>{on ? <Pill tone="good">Active</Pill> : null}</View>
        <Text style={[s.mut, { marginTop: 10 }]}>{fe.flow.join(' → ')}</Text>
        <View style={[s.row, { marginTop: 12 }]}>
          {on ? <Btn style={{ flex: 1 }} small label={`+ ${fe.add}`} onPress={() => app.wizard(k)} /> : <Btn style={{ flex: 1 }} small label={`Activate ${fe.name}`} disabled={restricted} busy={a.busy} onPress={() => a.run(() => rpc('activate_feature', { p_business: app.biz.id, p_feature: k }), `${fe.name} activated`)} />}
          <Btn style={{ flex: 1 }} small kind="soft" label="Messages" onPress={() => app.go('messages')} />
        </View>
      </View>
      <RequirementsCard feature={k} />
      <Section title="Orders and requests" right={String(os.length)} />
      <Chips items={['All', ...fe.flow, 'Cancelled']} value={of} onChange={setOf} />
      {orders.e ? <ErrBox e={orders.e} retry={orders.reload} /> : (
        <View style={s.cardFlat}>
          {orders.l && !orders.d ? <View style={{ padding: 12 }}><Skel h={90} /></View> : fo.length ? <Divided>{fo.map(o => <OrderRow key={o.id} o={o} hl={o.id === focus} />)}</Divided> : <Empty icon="clipboard-text-outline" title={os.length ? 'No orders with this status' : on ? 'No orders yet' : `Activate ${fe.name} to receive orders`} hint={on && !os.length ? 'They appear here when customers buy or book.' : undefined} />}
        </View>
      )}
      <Section title="Listings" right={String(ls.length)} />
      <Chips items={['All', 'draft', 'published', 'paused', 'in_review']} value={lf} onChange={setLf} />
      {lst.e ? <ErrBox e={lst.e} retry={lst.reload} /> : (
        <View style={s.cardFlat}>
          {lst.l && !lst.d ? <View style={{ padding: 12 }}><Skel h={90} /></View> : fl.length ? <Divided>{fl.map(l => <ListingRow key={l.id} l={l} />)}</Divided> : <Empty icon="format-list-bulleted" title={ls.length ? 'No listings with this status' : on ? 'No listings yet' : `Activate ${fe.name} to add listings`} cta={on && !ls.length ? fe.add : undefined} onCta={() => app.wizard(k)} />}
        </View>
      )}
    </Pg>
  );
}

/* ---------- tab panels ---------- */
function FeaturesPanel() {
  const app = useApp(), s = useS(), a = useAct(), on = new Set(app.meta.feats.map(f => f.feature)), restricted = app.biz.verification === 'restricted';
  return (
    <View>
      <Divided>
        {FX.FEATURES.map(f => (
          <Row key={f.key} left={<FIcon k={f.key} size={38} />} title={f.name} sub={on.has(f.key) ? 'Active' : f.approval ? 'Needs approval' : 'Not activated'}
            right={<View style={[s.row, { gap: 8 }]}>
              {on.has(f.key) ? <Pressable accessibilityLabel={`Add to ${f.name}`} onPress={() => app.wizard(f.key)} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: app.dark ? '#202B4F' : '#EEF1FF', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} color={LIGHT.blue} /></Pressable> : null}
              <Btn small kind={on.has(f.key) ? 'soft' : 'primary'} label={on.has(f.key) ? 'Deactivate' : 'Activate'} disabled={!on.has(f.key) && restricted} busy={a.busy} onPress={() => a.run(() => rpc(on.has(f.key) ? 'deactivate_feature' : 'activate_feature', { p_business: app.biz.id, p_feature: f.key }), on.has(f.key) ? `${f.name} deactivated` : `${f.name} activated`)} />
            </View>} />
        ))}
      </Divided>
    </View>
  );
}
function OrdersPanel() {
  const app = useApp(), [f, setF] = useState('Open');
  const o = useQ(() => q<any[]>(supabase.from('feature_orders').select('*').eq('business_id', app.biz.id).order('created_at', { ascending: false }).limit(80)), [app.biz.id, app.tick]);
  const rows = (o.d ?? []).filter(x => f === 'All' || (f === 'Open' ? x.status !== 'Cancelled' && !FX.FM[x.feature]?.flow.slice(-1).includes(x.status) : f === 'Cancelled' ? x.status === 'Cancelled' : FX.FM[x.feature]?.flow.slice(-1).includes(x.status)));
  return (
    <View style={{ gap: 10 }}>
      <Chips items={['Open', 'Closed', 'Cancelled', 'All']} value={f} onChange={setF} />
      {o.e ? <ErrBox e={o.e} retry={o.reload} /> : o.l && !o.d ? <Loading /> : rows.length ? <Divided>{rows.map(x => <OrderRow key={x.id} o={x} />)}</Divided> : <Empty icon="clipboard-text-outline" title={(o.d ?? []).length ? 'No orders here' : 'No orders yet'} hint="They appear here when customers buy or book." />}
    </View>
  );
}
function ListingsPanel() {
  const app = useApp(), [f, setF] = useState('All');
  const l = useQ(() => q<any[]>(supabase.from('listings').select('id,title,status,price,stock,photos,feature').eq('business_id', app.biz.id).neq('status', 'archived').order('updated_at', { ascending: false }).limit(100)), [app.biz.id, app.tick]);
  const rows = (l.d ?? []).filter(x => f === 'All' || x.status === f);
  return (
    <View style={{ gap: 10 }}>
      <Chips items={['All', 'draft', 'published', 'paused', 'in_review']} value={f} onChange={setF} />
      {l.e ? <ErrBox e={l.e} retry={l.reload} /> : l.l && !l.d ? <Loading /> : rows.length ? <Divided>{rows.map(x => <ListingRow key={x.id} l={x} />)}</Divided> : <Empty icon="format-list-bulleted" title={(l.d ?? []).length ? 'No listings with this status' : 'No listings yet'} hint={app.meta.feats.length ? 'Tap + on an active feature to add one.' : 'Activate a feature first.'} cta={app.meta.feats.length ? undefined : 'Explore features'} onCta={() => app.go('explore')} />}
    </View>
  );
}
function PayoutsPanel() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz;
  const [tab, setTab] = useState('Ledger'), [f, setF] = useState('All'), [pg_, setPg] = useState(1);
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: b.id, p_from: app.range.from, p_to: app.range.to, p_feature: null }), [b.id, app.tick]);
  const typeMap: Record<string, string | null> = { All: null, Sales: 'sale', Fees: 'fee', Refunds: 'refund', Payouts: 'payout' };
  const led = useQ(() => q<any[]>((() => { let r = supabase.from('wallet_ledger').select('*').eq('business_id', b.id).order('created_at', { ascending: false }).range(0, pg_ * 15 - 1); const ty = tab === 'Payout history' ? 'payout' : typeMap[f]; if (ty) r = r.eq('type', ty); return r; })()), [b.id, tab, f, pg_, app.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const av = Number(sum.d?.available ?? 0), pe = Number(sum.d?.pending ?? 0), payOK = app.meta.payout?.status === 'verified';
  const tone = (st: string) => st === 'completed' || st === 'posted' ? 'good' : st === 'failed' || st === 'reversed' ? 'bad' : 'warn';
  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: 22, backgroundColor: LIGHT.blue, padding: 16 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: '#DDE5FF' }}>AVAILABLE</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 6 }}>{money(av)}</Text>
        <Text style={{ color: '#DDE5FF', marginTop: 6, fontSize: 12 }}>Pending {money(pe)} · Payout method {payOK ? `•••• ${app.meta.payout?.last4 ?? ''}` : 'not set'}</Text>
      </View>
      <Btn label={payOK ? 'Request payout' : 'Set up payouts'} disabled={b.verification === 'restricted'} onPress={() => app.sheet(payOK ? 'request' : 'payout')} />
      <Seg items={['Ledger', 'Payout history']} value={tab} onChange={(x: string) => { setTab(x); setPg(1); }} />
      {tab === 'Ledger' ? <Chips items={Object.keys(typeMap)} value={f} onChange={(x: string) => { setF(x); setPg(1); }} /> : null}
      {led.e ? <ErrBox e={led.e} retry={led.reload} /> : led.l && !led.d ? <Loading /> : (led.d ?? []).length ? (
        <Divided>{(led.d ?? []).map(r => tab === 'Ledger'
          ? <Row key={r.id} title={r.label ?? r.type} sub={`${r.feature ? FX.FM[r.feature]?.name ?? '' : 'Wallet'} · ${ago(r.created_at)} · ${r.status}`} right={<Text style={{ fontWeight: '800', color: Number(r.amount) > 0 ? t.good : t.ink }}>{Number(r.amount) > 0 ? '+' : ''}{money(r.amount)}</Text>} />
          : <Row key={r.id} left={<View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="bank-transfer-out" size={18} color={t.blue} /></View>} title={`${money(Math.abs(Number(r.amount)))} · ${r.method ? (app.meta.rules.find(x => x.method === r.method)?.name ?? r.method) : 'Payout'}`} sub={`${r.id.slice(0, 8)} · ${ago(r.created_at)}`} right={<Pill tone={tone(r.status)}>{r.status}</Pill>} />)}</Divided>
      ) : <Empty icon="bank-transfer" title={tab === 'Ledger' ? 'No transactions yet' : 'No payouts yet'} hint={tab === 'Ledger' ? 'Sales, fees, refunds and payouts appear here.' : 'Requested payouts appear here with their status.'} />}
      {(led.d ?? []).length >= pg_ * 15 ? <Btn kind="soft" label="Load more" onPress={() => setPg(pg_ + 1)} /> : null}
    </View>
  );
}

/* ---------- messages ---------- */
function MessagesPage() {
  const app = useApp(), s = useS(), t = useTheme(), [f, setF] = useState('All');
  const c = useQ(() => q<any[]>(supabase.from('conversations').select('*').eq('business_id', app.biz.id).order('id', { ascending: false }).limit(100)), [app.biz.id, app.tick]);
  const rows = (c.d ?? []).filter(x => f === 'All' || x.feature === f);
  return (
    <Pg title="Messages" onBack={app.back} refreshing={c.l && !!c.d} onRefresh={app.bump}>
      <Chips items={['All', ...app.meta.feats.map(x => x.feature)].map(k => ({ k, l: k === 'All' ? 'All' : FX.FM[k]?.name }))} value={f} onChange={setF} />
      {c.e ? <ErrBox e={c.e} retry={c.reload} /> : c.l && !c.d ? <Loading /> : rows.length ? (
        <View style={s.cardFlat}><Divided>{rows.map(x => <Row key={x.id} onPress={() => app.go('conversation', { id: x.id })} left={<Avatar text={(x.customer_name ?? '?')[0]} size={40} radius={20} bg={t.soft} />} title={x.customer_name ?? 'Customer'} sub={x.last_body ?? 'No messages yet'} sub2={`${x.feature ? FX.FM[x.feature]?.name : ''}${x.ref_label ? ` · ${x.ref_label}` : ''}`} right={x.unread_business > 0 ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{x.unread_business}</Text></View> : null} />)}</Divided></View>
      ) : <View style={s.card}><Empty icon="chat-outline" title="No conversations yet" hint="Customer messages about your listings and orders appear here." /></View>}
    </Pg>
  );
}
function ConversationPage() {
  const app = useApp(), s = useS(), t = useTheme(), { id } = useArg() as { id: string };
  const [text, setText] = useState(''), [sending, setSending] = useState(false), ref = useRef<ScrollView>(null);
  const conv = useQ(() => q<any>(supabase.from('conversations').select('*').eq('id', id).single()), [id]);
  const ms = useQ(() => q<any[]>(supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')), [id, app.tick]);
  useEffect(() => { rpc('mark_conversation_read', { p_conv: id }).then(app.bump).catch(() => undefined); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    const body = text.trim(); if (!body || sending) return;
    setSending(true);
    try { await q(supabase.from('messages').insert({ conversation_id: id, sender_id: app.userId, body })); setText(''); ms.reload(); } catch (e) { app.toast(errText(e)); } finally { setSending(false); }
  };
  const c = conv.d;
  return (
    <Pg title={c?.customer_name ?? 'Conversation'} onBack={app.back} scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {c ? <Pressable onPress={() => c.feature && app.go('feature', { k: c.feature, focus: c.ref_id })} style={[s.card, { padding: 12, marginBottom: 10 }]}><Text style={s.mut}>About</Text><Text style={s.rt}>{c.ref_label ?? 'Conversation'}{c.feature ? ` · ${FX.FM[c.feature]?.name} ›` : ''}</Text></Pressable> : null}
        <ScrollView ref={ref} style={{ flex: 1 }} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {ms.e ? <ErrBox e={ms.e} retry={ms.reload} /> : ms.l && !ms.d ? <Loading n={3} h={44} /> : (ms.d ?? []).length ? (ms.d ?? []).map(m => { const mine = m.sender_id === app.userId; return <View key={m.id} style={{ maxWidth: '78%', alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? t.blue : t.chip, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 }}><Text style={{ color: mine ? '#fff' : t.ink, fontSize: 13 }}>{m.body}</Text></View>; }) : <Empty icon="message-text-outline" title="No messages yet" />}
        </ScrollView>
        <View style={[s.row, { paddingTop: 8 }]}><TextInput style={[s.fld, { flex: 1 }]} value={text} onChangeText={setText} placeholder="Write a reply" placeholderTextColor={t.mute} onSubmitEditing={send} returnKeyType="send" /><Btn label="Send" small busy={sending} disabled={!text.trim()} onPress={send} style={{ minHeight: 46 }} /></View>
      </KeyboardAvoidingView>
    </Pg>
  );
}

/* ---------- notifications ---------- */
function NotificationsPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const n = useQ(() => q<any[]>(supabase.from('notifications').select('*').eq('business_id', app.biz.id).order('created_at', { ascending: false }).limit(80)), [app.biz.id, app.tick]);
  const open = async (x: any) => {
    if (!x.read_at) { try { await rpc('mark_notification_read', { p_id: x.id }); app.bump(); } catch { /* read state is not critical */ } }
    const l = x.link ?? {};
    if (l.view === 'feat' && l.arg) app.go('feature', { k: l.arg }); else if (l.view === 'wallet') app.panel('payouts'); else if (l.view === 'onboard') app.go('registration'); else if (l.view === 'promo') app.go('promotions');
  };
  return (
    <Pg title="Notifications" onBack={app.back} refreshing={n.l && !!n.d} onRefresh={app.bump} right={app.meta.unreadN > 0 ? <Pressable onPress={async () => { try { await rpc('mark_notifications_read', { p_business: app.biz.id }); app.bump(); } catch (e) { app.toast(errText(e)); } }}><Text style={s.link}>Mark all as read</Text></Pressable> : null}>
      {n.e ? <ErrBox e={n.e} retry={n.reload} /> : n.l && !n.d ? <Loading /> : (n.d ?? []).length ? <View style={s.cardFlat}><Divided>{(n.d ?? []).map(x => <Row key={x.id} onPress={() => open(x)} left={x.feature ? <FIcon k={x.feature} /> : <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell-outline" size={18} color={t.blue} /></View>} title={x.title} sub={ago(x.created_at)} right={!x.read_at ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.blue }} /> : null} />)}</Divided></View>
        : <View style={s.card}><Empty icon="bell-outline" title="No notifications yet" /></View>}
    </Pg>
  );
}

/* ---------- search ---------- */
function SearchPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const [qs, setQs] = useState(''), [sc, setSc] = useState('All'), [res, setRes] = useState<any[]>([]), [st, setSt] = useState<'idle' | 'load' | 'err'>('idle'), seq = useRef(0);
  useEffect(() => {
    if (qs.trim().length < 2) { setRes([]); setSt('idle'); return; }
    const n = ++seq.current; setSt('load');
    const h = setTimeout(async () => { try { const r = await rpc<any[]>('search_business', { p_business: app.biz.id, p_q: qs.trim() }); if (n === seq.current) { setRes(r); setSt('idle'); } } catch { if (n === seq.current) setSt('err'); } }, 250);
    return () => clearTimeout(h);
  }, [qs, app.biz.id]);
  const go = (r: any) => { if (r.target === 'wallet') app.panel('payouts'); else if (r.target === 'promo') app.go('promotions'); else app.go('feature', { k: r.feature, focus: r.rec_id }); };
  const L = res.filter(x => sc === 'All' || x.scope === sc);
  return (
    <Pg title="Search" onBack={app.back}>
      <TextInput autoFocus style={s.fld} value={qs} onChangeText={setQs} placeholder="Listings, orders, customers, payouts" placeholderTextColor={t.mute} returnKeyType="search" />
      <Chips items={['All', 'Listings', 'Orders', 'Customers', 'Promotions', 'Money']} value={sc} onChange={setSc} />
      <View style={s.cardFlat}>
        {st === 'err' ? <Empty icon="wifi-off" title="Search failed" hint="Check your connection and try again." /> : st === 'load' ? <View style={{ padding: 12 }}><Skel h={90} /></View> : qs.trim().length < 2 ? <Empty icon="magnify" title="Search this business" hint="Type at least two letters." /> : L.length ? <Divided>{L.map((r, i) => <Row key={i} onPress={() => go(r)} left={<FIcon k={r.feature} />} title={r.title} sub={r.sub} right={<Icon name="chevron-right" size={18} color={t.mute} />} />)}</Divided> : <Empty icon="magnify-close" title="No matches" hint="Try another word or filter." />}
      </View>
    </Pg>
  );
}
/** Edge handle: arrow tab, tap to reveal the search icon, tap again to open search. Drag it; it rests only on the left or right edge. */
function SearchHandle({ onOpen }: { onOpen: () => void }) {
  const t = useTheme(), ins = useSafeAreaInsets(), { width: W, height: H } = useWindowDimensions();
  const [side, setSide] = useState<'l' | 'r'>('r'), [open, setOpen] = useState(false), [drag, setDrag] = useState(false);
  const pos = useRef(new Animated.ValueXY({ x: 0, y: H * 0.45 })).current, timer = useRef<any>(null), sideRef = useRef<'l' | 'r'>('r'), openRef = useRef(false), y0 = useRef(H * 0.45), x0 = useRef(0);
  const reveal = () => { openRef.current = true; setOpen(true); clearTimeout(timer.current); timer.current = setTimeout(() => { openRef.current = false; setOpen(false); }, 2800); };
  const SZ = 50, TAB = 22;
  const xFor = (sd: 'l' | 'r', o: boolean) => (sd === 'r' ? W - (o ? SZ + 10 : TAB) : o ? 10 : 0);
  useEffect(() => { pos.setValue({ x: xFor(side, open), y: y0.current }); }, [side, open, W]); // eslint-disable-line react-hooks/exhaustive-deps
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pos.stopAnimation((v: any) => { x0.current = v.x; y0.current = v.y; }); setDrag(false); },
    onPanResponderMove: (_: any, g: any) => {
      if (!drag && Math.hypot(g.dx, g.dy) < 6) return;
      setDrag(true); clearTimeout(timer.current);
      const nx = Math.max(0, Math.min(W - SZ, x0.current + g.dx)), ny = Math.max(ins.top + 80, Math.min(H - ins.bottom - 150, y0.current + g.dy));
      pos.setValue({ x: nx, y: ny });
    },
    onPanResponderRelease: (_: any, g: any) => {
      if (Math.hypot(g.dx, g.dy) < 6) { if (!openRef.current) reveal(); else { openRef.current = false; setOpen(false); onOpen(); } return; }
      const cx = Math.max(0, Math.min(W - SZ, x0.current + g.dx)) + SZ / 2, sd: 'l' | 'r' = cx < W / 2 ? 'l' : 'r';
      y0.current = Math.max(ins.top + 80, Math.min(H - ins.bottom - 150, y0.current + g.dy));
      sideRef.current = sd; setSide(sd); setDrag(false); reveal();
      Animated.spring(pos, { toValue: { x: xFor(sd, true), y: y0.current }, useNativeDriver: false, bounciness: 6 }).start();
    },
  })).current;
  const round = open || drag;
  return (
    <Animated.View {...pan.panHandlers} accessibilityLabel="Search" style={{ position: 'absolute', zIndex: 15, width: round ? SZ : TAB, height: round ? SZ : 58, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', borderRadius: round ? SZ / 2 : 14, borderTopRightRadius: round ? SZ / 2 : side === 'l' ? 14 : 0, borderBottomRightRadius: round ? SZ / 2 : side === 'l' ? 14 : 0, borderTopLeftRadius: round ? SZ / 2 : side === 'r' ? 14 : 0, borderBottomLeftRadius: round ? SZ / 2 : side === 'r' ? 14 : 0, transform: pos.getTranslateTransform(), shadowColor: t.blue, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
      <MaterialCommunityIcons name={round ? 'magnify' : side === 'r' ? 'chevron-left' : 'chevron-right'} size={round ? 24 : 20} color="#fff" />
    </Animated.View>
  );
}

/* ---------- promotions ---------- */
function PromotionsPage() {
  const app = useApp(), s = useS(), a = useAct();
  const p = useQ(() => q<any[]>(supabase.from('promotions').select('*').eq('business_id', app.biz.id).order('id', { ascending: false })), [app.biz.id, app.tick]);
  const tone = (st: string) => (st === 'active' ? 'good' : st === 'ended' ? 'mute' : 'warn');
  return (
    <Pg title="Promotions" onBack={app.back} refreshing={p.l && !!p.d} onRefresh={app.bump} right={app.meta.feats.length ? <Btn small label="Create" onPress={() => app.sheet('promo')} /> : null}>
      {p.e ? <ErrBox e={p.e} retry={p.reload} /> : p.l && !p.d ? <Loading /> : (p.d ?? []).length ? <View style={s.cardFlat}><Divided>{(p.d ?? []).map(x => (
        <Row key={x.id} left={<FIcon k={x.feature ?? 'goodies'} />} title={x.title} sub={`${x.funded_by === 'platform' ? 'Platform-funded' : 'Vendor-funded'} · ${x.discount_text ?? ''}`} sub2={`${x.redemptions} redemptions${Number(x.vendor_cost) > 0 ? ` · cost to you ${money(x.vendor_cost)}` : ''}`}
          right={<View style={{ alignItems: 'flex-end', gap: 6 }}><Pill tone={tone(x.status)}>{String(x.status).replace('_', ' ')}</Pill>{x.funded_by === 'vendor' && (x.status === 'active' || x.status === 'paused') ? <Pressable disabled={a.busy} onPress={() => a.run(() => rpc('set_promotion_status', { p_id: x.id, p_status: x.status === 'paused' ? 'active' : 'paused' }))}><Text style={s.link}>{x.status === 'paused' ? 'Resume' : 'Pause'}</Text></Pressable> : null}</View>} />))}</Divided></View>
        : <View style={s.card}><Empty icon="tag-outline" title="No promotions yet" hint={app.meta.feats.length ? 'Create a voucher or offer.' : 'Activate a feature first.'} cta={app.meta.feats.length ? 'Create promotion' : 'Explore features'} onCta={() => (app.meta.feats.length ? app.sheet('promo') : app.go('explore'))} /></View>}
    </Pg>
  );
}

/* ---------- registration (optional business verification) ---------- */
function RegistrationPage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), b = app.biz;
  const r = useQ(() => rpc<any[]>('feature_requirements_status', { p_business: b.id, p_feature: '_business' }), [b.id, app.tick]);
  const rows = r.d ?? [], can = b.verification === 'setup' || b.verification === 'action';
  const msg: Record<Status, string> = { verified: 'Your business is verified.', pending: 'Your documents are in review. This usually takes 1 to 2 business days.', setup: 'Registration is optional and earns the Verified badge.', action: 'A document needs your attention. Replace it and resubmit.', restricted: 'Some actions are paused on this business.' };
  const upload = async (x: any) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const f: any = res.assets[0];
    if (f.size && f.size > 15 * 1024 * 1024) { app.toast('File must be under 15 MB'); return; }
    await a.run(async () => {
      const b64 = await FileSystem.readAsStringAsync(f.uri, { encoding: FileSystem.EncodingType.Base64 });
      const path = `${b.id}/verification/${x.key}-${uuid()}-${String(f.name).replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('business-docs').upload(path, decode(b64), { contentType: f.mimeType ?? 'application/pdf' });
      if (error) throw error;
      await rpc('submit_requirement', { p_business: b.id, p_requirement: x.id, p_file: path, p_declared: false });
    }, 'Uploaded');
  };
  const pill = (st: string) => st === 'approved' ? <Pill tone="good">Approved</Pill> : st === 'submitted' ? <Pill tone="warn">Uploaded</Pill> : st === 'rejected' ? <Pill tone="bad">Rejected</Pill> : <Pill tone="mute">Missing</Pill>;
  const uploaded = rows.some(x => x.status === 'submitted'), stuck = rows.some(x => x.status === 'rejected');
  return (
    <Pg title="Business registration" onBack={app.back} refreshing={r.l && !!r.d} onRefresh={app.bump}>
      <View style={s.row}><StatusPill s={b.verification} /></View>
      <View style={{ backgroundColor: b.verification === 'restricted' || b.verification === 'action' ? t.badBg : t.soft, borderRadius: 12, padding: 12 }}><Text style={{ color: b.verification === 'restricted' || b.verification === 'action' ? t.badFg : t.blue, fontWeight: '600', lineHeight: 20 }}>{msg[b.verification]}</Text></View>
      <View style={s.cardFlat}>
        <Text style={[s.title, { paddingTop: 14 }]}>Documents</Text>
        {r.e ? <View style={{ paddingVertical: 12 }}><ErrBox e={r.e} retry={r.reload} /></View> : r.l && !r.d ? <View style={{ paddingVertical: 12 }}><Skel h={120} /></View> : rows.length ? (
          <Divided>{rows.map(x => <Row key={x.id} title={x.label} sub={x.file ? String(x.file).split('/').pop() : 'PDF or photo, up to 15 MB'} sub2={x.reason} right={<View style={{ alignItems: 'flex-end', gap: 6 }}>{pill(x.status)}{can && (x.status === 'missing' || x.status === 'rejected' || x.status === 'submitted') ? <Btn small kind="soft" label={x.status === 'missing' ? 'Upload' : 'Replace'} busy={a.busy} onPress={() => upload(x)} /> : null}</View>} />)}</Divided>
        ) : <Empty icon="file-document-outline" title="No documents required" />}
        {can && rows.length ? <View style={{ paddingVertical: 14 }}><Btn label={b.verification === 'action' ? 'Resubmit for review' : 'Submit for review'} disabled={!uploaded || stuck} busy={a.busy} onPress={() => a.run(() => rpc('submit_verification', { p_business: b.id, p_documents: {} }), 'Submitted for review')} /></View> : null}
        {b.verification === 'restricted' ? <View style={{ paddingVertical: 14 }}><Btn label="Contact support" onPress={() => app.go('help')} /></View> : null}
      </View>
      {b.verification === 'verified' || b.verification === 'pending' ? null : <Checklist />}
    </Pg>
  );
}

/* ---------- audit log, help, security ---------- */
function AuditPage() {
  const app = useApp(), s = useS();
  const l = useQ(() => q<any[]>(supabase.from('audit_log').select('id,action,meta,at').eq('business_id', app.biz.id).order('at', { ascending: false }).limit(80)), [app.biz.id, app.tick]);
  return (
    <Pg title="Activity log" onBack={app.back} refreshing={l.l && !!l.d} onRefresh={app.bump}>
      {l.e ? <ErrBox e={l.e} retry={l.reload} /> : l.l && !l.d ? <Loading /> : (l.d ?? []).length ? <View style={s.cardFlat}><Divided>{(l.d ?? []).map(x => <Row key={x.id} title={x.meta?.title ?? String(x.action).replace(/_/g, ' ')} sub={ago(x.at)} />)}</Divided></View> : <View style={s.card}><Empty icon="history" title="Nothing logged yet" /></View>}
    </Pg>
  );
}
const SUPPORT_EMAIL = (process.env as any).EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@wantiss.com';
function HelpPage() {
  const app = useApp(), s = useS(), t = useTheme();
  const cats = ['Account and registration', 'Listings and publishing', 'Orders and bookings', 'Payments and payouts', 'Refunds and disputes', 'Promotions and vouchers', 'Technical problems'];
  const mail = (c: string) => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${c} · ${app.biz.name}`)}&body=${encodeURIComponent(`\n\nBusiness reference: ${app.biz.id}`)}`).catch(() => app.toast('No email app found'));
  return <Pg title="Help and support" onBack={app.back}><View style={s.cardFlat}><Divided>{cats.map(c => <Row key={c} title={c} sub="Opens an email with your business reference" onPress={() => mail(c)} right={<Icon name="chevron-right" size={18} color={t.mute} />} />)}</Divided></View></Pg>;
}
function SecurityPage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct();
  const f = useQ(async () => { const { data, error } = await supabase.auth.mfa.listFactors(); if (error) throw error; return (data?.totp ?? []).filter((x: any) => x.status === 'verified'); }, [app.tick]);
  const factor = (f.d ?? [])[0];
  return (
    <Pg title="Security and privacy" onBack={app.back}>
      <View style={s.cardFlat}><Divided>
        <Row title="Change password" onPress={() => app.sheet('password')} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
        <Row title="Two-step verification" sub={f.l && !f.d ? 'Checking…' : factor ? 'On · authenticator app' : 'Add a second check when you sign in'} right={<Toggle value={!!factor} onValueChange={(v: boolean) => { if (v) app.sheet('mfa'); else if (factor) Alert.alert('Turn off two-step verification?', undefined, [{ text: 'Keep on', style: 'cancel' }, { text: 'Turn off', style: 'destructive', onPress: () => a.run(async () => { const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id }); if (error) throw error; f.reload(); }, 'Two-step verification off') }]); }} />} />
        <Row title="Sign out of other devices" onPress={() => Alert.alert('Sign out everywhere else?', 'Other devices will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => a.run(async () => { const { error } = await supabase.auth.signOut({ scope: 'others' }); if (error) throw error; }, 'Other devices signed out') }])} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
      </Divided></View>
      <Section title="Your data" />
      <View style={s.cardFlat}><Divided>
        <Row title="Download my data" sub="A copy of your account and business data" onPress={() => a.run(() => rpc('request_data_action', { p_kind: 'export' }), 'We will email you a download link')} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
        <Row title={<Text style={{ color: t.badFg, fontWeight: '700' }}>Delete account</Text>} sub="Available once your orders and balances are settled" onPress={() => Alert.alert('Delete your account?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Request deletion', style: 'destructive', onPress: () => a.run(() => rpc('request_data_action', { p_kind: 'delete' }), 'Deletion request received') }])} right={<Icon name="chevron-right" size={18} color={t.mute} />} />
      </Divided></View>
    </Pg>
  );
}

/* ---------- business information ---------- */
function BusinessInfoPage() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), b = app.biz;
  const [f, setF] = useState(() => ({ name: b.name, description: b.description ?? '', phone_country: b.phone_country ?? 'NG', phone: b.phone ?? '', email: b.email ?? '', website: b.website ?? '', address: b.address ?? '', city: b.city ?? '', country: b.country ?? 'NG', delivery_modes: b.delivery_modes ?? [], hours: (b.hours && Object.keys(b.hours).length ? b.hours : defaultHours()) as Record<string, any>, logo_url: b.logo_url }));
  const [picker, setPicker] = useState<null | 'phone' | 'country'>(null), [cq, setCq] = useState('');
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  const logo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { app.toast('Allow photo access to choose a logo'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (r.canceled) return;
    await a.run(async () => {
      const m = await ImageManipulator.manipulateAsync(r.assets[0].uri, [{ resize: { width: 600 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
      const b64 = await FileSystem.readAsStringAsync(m.uri, { encoding: FileSystem.EncodingType.Base64 });
      const path = `${b.id}/logo/${uuid()}.jpg`;
      const { error } = await supabase.storage.from('listing-photos').upload(path, decode(b64), { contentType: 'image/jpeg' });
      if (error) throw error;
      set('logo_url', publicUrl(path));
    });
  };
  const save = () => {
    if (f.name.trim().length < 2) { app.toast('Enter your business name'); return; }
    if (f.phone && (f.phone.length < 6 || f.phone.length > 14)) { app.toast('Enter a valid phone number'); return; }
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) { app.toast('Enter a valid email'); return; }
    a.run(async () => { await q(supabase.from('businesses').update({ name: f.name.trim(), description: f.description || null, phone: f.phone || null, phone_country: f.phone_country, email: f.email || null, website: f.website || null, address: f.address || null, city: f.city || null, country: f.country, delivery_modes: f.delivery_modes, hours: f.hours, logo_url: f.logo_url }).eq('id', b.id)); app.reloadBiz(); app.back(); }, 'Business information saved');
  };
  const pc = countryOf(f.phone_country), list = COUNTRIES.filter(c => !cq || `${c.name}${c.dial}${c.code}`.toLowerCase().includes(cq.toLowerCase()));
  const tfield = (k: string, label: string, extra: any = {}) => <Field label={label} value={(f as any)[k]} onChangeText={(v: string) => set(k, v)} {...extra} />;
  return (
    <>
      <Pg title="Business information" onBack={app.back}>
        <View style={[s.card, s.row]}>
          <Pressable onPress={logo}><View><Avatar text={initials(f.name || 'B')} size={64} radius={18} logo={f.logo_url} /><View style={{ position: 'absolute', right: -6, bottom: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera-outline" size={14} color="#fff" /></View></View></Pressable>
          <View style={s.g}><Text style={s.rt}>Business logo</Text><Text style={s.mut}>Square image, shown on your listings and profile.</Text>{f.logo_url ? <Pressable onPress={() => set('logo_url', null)}><Text style={[s.link, { color: t.bad, marginTop: 4 }]}>Remove</Text></Pressable> : null}</View>
        </View>
        <View style={s.card}>
          {tfield('name', 'Business name *')}
          <Field label="Description" multiline value={f.description} onChangeText={(v: string) => set('description', v)} style={{ height: 90, paddingTop: 12, textAlignVertical: 'top' }} />
          <Text style={s.label}>Phone number</Text>
          <View style={[s.row, { gap: 8 }]}>
            <Pressable onPress={() => setPicker('phone')} style={[s.fld, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}><Text style={{ fontSize: 20 }}>{flagOf(pc.code)}</Text><Text style={{ color: t.ink, fontWeight: '700' }}>+{pc.dial}</Text><Icon name="chevron-down" size={14} color={t.mute} /></Pressable>
            <TextInput style={[s.fld, { flex: 1 }]} keyboardType="phone-pad" value={f.phone} placeholder="Phone number" placeholderTextColor={t.mute} onChangeText={v => set('phone', v.replace(/[^0-9]/g, ''))} />
          </View>
          {tfield('email', 'Business email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
          {tfield('website', 'Website (optional)', { keyboardType: 'url', autoCapitalize: 'none' })}
        </View>
        <View style={s.card}>
          <Text style={s.title}>Location</Text>
          {tfield('address', 'Street address')}{tfield('city', 'City')}
          <Text style={s.label}>Country</Text>
          <Pressable onPress={() => setPicker('country')} style={[s.fld, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}><Text style={{ fontSize: 20 }}>{flagOf(countryOf(f.country).code)}</Text><Text style={{ color: t.ink, flex: 1 }}>{countryOf(f.country).name}</Text><Icon name="chevron-down" size={14} color={t.mute} /></Pressable>
        </View>
        <View style={s.card}><Text style={s.title}>Fulfilment</Text><View style={{ marginTop: 10 }}><Wrap multi items={['Delivery', 'Pickup']} value={f.delivery_modes} onChange={(v: string[]) => set('delivery_modes', v)} /></View></View>
        <View style={s.cardFlat}>
          <View style={[s.row, { paddingTop: 14 }]}><Text style={[s.title, { flex: 1 }]}>Opening hours</Text><Pressable onPress={() => { const m = f.hours.Monday; set('hours', Object.fromEntries(DAYS.map(d => [d, { ...m }]))); }}><Text style={s.link}>Copy Monday to all</Text></Pressable></View>
          <Divided>{DAYS.map(d => { const h = f.hours[d]; const up = (p: any) => set('hours', { ...f.hours, [d]: { ...h, ...p } }); return (
            <View key={d} style={[s.row, { paddingVertical: 9 }]}>
              <Text style={[s.rt, { width: 86 }]}>{d}</Text>
              {h.closed ? <Text style={[s.mut, { flex: 1 }]}>Closed</Text> : <View style={[s.row, { flex: 1, gap: 6 }]}><View style={{ flex: 1 }}><DateField type="time" value={h.open} onChange={(v: string) => up({ open: v })} /></View><Text style={s.mut}>–</Text><View style={{ flex: 1 }}><DateField type="time" value={h.close} onChange={(v: string) => up({ close: v })} /></View></View>}
              <Toggle value={!h.closed} onValueChange={() => up({ closed: !h.closed })} />
            </View>); })}</Divided>
        </View>
        <Btn label="Save changes" busy={a.busy} onPress={save} />
        <Btn kind="danger" label="Delete business" onPress={() => app.sheet('delete')} />
      </Pg>
      {picker ? (
        <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 35, backgroundColor: t.bg, paddingTop: 60 }}>
          <View style={{ paddingHorizontal: 16, gap: 10, flex: 1 }}>
            <View style={s.row}><Text style={[s.h1, { flex: 1, fontSize: 20 }]}>{picker === 'phone' ? 'Country code' : 'Country'}</Text><Pressable onPress={() => { setPicker(null); setCq(''); }}><Icon name="close" size={24} /></Pressable></View>
            <TextInput style={s.fld} value={cq} onChangeText={setCq} placeholder="Search" placeholderTextColor={t.mute} autoFocus />
            <ScrollView keyboardShouldPersistTaps="handled">{list.map(c => <Pressable key={c.code} onPress={() => { set(picker === 'phone' ? 'phone_country' : 'country', c.code); setPicker(null); setCq(''); }} style={[s.ar, s.div]}><Text style={{ fontSize: 22 }}>{flagOf(c.code)}</Text><Text style={[s.rt, { flex: 1 }]}>{c.name}</Text>{picker === 'phone' ? <Text style={s.mut}>+{c.dial}</Text> : null}</Pressable>)}</ScrollView>
          </View>
        </View>
      ) : null}
    </>
  );
}

/* ---------- sheets ---------- */
const APP_URL = (process.env as any).EXPO_PUBLIC_APP_URL ?? 'https://app.wantiss.com';
function ProfileSheet() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz;
  const open = (page: string) => app.go(page);
  const R = (title: string, sub: string | undefined, on: () => void) => <Row title={title} sub={sub} onPress={on} right={<Icon name="chevron-right" size={18} color={t.mute} />} />;
  return (
    <SheetShell title="Profile" onClose={app.closeSheet} tall>
      <View style={[s.row, { paddingBottom: 10 }]}><Avatar text={initials(app.name || app.email)} size={52} radius={17} /><View style={s.g}><Text style={[s.rt, { fontSize: 16 }]}>{app.name || 'Your account'}</Text><Text style={s.mut}>{app.email}</Text></View></View>
      <View style={[s.card, s.row, { padding: 12, marginBottom: 6 }]}><Avatar text={initials(b.name)} size={34} logo={b.logo_url} radius={10} /><View style={s.g}><Text style={s.rt}>{b.name}</Text><Text style={s.mut}>{b.role === 'owner' ? 'Owner' : b.role} · {STATUS_UI[b.verification].label}</Text></View><Btn small kind="soft" label="Switch" onPress={() => app.sheet('switch')} /></View>
      <Divided>
        {R('Business information', 'Name, logo, contact, hours', () => open('businessInfo'))}
        {R('Business registration', 'Optional · earns the Verified badge', () => open('registration'))}
        {R('Manage features', 'Activate, deactivate, add listings', () => app.panel('features', true))}
        {R('Promotions', 'Vouchers and offers', () => open('promotions'))}
        {R('Activity log', 'Every change, recorded', () => open('audit'))}
        {R('Security and privacy', 'Password, 2-step, devices, your data', () => open('security'))}
        {R('Language', app.lang, () => app.sheet('language'))}
        {R('Help and support', undefined, () => open('help'))}
        <Row title="Push notifications" right={<Toggle value={app.pref.push} onValueChange={(v: boolean) => app.setPref({ ...app.pref, push: v })} />} />
        <Row title="Email notifications" sub="Separate from push" right={<Toggle value={app.pref.email} onValueChange={(v: boolean) => app.setPref({ ...app.pref, email: v })} />} />
        <Row title="Dark mode" right={<Toggle value={app.dark} onValueChange={app.setDark} />} />
      </Divided>
      <View style={[s.row, { marginTop: 14 }]}><Btn style={{ flex: 1 }} label="Switch to Buyer" onPress={app.onBuyer} /><Btn style={{ flex: 1 }} kind="soft" label="Sign out" onPress={app.onSignOut} /></View>
    </SheetShell>
  );
}
function SwitchSheet() {
  const app = useApp(), s = useS(), t = useTheme(), full = app.bizList.length >= MAX_BUSINESSES;
  return (
    <SheetShell title="Switch business" onClose={app.closeSheet}>
      <Divided>
        {app.bizList.map(x => <Row key={x.id} onPress={() => app.selectBiz(x.id)} left={<Avatar text={initials(x.name)} size={36} logo={x.logo_url} radius={10} />} title={x.name} sub={STATUS_UI[x.verification].label} right={x.id === app.biz.id ? <Icon name="check" size={20} color={t.blue} /> : null} />)}
        <Row onPress={() => (full ? app.toast(`You can have up to ${MAX_BUSINESSES} businesses`) : app.sheet('addBusiness'))} left={<View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center', opacity: full ? 0.5 : 1 }}><Icon name="plus" size={22} color={t.blue} /></View>} title="Add business" sub={`${app.bizList.length} of ${MAX_BUSINESSES} used`} />
      </Divided>
    </SheetShell>
  );
}
function AddBusinessSheet() {
  const app = useApp(), a = useAct(), [name, setName] = useState('');
  const create = async () => {
    if (app.bizList.length >= MAX_BUSINESSES) { app.toast(`You can have up to ${MAX_BUSINESSES} businesses`); return; }
    const ok = await a.run(async () => { const id = await rpc<string>('create_business', { p_name: name.trim() }); app.reloadBiz(); app.selectBiz(id); }, `${name.trim()} added`);
    if (ok) app.closeSheet();
  };
  return <SheetShell title="Add business" onClose={app.closeSheet}><Field label="Business name" value={name} onChangeText={setName} placeholder="e.g. Marie's Kitchen" autoFocus /><Btn style={{ marginTop: 16 }} label="Create business" disabled={name.trim().length < 2} busy={a.busy} onPress={create} /></SheetShell>;
}
function DeleteBusinessSheet() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), b = app.biz, last = app.bizList.length === 1;
  const chk = useQ(() => rpc<{ blockers: string[] }>('delete_business_check', { p_business: b.id }), [b.id]);
  const [txt, setTxt] = useState('');
  const blockers = chk.d?.blockers ?? [];
  const del = async () => {
    const ok = await a.run(async () => { await rpc('delete_business', { p_business: b.id, p_confirm: txt.trim() }); }, 'Business deleted');
    if (ok) { app.closeSheet(); app.reloadBiz(); if (last) app.onBuyer(); }
  };
  return (
    <SheetShell title="Delete business" onClose={app.closeSheet}>
      {chk.e ? <ErrBox e={chk.e} retry={chk.reload} /> : chk.l && !chk.d ? <Skel h={80} /> : blockers.length ? (
        <View style={{ gap: 8 }}><Text style={s.rt}>Resolve these first</Text>{blockers.map(x => <View key={x} style={[s.row, { alignItems: 'flex-start' }]}><Icon name="alert-circle-outline" size={18} color={t.bad} /><Text style={[s.mut, { flex: 1 }]}>{x}</Text></View>)}</View>
      ) : (
        <View>
          <Text style={s.mut}>{b.name} will be removed, its listings taken down, and its owner access ended. Financial records are kept as the law requires.{last ? ' This is your only business, so you will return to the buyer experience.' : ''}</Text>
          <Field label={`Type "${b.name}" to confirm`} value={txt} onChangeText={setTxt} autoCapitalize="none" />
          <Btn style={{ marginTop: 14 }} kind="danger" label="Delete business" disabled={txt.trim() !== b.name} busy={a.busy} onPress={del} />
        </View>
      )}
    </SheetShell>
  );
}
function LanguageSheet() {
  const app = useApp(), t = useTheme();
  return <SheetShell title="Language" onClose={() => app.sheet('profile')}><Divided>{LANGUAGES.map(l => <Row key={l} onPress={() => { app.setLang(l); app.sheet('profile'); app.toast(`Language set to ${l}`); }} title={l} right={app.lang === l ? <Icon name="check" size={20} color={t.blue} /> : null} />)}</Divided></SheetShell>;
}
function CustomRangeSheet() {
  const app = useApp(), s = useS();
  const [from, setFrom] = useState(app.range.key === 'custom' ? app.range.from : iso(addDays(new Date(), -13))), [to, setTo] = useState(app.range.key === 'custom' ? app.range.to : iso(new Date()));
  const preset = (k: string) => { const t0 = new Date(); if (k === 'm') { setFrom(iso(new Date(t0.getFullYear(), t0.getMonth(), 1))); setTo(iso(t0)); } else if (k === 'lm') { setFrom(iso(new Date(t0.getFullYear(), t0.getMonth() - 1, 1))); setTo(iso(new Date(t0.getFullYear(), t0.getMonth(), 0))); } else if (k === 'y') { setFrom(iso(new Date(t0.getFullYear(), 0, 1))); setTo(iso(t0)); } else { setFrom(iso(addDays(t0, -13))); setTo(iso(t0)); } };
  const apply = () => {
    if (from > to) { app.toast('The start date must be before the end date'); return; }
    if (to > iso(new Date())) { app.toast('The end date cannot be in the future'); return; }
    if ((parseISO(to).getTime() - parseISO(from).getTime()) / 864e5 > 730) { app.toast('Ranges are limited to 2 years'); return; }
    app.setRange(customRange(from, to)); app.closeSheet();
  };
  return (
    <SheetShell title="Custom range" onClose={app.closeSheet}>
      <Chips items={[{ k: 'm', l: 'This month' }, { k: 'lm', l: 'Last month' }, { k: 'y', l: 'Year to date' }, { k: '14', l: 'Last 14 days' }]} value="" onChange={preset} />
      <View style={[s.row, { marginTop: 8, alignItems: 'flex-start' }]}><View style={s.g}><Text style={s.label}>From</Text><DateField type="date" value={from} onChange={setFrom} /></View><View style={s.g}><Text style={s.label}>To</Text><DateField type="date" value={to} onChange={setTo} /></View></View>
      <Btn style={{ marginTop: 16 }} label="Apply range" onPress={apply} />
    </SheetShell>
  );
}
function StockSheet() {
  const app = useApp(), s = useS(), a = useAct(), l = useArg() as any;
  const vars = useQ(() => q<any[]>(supabase.from('listing_variants').select('id,name,value,stock').eq('listing_id', l.id)), [l.id]);
  const [target, setTarget] = useState(''), [delta, setDelta] = useState(''), [reason, setReason] = useState('Restock');
  const cur = target ? vars.d?.find(v => v.id === target)?.stock : l.stock, d = parseInt(delta, 10);
  return (
    <SheetShell title="Adjust stock" onClose={app.closeSheet}>
      <Text style={s.rt}>{l.title}</Text>
      {(vars.d ?? []).length ? <View style={{ marginTop: 10 }}><Wrap items={[{ id: '', n: 'Whole item' }, ...(vars.d ?? []).map(v => ({ id: v.id, n: `${v.name}: ${v.value}` }))].map(x => x.n)} value={target ? (vars.d ?? []).filter(v => v.id === target).map(v => `${v.name}: ${v.value}`)[0] : 'Whole item'} onChange={(n: string) => { const v = (vars.d ?? []).find(x => `${x.name}: ${x.value}` === n); setTarget(v ? v.id : ''); }} /></View> : null}
      <Text style={[s.mut, { marginTop: 10 }]}>{cur == null ? 'Stock is not tracked for this item.' : `In stock now: ${cur}`}</Text>
      <Field label="Change (use a minus to remove)" keyboardType="numbers-and-punctuation" value={delta} onChangeText={setDelta} />
      <Text style={s.label}>Reason</Text><Wrap items={['Restock', 'Count correction', 'Damaged or lost', 'Returned to stock', 'Sold elsewhere']} value={reason} onChange={setReason} />
      <Btn style={{ marginTop: 16 }} label="Save adjustment" busy={a.busy} disabled={cur == null || !d || cur + d < 0} onPress={async () => { if (await a.run(() => rpc('adjust_stock', { p_listing: l.id, p_variant: target || null, p_delta: d, p_reason: reason }), 'Stock updated')) app.closeSheet(); }} />
    </SheetShell>
  );
}
function RefundSheet() {
  const app = useApp(), s = useS(), a = useAct(), o = useArg() as any, max = Number(o.amount) - Number(o.refunded), key = useRef(uuid()), [amt, setAmt] = useState(max.toFixed(2));
  const v = parseFloat(amt);
  return (
    <SheetShell title={`Refund ${o.customer_name ?? 'order'}`} onClose={app.closeSheet}>
      <Text style={s.mut}>Up to {money(max)}. The platform fee is returned in proportion.</Text>
      <Field keyboardType="decimal-pad" value={amt} onChangeText={setAmt} />
      <Btn style={{ marginTop: 16 }} label="Confirm refund" busy={a.busy} disabled={!(v > 0) || v > max} onPress={async () => { if (await a.run(() => rpc('refund_order', { p_order: o.id, p_amount: v, p_key: key.current }), 'Refund issued')) app.closeSheet(); }} />
    </SheetShell>
  );
}
function PromoSheet() {
  const app = useApp(), s = useS(), a = useAct(), fk = app.meta.feats.map(f => f.feature), [title, setTitle] = useState(''), [feat, setFeat] = useState(fk[0] ?? ''), [d, setD] = useState('10');
  return (
    <SheetShell title="Create promotion" onClose={app.closeSheet}>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Text style={s.label}>Feature</Text><Wrap items={fk.map(k => FX.FM[k]?.name)} value={FX.FM[feat]?.name} onChange={(n: string) => setFeat(fk.find(k => FX.FM[k]?.name === n) ?? feat)} />
      <Field label="Discount %" keyboardType="number-pad" value={d} onChangeText={setD} />
      <Btn style={{ marginTop: 16 }} label="Submit for review" busy={a.busy} disabled={title.trim().length < 3 || !feat || !(+d > 0 && +d <= 90)} onPress={async () => { if (await a.run(async () => { await q(supabase.from('promotions').insert({ business_id: app.biz.id, funded_by: 'vendor', status: 'in_review', feature: feat, title: title.trim(), discount_text: `${d}% off` })); }, 'Submitted for review')) app.closeSheet(); }} />
    </SheetShell>
  );
}
function PayoutSetupSheet() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct(), p = app.meta.payout;
  const start = () => a.run(async () => {
    const { data, error } = await supabase.functions.invoke('payout-onboarding', { body: { business_id: app.biz.id, return_url: `${APP_URL}/business/payouts` } });
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error ?? 'Could not start payout setup');
    await WebBrowser.openBrowserAsync(data.url);
    app.bump();
  });
  return (
    <SheetShell title="Set up payouts" onClose={app.closeSheet}>
      {app.biz.verification === 'restricted' ? <Text style={s.mut}>Payouts are paused while your business is restricted.</Text>
        : p?.status === 'verified' ? <View style={{ gap: 12 }}><View style={s.card}><Text style={s.rt}>Bank account ending {p.last4}</Text><Text style={s.mut}>Verified by our payment partner</Text></View><Btn kind="soft" label="Change payout method" busy={a.busy} onPress={start} /></View>
          : p ? <View style={{ gap: 12 }}><View style={{ backgroundColor: t.soft, borderRadius: 12, padding: 12 }}><Text style={{ color: t.blue, fontWeight: '600' }}>Our payment partner is verifying your details.</Text></View><Btn kind="soft" label="Continue setup" busy={a.busy} onPress={start} /></View>
            : <View style={{ gap: 12 }}><Text style={s.mut}>You finish on our payment partner's secure page. Wantiss never sees or stores your bank details.</Text><Btn label="Continue to secure setup" busy={a.busy} onPress={start} /></View>}
    </SheetShell>
  );
}
function PayoutRequestSheet() {
  const app = useApp(), s = useS(), t = useTheme(), b = app.biz, rules = app.meta.rules, payOK = app.meta.payout?.status === 'verified', min = app.meta.minWithdrawal;
  const sum = useQ(() => rpc<any>('dashboard_range', { p_business: b.id, p_from: app.range.from, p_to: app.range.to, p_feature: null }), [b.id]);
  const usage = useQ(() => rpc<Record<string, number>>('payout_usage', { p_business: b.id }), [b.id]);
  const avail = Number(sum.d?.available ?? 0);
  const [m, setM] = useState(payOK ? 'std' : 'wal'), [amt, setAmt] = useState(''), [busy, setBusy] = useState(false), [note, setNote] = useState(''), key = useRef(uuid());
  useEffect(() => { if (sum.d && !amt) setAmt(Number(sum.d.available ?? 0).toFixed(2)); }, [sum.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const rule = rules.find(r => r.method === m) ?? rules[0], used = Number(usage.d?.[m] ?? 0), left = rule.cap ? rule.cap - used : Infinity, v = parseFloat(amt), fee = rule.fee && v > 0 ? Math.round(v * rule.fee * 100) / 100 : 0;
  const err = rule.needs_bank && !payOK ? 'Set up a payout method first' : !(v >= min) ? `Minimum withdrawal is ${money(min)}` : v > avail ? 'Above your available balance' : v > left ? `Above your limit. You can withdraw ${money(Math.max(0, left))} more` : '';
  const info = (r: PayRule) => [r.cap ? `Up to ${money(r.cap).replace('.00', '')}${r.window_days === 7 ? ' every 7 days' : ' per day'} · ${money(Math.max(0, r.cap - Number(usage.d?.[r.method] ?? 0))).replace('.00', '')} left` : 'No limit', r.eta, r.fee ? `${(r.fee * 100).toFixed(1).replace('.0', '')}% fee` : ''].filter(Boolean).join(' · ');
  const send = async () => {
    if (err || busy) { if (err) app.toast(err); return; }
    setBusy(true); setNote('');
    try { await rpc('request_payout', { b: b.id, amt: v, key: key.current, method: m }); app.closeSheet(); app.toast(m === 'wal' ? 'Sent to your Wantiss wallet' : 'Payout requested'); app.bump(); }
    catch (e) { const x = errText(e); setNote(/fetch|network|timeout/i.test(x) ? 'The request may not have finished. Check payout history. Retrying is safe and will not pay twice.' : x); setBusy(false); }
  };
  return (
    <SheetShell title="Request payout" onClose={app.closeSheet} tall>
      <Text style={s.mut}>Available {money(avail)}. Pending funds cannot be withdrawn.</Text>
      <Text style={s.label}>Send to</Text>
      <Divided>{rules.map(r => { const dis = r.needs_bank && !payOK; return <Row key={r.method} onPress={() => (dis ? app.toast('Set up a payout method first') : setM(r.method))} title={r.name} sub={info(r)} right={<View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: m === r.method ? t.blue : t.line, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.4 : 1 }}>{m === r.method ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.blue }} /> : null}</View>} />; })}</Divided>
      <Field label="Amount" keyboardType="decimal-pad" value={amt} onChangeText={setAmt} />
      <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '600', color: err ? t.badFg : t.mute }}>{err || (v > 0 ? `You receive ${money(v - fee)}${fee ? ` after a ${money(fee)} fee` : ''}${rule.eta ? ` · ${rule.eta}` : ''}` : '')}</Text>
      {note ? <Text style={{ color: t.badFg, fontSize: 12, marginTop: 6 }}>{note}</Text> : null}
      <Btn style={{ marginTop: 14 }} label={`Confirm payout${v > 0 ? ` of ${money(v)}` : ''}`} busy={busy} disabled={!!err} onPress={send} />
    </SheetShell>
  );
}
function PasswordSheet() {
  const app = useApp(), a = useAct(), [pw, setPw] = useState(''), [pw2, setPw2] = useState('');
  const bad = pw.length < 8 ? 'Use at least 8 characters' : pw !== pw2 ? 'Passwords do not match' : '';
  return (
    <SheetShell title="Change password" onClose={() => app.closeSheet()}>
      <Field label="New password" secureTextEntry value={pw} onChangeText={setPw} autoCapitalize="none" /><Field label="Confirm new password" secureTextEntry value={pw2} onChangeText={setPw2} autoCapitalize="none" />
      {pw && bad ? <Text style={{ color: LIGHT.badFg, fontSize: 12, marginTop: 6 }}>{bad}</Text> : null}
      <Btn style={{ marginTop: 16 }} label="Update password" busy={a.busy} disabled={!!bad} onPress={async () => { if (await a.run(async () => { const { error } = await supabase.auth.updateUser({ password: pw }); if (error) throw error; }, 'Password updated')) app.closeSheet(); }} />
    </SheetShell>
  );
}
function MfaSheet() {
  const app = useApp(), s = useS(), t = useTheme(), a = useAct();
  const [f, setF] = useState<any>(null), [code, setCode] = useState(''), [err, setErr] = useState('');
  useEffect(() => { (async () => { const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' }); if (error) setErr(error.message); else setF(data); })(); }, []);
  const xml = f?.totp?.qr_code ? (String(f.totp.qr_code).startsWith('data:') ? decodeURIComponent(String(f.totp.qr_code).split(',')[1]) : f.totp.qr_code) : null;
  const verify = () => a.run(async () => {
    const ch = await supabase.auth.mfa.challenge({ factorId: f.id }); if (ch.error) throw ch.error;
    const v = await supabase.auth.mfa.verify({ factorId: f.id, challengeId: ch.data.id, code }); if (v.error) throw v.error;
  }, 'Two-step verification on').then(ok => { if (ok) app.closeSheet(); });
  return (
    <SheetShell title="Two-step verification" onClose={app.closeSheet}>
      {err ? <Text style={{ color: t.badFg }}>{err}</Text> : !f ? <Skel h={160} /> : (
        <View style={{ gap: 10, alignItems: 'center' }}>
          <Text style={[s.mut, { alignSelf: 'flex-start' }]}>Scan with an authenticator app, or enter the key.</Text>
          {xml ? <SvgXml xml={xml} width={170} height={170} /> : null}
          <Text selectable style={{ color: t.ink, fontWeight: '700', letterSpacing: 1 }}>{f.totp.secret}</Text>
          <Field style={{ width: 200, textAlign: 'center', letterSpacing: 4 }} keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} placeholder="6-digit code" />
          <Btn style={{ alignSelf: 'stretch' }} label="Turn on" busy={a.busy} disabled={code.length !== 6} onPress={verify} />
        </View>
      )}
    </SheetShell>
  );
}
function SheetHost({ sheet }: { sheet: { name: string; arg?: any } | null }) {
  if (!sheet) return null;
  const map: Record<string, React.ReactNode> = { profile: <ProfileSheet />, switch: <SwitchSheet />, addBusiness: <AddBusinessSheet />, delete: <DeleteBusinessSheet />, language: <LanguageSheet />, custom: <CustomRangeSheet />, stock: <StockSheet />, refund: <RefundSheet />, promo: <PromoSheet />, payout: <PayoutSetupSheet />, request: <PayoutRequestSheet />, password: <PasswordSheet />, mfa: <MfaSheet /> };
  return <ArgCtx.Provider value={sheet.arg}>{map[sheet.name] ?? null}</ArgCtx.Provider>;
}

/* ---------- notifications handler (foreground) ---------- */
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false } as any) });

const BIZ_COLS = 'id,name,logo_url,verification,payout_ready,is_live,description,phone,phone_country,email,address,city,country,website,hours,delivery_modes,deleted_at';
const PAGES: Record<string, () => React.ReactElement> = {
  feature: FeaturePage, explore: ExplorePage, charts: ChartsPage, actions: ActionsPage, activity: ActivityPage, messages: MessagesPage, conversation: ConversationPage,
  notifications: NotificationsPage, search: SearchPage, promotions: PromotionsPage, registration: RegistrationPage, audit: AuditPage, help: HelpPage, security: SecurityPage, businessInfo: BusinessInfoPage,
};
const TABS: [string, string, string | null][] = [['Overview', 'view-dashboard-outline', null], ['Features', 'apps', 'features'], ['Orders', 'clipboard-list-outline', 'orders'], ['Listings', 'format-list-bulleted', 'listings'], ['Payouts', 'bank-transfer-out', 'payouts']];

export default function BusinessSpaceScreen({ onSignOut, onSwitchToBuyer }: { onSignOut: () => void; onSwitchToBuyer: () => void }) {
  const scheme = useColorScheme();
  const [dark, setDarkS] = useState(scheme === 'dark');
  useEffect(() => { AsyncStorage.getItem('bs.dark').then(v => { if (v != null) setDarkS(v === '1'); }).catch(() => undefined); }, []);
  const setDark = (d: boolean) => { setDarkS(d); AsyncStorage.setItem('bs.dark', d ? '1' : '0').catch(() => undefined); };
  return (
    <SafeAreaProvider>
      <ThemeCtx.Provider value={dark ? DARK : LIGHT}>
        <Gate dark={dark} setDark={setDark} onSignOut={onSignOut} onBuyer={onSwitchToBuyer} />
      </ThemeCtx.Provider>
    </SafeAreaProvider>
  );
}

/** Loads the signed-in user and their businesses, then hands over to the workspace. */
function Gate({ dark, setDark, onSignOut, onBuyer }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets();
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null), [uerr, setUerr] = useState<string | null>(null), [tick, setTick] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw error ?? new Error('Your session has expired. Please sign in again.');
        const p = await supabase.from('profiles').select('full_name,language').eq('id', data.user.id).maybeSingle();
        setUser({ id: data.user.id, email: data.user.email ?? '', name: p.data?.full_name ?? (data.user.user_metadata as any)?.full_name ?? (data.user.email ?? '').split('@')[0] });
      } catch (e) { setUerr(errText(e)); }
    })();
  }, []);
  const mem = useQ(async () => {
    if (!user) return [] as Biz[];
    const rows = await q<any[]>(supabase.from('business_members').select(`role,businesses(${BIZ_COLS})`).eq('user_id', user.id));
    return rows.filter(r => r.businesses && !r.businesses.deleted_at).map(r => ({ ...r.businesses, role: r.role })) as Biz[];
  }, [user?.id, tick]);
  const reloadBiz = useCallback(() => setTick(x => x + 1), []);
  if (uerr) return <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: ins.top + 40 }}><ErrBox e={uerr} retry={onSignOut} /></View>;
  if (!user || (mem.l && !mem.d)) return <View style={{ flex: 1, backgroundColor: t.bg, padding: 16, paddingTop: ins.top + 20, gap: 12 }}><Skel h={56} /><Skel h={90} /><Skel h={300} /></View>;
  if (mem.e && !mem.d) return <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: ins.top + 40 }}><ErrBox e={mem.e} retry={mem.reload} /></View>;
  const list = mem.d ?? [];
  if (!list.length) return <FirstBusiness user={user} onCreated={reloadBiz} onBuyer={onBuyer} />;
  return <Workspace user={user} bizList={list} reloadBiz={reloadBiz} dark={dark} setDark={setDark} onSignOut={onSignOut} onBuyer={onBuyer} />;
}
function FirstBusiness({ user, onCreated, onBuyer }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets(), a = useAct0();
  const [name, setName] = useState('');
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: 22, paddingTop: ins.top + 40, gap: 10 }}>
      <Text style={s.h1}>Start selling on Wantiss</Text>
      <Text style={s.mut}>You keep your buyer account. Create a business to open your Business Space.</Text>
      <Field label="Business name" value={name} onChangeText={setName} placeholder="e.g. Marie's Boutique" />
      <Btn label="Create business" disabled={name.trim().length < 2} busy={a.busy} onPress={() => a.run(async () => { await rpc('create_business', { p_name: name.trim() }); onCreated(); })} />
      <Btn kind="soft" label="Back to buyer" onPress={onBuyer} />
    </View>
  );
}
/** Same as useAct but usable before the app context exists. */
function useAct0() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { Alert.alert('Something went wrong', errText(e)); } finally { setBusy(false); } };
  return { busy, run };
}

/** Everything that needs an active business. */
function Workspace({ user, bizList, reloadBiz, dark, setDark, onSignOut, onBuyer }: any) {
  const t = useTheme(), ins = useSafeAreaInsets(), s = useS();
  const [bizId, setBizId] = useState<string>(''), [tick, setTick] = useState(0), [range, setRange] = useState<Range>(presetRange('30D'));
  const [stack, setStack] = useState<{ page: string; arg?: any; fromProfile?: boolean }[]>([]);
  const [panel, setPanel] = useState<{ name: string; fromProfile?: boolean } | null>(null), [sheet, setSheet] = useState<{ name: string; arg?: any } | null>(null), [wiz, setWiz] = useState<{ feature: string; id?: string | null } | null>(null);
  const [toastT, setToastT] = useState<string | null>(null), [regDismissed, setRegDismissed] = useState(false), [pref, setPrefS] = useState({ push: true, email: false }), [lang, setLangS] = useState('English');
  const toastTimer = useRef<any>(null), bgAt = useRef(0);
  useEffect(() => { AsyncStorage.getItem('bs.biz').then(v => { if (v) setBizId(v); }).catch(() => undefined); AsyncStorage.getItem('bs.lang').then(v => { if (v) setLangS(v); }).catch(() => undefined); }, []);
  const biz: Biz = bizList.find((b: Biz) => b.id === bizId) ?? bizList[0];
  const bump = useCallback(() => setTick(x => x + 1), []);
  const toast = useCallback((m: string) => { setToastT(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastT(null), 2600); }, []);

  /* the registration reminder returns whenever the app is opened again */
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st === 'background' || st === 'inactive') bgAt.current = bgAt.current || Date.now(); else if (st === 'active') { if (bgAt.current && Date.now() - bgAt.current > 20000) setRegDismissed(false); bgAt.current = 0; } });
    return () => sub.remove();
  }, []);

  const meta = useQ<Meta>(async () => {
    const [feats, lc, un, cv, pm, rules] = await Promise.all([
      q<any[]>(supabase.from('business_features').select('feature,status').eq('business_id', biz.id)),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('business_id', biz.id).neq('status', 'archived'),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('business_id', biz.id).is('read_at', null),
      q<any[]>(supabase.from('conversations').select('unread_business').eq('business_id', biz.id)),
      supabase.from('payout_methods').select('status,last4').eq('business_id', biz.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('payout_rules').select('*').order('sort'),
    ]);
    const rr: any[] = rules.data ?? [];
    return {
      feats: feats.filter(f => FX.FM[f.feature]), listings: lc.count ?? 0, unreadN: un.count ?? 0, unreadM: cv.reduce((a, c) => a + (c.unread_business ?? 0), 0),
      payout: pm.data ? { status: pm.data.status, last4: pm.data.last4 } : null,
      rules: rr.length ? rr.map(r => ({ method: r.method, name: r.name, cap: Number(r.cap), window_days: r.window_days, fee: Number(r.fee), eta: r.eta ?? '', needs_bank: r.needs_bank })) : DEFAULT_RULES,
      minWithdrawal: rr.length ? Number(rr[0].min_withdrawal ?? 5) : 5,
    };
  }, [biz.id, tick]);
  const m: Meta = meta.d ?? { feats: [], listings: 0, unreadN: 0, unreadM: 0, payout: null, rules: DEFAULT_RULES, minWithdrawal: 5 };

  /* realtime: any change to this business refreshes the screen */
  useEffect(() => {
    let h: any;
    const ch = supabase.channel(`bs-${biz.id}`), kick = () => { clearTimeout(h); h = setTimeout(bump, 400); };
    ['wallet_ledger', 'feature_orders', 'notifications', 'business_activity', 'listings', 'conversations', 'payout_methods'].forEach(tb => ch.on('postgres_changes' as any, { event: '*', schema: 'public', table: tb, filter: `business_id=eq.${biz.id}` }, kick));
    ch.on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, kick);
    ch.subscribe();
    return () => { clearTimeout(h); supabase.removeChannel(ch); };
  }, [biz.id, bump]);

  /* preferences, push token, deep links */
  useEffect(() => { supabase.from('notification_prefs').select('push,email').eq('user_id', user.id).maybeSingle().then(r => { if (r.data) setPrefS(r.data as any); }); }, [user.id]);
  const nav = { go: (page: string, arg?: any) => { setStack(st => [...st, { page, arg, fromProfile: sheet?.name === 'profile' }]); setPanel(null); setSheet(null); } };
  useEffect(() => {
    if (!pref.push || !Device.isDevice) return;
    (async () => {
      try {
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
        if (status !== 'granted') return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
      } catch { /* push is optional */ }
    })();
  }, [pref.push]);
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      const d: any = r.notification.request.content.data ?? {};
      if (d.feature) nav.go('feature', { k: d.feature, focus: d.order }); else if (d.page) nav.go(d.page);
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handle = (url: string | null) => { if (url && url.includes('/business/payouts')) { WebBrowser.dismissBrowser(); bump(); setPanel({ name: 'payouts' }); } };
    Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener('url', e => handle(e.url));
    return () => sub.remove();
  }, [bump]);

  const back = useCallback(() => {
    setStack(st => { const x = st[st.length - 1]; if (x?.fromProfile) setSheet({ name: 'profile' }); return st.slice(0, -1); });
  }, []);
  const closePanel = useCallback(() => { setPanel(p => { if (p?.fromProfile) setSheet({ name: 'profile' }); return null; }); }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (wiz) return false;
      if (sheet) { setSheet(null); return true; }
      if (panel) { closePanel(); return true; }
      if (stack.length) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [wiz, sheet, panel, stack.length, back, closePanel]);

  const app: App = {
    biz, bizList, meta: m, userId: user.id, email: user.email, name: user.name, tick, bump, toast,
    go: nav.go, back, tab: p => { setStack([]); setSheet(null); setPanel(p ? { name: p } : null); },
    sheet: (name, arg) => setSheet({ name, arg }), closeSheet: () => setSheet(null),
    panel: (p, fromProfile) => { setSheet(null); setPanel(p ? { name: p, fromProfile } : null); },
    wizard: (feature, id) => { setWiz({ feature, id }); },
    range, setRange: r => setRange(r),
    selectBiz: id => { setBizId(id); AsyncStorage.setItem('bs.biz', id).catch(() => undefined); setStack([]); setPanel(null); setSheet(null); bump(); },
    reloadBiz, onBuyer, onSignOut, dark, setDark, lang, setLang: l => { setLangS(l); AsyncStorage.setItem('bs.lang', l).catch(() => undefined); supabase.from('profiles').upsert({ id: user.id, language: l }).then(() => undefined); },
    pref, setPref: p => { setPrefS(p); supabase.from('notification_prefs').upsert({ user_id: user.id, ...p }).then(r => { if (r.error) toast(r.error.message); }); },
    regDismissed, dismissReg: () => setRegDismissed(true),
  };

  const top = stack[stack.length - 1], Page = top ? PAGES[top.page] : null;
  const overlay = !!(top || panel || sheet || wiz);
  const panelTitle = panel ? panel.name[0].toUpperCase() + panel.name.slice(1) : '';
  return (
    <AppCtx.Provider value={app}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Home />
        <View style={{ position: 'absolute', bottom: ins.bottom + 12, left: 12, right: 12, minHeight: 66, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, elevation: 6, shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, zIndex: 10 }}>
          {TABS.map(([label, icon, key]) => { const on = (panel?.name ?? null) === key && !top; return (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => app.tab(key)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 }}>
              <MaterialCommunityIcons name={icon as any} size={22} color={on ? t.blue : t.mute} /><Text style={{ fontSize: 10, fontWeight: '700', color: on ? t.blue : t.mute }}>{label}</Text>
            </Pressable>); })}
        </View>
        {!overlay ? <SearchHandle onOpen={() => app.go('search')} /> : null}
        {Page ? <ArgCtx.Provider key={`${top!.page}:${stack.length}`} value={top!.arg}><Page /></ArgCtx.Provider> : null}
        {panel ? (
          <PanelSheet title={panelTitle} onClose={closePanel}>
            {panel.name === 'features' ? <FeaturesPanel /> : panel.name === 'orders' ? <OrdersPanel /> : panel.name === 'listings' ? <ListingsPanel /> : <PayoutsPanel />}
          </PanelSheet>
        ) : null}
        <SheetHost sheet={sheet} />
        {wiz ? <ListingWizard biz={biz} feature={wiz.feature} listingId={wiz.id} onToast={toast} onClose={() => { setWiz(null); bump(); }} onDone={(msg: string) => { setWiz(null); toast(msg); bump(); }} /> : null}
        {toastT ? <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: ins.bottom + 96, backgroundColor: t.ink, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, zIndex: 60 }}><Text style={{ color: t.bg, fontWeight: '600' }}>{toastT}</Text></View> : null}
      </View>
    </AppCtx.Provider>
  );
}
