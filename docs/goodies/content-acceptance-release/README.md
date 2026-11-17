# Prepared Goodies content release

This is the current publication candidate. Nothing in this directory has been published.

Five FAQ placeholders have factual answers in `en`, `fr`, `es` and `zh-Hans`. Existing Haitian Creole entries remain unchanged; unfinished entries fall back to reviewed English. Machine approval is not claimed as human review. Legal documents remain unchanged and still need the previously deferred approval.

The candidate also includes the earlier user-authorized four-language translations. It preserves the **current live fee configuration**, including the fee-only update made after the original translation snapshot. Preparing the candidate stops if the live baseline differs in any other content or version, rather than overwriting newer edits.

Reproduce and validate from the customer repository:

```sh
npm run prepare:goodies-acceptance-content
npm run check:goodies-acceptance-content
```

The manifest records the exact baseline and payload hashes. Publication validation has zero errors, 6,816 locale lookups pass, and 775 existing Haitian fields are preserved. Isolated SQL tests exercise real draft-save/publish RPCs, permissions, fee protection, audit records, failed-publish rollback and the consumer projection. The admin browser test renders all five FAQs in all five configured locales, including English fallback.

Publishing must use the existing CMS lifecycle after production approval and a fresh baseline comparison. Do not directly overwrite published records. The prior translation-only candidate is retained under `../localization-release` for provenance and still contains the old FAQ placeholders.
