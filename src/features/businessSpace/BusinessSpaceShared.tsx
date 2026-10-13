import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G, Line, Polyline, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

/* =====================================================================
   Wantiss Business Space
   Single-file React Native (Expo) screen. Backend: Supabase (migrations 001-005).
   ===================================================================== */

// Every feature has its own status lifecycle and its own listing form. Nothing is shared except the engine that renders them.
// The same lifecycles are seeded in SQL (status_transitions) so the backend enforces them, not just this UI.

export type V = Record<string, any>;
export type FType = 'text' | 'area' | 'num' | 'money' | 'sel' | 'chips' | 'bool' | 'date' | 'dt' | 'time' | 'photos' | 'file' | 'rows' | 'cat' | 'cal';
export interface Fld {
  k: string; l: string; t: FType;
  req?: boolean; must?: boolean;            // must: boolean that has to be true (consents)
  opts?: string[]; min?: number; max?: number; def?: any;
  help?: string; ph?: string; priv?: boolean; accept?: string;
  sub?: Fld[]; tree?: Record<string, string[]>;
  when?: (v: V) => boolean;
}
export interface Step { t: string; f: Fld[] }
export interface Feature {
  key: string; name: string; emoji: string; color: string; noun: string; add: string;
  flow: string[];                       // order/booking lifecycle; the last entry is terminal
  approval?: boolean;                   // listings are reviewed by Wantiss before going live
  autoTitle?: (v: V) => string;         // when set, there is no title field
  steps: Step[];
  check?: (v: V) => Record<string, string>;   // cross-field rules
}


/* ---------- vendor feature registry: lifecycles and listing forms ---------- */
export const FX = (() => {
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
    check: (v): Record<string, string> => (v.compare && v.price && Number(v.compare) <= Number(v.price) ? { compare: 'Compare-at price must be higher than the price' } : {}),
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
    check: (v): Record<string, string> => (v.maxNights && v.minNights && Number(v.maxNights) < Number(v.minNights) ? { maxNights: 'Must be at least the minimum nights' } : {}),
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
    check: (v): Record<string, string> => (after(v.start, v.end) ? { end: 'Event must end after it starts' } : {}),
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
    check: (v): Record<string, string> => (v.drawAt && new Date(v.drawAt).getTime() < Date.now() ? { drawAt: 'Draw date must be in the future' } : {}),
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

return { FEATURES, FM, TOPUP_NOTE, PLATFORM_MANAGED, FUI, visible, defaults, titleOf, empty, validate };
})();
export const FM = FX.FM;
export const TOPUP_NOTE = FX.TOPUP_NOTE;
export const PLATFORM_MANAGED = FX.PLATFORM_MANAGED;
export const FUI = FX.FUI;
export const visible = FX.visible;
export const defaults = FX.defaults;
export const titleOf = FX.titleOf;
export const empty = FX.empty;
export const validate = FX.validate;


/* ---------- theme ---------- */
export const LIGHT = { blue: '#2D5BFF', ink: '#182033', mute: '#6F7890', line: '#E8ECF5', bg: '#F5F7FC', card: '#FFFFFF', soft: '#EEF1FF', chip: '#F3F5FA', good: '#16794B', goodBg: '#E3F7EC', warn: '#96650B', warnBg: '#FFF2D7', bad: '#C65D2E', badBg: '#FDE3E3', badFg: '#B3261E', ref: '#FFF0E8', scrim: 'rgba(15,23,42,0.35)' };
export const DARK: typeof LIGHT = { blue: '#4C73FF', ink: '#EEF1FA', mute: '#98A2BD', line: '#2A3350', bg: '#0E1424', card: '#171F36', soft: '#202B4F', chip: '#202944', good: '#5BD39B', goodBg: '#123524', warn: '#F0BE5A', warnBg: '#3A2D12', bad: '#F08A5A', badBg: '#3A1A1A', badFg: '#F08A80', ref: '#3A2418', scrim: 'rgba(0,0,0,0.55)' };
export type Theme = typeof LIGHT;
export const ThemeCtx = createContext<Theme>(LIGHT);
export const useTheme = () => useContext(ThemeCtx);

export function useS() {
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
export const money = (v: unknown, cur = 'USD') => {
  const n = Number(v ?? 0), x = Number.isFinite(n) ? n : 0;
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(x); } catch { return `$${x.toFixed(2)}`; }
};
export const short = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`);
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseISO = (s: string) => new Date(`${s}T00:00:00`);
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const fmtDay = (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
export const ago = (v: string) => { const s = (Date.now() - new Date(v).getTime()) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} hr ago` : `${Math.floor(s / 86400)}d ago`; };
export const dayHead = (v: string) => { const d = new Date(v), n = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }); };
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
export const errText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e ?? 'Something went wrong'));
export const displayText = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const x = v as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    if (typeof x.message === 'string' && x.message) return x.message;
    try { return JSON.stringify(v); } catch { return 'Something went wrong'; }
  }
  return String(v);
};
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
export const uuid = () => (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/* ---------- types ---------- */
export type Status = 'setup' | 'pending' | 'action' | 'restricted' | 'verified';
export interface Biz { id: string; name: string; logo_url: string | null; verification: Status; payout_ready: boolean; is_live: boolean; role: string; description?: string | null; phone?: string | null; phone_country?: string | null; email?: string | null; address?: string | null; city?: string | null; country?: string | null; website?: string | null; hours?: Record<string, { open: string; close: string; closed: boolean }> | null; delivery_modes?: string[] | null }
export interface PayRule { method: string; name: string; cap: number; window_days: number; fee: number; eta: string; needs_bank: boolean }
export interface Meta { feats: { feature: string; status: string }[]; listings: number; unreadN: number; unreadM: number; payout: { status: string; last4: string | null } | null; rules: PayRule[]; minWithdrawal: number }
export interface Range { key: string; from: string; to: string; label: string; days: number }
export const STATUS_UI: Record<Status, { label: string; tone: 'good' | 'warn' | 'bad' | 'mute' }> = { verified: { label: 'Verified', tone: 'good' }, pending: { label: 'In review', tone: 'warn' }, action: { label: 'Action required', tone: 'bad' }, restricted: { label: 'Restricted', tone: 'bad' }, setup: { label: 'Not registered', tone: 'mute' } };
export const MAX_BUSINESSES = 5;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const defaultHours = () => Object.fromEntries(DAYS.map((d, i) => [d, { open: '09:00', close: i > 4 ? '15:00' : '18:00', closed: i === 6 }]));
export const DEFAULT_RULES: PayRule[] = [
  { method: 'std', name: 'Standard bank payout', cap: 100000, window_days: 7, fee: 0, eta: 'Arrives within 14 days', needs_bank: true },
  { method: 'exp', name: 'Express bank payout', cap: 3000000, window_days: 1, fee: 0.035, eta: 'Same day', needs_bank: true },
  { method: 'card', name: 'Debit card', cap: 10000, window_days: 1, fee: 0, eta: '', needs_bank: true },
  { method: 'wal', name: 'Wantiss wallet', cap: 0, window_days: 0, fee: 0, eta: '', needs_bank: false },
];
export const LANGUAGES = ['English', 'Français', 'Español', 'Português', 'العربية', 'Kiswahili', 'Hausa', 'Yorùbá'];
export const COUNTRIES = ("NG|Nigeria|234;GH|Ghana|233;KE|Kenya|254;ZA|South Africa|27;EG|Egypt|20;MA|Morocco|212;TZ|Tanzania|255;UG|Uganda|256;ET|Ethiopia|251;SN|Senegal|221;CI|Côte d'Ivoire|225;CM|Cameroon|237;DZ|Algeria|213;TN|Tunisia|216;RW|Rwanda|250;ZM|Zambia|260;ZW|Zimbabwe|263;AO|Angola|244;MZ|Mozambique|258;BW|Botswana|267;NA|Namibia|264;US|United States|1;CA|Canada|1;GB|United Kingdom|44;IE|Ireland|353;FR|France|33;DE|Germany|49;ES|Spain|34;PT|Portugal|351;IT|Italy|39;NL|Netherlands|31;BE|Belgium|32;CH|Switzerland|41;SE|Sweden|46;NO|Norway|47;DK|Denmark|45;PL|Poland|48;TR|Türkiye|90;AE|United Arab Emirates|971;SA|Saudi Arabia|966;QA|Qatar|974;KW|Kuwait|965;IL|Israel|972;IN|India|91;PK|Pakistan|92;BD|Bangladesh|880;LK|Sri Lanka|94;CN|China|86;JP|Japan|81;KR|South Korea|82;SG|Singapore|65;MY|Malaysia|60;ID|Indonesia|62;PH|Philippines|63;TH|Thailand|66;VN|Vietnam|84;AU|Australia|61;NZ|New Zealand|64;BR|Brazil|55;MX|Mexico|52;AR|Argentina|54;CO|Colombia|57;CL|Chile|56;PE|Peru|51;JM|Jamaica|1876;TT|Trinidad and Tobago|1868")
  .split(';').map(x => { const p = x.split('|'); return { code: p[0], name: p[1], dial: p[2] }; });
export const flagOf = (c: string) => c.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
export const countryOf = (c?: string | null) => COUNTRIES.find(x => x.code === c) ?? COUNTRIES[0];

/* ---------- ranges ---------- */
export const rangeLabel = (from: string, to: string) => `${fmtDay(parseISO(from))} – ${fmtDay(parseISO(to))}`;
export function presetRange(key: string): Range {
  const days = key === '7D' ? 7 : key === '30D' ? 30 : key === '90D' ? 90 : 365, to = new Date(), from = addDays(to, -(days - 1));
  return { key, from: iso(from), to: iso(to), days, label: key === '7D' ? 'Last 7 days' : key === '30D' ? 'Last 30 days' : key === '90D' ? 'Last 90 days' : 'Last year' };
}
export function customRange(from: string, to: string): Range { return { key: 'custom', from, to, days: Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 864e5) + 1, label: rangeLabel(from, to) }; }

/* ---------- data layer ---------- */
export async function q<T = any>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T> { const { data, error } = await p; if (error) throw error; return data as T; }
export const rpc = <T = any,>(fn: string, args: Record<string, unknown>) => q<T>(supabase.rpc(fn, args) as any);
export function useQ<T>(fn: () => Promise<T>, deps: unknown[]) {
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
export const publicUrl = (path: string) => supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;

/* ---------- app context ---------- */
export interface App {
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
export const AppCtx = createContext<App>(null as unknown as App);
export const useApp = () => useContext(AppCtx);
export const ArgCtx = createContext<any>(undefined);
export const useArg = () => useContext(ArgCtx);

/** Runs a server action once at a time and reports the result. */
export function useAct() {
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
export function Icon({ name, size = 22, color }: any) { const t = useTheme(); return <MaterialCommunityIcons name={name} size={size} color={color ?? t.ink} />; }
export function Btn({ label, onPress, kind = 'primary', disabled, busy, small, style }: any) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.blue : kind === 'danger' ? t.badBg : t.chip, fg = kind === 'primary' ? '#fff' : kind === 'danger' ? t.badFg : t.ink;
  return (
    <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={[{ minHeight: small ? 34 : 50, paddingHorizontal: small ? 14 : 18, borderRadius: small ? 10 : 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1, flexDirection: 'row', gap: 8 }, style]}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '800', fontSize: small ? 12 : 15 }}>{displayText(label)}</Text>
    </Pressable>
  );
}
export function Pill({ tone = 'warn', children }: any) {
  const t = useTheme();
  const m: any = { good: [t.goodBg, t.good], warn: [t.warnBg, t.warn], bad: [t.badBg, t.badFg], mute: [t.chip, t.mute], blue: [t.soft, t.blue] };
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: m[tone][0] }}><Text style={{ fontSize: 10, fontWeight: '800', color: m[tone][1] }}>{displayText(children)}</Text></View>;
}
export function StatusPill({ s }: { s: Status }) { return <Pill tone={STATUS_UI[s].tone}>{STATUS_UI[s].label}</Pill>; }
export function Chips({ items, value, onChange }: any) {
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
export function Seg({ items, value, onChange }: any) {
  const t = useTheme();
  return <View style={{ flexDirection: 'row', backgroundColor: t.chip, borderRadius: 12, padding: 3 }}>{items.map((x: string) => <Pressable key={x} onPress={() => onChange(x)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: value === x ? t.card : 'transparent' }}><Text style={{ fontSize: 12, fontWeight: '700', color: value === x ? t.ink : t.mute }}>{x}</Text></Pressable>)}</View>;
}
export function Toggle({ value, onValueChange }: any) { const t = useTheme(); return <Switch value={value} onValueChange={onValueChange} trackColor={{ false: t.line, true: t.blue }} thumbColor="#fff" />; }
export function Section({ title, right, onRight }: any) { const s = useS(); return <View style={s.sec}><Text style={s.secT}>{displayText(title)}</Text>{right ? <Pressable onPress={onRight}><Text style={s.link}>{displayText(right)}</Text></Pressable> : null}</View>; }
export function Field({ label, style, ...rest }: any) { const s = useS(), t = useTheme(); return <View>{label ? <Text style={s.label}>{displayText(label)}</Text> : null}<TextInput placeholderTextColor={t.mute} {...rest} style={[s.fld, style]} /></View>; }
export function Empty({ icon = 'text-box-search-outline', title, hint, cta, onCta }: any) {
  const t = useTheme();
  return <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 6 }}><Icon name={icon} size={28} color={t.mute} /><Text style={{ fontSize: 14, fontWeight: '800', color: t.ink, textAlign: 'center' }}>{displayText(title)}</Text>{hint ? <Text style={{ fontSize: 12, color: t.mute, textAlign: 'center', lineHeight: 18 }}>{displayText(hint)}</Text> : null}{cta ? <Btn small label={displayText(cta)} onPress={onCta} style={{ marginTop: 8 }} /> : null}</View>;
}
export function Skel({ h = 80, style }: any) {
  const t = useTheme(), o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true })])); a.start(); return () => a.stop(); }, [o]);
  return <Animated.View style={[{ height: h, borderRadius: 16, backgroundColor: t.chip, opacity: o }, style]} />;
}
export function ErrBox({ e, retry }: any) { const s = useS(); return <View style={[s.card, { alignItems: 'center', gap: 8 }]}><Icon name="alert-circle-outline" size={24} color="#C65D2E" /><Text style={s.title}>Couldn't load this</Text><Text style={[s.mut, { textAlign: 'center' }]}>{errText(e)}</Text><Btn small label="Retry" onPress={retry} /></View>; }
export function Loading({ n = 3, h = 70 }: any) { return <View style={{ gap: 10 }}>{Array.from({ length: n }).map((_, i) => <Skel key={i} h={h} />)}</View>; }
export function Avatar({ text, size = 44, logo, radius, onPress, bg }: any) {
  const t = useTheme(), r = radius ?? size * 0.3;
  const inner = logo ? <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: r }} /> : <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg ?? t.blue, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.34 }}>{displayText(text)}</Text></View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{inner}</Pressable> : inner;
}
export function FIcon({ k, size = 36 }: any) {
  const ui = FX.FUI[k] ?? { icon: 'shape-outline', color: '#6F7890' };
  return <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: `${ui.color}18`, alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name={ui.icon as any} size={size * 0.55} color={ui.color} /></View>;
}
export function Row({ left, title, sub, sub2, right, onPress, last }: any) {
  const s = useS();
  const body = <View style={[s.ar, !last && null]}>{left}<View style={s.g}><Text style={s.rt}>{displayText(title)}</Text>{sub ? <Text style={s.sub}>{displayText(sub)}</Text> : null}{sub2 ? <Text style={s.sub}>{displayText(sub2)}</Text> : null}</View>{right}</View>;
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}
export const Divided = ({ children }: any) => { const s = useS(); const a = React.Children.toArray(children).filter(Boolean); return <>{a.map((c, i) => <View key={i} style={i ? s.div : undefined}>{c}</View>)}</>; };

/** Full-screen page that sits above Home. */
export function Pg({ title, onBack, right, children, scroll = true, refreshing, onRefresh }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets();
  return (
    <View style={{ ...StyleSheet.absoluteFill, backgroundColor: t.bg, zIndex: 25, paddingTop: ins.top + 8 }}>
      <View style={{ paddingHorizontal: 16, gap: 4 }}>
        <Pressable onPress={onBack} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', height: 30 }}><Icon name="chevron-left" size={22} color={t.blue} /><Text style={{ color: t.blue, fontWeight: '800', fontSize: 14 }}>Back</Text></Pressable>
        <View style={s.row}><Text style={[s.h1, { flex: 1 }]} numberOfLines={1}>{displayText(title)}</Text>{right}</View>
      </View>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: ins.bottom + 60, gap: 14 }} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.blue} /> : undefined}>{children}</ScrollView>
      ) : <View style={{ flex: 1, padding: 16 }}>{children}</View>}
    </View>
  );
}

/** Short bottom sheet used for forms and menus. */
export function SheetShell({ title, onClose, children, tall }: any) {
  const t = useTheme(), s = useS(), ins = useSafeAreaInsets(), { height: H } = useWindowDimensions();
  return (
    <View style={{ ...StyleSheet.absoluteFill, zIndex: 30, justifyContent: 'flex-end' }}>
      <Pressable style={{ ...StyleSheet.absoluteFill, backgroundColor: t.scrim }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: ins.bottom + 16, maxHeight: H * (tall ? 0.9 : 0.8) }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, marginBottom: 10 }} />
          <View style={[s.row, { marginBottom: 6 }]}><Text style={[s.h1, { flex: 1, fontSize: 20 }]}>{displayText(title)}</Text><Pressable onPress={onClose} accessibilityLabel="Close"><Icon name="close" size={24} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Bottom-tab panel. Swipe up to expand under the header, swipe down to collapse, swipe down again to close. */
export function PanelSheet({ title, onClose, children }: any) {
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
    <View style={{ ...StyleSheet.absoluteFill, zIndex: 20, justifyContent: 'flex-end' }}>
      <Pressable style={{ ...StyleSheet.absoluteFill, backgroundColor: t.scrim }} onPress={() => to(0, onClose)} />
      <Animated.View style={{ height: h, backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingBottom: ins.bottom + 8, overflow: 'hidden' }}>
        <View {...head.panHandlers} style={{ paddingTop: 10 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, marginBottom: 12 }} />
          <View style={[s.row, { marginBottom: 10 }]}><Text style={[s.h1, { flex: 1, fontSize: 20 }]}>{displayText(title)}</Text><Pressable onPress={() => to(0, onClose)} accessibilityLabel="Close"><Icon name="close" size={24} /></Pressable></View>
        </View>
        <View style={{ flex: 1 }} {...body.panHandlers}>
          <ScrollView onScroll={(e: any) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>{children}</ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

/* ---------- listing wizard ---------- */
export const toDate = (type: string, v?: string) => {
  if (!v) return new Date();
  if (type === 'time') { const [h, m] = v.split(':').map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d; }
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v); return Number.isNaN(d.getTime()) ? new Date() : d;
};
export const fmtVal = (type: string, d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  if (type === 'time') return `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (type === 'date') return iso(d);
  return `${iso(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export function DateField({ type, value, onChange }: any) {
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
      <Pressable onPress={open} style={[s.fld, { justifyContent: 'center' }]}><Text style={{ color: value ? t.ink : t.mute, fontSize: 14 }}>{displayText(label)}</Text></Pressable>
      {show ? <DateTimePicker value={toDate(type, value)} mode={show} is24Hour onChange={pick} display={Platform.OS === 'ios' ? 'spinner' : 'default'} /> : null}
      {show && Platform.OS === 'ios' ? <Btn small kind="soft" label="Done" onPress={() => setShow(null)} style={{ alignSelf: 'flex-end', marginTop: 6 }} /> : null}
    </View>
  );
}
export function BlockCalendar({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
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

export function ListingWizard({ biz, feature, listingId, onClose, onDone, onToast }: any) {
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

  if (!ready) return <View style={{ ...StyleSheet.absoluteFill, backgroundColor: t.bg, zIndex: 40, padding: 20, paddingTop: ins.top + 20 }}><Loading n={4} h={60} /></View>;
  const price = Number(v.price ?? v.start ?? v.ticket ?? 0), off = v.original && v.price ? Math.round((1 - Number(v.price) / Number(v.original)) * 100) : null, cover = (v.photos ?? [])[0];
  const editing = !!listingId, titles = [...fe.steps.map(x => x.t), 'Review'];
  return (
    <View style={{ ...StyleSheet.absoluteFill, backgroundColor: t.bg, zIndex: 40 }}>
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
export const wzErr = (t: Theme) => ({ color: t.badFg, fontSize: 12, fontWeight: '600' as const, marginTop: 4 });
export function MiniBtn({ icon, onPress }: any) { return <Pressable onPress={onPress} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name={icon} size={14} color="#182033" /></Pressable>; }
export function Wrap({ items, value, onChange, multi }: any) {
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
export const POLICY: Record<string, string> = { goodies: 'Not allowed: weapons, medicines and alcohol.', glowz: 'Not allowed: medical-aesthetic services.', lutz: 'Reviewed by Wantiss before it goes live. Entrants must be 18 or older.' };
export const RANGES = ['7D', '30D', '90D', '1Y'];
export function RangeBar() {
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
export function actionTarget(app: App, a: any) {
  const tg: string = a.target ?? '';
  if (tg.startsWith('feature:')) app.go('feature', { k: tg.slice(8) });
  else if (tg.startsWith('requirements:')) app.go('feature', { k: tg.slice(13) });
  else if (tg === 'payout') app.sheet('payout');
  else if (tg === 'messages') app.go('messages');
  else if (tg === 'registration') app.go('registration');
  else app.go('actions');
}
export function ActionRow({ a }: any) {
  const app = useApp();
  return <Row left={a.feature ? <FIcon k={a.feature} /> : <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: app.dark ? '#202B4F' : '#EEF1FF', alignItems: 'center', justifyContent: 'center' }}><Icon name="alert-circle-outline" size={20} color="#2D5BFF" /></View>} title={a.label} sub={a.feature ? FX.FM[a.feature]?.name : a.sub} right={<Btn small label="Action" onPress={() => actionTarget(app, a)} />} />;
}

/* ---------- header ---------- */
export function Header() {
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
export function Banner({ icon = 'credit-card-outline', text, onPress, tone = 'soft', onClose, cta }: any) {
  const t = useTheme(), bad = tone === 'bad';
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: bad ? t.badBg : t.soft }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={bad ? t.badFg : t.blue} /></View>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: bad ? t.badFg : t.blue }}>{displayText(text)}</Text>
      {cta ? <Btn small label={displayText(cta)} onPress={onPress} /> : <Icon name="arrow-right" size={18} color={bad ? t.badFg : t.blue} />}
      {onClose ? <Pressable onPress={onClose} accessibilityLabel="Dismiss" hitSlop={10}><Icon name="close" size={18} color={t.mute} /></Pressable> : null}
    </Pressable>
  );
}
export function WalletCard({ available, pending }: any) {
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
export function Checklist() {
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
export function ActionCard({ actions }: any) {
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
export function ActivityRow({ a }: any) {
  const t = useTheme(), refund = a.kind === 'refund', money_ = a.amount != null;
  return <Row left={<View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: refund ? t.ref : t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name={refund ? 'cash-refund' : 'history'} size={17} color={refund ? t.bad : t.blue} /></View>} title={a.title} sub={`${a.feature ? FX.FM[a.feature]?.name ?? 'Business' : 'Business'} · ${ago(a.at)}`} right={money_ ? <Text style={{ fontSize: 11, fontWeight: '800', color: Number(a.amount) < 0 ? t.bad : t.good }}>{Number(a.amount) < 0 ? '−' : '+'}{money(Math.abs(Number(a.amount)))}</Text> : null} />;
}

/* ---------- pages ---------- */
export function OrderRow({ o, hl }: any) {
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
export function ListingRow({ l, focus }: any) {
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
export function RequirementsCard({ feature }: { feature: string }) {
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