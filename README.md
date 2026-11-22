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

## Supabase

Configure the environment values expected by `src/lib/supabase.ts`. The root `stayz_guest.sql` file defines the Stayz guest database objects; review and apply it in the intended Supabase project before using the related backend features.

## Maintenance

Legacy standalone Stayz screens and helpers at the repository root were removed because the active Stayz implementation now lives under `src/screens/Stayz` and is entered through `src/features/stayz/StayzGuestScreen.tsx`. Keep the host app's root entry files, shared services, database scripts, and active feature code intact.
