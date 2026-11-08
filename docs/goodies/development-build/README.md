# Wantiss development build

The customer, vendor and courier application is configured for an internal development build. This setup does not deploy Supabase, publish an application, configure EAS Update, or authorize real payments. The development profile points at the existing Wantiss backend; it does not isolate database writes.

## Prepared configuration

- SDK-compatible `expo-dev-client` is installed and locked.
- `eas.json` contains Android/iPhone `development` and iOS `development-simulator` profiles. Both use the EAS development environment; Android produces an installable APK.
- `app.config.js` preserves the existing `app.json` configuration. Only `APP_VARIANT=development` changes the displayed name to **Wantiss (Dev)** and native application identifiers to `com.wantiss.app.development`. This allows a distinct installation. The existing URL scheme, permissions, UI and default release identifiers are preserved. The generated development-client URL scheme is enabled only for the development variant.
- `npm run start:dev` starts Expo with the matching development variant on Windows, macOS or Linux. Extra Expo options can be passed after `--`.
- There is no production build/submit profile in this new file. No store submission or OTA update was configured.

## Account and build prerequisites

Expo CLI authentication and the correct existing EAS project link are required before a cloud build. Reuse the owner's existing project; do not create a duplicate or invent a project ID. The CLI can authenticate using its browser/device login, without sharing a password or token in chat. This setup pass did not submit a cloud build or claim a signed artifact exists.

After authentication, link the correct EAS project and configure the existing public Supabase key in the EAS **development** environment as `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The profile already sets `EXPO_PUBLIC_SUPABASE_URL`. Local Metro also needs those public variables in a gitignored local environment file. Never use a service-role/secret key. Do not upload unrelated production/provider secrets.

For an Android build:

```sh
npx eas-cli@latest build --platform android --profile development
```

For a physical iPhone, the owner's Apple Developer membership, registered device and signing/provisioning are required:

```sh
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile development
```

Install the resulting build using its EAS install link, then run:

```sh
npm run start:dev
```

The phone must be able to reach that development server. An iOS simulator build uses `--profile development-simulator`; it does not replace physical-phone GPS/background/push testing. Native maps, push and provider SDK credentials must be verified for the development application identifier where required. Review EAS allowance/pricing before accepting any paid build option.

## Verification

**PASS:** actual Expo config resolution for development/default variants; unchanged existing default configuration and native permissions; EAS schema validation for Android/iPhone and inherited simulator profiles; development-server launcher; configured lint; TypeScript; Expo Doctor (20/20); Android JavaScript/Hermes export. Evidence logs are adjacent.

**NOT VERIFIED:** authenticated EAS project linkage, native compilation/signing, installation, remote push, background GPS and payment-provider acceptance. JavaScript export is not an APK. Backend fixes remain undeployed under the user's deployment pause.

This is permanent development configuration. It need not be reverted before a later production release; a separately reviewed production profile can be added when release identifiers and signing targets are confirmed.
