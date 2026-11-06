# Goodies release verification — 2026-11-06

**Production readiness: NOT READY. Implementation and verification remain incomplete.**
No production migration, Edge Function deployment, CMS publication, real charge,
refund, financial-record update, secret change, or production-branch merge was performed.

PASS means the explicitly named check was executed successfully. FAIL means a
check or inspection established a defect. NOT VERIFIED means the required runtime
test or supporting environment was unavailable or has not been executed. A unit
test does not establish the corresponding complete customer workflow.

## Baseline and traceability

- Customer/vendor branch: `goodies/production-readiness`, initially `75857548e48594429eb229d105412f2ee41fcacf`.
- Admin branch: `goodies/production-readiness`, initially `e65ff541bef118e6c9e4f82137838a03152d8bed`.
- Both initial working trees were clean. The GPS freshness commit was the customer branch head and is preserved as an ancestor.
- Production inspection was read-only against Wantiss `ycbirmgppwavorwudlrv`.
- Deployed migration history, public Goodies/CMS functions, policies, triggers,
  column metadata, table grants, Realtime publication, Edge Function source and
  versions, cron configuration and aggregate execution outcomes were inspected.
- Vault **names only** were inspected. Edge secret values and configuration were
  not available for verification. No credential values are included here.
- [Implementation commits and changed files](implementation-commits.json).
- [Machine-readable source inventory](source-inventory.json): 53 customer/vendor/shared
  source files and 56 admin/shared/preview source files; 608 and 498 interaction
  handlers respectively. Preview controls are explicitly distinguished from live
  admin controls. This is an inventory, not a certification of those interactions.
- [Screen verification register](SCREEN-VERIFICATION.md).

## Implemented changes

### Customer and shared account state

Profile/address, order, cart and notification caches now carry their account owner.
Legacy caches without a provable owner do not hydrate. This intentionally clears
unowned legacy carts on upgrade. Signing out or switching accounts clears private
state, pending card authentication, group state, location and open overlays.
Late wallet/card/profile/order/address results are guarded against account changes.
The existing Wantiss identity and address tables remain authoritative.

### Courier and delivery

The courier screen previously queried orders directly although deployed SELECT
policies allow customer/vendor reads only. `goodies_courier_orders()` now provides
an approved courier's current assignment details without broadening order-table
access. It excludes expired offers, other couriers, mismatched businesses and
terminal orders, and omits provider references. This RPC is **not yet deployed**.

GPS markers expire locally during network interruption; failed/missing assignments
clear the marker. Invalid/future/old positions are rejected, including queued
background samples. Only real supplied road geometry is rendered. Disconnected
route segments are not joined into invented roads. The viewport includes known
route/location extents. Missing road geometry has explicit unavailable text.
Courier assignments refresh on foreground recovery and polling, and action failures
release busy state. Physical-device/background behavior remains unverified.

### Vendor, customer and admin delivery evidence

Own-driver evidence now targets an additive private bucket, with order/business
scoped upload/read policies and short-lived authorized signed URLs. The backend
requires the uploaded object to exist, belong to the correct order and merchant,
and be submitted during the valid delivery transition. Arbitrary third-party proof
URLs are rejected. Customer and admin viewers resolve private references and show
an unavailable state on failure. Official legacy object URLs remain supported by
the backend for compatibility.

Production's existing `listing-photos` bucket is public. A read-only count found
**zero** objects under its legacy `/delivery-proofs/` path at inspection time.
Existing or subsequently uploaded legacy photos are not moved/deleted by these
migrations. Mixed-version clients need a coordinated rollout: old customer builds
cannot render new private object paths. Enforce supported viewer versions before
enabling updated vendor uploads. Do not deploy this protocol change independently.

### Payments, refunds and builders

The abandoned-card-auth worker now requests the API version supported by its
pinned Stripe SDK; its Supabase dependency is pinned. It previously failed its
TypeScript check. Live sandbox execution of the changed worker remains required.

Paid-card dispute notifications previously claimed the customer was not charged.
The migration now distinguishes refund processing and manual review, while
preserving the existing audited dispute transition and refund orchestration.

The builder validator now rejects unknown selection groups and missing prices.
Tests exercise pizza, burger and generic custom configurations with required
groups, size/ingredient availability, per-item/group limits, included ingredients,
quantities and server-calculated prices. These tests do not certify every live
merchant configuration or visual composition.

### Admin CMS and localization

The admin starter catalog incorporates customer literal CMS keys through
`scripts/sync-goodies-cms-catalog.cjs`. Existing named fields and saved translations
take precedence. Draft previews gained more page destinations, an isolated order
fixture for confirmation/tracking, all configured locales and zoom. Fixtures are
not saved to production and order/payment mutations retain preview guards.
Exact visual parity and every selectable element remain unverified.

Configured locales are `en`, `fr`, `ht`, `es`, `zh-Hans`. The single English
published v5 payload carries multilingual `Txt` objects. Its 782 labels contain:

| Locale | Populated | Marked reviewed |
| --- | ---: | ---: |
| en | 782 | 647 |
| fr | 129 | 0 |
| ht | 129 | 0 |
| es | 129 | 0 |
| zh-Hans | 129 | 0 |

Four archived English versions also exist. These figures establish a translation
coverage/review gap; they do not imply four missing per-language CMS records.
No text was falsely marked human-reviewed or published. Production fallback and
Haitian Creole review requirements have dedicated regression tests. New CMS keys
still require editorial review, translation, saving and controlled publication.

Latest application exports were rerun after the new changes: customer Android,
iOS and web, and admin Android and iOS all succeeded. These remain JavaScript/
Hermes bundles, not signed native builds. Current logs end in `-next.log`.

## Executed verification

| Check | Result | Evidence and limitation |
| --- | --- | --- |
| Original GPS commit present | PASS | Git ancestry verified before edits |
| Deno test suite | PASS | 47 tests, 0 failures; `evidence/edge-tests-next.log` |
| Scoped courier authorization and rollback | PASS | Synthetic PostgreSQL fixtures; actual new migration executed |
| Private evidence upload/read and submission rules | PASS | Synthetic PostgreSQL RLS and real migration; existing admin assertion and notification transport are fixtures |
| Standard price/options/promotions/tips | PASS | Existing SQL validators executed in isolated PostgreSQL |
| Builder limits/availability/prices | PASS | Existing validator plus candidate migration, synthetic pizza/burger/custom configurations |
| Refund and webhook decision logic | PASS | Existing tests, including partial refunds, retries and ambiguous-network behavior; mocked Stripe transport |
| Paid-card dispute notification/audit | PASS | Actual dispute function plus candidate migration; synthetic transport/auth dependencies |
| Account cache ownership | PASS | Pure cache-boundary regression tests; not a full device session test |
| GPS freshness/geometry/viewport rules | PASS | Pure regression tests; not physical GPS/routing-service validation |
| Translation fallback/review boundaries | PASS | Pure resolver tests; not human review or complete screen localization |
| Customer TypeScript | PASS | `tsc --noEmit`, exit 0 |
| Configured customer lint | PASS | `npm run lint`, exit 0 |
| Broader modified customer files lint | PASS | Exit 0 with warnings; no lint errors |
| Ten selected Edge Functions TypeScript | PASS | `evidence/edge-typecheck.log`; includes previously omitted auth-expiry/refund entrypoints |
| Customer Android/iOS JS/Hermes exports | PASS | Separate successful platform exports; evidence tails included |
| Customer web export | PASS | Existing CI export command, successful static bundle; not browser interaction verification |
| Admin Android/iOS JS/Hermes exports | PASS | Separate successful platform exports; evidence tails included |
| Expo Doctor, both repositories | PASS | 20/20 each; admin SDK-compatible dependencies aligned with Expo tooling |
| Admin TypeScript | PASS | Shared people/staff errors repaired; current typecheck exits 0 |
| Client source secret-pattern check | PASS | No matching secret Stripe/Supabase keys or service-role JWTs; not an exhaustive secret audit |
| Repository migration version uniqueness | PASS | 219 unique versions; five SQL-preserving renames and one identical duplicate consolidated |
| Five-language content coverage | FAIL | Published payload counts above; human review is incomplete |
| Full screen/control/end-to-end matrix | NOT VERIFIED | See screen register; no synthetic unit test is substituted for UI execution |
| Complete customer/vendor/staff/courier authorization matrix | NOT VERIFIED | Targeted new boundaries passed; full live role suite needs staging identities |
| Live sandbox card/wallet/cash checkout and reconciliation | NOT VERIFIED | Approved staging backend, sandbox credentials and role accounts unavailable |
| Concurrent checkout/refund/webhook requests against full backend | NOT VERIFIED | Pure/idempotency helper tests are not a full multi-connection financial race test |
| Push foreground/background/reopened-app delivery | NOT VERIFIED | Provider configuration, test recipients and devices unavailable |
| Geoapify live routing/service credentials | NOT VERIFIED | Deployed source inspected; authenticated external-service execution not performed |
| Signed Storage HTTP URL lifecycle | NOT VERIFIED | RLS tested locally; full Storage service execution needs staging |
| Physical GPS, permissions, background delivery and offline recovery | NOT VERIFIED | No physical devices available |
| Native Android/iOS compilation/signing | NOT VERIFIED | Bundle export does not establish native compilation; build credentials/toolchains unavailable |
| CMS draft/save/publish/consumer cross-role E2E | NOT VERIFIED | No production publication used as a test; staging users required |

## Backend drift and operational observations

[Migration comparison](migration-history-comparison.json) distinguishes exact
name/version matches, matching names with different deployed versions, and
unmatched repository names. Unmatched names are **not** automatically classified
as undeployed: several changes were applied under different migration names.
The pre-existing duplicate prefixes `202611010001`, `20261101080500`, and
`20261104130000` were reconciled using deployed metadata. Five files were renamed
without SQL changes; one executable-SQL-identical duplicate was consolidated.
See [reconciliation manifest](migration-version-reconciliation.json). Production
migration history was not modified. A full clean Supabase replay/baseline reconciliation remains
required before a blanket `db push` or new-environment bootstrap.

[Edge source comparison](edge-deployment-comparison.json) found the selected live
runtime sources aligned with repository sources, except a type-only export in the
refund processor and deployed per-function import-map files absent locally.
The new auth-expiry-worker change is intentionally not deployed. A missing local
import map alone is not proof of a broken deployed function.

Seven Goodies cron jobs were active, with aggregate scheduler execution records
showing successes in the preceding 24 hours. This establishes scheduler execution,
**not** successful Stripe/HTTP processing. Realtime publication includes orders,
assignments, courier presence, group orders/items/members, messages and notifications.

Security Advisor findings were reviewed as inputs, not treated as an automatic
authorization verdict. Server-only queues/caches with RLS and no public policies
were preserved. Remaining advisor findings and all existing SECURITY DEFINER
authorization paths have not received a complete adversarial role test.


## Additional implementation and verified contracts

- **Vendor/catalog:** grant only intended product columns, enforce existing merchant
  restrictions/ownership on writes, submit new/content-edited products for review,
  retain admin rejection decisions. Existing approved rows are not rewritten.
- **Admin:** canonical permission keys, signed-out/revoked/expired grant denial,
  Super Admin-only permanent-ban handling, real persisted appeal receive/uphold
  actions and audited reinstatement. Existing shared TypeScript failures are fixed.
- **Role integration:** vendor order/product-review notifications reach their real
  business destination; customer counters exclude role-owned notices. Submission
  notices reach the admin product review module. Read failures are surfaced.
- **Account/localization:** use existing `user_settings.language` for the exact five
  configured locales; add Chinese to the existing account-language list. Backend
  notification templates use only reviewed CMS translations. Draft templates are
  editable in the existing CMS; no translation is falsely marked reviewed.
- **Private evidence:** default-off, audited Super Admin rollout switch uses the
  protected existing CMS configuration. Compatible viewers must be distributed
  before enabling. Tests verify disabling uploads preserves private reads and
  unrelated financial settings. Legacy evidence remains public until switched;
  enabling requires an explicit coordinated rollout, not just shipping this code.
- **Migration integrity:** unique-version check added to CI; full clean bootstrap
  and production drift resolution are still NOT VERIFIED.

| Targeted check | Result | Evidence / limits |
| --- | --- | --- |
| Synthetic wallet checkout → vendor fulfillment | PASS | Actual schema/routines, authoritative price rejection, duplicate-key protection, debit, stock, notifications, valid/invalid transitions |
| Synthetic cancellation/refund | PASS | Real wallet routines, one refund on retry, ledger/balance/stock assertions; not provider card settlement |
| Product ownership/moderation | PASS | Actual RLS/ACL/triggers plus candidate migration; other-vendor and restricted-vendor writes denied |
| Permanent-ban/appeal authorization | PASS | Actual permission helper, synthetic identities; customer/scoped staff/expired/unconfirmed denied; Super Admin audited/idempotent |
| Admin permission regression tests | PASS | Four Node tests against real permission module; UI control rendering not established |
| Notification destination contracts | PASS | Two pure route tests; hosted PostgREST filter/push delivery still NOT VERIFIED |
| Reviewed notification locale resolution | PASS | Actual SQL and insertion trigger; human completeness still FAIL |
| Hosted full lifecycle, concurrency and recovery | NOT VERIFIED | Existing test project inactive; restore/compute approval requested, not yet received |

The schema-only fixture's [limitations](../../supabase/functions/goodies-tests/fixtures/README.md)
are deliberate: no real rows/secrets, no full Auth/Storage/PostgREST/provider stack,
no unrelated-domain foreign keys/shared triggers, no multi-connection race claim.
Tests are stronger than pure mocks but cannot substitute for hosted service E2E.

## Controlled rollout and recovery

1. Obtain an approved isolated Supabase staging project and role accounts, Stripe
   test mode, notification test recipients and routing configuration. The existing
   `Wantiss Security Test` project was inactive; it was not resumed or modified.
2. Reconcile the migration baseline in isolation. Apply the reviewed new migrations
   in timestamp order, then run the full cross-role/financial E2E and race suite.
   PGlite tests cover the targeted contracts, not the entire Supabase platform.
3. Review the private-proof mixed-client protocol gate. Deploy compatible viewers
   before permitting private vendor uploads, with an enforced supported app version.
4. Review and approve database/worker deployment separately. Deploy the additive
   courier RPC before its client. Publish reviewed CMS labels separately after
   checking that the protected financial policy is unchanged.
5. Record pre-deployment function definitions and ACLs in the deployment backup.
   Snapshot schema/configuration using the team's approved recovery mechanism;
   verify restore in staging before production changes. No restore is claimed here.
6. Before any client references the courier RPC, it can be removed transactionally;
   this was tested. After rollout, keep the additive function while supported
   clients depend on it. Never drop a bucket containing evidence for rollback.
7. For proof rollback, disable new uploads first, retain all objects/references,
   restore the reviewed function/ACL snapshot, and keep compatible signed-URL
   viewers. Never turn the private bucket public. Test this coordinated rollback
   with actual Storage in staging; it is currently NOT VERIFIED.
8. Restore the previous Edge Function artifact for the worker if required. Do not
   rewrite financial records to undo a release. Dispute/builder function rollback
   must use captured definitions/ACLs and preserve all existing order/audit data.

**Deployment approval is not a substitute for the failed/unverified release gates.**
The work here is a reviewable set of fixes and evidence, not completion of the
entire production-readiness assignment or approval to release Goodies.
