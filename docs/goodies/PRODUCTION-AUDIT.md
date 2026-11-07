> Historical baseline audit. Subsequent candidate implementation and verification are documented in [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md). Production deployment and full acceptance remain outstanding.

# Goodies production-readiness audit — 6 November 2026

**Verdict: NOT PRODUCTION READY.** Reproduced defects affect the consumer, vendor and admin applications. Full release acceptance also remains NOT VERIFIED. No production records, secrets, charges, migrations or published content were changed by this audit. No application UI was changed.

## Scope and baseline

The audit covered 97 source files, 1,264 JSX event/callback bindings, 170 backend targets, shared card handling, courier controls, and the admin content editor. Of those bindings, 332 belong to the isolated admin preview and 932 to live/shared source. Bindings include lifecycle callbacks and repeated component controls; these are not 1,264 distinct buttons. The inventory records handler ownership, call traces, backend/navigation references and unresolved dynamic calls. It does not certify an authenticated click-through of every button.

Examined readiness branches: customer `4b28d0e8c8f2e813674f833d3a5c6fa00beef568`; admin `926cda9fe78584c2255ea8fc322dbadf38a7661e`. Read-only fetched main heads: customer `5d0973280709971ff668d7e39e47c7f7ff6e6c7c`; admin `e65ff541bef118e6c9e4f82137838a03152d8bed`. Candidate branch fixes are not automatically present in deployed clients or database. The installed production mobile/web revision was not established.

Live database inspected: Wantiss `ycbirmgppwavorwudlrv`. The inactive security-test project was not restored or used. Isolated synthetic SQL tests used an embedded database. Latest observed deployed migration was `20261104211532 goodies_message_security_and_store_hours`; later candidate migrations cannot be treated as deployed.

## Confirmed failures

The 17 passing JavaScript reproduction assertions and one passing SQL reproduction **confirm defects**. They are not 18 passing acceptance criteria. Reproductions extract actual source functions/initializers and use synthetic state, transport and native-component substitutes. The SQL reproduction executes captured main function definitions against a synthetic schema/data fixture; it is not a hosted authorization-matrix test.

| ID | Severity | Failure and impact |
|---|---|---|
| A01/A02/A15 | High | Vendor errors, customer receipt errors and admin analytics errors can render raw server details. Customer receipt keyword filtering does not sanitize the rest of the message. |
| A03 | High | Admin Reject submits no reason although the main RPC requires one. |
| B01 | High | Even with a valid rejection reason, the deployed moderation trigger resets review status to approved and clears review metadata. Rejection keeps availability false, but a later availability change can undermine moderation. |
| A10 | High | Vendor product save includes `photo_urls`, but main grants deny writes to that column. Other product columns have per-column grants; this is not a blanket absence of vendor INSERT permission. |
| A04 | High | Customer review submission updates local state/cache only. Vendor/admin cannot receive the submitted review through that path. |
| A06/A17 | High | Historical placeholder stores can show seeded reviews. A catalog containing only legacy placeholders can retain seeded builders. This is production code, unlike intentional editor fixtures. |
| A07/A08 | High | Missing store navigation and initial historical-order rendering can dereference nonexistent catalog entries and crash. |
| A13 | High | Shared vendor business-information Goodies selector uses hardcoded demo storefronts, and save omits the selected store. It does not persist the chosen value. |
| A16 | High | Failed vendor payout summaries display zero available/pending funds instead of unavailable/error state. |
| A11 | High | Admin fee defaults can be saved before loading completes; CMS read errors are ignored. |
| A05 | Medium | Real support submission can succeed and then display a false “demo/not connected” confirmation. |
| A09 | Medium | Pickup map always displays missing coordinates, even when coordinates exist. |
| A12 | Medium | Notification switches only persist locally; that action does not update backend notification-delivery preferences. |
| A14 | Medium | Secondary vendor orders panel reads `quantity/name` while canonical snapshots use `q/n`, producing `1× undefined`. Specialized Goodies orders uses the correct contract. |

Additional source/metadata failures and verification limits are recorded in [FINDINGS.json](audit/FINDINGS.json), with source references and evidence descriptions. Do not interpret all scanner candidates as proven defects.

## Loading, errors, empty states and skeletons

Coverage is incomplete. Customer catalog failures are saved to `catalogError` but not rendered; failure can resemble an empty/stale catalog. Home skeletons follow CMS loading rather than catalog readiness. Checkout has internal locking and server idempotency, but its visible submission state does not consistently follow busy state. Embedded card/authentication WebViews lack explicit HTTP/network recovery handlers.

Vendor Store, Products and Builder views contain initial loading/error handling. Product refresh errors can be hidden when old data exists. Ingredient-request initialization can show “No requests yet” while loading or after failure, without a persistent retry state. Library/rules/settings errors can collapse into empty/default values. Generic order actions lack the specialized queue's per-action busy feedback. Payout failure must never be represented as zero money.

Admin dashboard failure leaves stale/default cards after a toast. Analytics can remain “Loading analytics…” after the request has failed. Courier/report lists can appear empty during loading/failure. Ingredient-request library/rules/image failures are not consistently handled. CMS read failure combined with saveable financial defaults is particularly serious.

Consumer history is capped at 100, specialized vendor orders at 100, secondary orders at 80, admin orders at 150, and courier candidates at 200 without corresponding paging controls. This limits operational/history completeness. The payout ledger does have pagination.

Purely local/static screens need appropriate interaction feedback, not an artificial network skeleton. A skeleton alone does not replace an error/retry state. See the [route and file state matrix](audit/SCREEN-AUDIT.md) and [individual callback ledger](audit/controls.csv).

## Cross-role connections

| Workflow | Assessment |
|---|---|
| Customer → pricing/order RPCs → vendor/admin | Server-authoritative contracts and targeted synthetic tests exist. Complete hosted multi-role order lifecycle is NOT VERIFIED. |
| Vendor product save → database → customer catalog | FAIL: main `photo_urls` grant mismatch. |
| Admin rejection → database → vendor/customer | FAIL: missing frontend reason and deployed trigger behavior. |
| Customer review → vendor/admin | FAIL: local-only submission; real written-review display is disconnected. |
| Vendor business-information storefront selector → database | FAIL: demo options and omitted save field. |
| Vendor secondary orders → canonical order items | FAIL: field mismatch. |
| Customer support → shared support table | Actual write path exists; FAIL in confirmation copy. Hosted submission/recipient handling NOT VERIFIED. |
| Notifications → correct recipient/deep link/preferences | Partial source connections exist; local preference defect confirmed. Actual foreground/background/reopened delivery NOT VERIFIED. |
| CMS draft → preview → publication → consumer | Candidate source coverage exists; authenticated save/publication, invalidation, visual fidelity and all manual edit round trips NOT VERIFIED. |
| Courier → assignment → customer map → completion | Real coordinate/realtime code exists; missing candidate RPC deployment and device verification remain blockers. |
| Vendor promotions → Goodies checkout discount | General vendor promotion records and Goodies pricing sources differ. A complete bridge was not established; NOT VERIFIED, not asserted absent in every backend path. |

Of 123 requested RPC names checked against main metadata, 96 exist and 27 are absent. The complete list and definitions are in [backend-final-routines.json](audit/backend-final-routines.json). Some names belong to shared generic or preview-only paths: do not classify all 27 as live Goodies failures. Candidate courier/private-proof RPCs are absent. Missing shared dashboard, activity, promotion and registration RPCs affect referenced vendor paths. Preview-only `wallet` is not evidence of a live wallet failure. The checked literal named-argument objects produced no mismatches against existing overload names; dynamic objects, required omitted arguments and runtime behavior still require testing.

## Comments, demo data and frontend language

The inventory contains 319 comment blocks and 77 potentially relevant copy candidates across the 97 files. These counts are not an assertion that all comments/candidates are bad. Security, compatibility, cache and authorization explanations are useful maintenance documentation. Comments do not reach users merely by existing in source. No evidence establishes comment volume itself as a release blocker.

Actual problematic production fixtures are the historical seeded reviews/builders and vendor demo selector described above. Editor preview fixtures and explicit “demo/no real payment” notices are intentional boundaries and should remain isolated and visible. They must not be counted as fake live transactions.

Customer “server-backed group order” copy exposes unnecessary implementation jargon. The support-success demo statement is factually wrong. Pickup-coordinate copy can be wrong. Public FAQ placeholder answers are unfinished. Admin implementation explanations about Supabase/server calculations can usually be shortened, while financial consequences, availability restrictions and publication warnings should remain clear. URL/path literals detected by a scanner are not necessarily rendered text.

Raw `errText`, analytics errors and the receipt keyword path need a user-safe error mapping with internal diagnostics kept out of the UI. Not every `error.message` occurrence is a server leak; the reproduction-backed sinks are the confirmed findings. The [copy/comment/demo ledger](audit/copy-comments-demo.json) preserves the remaining candidates for review.

## CMS and five languages

The candidate registry includes 33 consumer routes and 1,246 text keys; source representation does not prove that every editable value can successfully be manually edited, previewed, published and reloaded. It also does not certify vendor/admin copy localization. A “100% CMS complete” statement is unsupported.

Main has one published English `goodies.content` payload containing multilingual structures, rather than one required record per locale. Observed payload: 782 labels, 647 reviewed English labels, zero reviewed labels for `fr`, `ht`, `es`, `zh-Hans`; local defaults and fallback delivery also exist. Five FAQ answers are literally “Answer coming soon.” No live policy/support-topic content was found in that payload. Haitian Creole must not be declared human-reviewed based on generated text.

The builder editor's content-edit UI access does not match the RPC's operations/edit requirement. Server denial is an authorization safeguard, not an escalation, but the control can be offered to staff who cannot use it. Builder save writes a live table separately from the outer CMS draft/publication flow. Ingredient selection also retains denied requests because its filter checks `rejected`; new items remain unavailable server-side, so this is not proof they become sellable automatically.

## Security and financial evidence

PASS — all 24 Goodies-specific tables inspected have RLS enabled. Audited existing RPC metadata did not grant anonymous execution. A source-pattern scan found no matching server secret keys in scanned client files; environment/secret files were not dumped. These are limited checks, not a complete security pass.

Security advisor returned 10 Goodies server-table no-policy findings and 82 authenticated-executable SECURITY DEFINER routine findings. No-policy queues/cache tables can be intentionally server-only. Public authenticated RPCs can be legitimate when they enforce authorization internally. These counts are not 92 confirmed vulnerabilities. See [advisor evidence](audit/security-advisor-goodies.json), [no-policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), and [SECURITY DEFINER guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Main lacks the candidate private proof bucket/capability rollout; legacy storage is public. Zero legacy delivery-proof objects were observed, so an actual exposed customer photograph was not established. The deployment gap still needs resolution before private proof workflows can be accepted.

Payment/refund Edge Functions are deployed ACTIVE. JWT-disabled webhook/worker functions have internal authentication/signature/token logic; `verify_jwt=false` alone is not a confirmed vulnerability. Targeted tests cover financial/helper contracts, but real sandbox provider authorization, webhooks, refunds, hosted races, reconciliation and dead-letter recovery remain NOT VERIFIED. No real money was used. Dedicated complete Goodies refund/reconciliation operator UI was not established.

The full anonymous/customer/other customer/vendor/staff/other vendor/courier/other courier/restricted admin matrix remains NOT VERIFIED. Source authorization checks and synthetic SQL tests cannot substitute for all hosted principal-boundary tests.

## Test evidence and release decision

| Classification | Evidence |
|---|---|
| PASS | 47 existing Deno backend tests; targeted synthetic/mocked contracts, not complete production E2E. |
| PASS | Customer TypeScript, configured lint and four CMS tests; admin TypeScript and 14 access/CMS tests. |
| FAIL | 17 JavaScript defect reproductions and one main-moderation SQL reproduction all reproduced their expected defects. |
| NOT VERIFIED | Authenticated complete click-through, role matrix, CMS publication round trips, provider sandbox lifecycle/concurrency, actual production-installed client revision. |
| NOT VERIFIED | Physical-device GPS/background/offline/reassignment, push behavior, signed Android/iOS builds and release installation. Earlier JS exports do not establish native runtime readiness. |

Logs are checked in under [audit/evidence](audit/evidence). Reproduction scripts are `scripts/audit-goodies-reproductions.cjs` and `scripts/audit-goodies-database.test.ts`; the source inventory generator is `scripts/audit-goodies-surfaces.cjs`. These audit scripts intentionally assert current defects and must be updated to acceptance assertions when fixes are implemented.

**Release must remain blocked.** Confirmed application defects can be repaired in the existing architecture. Candidate database changes must be isolated-tested and reviewed before production deployment. Credentials/devices/provider sandbox and deployment approval are required for the remaining external verification. This report is an audit result, not a claim that implementation or full acceptance has been completed.
