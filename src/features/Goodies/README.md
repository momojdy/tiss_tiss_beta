# Goodies (React Native module)

Port of Goodies v24. Mount it inside the main Wantiss app:

```tsx
import {GoodiesApp} from './features/Goodies/GoodiesApp';
<GoodiesApp onExit={() => navigation.goBack()} />   // embedded = true: starts on Home, back from Home calls onExit
// <GoodiesApp embedded={false} />                   // standalone demo with the Wantiss entry screen
```
Packages used: react-native-svg, expo-linear-gradient, @react-native-async-storage/async-storage, react-native-safe-area-context.

## Modes
`providers/index.ts`: demo is the default. Set `globalThis.__WANTISS_MODE__ = 'production'` before the app starts to block demo-only actions
(simulated ID check, demo reset) and to hide machine-drafted translations (`cfg.showMachineDrafts` in `i18n/index.ts` must be set to false in production builds).
Payment and order progress are still simulated in this module. Real payments and orders need the backend.

## Data flow (demo)
- Wantiss Admin v5 > Goodies > Overview > Export content, then Goodies Settings > Import Admin content. Drives: categories + artwork, promo cards, flash deals, home labels, coupons, fees and tips, scheduling, age rules, alcohol texts, stage labels, FAQ, support topics, legal text, and builder artwork + layout.
- Vendor Dashboard > Goodies > Store setup, Products and Go live read and write the backend (`goodies_save_store_setup`, `goodies_products`, `goodies_set_store_live`). The business is the store (store id = business id). Builders still write `goodies-byo-v4` (AsyncStorage) and custom-builder items are not orderable yet.
- Production: the same shapes come from the backend. No screen changes.

## Files
store.ts (state, pricing, cart rules, stages, alcohol helpers) · actions.ts (handlers) · content.ts (Admin content) · builders/ (engine, screen, pizza art, templates) · screens/ · components/ · i18n/ · data/

## Known gaps
See STATUS.md in the delivery folder.
