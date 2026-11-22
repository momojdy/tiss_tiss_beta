# Goodies USD/HTG reference refresh

The missing rate producer is repaired within the existing Supabase backend. The public `exchange_rates` table remains the only quote source. The worker uses [Frankfurter's documented daily reference API](https://frankfurter.dev/); no account, API key, paid subscription, Firebase database or replacement backend is required. This is a daily reference rate, not a live executable FX price or an official BRH quote.

Only USD→HTG is refreshed. Activation derives the existing Wantiss adjustment from the latest valid configured USD/HTG row, retaining its source ID. It does not invent a fee, reset a rate's date, change old rows, enable external payouts, or modify order/Wallet/settlement records. Each accepted provider publication inserts an immutable new quote and a provenance audit entry. Existing order FX snapshots remain authoritative.

Quotes expire at UTC midnight four calendar days after the provider's observation date. This allows weekend reference data while keeping an absolute expiry; fetching the same observation never extends it. The worker runs every four hours. Source/API/SQL outages retain the last valid quote until its fixed expiry. Stale, future, malformed, non-finite and backward-dated observations are refused. Subsequent changes greater than 20% require financial review. New orders fail closed when no valid quote exists.

Authentication reuses the existing private Goodies worker token. The Edge Function validates it before any provider call or write. Client roles cannot call quote-publishing, service-status or failure-recording RPCs, and cannot access the private producer configuration. Finance-authorized admins can read operational status through `goodies_admin_fx_refresh_status`. Incident audit records contain safe codes rather than raw provider or database errors. No secret is returned in responses, logged or sent to the rate provider.

## Rollout

1. Validate the migration, Edge code and isolated tests. Apply only the reviewed FX migration to existing project `ycbirmgppwavorwudlrv`.
2. Deploy `refresh-goodies-exchange-rate` with its custom worker-token authentication (`verify_jwt=false`). The new scheduled job is inert while configuration is disabled.
3. Apply `supabase/operations/goodies-enable-usd-htg-refresh.sql` through the privileged deployment connection. This preserves the existing adjustment and audits activation.
4. Invoke the same scheduled HTTP request using the token inside Vault. Never print or export that token. Verify the HTTP receipt, published observation date/expiry, preserved multiplier, cash-store eligibility and unchanged order/Wallet/settlement fingerprints.
5. Verify the canonical deployed migration version, function source/grants, active four-hour schedule and current rate. No app release is involved.

## Pause and recovery

Disable `private.goodies_fx_refresh_config.enabled` through an audited privileged operation to pause new refreshes. Keep existing quotes, producer provenance and the adjustment. Existing quotes remain eligible until their original expiry. Resume with the same enable operation; it retains the existing adjustment. Source outages are retried at the next scheduled run. A retry after a lost response returns the same committed quote, and concurrent refreshes cannot duplicate it. Unexpected quote jumps require review before resuming normal publication.

The existing isolated PostgreSQL runner tests activation/refusal, roles, concurrent publication, exact adjustment preservation, retries/outages, immutable financial snapshots, pause/resume, migration replay and transactional rollback. Deno tests exercise the actual worker parser, authentication, fixed expiry, bounded responses and safe errors. Production financial transactions are not test fixtures.

## Native prerequisites

Supabase remains the application backend and notification source. As documented in [Supabase's push guide](https://supabase.com/docs/guides/functions/examples/push-notifications), Expo delivers Android push through Google FCM and iPhone push through Apple APNs. FCM does not require moving application data or authentication to Firebase. Android still needs the owner's Google project/client credentials; physical iPhone signing remains blocked because the owner confirmed no paid Apple Developer membership. Installed device behavior remains NOT VERIFIED.

The existing EAS build now runs a platform-specific pre-install check. Android requires Maps and matching push client configuration; iOS can be checked independently. The check needs no application dependencies and does not certify signing, credential ownership, API restrictions or physical behavior. Malformed/null client files and server service-account files are refused. Successful local Android/iOS fixture checks and incomplete-config refusals are in [the native preflight results](native-preflight-verification.log). No app installer was released by this change.

## Verified deployment

Migration **20261122070253** and version **1** of `refresh-goodies-exchange-rate` are deployed. Migration ledger SQL and all deployed Edge files exactly match source. The worker's first normal refresh returned HTTP 200, using the 20 November reference at **131.42 HTG/USD** and preserving the previous Wantiss adjustment. The quote expires **24 November 2026 at 00:00 UTC**. The existing cash store is eligible. The four-hour schedule is active; this receipt does not claim a later scheduled execution was observed.

[Live readback](deployment-verification.json) verifies unchanged existing order/Wallet fingerprints, settlement/payout counts and external payout gates. [Security review](security-advisor-review.json) explains the two intentional new advisor notices and the scoped permission tests. [Native prerequisites](native-prerequisites.json) records the owner's confirmed Apple membership gap and pending Google project check. Full installed screen, GPS, push, card/3DS and CMS acceptance remain **NOT VERIFIED**.

[Targeted contract readback](live-contract-readback.json) confirms that all ten RPCs previously reported missing now exist, including the paginated admin-review overload and courier/detail/private-proof contracts. This check establishes their presence and signatures; the authenticated local tests and remaining installed authorization acceptance retain their separate scopes.

The [Android ARM64 compilation and debug-signature check](android-native-build.json) also passes at the exact functional source revision. This GitHub artifact does not contain the configured EAS environment/provider setup and is not a physical-phone acceptance installer. The UI is unchanged, and no app release, store submission or OTA occurred.
