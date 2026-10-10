# Wantiss Business Space — React Native integration

## Current integration

- Target app: Expo + React Native + TypeScript under src/.
- Authentication: Supabase Auth, using the existing src/lib/supabase.ts client.
- UI entry: src/features/businessSpace/BusinessSpaceScreen.tsx.
- Design accent: Wantiss blue #2D5BFF.
- App routing: App.tsx directs accounts whose profile/user metadata role is vendor, business, seller, or merchant into Business Space. Buyer routing remains separate.

## Reference package

The original browser React implementation and its SQL/functions are preserved under reference/ for behavior review. They are not imported as a browser runtime into the React Native app.

## Supabase status and deployment gate

The target Supabase project already contains customer/profile/wallet/payment/notification tables and existing Edge Functions. The reference package expects additional business tables, an independent business earnings ledger, RPCs, storage policies and payout webhook infrastructure. Those SQL files have not been applied to the live project.

Do not apply the reference SQL directly to production. Before enabling data features:
1. Review table/policy collisions, especially the existing public.notifications table.
2. Decide and document how vendor order payments fund the business ledger without duplicating customer-wallet transactions.
3. Review all SECURITY DEFINER functions, grants, RLS policies and storage policies.
4. Apply a forward-only compatibility migration to an isolated staging project first.
5. Test checkout, cancellation, refunds, payout retries, duplicate webhooks and late reversals.
6. Configure provider secrets in Supabase secrets only; never put service-role keys in Expo public environment variables.

## Current UI behavior

The screen uses real Supabase queries and RPCs and intentionally shows database errors instead of fake data. It supports business onboarding, overview, earnings summary, feature status, recent activity, orders, listings and payout history. Listing creation, order transitions and payout execution are not enabled until the compatible database migration and trusted server-side flows have been reviewed and installed.

## Verification status

Repository writes are committed on the isolated branch feature/vendor-business-space-react-native. This environment does not provide a local checkout/runtime for running Expo lint, TypeScript, or device tests, so the app must not be described as build-verified yet.
