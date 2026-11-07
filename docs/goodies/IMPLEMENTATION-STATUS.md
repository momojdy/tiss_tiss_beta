# Goodies implementation status — 6 November 2026

**NOT PRODUCTION READY. Candidate fixes are implemented and locally verified; production remains unchanged.** This is not a completed release acceptance or a claim that every control has been authenticated-click-tested.

## Code delivered

Customer/backend repository `momojdy/tiss_tiss_beta`:

- `20d6418e45ef697db5b862a548aa70a3030f670b` — catalog permissions/moderation, order/driver review persistence and RLS, settings integration, admin pagination, publication review guard and isolated database tests.
- `9bf7e643d288995145a2d7a7f8923bc28a749a6f` — customer/vendor connections, safe failures, pagination, real pickup map, checkout locking, removal of production demo data/import controls, CMS registry and regression checks.

Admin repository `momojdy/tiss-admin`:

- `3825a1c368d3cd5e768ee1206a83835c3b2104da` — rejection reason UI, financial load guards, safe errors/retry states, paginated orders/couriers/reviews, builder permissions and publication controls.
- `9134139405423ccaa1158c25c6750d3b5025327e` — store hero and support-confirmation preview alignment, with source parity regression.

Exact changed-file lists: [code-changes.json](release-evidence/code-changes.json). All work stays on `goodies/production-readiness`; no production/main merge or force push. The courier freshness commit `75857548e48594429eb229d105412f2ee41fcacf` is an ancestor of the customer branch.

## Implemented fixes and verification

| Area | Candidate result | Evidence and limits |
|---|---|---|
| Vendor product save | PASS | Actual isolated SQL insert/update grants accept the gallery payload. Newly added primary/gallery images must use the owning business folder; cross-business/external photo attempts fail. |
| Moderation | PASS | Admin requires/sends a reason; actual candidate trigger preserves rejection metadata; vendors cannot self-approve or re-enable rejected products. Revised descriptive content returns to pending. |
| Rejected-product checkout | PASS | Actual order-lifecycle SQL attempts a purchase after vendor re-enablement; checkout is rejected and wallet/stock remain correct. |
| Customer reviews | PASS, isolated contracts | Completed-order ownership and ratings validated server-side; upsert prevents duplicate rows; raw private records restricted; public store projection omits customer identity. Driver review requires a delivery driver. Hosted UI/transport NOT VERIFIED. |
| Review display | Implemented | Consumer paginated reads and real rating summaries; vendor/admin paginated review views; loading/error/retry states. Authenticated visual/realtime acceptance NOT VERIFIED. |
| Production fixtures | PASS, source/regressions | Removed customer sample stores/reviews/promotions and demo import controls; no seeded builder fallback. Admin preview fixtures remain isolated and clearly identified. |
| Vendor storefront link | PASS, synthetic + SQL | Business-owned choices replace demo stores, changed selection reaches save; server refuses another business's store. Unchanged links are omitted to preserve ordinary shared account edits. |
| Vendor order items | PASS | Canonical `q/n` snapshots render correctly; declined/expired orders are not counted as open; platform deliveries are not offered the generic vendor-complete shortcut. |
| Removed stores/history | PASS, targeted regressions | Store, tracking, order history and reorder tiles have fallbacks instead of dereferencing absent catalog stores. Full installed-app lifecycle NOT VERIFIED. |
| Pickup map | PASS, component regression | Valid stored coordinates render a real map/marker; missing coordinates show unavailable state. Physical map rendering/permissions NOT VERIFIED. |
| Error privacy | PASS for tested sinks | Safe receipt/admin/vendor messages; removed keyword-based raw-error pass-through; shared MFA/preferences and CMS errors use safe copy. Remaining scanner candidates are not automatically leaks, and full runtime coverage is NOT VERIFIED. |
| Financial feedback | PASS, targeted regressions | Failed/malformed payout and overview summaries cannot appear as zero money. Payout request disabled without a valid summary. Fee saves require successful valid configuration loading. This does not implement settlement. |
| Loading/failure states | Implemented | Catalog, order history, ingredient requests/assets, cash policy, admin dashboard/couriers/analytics/reports and card WebViews have explicit handling. Runtime screen-by-screen verification remains outstanding. |
| Pagination | PASS, contracts/regressions | Customer history uses a stable cursor and account/race guards; vendor products/orders/reviews and admin orders/couriers/reviews have paging. SQL tests reach records beyond prior caps and enforce admin permissions. |
| Checkout feedback | PASS | Lock starts before asynchronous validation; duplicate in-flight calls suppressed; failure releases lock; busy button state visible. Existing server idempotency remains authoritative. |
| Notification preferences | PASS, isolated SQL | Uses existing `user_settings`, preserves other preferences/defaults, falls back to shared Wantiss preferences, and filters matching customer notification inserts. Actual push-provider delivery NOT VERIFIED. |
| Builder editor | Implemented | UI requires operations edit access; save explicitly says it updates the live builder separately from page drafts; denied requests excluded. Server still controls merchant price/free/availability fields. |
| CMS field coverage | PASS, source/local round trip | 1,253 registered fields and 33 consumer routes; editable text resolves in the five configured locales. This is not hosted publication proof. |
| Critical translation publication | PASS, isolated SQL | 612 critical field keys covered; explicit draft/missing critical translations and placeholder FAQ answers are rejected. Unreviewed English cannot bypass review as fallback. Fee-only updates remain compatible. |
| Private delivery proofs | PASS in isolated policy tests; FAIL on live deployment | Existing prepared private-bucket/rollout migrations tested; live bucket/capability still absent. No rollout flag enabled and no legacy objects modified. |

## Test/build results

- PASS — 53 Deno assertions/tests across targeted database, authorization, pricing, builder, order/refund, delivery proof/GPS and notification suites. **One is an intentional reproduction of the captured broken main moderation function; it confirms a live-baseline defect, not readiness.** Other provider tests use synthetic/mocked transports.
- PASS — 23 source-function test cases. **One asserts the captured live gallery grant mismatch; it is deployment-blocker evidence.** The other 22 are candidate regressions, including checkout locking/history races and failure truthfulness.
- PASS — four customer CMS tests; 17 admin access/CMS/preview tests.
- PASS — TypeScript in both repositories; configured customer lint and additional new-file lint; `git diff --check`.
- PASS — fresh Android and iOS JavaScript/Hermes exports for customer and admin. These are not signed APK/AAB/IPA builds.
- PASS — migration failure injection rolls back partial review schema, followed by a successful clean retry in isolation.
- NOT VERIFIED — hosted multi-principal UI click-through, live CMS save/preview/publication/cache invalidation, sandbox payment/webhook/refund lifecycle, live race/load tests, signed builds, GPS/background/offline/reassignment and push on physical devices.

Logs and checksums are under [release-evidence](release-evidence/). No real customer transaction or charge was used. The inactive security-test Supabase project was not restored.

## Current live backend and release blockers

Read-only main inspection still reports migration `20261104211532` as latest. Ten candidate RPCs and the new reviews table are absent; private proof storage is absent. See [live-deployment-contracts.json](release-evidence/live-deployment-contracts.json). Therefore candidate backend fixes are **not yet live**, and deploying clients alone is unsafe.

**FAIL — vendor settlement remains unimplemented in the referenced live flow.** `wallet_ledger`, `dashboard_range` and payout RPCs referenced by Business Space are absent. Order commission snapshots do not establish a spendable payout balance. An approved provider, recipient/hold policy and cash-commission treatment are required before settlement can be implemented and tested. Other missing generic Business Space RPCs still affect shared activity/registration/promotion/search paths; they are not all Goodies-specific and were not fabricated as compatibility shims.

**PASS — local preview route implementation and regression checks.** The preview now derives all 33 routes from the source catalog and mirrors the current group-order/add-card/card-authentication components behind isolated local transports. Field identities handle duplicate/dynamic text. **NOT VERIFIED — authenticated visual interaction and hosted edit → publish → customer reload.** External bank/camera surfaces have explicit preview boundaries. See the admin repository `docs/goodies/step1/README.md`; no production content or schema was changed.

**Content not ready.** Approved terms/privacy/refund text and human-reviewed translations were not supplied. Five FAQ answers and five support topics now have five-language draft suggestions in [content-review-draft.json](content-review-draft.json), all explicitly marked draft/assistant-authored. Nothing was published or falsely marked human-reviewed. A per-field/locale [acceptance ledger](release-evidence/cms-acceptance.csv) separates synthetic checks from human/hosted verification.

**NOT VERIFIED — provider/device/release credentials and tests.** No approved hosted role accounts, payment sandbox or physical devices were available in this task. Linux has Java but no Xcode/adb/Gradle/native project; configured runtime capabilities supplied no signing/provider credentials. Actual delivery routing service configuration and installed production-client revision remain unverified.

Security advisor was rerun read-only: ten no-policy server-only table findings and 82 authenticated SECURITY DEFINER routine findings remain for review, not 92 proven vulnerabilities. Do not open intentionally private queues/cache tables indiscriminately. The full hosted role matrix is not certified by fixture-based tests.

## Inventory and publication scope

The current inventory spans 99 source files and 1,298 event/callback bindings: 332 belong to isolated preview code, 966 to live/shared code. It includes handler/call traces and unresolved dynamic calls, not an authenticated press of every button. [controls.csv](release-evidence/controls.csv) deliberately keeps runtime status NOT VERIFIED.

319 comment blocks and 72 copy candidates are recorded. Useful security/compatibility comments remain; removing comments does not repair integrations. Isolated preview notices are necessary. Production demo review/store/builder paths and misleading support/developer-facing copy identified in the repaired paths were removed or corrected.

No claim of 100% completion or production readiness is supported. See [DEPLOYMENT.md](DEPLOYMENT.md) for the concrete prepared backend package and its safety/recovery sequence.

## Step 2 follow-up — customer/vendor connections

Review account/store isolation, post-save refresh, authoritative summary refresh and persisted history comments received additional fixes and local tests. Existing storefront, sample removal, vendor item, removed-store and pickup-map regressions were rerun. [Step 2 evidence](step2/README.md) separates candidate PASS results from main's confirmed missing review contracts/storefront save behavior and unverified device/hosted acceptance. No production schema or content changed.

## Approved-language publication with pending Creole

The editor and a forward backend migration now permit pending Creole to remain unavailable while reviewed English supplies fallback. Four-locale approval and normal publisher authorization remain enforced; FAQ placeholders still block publication independently. See [Creole fallback evidence](creole-fallback/README.md). Candidate/local PASS does not establish deployed or authenticated publication acceptance.

## Step 4 approval and deployment preflight

**Deployment is paused by the subsequent user instruction.** The earlier step-4 approval is superseded. The local package now includes 14 candidate migrations; none were applied during this repair pass. Hosted role/provider/device tests, recovery-point verification and signed release targets remain outstanding.


## 7 November recovery fixes

See [verified repairs and remaining blockers](repairs-20261107/README.md). Seven source failure paths were repaired, the source CMS register now has 1,267 labels and the package includes 14 candidate migrations. Deployment remains paused. These local results do not supersede missing hosted/provider/device acceptance.
