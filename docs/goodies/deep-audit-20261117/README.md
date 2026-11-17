# Goodies follow-up audit — 17 November 2026

> Historical snapshot. Use the [current acceptance results and exact deployment proposal](../acceptance-20261117/README.md), which includes completed FAQ content, six Edge Function repairs and refreshed SDK validation. Production deployment remains paused.

**Goodies is not 100% production-ready.** The verified fixes are pushed to `main` in both repositories. Production still lacks required backend contracts, and hosted/device/provider acceptance remains unverified. No database migrations, application releases, CMS publication, real charges or secret changes were performed.

This report supersedes the earlier [release snapshot](../release-20261117/README.md). A source handler or a rendered preview does not establish that every button works in production.

| Repository | Verified source commit |
| --- | --- |
| Customer/vendor | [`ef8720c19778c620597f384b567d86d8bfe5ba03`](https://github.com/momojdy/tiss_tiss_beta/commit/ef8720c19778c620597f384b567d86d8bfe5ba03) |
| Admin/CMS | [`23fd272c6e8096f9cebc3b9e02f039102510b2a6`](https://github.com/momojdy/tiss-admin/commit/23fd272c6e8096f9cebc3b9e02f039102510b2a6) |

The customer test-runner correction is [`839fceb68a295dacd1ebb71e006ff7cac5c501a8`](https://github.com/momojdy/tiss_tiss_beta/commit/839fceb68a295dacd1ebb71e006ff7cac5c501a8). [Exact commits and changed files](commits-and-files.json) records the source changes after the earlier approved pushes (`dd03a2d4` customer, `9f2bf8f` admin). Report-only commits may follow these verified source commits. No history was rewritten.

## Implemented and verified fixes

| Surface | Result | Evidence and limits |
| --- | --- | --- |
| Product/cart controls | **PASS** | Removed products/stores cannot crash product controls or be added from stale snapshots. Removing unavailable cart lines still works. Pending product or stock changes preserve the existing cart when replacement cannot proceed. |
| Builder cart replacement | **PASS** | The existing builder callback can now pass the new-cart confirmation. Confirmation rechecks the owning account, draft, availability and current composition before replacing the cart. Regression tests exercise the callback and availability changes. |
| Reordering/history | **PASS** | Reorders retain options/notes, use current product prices and stock, and clear historical promotional discounts. Removed stores do not crash product, store-info or confirmation screens. Final prices remain server-authoritative. |
| Customer tracking | **PASS** | Latest-response handling prevents an older read overwriting newer tracking data. Account changes/unmounts discard late reads; safe loading/retry states replace silent failures. Polling and foreground refresh supplement realtime. Receipt taps have a synchronous lock and update the current order record. |
| Courier failures | **PASS** | Failed assignment loads show retry rather than a false empty list. Availability/status actions catch failures, release locks and suppress late responses for another account. GPS update/heartbeat rejections are handled. Device behavior is **NOT VERIFIED**. |
| Production demo cleanup | **PASS** | Removed the unused courier-message sheet that claimed messages were sent without sending them. The source reachability check finds no unused files within its explicit Goodies scope. Isolated CMS fixtures and active vendor authoring presets remain. This does not prove all imported code is useful. |
| CMS preview | **PASS** | Returning from the actual Shared Bill contribution preview preserves the selected customer page. Tracking uses isolated fixture metadata; its failure message supports exact selection and draft rerender. All 34 customer routes render locally; 17 preview interactions pass. |
| Financial test runner | **PASS** | Docker `psql` now returns rows without command-status tags corrupting request IDs. A startup assertion verifies that contract. The real GitHub Docker run passes settlement, group checkout and eight Shared Bill concurrency scenarios using synthetic data. |
| CMS/localization preparation | **PASS** | 1,502 registered fields in 66 page/shared groups; 6,816 prepared locale lookups pass. Existing 775 Haitian fields remain unchanged, and unfinished Creole falls back to reviewed English. Machine approval is never represented as human review. No publishing occurred. |

The original layouts, navigation structure and design system are preserved. Visual additions are limited to required loading/failure/retry states. The redundant order-list subscription now uses the existing account-scoped sync service.

## Executed verification

- **PASS — 232 automated tests:** 89 customer, 33 admin, 47 cross-source regressions and 63 Deno backend tests, with 43 additional Deno steps. Client transports/native widgets and provider responses in these tests are synthetic.
- **PASS — 13 PostgreSQL concurrency scenarios**, plus stale-quote rejection before debit, in the GitHub network-isolated PostgreSQL 17.6 container. These exercise the complete 17-migration candidate package with synthetic wallets/orders/stock. They are not production financial transactions.
- **PASS — both complete TypeScript checks**, configured customer lint, migration-version checks and the paired client secret-pattern scan. Expanded scoped lint has **0 errors and 264 warnings**; warnings remain visible in the evidence.
- **PASS — customer Android/iOS/web and admin Android/iOS Expo bundle exports.** These are not signed native builds.
- **PASS — source registration of 34 routes and 131 literal navigation calls with zero unknown targets.** Dynamic navigation and authenticated presses of every control remain **NOT VERIFIED**.
- **PASS — local CMS rendering and 17 interaction checks**, including translation preview, selection, drafts, structured content, zoom, checkout, Shared Bill contribution and tracking failure states. Native map/font/provider adapters are explicit; external requests are blocked.

GitHub checks for the source commits pass: [admin validation](https://github.com/momojdy/tiss-admin/actions/runs/44074493105), [customer Expo validation including financial races](https://github.com/momojdy/tiss_tiss_beta/actions/runs/44074602756), and [customer TypeScript/Expo checks](https://github.com/momojdy/tiss_tiss_beta/actions/runs/44074602703). [Machine verification](verification.json), [CI receipt](ci-verification.json), [logs](logs), and export metadata retain the evidence.

## Screen/control and security coverage

[Every customer route](screen-verification.json) has separate source/preview and hosted classifications. The [compressed control inventory](source-controls.json.gz) contains **132 source files, 1,554 control/callback entries and 407 comments** across customer, vendor, courier, shared infrastructure, admin and isolated previews. Of these controls, 459 are isolated preview callbacks. Decompress with `gzip -dc source-controls.json.gz > /tmp/goodies-controls.json`.

The [summary](source-summary.json), [navigation](navigation.json) and [reachability graph](reachability.json) preserve the scope. All controls retain **NOT VERIFIED** runtime status unless an executed named test establishes behavior. This is static call tracing, not a claim of a manual line-by-line review or a hosted press of every button. The flagged error sinks were inspected: shared `errText` returns application-owned messages, and the admin dispute dialog reports safe outcomes. The new tests check that private error text is not rendered at the repaired sinks.

The [read-only production snapshot](live-baseline.json) reports migration head `20261116135012`, 356 migrations and RLS enabled on all 28 matching Goodies/Shared Bill tables. **Enabled RLS alone is not an authorization pass.** The prepared backend suites exercise cross-account/vendor/courier/staff boundaries in isolation; exhaustive adversarial testing against every deployed endpoint remains **NOT VERIFIED**.

[Security advisor evidence](security-advisor.json) includes 10 scoped policy-free tables, two anonymous and 89 authenticated privileged-function notices. Server-only queues intentionally have no client policies; callable RPCs require authorization inside their definitions. Targeted [live function review](reviewed-live-functions.json) confirms anonymous review projections return approved reviews without customer identity, and receipt/dispute functions check ownership and lock the order. The admin helper also requires an active, confirmed super-admin database record; the editable invitation claim alone cannot grant that role. These checks do not prove every other RPC secure. No production policy was changed merely to clear advisor warnings.

Advisor guidance: [policy-free RLS tables](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Shared leaked-password protection is also disabled; its [configuration](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) was not changed.

## Release blockers

| Classification | Blocker | Evidence / required acceptance |
| --- | --- | --- |
| **FAIL** | Required live backend contracts are absent | [Production catalog/bucket check](live-deployment-contracts.json): `goodies_courier_orders()`, account-bound Shared Bill creation/config, settlement config and `goodies-delivery-proofs` bucket are absent. The repaired clients therefore cannot establish all live workflows. |
| **FAIL** | Prepared content cannot be published as-is | The publication guard rejects five deferred FAQ placeholders. Approved policy/support content and final content review remain outstanding. |
| **NOT VERIFIED** | Complete hosted lifecycle and authorization | Signed-in approved customer/vendor/courier/admin/staff test accounts and test balances must exercise ordering, fulfillment, cancellation, refunds, retries, offline recovery and access attacks. |
| **NOT VERIFIED** | Provider sandbox lifecycle | Real sandbox authorization/charges, authenticated webhook delivery/replays, refunds and reconciliation require the approved provider test setup. Existing Wallet financial tests need no provider credentials. |
| **NOT VERIFIED** | Native delivery and notifications | Physical-device GPS/background/offline/reassignment and push/deep-link tests, restricted Android Maps configuration and signed Android/iOS builds remain required. The source uses real coordinates/route data and timed freshness; no courier movement is simulated in production. |
| **NOT VERIFIED** | Hosted CMS and language acceptance | Edit → draft preview → publish → installed-customer reload remains unexecuted. Haitian Creole human review remains owned by the super admin; unfinished content stays unavailable with English fallback. |
| **NOT VERIFIED** | Approved production rollout/recovery | The [refreshed 17-migration manifest](migration-package.json) records exact order/checksums, including the new critical tracking key. Approval, backup/recovery verification, deployment and paired application acceptance are still required. Deployment remains paused under the user's instruction. |

**Deployment readiness: blocked.** There is verified implementation progress beyond placeholders, but the evidence does not justify “all logic, every button and all security are 100% ready.”
