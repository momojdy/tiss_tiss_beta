# Goodies acceptance — 21 November 2026, Asia/Manila

**Goodies is not yet production-ready, even with FAQ and translations excluded. All 12 phases have not passed their full acceptance requirements.** The tests below establish substantial working behavior; they do not certify every installed-screen interaction or an external provider/device integration.

Work continues on `main` in both repositories. The Wantiss application has not been released, submitted or updated over the air. No hosted Supabase test branch/project was created or restored. Financial tests used synthetic local accounts and balances. FAQ, translation and final policy/support approval remain deferred by the user.

## Implemented and verified in this follow-up

| Classification | Result | Evidence and limit |
|---|---|---|
| PASS | 29 scenarios through real local Auth, PostgREST, PostgreSQL and Supabase SDK clients. Ten separate customer/vendor/staff/courier/admin identities sign in. | [Scenario results](local-api-verification.json). No production endpoint or payment provider was used. |
| PASS | Product ownership, rejection reason, moderation visibility, rejection surviving availability changes, authoritative prices, stock and direct financial-field protection. | Actual authenticated local requests; cent and fractional-cent manipulation rejected. |
| PASS | Wallet checkout retries create one paid order, one debit and one stock reservation; cancellation refunds and restores stock once. | Local SDK concurrency plus the existing PostgreSQL race suite. |
| PASS | Vendor pickup fulfillment and assigned-courier fulfillment produce the same customer/vendor/admin order state. Wrong-account reads, acceptance, GPS writes and receipt confirmation are denied. | Local APIs; coordinates are explicit synthetic test inputs. This does not test a physical GPS sensor, map provider or background execution. |
| PASS | Shared Bill 60/40 and full funding preserve original-customer ownership; concurrent retries do not double debit; cancellation returns money to the original payers. | Gates enabled only in the disposable local database. Production gates were not activated. |
| PASS | CMS editing permissions, draft isolation, fee protection, authorized publishing and consumer-module reload work through the real local Edge handler and PostgREST. | 2,102 labels roundtrip; actual consumer `loadContent` and label resolution execute. AsyncStorage is an in-memory test port, so installed-app caching/realtime is still unverified. No hosted content was published. |
| PASS | A clean-stop physical copy of the local database restores all 88 table fingerprints, function definitions, roles and policies. Existing Auth sessions and checkout retries recover without another debit. | The entire **synthetic local cluster** was copied and restored. This is not a backup of Wantiss, its production extensions or Storage bytes. |
| PASS | A real native Android ARM64 development APK compiles, and `apksigner` verifies its v2 signature. | [Build receipt](android-development-build.json), [GitHub run](https://github.com/momojdy/tiss_tiss_beta/actions/runs/44865869015). Android Debug certificate, no physical-device installation or production signing. Artifact retention is three days. |
| PASS | Both public CMS delivery functions now accept the configured `zh-Hans` locale and retain legacy region-tag support. Four new handler tests cover configured locales, invalid input and safe errors. | `wantiss-public-content` v7 and `wantiss-cms-public` v6 deployed. [Deployment](shared-cms-deployment.json), [exact source comparison](shared-cms-source-verification.json). Request validation only; no content publication or language approval. |
| PASS | Admin CMS transport accepts the actual publication record shape and rejects malformed successful responses; transport/backend failures use safe messages. | Admin commit `393606950ffdfe6f61dcea508ae310d97ef343e6`; 71 local tests and its CI passed. Existing UI preserved. |

Current CI passes **488 core automated tests with zero skipped**: 269 customer, 71 admin, 47 cross-role and 101 backend tests. The 71 Deno steps are not added again. The 29 local API scenarios and 27 native PostgreSQL scenarios are separate from that count.

The 27 separate native PostgreSQL concurrency scenarios were rerun against the reviewed 32-migration Goodies target. [Local logs](log-manifest.json) preserve the evidence. The new local API job is part of the existing Expo validation workflow. [Final CI results](ci-verification.json) record the exact source commit and check results; earlier harness failures are not counted as passes.

## Requirements still open

| Classification | Requirement | What is missing |
|---|---|---|
| FAIL | Supabase leaked-password protection | The current advisor still reports it disabled. Wantiss is on the Free plan; current Supabase documentation requires Pro or above. No billing upgrade is authorized, and connected tools provide no Auth configuration endpoint. [Current evidence](auth-security-status.json). |
| NOT VERIFIED | Full application interactions and role coverage | Local cross-role scenarios pass, but every customer/vendor/admin button, computed destination, full merchant lifecycle and all authorization paths have not been exercised in signed-in installed applications. Hosted Supabase isolation tests are prohibited by the user. |
| NOT VERIFIED | Actual provider sandbox payments, webhooks, original-card refunds and reconciliation | No approved Stripe test-mode credential/webhook binding is available. Existing isolated decision/verification tests do not establish a real provider transaction. No live charge was attempted. |
| NOT VERIFIED | Production signing and physical Android/iOS behavior | Account/app identities, approved signing configuration, Maps/push configuration and physical devices are unavailable. The development APK closes native compilation only. GPS, background/offline recovery, push and actual private proof upload/download still need device/service acceptance. |
| NOT VERIFIED | Installed-app CMS reload | The real local delivery/publish/consumer-module pipeline passes. A physical installed app, persistent native cache and actual subscriber reload have not been observed. |
| NOT VERIFIED | Full Wantiss backup restoration | No production database backup artifact, privileged database connection binding or backup-management endpoint is available. The successful synthetic-cluster recovery must not be represented as production recovery. |

Card cancellation refunds remain **to the original card through Stripe**, as explicitly confirmed by the user. Wallet and Shared Bill refunds remain per original payer. No production financial record, real balance or secret was modified.

The previous [hosted test-branch proposal](../re-audit-20261120/hosted-acceptance-plan.json) is cancelled. No paid test branch or plan upgrade is pending. The reproducible local command is in [the local test instructions](LOCAL_TESTS.md).

## Twelve-phase decision

[Phase-by-phase results](phase-verification.json) separate verified subchecks from full phase acceptance. The previous [screen inventory](../re-audit-20261120/screen-verification.json) and [source/control inventory](../re-audit-20261120/source-inventory.json) remain source evidence: 34 registered customer routes, 1,926 CMS fields, 73 page/shared groups and 1,347 extracted bindings. They do not claim that 1,347 controls were clicked on a device. Seventeen computed navigation expressions require runtime acceptance.

The existing shared-platform exceptions also remain separate: nine older non-Goodies/mixed-workspace RPCs and 64 expanded shared-shell lint failures recorded in the prior audit. They were not introduced by this follow-up and have not been silently marked as passed. [Scope and affected branches](../re-audit-20261120/shared-platform-contract-gaps.json).

No new customer demo workflow, simulated production payment or fabricated live location was introduced. Isolated editor previews and synthetic test fixtures remain isolated. This pass changes CMS contracts and verification infrastructure, with no screen redesign.

Source commits and exact changed files are in [the change manifest](commits-and-files.json). The release gate remains closed until the open security setting and external acceptance requirements are resolved. This report does not certify blanket code completion or production readiness.
