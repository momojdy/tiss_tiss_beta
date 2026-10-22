# Prezo integration guide

## Where things go

Copy the contents of `src/` into your Wantiss `src/` folder. Folders merge with your existing structure:

| Folder | Purpose |
| --- | --- |
| `src/features/prezo/` | Entry point (`PrezoStandaloneEntry.tsx`), providers, state store, route view |
| `src/screens/Prezo/` | 19 screens (Home, Explore, Waitlist, Orders, Profile, Campaign details, Checkout, Order confirmation, Order details, plus Fallback decision, Waitlist entry, Seller, Alerts, Alert detail, Help, FAQ, Report, Support, Policy) |
| `src/components/prezo/` | `navigation`, `campaign`, `checkout`, `orders`, `profile`, `shared` |
| `src/theme/prezoTheme.ts` | Light and dark tokens taken from the prototype |
| `src/types/prezo.ts` | All Prezo types |
| `src/data/prezo/` | Data-access interface, unconnected default, help content |
| `src/lib/prezo/` | Pure rules, formatting, filters, navigation stack |

No assets are shipped. The prototype supplied none, and no images are fabricated.

## Mounting it

```tsx
import PrezoStandaloneEntry from './src/features/prezo/PrezoStandaloneEntry';

<PrezoStandaloneEntry repository={prezoRepository} currencySymbol="$" onExitRequested={goBackToWantiss} />
```

Props (all optional): `repository`, `currencySymbol` (default `$`), `initialTheme`, `initialRoute`, `onExitRequested` (called on the Android back button from a root screen).

Prezo runs its own internal navigation stack, so it needs nothing from your root navigator except a screen to host it. It wraps itself in `SafeAreaProvider`.

## Dependencies

| Package | Why |
| --- | --- |
| `react-native-svg` | Category glyphs, gradients, icons, hero artwork |
| `react-native-safe-area-context` | Safe-area padding in header, tab bar, sheets |
| `expo-font`, `@expo-google-fonts/bricolage-grotesque`, `@expo-google-fonts/inter-tight` | The prototype's two typefaces |
| `expo-clipboard` | "Copy link" in the share sheet |
| `expo-blur` | Frosted header, tab bar and sticky footer (the HTML uses `backdrop-filter: blur(14px)`) |

Install with `npx expo install react-native-svg react-native-safe-area-context expo-font expo-clipboard expo-blur` and `npm i @expo-google-fonts/bricolage-grotesque @expo-google-fonts/inter-tight`. I did not know your Expo SDK version, so `expo install` will pick compatible versions. If your app already loads these fonts, remove `usePrezoFonts` from the entry.

## Connecting a backend

Everything the screens read or write goes through `PrezoRepository` (`src/data/prezo/PrezoRepository.ts`). Implement it and pass it as `repository`. Until you do, the default `createUnconnectedRepository()` returns empty lists, so every screen shows its real empty state, and every write throws a clear "not connected" error that the UI surfaces. Nothing pretends to succeed.

Things the backend, not the app, must own:

- Campaign `status`, order `outcome`, fallback deadlines (`fallback.decideBy`), seller commitments, refund progress, and expired-fallback refunds. The prototype did these client-side; here they are read as given.
- Payments, refunds, cancellations and address saving. Payment methods come from `listPaymentMethods()`.
- Addresses: `repository.addresses` is a separate interface so it can point at the Wantiss address book later. `source: 'wantiss' | 'prezo'` and `isDefault` drive the "Default from Wantiss" and "Used in Prezo" tags.
- Policies: `getPolicy(topic)` returns the real legal text. The prototype's policy text was marked placeholder, so none is shipped; the screen shows an empty state until you provide it.
- Profile, notification preferences, saved campaigns and recent searches.

## Group orders vs pre-orders

`Campaign` is a discriminated union on `mode`.

- `group`: `price` (primary), `fallbackPrice`, `metric` (buyers, units or revenue with target and progress), `closesAt` deadline, optional `fallbackWindowDays`.
- `preorder`: `price`, required `fulfilmentAt` (the scheduled date), optional `closesAt` order deadline, optional `stock` limit. No target, no fallback.

Both share per-campaign `opensAt`, `closesAt`, `fulfilmentAt`, `maxPerOrder`, `deliveryFee`, `pickupInstructions`, `serviceSlots`, `shareUrl` and `cancellableUntil`. Nothing about schedules is hardcoded. The mode drives chips, cards, details, checkout copy and totals, confirmation, order timeline, cancellation rule and filters. A pre-order is cancellable only if the campaign supplies `cancellableUntil` in the future.

## Deliberate differences from the prototype

- Dropped all demo affordances: the proto banner, mock payment methods, "Advance (demo)", "Simulate failure", "Reset demo data", and "(demo)" labels.
- Dropped hardcoded content: sellers, pickup address, service slots, delivery fee, the seven-day window (now `fallbackWindowDays`), category blurbs.
- Added: a pre-order model, an "Order type" filter, a "Pre-order open" status, loading skeletons and failure states driven by real request state.
- Times show in the device's local time, not the prototype's fixed UTC.
- Header (88%), tab bar and sticky footer (92%) are translucent over a native blur, as in the HTML; content scrolls beneath them. Android blur uses `expo-blur`'s `dimezisBlurView` method and may look different from iOS.
- Featured cards span two grid columns like the HTML (full width on phones, where that is the whole grid). On three or more columns, following cards flow beside them.
- Category artwork is the prototype's own glyph set on its gradients, shown only when a campaign has no image.
- The help text in `helpContent.ts` is the prototype's copy, with the 7-day figure generalised and a pre-order topic added.
- Heart, share and chevrons are SVG icons instead of text glyphs.

## What was and wasn't verified

See the delivery message. In short: pure logic was executed; the UI was not run on a device.

