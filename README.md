# Wantiss app (Expo + React Native)

Wantiss is the host app for buyer, vendor and service experiences, including the Stayz guest flow.

## Run locally

```sh
npm install
npx expo start
```

Use the Expo QR code with Expo Go or run a platform-specific development build. For a web preview, use `npx expo start --web`.

## App entry points

- `index.ts` registers `App.tsx` with Expo.
- `App.tsx` routes between the app's main screens and feature flows.
- `src/screens/Main`, `src/screens/Wallet`, `src/screens/Frenzies`, `src/screens/Flyz`, `src/screens/Goodies`, `src/screens/Konsoliss` and `src/screens/Stayz` organize screens by feature.
- `src/features/stayz/StayzGuestScreen.tsx` embeds the Stayz experience in the host app.
- `src/components` contains shared UI components; `src/lib` contains shared services such as the Supabase client.
- `src/assets` contains app artwork and feature assets.

## Goodies

The [Goodies operating guide](src/features/Goodies/README.md) explains customer/vendor/courier/admin workflows, pricing and commissions, Wallet/Card/Cash, Group Orders, Help Pay, the 5,000 HTG cash-sales cap, earnings holds, payouts, CMS ownership, deferred work and outstanding release acceptance. The [22 November audit](docs/goodies/operating-guide-audit-20261122/README.md) records the source/live-backend evidence and its verification limits. Goodies is part of the existing Wantiss app and backend; documenting or enabling backend capabilities does not release the super-app.

## Shared feature Quick Menu (three dots)

The floating three-dot button opens the Wantiss feature Quick Menu: a transparent slide-up modal with a dismissible backdrop, drag-handle appearance, five equal-width primary tiles, a horizontally scrolling secondary row, and Cancel. Use the feature's own light/dark palette; preserve the same layout, order, thin-stroke icons, accessible labels and Wantiss Home logo across features. Do not confuse Wantiss Home (exits to the host homepage) with the feature's own bottom-nav Home.

| Row | Ordered actions |
| --- | --- |
| Primary | Home, Messages, Notifications, Wallet, Saved |
| Secondary | My Orders, Recent Activity, Help Center, Feedback, Business Space, Dark Mode |

### Floating trigger — mandatory for every feature

- The Quick Menu trigger is a fixed viewport overlay, outside the scroll content and not a header-row icon. Keep it accessible on every page belonging to the current feature (including detail sheets, with the trigger rendered in the active modal/route layer). Do not display it over unrelated host destinations, or stack another trigger above its own open menu. Use the feature's own palette and a safe-area-aware placement.
- The reference trigger in Goodies and Konsoliss uses a 49 × 42 dp rounded pill, three left-to-right circles of **5, 7 and 10 dp** diameter with a 3 dp gap. Do not replace these with three equally sized dots or a generic ellipsis. New implementations should reuse [FloatingQuickMenuButton](src/shared/quickMenu/FloatingQuickMenuButton.tsx).
- If a feature uses a native modal for its detail pages, render the trigger in the visible modal layer. Present the menu above that page in the same layer (avoid competing native modal presentations), and return to the same detail when dismissed or toggling its theme. Verify that the floating trigger stays fixed while scrolling. For native payment/security surfaces, follow the host's security and modal rules.

### Reuse and route contract

- [menuContract.ts](src/shared/quickMenu/menuContract.ts) defines canonical action keys, order, labels and icons for new menus. Existing menus retain their feature implementations; they do not yet all import the new contract.
- Reuse [ThinMenuIcon](src/shared/quickMenu/ThinMenuIcon.tsx) and [useUnreadSummary](src/shared/inbox/useUnreadSummary.ts). The host already subscribes to the latter; pass the snapshot into new menus where practical. Show actual per-customer counts, capped visually at 99+, using aggregate feature badge colors. Show loading and retry for unavailable data; never substitute demo counts. The hook reads authenticated Supabase notifications, conversations and messages, refreshes via realtime, foreground and periodic updates, and resets on auth change.
- Close the menu before navigation. Home goes to Wantiss Home; messages/notifications open host screens with the originating feature as their inbox return route; wallet and recent activity set the originating feature as their return route. Business Space uses the existing account-mode check and registration flow. Help/feedback use an appropriate implemented support route; the general Wantiss help form writes settings_support_requests only after user submission.
- Saved and My Orders must point to appropriate feature or supported shared screens, not invent cross-feature records. Dark Mode toggles and persists the current feature preference, not another feature's theme. Use [useFeatureTheme](src/shared/quickMenu/useFeatureTheme.ts) where applicable or the feature's existing persistent theme store.
- Honor Android back, backdrop/Cancel, safe-area insets, reduced motion, narrow screen widths and accessibility. When integrating CMS, keep all menu labels, close/retry text and supported logo asset editable through the feature's content layer; keep stable action IDs and route logic in code, not editable copy.
- Test every tile, return navigation, dark/light persistence, unread loading/empty/error/retry, badge cap, signed-out transitions, narrow layouts and horizontal scrolling. Never mark production acceptance without device and authenticated backend verification.

### Existing implementations

| Feature | Implementation | Current routing notes |
| --- | --- | --- |
| Goodies | [GoodiesQuickMenu](src/features/Goodies/GoodiesQuickMenu.tsx) | Host actions via callback; feature orders/help/feedback and shared Saved where callback exists. |
| Gatherz | [GatherzQuickMenu](src/features/gatherz/GatherzQuickMenu.tsx) | Host callbacks plus local favorites/orders/help/feedback; some fallback alerts. |
| Konsoliss | [KonsolissQuickMenu](src/screens/Konsoliss/KonsolissQuickMenu.tsx) and [view](src/screens/Konsoliss/KonsolissQuickMenuView.tsx) | CMS copy, shared Saved, activity for orders, and existing Goodies support handoff. |
| Arts & Lits | [ArtsLitsQuickMenu](src/screens/ArtsLits/ArtsLitsQuickMenu.tsx) | Host inbox/wallet/activity/business/support; Saved is local preview, My Orders explicitly unavailable until connected, theme uses existing local preferences. |

Arts & Lits' header retains Back, branding and Search only; Notifications, Saved and Dark Mode are available through the floating Quick Menu. The trigger is mounted on the homepage and in every existing Arts & Lits detail sheet, using the same shared 5/7/10 dp dots. Arts & Lits specifically uses top-right header alignment (while remaining viewport-fixed), with a reserved 49 dp header slot so Search never overlaps. On dark mode the pill uses the approved #F0E9DD cream and dark paper dots. The feature's theme switch uses a top-left deforming water-spill reveal of actual page content (2010 ms; outgoing viewport snapshot masked over the new live page, with direct fallback when capture fails) on the homepage and detail sheets, respecting reduced motion; other features retain their existing positions and transitions. The approved homepage/dock artwork is unchanged. Arts & Lits menu CMS/translation wiring and feature-specific order/saved backend are outstanding; the menu uses canonical English defaults. Existing feature-specific return paths, copy and CMS completeness are not certified by this documentation.

## Supabase

Configure the environment values expected by `src/lib/supabase.ts`. The root `stayz_guest.sql` file defines the Stayz guest database objects; review and apply it in the intended Supabase project before using the related backend features.

## Maintenance

Legacy standalone Stayz screens and helpers at the repository root were removed because the active Stayz implementation now lives under `src/screens/Stayz` and is entered through `src/features/stayz/StayzGuestScreen.tsx`. Keep the host app's root entry files, shared services, database scripts, and active feature code intact.
