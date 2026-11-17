> A newer verified implementation and release assessment is available in [the 17 November report](../release-20261117/README.md). This file is the archived 12 November snapshot; later Shared Bill, review-schema, CMS and cleanup results supersede its counts and exclusions.

# Goodies implementation and release verification — 2026-11-13

**NOT PRODUCTION-READY.** The candidate includes the repairs listed below and passes the available isolated checks. Hosted and physical acceptance remains incomplete. Nothing was deployed or published. Source commits are local on `main`; automatic approval review blocked the remote push because explicit default-branch push authorization was required.

## Classification and evidence

| Area | Result | Evidence and limit |
|---|---|---|
| Customer/vendor units and source regressions | PASS | 66 tests plus 29 cross-repository source tests; [logs](logs/). Synthetic transports are identified. |
| Admin permission, CMS and settlement tests | PASS | 28 tests; [admin-tests.log](logs/admin-tests.log). |
| Backend authorization, pricing, builders, moderation, orders, reviews, notifications, refunds and settlement | PASS, isolated | 59 tests plus 23 steps; [backend-tests.log](logs/backend-tests.log). This does not certify all deployed role boundaries. |
| Real concurrent financial requests | PASS, isolated | Five races on socket-only PostgreSQL 17.6: gross cash cap, competing payouts, repeated payout credit, commission debit and exactly-once group checkout; stale quotes also reject before debit; [native-postgres-races.log](logs/native-postgres-races.log). No production URL, real customer or money was used. |
| Captured live moderation | FAIL | [Reproduction](live-moderation-reproduction.json) executes the current captured trigger against synthetic data: rejection becomes approved and the reason is erased. The candidate repair separately passes. |
| Live vendor product-save permission | FAIL | Authenticated INSERT/UPDATE on `goodies_products.photo_urls` are absent in [final-live-snapshot-20261113.json](final-live-snapshot-20261113.json). Candidate grants and merchant/photo ownership constraints pass isolated tests. |
| TypeScript | PASS | Both complete repositories; empty successful typecheck logs. |
| Goodies lint | PASS with warnings | Configured lint passes; expanded Goodies/shared-address scan has 0 errors and 551 warnings. A broader scan also found four pre-existing static-component lint errors in unchanged Gatherz code; no unrelated UI refactor was made. |
| Application bundles | PASS | Customer Android/iOS/web and admin Android/iOS JavaScript/Hermes exports. These are **not signed APK/AAB/IPA builds or native compile tests**. |
| Expo dependencies/configuration | PASS, local | Expo Doctor 20/20; development IDs are separate; existing production config is preserved. Native Maps key configuration is implemented but no key was supplied. |
| Client credential source scan | PASS, scoped | 511 client source files: no embedded privileged Supabase JWT or private provider-key pattern. Runtime secrets/provider restrictions remain unverified. |
| CMS route/field coverage | PASS, local | 1519 editable source fields, 67 groups, 34 internal routes. Every source field resolves manually edited text in five configured locales. [Screen register](screen-verification.md). |
| CMS draft preview | PASS, local | 34 route renders and 11 draft selection/edit/locale/zoom/structured-content checks; external network blocked and native widgets adapted. [Preview evidence](preview-routes.json). |
| Prepared translations | PASS, local | 6820 en/fr/es/zh-Hans lookups; 775 existing HT entries preserved, many unfinished. No machine text is claimed human-reviewed. [Payload verification](../localization-release/verification.json). |
| FAQ publication gate | FAIL | Five existing “Answer coming soon” entries fail publication validation. They are hidden from customer answers; approved replacements are still required. |
| Hosted CMS edit → preview → publish → installed reload | NOT VERIFIED | No CMS publication or installed-customer acceptance was performed. Policy approval remains deferred; human Creole review is owned by the super admin. |
| Installed cross-role order lifecycle, payment sandbox and authenticated webhook delivery | NOT VERIFIED | Approved hosted role sessions and provider sandbox credentials are unavailable. No real charge or destructive customer transaction was used. |
| Physical GPS/background/offline/reassignment/push and signed builds | NOT VERIFIED | No physical-device/signing environment or Android Maps key/restriction verification. |
| Deployment, proof activation, settlement activation and production restore | NOT VERIFIED | Explicitly not performed. [Deployment/recovery package](DEPLOYMENT.md). |

## Implemented repairs

- **Customer:** backend-persisted reviews and rating hydration; real review lists; safe historical store/cart/order snapshots; account-response isolation; protected first-paint hydration and account-owned native sheets; safe financial/load/retry states; history pagination; real notification preferences; accurate support confirmations; host Wallet top-up routing; cold-start product navigation; group checkout locking/idempotency, server comparison of reviewed items/totals before debit, paid-line clearing and order navigation; no production sample reviews/builders/storefronts or fake top-up sheet. FAQ placeholders are suppressed.
- **Vendor:** catalog save contracts, correct secondary item fields, persisted real storefront, order paging and failure states, private proof handling, restriction/notification behavior and earnings/commission/payout surfaces. Goodies-only overview/actions/activity/search now use real scoped Goodies records; unread counts use the deployed notification fields; membership hydration preserves business details; preferences merge atomically in the shared account record; product shortcuts reach the actual manager; messages, notifications, activity and promotions have pagination. Duplicate legacy registration forms are bypassed for Goodies, and data export/closure actions create real support requests without claiming completion. Promotions remain server-managed and have a tested merchant-scoped read-only projection. In-app alerts are identified accurately; background push/email delivery is not claimed implemented.
- **Admin:** rejection reasons, preserved moderation decisions in candidate SQL, safe fee loading and save guards, operational pagination, real review moderation, private proof viewing, server permission level alignment, builder publishing controls and audited settlement operations.
- **Courier:** scoped assigned-order reads in candidate SQL, private proof access/upload rollout, 30-second GPS freshness expiry ported from `75857548`, routing/coordinate validation, pickup coordinate fallback and permission/offline recovery logic. Real-device behavior is not claimed verified.
- **Backend/finance:** authoritative builder validation, review/preferences/store-link RPCs, localized and deduplicated role notifications, CMS review guards and the 15-migration deployment package. Settlement enforces the **5,000 HTG gross cash-sales exposure cap**, 24-hour confirmed-delivery dispute hold, weekly settlement, instant Wantiss Wallet credits once eligible, two-day external digital route timing and 7–14 bank business-day timing with country calendar checks. Refund/recovery and concurrent requests are covered with synthetic data. External digital/bank transfers use a manual process requiring operator verification and remain disabled by default.
- **Shared Bill:** preserved the newly arrived real implementation from `main`; removed new customer funding exposure through a client gate and prepared server-side RPC permission revocations while retaining status/cancellation. Malformed financial responses fail closed; request errors are safe; existing order recovery reuses the customer order mapper. No real Shared Bill funding acceptance is claimed.
- **CMS/locales:** source-derived catalogs, current isolated customer preview, editable loading/error and dynamic request text, critical-key parity, existing category drafting and four-language preparation. The supported codes are `en`, `fr`, `ht`, `es`, `zh-Hans`. One published English CMS record carries embedded language maps; separate published locale records are not required. Unfinished Creole stays unavailable and falls back to reviewed English. Legal bodies and non-text financial config are preserved.

## Screen, control, demo and comment investigation

[source-inventory.json](source-inventory.json) traces 1079 production/shared controls across 78 files, plus 449 controls in 51 explicitly isolated preview files. It records backend targets, navigation, handlers, unresolved calls, raw-error candidates and source hashes. Handler presence and static traces are not hosted action passes.

There are 229 production/shared comment blocks and 173 preview comment blocks in this scoped scan. Comments are implementation notes, not rendered frontend text. Remaining `demo` branches are unreachable with the production provider fixed to `demo:false`; preview/build fixtures remain isolated. The scan retains 26 production/admin copy candidates for context; this heuristic is not a leak verdict. The executed regression tests verify safe customer, vendor, receipt, card and operational error behavior. No broad claim that every hosted button passed is made.

## Client/backend contract check

[rpc-contracts.json](rpc-contracts.json) compares literal named RPC arguments with read-only live metadata and the fully tested isolated candidate schema. Static matches establish request shape only. Spread arguments remain NOT VERIFIED. Missing generic marketplace APIs are explicitly recorded as legacy/mixed-workspace limitations; Goodies-only dispatches bypass them. This does not establish all mixed-feature vendor dashboards as production-ready, and unrelated marketplace APIs were not implemented within Goodies scope. No RPC was executed against production for this check.

## Repeatable local checks

Customer: `npm ci --legacy-peer-deps`, `npm run test:goodies`, `npm run test:goodies-cross-role` (paired admin checkout), `npm run check:goodies-cms`, `npm run check:migrations`, `npm run lint`, `npx tsc --noEmit`. The CI workflow contains the exact Deno checks, isolated PostgreSQL race command and export commands. Admin: `npm run test:goodies`, `npm run typecheck` and both platform exports. The optional isolated browser harness is preserved in the paired admin report directory; it uses existing session Playwright/esbuild tools and adds no application dependency.

## Source history and deployment boundary

Work started from the preserved readiness work but continued on `main` as requested. The customer remote advanced from `53a8de7f` to `5f78d9c8` during this pass; those changes were integrated without reset, force push or overwriting the new Help Pay/contact/sharing work. The original readiness source is unchanged; the customer checkout has an untracked generated dependency symlink to the active checkout. GPS fix `75857548` is an ancestor of the preserved customer readiness branch and its behavior is ported to the main candidate.

[implementation-commits.json](implementation-commits.json) lists every implementation commit and changed file in both repositories. Evidence-only commits follow that register. The exact local source hashes are recorded in the control inventory. Remote push and GitHub CI are NOT VERIFIED for these local revisions. The customer CI pins admin source `42cb1613b62826fd792e41e1c69ad61f191e7199`; after explicit push approval, publish the admin commits first, then customer commits. No deployment workflow was introduced.

## Remaining release requirements

1. Obtain explicit authorization to push the reviewed local commits to both remote `main` branches; then verify the configured GitHub checks. This is separate from production deployment approval.
2. Review the current drift and backup/recovery capability, approve and deploy the 15-migration package and paired applications, then verify the actual definitions/permissions. Keep settlement and private-proof rollout gated until their prerequisites pass.
3. Run [hosted acceptance](acceptance-plan.md) using approved synthetic role accounts and payment-provider sandbox configuration. Verify order/notification/reconciliation state across customer, vendor, courier and admin, including failures and concurrency.
4. Supply/restrict the Android Maps key, link the existing Expo project with authorized signing access, install signed development/release builds and perform physical GPS/background/offline/push checks. The prepared `eas.json` profiles require no later source rollback.
5. Approve the deferred FAQ/support/policy content, complete super-admin Creole review when desired, and perform real CMS publishing/reload acceptance. The prepared four-language content is not published.

No untested item is classified PASS. The user instruction not to deploy remains in force.
