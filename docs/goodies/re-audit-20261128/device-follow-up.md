# Goodies device/configuration follow-up — 28 November 2026

This follows the cross-role audit. No app-store/OTA release, production financial test or hosted isolated Supabase environment was created.

## Completed

- Removed the customer home’s “Loading stores…” text and grey placeholder card. Catalogue refresh continues behind the existing home; existing error/retry controls remain. Shared-shop entry from messages retains its dedicated loading screen.
- Synchronized the actual admin consumer preview and source/catalogue metadata. Current catalogue: 34 routes, 73 groups, 1,920 text fields. No CMS publication.
- Focused home/entry regression files passed. Admin CMS: 23 tests passed. Configured lint and source TypeScript checks passed.
- Created a new **development-only**, EAS-managed Android keystore in the existing `@wantiss/wantiss` project. Read-only metadata confirms it is assigned to `com.wantiss.app.development`. No production credential was replaced and no private key was downloaded or committed.

Customer UI commit: `5d70f5173236f0e0638d669f7bbbf61b48b8a69d`. Admin preview commit: `90e0e6bb38db4f6775c53bf17342959061cad6b3`.

## Android Maps restriction identity

Use this identity for a future development Maps key restriction after Google access is available:

- Application ID: `com.wantiss.app.development`
- Certificate SHA-1: `80:00:A4:09:BA:FE:89:DE:4E:91:27:76:3A:91:16:E8:D9:54:5C:B3`
- Certificate SHA-256: `37:F0:4B:34:79:73:A5:8F:54:EA:35:4D:52:41:7F:E6:26:CB:4C:71:4F:7A:23:17:D7:0A:FB:F1:3F:93:D8:61`

These are public certificate fingerprints, not signing secrets. Existing GitHub debug APKs use their own debug signing identity; a future build must actually use this EAS keystore before this restriction can validate it. This does not establish production signing or physical Maps rendering.

## Confirmed external setup gaps

The development project environment currently contains its public Supabase key. Maps/client-push configuration is not present there. The intended EAS account has no Google service-account keys, and this app has no FCM v1 credential assignment. The linked project has no iOS app credential record. Creating an Android signing key does not configure FCM, APNs, Google billing or Maps API restrictions.

Push remains disabled in Wantiss and bound to EAS project `277b862a-4581-4c6b-91b8-a7da40ced36e`. No gate was flipped and no notification was sent to a production account.

The owner’s Google Cloud project ID/access is needed for the remaining Google setup. The requested Stripe CLI approval expired without completion; a fresh owner-approved sign-in is needed before managed sandbox setup. The existing shared Stripe test context forwards events to the hosted Wantiss backend, so it must not be used for synthetic financial acceptance. Never paste private keys/passwords into chat or put service-account JSON into the mobile client.

Expo Simulators is unavailable on the current Wantiss account plan. It is optional for using the owner’s physical phones. Service information: https://expo.dev/accounts/wantiss/settings/billing and https://expo.dev/pricing.

## Acceptance still open

Full installed customer/vendor/courier/admin interactions and role boundaries, native maps/background/offline GPS/push, private proof capture/upload, installed card/3DS and current provider reconciliation, installed CMS edit/preview/publish/reload and iPhone signing/provisioning remain NOT VERIFIED. Existing owner deferrals stay separate. Local SQL/API/browser checks must never be reported as physical-device acceptance.

The new browser transport uses the real exported application and local Auth/PostgREST. A deny-all browser proxy and request interception prevent requests from reaching hosted Wantiss. Its evidence is recorded only after the CI scenarios actually pass.

## Fresh browser and integration evidence

Commit `2d57713184d29e61dfad9139200aa040f9cce2f2` passed Expo validation (run `46189153756`) and TypeScript/build checks (run `46189153791`). The real browser signed in using a generated local customer account and opened Goodies using the actual home carousel. The same run passed all existing local API/authorization/Storage/CMS scenarios and synthetic database/session restoration. No payment provider or hosted Supabase project was contacted. This verifies those two browser interactions, not every installed screen/button or physical behavior.

The test-only shared account-mode table/RPC uses the existing `20261010104513_separate_account_modes.sql` definition; the test waits for actual PostgREST schema-cache refresh. Browser traffic to the configured Wantiss host is fulfilled from the local services, and a deny-all proxy blocks unhandled external requests/popups. Initial controller discovery and CORS-profile transport failures were repaired before recording PASS.

The UI removal used the existing focused home/entry tests and admin CMS checks. The full CI run above belongs to the new acceptance infrastructure; documentation-only updates do not rerun that suite.
