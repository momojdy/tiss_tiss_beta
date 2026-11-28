# Goodies cross-role audit — 28 November 2026

**Decision: architecturally connected; not fully production-verified, even excluding the owner's deferred work.** This is a current source, local-test and read-only hosted-backend audit. It is not a claim that every rendered control has been clicked on an installed phone or that every source statement was manually proved correct.

Customer source began at `c5c9052136c1f3a7a2bf93cb897764da168be096`; admin at `92e79aac25cfebf72f8a5584e68432cadb77ccbd`. The customer checkout was subsequently fast-forwarded over concurrent Habita-only commits, preserving that work without changing the Goodies baseline. All work uses `main`. The original GPS freshness repair `75857548e48594429eb229d105412f2ee41fcacf` remains in customer history. No app release, hosted synthetic test, financial operation, secret change or CMS publication was performed. After local reproduction, regression and recovery tests passed, the two-function null-input guard migration described below was deployed.

## Inventory and button evidence

The bounded inventory reads/hashes 112 scoped files and parses 100 TypeScript/TSX files. It finds 1,577 functions, 1,350 event bindings, 452 backend calls, 223 service calls and 538 navigation calls. Event bindings include text fields and shared component callbacks; they are not a count of unique visible phone buttons.

- [Screen/module register](screens.csv): all 34 customer routes, 22 shared Business Space destinations, 15 Goodies admin modules, plus courier and Wallet contribution integrations.
- [Control register](controls.csv): every discovered binding's role, file, line, owner, handler reference and called functions. `SOURCE_TRACE` means source evidence; installed acceptance is explicitly NOT VERIFIED.
- Recognized literal destinations: zero unresolved; advertised admin hub mappings: zero invalid. Seventeen computed targets and six dynamic RPC sites remain runtime acceptance items. Existing dispatcher tests reject unknown routes and verify the supported mappings.
- All 53 scoped customer source files are reachable. Admin has 68/69 reachable scoped files; the unmatched file is the mirrored `courierNavigation.ts` utility, not an unused production screen.
- The actual app-shell callback was executed for every Goodies menu action: home, messages, notifications, Wallet, activity, business, saved, orders, help and feedback. The messages/notifications return destination is Goodies. Notifications already worked through a combined handler; no app-shell route repair was needed.

These registers preserve unchecked runtime states rather than marking all 1,350 bindings PASS from import or signature checks.

The keyword review classified 267 demo/preview/sample references: 110 isolated admin-preview references, five isolated local-test references and 152 production-source references. Context included 64 input hints/styles, 19 comments and seven GPS-sample references. Inspected production hits include input placeholders, the unavailable-store record needed to render historical orders, GPS readings and explicit editor rejection of unsaved sample builders. The unavailable-store record has no products, is closed and cannot create a purchasable shop. No new live sample-order/review/builder injection was confirmed in the inspected Goodies paths. The inventory also records 271 comments; implementation comments are kept where they explain security, recovery or domain behavior. Final hosted customer-visible copy remains part of installed acceptance.


## Confirmed regressions repaired

1. **Quick-menu error copy bypassed the CMS.** The unread failure/retry control now uses an existing shared CMS error message. It retains its retry callback and layout, exposes no raw backend error and requires no new published content.
2. **Admin phone-preview drift.** The mirrored quick menu no longer matched current customer source, its shared unread hook or the moved icon source. The generator now mirrors the current icon and redirects the unread hook to an isolated preview adapter. Loading/error/retry fixtures use no real inbox, authentication or network client. A regression test exercises that boundary. Catalogues and source provenance are synchronized.
3. **Audit-tool input bug.** RPC comparison treated an array's inherited `entries` method as a catalogue field. It now accepts the actual array response as well as wrapped catalogues; the fresh live-catalogue comparison completes.

4. **SDK patch validation failure.** Fresh CI detected four installed Expo modules below SDK 58’s current patch requirements. Updated only `expo-dev-client`, `expo-file-system`, `expo-image`, `expo-location` and the required launcher transitive dependency. Preserved all unrelated locked packages and the SDK baseline.

5. **Null order decisions passed server validation.** SQL three-valued logic allowed a null vendor decline reason; a null courier acceptance boolean selected the decline branch. Reproduced both against real local SQL with synthetic orders. The migration rejects both with SQLSTATE `22023` before mutation. Protected calls leave order/assignment/Wallet/ledger/notification snapshots unchanged. Migration replay and transactional recovery preserve definitions, ownership, grants and financial state. Existing valid accept/decline/delivery and financial races continue to pass.

No customer layout, palette, navigation design, pricing rule, commission, database permission or unrelated feature was redesigned.

## Workflow results

| Workflow | Classification and evidence | Practical limit |
| --- | --- | --- |
| Browse/store/product/builders/cart | PASS — source contracts, catalogue/CMS checks, existing Goodies unit/regression tests | Installed shopping interactions and every option combination NOT VERIFIED |
| Product management/moderation | PASS — inspected deployed ownership/manager/restriction gates, required rejection reason, approval/stock checks; local regression scenarios | Every hosted vendor/staff combination NOT VERIFIED |
| Wallet/Cash checkout and multi-store allocation | PASS — server-side validation and existing local PostgreSQL financial/admission races | Real installed checkout and external provider acceptance NOT VERIFIED |
| Help Pay/Shared Bill | PASS — local creator/contributor debits, exactly-once settlement/stock reservation, retries, cancellation/expiry/refund/restriction races | Signed-in phone invitations/QR/restart flow NOT VERIFIED |
| Order/merchant restrictions | PASS — local transaction-lock races prevent restricted-store checkout/publication and preserve valid accepted transactions | Full installed operational journey NOT VERIFIED |
| Courier/pickup/delivery | PASS — real-coordinate source contracts, assigned-courier checks, GPS/cancellation/pickup/delivery concurrency tests | Physical map accuracy, background/offline GPS, permissions and device handoff NOT VERIFIED |
| Refund/settlement/promotions | PASS — local financial tests and fresh promotion authorization/concurrency/rollback tests; deployed original-card refund source matches | Actual provider refund/webhook reconciliation NOT VERIFIED |
| Admin navigation/operations | PASS — existing access, settlement, shared-refund, navigation, CMS and recovery suites after preview repair | Every signed-in installed action NOT VERIFIED |
| CMS | PASS — 1,921 registered fields, 73 groups, 34 routes; source parity and local preview/read/review tests; public HTTP 200 | Draft → publish → installed-app reload NOT VERIFIED |
| Notifications | FAIL — hosted push configuration is disabled | Active cron/working preferences do not establish physical push delivery |

## Deployed Supabase checks

Fresh catalogue: 374 public function signatures. Literal call comparison: **157 compatible, six partial, zero incompatible, nine missing**. The nine missing names belong to legacy generic Business Space APIs (`feature_requirements_status`, `submit_requirement`, `submit_verification`, `register_push_token`, `go_live`, `dashboard_range`, `action_required`, `activity_feed`, `search_business`). Explicit Goodies workspace paths bypass them; this audit does not certify unrelated generic marketplace paths.

A second comparison rebuilt the current target in a self-created socket-only PostgreSQL cluster and compared **all 221 Goodies/Help Pay functions**: 220 exact source-body matches, one whitespace-only difference in `goodies_place_multi_order`, no missing functions, and no differences in signatures, authenticated/anonymous EXECUTE grants, SECURITY DEFINER flags or configured search paths. Two initial CMS differences were traced to already deployed owner-approved publication deferrals; the isolated loader now includes their existing repository migrations. No translation, FAQ or publication policy was newly deployed or approved. This function comparison does not reconstruct every shared production table/policy or prove every function behavior. Anonymous/authenticated CREATE in the public schema is denied.

All 26 Goodies and two Help Pay public tables have RLS enabled. Direct authenticated order INSERT/DELETE, order-total UPDATE, profile-role UPDATE and product-review-status UPDATE are denied in inspected metadata. Inspected refund/token/queue helpers are not executable by anonymous or authenticated clients. Nineteen selected deployed financial/moderation/courier RPC bodies were inspected for their internal identity, ownership, permission, state and transaction checks. This is not proof that every policy/definer function or every signed-in role is correct.

Eight deployed Edge functions were read back: routing, card placement, Stripe webhook, card refund, refund worker, public content, push processor and FX refresh. All **14 inspected TypeScript entry/helper files** match repository text. This does not verify secrets, provider-side restrictions or every imported dependency.

The proof bucket is private, 10 MiB, JPEG/PNG/WebP. Twelve Goodies/Help Pay jobs are active and their most recent SQL runs succeeded at observation. An asynchronous HTTP worker's SQL success is not provider delivery success. Seven current active USD→HTG rate rows were available; no rate was changed. Settlement is enabled; push is disabled.

Public content HTTP read: version 6, 2,091 label records, 11 assets and two financial offers. That is a read test, not a new publication or installed-device test. Advisors were read; intentionally private internal tables and intentionally authenticated definer RPCs were not indiscriminately reconfigured. Detailed live policy/function snapshots remain private and are not uploaded with this report.

## Fresh automated verification

- Customer Goodies suite: **318 PASS, zero failures**.
- Existing source/cross-role reproduction suite: **47 PASS**.
- Admin Goodies suites: **74 PASS after the additional preview-isolation case**.
- Native PostgreSQL 17.6: existing full Goodies financial/Shared Bill/courier/restriction/FX race suite PASS; separate promotion permissions, concurrent edits, visibility and migration rollback suite PASS. Both use self-created socket-only local clusters and synthetic records, with no hosted database connection.
- CMS source check, configured lint and client secret scan PASS. The scan covered 606 client files and matched no embedded privileged Supabase JWT/private provider key; runtime secrets are outside its scope.
- Full source TypeScript checks PASS with the existing dependency trees plus exact missing package declarations. A clean dependency install failed because the workspace filled; only this audit's incomplete node_modules directories were removed. The temporary audit configuration maps the declared MaskedView/WebView package types and matching real React/RN declarations; no type stubs or application dependency changes were used. Clean install/native compilation remains NOT VERIFIED locally.
- Local Edge test invocation was NOT VERIFIED because the existing JSR assertion package was absent from the cache. Tests were launched without network permission; no provider or hosted financial call could occur. Fresh CI subsequently passed the deployed Edge type checks and **113 tests (71 steps), zero failures** at customer `54607b441285f367666033752621bb7bfbbd7c33`.

## Remaining acceptance, separate from deferrals

The evidence does **not** establish that every installed customer/vendor/courier/admin button and authorization path works. Signed-in cross-account/staff acceptance, provider sandbox/3DS/original-card refund reconciliation, native Maps/GPS/background/push/private-proof behavior and installed CMS reload remain NOT VERIFIED. Local native-config checks cannot establish EAS/runtime credentials from this fresh checkout. Push activation requires verified provider/device configuration, not an arbitrary flag flip.

Fresh Stripe account metadata confirms the connected Wantiss context is test mode and has one enabled Dashboard webhook pointing at the hosted Wantiss Supabase project. No provider mutation was made. New synthetic payments in that shared context could reach the hosted backend; the existing isolation guard correctly requires a separate Stripe sandbox without enabled Dashboard endpoints. Earlier private local acceptance reports dated 21 November record successful real test-mode authorization, duplicate/webhook/restart/decline/partial-refund/dispute scenarios against disposable local APIs; those historical results were not rerun at the current commit and do not prove installed 3DS or deployed provider reconciliation.

Owner deferrals remain unchanged: final FAQ/policies/support approval, final translations and owner Creole review, external payout providers, leaked-password protection until upgrade, production backup/export/full restore and releasing the full super-app. Those exclusions are not the reason for the remaining NOT VERIFIED items or disabled push result.

Reproduce source registers with the existing `inventory-goodies-controls.cjs`, RPC comparison and reachability scripts. Keep raw deployed security metadata private. Reports and unit counts are scoped evidence, not a 100% readiness guarantee.

## Published changes and CI evidence

Changes are on `main`:

- Consumer/menu/CMS/audit package: [`c035799823d64b2a5e09a569aba79feb32356aa2`](https://github.com/momojdy/tiss_tiss_beta/commit/c035799823d64b2a5e09a569aba79feb32356aa2).
- Paired admin CI pin: [`54607b441285f367666033752621bb7bfbbd7c33`](https://github.com/momojdy/tiss_tiss_beta/commit/54607b441285f367666033752621bb7bfbbd7c33).
- SDK patch alignment: [`f47e5f87194446231ceecf88eb6b032b41ace360`](https://github.com/momojdy/tiss_tiss_beta/commit/f47e5f87194446231ceecf88eb6b032b41ace360).
- Admin preview repair: [`d65a3a761f9e81ca6a7419c346cc50760f00645c`](https://github.com/momojdy/tiss-admin/commit/d65a3a761f9e81ca6a7419c346cc50760f00645c).
- Admin check ordering: [`f5a3e0f17f75914f53c2fb36e7095bac1bd11cdf`](https://github.com/momojdy/tiss-admin/commit/f5a3e0f17f75914f53c2fb36e7095bac1bd11cdf) and [`35a70cff92f9cf097fc2d8070187bfefe8cc8c13`](https://github.com/momojdy/tiss-admin/commit/35a70cff92f9cf097fc2d8070187bfefe8cc8c13). Goodies checks and native JavaScript exports run before unrelated feature gates; no failure is suppressed.

[Customer source/build CI](https://github.com/momojdy/tiss_tiss_beta/actions/runs/46167677274) passed clean installation, TypeScript and web export. [Customer feature CI](https://github.com/momojdy/tiss_tiss_beta/actions/runs/46167677203) passed Goodies tests, CMS coverage, source reproductions, credential scan, lint, TypeScript, real exported-browser mount, Edge checks, isolated PostgreSQL races and local API scenarios. Its Expo Doctor step failed for the four SDK patch mismatches repaired above; final patch CI is recorded separately below.

The local API job used local Auth, PostgREST and Storage with synthetic records. It passed original-customer Shared Bill ownership, contributor refunds, moderation/availability, CMS permission/publication/reload and full synthetic database/session restoration. It did not access hosted Supabase, a payment provider or a physical device.

[Admin CI](https://github.com/momojdy/tiss-admin/actions/runs/46167873341) passed clean installation, TypeScript, all Goodies tests and Android/iOS JavaScript exports. Overall status is **FAIL** because unrelated Konsoliss `konsolissHomeScreen.tsx` and `source-manifest.json` are out of sync. Those files were not changed in this Goodies audit. JavaScript exports are not signed native compilation or installation.

Final SDK-patch revision `f47e5f87194446231ceecf88eb6b032b41ace360` passed [Expo validation](https://github.com/momojdy/tiss_tiss_beta/actions/runs/46168137555) and [TypeScript/build checks](https://github.com/momojdy/tiss_tiss_beta/actions/runs/46168137470), including clean installation, Expo Doctor, source/unit checks, web startup, Edge, local API and financial-concurrency jobs. This supersedes the repaired customer Doctor failure above. No unrelated Goodies test failure is being hidden.

## Backend patch deployment

Applied `20261128171138_goodies_reject_null_order_decisions` to Wantiss after the complete local PostgreSQL financial/Shared Bill/restriction/courier/FX suite passed with the new regression cases. This changes only validation in `decline_goodies_order(uuid,text,text)` and `goodies_courier_respond_assignment(uuid,boolean)`. Fresh metadata readback confirms exact expected function bodies and unchanged owners/ACLs. No production synthetic invocation, order, assignment, balance, transaction, secret, release gate or CMS record was modified. No application was released.

The versioned migration, isolated-schema loader and regression helper are in this repository. Emergency reversal is documented in `supabase/operations/goodies-rollback-null-order-decisions.sql`; it was rehearsed only in local transactions and reopens the old invalid-input behavior. A full production restore remains outside this narrow rollback evidence.

## Final verification revisions

Backend/regression commit [`5d55e5f48854d5a4ac0e4340ba856a5d8830cf32`](https://github.com/momojdy/tiss_tiss_beta/commit/5d55e5f48854d5a4ac0e4340ba856a5d8830cf32) passed [feature/Edge/local API/financial CI](https://github.com/momojdy/tiss_tiss_beta/actions/runs/46169299900) and [TypeScript/build CI](https://github.com/momojdy/tiss_tiss_beta/actions/runs/46169299881).

The unchanged native application source at `f47e5f87194446231ceecf88eb6b032b41ace360` passed [Android development APK compilation and signature verification](https://github.com/momojdy/tiss_tiss_beta/actions/runs/46168137547). The workflow retains the ARM64 development APK and signature/checksum evidence as artifact `goodies-android-development-f47e5f87194446231ceecf88eb6b032b41ace360` (artifact ID `15273346381`, three-day retention). This is a debug/development signature and a build artifact, not production signing, physical installation, Maps/push configuration acceptance or an app release. Signed iOS native compilation and physical-phone tests remain NOT VERIFIED.
