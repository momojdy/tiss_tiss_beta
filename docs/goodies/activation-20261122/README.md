# Goodies Wallet and private evidence activation

The owner approved activation of Shared Bill Wallet funding, vendor settlements and private delivery-proof uploads on 22 November 2026. Bank, GCash, MonCash and NatCash payouts remain deferred. No Wantiss app release, store submission or OTA update is authorized.

## Operations

- Apply `supabase/operations/goodies-activate-wallet-and-private-proofs.sql` through the existing project's privileged deployment connection. This is a configuration transaction, not a schema migration. It adds no public API or client grants.
- Settlement starts at the recorded activation time. Existing orders, payments, Wallet balances, stock and payout records are untouched. Any older order is recorded as excluded and requiring reconciliation; it is not silently converted into a new entitlement.
- Initial activation refuses historical completed orders, cash orders, settlement entries, payouts or commission payments. It also refuses an enabled external payout channel, disabled Wallet checkout, missing published configuration, public/incompatible proof bucket or an ordinary authenticated caller.
- Repeating activation keeps the cutoff and adds no duplicate activation audit. Pausing uses `supabase/operations/goodies-pause-wallet-and-private-proofs.sql`, preserving the cutoff, all ledgers and existing recovery/read access. Resuming keeps the original cutoff.
- The deployment audit uses a null user actor and names the privileged operation. It does not impersonate the owner or create an authenticated application session.
- Shared Bill stays protected by both the build opt-in and the server switch. Development and future production build profiles now opt in. This does not change already installed binaries or deploy an app.
- The private-proof pause hardening migration makes the two legacy public-photo guards independent of the rollout flag. It also refuses new delivery submissions using legacy public URLs. Other listing assets and authorized historical reads remain available. Tests exercise paused uploads, rename attempts, legacy submission, schema-drift rollback and idempotent replay. Existing paired clients already refuse camera/upload work when the private switch is off.

## Verification

The existing socket-only native PostgreSQL runner executes the operation against a fresh synthetic 36-migration Goodies reconstruction. It checks activation, replay, pause/resume, unchanged historical money/orders/stock, and seven refusal/rollback scenarios, then runs the existing settlement, Shared Bill, courier, restriction and push concurrency scenarios. Run `scripts/test-goodies-settlement-postgres.cjs --native-bin <PG17.6-bin> --reaudit` with the protected local test module configuration. No database URL or hosted test project is accepted.

Local Goodies unit tests, native configuration introspection, lint and TypeScript must also pass. Deployed switch readback and the operation SHA are recorded separately after application. Earlier acceptance results remain scoped to their recorded revisions.

## Android and iPhone configuration

Use the existing `@wantiss/wantiss` Expo project (`277b862a-4581-4c6b-91b8-a7da40ced36e`). Do not create another app or backend.

Android private development package: `com.wantiss.app.development`. Supply the Firebase **Android client** `google-services.json` through an EAS file environment variable named `GOOGLE_SERVICES_JSON`. The build validates its application ID. A service-account JSON is rejected; FCM server credentials belong in EAS managed push credentials and must never be embedded in a client or committed.

The Maps SDK for Android key uses `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`. Its Google restrictions must match the actual package and signing certificate SHA-1. A key's presence alone does not verify restrictions or rendering. Use a stable EAS-managed signing identity before configuring that restriction. The existing generated permissions and notification channel are covered by Expo SDK 58 introspection.

Physical iPhone installation requires the owner's Apple Developer membership, device registration, an Apple signing/provisioning identity and APNs credentials. An iOS simulator build does not satisfy these requirements. Use internal development distribution only; do not submit to TestFlight or an app store.

Keep push rollout disabled until FCM/APNs setup is completed. `supabase/operations/goodies-bind-push-project.sql` prepares the independently verified EAS project binding using the transaction-local `wantiss.goodies.eas_project_id` setting; it does not enable push, register devices, overwrite another binding or send notifications. Its independent client opt-in and server registration switch must then be enabled for the verified existing Expo project. Do not report the presence of permissions as delivery evidence.

Reference: [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/), [SDK 58 Maps](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/), [internal iPhone distribution](https://docs.expo.dev/build/internal-distribution/).

## Remaining acceptance

**PASS — cash rate prerequisite, resolved 22 November:** the protected Supabase worker now publishes validated daily USD→HTG references into the existing `exchange_rates` table. Live readback confirms a valid quote, the preserved Wantiss adjustment and cash eligibility for the existing store. Old quotes, orders, Wallets and settlements are unchanged. See [deployment evidence and limits](../fx-refresh-20261122/deployment-verification.json). This verifies the configuration prerequisite; installed cash checkout remains unverified.

Every installed screen/button/navigation/authorization path, physical courier GPS/background/offline recovery, native card/3DS interaction, proof photo upload/viewing and CMS publish-to-installed-app reload remain NOT VERIFIED until observed on the owner's Android and iPhone with the paired code. Source inspection, local API checks and native compilation do not certify installed behavior.

Actual Stripe test API scenarios passed previously, but the existing shared test account forwards events to hosted Wantiss. The financial runner now refuses that setup. Any further synthetic provider test must use a separate approved sandbox without enabled Dashboard webhooks; do not bypass the guard or run synthetic hosted orders.

FAQ/translations, leaked-password protection, external payout integrations and backup export remain deferred by the owner. No full production backup restoration is claimed.
