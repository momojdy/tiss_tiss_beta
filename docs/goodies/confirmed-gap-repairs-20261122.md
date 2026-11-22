# Goodies confirmed-gap repairs — 22 November 2026

This report supersedes the three confirmed source/operation gaps in the earlier operating-guide audit. It does not certify complete production readiness or installed-device acceptance.

## Implemented

- Explicit Goodies workspace context selects scoped dashboard, actions, activity, search, registration and promotion paths for businesses with multiple features. Shared metadata, listing counts and checklist destinations follow that scope. Other feature contexts keep their existing APIs. The absent generic RPCs were not replaced with invented financial totals.
- Admin **Goodies → Promotions** supports the existing percentage/free-delivery contract: code, store/all-store scope, product minimum, validity timestamps, total redemption cap and activation. Finance view/manage permissions are checked by the server. Saves require a review reason and write before/after audit records. Row/advisory locks and expected timestamps reject competing stale saves. Client writes cannot set redemption counts; redeemed financial terms cannot be rewritten. Fixed-amount discounts, subsidy budgets, weekday restrictions and per-customer limits are not supported by this existing contract and are not offered in the dedicated editor.
- Both public CMS read endpoints now obtain eligible operational offers from the financial catalogue and retain only matching CMS wording. A CMS draft cannot grant a discount. Server checkout remains responsible for prices, eligibility, redemption locking and payment. Existing active offers become visible; no campaign or financial record was created/edited during deployment.
- The checkout cash caption reflects store/order eligibility and no longer promises a platform courier is mandatory. Its new CMS identity and the phone-preview mirror are synchronized. A store-specific coupon referencing a removed store no longer crashes local cart validation. Offer validity handles precise UTC timestamps and inclusive legacy end dates.

## Verification

**PASS:** 11 workspace tests, 18 settlement tests, two public-promotion/validity tests; focused admin navigation tests; both TypeScript checks; configured lint; CMS coverage (1,921 fields, 34 routes).

**PASS:** disposable local PostgreSQL 17.6 bootstrap and migration rollback, creation/audit, anonymous/other-user/direct-write denial, stale and concurrent edits (one success, one serialization error), malformed settings, activation, scheduling, expiry, exhausted cap, redemption preservation and revoked-staff denial. The runner creates its own socket-only cluster and accepts no hosted database URL. Run `GOODIES_TEST_PG_MODULE=/path/to/pg node scripts/test-goodies-promotions-postgres.cjs --native-bin /path/to/postgres17.6/bin` with the existing local dependencies.

**PASS:** deployed additive migration `goodies_financial_promotion_management`, ledger version `20261122142319`, repository candidate `20261122141421_goodies_financial_promotion_management.sql`. Existing stronger staff checks were preserved. Anonymous admin execution and authenticated direct table updates remain denied in deployed metadata. Both public content HTTP reads return 200 and identical financial offer terms (two existing eligible offers at observation). No hosted synthetic records or provider transaction were used.

**PASS:** deployed `wantiss-public-content` v8 and `wantiss-cms-public` v7, preserving their existing anonymous public-read configuration. The shared promotion helper passes Deno checking; the full local Edge check could not download the existing JSR runtime package. Hosted deployment compilation and public HTTP execution passed. Advisors were read before/after; intentionally public read RPCs and internally authorized definer RPCs are not assumed vulnerable merely because callable.

**NOT VERIFIED:** signed-in installed admin creation/edit, customer/vendor display and checkout after an actual administrative campaign change; every cross-role/authorization/device interaction; actual provider sandbox/3DS/refund reconciliation; native GPS/background/push/private-proof behavior; installed CMS reload; full production restore. Source/local tests do not pass those gates. The full suite was not rerun for this focused repair.

## Rollout and recovery

The additive migration was tested before deployment. It creates management/public-read RPCs and changes no existing orders, balances, promotion values, table grants or pricing/refund functions. Edge reads were deployed after the functions existed. No Wantiss application/OTA/store build or CMS version was published.

If recovery is required, first redeploy the previous public content handlers (v7/v6 source from the parent commit), then roll back the paired admin client. The added RPCs can remain unused. Drop them only after confirming no deployed caller depends on them; never remove or rewind promotion/audit records to undo a client release. Migration rollback was verified locally; this is not full production backup restoration.

FAQ/policies, final translations/Creole review, external payout channels, the owner-deferred leaked-password safeguard, backup export/full restore and the full Wantiss release retain their previously recorded status.

## CI reconciliation follow-up

The first paired push began customer validation before the updated admin key catalogue was available, producing a cross-repository catalogue mismatch. A separate local-API job exposed that its synthetic schema builder omitted the newly required public promotion RPC. The isolated builder now includes the promotion migration; the dedicated migration test explicitly starts before that addition so rollback coverage remains meaningful. These failures were investigated; subsequent CI results must be read at the final corrective commit rather than assumed from earlier local passes.
