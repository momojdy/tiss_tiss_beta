# Wantiss shared-backend audit

Audit date: 2026-10-26
Target Supabase project: `ycbirmgppwavorwudlrv` (`https://ycbirmgppwavorwudlrv.supabase.co`)

## Current integration status

Both repositories now contain Supabase client integration targeting the same project. Source code verifies the project URL and reads the publishable key from Expo environment variables. The actual values injected into a published build have not been independently verified.

This is a source/database audit, not proof of a complete production release. Real-device tests, production build configuration, and end-to-end workflows remain to be completed.

## Customer app: tiss_tiss_beta

- `src/lib/supabase.ts` uses Supabase Auth with persisted sessions and AppState-aware token refresh.
- Goodies catalog data comes from live `goodies_store_schedules` rows marked live and available `goodies_products`. The in-memory catalog starts empty rather than exposing a seed catalog.
- Goodies published content and assets are fetched through the shared CMS reader. Draft CMS content is not intended to be visible to customer clients.
- Checkout uses server-side order RPCs for wallet/cash flows and the `place-goodies-card-order` Edge Function for card orders. Card refunds use server-side refund functions.
- Goodies order status, unread notification count and wallet balance now synchronize against the signed-in user's backend data. Sync requests are guarded against stale account generations and component cleanup; polling and foreground refresh provide recovery if realtime events are missed.
- Server notification updates only change the `read` column, matching the intended client grant.
- Wallet UI components use backend RPCs for wallet summary, points, activity and notifications. Goodies checkout reads the shared `wallets` record and payment-method RPC rather than treating a local cached balance as authoritative.
- Business Space Goodies orders use `goodies_orders` and server RPCs for accept, decline and lifecycle changes. Store setup, products and builder configurations use Supabase-backed operations.
- **Known gap:** Goodies vendor ingredient requests still use device AsyncStorage (`goodiesApi.listRequests/saveRequests`); they are not shared with Tiss Admin or other devices. Do not treat that workflow as production-persistent until it has a backend contract.
- Local cart, address and preference persistence remains device-local. These values are not substitutes for authoritative order, wallet or business records.

## Staff app: tiss-admin

- `src/features/admin/lib/supabase.ts` uses the same project URL and Expo publishable-key configuration, with persisted Supabase Auth sessions.
- Sign-in requires a confirmed email and an active `wantiss_admin_staff` row linked to `auth.users.id`. Staff status, invitation expiry and permission grants are rechecked.
- Administrative domain data is hydrated through `wantiss_admin_dashboard_snapshot`; staff, grants, business document review, business verification, CMS lifecycle, account restrictions and financial workflows call backend tables, RPCs or the `wantiss-admin-staff` Edge Function.
- The client still uses an in-memory presentation model. Hydration and each mutation must be checked for server errors; an empty local screen is not proof that a domain has no records.
- Verify each staff permission at the server boundary. Client-side button visibility is not an authorization control.

## Live database and security

Read-only catalog checks confirmed the presence of the Goodies order, product, store-schedule and builder-config tables, plus the wallet and notification tables used by the app. The Supabase project is active.

Two public SECURITY DEFINER helpers were found to allow anonymous/authenticated execution without an appropriate caller check:
- `public.qualify_wallet_referral(uuid, text)`
- `public.frenzies_ensure_open_tournament(text)`

A forward-only migration was applied and committed for each. Live privilege verification confirmed both now deny execution to `anon` and `authenticated` and allow `service_role`. The broader SECURITY DEFINER inventory still requires function-by-function review; do not blanket-revoke intentional public readers or authenticated RPCs that validate `auth.uid()`.

The Supabase security advisor reports leaked-password protection is disabled. Enable it in the Auth dashboard.

The `wantiss-admin-bootstrap` Edge Function remains deployed. After confirming the intended Super Admin can sign in, delete the function and its `WANTISS_SUPER_ADMIN_BOOTSTRAP_SECRET` manually. The available connection does not provide a function/secret deletion action.

## Migration history

Production migration history contains 154 entries as of this audit. Duplicate migration versions and repository/live drift remain. Do not delete rows from `schema_migrations`, replay old migrations on production, or treat a matching history listing as proof of matching schema. Reconcile on a disposable Supabase branch and verify a clean rebuild before planning any other production schema work.

## Build and release blockers

- GitHub Actions TypeScript checking passed after the Goodies sync changes.
- Expo Doctor still fails on existing Expo package-version mismatches (`expo`, `expo-location`, `expo-notifications`, `expo-blur`, `expo-clipboard`, and `react-native-screens`). The web export is skipped after this failure.
- Runtime environment variables, production device behavior, checkout/refund reconciliation, RLS privilege-boundary tests, and real-business launch have not been verified end to end.
- Verify one real business through Tiss Admin, publish its Goodies store and products, then place and fulfil a real controlled order before taking the feature live.

## Production acceptance criteria

1. Confirm production build variables point to the expected Supabase project and contain only publishable client keys.
2. Complete Auth and account-switch tests, including stale requests after sign-out.
3. Test Goodies browse, checkout, vendor acceptance/decline, stock restoration, notifications and card/wallet refund outcomes.
4. Test wallet balance, transaction history, points and payment methods across both apps.
5. Test admin access as Super Admin, limited staff, expired/revoked staff and a normal customer.
6. Finish migration drift reconciliation on a disposable branch, resolve Expo Doctor mismatches, and complete a device/build smoke test.
7. Complete the manual security and real-business checklist before claiming production readiness.
