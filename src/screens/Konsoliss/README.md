# KONSOLISS — MASTER BUSINESS LOGIC AND ENGINEERING CHECKPOINT

**Checkpoint date:** 2026-11-24  
**Consumer repository:** momojdy/tiss_tiss_beta  
**Admin repository:** momojdy/tiss-admin  
**Shared Supabase project:** ycbirmgppwavorwudlrv (Wantiss)  
**Status:** product-policy checkpoint and implementation specification; **NOT a claim of fully implemented or commercially launched functionality**.

> **Read this section first in every new ChatGPT/Codex conversation.** It records the founder's latest decisions, rules, exact tariff examples, system architecture, implementation gaps and preservation requirements. Older review documents and the historical technical notes below may propose conflicting alternatives; the latest explicit founder decisions here take precedence. Check the *actual current* repository and live schema before changing code. Never claim a feature, test, payment, customer shipment or partner integration is working solely because it appears in this document.

## Latest 3D acceptance gate — 2026-11-25

**HOLD: 3D container is not production-ready. Visual design approved; consumer/admin validation recovered; strict lifecycle migration applied and read back.** Read the full [3D acceptance audit](../../../docs/konsoliss/3d-acceptance.md) before proceeding to the next button. It supersedes older visual-review claims with actual baseline CI failure evidence, live PostgreSQL catalog checks, all 23 scenario dispositions and the remaining production gates. The narrow audit corrections preserve the approved design and do not mutate the database or deploy the app.

## 0. Decision status and change discipline

- **AGREED / OWNER DECISION:** The intended product behavior. Implement it unless it is technically unsafe or conflicts with applicable law; surface those constraints instead of silently changing the product.
- **WORKING / CONFIGURABLE:** An operational starting formula or process discussed and supported in review, not an immutable value. Keep admin-configurable and versioned; do not silently turn a stress-test number into a real supplier quote.
- **OPEN / LATER:** A decision dependent on cost evidence, actual providers, insurance or legal review. Build a safe configuration or inactive integration point now. Do not invent its answer.
- **IMPLEMENTED / VERIFIED:** Only claim this after reviewing code, database, migrations and tests. This document's audit snapshot does not supersede newer evidence.

**Immediate scope approved by founder:** build the *complete, connected technical system* in Supabase, consumer Konsoliss and Tiss Admin, in small verified sections. Real third-party contracts, fresh provider pricing evidence, formal legal counsel sign-off, insurance purchases and launch authorizations are **later**, not blockers to implementing schemas and app workflows. Existing consumer pricing milestones ARE already defined; **do not demand a new freight quotation exercise before building the pricing engine**. Nonetheless, do not enable uncontrolled real-money shipping before commercial/external readiness.

## 0A. Three-country expansion and multi-destination route optimization (2026-11-24 founder update)

**LATEST OWNER DECISION — supersedes Haiti-only scope references throughout older sections below:**

1. **Launch destination markets:** Haiti, United States of America (USA) and Dominican Republic; origin remains the China warehouse. The existing five-tier tariff ($27 at 0.02, $99 at 0.10, $249 at 0.30, $379 at 0.50, $675 at 1.00 CBM) is currently **Haiti-specific**. USA and Dominican Republic tariff values are **to be provided later**, and must be separate, versioned and editable through Tiss Admin. **Never auto-apply Haiti prices to USA/DR**, invent prices, or expose a live payable quote for a destination without a published valid tariff and verified eligible service.
2. **Homepage:** Do **NOT** add a 45–80-day guarantee banner or new delivery card near the existing 3D and progress area. Founder wants delivery timing, binding guarantee, exceptions and links to customer terms **inside the existing Book Space journey**, after destination selection and before payment. Preserve all approved homepage styling and the existing top-left customer load summary.
3. **Destination-specific policy:** The **Haiti** 45–80-day warehouse-to-warehouse window, binding Day-80 guarantee (from verified China receipt to Haiti pickup readiness) remains explicitly agreed. The founder has **not yet set US/DR price cards, exact destination warehouse/city, or whether their delivery guarantees are identical**; make those route/service-level settings configurable. Do NOT silently extend the Haiti-specific promise to every country without approval.
4. **Shared-route opportunity:** Admin must support cost/risk comparison of three strategies: (a) separate direct consolidation per destination; (b) contracted compatible **multi-destination ocean leg** with distinct discharge/consignment/customs flows; (c) origin co-load/common sea leg to a **bonded hub**, followed by authorized deconsolidation/transshipment to Haiti, USA and/or DR. Use freight forwarders who service multiple requested destinations when commercially beneficial. **Never assume a vessel touching three ports permits ordinary partial unloading of one sealed FCL**. Require actual carrier permission, customs/bonded processing, suitable bills/manifests, feasibility, unloading/transshipment handling and lead-time/cost verification. A forwarder servicing all countries does not prove any particular shared-container plan.
5. **Consolidation example (illustrative only):** 20 CBM Haiti + 18 CBM Dominican Republic + 20 CBM USA = **58 CBM of total demand**. This does **not** imply 58 CBM may automatically be loaded into a single 40HQ for three import countries; only permitted route-leg-compatible parcels may share a physical container. Sum physical CBM/kg **once per actual leg**, and calculate final-country allocation, destination-specific customs, discharge/handling, transit, and margin independently.
6. **Data design:** commercial destination_country, specific destination_service_area/pickup hub, accepted rate_card_version, customer_terms_version, warehouse_receipt and delivery_commitment belong to every booking/lot. Model actual transport_routes, route_legs, port_calls, multi_country_consolidation_options, package_leg_assignments, handoff_events, partner_consignment, customs_entries and destination-specific costs/statuses. A physical container may carry several destination-specific consignments **only if the route and documents allow**; cargo can transfer at a verified hub while retaining its original owner/destination/receipt clock. Never merge independently owed final-country customs liabilities.
7. **Financial decision:** compare **fully all-in** own-container vs partner route combinations, including each country's import customs, CFS/hub/transloading, equipment, storage, double handling, possible delay, inland transport and risk, against independent direct service. Joint routing is chosen only when safe, contractually supported, deadline-compliant and net contribution improves. Faster/more profitable shipments cannot arbitrarily delay an earlier due customer's load.
8. **Consumer 3D:** keep the existing real physical container illustration and top-left *user aggregate* reserved/loaded/inbound values; where the customer owns shipments for different destinations, support per-booking/per-destination detail and only display the actual selected physical container's loaded cargo. Do not invent a single physical multi-country container when the cargo uses several different carriers/legs. Commercial reserved CBM cannot be treated as interchangeable across distinct destination commitments.
9. **Delivery checkout journey:** existing Book Space chooses country and applicable actual available service; display price, customs/service inclusion, verified route-specific estimated window, binding maximum if adopted, conditions and delivery terms **there**, not as new homepage real estate. Explicitly indicate "pricing not available yet" for USA/DR until their Admin price cards and required rules are published.

**Implementation priority unchanged:** small, verifiable sections, beginning with existing top-left summary source-of-truth; first add country/route-ready schemas/configuration and do not disturb approved 3D UI. Third-party contracts and final non-Haiti terms come later; provide admin fields/workflows now. Existing Haiti-focused examples remain valid **for Haiti only**.

---

## 0B. Reservation-only animation and real physically loaded visualization (2026-11-24 implementation)

**LATEST FOUNDER UX DIRECTION: Keep approved homepage layout; no new marketing-style public-filling dashboard.** An individual customer should feel that *their own space and goods are progressing*, without being told that departure waits for a completely full Konsoliss 40HQ. Our own-container vs third-party fallback and binding service commitments are not contingent on 100% visual fill.

**Three distinct visual data states:**

1. **No recorded purchase and no real container assignment** -> retain the original 40HQ demo/empty animation unchanged. It is illustrative, not shipment history.
2. **Customer has a recorded positive reserved CBM, but ZERO physically loaded CBM** -> render a nonphysical **reservation preview**. A small symbolic tan carton enters from the canvas's upper-left and fades into a translucent yellow/dashed-red 3D reserved-volume outline where an entirely empty illustrated container is shown. The outline's model volume is proportional to customer's verified reserved CBM / 68, including 0.020 CBM. Text explicitly distinguishes **Space purchased (reserved)** and **Loaded 0 CBM**. The carton does NOT remain as solid physically loaded merchandise and does NOT change the physical load counters. If an assigned, measured physical container already has *other customers' real cargo*, preserve their true brown loaded volumes, do not draw a reservation cuboid over that cargo, and show only the symbolic approaching/fading preview and accurate labels. For reservations larger than one nominal 68-CBM 40HQ, no false single-container volume outline is drawn.
3. **At least some customer goods are physically scanned and loaded into a real assigned container** -> retain the current existing proportional red customer cartons, natural brown/tan other-customer cartons, actual physically free yellow translucent region with red dotted outline, tiny 0.02 marker, red cargo callout and 7-second alternating progress bars. Add only a subtle animated pulse at the verified red customer cargo anchor; **never invent repeated new physical loading events**. The top-left headline remains **(verified physically loaded + inbound-to-container) / purchased CBM**, and subtitle remains the split between loaded and inbound. Actual box-specific L/W/H placement is NOT yet derived from physical package-dimension records; current renderer is volume-proportional illustration, not proof of exact box geometry.

**Commercial trust / buyer psychology:** Real-time *entire container* fill is not the home screen's headline; emphasize personal progress. Continue showing a verified selected real-container percentage/free space through existing control and seven-second alternating bar when assigned, never an invented global percent for someone with no physical container. Do not create fake urgency, pretend 100% is required to sail, or conceal a binding guarantee's at-risk status.

**Changes committed 2026-11-24:**
- Consumer main visual: `src/screens/Konsoliss/konsolissHomeScreen.tsx`; commits `b072628517f318eaf2768130cdc7b4f791e90303` and `01c9991479eae2b0c1e3279475f401eeaea720d5`. A new data-preview mode separates paid/no-physical-load preview from the old empty DEMO and the actual loaded renderer. Existing carton geometry/materials preserved.
- Consumer tests/fixtures: `tests/konsoliss-homepage.test.cjs` and `tests/helpers/konsoliss-runtime.cjs`; latest commits `bd815f1930eecb1f245d60f2899c8e3100bdc55b` and `5e80f49fdd3843a13acf2f96f1703fd6beff6bb8`; cases for unassigned reservation, assigned reservation with other cargo, empty demo and actual red loaded mode.
- Tiss Admin generated homepage preview synchronized from approved consumer source: `src/features/admin/screens/content/konsolissPreview/konsolissHomeScreen.tsx` commit `a74db71c0432ff483b11c396c643cef9b483288a`; matching SHA256 source manifest commit `a7b67d587f9ebc73e09d27203790557f72552d75`. Future consumer homepage modifications MUST run `npm run sync:konsoliss-preview` and `npm run check:konsoliss-preview` again.
- **Verification performed:** extracted embedded JS compiled; direct mocked-canvas smoke checks passed in six representative states (empty, 0.02 and 1.0 reserved, assigned with other-customer loaded cargo, 0.02 physically loaded, ~99% loaded). Source and preview hashes were calculated and updated. **Native device screenshots, full npm tests, typechecks, payment-driven source-of-truth updates and measured real carton L/W/H remain NOT verified in this pass.** No Supabase/schema migrations or real customer data changes in this small visual section.

**Remaining follow-up before production:** authoritative booking-level paid reservations, real warehouse/package-scanned physically loaded totals and customer ownership, accurate carton-specific L/W/H from measured packages if the visual is ever presented as an exact pack plan, actual device/simulator animation validation, updated comprehensive two-app tests. Do not fake those inputs.

---

## 0C. Temporary ten-state demo tour and never-sent cargo treatment (2026-11-24) — demo controls superseded by 0D

**Founder request:** For development review, place a small Demo states switch on the existing Konsoliss home page so the founder can watch every customer visual state, then return to the original empty-container animation. **This is a temporary beta preview**, not the production customer experience; do not ship it enabled publicly.

**Implemented behavior:** On the home screen, **Demo states** starts an automatically advancing tour. The empty animation runs first for approximately 9 seconds, and later states for approximately 6.5 seconds each. At the last example it **returns to Empty and stops automatically**. During the tour, **Previous**, **Next**, **Pause/Play all** and **Exit demo** are available. Previous/Next pause autoplay; Exit restores the logged-in account's real Supabase-backed display, or its real empty state if there is no booking. A prominent **DEMO ONLY / simulated preview** note remains on screen; other booking/navigation actions are temporarily noninteractive during the demo. No sample order, container, payment or load is inserted into the database, and no demo physical-container ID is queried.

**Ten in-memory scenarios (only indicated quantities are simulated):**

| # | Demo stage | Purchased / reserved CBM | Goods sent CBM | Inbound-to-container CBM | Physically loaded CBM | Physical 40HQ loaded CBM |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Empty animation, no purchase | no row | — | — | — | no assigned container |
| 2 | **Purchased, nothing EVER sent yet** | 1.000 | 0.000 | 0.000 | 0.000 | none |
| 3 | Valid tracking, goods sent but not received | 1.000 | 0.700 | 0.000 | 0.000 | none |
| 4 | China warehouse received, awaiting allocation | 1.000 | 0.700 | 0.000 | 0.000 | none |
| 5 | Assigned to container, not physically loaded | 1.000 | 0.700 | 0.700 | 0.000 | 23.000 other-customer cargo |
| 6 | Partially physically loaded | 1.000 | 0.700 | 0.300 | 0.400 | 30.400 |
| 7 | Customer fully loaded; overall container not necessarily full | 1.000 | 1.000 | 0.000 | 1.000 | 55.000, still 'filling' |
| 8 | Tiny 0.020 CBM purchase physically loaded | 0.020 | 0.020 | 0.000 | 0.020 | 0.020 |
| 9 | Third-party consolidator received cargo | 1.000 | 0.700 | 0.000 | 0.000 | no fictional own container |
| 10 | **Never sent; valid D25/D32 expiry and release** | 0.000 active rights | 0.000 | 0.000 | 0.000 | none |

**Important commercial state distinction:** A customer can pay for CBM and send *nothing*, for days or until a valid contractual expiry. This is a real required backend state, NOT an automatic loaded event, tracking submission, warehouse receipt or starting point for the Day-80 guarantee. Before the applicable D25/D32 cutoff and any valid release, the customer's rights remain reserved; send reminders and show the purchase/booking's deadline. After a valid expiry, active entitlement can be released through an atomic audited transaction, but the original booking history, payments and lawful refund/retention resolution remain in separate records. Never release goods genuinely already in transit under valid tracking. The demo expiry state only illustrates the resulting display; actual expiry logic and notifications remain TO BUILD.

**Visual distinction for never-sent:** The top-left retains the established **(loaded + inbound) / purchased** display. The existing expanded breakdown shows Goods sent = 0.000 CBM. Inside the 3D, a **translucent dashed ghost carton**, not a solid cardboard box, symbolizes a reserved place; text explicitly says **Goods sent 0 CBM**. After verified carrier dispatch, the symbolic carton may appear solid while the renderer continues to state **Loaded 0 CBM** until actual physical loading. The outline/cargo animation is strictly illustrative. Real physically loaded customer cargo is still red; the existing other-cargo colors, natural spacing, empty yellow/red-dotted section, 0.020 miniature, relative physical-volume arithmetic and 7-second alternating bars remain.

**Files and commits:**
- Consumer homepage and 3D renderer: src/screens/Konsoliss/konsolissHomeScreen.tsx, latest commit fe8907820f49e9e2046ae58156c37a2d136e13ba; prior demo switch 7e3b8466824efd5ffaa3ce56509835d53a6a751d, autoplay 38a720ffb61e7ac8c888a1a989ff239b1a72386e, ghost-carton changes e9ff6942689f3ea6851c354d3b58f0d304fa7e4d.
- Consumer regression tests: tests/konsoliss-homepage.test.cjs, latest 0fcf24c9df59f0d70361f3540a770fd4fbd82211, covers ten states, correct values, never sent vs sent, reset/exit and demo isolation.
- Tiss Admin generated homepage preview and hash manifest: commits 91b5a7543b478b62431e3a876e49313ba0936568 and 88864a95edfad8d6a9490e7c9478e0943356150c; rerun normal preview generator/check with both local checkouts at final validation.

**Verification boundaries:** Ten scenario arithmetic checks passed. Embedded JavaScript compiled and mocked-canvas smoke checks passed empty, reserved-no-goods, sent-but-not-loaded, assigned-with-other-cargo, partially loaded and 0.020 CBM loaded, including ghost vs solid behavior. Full local npm tests, native device animation screenshots, complete TypeScript check and integration tests have **not yet been run**. No Supabase schema/data/payment changes in this visual tour task. **Before production:** disable KONSOLISS_DEMO_TOUR_ENABLED or remove the temporary demo controls, and verify no simulated states are customer-accessible.

---

## 0D. Multi-state DEMO / PREVIEW selector and allocation-aware 3D (2026-11-25 implementation)

**Supersedes the ten-state auto-tour in 0C.** Same approved homepage, cartons, colors, empty animation, top-left component and 7-second bars. Changes are limited to the 3D data interpretation and the temporary preview controls. **The demo is still ON and awaiting founder visual review; it has NOT been declared approved.**

**What changed**
- New pure module `konsolissPreviewScenarios.ts`: 23 frontend-only scenarios (A1-A5, B1-B4, C1-C7, D1-D6, D6b), derived quantities identical to the live `konsoliss_customer_load_breakdown` formulas, per-container views, an optional separate *unassigned* view, autoplay helpers and the feature flag. It imports no Supabase client, hooks, storage or network API (enforced by a test).
- New `useKonsolissPreviewController.ts`: holds only index / view id / autoplay / replay counter. Live hooks keep running underneath and are never mutated, so **Live / Original** restores genuine data without contamination.
- `konsolissHomeScreen.tsx`: compact selector (grouped list, Prev/Next, Replay, Play all/Pause, Live / Original, **DEMO ONLY** badge + panel). Autoplay advances every 7 s (9 s on A1) and **stops on the last state**; it never returns to empty by itself. Sheets (Book Space, Load Items...), quick menu and bottom navigation are inert in demo, so no support request, checkout, notification or claim can be created from a fixture.
- Renderer additions (carton geometry/materials/labels/empty animation untouched): (1) **allocation overlay** borrowed from the approved HTML: translucent red = inbound, dashed outline = allocated/reserved but unfilled, volumetrically proportional box starting at the loaded boundary, labelled "X CBM reserved here . not loaded yet"; (2) **sealed/closed containers** (status filled/departed/arrived) hide the yellow free region and the "CBM free" label, and the top-right shows the verified status instead of "available" (applies to live data too); (3) captions and an "Illustration . not a real container" tag for reservation previews; (4) customer red cartons are now chosen from **fully visible** cartons so the last carton is never clipped to a sliver (critical for C4); (5) callout now shows three decimals ("My current loaded space 0.500 CBM"); (6) `prefers-reduced-motion` freezes the preview flight and pulse (the original empty animation is unchanged).
- Live data now also passes `yourAllocatedCbm` to the overlay. With no per-container inbound figure available it draws only the dashed allocated-not-loaded outline, never an invented inbound portion.

**Calculation rules (unchanged, now tested)**
- Headline = (physically loaded + inbound) / purchased, e.g. 0.300 + 0.100 -> **0.400 / 0.500 CBM**; subtitle shows Loaded and Inbound separately.
- Customer completion and shared-container fill are independent: C4 is 100% customer loaded while the 40HQ holds 51.700 / 68 CBM (~76%). Seal status comes only from container status, never from the customer's percentage.
- A container's percentage uses `loadedCbm / 68`, never purchased CBM. An unassigned customer or third-party shipment never inherits a physical container. Warehouse-received never becomes loaded.

**Demo fixtures (CBM; purchased / sent / loaded / inbound; container other-cargo)**
| Code | Purchased | Sent | Loaded | Inbound | Container |
|---|---:|---:|---:|---:|---|
| A1 | - | - | - | - | none (original empty animation) |
| A2/A3/A4 | 1.000 | 0 | 0 | 0 | none (A3 day 22/25; A4 label created, not accepted) |
| A5 | 1.000 | 0.700 | 0 | 0 | none (carrier accepted, in transit) |
| B1 | 1.000 | 0.400 | 0 | 0 | none (0.400 warehouse-verified) |
| B2 | 1.000 | 0.700 | 0 | 0 | none (0.700 at warehouse) |
| B3 | 0.500 | 0.500 | 0 | 0 | A: other 23.0, 0.500 allocated outline |
| B4 | 1.000 | 0.700 | 0 | 0.300 | A: other 30.0; 0.400 at warehouse, 0.300 unused |
| C1 | 0.500 | 0.300 | 0.300 | 0 | A: other 51.2; 0.200 unassigned view |
| C2 | 0.500 | 0.500 | 0.300 | 0.100 | A: other 51.2; 0.100 outline (not allocated) |
| C3 | 1.000 | 0.700 | 0.700 | 0 | A: other 40.0; 0.300 unused (not 100% utilized) |
| C4 | 0.500 | 0.500 | 0.500 | 0 | A: other 51.2 -> 51.700 / 68 (76%), filling |
| C5 | 0.500 | 0.500 | 0.500 | 0 | A: other 60.1 -> 60.600 / 68, status filled (sealed) |
| C6 | 0.020 | 0.020 | 0.020 | 0 | A: other 30.0 |
| C7 | 1.000 | 0.700 | 0.500 | 0.100 | A (sealed): other 48.0, loaded 0.400; B: other 22.5, loaded 0.100 + inbound 0.100; 0.400 unassigned view |
| D1 | 1.000 | 0.700 | 0 | 0 | none (third-party milestones) |
| D2/D3 | 1.000 | 1.000 | 1.000 | 0 | A: other 57.0, departed / arrived (customs and pickup shown as separate pending statuses) |
| D4 | 0 active | 0 | 0 | 0 | none; history line keeps the paid booking |
| D5 | 1.000 | 0.700 | 0.400 | 0.300 | A: other 30.0, incident flag |
| D6 / D6b | - | - | - | - | unavailable / loading: nothing drawn, dashes shown |

**How to use:** consumer home screen -> **Demo / Preview** (top right under the header) -> tap the state name to pick any scenario, or use Prev / Next / Replay / Play all. For C7/B4/C1 open the container pill to switch between each real container and the *Not assigned yet* view. **Live / Original** returns to Supabase data. The same controls appear in Tiss Admin's generated homepage preview.

**Production restriction:** the selector is enabled unless `EXPO_PUBLIC_KONSOLISS_DEMO=0`. **Every public/production build MUST set `EXPO_PUBLIC_KONSOLISS_DEMO=0`** so customers can never see simulated records. Do not remove the demo until the founder approves.

**Consumer/Admin synchronization:** `scripts/sync-konsoliss-preview.cjs` now also copies `konsolissPreviewScenarios.ts` and `useKonsolissPreviewController.ts`. Run `npm run sync:konsoliss-preview` then `npm run check:konsoliss-preview` after any homepage change.

**Git commits:** consumer `momojdy/tiss_tiss_beta` `5c40d95` (feature, tests, README) + the follow-up commit that refreshes the renderer-contract hash and records these IDs (`git log -2`); admin `momojdy/tiss-admin` `e223097` (generated preview sync).

**Files:** consumer - `konsolissHomeScreen.tsx`, `konsolissPreviewScenarios.ts`, `useKonsolissPreviewController.ts`, `scripts/sync-konsoliss-preview.cjs`, `tests/konsoliss-preview-states.test.cjs` (new), `tests/konsoliss-homepage.test.cjs`, `tests/konsoliss-renderer-contract.json`, `package.json`. Admin - generated files under `src/features/admin/screens/content/konsolissPreview/`.

**Tests run (2026-11-25, plain Node; dependencies are not installed in the authoring sandbox):** `konsoliss`, `konsoliss-homepage`, `konsoliss-preview-states`, `konsoliss-language-hook`, `konsoliss-lifecycle` all PASS; `check:konsoliss-preview` PASS; admin `tests/konsoliss.test.cjs` PASS (8). Covered: all 23 scenarios selectable and any-to-any switching, replay remount, autoplay stop-at-last, exit restoring live data, top-left arithmetic, C4/C5 independence, 0.020 CBM, split containers + unassigned view, third-party, expiry, unavailable/loading (no canvas), 99%/100% occupancy, rotated view, reduced motion, demo-module isolation. Every scenario was also drawn in headless Chromium and inspected as screenshots (HTML canvas only, not a native device).
**Renderer contract hash** (`tests/konsoliss-renderer-contract.json`) was already stale at the previous HEAD (the lifecycle test failed before this change); it now records the current renderer with a note. `tests/konsoliss-lifecycle` test 4 also passed again because the old KS-DEMO tour was removed.
**Pre-existing, unrelated failure:** admin `tests/cms.test.cjs` #18 (GoodiesQuickMenu hash) fails before and after this change.

**Remaining limitations (honest list):** native iOS/Android WebView and touch performance not verified; `tsc` for the whole app and lint could not run (no node_modules, installs blocked) - only the new pure modules were strict-type-checked and the home screen transpiled; new demo labels and canvas strings are English-only (live states reuse existing localized keys, no CMS catalog change); the red cargo is carton-quantized (about 0.5 CBM per carton), not a measured pack plan; the live view merges warehouse and in-transit and has no per-container inbound figure, no deadline/Day-25 data, no domestic-carrier acceptance events, no partner-milestone records, no incident records and no valid-release event, so A3/A4/A5/B1/B2/D1/D3/D4/D5 can only be demo visualizations until those backend records exist.

---

## 0E. V6→V7 financial integrity and connected request foundation (2026-11-25)

**Latest implementation checkpoint, superseding older V6 simulation claims where they conflict.** This section records code/database work completed on 2026-11-25. It is **NOT** approval to enable real payment, customer shipping, live physical loading, automatic refunds or a production release.

**Authoritative decisions [AGREED; unchanged]:** 0.020 CBM minimum; Haiti-only five-point tariff with versioned quotes; 412 kg per physical CBM billing divisor; per-purchase D12/D25/D32; 45–80 calendar days from verified China warehouse receipt to Haiti pickup readiness with binding Day 80 where the lawful adopted terms permit; USA/DR/FCL service-specific terms and manual quotes; accurate real-vs-demo cargo visualization; no forced partner surcharge; preserve the approved home/3D UI and customer aggregate display.

**What was actually present first [IMPLEMENTED / previously verified]:**
- Consumer Book Space already submitted authenticated real Supabase quotation requests and allowed customer acknowledgement of precisely approved service scope; it did not capture payment, reserve CBM, guarantee cargo receipt or create shipment status.
- Tiss Admin already managed route quotation intake, scoped approvals and a separate booking wording editor. Existing `checkout_enabled=false` database constraint intentionally blocks unsupported real money/capacity activation.
- The uploaded V6 HTML is a **separate local simulation**, not a portable payment provider or a live integration. Defects reproduced included independent +0.20 CBM rights being unusable after original 0.30, disputed $20 settlement booking $120.53 as freight, false HT Day-80 for FCL, split-piece tracking ambiguity, missing expiry movements and completion discounts combining unrelated rights.

**Changes in GitHub and shared live Supabase [IMPLEMENTED]:**
- Both repositories contain `supabase/migrations/20261125071000_konsoliss_reconciliation_and_custody_foundation.sql` (consumer commit `a4562da9`, Admin commit `ebcb1c62`). Applied in live project `ycbirmgppwavorwudlrv`. Creates per-right acquisition clocks/entitlement movements, itemized immutable adjustment versions, per-piece consignment/receipt identity, piece-scoped customs decisions, service-scoped due dates, partner-fulfillment case records and customer refund/return/alternative/claim requests. They have RLS and deny direct customer/Admin client writes to money, physical truth or provider events. **Their existence does not mean their operational write paths are wired.**
- Both repositories contain `supabase/migrations/20261125071700_konsoliss_service_request_manual_triage.sql` (consumer `f7526c8d`, Admin `889e3fde`). Applied live; adds Super-Admin-only manual request review. The authenticated owner can submit a service request **only for an existing eligible paid booking**; quote-only users cannot fabricate a refund claim. Admin approval does not automatically pay a refund or release cargo.
- Customer `KonsolissBookSpace.tsx` commit `f08852f4`: minimal additional customer screens for `My shipment requests`, eligible paid booking selection, request type/reason, status and Admin response, calling the same Supabase request RPC. Existing compact Book Space styling, homepage and 3D renderer were not modified.
- Admin `KonsolissBookingOperations.tsx` commits `b44e9b4a` and `76394b36`: Super Admin service-request review UI and richer exact service scope snapshots for approved quotations (route, country, region, equipment, delivery, cargo). Existing quote review and route-intake workflows retained.
- Admin `KonsolissBookingCopyEditor.tsx` commit `c5b880b7`: adds the new request-screen wording to the existing draft/publish CMS editor; original price and operational data remain outside copy CMS.

**Verification performed [VERIFIED, with limits]:**
- Live SQL confirmed the eight new data tables exist, have RLS on and owner/admin read policies; both migration applications returned success.
- Separately corrected standalone HTML V7 simulator (not the React Native app): 8 focused executable Node engine assertions and 4 Chromium browser journey groups passed, including no document overflow at 320/390/1280 px. This does not prove a native app or real Supabase payment lifecycle. Earlier V5 93/55 vs V6 34/48 test totals were **not** reproduced: the old test suites were not supplied as executable sources. Counts cannot be legitimately treated as continuous coverage.
- Installed React Native device pixel comparisons, two-repo full TypeScript/test/build commands, live authenticated role-based end-to-end tests, Supabase financial transactions, real payment callbacks, warehouse scans, signed partner SLA/quotes and production CMS publish propagation **are NOT verified**. No real payment, shipment or fake cargo was created by this checkpoint. Security advisor also reports legacy notices from unrelated modules, so a complete platform security signoff has not occurred.

**Required next work [OPEN / BLOCKED]:**
1. Atomic server-side signed-provider payment capture and reversible holds; quote acceptance→real paid booking→per-right entitlement ledger→top-left aggregate, no double sale, no fake physical loaded state. Provider onboarding/contract and provider webhook validation **BLOCK** live checkout.
2. Per-piece carrier tracking verification, repeated/split receipts, photo/dimensions, declarations, dangerous-goods/documentation validation and China warehouse custody scans with authenticated staff roles; test customer ownership and actual load assignment.
3. Immutable adjustment version acceptance + paid item allocation + exact charge refunds / credits with genuine provider evidence and row locking. No general customer/Admin direct write permission to financial events.
4. Per-lot service-specific delivery obligations, China receipt Day80 only on approved Haiti LCL, early own-vs-partner cost/feasibility tasks, real carrier acceptance/custody transfer, incident evidence and claims.
5. Customer standalone additional-space paid journey with separate independent rights; completion offer only on its eligible original booking/group; cancellation, reductions, one extension, expiry and audit-release with in-transit protection. Prototype behavior MUST be ported into the server, not simulated by local state.
6. Complete native 320/390/1280 and iOS/Android parity checks of the approved compact Book Space with user-supplied HTML, without changing homepage 3D/carton geometry.
7. CMS preview/publish/readback and all locale coverage; real external provider, logistics, customs, insurance/legal and margin underwriting before activating production sales.
8. Manual service-request settlement needs evidence, exact financial entries and safe payout authorization; an `approved_pending_manual_settlement` request is **not** a completed refund.

**Important policy distinction:** AGREED design is not proof of IMPLEMENTED backend code. Working provisional: 15% contribution screening, 2% risk provision, 20–25% target; correct direct-cost ceiling with fees and risk provision at $675 = $540, not $553.50. OPEN decisions include no-show retained fraction, completion window, extension fee/tolerance, duties exposure, carrier commitments, late remedies and multi-country tariffs. Do not silently freeze those values into customer contracts.

---

## 1. Product, geography and promise [AGREED]

1. Konsoliss is a **demand-driven China-to-Haiti shared LCL freight marketplace**. Initial destination is **pickup at the Konsoliss Haiti/Port-au-Prince warehouse**. Optional Woulib/home delivery is separately priced and is NOT included in the base LCL price.
2. Customers buy **commercial freight space (CBM)**. Payment is not a ticket on a named ship, not proof merchandise is in China, and not proof that any physical container is assigned.
3. Konsoliss combines verified cargo into its own **40HQ container** when safe, timely and economically viable. If an own container cannot be filled economically/ready in time, Konsoliss may subcontract an **approved third-party LCL consolidator**. The customer keeps the accepted Konsoliss base freight price; **never add a fee solely because the platform used a partner**.
4. This is a **rolling pool**, not preset public sailings or fake container IDs. Admin can group customers by deadline for planning, then assign real packages to an actual container or partner consignment when warranted. Reassignment cannot silently reset contracts or clocks.
5. **45–80 calendar days warehouse-to-warehouse** is the advertised service window, beginning when eligible cargo is **verified received at the China warehouse**, ending when those goods are **cleared and available for pickup at the Haiti warehouse**. **Day 80 is the founder-approved binding latest delivery commitment**, subject only to valid documented contractual/legal exceptions. Day 45 is the *beginning of the normal estimated delivery window*, **NOT** a separate purchase-based vessel-departure guarantee. Earlier delivery is welcome.
6. Maintain both the original contractual Day-80 due date and any later, separately approved adjustment. If a cargo purchase is fulfilled in multiple separately received lots, each lot's verified receipt has a traceable due date; a later parcel cannot erase/reset the older lot's guarantee. Customer communication must be truthful.
7. A binding guarantee must never be silently suspended by an admin clicking "force majeure." The system records incidents, evidence, affected lots/containers/partners, mitigations, approvals, customer notices and a distinct proposed/approved revision. Whether a fire, natural disaster, port closure, exceptional government act, etc. qualifies for relief is **OPEN / legal review later**. Ordinary underfilling, poor planning, Konsoliss warehouse mistakes or a routine provider delay are NOT automatic exemptions. Lost/damaged goods also trigger a claims workflow, not just a new ETA.

## 2. Base freight pricing and quotes [AGREED, rate values editable by Admin]

All figures below are **USD base LCL freight milestones**, not verified costs or unconditional customs coverage.

| Purchased CBM | Base price |
|---:|---:|
| 0.02 | $27.00 |
| 0.10 | $99.00 |
| 0.30 | $249.00 |
| 0.50 | $379.00 |
| 1.00 | $675.00 |

**Minimum normal standalone order is 0.020 CBM. Preserve this differentiator.** It must remain visually representable in the approved 3D. No automatic change to 0.05 CBM.

Current piecewise linear tariff P(v), with v in CBM:

- 0.02 <= v <= 0.10: P(v) = 27 + 900 × (v - 0.02)
- 0.10 < v <= 0.30: P(v) = 99 + 750 × (v - 0.10)
- 0.30 < v <= 0.50: P(v) = 249 + 650 × (v - 0.30)
- 0.50 < v <= 1.00: P(v) = 379 + 592 × (v - 0.50)
- v > 1.00: P(v) = 675 × v
- Never sell a normal standalone amount below 0.02 CBM; special eligible completion increments below the minimum are allowed only as the specifically labeled amendment.

**Reference calculations:** P(0.2)=$174; P(0.7)=$497.40; P(0.9)=$615.80; P(0.98)=$663.16; P(1.3)=$877.50. Three independent purchases of 0.1+0.7+0.2 cost $99+$497.40+$174=$770.40, not $675.

**Admin price management:** pricing and milestone values are managed by authorized Tiss Admin actions, with revision notes, approval, audit history, effective dates, server validation, versioned rate cards and immutable paid-quote snapshots. Update **new** quotes without repricing already accepted purchases. Consumer calculator, checkout, top-ups, refunds, completion offers and Admin must all use the same server-side cents-precision price engine. Do not store operational prices in homepage CMS copy. Capacity/packing/weight, risk reserve and extra-service prices also need access-controlled config.

### Weight-related chargeable CBM [AGREED]

- **412 gross kg included per purchased physical CBM as a billing threshold.** Customer declares proposed gross weight before the quote; warehouse verifies weight later.
- **Chargeable CBM = max(purchased physical CBM, measured gross kg / 412)**, then apply the applicable version of P(chargeable CBM), taking already paid eligible charges into account.
- Examples: 0.02 CBM at 9 kg -> approximately $28.66; 0.02 at 12 kg -> $35.21; 0.5 CBM at 250 kg -> approximately $442.22; 1.0 CBM at 800 kg -> approximately $1,310.68.
- Commercial billable CBM does **not** increase the customer's actual physical volume entitlement and does **not** authorize unsafe loading. Handle previous provisional overweight charges as credits during legitimate amendments; do not double-bill the same kg.
- Separately store commercial reserved/declared/verified/physically-loaded **CBM AND kg**. 68×412=28,016 kg is only the billing-threshold arithmetic, **not** a promise a given 40HQ/route can carry 28,016 kg. Physical capacities depend on the equipment/route and must be enforced independently.
- The choice of measurement-credit tolerances is WORKING, not yet a binding customer term. Preserve accurate measurements (at least 0.001 CBM in existing numeric displays) and proper money rounding.

### One completion amendment to exactly 1.0 CBM [AGREED]

- **One eligible second amendment**, tied to the same original commercial booking/group, may complete the group to **exactly 1.00 CBM for total base freight $675** (plus any legitimate weight or disclosed additional charges). Not unlimited aggregation and not retroactive across unrelated purchases.
- Examples: 0.10 then 0.90 -> $99+$576=$675; 0.30 then 0.70 -> $249+$426=$675; 0.50 then 0.50 -> $379+$296=$675; 0.98 then 0.02 -> $663.16+$11.84=$675 (explicit below-$27 exception).
- The amendment **does not reset** the original D12/D25/D32 deadlines. One redemption, server-enforced; original rate version preserved; group weights recomputed, provisional overweight credited as appropriate.
- **OPEN:** the exact offer expiry (earlier reviews proposed D12 or D25). Do not secretly pick one or allow indefinite redemptions; make the eligibility window a versioned Admin policy before enabling the offer.

### Warehouse overage and measurement differences [AGREED principle; exact band OPEN]

- **True physical measurement variation** is NOT equivalent to a customer deliberately sending extra boxes. Avoid the discount-abuse loophole where buying 0.10 for $99 then sending 1.00 automatically costs only $675 via unrestricted P(actual)-P(booked).
- Material undeclared/additional capacity must be a **new standalone purchase or valid one-time completion amendment**. Without completion eligibility, 0.10 plus extra 0.90 costs $99+$615.80=$714.80, subject to acceptance and physical capacity.
- A booking **already at or above 1 CBM** can be linearly adjusted at $675 per extra CBM if the same consignment legitimately grows and the space/weight fits: 1.00 to 1.30 -> $202.50 extra. This is an explicit >1-CBM case, not a loophole below 1 CBM.
- Small bona fide measurement variation may receive a disclosed tolerance/true-up; the precise threshold/formula is **OPEN**. Reviews suggested competing bands (e.g. max(0.002 CBM, 3%) for measurement tolerance, or max(0.002 CBM, 30%) for same-booking extras). **Do not treat these proposals as one approved formula**. Prevent punitive price cliffs and arbitrariness.
- Do not open cartons unilaterally. Package priority and whole-package holds/returns/rebooking require consent and records. Indivisible items cannot be split by software. Unpaid excess is not loaded.

## 3. Purchase, inbound, cancellation, unused space [AGREED directions]

**All purchase clocks are per individual confirmed paid purchase**, not per customer, vessel or projected container; store instants in UTC and apply a defined China-local end-of-day calculation. User account with four purchases retains four independent deadline sets.

| Clock | Rule |
|---|---|
| Purchase Day 0 | Confirmed payment/capacity entitlement; immutable rate/terms snapshot |
| D0–D12 | Normal change-of-mind cancellation period; proposed free reduction of **uncommitted/unreceived** space, with server repricing/refund |
| D25 | Submit valid China-domestic inbound carrier tracking backed by carrier acceptance/first scan; a created label alone is not proof |
| D32 | Optional **one-time paid seven-day extension** for the genuinely unsubmitted portion, requested before the applicable cutoff |
| Arrival at China warehouse | Genuine receipt/measurement starts each cargo lot's separate **80-calendar-day delivery commitment** (not a fresh purchase D25) |

- On-time genuine carrier dispatch cannot be penalized for later China-domestic carrier delay; validate actual scan event time and consignment/address/booking relationship. A proposed D25-label/D27-first-scan grace appeared in reviews but is **not yet an approved mandatory rule**.
- The extension is once per booking, on unsent capacity only; a working proposed fee is **5% of standalone P(unsent CBM), minimum $5 and scalable cap of $25 per unsent CBM**, rather than a permanently flat $25 for a large reservation. The exact capped formula, effective limits and exceptions remain Admin-configurable/OPEN pending unit-cost validation. Do not sell a timeline promise that the extension makes impossible.
- On a 1.0 CBM purchase where only 0.7 is sent, retain the legal/commercial rights to the remaining **0.3 CBM until an explicit customer finalization or valid expiry**, unless the customer validly downsizes. No early double-sale. Protect verified in-transit packages, require reminders and a logged release event before resale.
- If a customer sends nothing, or uses only some space, apply one consistent, disclosed no-show/unused-capacity settlement method. Founder originally favored no refund after D12; **exact enforceable retained fraction, evidence-based fees, permitted refunds and legal exceptions are OPEN for counsel/payment rules**. Do not silently implement universal 100% forfeiture or an invented 30% fee. Provider failure and applicable nonwaivable remedies take precedence.
- D12 downsizing is an agreed consumer-friendly direction for uncommitted/unreceived capacity: 1.0 -> 0.7 reprices to $497.40, candidate refund $177.60 before any valid charges. Exact operational eligibility, charge/refund treatment and legal terms remain configurable. Never reduce below cargo already physically received/irrevocably committed.
- Expiry, release, refund and resale are separate auditable ledger events. Released space increases *sellable* capacity only if actual physical/weight capacity is available and no in-transit right remains. Sales of previously released capacity are not automatically profit.

## 4. Delivery fulfillment, fallback and exceptional events [AGREED]

### One customer-facing guarantee

- **Advertised 45–80-day window; 80th calendar day binding deadline** from verified eligible cargo receipt at the China warehouse to **Haiti warehouse pickup readiness**, including origin consolidation, ocean transport, destination clearance and warehouse release readiness.
- Do not show "45-day departure guarantee", "sailing tomorrow" or a named vessel without proof. Customer status separates **partner booked**, **cargo transferred to and accepted by carrier/consolidator**, **vessel actually departed**, **arrived Haiti**, **customs cleared**, **ready for pickup**.
- A normal ordinary delay does not change the original day-80 date. Overdue work requires a recorded remedy/escalation; no fabricated extra days. **OPEN / later:** final lawfully enforceable exceptional-event relief and compensation language.

### Third-party LCL fallback [AGREED and MUST be modeled now]

- **Do not wait for the 80-day deadline, or blindly until 45 days, before contacting the partner.** Admin should see a risk countdown based on latest viable booking/handover/cutoff time, partner transit estimates, Haiti clearance time and safety buffer.
- Backend regularly evaluates each due cohort: verified eligible cargo, CBM/kg, safe actual container packing, own-container expected fully loaded service cost, partner rate/lead time, deadline feasibility and contribution. When an own 40HQ cannot meet the due-date/cost objective, **raise a third-party contact/booking task early enough**. Human Admin approves and records the manual partner arrangement during initial implementation.
- Customer accepted freight price and original delivery obligation remain unchanged merely because a partner is used. Partner cost to Konsoliss is a **wholesale service cost** and may differ from the customer tariff; it must reflect comparable origin, ocean, customs, destination and pickup services.
- Implement provider directory, contact methods, partner quotations/costs, capacity estimates/commitments, cutoff and lead-time inputs, manual outreach task/status, custody receipt, partner consignment and verified shipment events. **Real agreements and automatic integrations are LATER**; do not invent contracted capacity or carrier availability.
- The 80-day guarantee must be treated as a genuine obligation, including cases where meeting it incurs extra cost. Profit maximization cannot silently override accepted contracts or safety limits. Before accepting new purchases, use the best available documented fulfillment feasibility and financial risk controls.

### Incident and claims workflow [AGREED architecture; legal details OPEN]

- Model: incident type, start/end, evidence, location, owner, affected booking/lot/package/container/partner, responsible actor, mitigation, notifications, loss/damage, claims, insurer/partner recovery, customer remedies and full immutable audit.
- Examples to record: fire affecting a port/loaded container, hurricane or extraordinary port closure, governmental disruption, carrier rollover, cargo damage or loss, warehouse error, misdeclaration and customs hold.
- An incident **does not automatically pause or erase** the original guarantee. Store immutable original due date; a separately reviewed legal exception/adjusted due date, status, approval and customer notice must be explicit. Claims for damaged/destroyed goods are separate from timing claims.
- Show affected customers a truthful disruption notice and verified updated milestones without exposing other customers' records.

## 5. Load capacity, reservations, weight and multi-container packing [AGREED]

- A 40HQ's **nominal sellable planning target is 68 CBM** (rough physical interior around 76.3 CBM). This is not a guarantee any mix of cargo will physically pack to 68.
- An illustrative **60–62 CBM conservative pilot forecast/sell cap** was proposed during external review, but is **NOT a permanent founder-approved reduction of 68 CBM**. If used, treat it as a versioned risk guardrail with contracted/real overflow and calibration by real loads.
- Track separately (A) **commercial booked/unexpired CBM + declared and reserved kg**; (B) actual China warehouse **received/verified** CBM + kg; (C) **allocated-to-load, actually scanned loaded**, container packing/weight and VGM; (D) genuinely available sellable capacity.
- Never infer safe volume from revenue or weight from paid CBM. Actual operating payload depends on the specific container plate, carrier, terminal, route/road/axle restrictions, dunnage, securing and margin. The commercial 412 divisor does not replace safety rules.
- Pack safely by individual package size, gross kg, stackability, hazardous exclusions, floor-load and securing constraints; do not hard-code hypothetical 26,000kg or 28,600kg as the universal payload. Approved VGM method, signatory and evidence precede departure authorization. Hard payload/safety caps are not overridden by Admin.
- **Multi-container load balancing is required:** where multiple containers/pools exist, distribute separately movable heavy and lightweight packages between loads to improve useful CBM filling and avoid overweight while honoring individual cargo indivisibility, deadlines and physical feasibility. Start with numerical packing recommendations and warehouse human verification; do not claim a magic AI perfect packer.
- Never double-reserve the last CBM or kg. Physical assignment may change with an audited move; commercial purchase/deadlines cannot. If using a partner, do not show invented own-container loaded metrics.

## 6. Existing homepage / 3D UI contract — preserve appearance [AGREED]

**DO NOT visually redesign the approved 3D renderer or its carton geometry, existing empty animation, spacing, smaller varied shipping labels, red customer cartons, yellow translucent free region, red dotted boundary or slim visual separation.** Preserve the tiny 0.02 CBM visibility strategy and correct fill/free proportions including 99%/1%, without turning the visual into a physically validated pack plan. Existing 7-second alternating progress bars, card navigation, translations/CMS and homepage top-left layout also remain.

**Critical current top-left behavior (confirmed from code on 2026-11-24):**
- Headline is **(physically loaded + inbound to container) / space purchased** CBM; its subtitle explicitly separates **Loaded** and **Inbound**.
- Tapping expands existing fields: space purchased, goods sent, physically loaded, inbound to container, loaded + inbound, at warehouse/still in transit, paid space not yet sent, and space not yet loaded or inbound.
- These quantities are **not interchangeable**: purchase = entitlement, valid goods sent = dispatch record, warehouse verified = inventory, inbound-to-container = allocation/staging, physically loaded = scanned into a real physical container.
- Large headline is **NOT** "loaded-only"; no need to add another duplicate purchase counter. Preserve the existing top-left exact UI.
- Customer-owned **red solid cartons in a real load depict only genuinely physically loaded customer cargo**, not mere payment or inbound shipping. Other customers' loaded cartons remain natural brown/tan. The translucent yellow with dashed red outline is physically empty volume *in the selected real container*, not necessarily commercially unsold space.
- No customer purchases yet / no assignments: preserve the existing empty-container animation; a paid customer without real container assignment must see truthful reserved figures and non-fabricated visualization. Do not claim a ghost container is assigned. A customer whose cargo went to a partner gets real shipment status, not fictional loading in a Konsoliss 40HQ.
- The alternating **customer** progress bar represents physically loaded/inbound relative to purchased CBM; the **selected physical container** bar represents loaded customer+other cargo relative to that real 68 CBM container. They switch every seven seconds with manual control retained.

**Current code path:** src/screens/Konsoliss/konsolissHomeScreen.tsx, src/screens/Konsoliss/useKonsolissLoadProgress.ts, src/screens/Konsoliss/konsolissLoadModel.ts, src/screens/Konsoliss/useKonsolissContainerOccupancy.ts, src/screens/Konsoliss/useKonsolissAssignedContainers.ts. CMS copy is managed separately by Tiss Admin; do not put customer operational totals into the CMS.

## 7. Supabase authoritative data model — target state [TO BUILD]

Build or extend **one shared secure backend**, rather than maintaining parallel independent customer and Admin balances. At a minimum model:

| Logical records | Required data / behavior |
|---|---|
| rate_cards, tariff_milestones, policy_versions | Editable prices, effective dates, immutable accepted versions, approval/audit |
| quotes, checkout_holds, payment_events, refunds | Server cents, expiry, idempotency, confirmed vs failed payment, settlements |
| bookings, booking_lots, amendments, extensions | Per-purchase original D12/D25/D32, remaining rights, completion uniqueness, received-lot guarantee |
| booking_entitlements + capacity_ledger | Atomic reserved/released/expired CBM AND kg; no double sell, weight constraints, audit |
| packages, declarations, carrier_tracking, scan_events | Own user, dimensions (0.001 CBM precision or better), kg, category/value, package count, custody and verified scan timestamps |
| china_warehouse_receipts, customs_reviews | Verifiable warehouse receipt, inspection, eligible/rejected/held, documents and measured goods |
| commercial_pools + pool_assignments | Commercial demand grouping separated from physical allocation and deadlines |
| physical_containers, package_load_assignments, load_signoffs | Real 40HQ IDs, loaded-only scan truth, safe CBM/kg, VGM, seal, operator signoff |
| partners, partner_quotes, partner_contacts, partner_consignments | Admin-entered providers, prices/coverage, manual fallback tasks, actual handoff proof |
| shipment_events, delivery_commitments | Separate booked/accepted/departed/arrived/cleared/ready; immutable original 80-day due |
| exceptional_events, affected_cargo, deadline_adjustments, claims | Evidence, approvals, notifications, remedies, partner/insurer recoveries |
| wallet_liabilities, cost_allocations, financial_snapshots | Customer-held funds vs earned revenue, direct costs, risk reserve and projected/actual contribution |
| audit_log and permission tables | Who acted, why, old/new state, fine-grained RLS, no client writes to physical truth |

**Enforce server-side:** Row-level customer ownership, admin RBAC, immutable snapshots, unique payment webhook/adjustment/redemption keys, atomic capacity+weight transactions, reasonable numeric ranges, no negative/double-released capacity, physical load only by a real package/container scan, departure only with hard safety/VGM gate, and no fictional status updates. Make failures visible rather than converting unknowns into zeros.

**Read-only live audit snapshot (2026-11-24):** the actual public Konsoliss relations then found were **konsoliss_containers, konsoliss_container_assignments, konsoliss_customer_load_progress, and security-invoker view konsoliss_customer_load_breakdown**. All three tables had **zero current rows** at audit time. The view correctly derived:
- allocated_cbm = loaded_cbm + inbound_to_container_cbm
- at_warehouse_or_in_transit_cbm = max(0, sent_cbm - loaded_cbm - inbound_to_container_cbm)
- reserved_not_sent_cbm = max(0, reserved_cbm - sent_cbm)
- not_allocated_cbm = max(0, reserved_cbm - loaded_cbm - inbound_to_container_cbm)

The 2026-11-24 read-only audit confirmed source-table RLS and customer-only SELECT, view security_invoker=true, relevant nonnegative/staged-volume constraints and audited Super Admin measurement RPCs. **But these values are still maintained through Admin-controlled totals, not yet automatically derived from paid bookings and package scan events.** The customer aggregate table is one row **per user**, so it needs booking-level source records underneath. The view showed an unnecessary authenticated UPDATE privilege; remove it if still present (underlying table itself denied direct UPDATE). Verify any fixes before claiming completion. Keep the top-left component and view semantics; repair the authoritative source and permissions.

## 8. Tiss Admin capabilities [TO BUILD / CONNECT]

- Authorized **Pricing & Policy** editor: tariff tiers and above-1 rule, weight divisor, optional fees, eligibility/tolerance windows, delivery lead-time buffers, version snapshots, approval/audit and publish to the **same** consumer quote service.
- **Overview** with distinct customers vs paid bookings vs individual packages; commercial pool reservations, received/verified CBM and kg, loaded CBM and kg, real safe remaining payload, due-date risk and actual contribution.
- **Orders**: detailed customer booking timeline, purchased CBM/kg, packages, sent balance, cancellations, amendments, tracking, money charged/credited/refunded, documented holds and notices.
- **China warehouse**: carrier acceptance verification, receive/measure/weigh/photo, safe goods category and declared value, customs decision, discrepancy offers, whole-package holds, loading scan into assigned real container.
- **Physical containers / multi-container optimizer**: commercial pools separate from real containers; package swaps that respect physical packing/weight/deadlines; manifest, seal, VGM, actual departure evidence and named signoff.
- **Fulfillment fallback**: detect approaching 80-day risk, calculate latest feasible partner contact time, create outstanding partner-contact tasks and record reply/rate/commitment/custody; choose own/partner without customer price change.
- **Exceptions and finance**: loss/damage, exceptional-event evidence and approval, claims, refund/remedy; per-booking/pool/partner cost and contribution; customer funds and wallet liabilities distinct from earned shipping revenue.
- The present Admin has a **Konsoliss operations screen, container/measurement RPCs and homepage CMS editor**, but these are not a complete live quote/booking/package/warehouse/cargo/partner/claims implementation. Preserve the working editor and preview.

## 9. Customer app journey [TO BUILD / CONNECT]

1. Browse homepage and 3D, use existing Book Space entry without changing approved UI; obtain **live Admin-configured** pricing and eligible merchandise quote.
2. Declare category, value, contents/pieces, expected CBM and gross kg; eligible instant quote or manual review. Accept quote and specific versioned terms; checkout uses backend holds and idempotent payment.
3. After confirmed payment, **reserved/purchased** amounts immediately update the existing top-left counter; physically loaded and inbound remain zero until genuine evidence exists.
4. Customer can inspect independent bookings, D12/D25/D32, valid tracking, purchased and unused portion; perform permitted cancel/downsize/completion/extension flows using real server pricing and constraints.
5. China warehouse receipt drives verified package volumes and per-lot **80-day binding due date**; customer sees their own package status and clear 45–80-day delivery window.
6. Real load/handoff/departure/arrival/clearance/pickup updates come only from verified records; third-party shipment remains accurately labeled.
7. Consumer sees their own receipts, exceptions, claims and any lawful remedies. No customer sees another customer's packages, profitability or Admin-only quotes.

## 10. Profitability, customs, safety, and deferred external inputs

**Objective:** every newly accepted quote should have an expected contribution and fulfillment-risk assessment; select the **highest expected net contribution among safe, compliant and timely options**. No business can guarantee a positive result in every disaster. Do not make an existing binding customer obligation disappear because a fallback partner has become more expensive.

- Working cost allocation per booking includes actual or estimated partner/own freight, China + Haiti handling, all applicable customs/broker/document charges, payment processing including fixed fees, refunds/chargebacks, claims provision and allocated obligations. Real supplier costs are LATER inputs in Admin, not an excuse to leave the engine missing.
- **Illustrative ONLY** historical stress case: $15k ocean + $20k customs + $3k other = $38k, plus 3% payment fees. At 68×$675 gross=$45,900, fees=$1,377, contribution=$6,523 (~14.21%) before parcel processing/overhead. This is NOT a known Haiti rate or actual available profit. A 60–62 CBM pilot volume is forecast guardrail only.
- Small-ticket economics require handling/package-count controls: extreme 2,888 bookings of 0.02 CBM at 9kg each yield about $42,287 before individual handling under this *unrealistic illustrative* cost allocation; ~$14.64 of all-in per-booking handling would erase it. Do not treat this as expected demand or a confirmed fee.
- A **15% quote margin gate / 2% risk reserve** and **20–25% targeted direct contribution** have been discussed as *WORKING targets*, not hard founder-approved promises. Account consistently for the risk provision (do not omit it from a cost ceiling). A $675 price with 3% fees + 2% reserve + desired 15% contribution leaves **$540** for all-in fulfillment in that hypothetical model.
- **Customs inclusive only for underwritten eligible declared goods**. Quote must collect category, declared invoice value and goods characteristics, anticipate duty/broker and all-in coverage *before payment*. No arbitrary unlimited duty promise. An internal duty allowance is an underwriting guard, NOT permission to surprise-charge honestly declared customers after binding an all-inclusive price. Misdeclaration/changed goods/measurements may justify expressly disclosed adjustments.
- Prohibited/dangerous goods screening (e.g. certain batteries, aerosols, liquids, illegal/sanctioned goods), losses, insurance, Haiti port/road conditions, legal consignee/importer responsibilities, goods custody and no unlawful disposal all require planned rules and later verified provider/legal inputs.
- Final third-party contracts, broker quotes, complete legal terms, liability caps, insurance cover and actual provider lead times are **LATER**. Build their data/configuration now, **do not invent them** or enable guarantees based on fake provider availability.

## 11. Mandatory test scenarios and acceptance gates [TO EXECUTE]

- Prices at every milestone and intermediate break, sub-$0.02 rejection, 1.00 completion exception $11.84, P(1.3)=$877.50; cents precision and immutable rate version after Admin edits.
- Weight threshold at 412kg/CBM, overweight examples, safe independent payload ceilings and balanced heavy/light multi-container assignment.
- Concurrent purchase of the last CBM OR kg: only one wins. Duplicate payment/webhook/extension/completion: never duplicate rights or charges.
- 0.10 bought then 1.00 measured: material extra charged separately ($714.80 total) unless an actually eligible one-off completion; 1.00 to 1.30 legitimate linear top-up=$202.50. Correct small measurement tolerance once policy finalized.
- Multiple independent purchases: independent D12/D25/D32 and received-lot Day-80; customer aggregate counter totals valid unexpired entitlements.
- Valid dispatch with inbound carrier delay; rejected label-only or reused tracking; protected rights during verified transit; no erroneous release/double sale.
- 1.00 bought, only 0.70 sent; preserve 0.30 until explicit finalization/valid expiry; D12 downsizing/repricing and correct ledger/refund.
- Goods only paid -> reserved counter changes but **no red physically loaded cartons**. Warehouse received -> verified detail changes; only real scans trigger physically loaded red cartons and selected real-container occupancy.
- Day-80 due from real warehouse receipt; partial-lot clocks; risk alerts; partner contacted *before* impossible deadline; partner handover not falsely labeled vessel departure; customer freight unchanged.
- Port fire affects named packages: evidence, customers notified, original guarantee immutable; no automatic force-majeure extension; incident/claim and legally approved adjustment separately tracked.
- Anonymous and cross-customer access denied; unprivileged financial fields hidden; Admin cannot bypass safety, forge scans or silently change accepted prices.
- Existing homepage/3D snapshots, small-load 0.02 visibility, 99% and 100% fill, zero-data loading/no false zeros, 7-second bar rotation and CMS editor behavior all regressions checked.

**Release gates:** current schema+RLS test, real purchase-to-admin-to-consumer consistency, payment reconciliation, physical scan authenticity, end-to-end exception/refund simulations, native device verification, and later actual provider/legal/commercial sign-off. Do not label production-ready based on static UI tests.

## 12. Implementation roadmap — one small verified section at a time

**Section A: Existing homepage top-left reservation/load summary (current priority).** Keep exact UI. Build authoritative per-booking entitlements and package movements that aggregate securely into the current customer-load breakdown view; remove unnecessary view UPDATE grant; write tests proving purchase updates reserved immediately, sent/loaded remain truthful, Admin reflects it, and multiple purchases aggregate with no cross-user leakage. Preserve current sample animation only for true empty state.

**Section B: Versioned server-side tariff/quote/purchase ledger and Admin prices.** Wire existing calculator and checkout and immutable purchase-level deadlines, then connect real money only when test gates and external readiness permit.

**Section C: Package/tracking/warehouse intake and volume/weight true-up.** Verified carrier events, per-package scan custody, receipts and measured physical cargo, holds and admin action traces.

**Section D: Containers, physically loaded scans, partner consignment and multi-container balancing.** Never confuse reserved, allocated, verified, loaded or shipped; protect visual fidelity.

**Section E: Guarantee/alert engine, 80-day delivery commitments, manual third-party outreach and exceptional incidents/claims.** Backward-plan fallback by real configured lead times.

**Section F: All remaining consumer flows, financial controls, admin reports and exhaustive integration, security, native-render tests.**

At every section: inspect both current repos and live Supabase; make narrowly scoped changes; preserve the approved 3D and CMS; apply migrations using the project's migration discipline; verify with actual tests and SQL read-backs; update this checkpoint with **exact changed files, migration IDs, tests, known gaps and commit IDs**. Do not make unrelated visual edits or silently rename existing statuses.

### New-chat handoff prompt (copy this into another conversation)

> Work on Konsoliss in momojdy/tiss_tiss_beta and momojdy/tiss-admin, sharing Supabase project ycbirmgppwavorwudlrv. FIRST read src/screens/Konsoliss/README.md on main, including its Master Business Logic and Engineering Checkpoint and preserved historical notes. Treat its AGREED vs WORKING vs OPEN distinctions seriously. Verify actual current code, DB and tests; do not assume text equals implementation. Preserve approved 3D geometry, animation, customer red cartons, yellow/dotted physically free area, top-left (loaded+inbound)/reserved and alternating seven-second progress bars. Founder requires exact milestone prices, 0.02 min, 412kg/CBM, per-purchase D12/D25/D32, 45–80 days FROM China warehouse receipt to Haiti pickup readiness with binding Day 80, and early own-container vs third-party LCL fallback without customer base-price increase. Current focus is one small section at a time, beginning with source-of-truth booked/loaded data for top-left. Third-party contracts, legal wording and real cost evidence come later; architect for them, do not invent them. Read-only audit first, then scoped implementation, tests and README checkpoint updates with commits.

---

# PRESERVED HISTORICAL HOMEPAGE AND 3D IMPLEMENTATION NOTES

The section below is the pre-existing Konsoliss README preserved as a technical history. It may record historical demo behavior or incomplete milestones. The Master Checkpoint above governs newer commercial policy; verify present code before relying on dated notes.

---

# Konsoliss 3D container visualization

## Visual requirements

40HQ container capacity is 68 CBM. Live loaded volume and free volume must use verified occupancy, never fabricated fallback values. The visual cargo boundary should follow LOADED/68 and the translucent yellow region with red dotted edges should follow FREE/68. A very narrow visual-only gap distinguishes cargo from the free region, without changing CBM arithmetic. Preserve natural seams between cartons, original brown/tan/red carton geometry, varied shipping stickers, and the historical projected `My current loaded space` and `X.X CBM free` canvas annotations restored from `c7840099888631cbd41a7fd0cf5095d53c140730`.

## 2026-11-23 geometry update

Commits `964128db809580ccabf26249eab8185a88d697c6` and `9250550fc82d1213196fad3c9e57efaf7676046c` map original carton coordinates across the usable interior dimensions and clip the displayed cartons to the verified loaded-volume x boundary, instead of showing a count of cartons that visually underfills 99%. The empty-space overlay uses FREE/68 and retains its red dashed boundary. The source carton coordinates are not mutated between draw calls. The original empty/demo animation is left on its original geometry. This is a volume-proportional illustration, not a verified real-world packing solution. Device/simulator rendering and visual checks at 0.02 CBM, 76%, 99%, 100%, and empty remain outstanding.

## Customer-owned red cargo and callout (2026-11-23)

Commit `1c92ba8756c155aa94c1ca4736e65867d8edb36a`: count only actually visible non-pallet cartons after loaded-boundary clipping, then select the customer's proportional share of those visible cartons and render them red. Track the transformed position of the last customer-owned visible carton and project `My current loaded space <CBM> CBM` to that red carton, not an untransformed original carton or a clipped-out carton. For very small loads the miniature red parcel anchor is preferred. Other customers' cartons keep their original colors. This does not invent ownership when verified `YOUR_LOADED` is zero. Device screenshot validation remains pending.

## Expandable customer load summary (2026-11-23)

Commit `44080ca27a2ba843f3c67cb26d2bf9a256197c73` makes the top-left current load summary a clickable accessible button with an expand/collapse chevron. The compact value is verified `(physically loaded + inbound to container) / purchased CBM`, with the loaded and inbound portions shown separately. Expanded details show purchased, goods sent, physically loaded, inbound to container, loaded + inbound, at warehouse or still in transit, purchased space not yet sent, and purchased space not yet allocated. These values come from `useKonsolissLoadProgress` and the backend `konsoliss_customer_load_progress` record; missing/unverified values remain em dashes, not invented zeros. This dropdown is distinct from the 3D canvas carton callout. Device rendering has not yet been verified.

## Live Supabase customer load breakdown (2026-11-23)

The live Wantiss Supabase project (`ycbirmgppwavorwudlrv`) has the existing RLS-protected source table `public.konsoliss_customer_load_progress` (one row per authenticated customer), with server-maintained `reserved_cbm`, `sent_cbm`, `loaded_cbm`, and `inbound_to_container_cbm`. A new migration `konsoliss_customer_load_breakdown_secure_view` creates `public.konsoliss_customer_load_breakdown` as a **security-invoker view**, so underlying per-user RLS remains in force. Only authenticated users have SELECT on the view; anonymous access is revoked. The consumer hook `useKonsolissLoadProgress` now reads this view.

The view exposes:
- `allocated_cbm = loaded_cbm + inbound_to_container_cbm`
- `at_warehouse_or_in_transit_cbm = greatest(0, sent_cbm - loaded_cbm - inbound_to_container_cbm)`
- `reserved_not_sent_cbm = greatest(0, reserved_cbm - sent_cbm)`
- `not_allocated_cbm = greatest(0, reserved_cbm - loaded_cbm - inbound_to_container_cbm)`
- `allocated_percent = round(100 * allocated_cbm / reserved_cbm, 2)`, or zero when no space is purchased.

Database constraints already enforce nonnegative volumes and `loaded + inbound <= sent` and `loaded + inbound <= reserved`. The app still independently computes the same derived fields from source values for backwards-compatible UI semantics; it requests the backend-derived columns as well. No test/customer records or fake CBM values were inserted into Supabase. The temporary **DEMO** numbers in the UI are presentation-only and must be removed before production release.

**Verification:** Migration applied successfully; read-back confirmed `security_invoker=true`, source-table RLS enabled, authenticated SELECT allowed and anon SELECT denied. The source table currently contains **zero rows**, so end-to-end verification with a real customer shipment remains outstanding. The combined warehouse/in-transit category cannot distinguish those two physical states until separate verified event data exists. The frontend must not infer that a customer has left the warehouse from a booking alone.

## Live-data restoration and correctness improvements (2026-11-23)

**Progress-bar visibility fix:** commit `333fece0a36e19075435db175a6a83871d6d83cb` removes the accidental `hasCurrentContainer` visibility/timer guard. The customer progress bar and shared-container bar now alternate every 7 seconds, and the manual double-arrow switch remains visible even for unassigned customers. Missing container occupancy displays dashes and an explanatory message, never fabricated CBM. Device verification is pending.


**Empty-state animation restored:** commit `dc3d8e7b25f1498bc4bc0f320395895dffd355fe` re-enables the original looping carton animation and blinking `My current load` callout (regression reference `f9f8b50dcc47d85cb121c483dbf85a3fc1c50a53`) **only** for a confirmed unassigned/empty customer state. It remains a clearly illustrative animation, not a claim of customer cargo. When an assigned container lacks verified occupancy, show an unavailable state instead of fabricated measurements. Runtime animation testing is still pending.


**Customer-facing placeholders removed from the Konsoliss home screen:** commit `b9ea227a8032bd94b1f3011d19178a0701216236` removes the automatic selection of `KS-DEMO-*` containers, the demo container picker entries, the default-on sample customer CBM breakdown (`2.00 / 1.00 / 0.40 / 0.30`), and the preview toggle. The customer summary now displays only values returned by their authenticated, RLS-protected load-progress view, or an explicit missing/unavailable state. The container selector shows only assigned containers. Commit `f5944b6ecf09d540d742d5c6253f24c97d808e25` also prevents the 3D WebView from rendering an invented empty/zero-loaded container when no verified occupancy exists; the page displays an explicit unassigned/loading/unavailable message instead. No demo rows were inserted into the database. The unused preview data module remains in the repository for deferred container testing but is not imported into the live home page. **Container geometry and visual test cases are deliberately deferred as requested.**

**Async freshness:** commits `534fd483bb5aa5caec3dd0cb484bb932a8ff72a5`, `4e683cf5daf8afae8301a706e75c0d3ea374c080`, and `e0b3e44a09e8a0813ab98922379bf2d23ee5838e` introduce latest-request guards for the customer load-progress and selected-container occupancy hooks, including cleanup invalidation. These reduce stale responses overwriting newer reads. The other container hooks and app-wide account-change lifecycle still need a dedicated pass.

**Backend CBM validation:** commit `9cfc9a523dfbee5d4236d0d002eb325d535b3a83` compares the backend view's derived columns against values calculated from its source measurements, with explicit tolerances for numeric serialization/rounding. Invalid records become unavailable rather than silently displaying contradictory values.

**Unread feature colors:** commit `0893827e5a0942e13f71a9a6222f0c3118e2b183` fixes an actual schema mismatch: `conversations` has `feature` and `unread_customer`, **not** `feature_name`. The quick menu now reads conversations with positive customer unread counts, uses their feature-origin palette, listens for conversation changes, and ignores superseded async queries. Notifications still use `notifications.feature_name`. The aggregate badge intentionally avoids yellow when other identified unread feature origins exist; unknown data uses magenta. Counts are still passed in from the host, and complete consistency with the host unread totals needs testing.

**Important remaining production blockers:** transactional capacity reservations and payment idempotency have **not** been implemented or proven in this pass; nor has a complete server-side cargo event ledger, end-to-end admin/warehouse lifecycle validation, or a security audit of all writes and RLS policies. Do not describe these as complete. Dedicated Konsoliss orders, support/feedback, Saved persistence, and final device/build/integration tests remain pending. Never infer customer ownership from sample cargo or default a missing verified measurement to a real shipment value.

## Konsoliss universal three-dot quick menu (updated 2026-11-23)

### Persistent trigger and appearance

The quick-menu trigger in `konsolissHomeScreen.tsx` is an **absolute-positioned overlay outside the ScrollView**, so it stays on screen during scrolling, as in Goodies. It sits slightly lower than the header content (`top: insets.top + 198`, `right: 18`), has a compact red pill background, and uses three horizontally arranged dots of 5, 7, and 10 pixels with 3-pixel gaps. Pressing it opens `KonsolissQuickMenu.tsx`. The trigger is no longer embedded below the available-CBM text inside scrolling content. Do not regress its fixed positioning. This is UI-only and must not change the 3D container model or occupancy math.

### Popup layout and actions

The bottom sheet follows the **Goodies and Gatherz quick-menu pattern**: a top row of Home, Messages, Notifications, Wallet, Saved; a horizontally scrollable lower row of My Orders, Recent Activity, Help Center, Feedback, Business Space, Dark Mode; backdrop dismissal and Cancel. Menu action icons use `ThinMenuIcon` **directly on the sheet**, without the extra rounded tile backgrounds/borders that were removed. The Home slot uses the same remote Wantiss logo URL as Goodies, displays a `Home` label, and falls back to a letter **W** if image loading fails. This fallback does **not** prove that the actual remote logo loads successfully; verify on device. Only the Home logo retains a circular image frame.

The popup uses Konsoliss cream/red styling in light mode and a darker palette in dark mode. Dark Mode toggles the **Konsoliss screen's own theme**, with the override saved in AsyncStorage under `konsoliss.theme`; without an override it follows the system appearance. This does not necessarily change the global Goodies/Gatherz theme.

### Universal notification/message badge colors — critical invariant

**Yellow (`#DDB52B`) is reserved for Konsoliss-originated unread items, not for all badges displayed while the user is in Konsoliss.** The quick menu now follows the feature-origin color logic of Goodies/Gatherz, rather than assigning yellow unconditionally.

On opening the popup, `KonsolissQuickMenu.tsx` uses the authenticated Supabase user to load unread `notifications.feature_name` and unread messages from `conversations.feature_name` joined via unread `messages.conversation_id`. It subscribes to changes in the notifications and messages tables while open, then unsubscribes on close. Feature-to-color mapping:

| Originating feature | Color |
| --- | --- |
| Goodies | `#FD802E` |
| Gatherz | `#A36BE8` |
| Flyz | `#4A67B0` |
| Wallet | `#81C56C` |
| Frenzies | `#B3DF4B` |
| **Konsoliss** | **`#DDB52B`** |
| Woulib | `#FEC509` |
| Stayz | `#579BC7` |
| Glowz | `#D49E2B` |
| Unknown/other | `#BD279F` |

The current menu prefers a **non-Konsoliss feature color** when several origins are unread for either aggregate badge (Notifications and Messages), falling back to magenta when no matching origin is available. It does **not** simultaneously display every origin color or rotate colors when several features have unread items; this remains a possible parity improvement against Gatherz. The numeric unread counts are supplied by the parent screen, not recomputed from these color queries, so confirm their scope matches the displayed color metadata in end-to-end QA. Never infer that all unread items belong to Konsoliss merely because this popup was opened from Konsoliss.

### Navigation and known limitations

Host navigation in `App.tsx` routes Home, Messages, Notifications, Wallet, Saved, Recent Activity, and Business Space to shared Wantiss destinations. My Orders currently falls back to universal activity because a dedicated Konsoliss orders route has not been implemented; Help and Feedback temporarily open existing Goodies support/contact routes, not a Konsoliss-specific support workflow. Do not represent those destinations as feature-complete.

The shared Saved screen accepts `preferredFeature`. When entered from Konsoliss, it displays a Konsoliss section **before** Goodies and other collections, without fabricating saved items or counts; when entered from Goodies, its existing Goodies-first order remains. A real Konsoliss save/persistence feature has not yet been built, so this section explicitly indicates no saved items are available. Returning from Saved goes back to the originating feature.

**Verification still needed:** device/simulator visual QA of the persistent trigger, popup spacing and Home logo load/fallback; theme persistence after app restart; live Supabase unread notification/message counts and mixed-feature badge colors; navigation destinations and accessibility; final production builds. Code commits alone do not establish device-level correctness.

## Production integrity work — 2026-11-22 execution

The current implementation/evidence matrix is in [`docs/konsoliss/production-readiness.md`](../../../docs/konsoliss/production-readiness.md). **Konsoliss is not production ready; all six phases are not complete.** That report supersedes earlier descriptions of per-menu unread loaders, inferred unassigned zeros/free capacity, and sample booking rates.

This change introduces a shared unread service for App/Goodies/Gatherz/Konsoliss, one feature-origin policy (mixed/unknown = `#BD279F`), reusable icons/theme persistence, account-change invalidation in every Konsoliss data hook, strict CBM parsers and regression tests. Missing load records now remain unavailable instead of inferred zero balances. The original unassigned illustration still runs without becoming customer cargo. Booking now explicitly reports unavailable until real quote/reservation/payment services exist; sample prices and the misleading review action are removed.

Two admin-owned migrations were applied and verified in live Supabase: `20261122205352_konsoliss_verified_volume_constraints` and `20261122210202_konsoliss_occupancy_realtime_invalidation`. They reject invalid inbound quantities, protect assignment ownership/shared capacity and enable realtime aggregate invalidation. No customer records were fabricated or financial records changed. The admin form accepts multi-container customer totals and leaves missing measurements blank.

Run consumer `npm run test:konsoliss`; admin `npm run test:konsoliss` and `npm run test:konsoliss:backend`. Typechecks and Hermes exports passed, but do not establish native builds, payment correctness, customer/admin integration or release readiness. Renderer and wrapper bytes are unchanged. Dedicated 3D visualization regression/device testing remains deferred by the user.

## Homepage CMS and admin completion — 2026-11-23

The current homepage scope, implemented paths, applied migration and executed evidence are documented in [homepage-completion.md](../../../docs/konsoliss/homepage-completion.md). This supersedes older homepage notes above about per-menu unread loading, Help/Feedback routing to Goodies, inactive cards and the stale admin preview. It does not declare the whole feature production ready.

The admin preview is generated from this homepage with `npm run sync:konsoliss-preview` (sibling admin checkout or `KONSOLISS_ADMIN_ROOT`). CI checks source/image hashes with `npm run check:konsoliss-preview`. Copy lives in `cms/catalog.ts`; 11 managed image slots and all intended text are exposed through manual and selectable preview editing. The renderer is unchanged; canvas annotations use a separate translation adapter. Changing the catalog also requires updating the server CMS validation contract and paired tests. Never put operational/customer quantities into CMS payloads.

Customer language comes from authenticated `user_settings.language` with reviewed published en/fr/ht/es/zh-Hans content, English/default fallback and locale-keyed public cache. Admin publication requires per-field review and preserved placeholders, version conflict checks and read-back. No translated starter content was automatically reviewed or published.

Admin `KonsolissMeasurements.tsx` exposes per-container loaded/allocated values, unknown blank, review confirmation and an audit reason. Live migration `20261123050013_konsoliss_homepage_cms_and_measurements` atomically reconciles measured customer loaded/inbound totals and protects legacy writes. Reserved/sent quantities remain server-owned operational records.

Home, Warehouse, Consolidated, Sourcing, Hub, Load Items, Help and Feedback have real handlers. Konsoliss support uses the shared authenticated support inbox and confirms a server ticket code; it does not create a shipment, purchase or payment. Booking and shipment-history execution remain explicitly unavailable; request panels do not satisfy those deeper workflows.

Final focused results: consumer 25 tests, admin 8 tests and 9 backend PASS groups; both typechecks and all four iOS/Android Hermes exports passed. Targeted Konsoliss lint has 0 errors and 6 warnings. The live project still has zero containers, assignments, progress records and Konsoliss CMS rows: real publication/customer integration and installed-device acceptance remain unverified. Dedicated 3D visual/device regression remains deferred by the user.

Concurrent main commit `c7c0d9e6` removed the explanatory container-total hint below the progress bar. That removal is preserved in both apps. Follow-up live migration `20261123052456_konsoliss_retire_homepage_hint` removes its retired CMS field, with regression coverage; original migration history remains intact.

**2026-11-25 continuation after section 0E [IMPLEMENTED foundation, unverified integration]:** Additional migrations have been committed to **both** consumer and admin repos and applied to the shared Supabase project: `20261125074200_konsoliss_declared_tracking_and_receipt_actions.sql` (consumer `fdc74dd8`, Admin `7b6708c9`; collision with an existing tracking **index** was corrected before live application) and `20261125075400_konsoliss_atomic_entitlement_balance_view.sql` (consumer `97422bcd`, Admin `d06cd7c3`). These implement authenticated piece declaration, per-piece customer tracking submission, Super Admin manual carrier-first-scan verification, unique actual China warehouse receipt and original Day-80 due date **only** for approved Haiti LCL pickup. The separate `konsoliss_rights_balance` security-invoker view shows each right's original/standalone entitlement, own cancellation and tracking deadlines, and audited releases. No Admin/customer UI action may mark a mere label as accepted, or a warehouse receipt as loaded/customs cleared.

Consumer Book Space now includes paid-booking-only goods declaration, piece tracking, per-right balances/deadlines and service-request status (latest consumer code commit `19529bfa`). Admin booking operations now include staff carrier and physical warehouse intake screens, review of refund/return/alternative requests and scope-rich quote approval (latest Admin operations commit `f6f6b97e`). Admin CMS booking editor covers those new customer-facing wording keys (commit `02043ebc`); prices/profits and operational quantities remain outside copy CMS. SQL readback confirmed anonymous cannot call the declaration/receipt RPC; authenticated cannot directly mint rights or forge accepted tracking; RLS is enabled on the piece tracking table and the rights view uses `security_invoker=true`. No live paid customer rows, parcel receipts, verified carrier events, charge captures or refunds were created. Live end-to-end authenticated two-app testing is still outstanding.

**V7 standalone prototype latest reproducible test totals:** 11/11 Node engine assertions, 5/5 Chromium journey groups. Default opening Book Space popup is **pixel-identical to the uploaded V6 HTML** in Chromium at 390px and 1280px. This is **not native React Native pixel parity**. The prior 8/4 numbers in the original 0E verification are superseded. V5's historical 93/55 and V6's 34/48 cannot be established as equivalent suites without the old full executable scripts. Partner fulfillment remains **simulated in HTML only** and **schema-only in live Supabase**; verified provider contracts are absent. Production checkout is deliberately disabled. The operational handoff package delivered separately contains the precise tests, diagrams and blockers.

## 2026-11-25 — Founder HTML-reference 3D restoration (visual review pending)

The uploaded `Konsoliss Home – 3D container states ….html` is the direct canvas reference for all non-empty states: labeled flying carton with the original 4.6-second quadratic arc, tan-to-red transition, proportional allocation, loaded red sub-cartons and red pulse, translucent inbound and dashed unfilled allocation. The original A1/D4 empty animation renderer remains byte-for-byte intact; the native homepage layout, seven-second bars, existing 23 preview scenarios, CMS, live hooks and navigation remain. Other cargo is natural brown, clipped to the measured occupancy and separated from customer allocation. The physical yellow free region uses measured loaded occupancy, not inbound or purchase totals, and is hidden when sealed/departed/arrived or full. Unassigned scenes are explicitly illustrative. Geometry is proportional, not an exact measured packing plan. No database writes, financial changes or deployment.

Consumer changes: `konsolissHomeScreen.tsx`, `tests/konsoliss-preview-states.test.cjs`, this README. Admin homepage preview and source manifest regenerated using existing generator transformations. Candidate JavaScript parsed and 104 mocked-canvas combinations ran across 26 non-empty inputs, light/dark, reduced motion and drag events. No native device, full TypeScript, lint or full npm suite executed in this environment. Visual approval is pending and the demo switch remains available. Existing backend limitations remain.

## 2026-11-25 — Founder visual corrections after HTML restoration

A2/A3 and other unsent illustrative reservations now fly once and remain visibly red after landing; no loaded, inbound or sent quantities are changed. Reduced motion starts at the settled illustration. The flying carton is drawn after all canvas labels and geometry, stays inside the canvas bounds, and has a soft contact/drop shadow. A3 adds a red blinking reminder to send goods or upload tracking before Day 25 (steady with reduced motion); the demo warning is not a verified live account deadline. A5 now reads Inbound to warehouse. C1 and each physical C7 selection have the requested state callouts instead of the generic loaded-space label. D1 exposes only neutral shipment preparation/verified milestones; operational fulfillment provider details stay internal, not in customer-facing copy. No new database reads or writes, booking or financial changes, unrelated UI changes, or deployment. Focused mocked canvas checks covered 40 combinations (10 scenarios/views, light/dark, reduced motion), including persistence, foreground shadow, warning opacity and label content. Native rendering, full npm suite and typecheck remain unverified. Demo controls stay until owner approval.

## 2026-11-25 — Compact customer load status

Moved the scenario explanations, illustration notice and Day-25 warning from the canvas footer into the native top-left My current load summary. The reminder is isolated from the WebView in its own component and respects reduced motion. Removed the verbose preview explanation panel; the selector, DEMO ONLY marker and controls remain. A4 displays Label created only; verification rules and sent volume remain unchanged. C1 shows derived quantities (0.3 CBM loaded • 0.2 CBM unassigned for the existing fixture), not a generic label; C7 shows split-container status. C4's required red cargo callout and renderer animation remain intact. All 23 fixture statuses and 24 focused mocked-canvas combinations passed; the native layout, full repository test suites and typechecks have not been run. No backend or financial changes, no deployment.

## 2026-11-25 — Countdown, repeated flight and restored container callouts

The deadline reminder says Send goods and upload tracking and ticks down to the actual absolute deadline; demo A3 starts at its fixture's three-day remaining period, and live unsent recorded reservations use the earliest valid active entitlement tracking_due_at from the existing security-invoker rights balance joined by customer-owned paid booking IDs. No deadline is guessed; partially sent bookings do not yet have enough per-right attribution in the aggregate homepage hook, so their deadline is not guessed. Missing deadline reads do not discard verified volume. Countdown is display only, not an expiration or refund action. Read-only schema inspection verified the existing fields; no data or schema changes. A2's original 4.6-second repeating flight is restored while the red landed parcel remains visible and physical loaded quantity stays zero. The soft diamond-shaped shadow follows the carton footprint; reduced motion retains a settled view. C1, C2 and C3 quantities now appear on the arrow-linked container callout, not as duplicate status text below My current load. C7 keeps selected-container My current loaded space while the split status remains above. C4 and original empty renderer preserved. Focused mocked-canvas verification: 56 combinations, including 320/390 widths, light/dark, reduced motion, repeat and callouts; six countdown arithmetic cases passed. Native visual, authenticated live integration and full compile/tests remain unverified. No deployment.

## 2026-11-25 — Replay reset and split shipment presentation

The flight and landed illustration share the same 4.6-second phase: each cycle starts with the reserved area empty, lands after 1.932 seconds and holds until the next cycle. Every flight-eligible nonempty state uses this lifecycle, including A5/B1/B2/D1 and B3; verified loaded cargo is never erased or increased. Assigned-but-unloaded B3 remains translucent and outlined to avoid implying verified cargo. Reduced motion shows a settled illustration. The previously softened carton shadow is unchanged. Split shipments display the aggregate physically loaded volume on both actual-container callouts; the alternate shared-container bar displays total fill and free space rather than disclosing the individual customer allocation. Actual per-container geometry and server quantities remain unchanged. C7 demo total 0.500 CBM on both, with 0.600 committed including inbound. Focused mock canvas: 40 combinations across eight flying states and two C7 views, light/dark and reduced motion, including three replay cycles and landing transitions. Full native/CI tests remain unverified. No database or deployment changes.

## 2026-11-25 — 3D production acceptance audit

See [full 3D acceptance audit](../../../docs/konsoliss/3d-acceptance.md) (mirrored in Tiss Admin as KONSOLISS-3D-ACCEPTANCE.md). 23 fixture invariants and 324 mocked-canvas combinations passed; 27 renderable views; D6/D6b no view. Consumer baseline TypeScript passed but homepage suite failed; admin baseline TypeScript failed. Narrow corrections repair adapter and test boundary, live inbound, active assignment filtering, safe callouts and zero-other-cargo edge. Live database contains zero operational records and zero published homepage rows; proof of authenticated cargo/CMS lifecycle remains unavailable without legitimate records. Production HOLD; no UI redesign, database mutation, deployment or next button work. See audit for exact backend gaps and mandatory acceptance gates.


## Continuation — approved visual freeze and CI recovery

Founder approved the visual design. Preserve it and keep the 3D milestone open until operational gates pass. Admin commit `0d2c9e97135067c76446a188faf8c783a1a0daa7` [CI 45581683836](https://github.com/momojdy/tiss-admin/actions/runs/45581683836) passed TypeScript, generator check, CMS/operations tests, existing in-process PostgreSQL integration tests, Android/iOS exports and Goodies regression tests. Consumer `ddffeff94a3aa89033557a09e7d4fa08f5b01c38` [CI 45581676250](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45581676250) passed TypeScript, model 11/11 and homepage 12/12; scenario suite 17/21. Four failures were a stale assertion for the replaced booking component and literal escaped newlines in three dynamic test functions. Corrected the test adapter to assert the mounted booking boundary rather than legacy copy; corrected four escaped-newline occurrences. No production UI/source or database changes in this CI recovery commit. Await exact new run results; no claim of consumer green until confirmed. Existing isolated in-process test harnesses do not create hosted Supabase projects or production fixtures. The unrelated Goodies CMS coverage failure is outside this scope. Next: server transition/measurement protections and authoritative live cargo projection.


## Backend lifecycle hardening — candidate awaiting verification

The exact SQL candidate is mirrored at `docs/konsoliss/konsoliss-3d-lifecycle-candidate.sql` in both repos. It is NOT an applied migration. Existing production capacity/ownership guards stay in place. New triggers serialize assignment mutations on the parent container row; reject assignment insertion, changes and deletion after sealing (exact unchanged updates allowed so a customer's other still-filling container can be measured); reject skipped/reversed statuses and sealing with unknown or inbound cargo, empty loads or overflow; allow an underfilled but fully measured container to seal. Strict occupancy removes the legacy account-total fallback; missing explicit measurements return null. Customer ownership and anon denial retained; no new callable privileged endpoint. The trigger guards do not implement physical seal evidence, closure/archive or a post-departure correction workflow; those require distinct audited design. The existing admin in-process PostgreSQL acceptance test now runs the candidate and exercises unknown measurements, shared occupancy, foreign reads, underfilled sealing, inbound rejection, immutable cargo, rollback of a mixed measurement update, separate containers, and forward-only lifecycle. No new hosted database or synthetic live records. Candidate is staged outside the migrations directory until exact CI passes; apply to main project only after verification and record actual migration version. No visual changes. Booking/payment/rights/receipt reconciliation and live status projection remain the next unfinished backend gates.

## Backend lifecycle hardening — VERIFIED AND APPLIED, 2026-11-25

This supersedes the candidate-only statement above. Exact SQL Git blob `f0d1d8561c73c5b8210aed09bce0703648f2a54a` passed [Admin CI 45585408537](https://github.com/momojdy/tiss-admin/actions/runs/45585408537), job 139105606151, step Konsoliss isolated CMS and measurement integration. Log: PASS: exact measured occupancy, owner isolation, underfilled seal, pending inbound/unknown rejection, immutable sealed cargo, split mixed update and valid lifecycle transitions. The same SQL was applied via Supabase migration `20261125092738_konsoliss_3d_strict_container_lifecycle` on the existing Wantiss project and added under `supabase/migrations/20261125092738_konsoliss_3d_strict_container_lifecycle.sql` in both repos; admin test now points to canonical migration. The historical candidate file is retained for provenance only; never apply it again separately.

Read-only post-application verification:
- Both new lifecycle triggers exist, enabled, as do existing shared capacity and occupancy-realtime triggers.
- Deployed definitions match tested logic; search_path empty; trigger function EXECUTE denied to anon/authenticated; occupancy RPC denies anon and retains authenticated current-assignment ownership gate.
- Unauthenticated/nonexistent container occupancy is null.
- Before and after migration: 0 containers, 0 assignments, 0 load progress rows. No production fixtures, bookings, cargo, payment or ledger rows created; no application deployment.
- Security advisor still reports broader existing findings in this project (including authenticated SECURITY DEFINER functions and some policy notices); this is not a full-project security clearance. New trigger functions explicitly revoke direct execution. [Function warning guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Consumer [CI 45585109562](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45585109562) passed TypeScript, all 51 Konsoliss tests (11+12+21+2+5, including all 324 mocked-canvas cases) and Expo web export. Admin [CI 45585117321](https://github.com/momojdy/tiss-admin/actions/runs/45585117321) passed all prior steps including native exports. New lifecycle suite passed as above. Visual design explicitly approved by founder; do not change UI. This is still not a real native performance or authenticated production lifecycle test.

Remaining gates: verified payment-to-rights creation and active balance reconciliation, per-piece accepted dispatch/receipt and entitlement attribution (current piece schema has no right_id or per-piece container allocation link), live projection of label/warehouse/incident/finalized/expiry/customs states, safe closure and explicitly audited post-seal corrections, paired live test with legitimate data, released demo-disable and published CMS. Existing wider Expo workflow Goodies copy failure is outside the current milestone. Do not assume that paid bookings can be manufactured from quote acknowledgement or manual admin totals. Do not proceed to next button yet. No production UI changes during this continuation.

## Authoritative 3D homepage read model — 2026-11-25

Founder design approved; both embedded canvas renderer initializers are preserved. The consumer no longer combines independent live headline, assignment and occupancy queries: `konsoliss_homepage_snapshot()` returns the authenticated customer's facts and every active container's measured occupancy within one database statement snapshot. Legacy read hooks are disabled in the live home; the generated CMS preview and host harness retain their isolated adapters. No provider name, cost, booking ID or operational evidence is exposed. Paid-but-unrecorded ledger is unavailable, a quote cannot become space, submitted labels do not become dispatch, accepted carrier evidence produces transit, measured receipts produce warehouse volume, and neither event is physical loading. Loaded/allocated amounts come from verified active assignments, not the old manual account totals. An open remainder has its own existing-style unassigned picker row; split views retain the aggregate loaded callout. An audited expiry movement and recorded incident produce neutral status codes. Single-right partial shipments can retain their real outstanding deadline; an ambiguous multi-right order is not assigned a guessed deadline. Admin measurement reads reconcile verified cached progress first; the DB rejects manual or stale totals that contradict source records. Missing measurements and inconsistent data fail closed.

The exact SQL candidate blob `f60927f7635796ef94fc1ab54dcf91f7d3ebf20e` passed [Admin CI 45587244634](https://github.com/momojdy/tiss-admin/actions/runs/45587244634), including the existing in-process PostgreSQL suite: verified paid ledger, label vs dispatch, measured receipt, partial deadline, admin reconciliation, exact container snapshot, incident privacy, stale/manual volume denial and ownership. Applied to the existing Supabase project as `20261125103112_konsoliss_3d_authoritative_home_snapshot`; canonical file `supabase/migrations/20261125103112_konsoliss_3d_authoritative_home_snapshot.sql` mirrored in both repos. Post-application readback confirmed the progress guard is enabled, internal helper and trigger EXECUTE are denied to anon/authenticated, public RPCs deny anon and enforce owner/admin scope, and unauthenticated snapshot returns unavailable. Zero booking orders, progress rows and assignments before/after; no real payments or production fixtures inserted. Candidate file is historical only, never apply separately.

Production builds now default to demo OFF, EAS production explicitly sets 0 and internal development explicitly sets 1. Admin's isolated CMS preview remains enabled. The full paired app validation for these new client changes must be read from the exact commit's CI; do not substitute the prior SQL candidate CI. Prior paired commits passed [consumer CI 45585869625](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45585869625) and [admin CI 45585880314](https://github.com/momojdy/tiss-admin/actions/runs/45585880314). The full consumer Expo validation still has its unrelated Goodies copy coverage failure.

**Release boundary:** checkout/verified payment acquisition is deliberately disabled by the earlier quote lock; no legitimate paid records exist for live paired-app proof. Per-right partial attribution within an order containing multiple rights, separate pre-inbound reservation outlines B3/C2, explicit unused finalization C3, fully verified arrival/customs/pickup distinctions D3, active assignment closure and per-piece physical allocation remain incomplete. Current incident/preparation state only reflects qualifying recorded operational cases; there is no invented provider action. The CMS published-row count and native device performance/real authenticated lifecycle still require verification. Do not call the overall 3D production-ready until these gates are satisfied. Do not enable payments or fabricate data to bypass them.

## Authoritative snapshot — paired CI verified, 2026-11-25

Exact tested code commits: consumer `6332e09747a58883ddf611b86c68cb80ed34294f` ([CI 45596532688](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45596532688)); admin `1798185d1472a10b874bbaee6355c010c20a0482` ([CI 45596145228](https://github.com/momojdy/tiss-admin/actions/runs/45596145228)). Both workflows concluded success. Consumer: TypeScript, 53/53 Konsoliss tests (12+13+21+2+5), 23 scenarios / 27 renderable views / 324 mocked canvas cases, production snapshot host checks and Expo web export. Admin: TypeScript, paired source generator verification, CMS and operations boundary tests, isolated PostgreSQL CMS and measurement integration including authoritative snapshot, Android and iOS bundling, Goodies regression tests. Both embedded renderer initializers are byte-identical to the previously approved renderer and match in both repos. Native bundle success is not a device-runtime/performance test. The follow-up documentation commit contains no functional changes.

Broader consumer [Expo validation 45596137139](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45596137139) failed at the unrelated Goodies CMS coverage check; its later validation steps were skipped. Do not report that workflow as green. No new hosted test database, fake live operational records, payment activation or app deployment.

**3D release decision: HOLD.** The approved renderer, tested snapshot path and strict container lifecycle have passed the checks above. The existing payment/rights creation lock, multi-right piece attribution, planned-vs-committed and finalized-unused cases, per-piece loading and physical seal/VGM evidence, customs/pickup and closure handling, authorized published CMS and real paired authenticated device verification still prevent a full production acceptance. Keep the 3D milestone open; do not start the next button. Do not substitute isolated synthetic test records or fixture coverage for real operational acceptance.

## Scoped homepage acceptance — 2026-11-26

**My Current Load and the 3D container: APPROVED DESIGN / IMPLEMENTATION VALIDATED / LIVE RELEASE GATED.** This is scoped acceptance of the tested presentation and implemented read path, not a declaration that all live scenarios or Konsoliss as a whole are production-ready. Freeze the approved layout, expansion behavior, loaded + inbound arithmetic, split-container aggregate callout, original and reference renderer geometry, shadow, replay, labels, countdown placement, and seven-second progress bars. Preserve the verified shared Supabase snapshot and generated Admin preview. Evidence remains the exact paired CI runs 45596532688 and 45596145228 above: 53 passing consumer tests, 23 fixture scenarios, 324 mocked-canvas checks, Admin integration and native bundling. Fixture acceptance is not live scenario parity. Remaining release gates include verified payment-to-rights acquisition, multi-right and piece-level custody/physical allocation, planned-vs-committed and finalized-unused states, customs/pickup/closure, physical safety evidence, published CMS and authenticated native device verification. The unrelated broader consumer Goodies CMS failure remains outside this scope. Do not reopen approved visuals unless a demonstrable defect requires a minimal correction. No public release, payment enablement, synthetic production records, or change to the overall HOLD decision. This documentation-only classification does not authorize starting another feature or certify untested behavior.


## My Current Load / 3D container CMS completion — 2026-11-26

Scope: text, accessibility wording, canvas annotations, translations, safe Content Studio preview and publication; no change to the approved consumer layout, either embedded renderer initializer, cargo geometry, animation, shadow, physical CBM arithmetic, payment or Book Space logic. Technical measurement units and actual quantities, dates, container IDs, status codes, entitlements, provider choices and permissions remain backend-owned; CMS cannot edit them. Demo-only scenario titles/controls remain internal, clearly marked, and do not write records.

- Added 30 missing catalog fields, including tracking warning/countdown, label-created and warehouse status, partial-load / inbound / remaining / unused / unassigned quantities, split count, incident/expiry/customs, illustration, reservation callouts and selector accessibility. 97 scoped keys, 173 homepage keys in total. All 173 fields now have prepared copy in en, fr, ht, es and zh-Hans (692 non-English translations), preserving every existing placeholder. The existing homepage-wide publication contract requires the remaining static homepage fields as well, so their translations are included; no booking logic was changed.
- Consumer copy resolver now prefers bundled translations for the chosen locale over an English fallback where a translation exists; reviewed published locale content takes precedence, unreviewed/malformed/draft content does not. The existing foreground/realtime/30-second refresh and per-locale public cache remain. Canvas annotation wrapper translates actual measured text and its width measurements; original geometry and both renderer source initializers remain byte-identical. No operational value is sourced from CMS.
- Admin Content Studio exposes all 23 direct state choices (including D6/D6b, split and unassigned views), existing manual editor for every catalog key, locale prefilled drafts, and an explicit bulk review confirmation. Canvas fields are editable in the manual canvas/load groups, not by tapping a WebView. Save a first untouched starter draft is now allowed. No translation is falsely marked as human-reviewed.
- Database validator whitelist now exactly matches the 173-field source catalog. Exact tested SQL blob `a0f7a7c4eaf59a227ba172b2f19877dc3ce213cc` applied to the existing project as migration `20261125183436_konsoliss_load_container_cms_label_contract`, mirrored under `supabase/migrations/20261125183436_konsoliss_load_container_cms_label_contract.sql` in both repositories. The historical candidate file is provenance only, not a second migration. Readback verified every key/value, anon/authenticated direct trigger EXECUTE denied, and 0 CMS homepage rows before/after. Existing schema restrictions, placeholder checks, draft/publish authorization, version lock and asset checks unchanged.
- Verified consumer [CI 45676417560](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45676417560), tested code `d6ee1fee5c5424010d0cc25d42d68aa0c9c3b558`: all 57 Konsoliss tests (12+14+22+3+6), all 324 canvas combinations, 23 direct state choices × 5 locales = 115 actual host preview cases, catalog placeholder/locale checks, published-refresh/draft rejection/cache, annotation safety. Full consumer TypeScript still fails only on five unrelated ArtsLits StyleSheet.absoluteFillObject errors introduced by concurrent commit `ad9a8c5c39dc0b5d7502d92c186ffd774e011727`; web export skipped. Scoped tests were moved ahead of the global typecheck so the unrelated failure cannot hide their evidence. Other feature files untouched.
- Verified Admin [CI 45676311558](https://github.com/momojdy/tiss-admin/actions/runs/45676311558), tested code `5e567082265d4c1a869a9abc9912d01508192b20`: TypeScript, source synchronization, CMS permissions/boundary tests, actual in-process PostgreSQL save/publish/public read round trips of all five prepared locale payloads and published-version change, invalid placeholder/unreviewed/operational/draft rejection, native Android/iOS bundles and existing operational/Goodies tests. Isolated test fixtures are not production rows.
- Deployed public endpoint `wantiss-public-content` v8 inspected directly: uses published-only RPC and returns locale content plus public assets, cache max-age 60. Added read-only GitHub workflow `Konsoliss public CMS readback` to check actual endpoint for all locales, and an optional strict release check `--require-published`. It does not publish or create records. Direct HTTP from the current tool container could not resolve the Supabase hostname; use the runner result as separate proof.

**CMS acceptance boundary:** implementation, five prepared language catalogs, 23-scenario preview, database contract and isolated workflow tests passed. Live CMS still has zero saved/published homepage records. An authenticated staff account with content.manage/edit and content.publish/manage must review and publish the real locale drafts. The connector has no legitimate application staff session; do not spoof auth.uid, invent created_by/updated_by, or bypass review to manufacture proof. In Tiss Admin → Content Studio → Konsoliss, choose each locale, inspect labels/scenarios, mark reviewed (individual or explicitly confirmed all), Save draft, Publish, verify the public-confirmed message, then reopen/refresh the consumer and run strict readback. The CMS implementation can be frozen; live publication and native visual localization acceptance remain gated. The overall 3D/live cargo release HOLD remains unchanged. No fake customer records, no application deployment, no new branches and no work on Book Space business logic.

### Live CMS delivery readback

[Public CMS readback CI 45676942310](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45676942310), job 139426868855, completed successfully. Real HTTP POST to the deployed public endpoint returned 200 and valid content/assets response for en, fr, ht, es and zh-Hans; each correctly returned no published Konsoliss homepage (0/5). No auth spoofing, publication, seed content or other database writes occurred during this check. After actual authorized review/publication, rerun the same workflow with require_published=true; it then requires every locale to have a published version containing all 173 reviewed placeholder-safe labels. This is an operational acceptance gate, not a green check for content that has not been published. The paired client/SQL candidate tests above remain the functional acceptance evidence; the canonical migration was identical. 


## Top-right 40HQ occupancy percentage and progress — scoped acceptance, 2026-11-26

**ACCEPTED / IMPLEMENTATION VALIDATED — fixed 68 CBM physical capacity.** The top-right fill label in the consumer homepage and generated Admin Content Studio preview now uses the same integer-based three-decimal percentage formatter. The deployed owner-scoped `konsoliss_container_occupancy(uuid)` RPC uses PostgreSQL numeric rounding to three decimal places, not two. Formula: all physically loaded CBM in the selected individual 40HQ container / 68 × 100; free physical CBM = 68 − loaded. Purchased and inbound CBM do not contribute to physical occupancy. Each split container has its own independent 68 CBM denominator. The customer progress bar continues to use purchased entitlement as its separate denominator. A sealed underfilled container is not reported as full. No changes to layout, colors, ring/linear-bar geometry, seven-second alternation, either canvas renderer, CMS schema, or Book Space. Only the percentage formatter and its import changed in the paired homepage source.

Three decimal percentage places (trailing zeros omitted) distinguish all supported 0.001 CBM increments. 0 → 0%; 0.001 → 0.001%; 0.020 → 0.029%; 34 → 50%; 51.700 → 76.029%; 67.320 → 99%; 67.900 → 99.853%; 67.999 → 99.999%; 68 → 100%. Unknown/invalid measurements are not zero occupancy. The label is 100% if and only if 68.000 CBM is verified physically loaded; 0% if and only if exactly zero is verified.

**Exhaustive verification:** 68,001/68,001 occupancy inputs from 0.000 to 68.000 inclusive passed the actual shared JavaScript parser/formatter test (independent BigInt expected values; strictly increasing, correct endpoints, sum of loaded and free = 68, rounding error at most 0.0005 percentage points). Maximum measured absolute error ≈ 0.0004705883 percentage points. Independently, the PostgreSQL numeric expression swept all 68,001 values in the existing live database with a read-only generate_series query: zero failures; no operational rows created. The isolated backend test also sweeps all 68,001 SQL values and calls the actual authenticated occupancy RPC at nine boundary/example values, including 67.999 and 68; owner isolation and existing capacity/lifecycle regressions remain enforced.

[Consumer CI 45689211416](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45689211416), functional commit `52fb30b07e9cd1814aa5d248bcecf6892ccd2865`: 59/59 scoped Konsoliss tests passed (13+15+22+3+6), including exhaustive arithmetic, real homepage host boundary labels, and existing scenario/renderer tests. Global TypeScript failed at six unrelated ArtsLits StyleSheet.absoluteFillObject errors; no Konsoliss errors reported, web export skipped. [Admin CI 45689218642](https://github.com/momojdy/tiss-admin/actions/runs/45689218642), functional commit `affeea0983c20e903eccf15ff307d00a70c817ed`: TypeScript, generated preview synchronization, exhaustive client test, isolated SQL/actual RPC integration, Android and iOS bundling passed.

Exact SQL candidate blob `6bb3d673e03e20b9b29106bfa575fa9b59bc819a` passed the isolated SQL integration before application to Supabase. Applied migration `20261125195159_konsoliss_exact_container_fill_percentage`; canonical file `supabase/migrations/20261125195159_konsoliss_exact_container_fill_percentage.sql` mirrored in both repos. Deployed readback confirmed round(...,3), anonymous EXECUTE denied, authenticated EXECUTE retained with owner checks, unauthenticated call denied, and zero containers/assignments before and after. Candidate file is provenance only, never apply twice. No fake live cargo, no app deployment, no unrelated changes. This acceptance is scoped to percentage/occupancy computation and its verified connection; authentic live shipment/device verification and CMS publication remain gated as recorded above.


## Under-container alternating progress bars — scoped acceptance, 2026-11-26

**ACCEPTED / IMPLEMENTATION VALIDATED — exact independent partitions and seven-second rotation.** Customer bar uses verified account-wide purchased CBM as denominator; physically loaded, verified inbound-to-container and not-allocated CBM are disjoint segments. Shared container bar uses exactly 68 CBM per selected 40HQ: other physically loaded cargo, customer physically loaded cargo and physical free CBM. Split shipments keep the customer bar account-wide and show total physical load/free on the selected container bar, without a separate customer segment. No inbound/purchased volume is counted as physical occupancy.

Fixed all four audit findings: (1) integer millesimal CBM partition helpers feed explicit percentage widths with zero fixed inter-segment gaps and no flex shrinking, preventing overflow and false proportions at full allocation; (2) the seven-second rotation and manual arrow now work even without a container assignment, with a new full dwell after a manual change or container selection; (3) unavailable/no-denominator states use a transparent dashed outline, dash legends where data is unknown and existing localized accessibility wording, never a solid verified-empty track; verified zero occupancy and verified zero allocated against a positive purchased amount remain solid empty tracks; (4) optional simulated clock in the existing host harness executes actual homepage React effects, dependency changes and cleanup. Existing gradient, colors, rounded shape, height, double arrow, label styling, CMS fields and operational backend remain intact. Both embedded canvas renderer blocks were checked byte-for-byte unchanged in each repository.

**Verification:** all 68,001 container totals from 0.000 through 68.000 CBM, four ownership distributions where distinct, both single/split representations = 543,956 container partition cases; 175,395 customer allocation combinations, exhaustively covering every 0.001 CBM partition for purchased amounts 0.020–0.100 CBM plus larger, multi-container and maximum-supported numeric boundaries. Independent direct execution of the committed helpers: zero failures; exact endpoint behavior and sums within floating-point tolerance. Invalid and unknown values rejected. Actual host tests cover measured zero/full, unknown tracks and visible labels, proportional widths, split selection, and automatic/manual seven-second rotation with timer cancellation on unmount, including no assignment and unavailable data.

[Consumer CI 45694049027](https://github.com/momojdy/tiss_tiss_beta/actions/runs/45694049027), code commit `f0b595af11d91d444aece76a180285f5d678743a`: scoped Konsoliss homepage and data integrity test step passed, including new exhaustive and simulated-timer tests. [Admin CI 45694054228](https://github.com/momojdy/tiss-admin/actions/runs/45694054228), code commit `8c1c245ca2f3d013f5b544ef575c3a753e3586a6`: TypeScript, generated preview synchronization, CMS/operations boundary and exhaustive partition tests, isolated CMS/measurement integration, and Android bundling passed when acceptance was recorded. Remaining global build steps were still running at that check; the linked workflows retain the final results. This is scoped component acceptance, not full app release certification.

No Supabase mutation or migration was necessary: both bars continue to consume the existing authenticated owner-scoped atomic homepage snapshot and verified Admin measurements. Existing live shipment/device verification, CMS publication and overall release gates remain open. No fake production records, deployment, branch creation, renderer redesign or Book Space changes.

**Final CI readback:** Consumer 63/63 scoped tests passed (15+17+22+3+6), including the actual host-effect rotation and segment tests; full consumer TypeScript failed solely on the six unrelated ArtsLits `StyleSheet.absoluteFillObject` errors, so Expo web export was skipped. Admin workflow concluded success, including Android and iOS bundling and existing Goodies regression tests. The scoped acceptance above is unchanged.
