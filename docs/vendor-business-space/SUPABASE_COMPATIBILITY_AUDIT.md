# Supabase compatibility audit — Business Space

## Existing live schema confirmed during integration review

The connected Wantiss Supabase project already has public tables including profiles, products, wallets, wallet_transactions, wallet_payments, notifications, vendor_fulfillments, and stripe_customers. The existing profile table includes id, role, full_name, email, business_name, wantiss_number, preferred_currency, phone_number and avatar_url. The existing notifications table includes id, created_at, vendor_id, title, body, read, user_id and feature_name. The existing wallet transaction model stores user_id, amount, status, direction, activity_type, feature_name, reference_id and metadata.

The connected project has existing notification and profile RLS policies, including profile-own-read/update and several notification-read policies. Those must not be replaced or weakened by the vendor dashboard import.

## Reference migration collisions

- Reference migration 001 creates a public.notifications table with a different shape (business_id, kind, link, read_at). That is incompatible with the live public.notifications table. It must be renamed to a vendor/business-specific table (for example business_notifications) throughout every dependent migration and RPC, or explicitly redesigned to reuse the current notification schema.
- Reference migration 002 creates or expects business tables and modifies shared profile/notification concepts. Every ALTER, policy, trigger, grant and function must be compared against live definitions before running.
- Reference migration 001 introduces wallet_ledger and a wallet_balance view. The live project already has wallets and wallet_transactions. The intended relationship between existing customer payment transactions and vendor earnings/payout ledger entries is not implemented by the reference package alone. Do not create two independent balances for the same money movement.
- Existing Stripe payment Edge Functions and Stripe customer/payment tables must be preserved. The reference payout functions must not replace customer card setup or money-request payment functions.
- The app uses Supabase Auth and the existing profile UUID; do not introduce a second identity provider or a separate user identity.

## Current decision

No SQL has been applied to the live Supabase project. The Business Space screen is committed on a feature branch and uses the intended business tables/RPCs, so its data-dependent sections require the compatibility migration before they can operate. Until then, database errors are surfaced in the UI rather than hidden behind mock data.

## Required next database work

1. Obtain or create a separate staging Supabase project and confirm it is isolated from production.
2. Generate a schema diff for every object touched by reference migrations 001–004.
3. Adapt business notification names, profile columns/policies, existing wallet transaction integration and all RLS/grants.
4. Review SECURITY DEFINER functions, storage policies, Stripe transfer/webhook idempotency and payout reconciliation.
5. Apply the compatibility migration in staging, test against realistic user roles and concurrent financial operations, then review the resulting schema diff.
6. Only after those checks should a production migration be proposed and explicitly approved.


## Follow-up findings — 2026-10-10

- The live `public.handle_new_user()` trigger previously copied `raw_user_meta_data.role` directly into `profiles.role`. Because signup metadata is client-editable, this could elevate a new account to vendor mode without approval.
- The compatibility migration now changes the trigger function so all new profiles start with `role = 'buyer'`. Vendor intent is recorded in `vendor_applications` as pending. Vendor access must be granted by a trusted administrative process that updates `profiles.role`; client signup metadata alone cannot grant it.
- The app now uses the trusted `profiles.role` for login routing and no longer falls back to `user_metadata.role`. A vendor registration with an immediate session signs out and displays a pending-approval message.
- Live schema inspection confirmed `profiles.role` exists and the existing signup trigger is bound to `public.handle_new_user()`. No Business Space tables exist in the live project. No migration was applied to production.
- A separate Supabase staging project/branch is not currently available through the connected project list. The migration has therefore **not** been applied or executed against a staging database; runtime/RLS/financial validation remains blocked until isolated staging is provisioned.
- The new `wallet_ledger` is only a reporting ledger and is not reconciled to `wallet_transactions`, `wallet_payments`, Stripe events, refunds, or transfer/payout records. Do not present it as a live spendable balance or enable payout actions until a signed, idempotent, reconciled ledger integration exists.
