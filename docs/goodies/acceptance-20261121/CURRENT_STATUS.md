# Goodies acceptance — 21 November 2026, Asia/Manila

**Goodies is not yet production-ready, even with FAQ and translations excluded. All 12 phases have not passed their full acceptance requirements.** The tests below establish substantial working behavior; they do not certify every installed-screen interaction or an external provider/device integration.

Work continues on `main` in both repositories. The Wantiss application has not been released, submitted or updated over the air. No hosted Supabase test branch/project was created or restored. Financial tests used synthetic local accounts and balances. FAQ, translation and final policy/support approval remain deferred by the user. The owner also deferred leaked-password protection until a later Pro upgrade; it is no longer an active blocker in the present scope.

## Implemented and verified in this follow-up

| Classification | Result | Evidence and limit |
|---|---|---|
| PASS | 32 scenarios through real local Auth, PostgREST, private Storage, PostgreSQL and Supabase SDK clients. Ten separate customer/vendor/staff/courier/admin identities sign in. | [Scenario results](local-api-storage-verification.json). No production endpoint or payment provider was used. |
| PASS | A real private PNG uploads and downloads unchanged through the consumer proof resolver. Five-minute signed access, MIME restrictions, cross-account denials, unavailable public URLs and post-delivery immutability pass. | Fourteen checks against the official local Storage API and file backend. Physical camera capture and hosted Storage remain unverified. |
| PASS | Product ownership, rejection reason, moderation visibility, rejection surviving availability changes, authoritative prices, stock and direct financial-field protection. | Actual authenticated local requests; cent and fractional-cent manipulation rejected. |
| PASS | Wallet checkout retries create one paid order, one debit and one stock reservation; cancellation refunds and restores stock once. | Local SDK concurrency plus the existing PostgreSQL race suite. |
| PASS | Vendor pickup fulfillment and assigned-courier fulfillment produce the same customer/vendor/admin order state. Wrong-account reads, acceptance, GPS writes and receipt confirmation are denied. | Local APIs; coordinates are explicit synthetic test inputs. This does not test a physical GPS sensor, map provider or background execution. |
| PASS | Shared Bill 60/40 and full funding preserve original-customer ownership; concurrent retries do not double debit; cancellation returns money to the original payers. | Gates enabled only in the disposable local database. Production gates were not activated. |
| PASS | CMS editing permissions, draft isolation, fee protection, authorized publishing and consumer-module reload work through the real local Edge handler and PostgREST. | 2,102 labels roundtrip; actual consumer `loadContent` and label resolution execute. AsyncStorage is an in-memory test port, so installed-app caching/realtime is still unverified. No hosted content was published. |
| PASS | A clean-stop physical copy of the local database restores all 98 table fingerprints, function definitions, roles and policies. Existing Auth sessions and checkout retries recover without another debit. | The entire **synthetic local database cluster** was copied and restored. This is not a backup of Wantiss, its production extensions or Storage file bytes. |
| PASS | A real native Android ARM64 development APK compiles, and `apksigner` verifies its v2 signature. | [Build receipt](android-development-build.json), [GitHub run](https://github.com/momojdy/tiss_tiss_beta/actions/runs/44899275861). Development/debug build, no physical-device installation or production signing. Artifact retention is three days. |
| PASS | Both public CMS delivery functions now accept the configured `zh-Hans` locale and retain legacy region-tag support. Four new handler tests cover configured locales, invalid input and safe errors. | `wantiss-public-content` v7 and `wantiss-cms-public` v6 deployed. [Deployment](shared-cms-deployment.json), [exact source comparison](shared-cms-source-verification.json). Request validation only; no content publication or language approval. |
| PASS | Admin CMS transport accepts the actual publication record shape and rejects malformed successful responses; transport/backend failures use safe messages. | Admin commit `393606950ffdfe6f61dcea508ae310d97ef343e6`; 71 local tests and its CI passed. Existing UI preserved. |

Current CI passes **492 core automated tests with zero skipped**: 273 customer, 71 admin, 47 cross-role and 101 backend tests. The 71 Deno steps are not added again. The 32 local API/Storage scenarios and 27 native PostgreSQL scenarios are separate from that count.

The 27 separate native PostgreSQL concurrency scenarios were rerun against the reviewed 32-migration Goodies target. [Local logs](log-manifest.json) preserve the evidence. The local API job is part of the existing Expo validation workflow. [Latest private-Storage CI results](private-storage-ci-verification.json) record the exact source commit and check results; earlier harness failures are not counted as passes. The official Storage service applies its own 79 versioned migrations in addition to its bootstrap ledger row. This is separate from the 32 Goodies migrations.

## Browser runtime follow-up

A real anonymous browser run exposed a startup crash in native map codegen even though web compilation passed. A web-only Metro adapter now prevents native map code from loading in browsers and displays the existing CMS unavailable message for Goodies maps. Android/iOS keep the original native resolver and screen layout. The isolated phone preview continues to represent native maps. The real browser entry mounts after the fix, and CI now checks the exported web application in Chrome with all external page requests blocked. This proves anonymous startup only; signed-in and installed-device acceptance remain open.

The owner confirmed that Expo and Stripe accounts, an Android phone and an iPhone are available. Expo CLI sign-in now succeeds as `momo_jdy`. The repository is linked to the existing `@wantiss/wantiss` project, with the public Supabase key configured only for development builds. [Setup evidence](expo-account-setup.json) records the verified metadata without credentials. No Expo build, submission, release or paid upgrade was triggered by this setup. Stripe authorization, signing configuration and device execution are still required; no password or key is requested in chat.

## Requirements still open

| Classification | Requirement | What is missing |
|---|---|---|
| NOT VERIFIED | Full application interactions and role coverage | Local cross-role scenarios pass, but every customer/vendor/admin button, computed destination, full merchant lifecycle and all authorization paths have not been exercised in signed-in installed applications. Hosted Supabase isolation tests are prohibited by the user. |
| NOT VERIFIED | Actual provider sandbox payments, webhooks, original-card refunds and reconciliation | No approved Stripe test-mode credential/webhook binding is available. Existing isolated decision/verification tests do not establish a real provider transaction. No live charge was attempted. |
| NOT VERIFIED | Production signing and physical Android/iOS behavior | Expo is connected and linked to the existing project, but no signing records are stored there. App identities, Apple provisioning and Android Maps/push configuration still need verification; no physical-device connection is available. The development APK closes native compilation only. GPS, background/offline recovery, push, camera capture and hosted private proof upload/download still need device/service acceptance. |
| NOT VERIFIED | Installed-app CMS reload | The real local delivery/publish/consumer-module pipeline passes. A physical installed app, persistent native cache and actual subscriber reload have not been observed. |
| NOT VERIFIED | Full Wantiss backup restoration | No production database backup artifact, privileged database connection binding or backup-management endpoint is available. The successful synthetic-cluster recovery must not be represented as production recovery. |

Card cancellation refunds remain **to the original card through Stripe**, as explicitly confirmed by the user. Wallet and Shared Bill refunds remain per original payer. No production financial record, real balance or secret was modified.

The previous [hosted test-branch proposal](../re-audit-20261120/hosted-acceptance-plan.json) is cancelled. No paid test branch or plan upgrade is pending. The reproducible local command is in [the local test instructions](LOCAL_TESTS.md).

## Twelve-phase decision

[Phase-by-phase results](phase-verification.json) separate verified subchecks from full phase acceptance. The previous [screen inventory](../re-audit-20261120/screen-verification.json) and [source/control inventory](../re-audit-20261120/source-inventory.json) remain source evidence: 34 registered customer routes, 1,926 CMS fields, 73 page/shared groups and 1,347 extracted bindings. They do not claim that 1,347 controls were clicked on a device. Seventeen computed navigation expressions require runtime acceptance.

The existing shared-platform exceptions also remain separate: nine older non-Goodies/mixed-workspace RPCs and 64 expanded shared-shell lint failures recorded in the prior audit. They were not introduced by this follow-up and have not been silently marked as passed. [Scope and affected branches](../re-audit-20261120/shared-platform-contract-gaps.json).

No new customer demo workflow, simulated production payment or fabricated live location was introduced. Isolated editor previews and synthetic test fixtures remain isolated. This pass changes CMS contracts and verification infrastructure, with no screen redesign.

Source commits and exact changed files are in [the change manifest](commits-and-files.json). The release gate remains closed until the remaining external acceptance requirements are resolved. The owner-deferred Auth setting is recorded separately. This report does not certify blanket code completion or production readiness.
