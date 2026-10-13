# Stayz

Wantiss Stayz guest app for Expo (React Native, TypeScript).

## Run

```
npm install
npx expo install --fix
npx expo start
```

Open the QR code in Expo Go.

Without environment variables the app runs on built-in sample properties and stores bookings on the device. To use Supabase, copy `.env.example` to `.env` and fill in the URL and anon key, then run `supabase/stayz_guest.sql` in the SQL editor.

## Embed in the Wantiss app

```tsx
import { StayzApp } from './src/StayzApp';

<StayzApp client={supabase} onOpenWallet={openWallet} onExitToWantiss={goHome} onListProperty={openBusinessSpace} />
```

Passing `client` reuses the signed-in Supabase session of the host app.

## Structure

- `src/screens` one file per screen
- `src/components` shared UI, `src/components/search` search pickers
- `src/navigation` tabs and stack
- `src/store` settings, search, checkout draft, saved, host actions
- `src/services` Supabase and sample-data implementations of the same API, rates, location
- `src/lib` pricing, cancellation, dates, cards, distance
- `supabase/stayz_guest.sql` tables, views and functions used by the Supabase API

## Integration points

- Guest wallet balance and top-up: `guest_wallets` table and `onOpenWallet`
- Card tokenization: edge function `stayz-add-card` must return `{ id, kind: 'card', label, brand, detail }` and insert into `stayz_payment_methods`
- MonCash and NatCash payments: handled by your payment provider when `p_method` is `moncash` or `natcash`
- Promotions need a numeric `percent` column, added by the SQL file
