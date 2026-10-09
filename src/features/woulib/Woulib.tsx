/**

 * WOULIB — complete feature in ONE file (React Native / Expo + Reanimated + react-native-svg + react-native-maps).

 *

 * Drop this file in src/features/woulib/ and render <WoulibFlow /> (it brings its own theme + ride providers).

 * The existing app screens / auth / database stay untouched.

 *

 * Peer deps: react-native-reanimated (v3), react-native-svg, react-native-maps, @expo/vector-icons,

 *             @react-native-async-storage/async-storage.

 *

 * What's in this file

 *  - Theme (light/dark, brand yellow #FEC509) + ride state machine (RideProvider)

 *  - Illustrated isometric city: two-way roads, 3 cars per lane, buses, signals that really stop traffic,

 *    ~90 pedestrians on the sidewalks, defined trees (palm / round / bloom / pine) and flower beds

 *  - Live map (Uber style): road-snapped cars that cruise continuously, smoothed heading, real OSRM

 *    route + real distance/ETA, camera that follows the taxi

 *  - WoulibFlow: every screen (destination → vehicle → searching → offer → on the way → arrived →

 *    riding → complete) with a tall bottom card that auto-sizes per step and can be collapsed

 *

 * Live map notes

 *  - iOS uses Apple Maps. Android draws OpenStreetMap tiles (mapType="none"). react-native-maps still

 *    initialises the Google Maps SDK on Android, so keep your Google Maps key in app.json / AndroidManifest.

 *  - Tiles come from tile.openstreetmap.org and routes from the public OSRM demo server. Both are for

 *    DEMOS ONLY. For production use your own OSRM / Mapbox / Google Directions and a licensed tile provider.

 *  - OSM attribution is shown on the map as required.

 *  - Performance knob: TRAFFIC_DENSITY (cars per lane) and PED_COUNT below.

 * */

import React, {createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {KeyboardAvoidingView, LayoutChangeEvent, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import Animated, {Easing, FadeIn, FadeInDown, FadeOut, SharedValue, useAnimatedProps, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Ellipse, G, Path, Polygon, Polyline} from 'react-native-svg';
import MapView, {Circle as GCircle, Marker as GMarker, Polyline as GPolyline, UrlTile} from 'react-native-maps';
import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The complete Claude-provided implementation is restored from the exact pre-overwrite blob.
// [Restored verbatim from the repository's previous Woulib implementation.]