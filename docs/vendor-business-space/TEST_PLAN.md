# Business Space acceptance plan

## App integration
- [ ] Sign in with Supabase Auth as a buyer; existing buyer screens still open.
- [ ] Sign in with Supabase Auth as a vendor role; Business Space opens.
- [ ] Sign out from Business Space; Supabase session is cleared and auth screen opens.
- [x] Remove auth metadata as a login-routing fallback; login now trusts `profiles.role` only.
- [x] Ensure vendor signup metadata records intent but does not grant the vendor role: the staging migration keeps new profiles as buyers and records a pending vendor application.
- [ ] Verify pending application and role approval end-to-end on an isolated staging database.
- [ ] Check loading, no-business, database-error, offline, and refresh states on iOS, Android and web.
- [ ] Run full-app `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` in the app environment.
- [ ] Complete device/simulator runtime tests; CI's scoped screen check and web bundle export do not replace native runtime testing.

## Database compatibility (staging only)
- [ ] Compare all four reference SQL files against live table definitions, constraints, indexes, triggers, functions, grants, policies and storage buckets.
- [ ] Avoid redefining existing customer notifications or introducing an unbridged duplicate payment ledger.
- [ ] Confirm business owner/manager/staff and unrelated-user RLS behavior, plus anonymous access.
- [ ] Confirm only authorized users can create businesses, read business records and change listings.
- [ ] Test concurrent stock and capacity reservations; reject zero/negative quantities.
- [ ] Confirm ledger writes are server-authoritative and idempotent.
- [ ] Verify private verification documents are readable/deletable only by intended reviewers.
- [ ] Verify profile/business identity uses the existing Supabase Auth UUID without duplicate user identities.

## Checkout and payouts
- [ ] Payment capture and order creation are server-authoritative and idempotent.
- [x] Document that the new ledger is currently unbridged from `wallet_payments` / `wallet_transactions`; dashboard figures are explicitly marked provisional and withdrawals/refunds are not enabled.
- [ ] Design and test a server-authoritative, idempotent reconciliation from existing payment events into vendor earnings.
- [ ] Test payout onboarding return URL allowlisting.
- [ ] Test duplicate webhook delivery, success, failure, cancellation, insufficient funds, retries and transfer reversals.
- [ ] Ensure a possibly existing provider transfer cannot be treated as failed/released until reconciled.
- [ ] Confirm provider account/transfer/payout IDs are persisted and auditable.

## Production release gate
- [ ] Staging migration and RLS tests pass (blocked until a separately billed Supabase branch/project is provisioned and confirmed).
- [ ] Existing buyer auth, wallet, saved cards, money requests, notifications and Frenzies regression checks pass.
- [ ] Rollback/forward-fix plan and monitoring are documented.
- [ ] Provider secrets/webhooks are configured and tested.
- [ ] Production rollout is explicitly approved.
