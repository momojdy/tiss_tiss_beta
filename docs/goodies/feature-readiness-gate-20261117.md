# Wantiss / Goodies — feature-level production readiness gate
**Audited:** 2026-11-17. **Scope:** Goodies only (customer, Business Space/vendor, courier, Tiss Admin, CMS, Help Pay, Wallet/Card/Cash intersections). **Decision:** NOT RELEASE-READY. **Deployment:** PAUSED BY OWNER; no app/OTA, production SQL migrations, Edge Functions, CMS publication, real charges, or production test records are authorized by this review.

## Evidence and current source
- Actual GitHub `main` in `momojdy/tiss_tiss_beta` and `momojdy/tiss-admin`. Final source/CI head is separately recorded in git history.
- The previously verified acceptance package at `docs/goodies/acceptance-20261117/` records 252 automated tests (106 customer, 33 admin, 47 cross-role, 66 Deno/backend), 13 isolated native PostgreSQL races, plus browser and Expo bundle checks. These are historical source verification results, not new live customer transactions.
- The existing static Goodies source/control inventory captures 132 files and 1,554 callbacks/controls (428 consumer, 435 vendor, 197 admin, 8 courier, 459 isolated preview, 27 shared-card) with zero missing *static* source handlers. It does not prove a control works in installed application or across authenticated hosted roles.
- Live Supabase **read-only** metadata checked again this turn: 356 applied migrations, head `20261116135012`, 26 Goodies tables, 93 Goodies RPCs, 31 RLS policies. One historical Goodies order, zero roster/assignment records, two group orders, zero order reviews.
- Original 17 pending migration package and six Edge Function changes: `docs/goodies/acceptance-20261117/production-change-plan.json`. **A separate 18th security migration** was added at `supabase/migrations/20261117155800_goodies_admin_invitation_accepted_server_side.sql`; it has not been applied to production and must be included in a new isolated migration-package rerun.

## Acceptance protocol and evidence levels
Use **SOURCE VERIFIED** only for inspected implementation and static handler coverage; **ISOLATED TEST PASS** only for an executed synthetic client/SQL/HTTP harness with no production mutations; **HOSTED READ-ONLY PASS** only for a named GET/negative authorization check; **NOT VERIFIED** for device/provider/hosted signed-in paths not executed; **BLOCKED** when required production contracts are missing. These levels cannot be upgraded based only on TypeScript or bundle success.

All simulations use an isolated PostgreSQL/test environment or explicit provider sandbox. **Never seed/test in the main Supabase production database.** Finance tests must verify wallet double-entry, idempotency, balances, stock, taxes/fees and cancellation/refund sums after every simulated transition. Never run actual financial writes on live Wantiss.

## Customer/navigation and catalogue acceptance matrix
| Scenario | Expected result | Existing evidence / gap |
| --- | --- | --- |
| First sign-in, logout, account switch, stale promises | No old customer address, cart, order, private sheet, payment or BYO draft visible | Isolated cache, bootstrap and recovery tests PASS; installed device NOT VERIFIED |
| Home/category/brand banner/store tile/see all | Correct CMS destination, 34 routes, no dead or prototype pages | Static route register and isolated CMS controls PASS; signed-in presses NOT VERIFIED |
| No delivery address, address create/edit/remove/main default | Ownership, persisted Goodies selection, distance recompute, no cross-feature default damage | Isolated customer address tests PASS; live cross-feature device NOT VERIFIED |
| Store closed, out of range, schedule at night/overnight, DST | Authoritative server schedule + quote; no fee spoofing | Isolated order/routing checks PASS; live traffic NOT VERIFIED |
| Search, filters, category changes, empty results | Correct actual catalogue, no static seed items | Source checked; full hosted interaction NOT VERIFIED |
| Regular, large, drink, BYO, min/max ingredient, stock=0 | Exact server option validation, cannot charge stale prices | Isolated pricing/builder tests PASS |
| Cart add/multi-store/remove/replace/reorder | Correct ownership, per-stop allocation, current prices, no duplicate | Isolated recovery, group, multi-store checks PASS; hosted NOT VERIFIED |
| Flash deals, CMS promos, first-delivery discount, codes | Must be server verified, not cosmetic discount or color ID | Isolated pricing/CMS PASS; hosted effective offers NOT VERIFIED |
| Checkout pickup, ASAP, scheduled, address, contact, tip, promo | Server validates exact quote, opening, contact and totals | Isolated Wallet/order lifecycle PASS; installed NOT VERIFIED |
| Wallet pay, insufficient balance, network timeout and retry | One order/one debit; recover stable attempt key; truthful failures | Isolated finance tests PASS; hosted approval NOT VERIFIED |
| Saved card, 3DS challenge, cancel, retry, webhook, reconciliation | No duplicate capture/order; 100% Stripe/ledger reconciliation | Signed/provider sandbox NOT VERIFIED, BLOCKED as release gate |
| Cash order and COD consent by each store and assigned courier | Only when operational policy allows and cash handling reconciles | Isolated server checks PASS; real courier NOT VERIFIED |
| Order list, track, notifications, contact, feedback, refund status | Current server status; deep link to actual order; no fabricated success | Isolated sync/reviews/courier tests PASS; push & installed device NOT VERIFIED |
| Cancel before vendor accepts, decline, expiry, refund per stop | Atomic status/stock/funds; other multi-store stops continue | Isolated cancellation and financial races PASS; live provider NOT VERIFIED |
| User restrictions vs merchant restrictions | Exact scoped deny at catalogue, checkout and vendor ops | Isolated privilege tests PASS; hosted unauthorized account tests NOT VERIFIED |
| Language en/fr/ht/es/zh-Hans switch across all pages | Published reviewed translations, no machine draft leakage; human-reviewed Creole | 6,816 isolated lookups PASS; human review and installed multilingual pass NOT VERIFIED |
| FAQ copy, policies and legal texts | Handled at owner-designated final content phase | EXPLICITLY DEFERRED; not the basis for current source fixes |

## Vendor/merchant acceptance matrix
| Scenario | Expected result | Existing evidence / gap |
| --- | --- | --- |
| New store setup, delivery address/GPS, hours, local language title | Persist via authorized RPC and appear on customer browse | Isolated vendor tests PASS; end-to-end signed-in hosted NOT VERIFIED |
| Upload photo, five-photo max, MIME, crop, cover/thumbnail | Durable authorized Storage objects, correct image at customer | Expo source and isolated tests PASS; hosted upload/download NOT VERIFIED |
| Create/edit/delete regular listing, toggle stock/availability | Business-only authorized mutation, pending review on sensitive edit | Isolated product moderation PASS; hosted pending/rejection NOT VERIFIED |
| Product moderation rejected/approved/rejected-note | Actual reviewer identity/audit; rejected not public | Isolated SQL tests PASS |
| BYO builder sizes, rules, add/remove ingredients, publication | Vendor edit and admin asset publication compose safely | Isolated builder/RLS tests PASS; device output matching NOT VERIFIED |
| Go live/offline, inventory unavailable, merchant restriction/restore | No offer of unapproved goods or restricted store | Isolated eligibility/role tests PASS; hosted not verified |
| Order accept/decline/expire, preparing, ready, pickup completed | Server-authoritative transitions and customer/admin sync | Isolated order lifecycle PASS; hosted not verified |
| Cash consent, dispatch, courier offer expiration, reassignment | Only eligible couriers; no double accepted assignment | Isolated offer/courier tests PASS; live `goodies_courier_orders` absent |
| Own driver no live GPS, proof upload, customer receipt/dispute | No invented live tracking; private proof, ordered dispute/refund | Isolated private proof/dispute tests PASS; production private bucket absent |
| Messages, ingredient requests, customer/store notifications | Right inbox, scoped access, correct destination | Isolated role-notification tests PASS; physical push unverified |
| Vendor settlement, weekly earnings, 10% item commission, 7% delivery | Correct hold/cash/net, immutable financial ledger | Isolated financial races PASS; live settlement contracts absent |

## Courier, operations and Help Pay matrix
| Scenario | Expected result | Evidence / gap |
| --- | --- | --- |
| Courier enrollment/remove, suspended/unapproved attempted login | Server denies unapproved courier and ends tracking | Isolated courier role tests PASS; live staffing empty |
| Go online/offline, COD available, accept/decline an offer | Allowed only for qualified available courier; auto expiry | Isolated courier offer lifecycle PASS |
| Pickup, background/foreground GPS, network interruption, stale marker | Fresh GPS only; no straight-line routes; stop sharing after completion | Isolated route/timing tests PASS; physical device/Maps keys NOT VERIFIED |
| Courier reassign before accept, conflict with accepted offer | One delivery assignment; atomic transfer, no double charge | Isolated PostgreSQL races PASS |
| Vendor dispute vs courier dispute, cancellation after pickup | Accurate status, evidence, refunds, tip/commission cleanup | Partially isolated; hosted/provider NOT VERIFIED |
| Admin product/courier/order/reviews/settlement/restrictions | Server roles, status, preview separated; complete pages & actions | Isolated admin tests PASS; hosted all buttons NOT VERIFIED |
| Goodies Ecosystem navigation, Categories/Promotions/Support/Settings | Correct active Goodies module, no prototype generic workspace | **FIXED ON MAIN** this turn; real callback covered by new CI test |
| Goodies support customer request → admin triage/status | Ticket persists under Goodies feature, protected read/update | **FIXED ON MAIN** this turn; admin reply-thread remains MISSING |
| Staff invitation acceptance and Goodies admin permissions | Require verified email + server-accepted invitation, no editable metadata | **STAGED ON MAIN** this turn; DB migration not applied/tested in hosted roles |
| Help Pay shared 60%, full contribution, QR/card sharing | Server-calculated cents, no QR amount authority, authorized creator | Isolated tests PASS; release gate stays off |
| Help Pay friend contribution, multi-payer race, insufficient funds | Exactly one debit per key, wallet balanced, no spoofing | Isolated financial races PASS; live contribution RPCs missing |
| Help Pay withdraw/cancel/expire/refund, crash or logout recovery | Correct ledger, refund pending, recoverable key/account | Isolated race/restart tests PASS; hosted provider not verified |
| Multi-store group and Shared Bill combination | Only supported combinations offered; no silent financial leakage | Group/Shared Bill isolated tests; multi-store Help Pay unsupported intentionally |
| Multiple locales in notifications and payment requests | Reviewed localization with fallback, correct destination | Isolated tests PASS; installed push NOT VERIFIED |
| Content editor draft/publish, assets, courier/checkout copy | 34 consumer routes and shared copy, draft never leaks, fees preserved | Isolated preview & SQL tests PASS; hosted publication/installed reload NOT VERIFIED |

## Current blockers before signing off Goodies as a prepared, integration-ready feature
1. **Backend contract drift (BLOCKED):** 17 previously prepared migrations plus newly staged staff-invitation migration are not deployed. Some customer/vendor/courier/admin code needs these RPCs, policies, private proof bucket, settlement config and Shared Bill recovery rules. Do **not** bypass checks to match old live database.
2. **Provider reconciliation (NOT VERIFIED):** Stripe valid signed webhook, authorization, 3DS, card capture timeout, refund/partial refund, dispute, chargeback and idempotent replay need a real provider sandbox and matching ledger reconciliation. There is a product-policy tension between original-card Stripe refunds and the stated wallet-only refund preference; resolve financial/legal/accounting implications before launch rather than silently changing money destinations.
3. **Native acceptance (NOT VERIFIED):** signed development/production-like Android and iOS builds; restrictive Android map configuration, road route geometry, actual courier GPS with background/offline/battery/reassignment, deep links, notifications; Expo bundle is insufficient.
4. **Hosted signed-in cross-role testing (NOT VERIFIED):** authorized customer, independent second customer, vendor owner, restricted vendor, approved/unapproved courier, scoped staff and super admin; no approved test identity stack in this chat. Use non-production isolated Supabase clone and controlled test balances.
5. **Support (PARTIAL):** customer requests and admin triage are backed by real ticket table, but staff-to-customer reply/history workflow is not yet wired. Historical untagged Goodies tickets will not be listed under new feature-prefixed filter without a reviewed legacy migration.
6. **CMS/locale publication (BLOCKED by pause):** candidate translations and source are prepared, but live CMS still serves old content. Owner has explicitly deferred FAQ/placeholder completion. Do not publish at this stage.
7. **Migration package reconciliation (REQUIRED):** re-freeze hashes, attach staged security migration, rerun isolated PostgreSQL clean-install and rollback/replay tests before calling the final source release candidate complete.
8. **Operational recovery (NOT VERIFIED):** verified backup/PITR restore, migration rollback procedure, order/refund support runbooks, monitoring, courier staffing, payout activation/reconciliation and release approvals.

## Frozen deployment policy
The user is building Wantiss feature by feature. A Goodies **code-complete** milestone is distinct from a Goodies **hosted-operationally verified** milestone and from a **full Wantiss deployment**. None authorizes deploying Wantiss now. Continue fixes only on existing `main`, no branches and no unrelated UI changes; require exact-commit CI evidence and versioned migration/Edge manifest. Production data is never a test fixture.
