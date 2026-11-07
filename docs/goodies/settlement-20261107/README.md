# Goodies settlement implementation — 7 November 2026

**Implemented and locally verified. NOT production ready as a complete deployed ecosystem. Deployment remains paused.** No migrations, secrets, charges, real wallet movements, external transfers or CMS publication were performed. Both pull requests remain drafts. This supersedes the earlier missing-settlement candidate finding; the live backend remains unchanged.

## Approved rules implemented

- A 24-hour hold begins when delivery is confirmed through the existing completed-order lifecycle. Disputes hold eligibility. Refunds reduce earnings; post-payout reversals remain visible as recovery debt.
- Wantiss Wallet receives an atomic instant credit after eligibility. The existing Wantiss wallet and transaction history are reused.
- MonCash and NatCash (Haiti), GCash (Philippines), and supported bank destinations have verified-recipient request flows. Digital transfers have a two-day target; banks use 7–14 business days, country time zones and explicitly reviewed holiday calendars.
- Cash commissions use weekly deadlines (seven days from the end of each order's hold). The 5,000 HTG ceiling is **gross cash sales awaiting commission settlement**, including accepted/in-flight reservations. It is not a commission ceiling. Payment releases the corresponding settled sales allowance. No prepaid reserve was introduced.
- The server blocks new cash acceptance if the proposed order exceeds the cap, a commission is overdue, activation is paused or the current server exchange rate is unavailable. Existing accepted fulfillment remains possible while paused.

## Implementation and ownership

Customer/vendor: scoped summary and charts, real paginated ledger/history, payout forms, verified destination setup, exact server FX quote confirmation, commission payment, existing wallet navigation, loading/retry/error states and duplicate-tap protection. Failed balances never become zero. Financial labels distinguish USD earnings/commission from the HTG sales limit. Business/account switches discard stale financial forms and responses. Existing Goodies cash controls are reused. Own-driver dispatch can start immediately where no eligible platform courier or active offer exists; existing assignments remain protected. The generic legacy payout-setup banner no longer misrepresents Goodies records.

Admin: the same settlement module is reachable through Goodies and Finance. Owner destinations are verified through audited access; finance operators record actual transferred destination-currency amounts, receipts and reasons. Requested → processing → completed/confirmed-failed transitions are guarded; uncertain transfers remain processing. Courier-collected cash requires a verified actual remittance before becoming available. Bank calendars and payout channels require finance management permission.

Backend: migration 15 creates private RLS accounting/destination/payout/event records with no direct client access. Public RPCs enforce owner/member scope and canonical finance permissions; private helpers and anonymous execution are denied. Per-business row locks and durable request keys serialize money/cash-cap operations. Existing order commission snapshots, USD accounting, FX records, wallet identity and order state machine remain authoritative. Settlement events feed the existing audit log and notification system, with business-scoped payout navigation and deduplicated reminders. No service-role secret is exposed to a client.

**External routes are implemented as audited manual operations, not automated provider integrations.** They default disabled. No provider API, credential, confirmed transfer or sandbox success was invented. A verified transfer operating process or a separately tested provider adapter is required before enabling them. Settlement itself defaults disabled with no activation cutoff. Historical liabilities and opening balances must be reconciled before any future approved activation; past orders are not silently credited.

## Exact code revisions

- Backend: `e09ecbc71be6146c6c03249f43527b02c34906ea`.
- Customer/vendor: `63659a6ff95e92616eb39dd569e9e73f66744143`.
- Admin: `1f50ec03c23421c5971e248a553e2592a5743bb1`.

[code-changes.json](code-changes.json) lists exact files and commits since the preceding repair baseline. Later evidence/CI-only commits do not replace these implementation revisions. Drafts: [customer #33](https://github.com/momojdy/tiss_tiss_beta/pull/33), [admin #3](https://github.com/momojdy/tiss-admin/pull/3). No main merge or force push.

## Verification evidence

| Area | Classification | Evidence and practical limit |
|---|---|---|
| Ordered 15-migration package | PASS | Applied to a synthetic captured-schema database; rollback/retry coverage remains in the prior suite. No production restore test. |
| Settlement authorization, hold, cap, FX, payout and cash commission | PASS | 17 isolated SQL scenarios in [backend-tests.log](backend-tests.log), including anonymous/cross-business/staff denials, private tables, refunds/disputes, pause/recovery and dispatch/calendar rules. |
| Full backend regression suite | PASS | 58 tests plus 17 steps. Includes an intentional reproduction of the **defective captured deployed moderation function**; that passing reproduction is evidence of a live defect, not a readiness pass. Provider transports are synthetic/mocked. |
| True concurrent financial requests | PASS, local financial logic | Four native PostgreSQL 17.6 races: cash cap, competing payouts, duplicate credit and duplicate commission debit. Actual overlapping lock contention checked. [Local log](earlier-native-postgres-races.log) precedes final own-driver/calendar additions; the CI job reruns the final exact package. |
| Customer/vendor source/component regression checks | PASS | 64 tests (12 settlement, 28 prior reproductions, 7 reviews, 6 recovery, 6 CMS, 5 translation). One legacy gallery-grant reproduction confirms a deployed defect; candidate grants are tested separately. |
| Admin tests | PASS | 26 access/CMS/preview/settlement tests, including exact destination-currency amount/receipt validation and safe server-error handling. |
| TypeScript and lint | PASS | Both repositories typecheck; configured customer lint and new settlement-file lint pass. |
| Application bundles | PASS | Final Android/iOS JavaScript/Hermes exports for both repositories and customer web export. **Not signed APK/AAB/IPA builds.** Logs linked here. |
| CMS/source localization | PASS, local | 1,366 fields, 66 groups, 33 customer routes and 711 critical fields. 6,164 prepared four-locale resolver checks; 775 Creole entries preserved. No human Creole review is claimed. |
| Live rollout | NOT VERIFIED | Read-only [live-baseline.json](live-baseline.json): PostgreSQL17.6, 313 migrations, latest `20261104211532`; settlement absent. Candidate fixes remain undeployed. |
| CMS publication acceptance | NOT VERIFIED | No hosted draft → preview → publish → reload. Five deferred FAQ placeholders remain confirmed publication blockers; legal/support content remains deferred by the user. |
| Real provider, installed cross-role lifecycle, signed builds, GPS/background/push | NOT VERIFIED | Approved sandbox/hosted role access, signing credentials and physical devices are unavailable here. No real transaction was used. |

The read-only [security advisor snapshot](live-security-advisor.json) is preserved. Intentionally private RLS tables without policies and gated SECURITY DEFINER APIs are not automatically vulnerabilities. New candidate permissions were tested in isolation; this does not certify all deployed role boundaries. Existing unrelated advisor findings were not indiscriminately changed.

## Screen/control inventory

[screen-verification.md](screen-verification.md) lists all 33 customer routes with honest source-vs-runtime classifications. [source-controls.json](source-controls.json) inventories 111 files, 1,408 controls, 189 backend targets, 337 comment blocks and 70 copy candidates. Thirty heuristic error sinks require context; the count alone is neither a leak finding nor a security pass. Isolated preview fixtures remain isolated. No fake courier, earnings or payout success was added.

## Safe deployment and recovery

The [deployment plan](../DEPLOYMENT.md) now lists all 15 checksummed migrations. Renewed approval, confirmed backup/recovery access, historical financial reconciliation and compatible paired applications are prerequisites. Do not deploy the clients alone against the currently missing RPCs. Keep external channels disabled until actual transfer operations and destination verification are ready.

For recovery, disable new settlement writes while retaining the activation cutoff and all financial/audit records. Accepted-order accounting and read access remain available. Do not delete money records or automatically release uncertain external transfers. Reconcile real receipts and use reviewed forward fixes. Production backup restoration and provider reconciliation remain NOT VERIFIED.

[verification-summary.json](verification-summary.json) and `SHA256SUMS` provide machine-readable scope and evidence integrity. The remaining release gates are actual hosted/provider/device acceptance and the intentionally paused deployment/content work; local test success is not a production-readiness certificate.
