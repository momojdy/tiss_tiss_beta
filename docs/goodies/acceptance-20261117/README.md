# Goodies acceptance and deployment proposal — 17 November 2026

**Production readiness remains blocked by deployment approval and external acceptance.** The implementations and available checks below are complete. No production migrations, Edge Function deployments, content publication, real charge, financial record edit or secret change was performed.

Verified source is pushed to `main`:

| Repository | Source commit |
| --- | --- |
| Customer/vendor/backend | [`36147270e86a031272096ec1eb37bec42283d190`](https://github.com/momojdy/tiss_tiss_beta/commit/36147270e86a031272096ec1eb37bec42283d190), following the main implementation [`554dc46f`](https://github.com/momojdy/tiss_tiss_beta/commit/554dc46fa4c295dfb6977d2ec5d0f0375945c76d) |
| Admin | [`b59ac40eb57c32eae0b9245a61e29729f45c4eaf`](https://github.com/momojdy/tiss-admin/commit/b59ac40eb57c32eae0b9245a61e29729f45c4eaf), following FAQ acceptance [`fac7a82`](https://github.com/momojdy/tiss-admin/commit/fac7a82ac10bc43ff6c82837e1a51ab1a86ffeaa) |

Report-only commits may follow. [Exact commits and changed files](commits-and-files.json), [machine results](verification.json), [CI receipt](ci-verification.json) and compressed [execution logs](logs) retain the evidence.

All three source CI runs completed successfully: [customer validation](https://github.com/momojdy/tiss_tiss_beta/actions/runs/44096944215), [customer TypeScript/bundles](https://github.com/momojdy/tiss_tiss_beta/actions/runs/44096944439) and [admin validation](https://github.com/momojdy/tiss-admin/actions/runs/44098183861). The customer workflow pins admin `019281e`; the verified admin head changes only the lockfile from that pin. Admin application and contract sources are identical.

[Source baseline](source-baseline.json) records the main-branch ancestry: the original GPS commit `75857548` remains in the preserved readiness history, and its timer/cleanup behavior is retained on main through ancestor `feda699f`. [Package integrity](package-integrity.json) verifies all 36 reviewed source/build file hashes and the FAQ browser payload binding. [Native access checks](native-access.json) record the missing build inputs without recording secret values.

## Implemented and verified

| Classification | Requirement | Evidence and limit |
| --- | --- | --- |
| **PASS** | Replace FAQ placeholders | Five factual FAQ answers in `en`, `fr`, `es`, `zh-Hans`. The [publication candidate](../content-acceptance-release/README.md) has zero schema/publication-review errors. No live publication occurred. |
| **PASS** | Preserve translations and current financial policy | 6,816 locale lookups; 775 existing Haitian entries unchanged. The candidate preserves a newer live fee-only edit discovered during the baseline comparison. Preparation rejects other content/version drift. [CMS drift review](cms-drift-review.json). |
| **PASS** | Real CMS publication semantics in isolation | Actual draft/publish RPCs: customer/anonymous denial, editor save with publish denial, financial-policy protection, draft isolation, authorized publication, public consumer projection, audit logging and failed-publication rollback. Five SQL test steps. This is not a hosted publication/device reload. |
| **PASS** | FAQ rendering in the actual customer Help screen | [25 browser cases](faq-preview.json): five FAQs in all five configured locales, with reviewed-English fallback for unfinished Creole. Exact candidate payload hash recorded; external requests, publication and payments blocked. Native widgets use the existing explicit preview adapters. |
| **PASS** | Cross-role Wallet delivery in isolation | Actual server quote → one Wallet debit/order/stock reservation → vendor acceptance/preparation/ready → approved courier assignment/acceptance → authorized location update/pickup/delivery → matching customer/vendor/admin state and correctly addressed notification records. Other identities denied. Five SQL steps; no physical GPS or push provider. |
| **PASS** | Prevent raw API error disclosure | Seven executed failure paths in six Edge Functions return application-owned text instead of database/provider errors. Six original reproductions failed before repair. Includes per-store route failures and checkout/refund/worker/webhook outer failures. This repair is committed, not deployed. |
| **PASS** | Preserve deployed Stripe API behavior | Read-only deployed source comparison caught a worker API mismatch. The candidate retains `2026-08-26.dahlia` using compatible pinned `stripe@22.6.2`; an in-memory HTTP test verifies the actual request header. Provider sandbox behavior remains unverified. |
| **PASS** | Hosted anonymous/public read checks | Six actual Wantiss HTTP checks: private order/assignment/refund-queue/Wallet requests denied, settings returned no private rows, and public CMS served Goodies v5. [Results](hosted-readonly.json). Empty results do not establish all authenticated boundaries. |
| **PASS** | Hosted webhook/card denial checks | Missing/invalid Stripe signatures return 400; anonymous checkout/refund requests return 401. Empty bodies only, without order/payment identifiers or valid event signatures. [Results](hosted-edge-denials.json). This does not establish a valid sandbox payment/refund lifecycle. |
| **PASS** | Release build preparation and SDK compatibility | Registered app-ID/Expo-project inputs and an EAS store profile are prepared. IDs were not invented. Expo Doctor **20/20 in both repositories** after required SDK 58 alignment; native browser plugin included. Both application typechecks, six Edge checks, configured/changed-file lint and secret-pattern scans pass. |
| **PASS** | Automated and bundle verification | **252 tests:** 106 customer, 33 admin, 47 cross-source, 66 Deno backend tests, plus 53 Deno steps. **13 PostgreSQL races** in a fresh socket-only PostgreSQL 17.6 cluster; full 17-migration candidate applied with synthetic data. Customer Android/iOS/web and admin Android/iOS bundle exports pass. These are not signed native builds. |

The SDK changes are compatibility updates within SDK 58, including file upload/copy fixes. The existing screen layouts, styling, navigation and architecture were preserved. Server financial authorization and state transitions were not weakened to make tests pass. The captured shared profile ACL permits own-profile reads but prevents normal authenticated callers changing profile `role` or `id`; the isolated fixture now reflects that dependency rather than granting broader access.

## What still fails in production

| Classification | Production requirement | Current result |
| --- | --- | --- |
| **FAIL** | Required courier/settlement/Shared Bill/private-proof contracts present | The live ledger remains at `20261116135012`, 356 records. All 17 reviewed migrations are still pending. Required RPCs/configuration and the private proof bucket remain absent. The final [read-only metadata check](production-contract-check.json) reconfirms this. |
| **FAIL** | Placeholder-free published FAQ | The actual public CMS endpoint still serves five old FAQ placeholders. The repaired candidate passes publication review but has not been published. |
| **FAIL** | Safe deployed API error responses | Read-only deployed source confirms the old raw-error response paths are still present. [Source version/hash review](edge-source-review.json) identifies the exact six deployed versions. The source fixes need approved deployment. |
| **NOT VERIFIED** | Every signed-in hosted button and authorization path | Approved customer/vendor/courier/admin/staff sessions and test balances are not configured. Isolated SQL roles do not substitute for real signed-in application acceptance. |
| **NOT VERIFIED** | Complete provider sandbox lifecycle | No approved sandbox access is configured for real test-mode charges, successful authenticated webhooks, replay/retry handling, provider refunds and reconciliation. The live keys' mode was not assumed, and production secrets were not read or changed. |
| **NOT VERIFIED** | Signed native/device acceptance | No Expo account/project access, signing access, registered production IDs or Maps configuration is supplied. No Android SDK/ADB or physical Android/iOS device is attached; Xcode is unavailable. GPS/background/offline/reassignment, installed-app notifications and reopen behavior require the signed apps/devices. |
| **NOT VERIFIED** | Hosted CMS publication through installed-customer reload | Requires approved publication and an authenticated installed consumer. Public content retrieval and isolated publication tests pass; the complete hosted cycle remains unexecuted. |
| **NOT VERIFIED** | Production recovery and final content | A current backup/restore point and recovery operator must be confirmed before applying the package. Approved legal content and the super admin's Haitian Creole review remain as previously deferred. No legal text or human review was invented. |

## Concrete production proposal awaiting approval

[production-change-plan.json](production-change-plan.json) freezes the exact **17 migrations, six Edge Functions and FAQ payload**, including file hashes, current deployed function versions, source review and feature gates. All migration hashes match the earlier tested package; ledger reconciliation confirms none are recorded as applied.

The FAQ payload SHA-256 is `158305e5b8f5599a04411735f22741e6025ca734093a0b8548b922e243997d73`. Its live source record is English version 5, payload SHA-256 `21d6d4ddb13066e66b3bb0dda229e20550f54774c084448389bcb406525b837a`. Financial policy must still come from the current live record through the existing fee-protected CMS RPCs.

Before applying: explicitly lift the user's earlier **“do not deploy”** instruction, confirm a current backup/restore point, and repeat drift/hash checks. Preserve ledger identity when the deployment tool assigns migration versions; do not replay unrelated history or use a blanket `db push --include-all`. After applying, run [postdeployment-readonly.sql](postdeployment-readonly.sql), check definitions/ACLs/bucket/gates, and execute approved hosted tests before activation.

This proposal does **not** enable settlement, new Shared Bill funding, private-proof uploads or external payout channels; does not backfill historical financial balances; and does not release an app/OTA update or change production secrets. Those gates remain subject to their existing acceptance and opening-reconciliation requirements.

## Access required to finish the remaining checks

Use secure environment bindings, not passwords or privileged keys pasted into chat or clients:

- Approved hosted test sessions for customer/vendor/courier/admin/staff, with explicitly approved test balances.
- An approved provider sandbox/test-mode setup and webhook test access. Existing Wallet SQL tests require no provider credentials.
- Expo/EAS account/project access and signing permissions. Configure the existing registered values through `WANTISS_ANDROID_APPLICATION_ID`, `WANTISS_IOS_BUNDLE_ID`, `WANTISS_EAS_PROJECT_ID`, plus the restricted `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`. No `service_role` key belongs in these build inputs.
- Physical Android and iOS devices for the final GPS/background/push/reopen checks. A simulator or JavaScript export cannot pass those device requirements.

The earlier [screen/control inventory](../deep-audit-20261117/screen-verification.json) remains available. Untested hosted controls retain **NOT VERIFIED**; their status has not been changed simply because the new local and negative-authentication checks pass.
