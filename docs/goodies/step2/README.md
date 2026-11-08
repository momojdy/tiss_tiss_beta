# Step 2 — customer/vendor feature connections

2026-11-06. Scope: item 2 in the user's numbered implementation list. **Candidate code and local verification complete; live activation blocked by production deployment approval and recovery confirmation. Overall Goodies is NOT production ready.**

## Implemented in this step

- Review pages bind their rows, loading/error flags and pagination to the current store and account. A failed store/account switch cannot reveal the previous page's cached reviews. Late responses are ignored.
- A successfully persisted store review refreshes the matching store page and server rating summary. Refreshes queued behind an in-flight page are not lost; retries replace local reviews for the same order. Invalid/failed rating summaries show the existing unavailable state, preserving cached numbers internally rather than fabricating zero ratings.
- Saved store and driver comments/ratings are restored from server records for the initial history page, older pages and notification/deep-link order loads. Account guards run again after review reads. Failed reads preserve valid cached reviews.
- Seven deterministic regressions execute the actual review hook and hydration helper. CI now runs them. Three additional source-function regressions cover save/retry refresh, account switches during history hydration and customer/page-scoped backend reads.
- Extended the existing isolated SQL suite with anonymous/cross-customer denial, invalid ratings/targets/comments, safe public projection, shared account edit compatibility and explicit storefront unlinking. Existing completed-order ownership, other-vendor isolation, idempotency, storefront ownership and transactional migration recovery tests still pass.
- Regenerated the CMS source location register and refreshed the admin preview's customer source hash. All 1,253 registered fields and 33 routes remain covered. No screen layouts, styles, copy, navigation structure or production configuration changed.

## Step 2 acceptance ledger

| Requirement | Candidate / local evidence | Hosted or device result |
| --- | --- | --- |
| Persist customer reviews and display real reviews | PASS — actual isolated SQL migration tests; real client hook regressions; successful-save refresh and summary reload | FAIL — required review table/RPCs are absent on main |
| Remove sample reviews/builders and demo storefront choices | PASS — existing source regressions A06/A17, vendor-owned storefront query; prior implementation preserved | NOT VERIFIED — installed production client revision |
| Save selected vendor storefront | PASS — A13 payload regression and actual SQL own-store/cross-store/shared-edit/unlink cases | FAIL — current main save function does not handle `goodies_store_id` |
| Secondary vendor order-item snapshots | PASS — A14 canonical quantity/name source-function regression | NOT VERIFIED — authenticated vendor interaction |
| Removed stores and historical orders | PASS — A07/A08 and paging/account guards; saved review comments restored | NOT VERIFIED — installed-app lifecycle |
| Pickup maps use available coordinates | PASS — A09 map/marker and unavailable-state component regression | NOT VERIFIED — physical map rendering/location permissions |

## Verification evidence

- PASS — 7 new hook/hydration regressions (`review-tests.log`).
- PASS — 26 source-function tests (`source-regressions.log`). One deliberately asserts a captured broken main gallery grant; that passing reproduction is **defect evidence**, not a production-readiness pass. The other 25 verify candidate behavior.
- PASS — 2 SQL tests (`sql-tests.log`) executing the existing candidate migration against a fresh in-memory PGlite Postgres fixture, including injected failure rollback/retry. No hosted project was created/restored and no real customer rows or money were used. This is not full Supabase Auth/PostgREST/realtime or multi-connection concurrency acceptance.
- PASS — 4 customer CMS tests; 4 admin access and 17 admin CMS tests.
- PASS — TypeScript in both repositories, configured customer lint, and `git diff --check`. Review/hydration-file lint is clean. Broader changed-file lint has zero errors and 18 existing Sheets warnings (unused imports/loose equality); they are recorded separately.
- PASS — fresh Android/iOS customer JavaScript/Hermes exports. Signed native builds/device testing remain NOT VERIFIED. Admin runtime code did not change in this step; its updated source manifest passed provenance tests.
- NOT VERIFIED — hosted customer/vendor/admin role sessions, realtime behavior, installed-app interaction, provider/GPS/device acceptance and production backup restoration.

## Confirmed main drift and concrete deployment boundary

`live-contract.json` records read-only metadata from Wantiss `ycbirmgppwavorwudlrv`. Main remains at migration `20261104211532`. The reviews table and three review RPCs are absent. The existing shared business-save function body was inspected: it updates the existing business fields but ignores the storefront selection.

The required candidate is [20261106081225_goodies_reviews_preferences_and_store_link.sql](../../../supabase/migrations/20261106081225_goodies_reviews_preferences_and_store_link.sql), SHA-256 `d7461538209e3b9fee3c37702db34efe68a7e56b8ee73376b582ca73e0ecb876`. It was not changed in this step. It creates review storage/RPCs and ownership policies, adds compatible shared settings support and validates/persists the storefront link in the existing shared business-save RPC. See [DEPLOYMENT.md](../DEPLOYMENT.md) for the ordered full candidate package, cross-feature dependencies and recovery protocol. Do not bulk-deploy unrelated repository migrations.

The user's production safety instruction requires explicit approval before potentially disruptive schema changes. A usable production backup/recovery point must also be confirmed. This report prepares the code and evidence for that decision; it does not claim that migrations, client releases, secrets, financial records or CMS content were changed. Following an approved rollout, use authorized synthetic accounts for hosted review submission, store/vendor/admin display, storefront reload, removed-store history and pickup-map acceptance. Those results must be recorded before step 2 is called live-complete.
