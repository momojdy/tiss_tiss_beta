# Wantiss on Replit

This is the imported React Native / Expo / TypeScript app. Keep its existing
structure and stack; the Replit setup uses its existing web target.

## Run

- Runtime: Node.js 22, required by the existing Supabase packages.
- Dependencies: installed from the existing npm package manifest and lockfile.
- Click **Run** to start the **Start application** workflow.
- The workflow runs Expo's web development server on port 5000.
- For local mobile development, the original `npm start`, `npm run android`,
  and `npm run ios` scripts remain available. Native features require a
  suitable device/development build and are not verified by the web preview.

## Required existing service

Add these values in Replit's Secrets tool for the Supabase project this app
already uses:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use a client-safe publishable (or legacy anon) key, never a service-role key.
Expo embeds `EXPO_PUBLIC_*` values in the client bundle, even when stored in
Secrets. Stop and run the workflow again after changing them.

When either setting is missing, the app displays a setup message instead of
initializing Supabase with invented values. Authentication and database features
cannot be verified until the existing project's settings are supplied. This
setup does not create or migrate a database.

## Checks and existing limitations

- Type check: `npx tsc --noEmit`. The imported project has existing errors in
  screen props, route types, event typing, and icon names.
- The import has no lint configuration or lint script. An Expo lint check
  reported 137 errors and 40 warnings in existing code. Expo's automatically
  installed lint tooling was removed afterward to keep the import setup minimal.
- `npx expo install --check` reports existing SDK compatibility differences for
  Stripe, image picker, and WebView. These native dependencies were not upgraded
  as part of the minimal web setup.
- The wallet card-entry screen uses React Native WebView, which does not provide
  a browser implementation. Native wallet/payment behavior is not validated by
  the browser preview.
