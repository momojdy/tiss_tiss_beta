# Goodies

The existing React Native customer module is mounted with `<GoodiesApp onExit={...} />`.
Its internal navigation, visual components and builders remain in their established locations.

`providers/index.ts` selects production behavior. Catalog, orders, payments, courier
assignments and published content use the existing Wantiss Supabase backend. Demo
actions are disabled. Admin preview fixtures belong only to the separate admin repository.

The consumer reads the published English `goodies.content` v5 payload. Its `Txt`
fields contain `en`, `fr`, `ht`, `es` and `zh-Hans` entries with individual review
states. Unreviewed translations fall back to English in production. Adding text
or viewing a draft does not mark a translation human-reviewed.

Goodies persistence uses account-owned envelopes. Unowned legacy caches are
discarded because their original customer cannot be established. The shared
Wantiss profile and address tables remain the source of customer identity.

Courier access uses `goodies_courier_orders()` for assignment-scoped details.
Map positions expire locally after two minutes, including during network failure.
Only supplied road geometry is drawn; missing geometry has an explicit unavailable
state. Own-driver proof uploads use private Storage objects and authorized signed
URLs. Production rollout of these changes requires the migrations in the release plan.

Run the existing Deno tests, including isolated PostgreSQL authorization tests:

```sh
deno test --allow-read --allow-env --config supabase/functions/deno.json \
  supabase/functions/goodies-tests/ \
  supabase/functions/process-goodies-card-refunds/ \
  supabase/functions/rapid-api/goodiesStripeState_test.ts
```

These tests use synthetic data and do not establish live Stripe, push notification,
physical-device GPS or complete cross-role end-to-end verification. See
`docs/goodies/RELEASE.md` for the evidence and remaining release gates.
