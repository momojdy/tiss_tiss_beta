# Goodies production readiness — 17 November 2026

> Historical snapshot. The [follow-up audit](../deep-audit-20261117/README.md) records subsequent defects, verified repairs, approved pushes and current release blockers.

**Goodies is not approved for production release.** All work available in this environment is implemented and the checks below pass. Hosted acceptance, provider/device verification, content approval and deployment remain outstanding. Nothing was deployed, no production financial rows or secrets were changed, and no commits were pushed.

Verified source is on local `main` in both repositories:

| Repository | Verified source commit | Newer remote main preserved by merge |
| --- | --- | --- |
| `momojdy/tiss_tiss_beta` | `dbb421dac5ec788d29564998249ecb3bee92aa82` | `2ff6f0836d9f835b75175a06cdb47e2c5ede688f` |
| `momojdy/tiss-admin` | `be410637a3550ce056e9ac5a7f1ec4e9e23408a6` | `f5c0a14ad284e5ca8f37684ae6cb5c91491523b2` |

Later documentation commits do not change these verified app sources. [Commits and changed files](commits-and-files.json) records the local commits, merge parents and files changed relative to fetched remote main. Existing work and commit history were preserved. The earlier readiness checkouts remain untouched. The original GPS commit `75857548e48594429eb229d105412f2ee41fcacf` remains available; the current tracking implementation retains timed freshness checks and has executed freshness/route tests.

## Acceptance evidence

| Requirement | Classification | Executed evidence and limit |
| --- | --- | --- |
| Automated regression suites | **PASS** | **210 tests:** 85 customer, 33 admin, 29 cross-source reproductions, 63 Deno backend tests with 43 additional steps. Source/native transports in client tests are synthetic; these counts are not hosted E2E passes. |
| Real PostgreSQL financial concurrency | **PASS** | **13 overlapping races** in a newly created PostgreSQL 17.6 cluster: five settlement/group races and eight Shared Bill races. Lock contention is observed. Only synthetic Wallets/orders/stock are used. A stale group quote is also rejected before debit. |
| Shared Bill funding and exactly-once checkout | **PASS** | Actual synthetic Wallet debits for host 60%, multiple contributors covering 40%, and one-friend full payment. Concurrent creation, duplicate keys, competing final payers and distinct simultaneous contributions create one paid owner order and one stock reservation. |
| Cancellation, expiry and financial recovery | **PASS** | Per-payer refunds once; failed finalization refunds every contributor; durable pending refunds, backoff, eight-failure escalation and audited finance retry; vendor rejection restores stock once. Status polling across expiry cannot refund a concurrently fulfilled order. App-journal tests cover lost-before-dispatch, lost-after-commit, restart, storage failure and account changes. |
| Authorization | **PASS** | Executed isolated anonymous/customer/other-customer/vendor/other-vendor/courier/admin/restricted-role checks across the backend suites. Shared request UUIDs are intentional payment-link capabilities: signed-in recipients receive minimal payable status, not private checkout/address data or order ownership. Accepted-friend invitations are creator-authorized and deduplicated. |
| Pricing/builders/promotions/fees | **PASS** | Server exact-cent amounts and aggregate stock validation; tampered totals, discounts and builder selections rejected; disabled builders refund; promotions and real owner-scoped quotes are consumed once on final funding. First-delivery eligibility ignores pickups consistently across checkout variants. Malformed fee responses fail visibly instead of displaying zero. |
| Product management/moderation and reviews | **PASS** | Latest deployed vendor RPCs remain compatible. Rejection reasons are enforced and availability cannot bypass moderation. Material product edits return to review. One deployed review table/API is preserved; completed-order ownership, assigned-courier review eligibility, pending/approved/rejected publication, private reads, paging and audited idempotent moderation are tested. |
| CMS coverage/navigation | **PASS** | **34 actual customer routes**, **1,510 registered fields** in **67 page/shared groups**, and **117 literal navigation calls** with zero unknown destinations. No missing source handlers in the control inventory. This establishes source coverage, not successful execution of every hosted button. |
| Actual editor preview | **PASS** | All 34 customer routes render locally. **14 interactions** verify explicit selection, draft rerender, locale preview, structured FAQ/support/policy content, zoom and transport isolation. The actual shared Wallet contribution screen has its own preview entry and passes selection/draft-edit acceptance. Checkout now renders its actual form rather than an unavailable-store fixture. Native fonts/icons/maps/provider views use explicit test adapters. |
| Demo/unused-page cleanup | **PASS** | Unused customer builder templates, vendor library seed, production demo provider/reset/ID-result/payment/notification paths and unused admin CMS seed are removed. The real `HelpPayPreview` page is now named `HelpPay`. All 45 scoped customer source files and 62 scoped admin files are reachable from their application entries. Required CMS fixtures and active vendor authoring presets remain isolated or explicitly user-selected. |
| Delivery/map correctness | **PASS** | Location freshness, future/invalid GPS, real route segments, long-route viewport calculations, quote ownership and delayed Shared Bill route/coordinate persistence pass isolated tests. No production movement is simulated and no straight line is presented as road geometry. Physical behavior remains unverified below. |
| Typechecks/dependencies/lint | **PASS** | Both complete application TypeScript checks and relevant Edge Function checks pass. Expo Doctor **20/20**. SDK-required `expo-dev-client` patch installed through Expo. Configured lint passes; expanded scoped lint has **0 errors, 264 warnings**. Pattern scan of paired clients finds no embedded privileged Supabase JWT/private provider key. |
| Export checks | **PASS** | Customer Android/iOS/web and admin Android/iOS Expo bundle exports. **These are not signed Android/iOS native builds.** |
| Four-language content preparation | **PASS** | 6,816 resolver lookups verified, existing 775 Haitian fields preserved, financial/non-text configuration unchanged. Four-language machine approval is recorded as user-authorized, never human-reviewed. Unfinished Creole uses reviewed English in production. No content was published. |
| Publishing prepared FAQ content | **FAIL** | The publication guard correctly rejects five existing placeholder FAQ answers. Required policy/support content and final content review remain deferred by the user. |
| Hosted rollout and device/provider acceptance | **NOT VERIFIED** | See release blockers below. |

## Implemented changes by surface

- **Customer:** safe cart/history recovery, real persisted feedback, server-backed pricing/options/availability, accurate financial and loading/retry states, owner-scoped cache recovery, connected account preferences and routes. Newer main delivery quotation/prefetch and catalog fixes are retained. Shared Bill uses a durable account-bound journal and synchronous confirmation locks; unknown payment outcomes recover before another intent can debit.
- **Vendor:** secure business-scoped product-save/availability RPCs, preserved rejection decisions, real storefront linkage and feedback, safe historical item contracts, pagination and truthful financial failures. Existing settlement rules remain: 5,000 HTG outstanding cash **sales** allowance, 24-hour dispute hold, weekly settlement; eligible Wallet payouts instant, external digital two days and bank 7–14 business days under the prepared operational controls.
- **Admin:** mandatory rejection reasons, review publication/moderation with a single backend contract, permission-controlled Shared Bill refund queue/retry and audit records. Newer main role-template actions continue to fail closed where server persistence is unavailable; the prepared server-backed restriction-appeal integration is retained.
- **Courier/delivery:** assigned-order permissions, private proof rollout, honest stale/unavailable GPS states and real quote geometry. Exact quote identifiers survive checkout long enough for the order trigger to retain the real route even after the older six-minute fallback window, then are removed from public order addresses.
- **CMS:** source-derived page/field organization, native-text selection binding, corrected promotion identity binding, complete checkout fixture and actual shared Wallet contribution preview. Every preview backend/storage/device call uses local ports. Funding, refund, activation and invitation RPCs are explicitly blocked in preview tests.
- **Backend:** current deployed schema reconciled with the pending migrations, exact authoritative cents, refreshed canonical Shared Bill finalizer, serialized Wallet locks, creator order ownership, refund retry/attention records, restricted finance actions and compatible moderated reviews. No duplicate review backend/table was introduced.

## Backend package and recovery

[Migration package](migration-package.json) provides the **17 pending files in tested order with SHA-256 hashes**. Three separately deployed history entries are captured in the repository under their actual 14-digit versions: product moderation `20261116132657`, route geometry `20261116133531`, and reviews `20261116135012`. Duplicate 12-digit candidate files from newer main were reconciled into that deployed history and the compatible pending package; their original commits remain in history.

The final read-only live observation is [live-baseline.json](live-baseline.json): Wantiss `ycbirmgppwavorwudlrv`, migration head `20261116135012`, 356 history entries, review table present, new Shared Bill integrity configuration absent. The package was tested over a schema-only fixture of these deployed changes, with synthetic records only. Matching [RPC named-argument contracts](rpc-contract-audit.json) yields 151 matches, zero mismatches and 27 dynamic/legacy cases explicitly **NOT VERIFIED**. A signature match is not runtime authorization acceptance.

Review [security advisor evidence](live-security-advisors.json) with the [Supabase advisor guide](https://supabase.com/docs/guides/database/database-linter). Privileged RPC warnings and RLS-with-no-policy notices on intentionally private server tables are not automatically vulnerabilities. The tested candidate revokes private helpers and guards public operations; it has not been applied to production.

Deployment must use the exact reviewed file list after a fresh drift/backup check. Several pending versions precede the live migration head; do not run an unrestricted database push against unmatched historical migrations. The earlier 12/15-file approval package does not cover new file contents or this 17-file package.

Injected failures verify atomic rollback and retry for review integration, Shared Bill integrity and the moderation upgrade. After activation/financial traffic, recovery should pause new funding, keep status/refund recovery operational, reconcile pending records and use a reviewed forward fix. Do not drop financial tables, reset records or blindly restore old functions. A production backup/PITR restore drill remains **NOT VERIFIED**.

Shared Bill remains closed by both the production build flag `EXPO_PUBLIC_GOODIES_SHARED_PAYMENTS_RELEASED` and the new protected backend funding flag. Both must stay off until hosted acceptance and release approval. Preview-only flags merely display local forms and cannot reach production or move funds. Private-proof and settlement rollout gates also require their documented acceptance/reconciliation before activation.

## Remaining release blockers

1. **NOT VERIFIED — hosted cross-role acceptance:** approved signed-in customer, vendor, courier, admin/staff accounts and approved test balances; discovery → checkout → acceptance → handoff/delivery → confirmation → oversight, including cancellation, offline/restart, retries and denied cross-account access. Isolated tests do not substitute for this.
2. **NOT VERIFIED — payment providers:** approved sandbox credentials/configuration for actual card authorization, authenticated webhook delivery/replay, partial/full refunds and provider reconciliation. Wallet-only isolated tests required no provider credentials.
3. **NOT VERIFIED — devices/native release:** Android Google Maps key and package/signature restrictions, verified Geoapify deployment configuration, signed Android/iOS builds and physical-device GPS/background location/offline/push behavior. Expo exports and the browser preview cannot establish these.
4. **FAIL / NOT VERIFIED — content acceptance:** replace the five tested FAQ placeholders; supply approved required policies/support content; verify hosted edit → draft preview → publish → installed app reload. Preserve the user's Haitian human-review ownership and English fallback.
5. **NOT VERIFIED — operational rollout:** approved production backup/recovery verification, fresh schema drift review, exact migration/Edge Function/app deployment approval, hosted regression and only then gate activation; opening settlement reconciliation/external payout operations must also be approved before their gates open.
6. **NOT VERIFIED — repository publication:** explicit approval to push the prepared commits to remote `main` is still required. GitHub CI for these local commits has not run. No application/database deployment was performed.

## Reproduction and detailed records

- [Verification summary](verification.json), [screen register](screen-verification.json), [navigation](navigation.json), [reachability](reachability.json).
- [Source/control summary](source-controls-summary.json) and [complete compressed machine inventory](source-controls.json.gz). Decompress with `gzip -dc source-controls.json.gz > /tmp/goodies-source-controls.json`; full source traces retain **NOT VERIFIED** runtime classifications unless an executed test establishes behavior.
- [CMS routes](cms-route-results.json), [CMS interactions](cms-interaction-results.json), [edited preview screenshot](cms-draft-preview.png).
- [Logs](logs/), [file hashes](evidence-manifest.json), [migration hashes](migration-package.json), [commits/files](commits-and-files.json).

Run the existing `npm run test:goodies`, `npm run test:goodies-cross-role`, CMS/migration/secret checks, TypeScript/lint and Deno suites. CI runs the native PostgreSQL runner with `--shared-bill` inside a pinned, network-isolated PostgreSQL container. No new testing framework or production credentials are needed for these isolated checks.
