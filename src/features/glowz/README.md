# Glowz — React Native feature module

This is a native React Native implementation of the Glowz v4 prototype. It does not use a WebView or add a navigation-library dependency.

## Host integration

Use `GlowzHostEntry` from the Wantiss app rather than mounting `GlowzEntry` directly. The host wrapper supplies:

- AsyncStorage-backed persistence for the Glowz state and navigation snapshot;
- real safe-area insets from `react-native-safe-area-context`;
- the system photo picker through `expo-image-picker`;
- system clipboard through `expo-clipboard`;
- system share sheet through React Native `Share`;
- Cormorant Garamond 500/600/700 and Jost 400/500/600 through Expo Google Fonts.

The wrapper receives `onExit`, which returns to the Wantiss home screen when Glowz is at its root and the user presses Back.

## Structure

- `screens/`: the 14 root and secondary screen views
- `components/`: reusable UI, booking steps, and sheets
- `hooks/`: store, commands, booking flow, and host adapters
- `navigation/`: typed routes, stack/tab reducer, and back gestures
- `data/`, `types/`, `utils/`, `styles/`: seeded demo data, domain models, pure logic, and design tokens
- `__tests__/logic.test.ts`: deterministic tests for the pure business logic

## Fonts and artwork

Font files are loaded from the Expo Google Fonts packages; no standalone font files need to be copied into `assets/`. The custom category motifs, provider illustrations, QR graphics, stars, and stylised map are drawn in TypeScript/SVG. The empty `assets/` directory is intentional. These illustrations are demo artwork, not real provider photos. Real provider photos and portfolio images will need to come from the future provider/admin asset workflow. The Wantiss home-grid ecosystem icon is a separate asset already referenced by the host app.

## Validation

Run `npm run test:glowz` for the included pure-logic tests. After installation in Tiss Tiss Beta, also run `npx tsc --noEmit`, `npx expo-doctor`, and device-level iOS/Android flow checks.

## Production backend still required

Availability, bookings, payments/deposits, promo validation, chat, notifications, reviews, reports, profiles, and image upload are sample/local logic. They are not connected to production services by this feature module.
