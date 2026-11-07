**2026-11-07: deployment/publication remains paused.** The recovery and settlement additions are prepared locally only. New source strings were translated locally by the assistant in French, Spanish and Simplified Chinese; no human review is claimed.

# Authorized four-language Goodies translation release

**PREPARED — NOT PUBLISHED.** The user explicitly authorized immediate machine translation/publication in English (`en`), French (`fr`), Spanish (`es`) and Simplified Chinese (`zh-Hans`). No further consent is required for that scoped publication. Haitian Creole (`ht`) remains owned by the super admin and was not translated, cleared or marked reviewed.

## Prepared content

- `publish-payload.json` is a complete v5 payload based on the currently published English Goodies record, version 5, ID `da301ba8-15b8-4092-a37f-5da73d721c2f`. The architecture stores all language variants in that existing English CMS row; separate locale records would not reach the current customer reader.
- All 1,366 current app label keys are included. Existing/obsolete CMS labels were retained for compatibility: 1,507 label rows in total. The pack has 1,543 text fields; two optional empty fields remain empty. The 1,541 non-empty fields resolve in all four authorized locales (6,164 verified lookups).
- Existing non-empty translations are preserved. Missing French/Spanish/Simplified Chinese text was machine translated using Google Translate's public endpoint, with assistant-authored corrections for failed batches and age-consent grammar. `assistant-corrections.json` records those corrections. This does not certify human linguistic review.
- The existing CMS `reviewed` eligibility state is used for the four authorized languages so the customer resolver can serve them after publication. Each changed locale entry explicitly records machine/existing-copy provenance, super-admin publication authorization and `human_reviewed: false`. English wording was preserved; no new business/legal promises were authored.
- Existing Haitian Creole entries are unchanged, including all original review states. The release does not publish them as newly reviewed or introduce machine Creole.
- Fees, financial settings, ages, images, product/content targets and other non-text configuration are unchanged. Legal document content and the three legacy policy-body fields are unchanged. Existing FAQ placeholder wording was translated, not replaced with newly approved FAQ answers; FAQ/policy completion remains deferred.

## Verification

**PASS** — v5 schema validation, all registered app keys, 6,164 consumer-resolver/placeholder checks, preservation of all 775 existing Creole entries (including empty/missing entries), unchanged financial/non-text/legal values, five release regressions, configured lint and TypeScript.

**BLOCKED** — the connected SQL session has `auth.uid() = null`, and both `content.edit` and `content.publish` permission checks are false. The existing authenticated save/publish RPCs require a real signed-in admin actor and record that actor in the audit log. No identity was fabricated, no direct table write was used to bypass those checks, and no production draft or publication was created.

**Remaining existing CMS validation failures** — after the approved Creole fallback change, the editor no longer blocks publication for unchanged pending Creole when reviewed English is present. Five unchanged English FAQ placeholder answers still fail the independent FAQ check. Full details are in `verification.json`; see [fallback verification](../creole-fallback/README.md). The candidate server guard and its forward refinement remain undeployed.

**NOT VERIFIED** — authenticated CMS save/publish, public-endpoint reload, installed customer-app rendering and human linguistic quality. The main published record was not changed.

## Applying the release

An authenticated publisher session is required. In the existing Goodies content editor, import the prepared payload through its JSON editor and inspect the four language previews. Resolve the independent FAQ publication-gate findings before publishing. Pending Creole no longer blocks the updated editor when reviewed English is present; do not falsely mark Creole reviewed merely to pass validation. Save/publish through the existing guarded RPCs, which archive the prior version and write the actor audit. Re-read the published record/public endpoint and check consumer lookup after cache refresh.

Before importing, compare the current published ID/version/payload hash with `manifest.json`; if another editor has changed the content, regenerate/merge against that new baseline rather than overwriting their work. `baseline.json` preserves the original payload for review/recovery; do not overwrite fee changes or restore an entire old financial configuration during recovery.

Scripts: `prepare-goodies-translations.cjs` performs no network or database writes; `translate-goodies-content.py` writes a local machine-translation cache only; `verify-goodies-translation-release.cjs` checks the prepared payload against the existing admin schema and customer resolver. None is an automatic production publisher.

Reproduce preparation without network calls:

```sh
node scripts/prepare-goodies-translations.cjs docs/goodies/localization-release/baseline.json docs/goodies/localization-release/machine-translations.json /tmp/goodies-translation-recheck --publication-authorized-by-user
node scripts/verify-goodies-translation-release.cjs /tmp/goodies-translation-recheck
node tests/goodies-translation-release.test.cjs
```
