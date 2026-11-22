# Goodies operating-guide audit — 22 November 2026

This audit supports the [Goodies operating guide](../../../src/features/Goodies/README.md). It inspects the consumer/vendor/courier source in `momojdy/tiss_tiss_beta` and admin source in `momojdy/tiss-admin`, plus read-only metadata/configuration from Wantiss Supabase `ycbirmgppwavorwudlrv`.

Source baselines: customer `bbbff4d7b50379486e78ae49b40e2cad303181e4`; admin `279c812bc3e81fedd89d63db0152859f4f9e8640`. Concurrent work on another Wantiss feature was preserved; dedicated Goodies runtime files were unchanged. This pass changes documentation/evidence and two obsolete admin test expectations. No application behavior/UI, production data, CMS content, secret, schema or app deployment was changed, and no hosted synthetic test or provider charge was run. The published package contains summarized results and source route registrations. Detailed live schema, policy, grant and configuration snapshots are retained locally and excluded from this publication.

## Scope and meaning of the result

**Goodies is not certified production-ready.** Source connectivity, deployed contract compatibility and configuration checks can pass while device/payment/authorization acceptance is still unverified. Owner deferrals do not turn those unperformed checks into passes.

The current-source inventory parses/hashes 112 scoped files, including 100 AST files. It records 1,575 functions, 1,349 interaction bindings, 456 backend call sites, 226 service call sites and 537 navigation call sites. Recognized literal registry destinations have zero unresolved targets. Seventeen dynamic targets are retained as unresolved runtime acceptance, not assumed correct. These are source occurrences, not an exhaustive count of every rendered phone button.

Customer navigation has 34 registered routes; the shared Wallet contributor screen is additional. The shared Business Space registry has 22 destinations, including its dedicated Goodies pages. Admin has 14 registered Goodies modules. The [screen register](screen-register.json) separates registration/CMS association from installed Android/iPhone acceptance.

## Fresh checks

| Classification | Evidence and limit |
| --- | --- |
| **PASS** | Current CMS source check: 34 routes, 73 page/shared groups and 1,921 fields, with no direct customer JSX text bypass detected. This is not edit/publish/installed-reload acceptance. |
| **PASS** | Client secret scan: 678 source files; no matched embedded privileged Supabase JWT/private provider key. Runtime secret configuration and provider restrictions are outside that scan. |
| **PASS** | Literal RPC comparison: 157 compatible sites, six partial argument shapes, zero incompatible signatures. Six dynamically named sites remain unresolved. |
| **FAIL — shared/mixed scope** | Nine shared RPC names are absent. The Goodies-only dispatches bypass them; other/mixed-feature business paths can still reach legacy dependencies. See the missing-contract analysis below. |
| **PASS** | All 11 inspected deployed Edge entry files match repository text. The FX/push processor files included in their packages also match. This does not verify every imported dependency or provider credential. |
| **PASS** | Read-only metadata: all 26 Goodies plus two Help Pay public tables have RLS enabled. Authenticated direct order INSERT/DELETE and protected ownership/money-column UPDATE grants are absent. The inspected base placement and Wallet/request refund helpers are not directly executable by authenticated/anonymous clients. |
| **PASS** | Shared Bill Wallet funding, settlement and private-proof switches are enabled. Wallet payout is on; the four external payout channels are off. Private proof bucket metadata matches the intended private/MIME/size policy. |
| **PASS** | Fresh focused suites: settlement 17, Shared Bill recovery 9, delivery pricing 4 and courier-map 5: **35 tests**. They use local stubs/fixtures and do not establish hosted financial or device acceptance. |
| **PASS — targeted repair** | Two admin publication tests were aligned with the existing independent editorial-review policy. They still verify production English fallback and that publishing does not promote review status. **37 focused checks total**; no application policy was changed. |
| **FAIL — owner deferred** | Supabase advisor still reports leaked-password protection disabled. |
| **NOT VERIFIED** | Every authenticated hosted/installed button, restricted-staff/cross-account boundary, complete order outcome, provider/3DS reconciliation, device GPS/background/push/proof behavior, installed CMS reload and full production restore. |

The full test suite was not rerun for this documentation/test update. The observed customer CI is green. Admin CI at the recorded baseline failed those two obsolete review-policy expectations; the repaired cases pass locally, while a full admin CI rerun remains NOT VERIFIED. [CI observation](ci-observation.json). Previous isolated PostgreSQL/concurrency, provider and native-build results remain historical evidence at their recorded revisions. Fresh TypeScript/lint and documentation consistency checks are recorded in [verification.json](verification.json).

## Financial rules confirmed from current functions

- Order commission snapshots use **10% of discounted products** and **7% of delivery fees**. Customer service fee is separately configured and currently **$0**. Tips remain separate. Financial snapshots are immutable after checkout.
- Product, variation/builder, availability, promo, fee and exact-total checks are server-side. Multi-store delivery fees are summed with optional separately allocated surcharges, not described as an optimized multi-stop road itinerary.
- Group checkout uses the **host's Wallet**. Help Pay uses creator/contributor debits, **60/40 share or full payment**, a **30-minute** request window and a creator-owned resulting order. Final funding revalidates checkout and reserves stock once; contributors recover their own funds on failed checkout/cancellation/expiry.
- **5,000 HTG is tracked outstanding cash-sales exposure**, using the order total and locked FX. It is not a fee limit or lifetime turnover. The applicable cash admission/acceptance checks and settlement balance use that value.
- Eligible earnings mature after a **24-hour hold**; disputes/refunds/remittance/recovery can block availability. The live activation cutoff is 22 November 2026 at 02:07:21 UTC.
- The weekly rule is a **rolling seven-day deadline after the cash commission hold**, with reminders. There is no fixed weekday automatic payout batch in the inspected implementation.
- Wantiss Wallet payout is an instant internal credit after eligibility/verification. External digital-wallet timing is two calendar days and bank timing 7–14 business days in the model; all four external channels are disabled and lack completed provider acceptance.
- Paid Wallet cancellation refunds the order total, including each actual Help Pay payer. Card refunds return to the **original card** and reconcile prior/pending provider refunds. Legacy refund-fee flags do not establish a withholding policy in those automatic handlers.
- Platform-courier completion and merchant-own-driver customer receipt are distinct. The customer-confirm-received RPC is own-driver-specific. Own-driver receipt expiry can precede an additional settlement hold; do not promise payout 24 hours after merely uploading delivery proof.

The guide contains a balanced $22 example and distinguishes recorded allocations from completed vendor/courier transfers.

## Current content and platform state

Published `goodies.content` version 6 has 2,091 label records. English has 647 reviewed labels; `fr`, `ht`, `es` and `zh-Hans` each have 129 nonempty labels and zero marked reviewed. Local prepared four-language material is not the same as deployed reviewed content. The source editor catalogue can contain newer keys than this published version.

The other languages reside inside the English payload, so absence of separate locale rows is not proof that the entire localization architecture is missing. All 1,921 source label IDs are present in the published payload. The consumer's public read contract returned HTTP 200 with version 6 and 11 published assets. This establishes a public read, not a publish-to-installed-device test. Publication no longer blocks on translation review or the five unfinished FAQ answers. The consumer resolver still respects review/fallback rules; a draft translation can be published as data without becoming the selected customer text. Haitian review remains owner-controlled.

All 11 published Goodies platform asset URLs returned nonempty image responses. This does not verify installed-image caching, physical layout or private delivery-proof uploads.

Live push configuration is **disabled**, bound to the existing Expo project. Its scheduled worker being active does not mean device delivery is enabled. The FX producer is enabled, has a successful current reference and zero recorded consecutive failures at observation. No rate was refreshed or changed by this audit.

## Confirmed limitations and consistency findings

1. **Mixed-feature legacy contracts:** `feature_requirements_status`, `submit_requirement`, `submit_verification`, `register_push_token`, `go_live`, `dashboard_range`, `action_required`, `activity_feed` and `search_business` are absent from live public RPC metadata. Goodies-only registration uses real application/document APIs, the Goodies push branch avoids the legacy token RPC, and a Goodies-first checklist opens its real store setup. Financial/search/activity dispatch falls back to the missing generic APIs for other/mixed-feature businesses. Do not label these nine as missing Goodies-specific contracts or certify mixed-feature business use.
2. **COD caption:** `screens/Shop.tsx` still describes cash as requiring an available courier, while the active settlement-enabled backend branch can admit merchant-managed COD using store permission, rate, exposure and overdue-commission rules. This is confirmed wording drift; this documentation pass does not edit or publish UI copy.
3. **Weekly-cycle interpretation:** implementation enforces a rolling cash-commission deadline, not an automatic calendar-week payout run. This is an explicit behavior distinction for the owner, not evidence that a fixed weekly batch was tested.
4. **Content versus publication:** publication is allowed independently of review, but production lookup still checks review/fallback. Manual edits and machine preparation are not automatically visible translated copy. Five FAQ placeholders remain deferred; approved policy/support content and installed delivery acceptance remain incomplete.
5. **Security certification:** advisors include intentionally privileged client RPCs and intentionally private tables without client policies. Their presence is not by itself a vulnerability. Internal helper grants and selected checks were inspected, but full restricted-staff authorization is not certified. The delivery-assignment SELECT policy retains a legacy `profiles.role` admin branch; restricted-staff GPS access needs explicit acceptance. Profile role is not directly client-updatable in the observed grants.
6. **Financial promotion administration:** the published coupon list is empty; the structured CMS fields edit existing coupon title/description, and vendor promotions are a read/list/support surface. The inspected publish function/triggers do not synchronize financial codes into `goodies_promotions`, and there is no dedicated promotion-write RPC in the live catalogue. This is a connected-operation gap, not a reason to let an unrestricted text edit authorize discounts. It has not been deferred by the owner.

## Navigation, demos and comments

Reachability finds all 53 scoped customer Goodies source files reachable from the actual entry. Admin has one unreachable mirrored `courierNavigation.ts` helper; it is not an unused customer page or a fake operational screen.

The inventory records 268 comment tokens and 266 demo/placeholder/preview reference lines. Those include 64 input hints/styles, 18 comment references, seven GPS sample terms and 177 contextual references, including intentional editor fixtures. These word counts do not establish fabricated production transactions. The inspected customer/tracking/financial flows use backend state, and the CMS preview uses its existing isolated ports. A source/import scan does not certify the absence of every possible runtime fake-data path.

There was no basis in this documentation pass to delete a production screen merely because its source says “preview,” “sample” or “placeholder.” The guide identifies real unavailable/error states instead of describing them as fake success.

## Owner deferrals versus remaining acceptance

**Explicitly deferred:** final FAQ/support/policy content; final localization and owner-reviewed Creole; bank/GCash/MonCash/NatCash provider payouts; leaked-password protection until the planned plan upgrade; production backup export/full restore; releasing the complete Wantiss super-app.

**Still required, not treated as approved exclusions:** installed screen/button and cross-role/authorization acceptance; actual isolated Stripe sandbox/3DS/webhook/refund reconciliation; configured development/release signing and Maps/push credentials; physical Android/iPhone GPS/background/offline/proof checks; installed CMS reload. The owner has both phones, confirmed no paid Apple Developer membership and found a Google Cloud Wantiss project. Project visibility alone is not native credential verification.

No hosted isolated Supabase test was created or run. Existing shared Stripe test-mode webhook forwarding prevents safe repetition of synthetic provider financial tests there; use an approved isolated Stripe sandbox with forwarding to hosted Wantiss disabled. This does not authorize a new hosted Supabase testing project or an app release.

## Evidence and reproduction

- [Verification summary](verification.json), [route/CMS screen register](screen-register.json), [existing CI and focused repair](ci-observation.json).
- Detailed local source/control inventory, RPC comparison, Edge comparison and read-only backend snapshots support the summarized counts above. They are not uploaded with this report.
- Recreate the local source inventory with `node scripts/inventory-goodies-controls.cjs --output /tmp/goodies-source-inventory.json`; the generator executes no application handler or backend call.
- Recreate the static RPC comparison with `scripts/audit-goodies-rpc-contracts.cjs` against a freshly approved read-only catalogue, and reachability with `scripts/audit-goodies-reachability.cjs`. Keep detailed live metadata private. Do not substitute an old catalogue for a new live observation.

No unexecuted scenario is classified PASS. No production app rollout or unconditional “100% secure/ready” claim is made.
