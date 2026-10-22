# Glowz (React Native feature module)

A self-contained, typed React Native implementation of the Glowz beauty-booking prototype.

## Requirements
- `react`, `react-native`, `react-native-svg` (the only hard dependencies; none are bundled or installed here).
- TypeScript strict. No WebView, no navigation library.

## Mount it
```tsx
import { GlowzEntry } from './glowz/GlowzEntry';

<GlowzEntry
  storage={asyncStorageAdapter}      // { getItem, setItem, removeItem } -> Promise; optional (in-memory fallback)
  insets={{ top, bottom, left, right }} // from react-native-safe-area-context; optional
  copyToClipboard={(t) => Clipboard.setString(t)} // optional
  pickImage={() => launchPicker()}   // optional; returns { uri } | null
  shareLink={(url) => Share.share({ message: url })} // optional
  onExit={() => navigation.goBack()} // called when back is pressed at the root of the stack
/>
```
Optional host callbacks fall back to demo behaviour when omitted.

## Fonts
Typography uses `styles/typography.ts`; font files are not included. Load your serif/sans fonts in the host and the module switches off system fonts via its font-loaded flag.

## Layout
- `types/` domain + state types · `data/` seed data · `utils/` pure logic (tested)
- `hooks/` store, commands, booking flow, persistence · `styles/` tokens/theme
- `components/` primitives, cards, sheets, booking steps · `screens/` 14 screens
- `navigation/` typed route union, reducer, context, navigator (tabs, stack, sheets, swipe-back)

## Tests
`tsx --test glowz/__tests__/logic.test.ts` (pure logic: pricing, promos, availability, filtering, persistence, validation, nav reducer).

## Backend needed for production
Availability, bookings, payments/deposits, promo validation, chat, notifications, reviews, reports, profile and image upload are all local sample logic.
