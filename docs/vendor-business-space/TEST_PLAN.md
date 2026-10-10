# Business Space acceptance plan

## App integration
- [ ] Sign in with Supabase Auth as a buyer; existing buyer screens still open.
- [ ] Sign in with Supabase Auth as a vendor role; Business Space opens.
- [ ] Sign out from Business Space; Supabase session is cleared and auth screen opens.
- [ ] Test profile role and auth metadata role fallback.
- [ ] Check loading, no-business, database-error, offline, and refresh states on iOS, Android and web.
- [ ] Run npx tsc --noEmit, npx expo lint, and npx expo-doctor in the app environment.

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
- [ ] Document how existing wallet_payments / wallet_transactions reconcile to vendor earnings.
- [ ] Test payout onboarding return URL allowlisting.
- [ ] Test duplicate webhook delivery, success, failure, cancellation, insufficient funds, retries and transfer reversals.
- [ ] Ensure a possibly existing provider transfer cannot be treated as failed/released until reconciled.
- [ ] Confirm provider account/transfer/payout IDs are persisted and auditable.

## Production release gate
- [ ] Staging migration and RLS tests pass.
- [ ] Existing buyer auth, wallet, saved cards, money requests, notifications and Frenzies regression checks pass.
- [ ] Rollback/forward-fix plan and monitoring are documented.
- [ ] Provider secrets/webhooks are configured and tested.
- [ ] Production rollout is explicitly approved.
