# Goodies cross-role audit — 28 November 2026

**Decision: architecturally connected; not fully production-verified, even excluding the owner's deferred work.** This is a current source, local-test and read-only hosted-backend audit. It is not a claim that every rendered control has been clicked on an installed phone or that every source statement was manually proved correct.

Customer source began at `c5c9052136c1f3a7a2bf93cb897764da168be096`; admin at `92e79aac25cfebf72f8a5584e68432cadb77ccbd`. The customer checkout was subsequently fast-forwarded over concurrent Habita-only commits, preserving that work without changing the Goodies baseline. All work uses `main`. No app release, hosted synthetic test, financial operation, backend deployment, secret change or CMS publication was performed.

## Inventory and button evidence

The bounded inventory reads/hashes 112 scoped files and parses 100 TypeScript/TSX files. It finds 1,577 functions, 1,350 event bindings, 452 backend calls, 223 service calls and 538 navigation calls. Event bindings include text fields and shared component callbacks; they are not a count of unique visible phone buttons.

- [Screen/module register](screens.csv): all 34 customer routes, 22 shared Business Space destinations, 15 Goodies admin modules, plus courier and Wallet contribution integrations.
- [Control register](controls.csv): every discovered binding's role, file, line, owner, handler reference and called functions. `SOURCE_TRACE` means source evidence; installed acceptance is explicitly NOT VERIFIED.
- Recognized literal destinations: zero unresolved; advertised admin hub mappings: zero invalid. Seventeen computed targets and six dynamic RPC sites remain runtime acceptance items. Existing dispatcher tests reject unknown routes and verify the supported mappings.
- All 53 scoped customer source files are reachable. Admin has 68/69 reachable scoped files; the unmatched file is the mirrored `courierNavigation.ts` utility, not an unused production screen.
- The actual app-shell callback was executed for every Goodies menu action: home, messages, notifications, Wallet, activity, business, saved, orders, help and feedback. The messages/notifications return destination is Goodies. Notifications already worked through a combined handler; no app-shell route repair was needed.

These registers preserve unchecked runtime states rather than marking all 1,350 bindings PASS from import or signature checks.

## Confirmed regressions repaired

1. **Quick-menu error copy bypassed the CMS.** The unread failure/retry control now uses an existing shared CMS error message. It retains its retry callback and layout, exposes no raw backend error and requires no new published content.
2. **Admin phone-preview drift.** The mirrored quick menu no longer matched current customer source, its shared unread hook or the moved icon source. The generator now mirrors the current icon and redirects the unread hook to an isolated preview adapter. Loading/error/retry fixtures use no real inbox, authentication or network client. A regression test exercises that boundary. Catalogues and source provenance are synchronized.
3. **Audit-tool input bug.** RPC comparison treated an array's inherited `entries` method as a catalogue field. It now accepts the actual array response as well as wrapped catalogues; the fresh live-catalogue comparison completes.

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

All 26 Goodies and two Help Pay public tables have RLS enabled. Direct authenticated order INSERT/DELETE, order-total UPDATE, profile-role UPDATE and product-review-status UPDATE are denied in inspected metadata. Inspected refund/token/queue helpers are not executable by anonymous or authenticated clients. Fourteen selected deployed financial/moderation/courier RPC bodies were inspected for their internal identity, ownership, permission, state and transaction checks. This is not proof that every policy/definer function or every signed-in role is correct.

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
- Local Edge test invocation was NOT VERIFIED because the existing JSR assertion package was absent from the cache. Tests were launched without network permission; no provider or hosted financial call could occur. CI must provide fresh Edge-test results at the final code revision.

## Remaining acceptance, separate from deferrals

The evidence does **not** establish that every installed customer/vendor/courier/admin button and authorization path works. Signed-in cross-account/staff acceptance, provider sandbox/3DS/original-card refund reconciliation, native Maps/GPS/background/push/private-proof behavior and installed CMS reload remain NOT VERIFIED. Local native-config checks cannot establish EAS/runtime credentials from this fresh checkout. Push activation requires verified provider/device configuration, not an arbitrary flag flip.

Owner deferrals remain unchanged: final FAQ/policies/support approval, final translations and owner Creole review, external payout providers, leaked-password protection until upgrade, production backup/export/full restore and releasing the full super-app. Those exclusions are not the reason for the remaining NOT VERIFIED items or disabled push result.

Reproduce source registers with the existing `inventory-goodies-controls.cjs`, RPC comparison and reachability scripts. Keep raw deployed security metadata private. Reports and unit counts are scoped evidence, not a 100% readiness guarantee.
